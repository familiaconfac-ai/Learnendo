// App.tsx (COMPLETO) — 1 lição por dia (vira à meia-noite), bypass só com "Martins" NO LOGIN ANÔNIMO,
// e com “anti-translate” (força EN / tenta bloquear tradução automática no Android).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SectionType, PracticeItem, PracticeModuleType, UserProgress, AnswerLog, QState } from './types';
import { PRACTICE_ITEMS, LESSON_CONFIGS } from './constants';
import { InfoSection, PracticeSection, ResultDashboard, Header, LearningPathView } from './components/UI';
import { 
  saveAssessmentResult, 
  createSession, 
  finishSession, 
  createStudentProfile, 
  trackAnswer,
  recordLessonCompletion 
} from './services/db';
import { ensureAnonAuth, auth, loginWithEmail, registerWithEmail } from './services/firebase';

console.log('Firebase Auth Object:', auth);

const STORAGE_KEY = 'learnendo_v16_mastery';
const BYPASS_KEY = 'Martins';

type ActivePracticeItem = PracticeItem & { __baseId: string };

// ====== Helpers to harden progress shape and remove persisted bypass ======
const makeDefaultProgress = (): UserProgress =>
  ({
    currentLesson: 1,
    lessonData: {
      1: { diamond: 0, islandScores: {}, islandCompletionDates: {}, islandDiamonds: {} }
    },
    totalStars: 100,
    streakCount: 0,
    iceCount: 0,
    virtualDayOffset: 0,
    // IMPORTANT: bypassActive exists in old data; we keep field but ALWAYS force false on load/save.
    bypassActive: false,
    sentToTeacher: false
  } as UserProgress);

const sanitizeProgress = (raw: any): UserProgress => {
  const base = makeDefaultProgress();

  const p: UserProgress = {
    ...base,
    ...raw,
    lessonData: raw?.lessonData && typeof raw.lessonData === 'object' ? raw.lessonData : base.lessonData
  } as UserProgress;

  // Force-disable bypass persistence (prevents “unlock everything” across users/devices)
  (p as any).bypassActive = false;

  if (!p.lessonData || typeof p.lessonData !== 'object') p.lessonData = base.lessonData;

  if (typeof p.currentLesson !== 'number' || p.currentLesson < 1) p.currentLesson = 1;

  if (typeof p.totalStars !== 'number') p.totalStars = 100;

  return p;
};

// ====== “Anti-translate” utilities ======
const applyAntiTranslate = () => {
  try {
    // Helps browsers interpret content as English (reduces auto-translate behavior)
    document.documentElement.lang = 'en';

    // Ask Google Translate / Chrome to not translate this page
    const existing = document.querySelector('meta[name="google"]') as HTMLMetaElement | null;
    if (!existing) {
      const meta = document.createElement('meta');
      meta.name = 'google';
      meta.content = 'notranslate';
      document.head.appendChild(meta);
    } else {
      existing.content = 'notranslate';
    }
  } catch {
    // ignore
  }
};

const App: React.FC = () => {
  const [section, setSection] = useState<SectionType>(SectionType.INFO);
  const [student, setStudent] = useState({ name: '' });
  const [authStatus, setAuthStatus] = useState<{ status: 'loading' | 'ok' | 'error'; uid?: string; message?: string }>({
    status: 'loading'
  });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime] = useState<number>(Date.now());

  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return makeDefaultProgress();
    try {
      return sanitizeProgress(JSON.parse(saved));
    } catch {
      return makeDefaultProgress();
    }
  });

  // ====== Island Run State ======
  const [baseItems, setBaseItems] = useState<ActivePracticeItem[]>([]);
  const [currentBaseIndex, setCurrentBaseIndex] = useState(0);
  const [qState, setQState] = useState<Record<number, QState>>({});
  const [attemptedWrong, setAttemptedWrong] = useState<Record<number, boolean>>({});
  const [logs, setLogs] = useState<AnswerLog[]>([]);
  const [activeModule, setActiveModule] = useState<PracticeModuleType | undefined>();

  // Use ref to avoid async-state timing issues
  const hadAnyMistakeRef = useRef(false);

  // ✅ BYPASS: só quando o aluno digita exatamente "Martins" no login anônimo (não persiste no storage)
  const isAdmin = student.name === BYPASS_KEY;

  // ====== Auth init ======
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const res = await ensureAnonAuth();
        if (mounted) {
          setAuthStatus({ status: 'ok', uid: res.uid });
          // Create student profile and session for analytics
          await createStudentProfile(res.uid, `${res.uid}@learnendo.app`, 'Guest');
          const sid = await createSession(res.uid, progress.currentLesson);
          if (sid) setSessionId(sid);
        }
      } catch (err: any) {
        if (mounted) setAuthStatus({ status: 'error', message: err?.message || 'Auth failure' });
      }
    };

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  // ====== Anti-translate ======
  useEffect(() => {
    applyAntiTranslate();
  }, []);

  // ====== Session tracking on unload ======
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (sessionId && authStatus.uid) {
        const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
        await finishSession(authStatus.uid, sessionId, durationSeconds);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId, authStatus.uid, sessionStartTime]);

  // ====== Date helper ======
  const getTodayKey = (offset: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + (progress.virtualDayOffset || 0) + offset);
    return d.toISOString().split('T')[0];
  };

  // ====== Persist progress (ALWAYS strip bypassActive) ======
  useEffect(() => {
    const safe = { ...progress } as any;
    safe.bypassActive = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  }, [progress]);

  // ====== Derived UI stats ======
  const moduleTotal = useMemo(() => baseItems.length, [baseItems.length]);

  const correctCount = useMemo(() => {
    let c = 0;
    for (let i = 0; i < baseItems.length; i++) if (qState[i] === 'correct') c++;
    return c;
  }, [qState, baseItems.length]);

  const progressPercent = useMemo(() => {
    if (!moduleTotal) return 0;
    return Math.round((correctCount / moduleTotal) * 100);
  }, [correctCount, moduleTotal]);

  // ====== Start lesson ======
  // (Mantém o anônimo — se digitar "Martins", vira admin; qualquer outro nome não libera tudo.)
  const startLesson = (name: string) => {
    setStudent({ name: name?.trim() || '' });
    setSection(SectionType.PATH);
  };

  // ====== Start module/island ======
  const startModule = (type: PracticeModuleType) => {
    const items: ActivePracticeItem[] = PRACTICE_ITEMS.filter(i => i.moduleType === type).map((item, idx) => ({
      ...item,
      id: `${type}__${idx}`,
      __baseId: `${type}__${idx}`
    }));

    const init: Record<number, QState> = {};
    for (let i = 0; i < items.length; i++) init[i] = 'pending';

    hadAnyMistakeRef.current = false;

    setBaseItems(items);
    setActiveModule(type);
    setQState(init);
    setAttemptedWrong({});
    setLogs([]);
    setCurrentBaseIndex(0);
    setSection(SectionType.PRACTICE);
  };

  // ====== Core routing: next unfinished ======
  const findNextUnfinished = (state: Record<number, QState>, total: number, from: number) => {
    for (let i = from + 1; i < total; i++) if (state[i] !== 'correct') return i;
    for (let i = 0; i <= from; i++) if (state[i] !== 'correct') return i;
    return null;
  };

  const finalizeIsland = () => {
    const currentTrack = activeModule!;
    const lessonId = progress.currentLesson;
    const today = getTodayKey();

    // “Diamante/perfeição” você disse que a gente vê depois — mas aqui não trava nada.
    // Mantive o registro pra você usar no futuro se quiser.
    const perfectDiamond = !hadAnyMistakeRef.current;

    setProgress(prev => {
      const lessonData = { ...prev.lessonData };

      if (!lessonData[lessonId]) {
        lessonData[lessonId] = { diamond: 0, islandScores: {}, islandCompletionDates: {}, islandDiamonds: {} };
      }

      const currentData = lessonData[lessonId];
      const totalThisIsland = baseItems.length;

      const newScores = { ...currentData.islandScores, [currentTrack]: totalThisIsland };
      const newCompletionDates = { ...(currentData.islandCompletionDates || {}), [currentTrack]: today };
      const newDiamonds = { ...(currentData.islandDiamonds || {}), [currentTrack]: perfectDiamond };

      // Mantemos diamond como “% do lesson”, mas NÃO usamos pra lock.
      const lessonConfig = LESSON_CONFIGS.find(l => l.id === lessonId);
      const totalLessonItems = lessonConfig
        ? lessonConfig.modules.reduce((acc: number, m) => acc + PRACTICE_ITEMS.filter(i => i.moduleType === m).length, 0)
        : 0;

      const sum = (Object.values(newScores) as number[]).reduce((a, b) => a + (Number(b) || 0), 0);
      const newDiamondPct = totalLessonItems > 0 ? Math.min(100, Math.round((sum / totalLessonItems) * 100)) : 0;

      lessonData[lessonId] = {
        ...currentData,
        islandScores: newScores,
        islandCompletionDates: newCompletionDates,
        islandDiamonds: newDiamonds,
        diamond: newDiamondPct
      };

      return { ...prev, lessonData };
    });

    // Track lesson completion to Firebase analytics
    if (authStatus.uid) {
      const config = LESSON_CONFIGS.find(l => l.id === lessonId);
      const completedIslands = config?.modules || [];
      const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
      const lessonConfig = LESSON_CONFIGS.find(l => l.id === lessonId);
      const existingScores = progress.lessonData[lessonId]?.islandScores || {};
      const newScoresSum = (Object.values({...existingScores, [activeModule!]: baseItems.length}) as number[]).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

      recordLessonCompletion(authStatus.uid, lessonId, {
        completedIslands: completedIslands.map(String),
        diamondPercent: lessonConfig 
          ? Math.min(100, Math.round((newScoresSum / (
              lessonConfig.modules.reduce((acc: number, m) => acc + PRACTICE_ITEMS.filter(i => i.moduleType === m).length, 0)
            )) * 100))
          : 0,
        timeSpentSeconds: durationSeconds,
        totalCorrect: logs.filter(l => l.isCorrect).length,
        totalAnswers: logs.length
      }).catch(err => console.error("Failed to record lesson completion:", err));
    }

    setSection(SectionType.PATH);
  };

  const handleResult = (isCorrect: boolean, val: string) => {
    const item = baseItems[currentBaseIndex];
    if (!item) return;

    const lessonId = progress.currentLesson;
    const responseTime = Date.now() - sessionStartTime;

    setLogs(prev => [
      ...prev,
      {
        question: item.instruction,
        userAnswer: val,
        correctAnswer: item.correctValue,
        isCorrect,
        isFirstTry: qState[currentBaseIndex] === 'pending'
      } as any
    ]);

    // Track answer to Firebase analytics (async, non-blocking)
    if (authStatus.uid && activeModule) {
      trackAnswer(
        authStatus.uid,
        lessonId,
        activeModule,
        item.id,
        val,
        item.correctValue,
        responseTime
      ).catch(err => console.error("Failed to track answer:", err));
    }

    setQState(prev => {
      const next = { ...prev };

      if (isCorrect) {
        next[currentBaseIndex] = 'correct';
      } else {
        if (next[currentBaseIndex] !== 'wrong') next[currentBaseIndex] = 'wrong';

        hadAnyMistakeRef.current = true;

        // desconta estrela 1x por questão (mantém seu comportamento atual)
        setAttemptedWrong(wPrev => {
          if (wPrev[currentBaseIndex]) return wPrev;
          setProgress(p => ({ ...p, totalStars: Math.max(0, (p.totalStars ?? 100) - 1) }));
          return { ...wPrev, [currentBaseIndex]: true };
        });
      }

      const total = baseItems.length;

      // terminou quando tudo ficou correct (100% natural)
      let done = true;
      for (let i = 0; i < total; i++) {
        if (next[i] !== 'correct') {
          done = false;
          break;
        }
      }
      if (done) {
        finalizeIsland();
        return next;
      }

      const nextIdx = findNextUnfinished(next, total, currentBaseIndex);
      if (nextIdx !== null) setCurrentBaseIndex(nextIdx);

      return next;
    });
  };

  // ====== LOCK RULES ======
  // Helper: Check if a lesson is 100% mastered (all islands completed)
  const isLessonMastered = (lessonId: number): boolean => {
    const config = LESSON_CONFIGS.find(l => l.id === lessonId);
    if (!config || !Array.isArray(config.modules)) return false;
    
    const scores = progress.lessonData[lessonId]?.islandScores || {};
    // All islands must have a score > 0 to be considered mastered
    return config.modules.every(m => (scores as any)[m] && (scores as any)[m] > 0);
  };

  // 1) Ilhas: sequência simples (pode fazer todas no mesmo dia)
  const isModuleLocked = (moduleType: PracticeModuleType) => {
    if (isAdmin) return false;

    const lessonId = progress.currentLesson;
    const config = LESSON_CONFIGS.find(l => l.id === lessonId);
    if (!config) return true;

    const idx = config.modules.indexOf(moduleType);
    if (idx === 0) return false;

    const prevModule = config.modules[idx - 1];

    const prevCompletionDay = progress.lessonData[lessonId]?.islandCompletionDates?.[prevModule];
    return !prevCompletionDay;
  };

  // 2) Lições: 1 por dia — só libera próxima depois da meia-noite
  const isLessonLocked = (id: number) => {
    if (isAdmin) return false;
    if (id === 1) return false;

    const prevLessonId = id - 1;
    
    // First check: previous lesson must be 100% mastered (all islands completed)
    if (!isLessonMastered(prevLessonId)) return true;
    
    // Second check: daily limit - can only unlock one lesson per day
    const prevConfig = LESSON_CONFIGS.find(l => l.id === prevLessonId);
    if (!prevConfig?.modules) return true;
    
    const lastModule = prevConfig.modules[prevConfig.modules.length - 1];
    const prevCompletedDay = progress.lessonData[prevLessonId]?.islandCompletionDates?.[lastModule];

    // If previous lesson was completed today, lock this lesson until tomorrow
    if (prevCompletedDay && prevCompletedDay === getTodayKey()) return true;

    return false;
  };

  const getIslandProgressForUI = () => {
    const lessonId = progress.currentLesson;
    const config = LESSON_CONFIGS.find(l => l.id === lessonId);
    if (!config) return [];
    const scores = progress.lessonData[lessonId]?.islandScores || {};
    return config.modules.map(m => scores[m] || 0);
  };

  return (
    // className "notranslate" + translate="no" ajudam a reduzir tradução automática
    <div className="min-h-screen bg-blue-50 pb-8 flex flex-col items-center notranslate" translate="no">
      <div className="w-full max-w-sm px-4 pt-6 notranslate" translate="no">
        {section !== SectionType.INFO && section !== SectionType.PRACTICE && (
          <Header
            studentName={student.name}
            totalStars={progress.totalStars}
            currentLesson={progress.currentLesson}
            onLogout={() => window.location.reload()}
          />
        )}

        {section === SectionType.INFO && (
  <InfoSection
    onStart={startLesson}
    onAuthAction={async (email, pass, isLogin, fullName) => {
      console.log("Auth action", email, pass, !isLogin, fullName);
      try {
        let currentUser;
        if (isLogin) {
          currentUser = await loginWithEmail(email, pass);
        } else {
          currentUser = await registerWithEmail(email, pass, fullName);
        }

        setAuthStatus({ status: 'ok', uid: currentUser.uid });

        // Create or update student profile and session for analytics
        await createStudentProfile(currentUser.uid, email, fullName);
        const sid = await createSession(currentUser.uid, progress.currentLesson);
        if (sid) setSessionId(sid);

        setStudent({
          name: fullName?.trim() || email
        });

        setSection(SectionType.PATH);
      } catch (error) {
        console.error("Firebase login error:", error.code, error.message);
        alert("Login error: " + (error?.message || "Unknown error"));
      }
    }}
  />
)}

        {section === SectionType.PATH && (
          <LearningPathView
            currentLesson={progress.currentLesson}
            lessonData={progress.lessonData}
            getIslandProgress={getIslandProgressForUI}
            isModuleLocked={isModuleLocked}
            isLessonLocked={isLessonLocked}
            onStartModule={startModule}
            onNextLesson={() => {
              const next = progress.currentLesson + 1;
              if (isLessonLocked(next)) return; // não deixa pular lição

              setProgress(prev => ({
                ...prev,
                currentLesson: next,
                lessonData: {
                  ...prev.lessonData,
                  [next]: prev.lessonData[next] || { diamond: 0, islandScores: {}, islandCompletionDates: {}, islandDiamonds: {} }
                }
              }));
            }}
          />
        )}

        {section === SectionType.PRACTICE && baseItems[currentBaseIndex] && (
          <PracticeSection
            item={baseItems[currentBaseIndex]}
            onResult={handleResult}
            currentIdx={currentBaseIndex}
            totalItems={baseItems.length}
            lessonId={progress.currentLesson}
            onBack={() => setSection(SectionType.PATH)}
          />
        )}

        {section === SectionType.RESULTS && (
          <ResultDashboard
            lessonId={progress.currentLesson}
            diamond={progress.lessonData[progress.currentLesson]?.diamond || 0}
            islandScores={progress.lessonData[progress.currentLesson]?.islandScores || {}}
            onSendToTeacher={() => {
              setProgress(prev => ({ ...prev, sentToTeacher: true }));
              saveAssessmentResult(progress);
            }}
            onNextLesson={() => {
              const next = progress.currentLesson + 1;
              if (isLessonLocked(next)) return;

              setProgress(prev => ({
                ...prev,
                currentLesson: next,
                lessonData: {
                  ...prev.lessonData,
                  [next]: prev.lessonData[next] || { diamond: 0, islandScores: {}, islandCompletionDates: {}, islandDiamonds: {} }
                }
              }));
              setSection(SectionType.PATH);
            }}
            onRestart={() => setSection(SectionType.PATH)}
            isAdmin={isAdmin}
            todayKey={getTodayKey()}
          />
        )}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-black/90 text-[8px] text-white/70 px-2 py-1 pointer-events-none z-[9999] font-mono text-center border-t border-white/10 notranslate" translate="no">
        {authStatus.status === 'ok'
          ? `Auth: OK uid=${authStatus.uid?.substring(0, 8)}`
          : `Auth: ${authStatus.status}`}
      </footer>
    </div>
  );
};

export default App;