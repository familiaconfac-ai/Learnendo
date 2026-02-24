import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SectionType,
  PracticeItem,
  PracticeModuleType,
  UserProgress,
  AnswerLog,
  QState
} from './types';

import { PRACTICE_ITEMS, LESSON_CONFIGS } from './constants';
import { InfoSection, PracticeSection, ResultDashboard, Header, LearningPathView } from './components/UI';
import { saveAssessmentResult } from './services/db';
import { ensureAnonAuth, auth } from './services/firebase';

console.log('Firebase Auth Object:', auth);

const STORAGE_KEY = 'learnendo_v16_mastery';
const BYPASS_KEY = 'Martins';

type ActivePracticeItem = PracticeItem & { __baseId: string };

const defaultProgress: UserProgress = {
  currentLesson: 1,
  lessonData: {
    1: { diamond: 0, islandScores: {}, islandCompletionDates: {}, islandDiamonds: {} }
  },
  totalStars: 100,
  streakCount: 0,
  iceCount: 0,
  virtualDayOffset: 0,
  bypassActive: false,
  sentToTeacher: false
} as UserProgress;

const App: React.FC = () => {
  const [section, setSection] = useState<SectionType>(SectionType.INFO);
  const [student, setStudent] = useState({ name: '' });
  const [authStatus, setAuthStatus] = useState<{ status: 'loading' | 'ok' | 'error'; uid?: string; message?: string }>({
    status: 'loading'
  });

  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultProgress;

    try {
      return JSON.parse(saved);
    } catch {
      return defaultProgress;
    }
  });

  // ====== Island run state ======
  const [baseItems, setBaseItems] = useState<ActivePracticeItem[]>([]);
  const [currentBaseIndex, setCurrentBaseIndex] = useState(0);
  const [qState, setQState] = useState<Record<number, QState>>({});
  const [attemptedWrong, setAttemptedWrong] = useState<Record<number, boolean>>({});
  const [logs, setLogs] = useState<AnswerLog[]>([]);
  const [activeModule, setActiveModule] = useState<PracticeModuleType | undefined>();

  // Ref para evitar bugs de estado “atrasado” (setState async)
  const hadAnyMistakeRef = useRef(false);

  const isAdmin = student.name === BYPASS_KEY || progress.bypassActive;

  // ====== Auth init ======
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const res = await ensureAnonAuth();
        if (mounted) setAuthStatus({ status: 'ok', uid: res.uid });
      } catch (err: any) {
        if (mounted) setAuthStatus({ status: 'error', message: err?.message || 'Auth failure' });
      }
    };

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  // ====== Persist progress ======
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  // ====== Date helper ======
  const getTodayKey = (offset: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + (progress.virtualDayOffset || 0) + offset);
    return d.toISOString().split('T')[0];
  };

  // ====== Derived UI stats ======
  const moduleTotal = baseItems.length;

  const correctCount = useMemo(() => {
    let c = 0;
    for (let i = 0; i < moduleTotal; i++) if (qState[i] === 'correct') c++;
    return c;
  }, [qState, moduleTotal]);

  const progressPercent = useMemo(() => {
    if (!moduleTotal) return 0;
    return Math.round((correctCount / moduleTotal) * 100);
  }, [correctCount, moduleTotal]);

  // ====== Start lesson ======
  const startLesson = (name: string) => {
    setStudent({ name });
    if (name === BYPASS_KEY) setProgress(prev => ({ ...prev, bypassActive: true }));
    setSection(SectionType.PATH);
  };

  // ====== Start module/island ======
  const startModule = (type: PracticeModuleType) => {
    const items: ActivePracticeItem[] = PRACTICE_ITEMS.filter(i => i.moduleType === type).map((item, idx) => ({
      ...item,
      id: `${type}__${idx}`,
      __baseId: `${type}__${idx}`
    }));

    const initState: Record<number, QState> = {};
    for (let i = 0; i < items.length; i++) initState[i] = 'pending';

    hadAnyMistakeRef.current = false;

    setBaseItems(items);
    setActiveModule(type);
    setQState(initState);
    setAttemptedWrong({});
    setLogs([]);
    setCurrentBaseIndex(0);
    setSection(SectionType.PRACTICE);
  };

  // ====== Find next unfinished ======
  const findNextUnfinished = (state: Record<number, QState>, total: number, from: number) => {
    for (let i = from + 1; i < total; i++) if (state[i] !== 'correct') return i;
    for (let i = 0; i <= from; i++) if (state[i] !== 'correct') return i;
    return null;
  };

  // ====== Finalize island ======
  const finalizeIsland = (perfectDiamond: boolean) => {
    const currentTrack = activeModule!;
    const lessonId = progress.currentLesson;
    const today = getTodayKey();

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

    setSection(SectionType.PATH);
  };

  // ====== Handle answer ======
  const handleResult = (isCorrect: boolean, val: string) => {
    const item = baseItems[currentBaseIndex];
    if (!item) return;

    // log
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

    setQState(prev => {
      const next = { ...prev };

      if (isCorrect) {
        next[currentBaseIndex] = 'correct';
      } else {
        if (next[currentBaseIndex] !== 'wrong') next[currentBaseIndex] = 'wrong';

        // Marca erro no ref (para não depender de setState async)
        hadAnyMistakeRef.current = true;

        // desconta estrela 1x por questão
        setAttemptedWrong(wPrev => {
          if (wPrev[currentBaseIndex]) return wPrev;
          setProgress(p => ({ ...p, totalStars: Math.max(0, (p.totalStars ?? 100) - 1) }));
          return { ...wPrev, [currentBaseIndex]: true };
        });
      }

      // terminou?
      const total = baseItems.length;
      let done = true;
      for (let i = 0; i < total; i++) {
        if (next[i] !== 'correct') {
          done = false;
          break;
        }
      }

      if (done) {
        const perfectDiamond = !hadAnyMistakeRef.current;
        finalizeIsland(perfectDiamond);
        return next;
      }

      const nextIdx = findNextUnfinished(next, total, currentBaseIndex);
      if (nextIdx !== null) setCurrentBaseIndex(nextIdx);

      return next;
    });
  };

  // ====== Lock rules ======
  const isModuleLocked = (moduleType: PracticeModuleType) => {
    if (isAdmin) return false;

    const lessonId = progress.currentLesson;
    const config = LESSON_CONFIGS.find(l => l.id === lessonId);
    if (!config) return true;

    const idx = config.modules.indexOf(moduleType);
    if (idx === 0) return false;

    const prevModule = config.modules[idx - 1];

    const prevScore = progress.lessonData[lessonId]?.islandScores?.[prevModule] || 0;
    const prevMax = PRACTICE_ITEMS.filter(i => i.moduleType === prevModule).length;

    // 1) 100% na ilha anterior
    if (prevScore < prevMax) return true;

    // 2) só dia seguinte
    const completionDay = progress.lessonData[lessonId]?.islandCompletionDates?.[prevModule];
    if (completionDay === getTodayKey()) return true;

    return false;
  };

  const isLessonLocked = (id: number) => {
    if (isAdmin || id === 1) return false;

    const prev = progress.lessonData[id - 1];
    if (!prev || prev.diamond < 100) return true;

    const lastMod = LESSON_CONFIGS.find(l => l.id === id - 1)?.modules.slice(-1)[0];
    const completionDay = prev.islandCompletionDates?.[lastMod!];
    return completionDay === getTodayKey();
  };

  const getIslandProgressForUI = () => {
    const lessonId = progress.currentLesson;
    const config = LESSON_CONFIGS.find(l => l.id === lessonId);
    if (!config) return [];
    const scores = progress.lessonData[lessonId]?.islandScores || {};
    return config.modules.map(m => scores[m] || 0);
  };

  return (
    <div className="min-h-screen bg-blue-50 pb-8 flex flex-col items-center">
      <div className="w-full max-w-sm px-4 pt-6">
        {section !== SectionType.INFO && section !== SectionType.PRACTICE && (
          <Header
            studentName={student.name}
            totalStars={progress.totalStars}
            currentLesson={progress.currentLesson}
            onLogout={() => window.location.reload()}
          />
        )}

        {section === SectionType.INFO && <InfoSection onStart={startLesson} />}

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
            currentIndex={currentBaseIndex}
            totalItemsInModule={baseItems.length}
            qState={qState}
            progress={progressPercent}
            lessonId={progress.currentLesson}
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

      <footer className="fixed bottom-0 left-0 right-0 bg-black/90 text-[8px] text-white/70 px-2 py-1 pointer-events-none z-[9999] font-mono text-center border-t border-white/10">
        {authStatus.status === 'ok' ? `Auth: OK uid=${authStatus.uid?.substring(0, 8)}` : `Auth: ${authStatus.status}`}
      </footer>
    </div>
  );
};

export default App;