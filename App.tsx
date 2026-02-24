import React, { useState, useEffect, useMemo } from 'react';
import { SectionType, PracticeItem, PracticeModuleType, UserProgress, AnswerLog } from './types';
import { PRACTICE_ITEMS, MODULE_NAMES, LESSON_CONFIGS } from './constants';
import { InfoSection, PracticeSection, ResultDashboard, Header, LearningPathView } from './components/UI';
import { saveAssessmentResult } from './services/db';
import { ensureAnonAuth, auth } from './services/firebase';

const STORAGE_KEY = 'learnendo_v15_mastery';
const BYPASS_KEY = 'Martins';

const getModuleCountsForLesson = (lessonId: number) => {
  const config = LESSON_CONFIGS.find(l => l.id === lessonId);
  if (!config) return [];
  return config.modules.map(m => PRACTICE_ITEMS.filter(i => i.moduleType === m).length);
};

type QState = 'pending' | 'correct' | 'wrong';

type ActivePracticeItem = PracticeItem & { __baseId: string };

const App: React.FC = () => {
  const [section, setSection] = useState(SectionType.INFO);
  const [student, setStudent] = useState({ name: '' });

  const [authStatus, setAuthStatus] = useState<{ status: 'loading' | 'ok' | 'error'; uid?: string; message?: string }>({
    status: 'loading'
  });

  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);

    return {
      currentLesson: 1,
      lessonData: {
        1: { diamond: 0, islandScores: {}, islandCompletionDates: {}, islandDiamonds: {} }
      },
      totalStars: 100, // começa com 100 (você pediu)
      streakCount: 0,
      iceCount: 0,
      virtualDayOffset: 0,
      bypassActive: false,
      sentToTeacher: false
    };
  });

  // === NEW MODEL STATE (per island run) ===
  const [baseItems, setBaseItems] = useState<ActivePracticeItem[]>([]);
  const [currentBaseIndex, setCurrentBaseIndex] = useState(0);

  const [qState, setQState] = useState<Record<number, QState>>({});
  const [hadAnyMistake, setHadAnyMistake] = useState(false);

  const [logs, setLogs] = useState<AnswerLog[]>([]);
  const [activeModule, setActiveModule] = useState<PracticeModuleType | undefined>();

  const isAdmin = student.name === BYPASS_KEY || (progress as any).bypassActive;

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
    d.setDate(d.getDate() + ((progress as any).virtualDayOffset || 0) + offset);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  // ===== helpers for new model =====
  const totalItemsInModule = useMemo(() => {
    if (!activeModule) return 0;
    return PRACTICE_ITEMS.filter(i => i.moduleType === activeModule).length;
  }, [activeModule]);

  const correctCount = useMemo(() => {
    const values = Object.values(qState);
    return values.filter(v => v === 'correct').length;
  }, [qState]);

  const progressPercent = useMemo(() => {
    if (!totalItemsInModule) return 0;
    return Math.round((correctCount / totalItemsInModule) * 100);
  }, [correctCount, totalItemsInModule]);

  const allCorrect = (state: Record<number, QState>, total: number) => {
    for (let i = 0; i < total; i++) {
      if (state[i] !== 'correct') return false;
    }
    return true;
  };

  const findNextUnfinishedFrom = (state: Record<number, QState>, total: number, start: number) => {
    for (let i = start; i < total; i++) {
      if (state[i] !== 'correct') return i;
    }
    for (let i = 0; i < total; i++) {
      if (state[i] !== 'correct') return i;
    }
    return null;
  };

  // ====== start lesson ======
  const startLesson = (name: string) => {
    setStudent({ name });
    if (name === BYPASS_KEY) {
      setProgress((prev: any) => ({ ...prev, bypassActive: true }));
    }
    setSection(SectionType.PATH);
  };

  // ====== start island ======
  const startModule = (type: PracticeModuleType) => {
    const items: ActivePracticeItem[] = PRACTICE_ITEMS
      .filter(i => i.moduleType === type)
      .map((item, idx) => ({
        ...item,
        id: `${type}__${idx}`,        // render id estável
        __baseId: `${type}__${idx}`   // id base estável
      }));

    const init: Record<number, QState> = {};
    for (let i = 0; i < items.length; i++) init[i] = 'pending';

    setBaseItems(items);
    setQState(init);
    setHadAnyMistake(false);
    setLogs([]);
    setActiveModule(type);

    // começa na 1ª pendente
    setCurrentBaseIndex(0);

    setSection(SectionType.PRACTICE);
  };

  // ====== answer handling (new model) ======
  const handleResult = (isCorrect: boolean, val: string) => {
    const item = baseItems[currentBaseIndex];
    if (!item) return;

    const baseId = item.__baseId;

    // log
    setLogs((prev: any) => [...prev, {
      question: item.instruction,
      userAnswer: val,
      correctAnswer: item.correctValue,
      isCorrect,
      questionId: baseId,
      timestamp: Date.now()
    }]);

    setQState(prev => {
      const next = { ...prev };

      // se acertou: vira correct
      if (isCorrect) {
        next[currentBaseIndex] = 'correct';
      } else {
        // se errou: marca wrong (e mantém wrong mesmo se errar de novo)
        if (next[currentBaseIndex] !== 'wrong') {
          next[currentBaseIndex] = 'wrong';

          // perde estrela só na primeira vez que marcar wrong nessa questão
          setProgress((p: any) => ({
            ...p,
            totalStars: Math.max(0, (p.totalStars ?? 100) - 1)
          }));
        }
        setHadAnyMistake(true);
      }

      // decide próximo passo
      const total = baseItems.length;

      // terminou?
      if (allCorrect(next, total)) {
        finalizeIslandNewModel(next);
        return next;
      }

      // vai para a próxima não concluída
      const nextIdx = findNextUnfinishedFrom(next, total, currentBaseIndex + 1);
      if (nextIdx !== null) setCurrentBaseIndex(nextIdx);

      return next;
    });
  };

  // ====== finalize island (new model) ======
  const finalizeIslandNewModel = (snapshot: Record<number, QState>) => {
    const currentTrack = activeModule!;
    const lessonId = (progress as any).currentLesson;
    const today = getTodayKey();

    const total = baseItems.length;
    const perfectDiamond = !hadAnyMistake; // nunca marcou wrong

    setProgress((prev: any) => {
      const currentData = prev.lessonData?.[lessonId] || {
        diamond: 0,
        islandScores: {},
        islandCompletionDates: {},
        islandDiamonds: {}
      };

      // ilha concluída = total (sem “conta frágil”)
      const newScores = {
        ...currentData.islandScores,
        [currentTrack]: total
      };

      const newCompletionDates = {
        ...currentData.islandCompletionDates,
        [currentTrack]: today
      };

      const newIslandDiamonds = {
        ...(currentData.islandDiamonds || {}),
        [currentTrack]: perfectDiamond
      };

      // diamond do lesson como % real: soma concluídos / soma totais
      const lessonConfig = LESSON_CONFIGS.find(l => l.id === lessonId);
      const totalLessonItems = lessonConfig
        ? lessonConfig.modules.reduce((acc, m) => acc + PRACTICE_ITEMS.filter(i => i.moduleType === m).length, 0)
        : 0;

      const totalCorrectAcrossIslands = Object.values(newScores).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

      const newDiamond = totalLessonItems > 0
        ? Math.min(100, Math.round((totalCorrectAcrossIslands / totalLessonItems) * 100))
        : 0;

      return {
        ...prev,
        lessonData: {
          ...prev.lessonData,
          [lessonId]: {
            ...currentData,
            islandScores: newScores,
            islandCompletionDates: newCompletionDates,
            islandDiamonds: newIslandDiamonds,
            diamond: newDiamond
          }
        }
      };
    });

    setSection(SectionType.PATH);
  };

  // ====== PATH UI data ======
  const getIslandProgressForUI = () => {
    const lessonId = (progress as any).currentLesson;
    const config = LESSON_CONFIGS.find(l => l.id === lessonId);
    if (!config) return [];
    const scores = (progress as any).lessonData?.[lessonId]?.islandScores || {};
    return config.modules.map(m => scores[m] || 0);
  };

  // ====== LOCK RULES (perfect completion + next day) ======
  const isModuleLocked = (moduleType: PracticeModuleType) => {
    if (isAdmin) return false;

    const lessonId = (progress as any).currentLesson;
    const config = LESSON_CONFIGS.find(l => l.id === lessonId);
    if (!config) return true;

    const idx = config.modules.indexOf(moduleType);
    if (idx === 0) return false;

    const prevModule = config.modules[idx - 1];
    const prevScore = (progress as any).lessonData?.[lessonId]?.islandScores?.[prevModule] || 0;
    const prevMax = PRACTICE_ITEMS.filter(i => i.moduleType === prevModule).length;

    // critério 1: anterior concluída (score == total)
    if (prevScore < prevMax) return true;

    // critério 2: só dia seguinte
    const completionDay = (progress as any).lessonData?.[lessonId]?.islandCompletionDates?.[prevModule];
    if (completionDay === getTodayKey()) return true;

    return false;
  };

  const isLessonLocked = (id: number) => {
    if (isAdmin || id === 1) return false;

    const prev = (progress as any).lessonData?.[id - 1];
    if (!prev || prev.diamond < 100) return true;

    const lastMod = LESSON_CONFIGS.find(l => l.id === id - 1)?.modules.slice(-1)[0];
    const completionDay = prev.islandCompletionDates?.[lastMod!];
    return completionDay === getTodayKey();
  };

  // ====== current item for PracticeSection ======
  const currentItem = baseItems[currentBaseIndex];

  return (
    <>
      {section !== SectionType.INFO && section !== SectionType.PRACTICE && (
        <Header
          studentName={student.name}
          totalStars={(progress as any).totalStars ?? 0}
          currentLesson={(progress as any).currentLesson}
          onLogout={() => window.location.reload()}
        />
      )}

      {section === SectionType.INFO && (
        <InfoSection onStart={startLesson} />
      )}

      {section === SectionType.PATH && (
        <LearningPathView
          currentLesson={(progress as any).currentLesson}
          lessonData={(progress as any).lessonData}
          getIslandProgress={getIslandProgressForUI}
          isModuleLocked={isModuleLocked}
          isLessonLocked={isLessonLocked}
          onStartModule={startModule}
          onNextLesson={() => {
            const next = (progress as any).currentLesson + 1;
            setProgress((prev: any) => ({
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

      {section === SectionType.PRACTICE && currentItem && (
        <PracticeSection
          item={currentItem}
          // agora currentIndex é o índice real da questão base (0..N-1)
          currentIndex={currentBaseIndex}
          // totalItems é o total da ilha (N)
          totalItems={baseItems.length}
          onResult={handleResult}
          // progress (0..100) baseado em quantas questões estão correct
          progress={progressPercent}
          totalItemsInModule={baseItems.length}
          lessonId={(progress as any).currentLesson}
          // Observação: se você quiser desenhar as "bolinhas" no PracticeSection,
          // você vai precisar passar também qState e talvez hadAnyMistake:
          // qState={qState}
        />
      )}

      {section === SectionType.RESULTS && (
        <ResultDashboard
          lessonId={(progress as any).currentLesson}
          diamond={(progress as any).lessonData?.[(progress as any).currentLesson]?.diamond || 0}
          islandScores={(progress as any).lessonData?.[(progress as any).currentLesson]?.islandScores || {}}
          onSendToTeacher={() => {
            setProgress((prev: any) => ({ ...prev, sentToTeacher: true }));
            saveAssessmentResult(progress as any);
          }}
          onNextLesson={() => {
            const next = (progress as any).currentLesson + 1;
            setProgress((prev: any) => ({
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

      <div style={{ position: 'fixed', bottom: 10, right: 10, fontSize: '12px', opacity: 0.5 }}>
        {authStatus.status === 'ok'
          ? `Auth: OK ${authStatus.uid?.substring(0, 8)}`
          : `Auth: ${authStatus.status}`}
      </div>
    </>
  );
};

export default App;