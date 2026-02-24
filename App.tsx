import React, { useState, useEffect, useMemo } from 'react';
import { SectionType, PracticeItem, PracticeModuleType, UserProgress, AnswerLog, QState } from './types';
import { PRACTICE_ITEMS, LESSON_CONFIGS } from './constants';
import { InfoSection, PracticeSection, ResultDashboard, Header, LearningPathView } from './components/UI';
import { saveAssessmentResult } from './services/db';
import { ensureAnonAuth, auth } from './services/firebase';

console.log('Firebase Auth Object:', auth);

const STORAGE_KEY = 'learnendo_v16_mastery';
const BYPASS_KEY = 'Martins';

type ActivePracticeItem = PracticeItem & { __baseId: string };

const App: React.FC = () => {
  const [section, setSection] = useState<SectionType>(SectionType.INFO);
  const [student, setStudent] = useState({ name: '' });
  const [authStatus, setAuthStatus] = useState<{ status: 'loading' | 'ok' | 'error'; uid?: string; message?: string }>({ status: 'loading' });

  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);

    return {
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
  });

  // === Island Run State (novo modelo) ===
  const [baseItems, setBaseItems] = useState<ActivePracticeItem[]>([]);
  const [currentBaseIndex, setCurrentBaseIndex] = useState(0);
  const [qState, setQState] = useState<Record<number, QState>>({});
  const [hadAnyMistake, setHadAnyMistake] = useState(false);
  const [attemptedWrong, setAttemptedWrong] = useState<Record<number, boolean>>({}); // para descontar estrela 1x por questão
  const [logs, setLogs] = useState<AnswerLog[]>([]);
  const [activeModule, setActiveModule] = useState<PracticeModuleType | undefined>();

  const isAdmin = student.name === BYPASS_KEY || progress.bypassActive;

  // Auth init
  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      try {
        const res = await ensureAnonAuth();
        if (mounted) setAuthStatus({ status: 'ok', uid: res.uid });
      } catch (err: any) {
        if (mounted) setAuthStatus({ status: 'error', message: err.message || 'Auth failure' });
      }
    };
    initAuth();
    return () => { mounted = false; };
  }, []);

  const getTodayKey = (offset: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + (progress.virtualDayOffset || 0) + offset);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const moduleTotal = useMemo(() => baseItems.length, [baseItems.length]);

  const correctCount = useMemo(() => {
    const total = baseItems.length;
    let c = 0;
    for (let i = 0; i < total; i++) if (qState[i] === 'correct') c++;
    return c;
  }, [qState, baseItems.length]);

  const progressPercent = useMemo(() => {
    if (!moduleTotal) return 0;
    return Math.round((correctCount / moduleTotal) * 100);
  }, [correctCount, moduleTotal]);

  // ====== start lesson ======
  const startLesson = (name: string) => {
    setStudent({ name });
    if (name === BYPASS_KEY) setProgress(prev => ({ ...prev, bypassActive: true }));
    setSection(SectionType.PATH);
  };

  // ====== start module/island ======
  const startModule = (type: PracticeModuleType) => {
    const items: ActivePracticeItem[] = PRACTICE_ITEMS
      .filter(i => i.moduleType === type)
      .map((item, idx) => ({
        ...item,
        id: `${type}__${idx}`,
        __baseId: `${type}__${idx}`
      }));

    const init: Record<number, QState> = {};
    for (let i = 0; i < items.length; i++) init[i] = 'pending';

    setBaseItems(items);
    setActiveModule(type);
    setQState(init);
    setHadAnyMistake(false);
    setAttemptedWrong({});
    setLogs([]);
    setCurrentBaseIndex(0);
    setSection(SectionType.PRACTICE);
  };

  // ====== core routing: next unfinished ======
  const findNextUnfinished = (state: Record<number, QState>, total: number, from: number) => {
    // 1) tenta ir para frente
    for (let i = from + 1; i < total; i++) if (state[i] !== 'correct') return i;
    // 2) chegou no fim → volta do começo
    for (let i = 0; i <= from; i++) if (state[i] !== 'correct') return i;
    return null; // tudo correct
  };

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
        // marca wrong
        if (next[currentBaseIndex] !== 'wrong') next[currentBaseIndex] = 'wrong';
        setHadAnyMistake(true);

        // desconta estrela 1x por questão (primeiro erro naquela questão)
        setAttemptedWrong(wPrev => {
          if (wPrev[currentBaseIndex]) return wPrev;
          setProgress(p => ({ ...p, totalStars: Math.max(0, (p.totalStars ?? 100) - 1) }));
          return { ...wPrev, [currentBaseIndex]: true };
        });
      }

      const total = baseItems.length;

      // terminou?
      let done = true;
      for (let i = 0; i < total; i++) {
        if (next[i] !== 'correct') { done = false; break; }
      }
      if (done) {
        finalizeIsland();
        return next;
      }

      // próximo alvo (chegou no fim? volta na primeira errada/pendente)
      const nextIdx = findNextUnfinished(next, total, currentBaseIndex);
      if (nextIdx !== null) setCurrentBaseIndex(nextIdx);

      return next;
    });
  };

  const finalizeIsland = () => {
    const currentTrack = activeModule!;
    const lessonId = progress.currentLesson;
    const today = getTodayKey();
    const perfectDiamond = !hadAnyMistake;

    setProgress(prev => {
      const lessonData = { ...prev.lessonData };
      if (!lessonData[lessonId]) {
        lessonData[lessonId] = { diamond: 0, islandScores: {}, islandCompletionDates: {}, islandDiamonds: {} };
      }

      const currentData = lessonData[lessonId];

      // ✅ Ilha concluída = total da ilha (não “21/25”)
      const totalThisIsland = baseItems.length;
      const newScores = { ...currentData.islandScores, [currentTrack]: totalThisIsland };
      const newCompletionDates = { ...(currentData.islandCompletionDates || {}), [currentTrack]: today };
      const newDiamonds = { ...(currentData.islandDiamonds || {}), [currentTrack]: perfectDiamond };

      // % do lesson (opcional)
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

  // ====== LOCK RULES (COMBINADO) ======
  // Próxima ilha abre se: anterior 100% (concluída) + dia seguinte.
  // NÃO exige diamante.
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

    // Critério 1: 100% (concluiu a ilha)
    if (prevScore < prevMax) return true;

    // Critério 2: só dia seguinte
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
        {authStatus.status === 'ok'
          ? `Auth: OK uid=${authStatus.uid?.substring(0, 8)}`
          : `Auth: ${authStatus.status}`}
      </footer>
    </div>
  );
};

export default App;