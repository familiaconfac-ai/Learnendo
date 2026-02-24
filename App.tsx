import React, { useState, useEffect } from 'react';
import { SectionType, PracticeItem, PracticeModuleType, UserProgress, AnswerLog } from './types';
import { PRACTICE_ITEMS, MODULE_NAMES, LESSON_CONFIGS } from './constants';
import {
  InfoSection,
  PracticeSection,
  ResultDashboard,
  Header,
  LearningPathView
} from './components/UI';
import { saveAssessmentResult } from './services/db';
import { ensureAnonAuth, auth } from './services/firebase';

const STORAGE_KEY = 'learnendo_v14_mastery'; // Versão atualizada para reset de lógica
const BYPASS_KEY = 'Martins';

const getModuleCountsForLesson = (lessonId: number) => {
  const config = LESSON_CONFIGS.find(l => l.id === lessonId);
  if (!config) return [];
  return config.modules.map(m => PRACTICE_ITEMS.filter(i => i.moduleType === m).length);
};

type ActivePracticeItem = PracticeItem & {
  __baseId: string;
};

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
        1: { diamond: 0, islandScores: {}, islandCompletionDates: {} }
      },
      totalStars: 0,
      streakCount: 0,
      iceCount: 0,
      virtualDayOffset: 0,
      bypassActive: false,
      sentToTeacher: false
    };
  });

  const [activeItems, setActiveItems] = useState<ActivePracticeItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [attemptedBaseIds, setAttemptedBaseIds] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<AnswerLog[]>([]);
  const [activeModule, setActiveModule] = useState<PracticeModuleType | undefined>();

  const isAdmin = student.name === BYPASS_KEY || progress.bypassActive;

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

  const startLesson = (name: string) => {
    setStudent({ name });
    setStartTime(Date.now());
    if (name === BYPASS_KEY) setProgress(prev => ({ ...prev, bypassActive: true }));
    setSection(SectionType.PATH);
  };

  const startModule = (type: PracticeModuleType) => {
    const baseItems: ActivePracticeItem[] = PRACTICE_ITEMS
      .filter(i => i.moduleType === type)
      .map((item, idx) => ({
        ...item,
        id: `${type}__${idx}`,
        __baseId: `${type}__${idx}`
      }));

    setActiveItems(baseItems);
    setCurrentIdx(0);
    setAttemptedBaseIds({});
    setLogs([]);
    setActiveModule(type);
    setSection(SectionType.PRACTICE);
  };

  const handleResult = (isCorrect: boolean, val: string) => {
    const item = activeItems[currentIdx];
    const baseId = item.__baseId;
    const isFirstTry = !attemptedBaseIds[baseId];

    if (isFirstTry) setAttemptedBaseIds(prev => ({ ...prev, [baseId]: true }));

    setLogs(prev => [...prev, {
      question: item.instruction,
      userAnswer: val,
      correctAnswer: item.correctValue,
      isCorrect,
      isFirstTry,
      questionId: baseId,
      timestamp: Date.now()
    }]);

    if (!isCorrect) {
      const retry: ActivePracticeItem = {
        ...item,
        id: `${baseId}-retry-${Date.now()}`,
        __baseId: baseId
      };
      setActiveItems(prev => [...prev, retry]);
      setCurrentIdx(prev => prev + 1);
      return;
    }

    if (isFirstTry) {
      const points = item.type === 'speaking' ? 10 : item.type === 'writing' ? 5 : 2;
      setProgress(prev => ({ ...prev, totalStars: prev.totalStars + points }));
    }

    if (currentIdx < activeItems.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      finalizeIsland();
    }
  };

  const finalizeIsland = () => {
    const currentTrack = activeModule!;
    const lessonId = progress.currentLesson;
    const totalItemsInModule = PRACTICE_ITEMS.filter(i => i.moduleType === currentTrack).length;

    const uniqueCorrectAnswers = new Set<string>();
    logs.forEach(log => { if (log.isCorrect && log.questionId) uniqueCorrectAnswers.add(log.questionId); });
    
    const correctUniqueCount = uniqueCorrectAnswers.size;

    setProgress(prev => {
      const currentData = prev.lessonData[lessonId] || { diamond: 0, islandScores: {}, islandCompletionDates: {} };
      const newScores = { ...currentData.islandScores, [currentTrack]: correctUniqueCount };

      const lessonConfig = LESSON_CONFIGS.find(l => l.id === lessonId);
      const totalLessonItems = PRACTICE_ITEMS.filter(i => lessonConfig?.modules.includes(i.moduleType)).length;
      const totalCorrect = Object.values(newScores).reduce((a: any, b: any) => a + b, 0);
      const newDiamond = totalLessonItems > 0 ? Math.min(100, Math.round((totalCorrect / totalLessonItems) * 100)) : 0;

      return {
        ...prev,
        lessonData: {
          ...prev.lessonData,
          [lessonId]: {
            ...currentData,
            islandScores: newScores,
            diamond: newDiamond,
            islandCompletionDates: {
              ...currentData.islandCompletionDates,
              ...(correctUniqueCount >= totalItemsInModule ? { [currentTrack]: getTodayKey() } : {})
            }
          }
        }
      };
    });
    setSection(SectionType.PATH);
  };

  const getIslandProgressForUI = () => {
    const lessonId = progress.currentLesson;
    const config = LESSON_CONFIGS.find(l => l.id === lessonId);
    if (!config) return [];
    const scores = progress.lessonData[lessonId]?.islandScores || {};
    return config.modules.map(m => scores[m] || 0);
  };

  const isModuleLocked = (moduleType: PracticeModuleType) => {
    if (isAdmin) return false;
    const lessonId = progress.currentLesson;
    const config = LESSON_CONFIGS.find(l => l.id === lessonId);
    if (!config) return true;
    const idx = config.modules.indexOf(moduleType);
    if (idx === 0) return false;

    const prevModule = config.modules[idx - 1];
    const prevScore = progress.lessonData[lessonId]?.islandScores[prevModule] || 0;
    const prevMax = PRACTICE_ITEMS.filter(i => i.moduleType === prevModule).length;
    
    if (prevScore < prevMax) return true;
    return progress.lessonData[lessonId]?.islandCompletionDates?.[prevModule] === getTodayKey();
  };

  const isLessonLocked = (id: number) => {
    if (isAdmin || id === 1) return false;
    const prev = progress.lessonData[id - 1];
    if (!prev || prev.diamond < 100) return true;
    const lastMod = LESSON_CONFIGS.find(l => l.id === id - 1)?.modules.slice(-1)[0];
    return prev.islandCompletionDates?.[lastMod!] === getTodayKey();
  };

  return (
    <div className="min-h-screen bg-blue-50 pb-8 flex flex-col items-center">
      <div className="w-full max-w-sm px-4 pt-6">
        {section !== SectionType.INFO && section !== SectionType.PRACTICE && (
          <Header lessonId={progress.currentLesson} progress={progress} />
        )}

        {section === SectionType.INFO && <InfoSection onStart={startLesson} />}

        {section === SectionType.PATH && (
          <LearningPathView
            progress={progress}
            moduleNames={MODULE_NAMES}
            onSelectModule={startModule}
            isLessonLocked={isLessonLocked}
            isModuleLocked={isModuleLocked}
            islandWeights={getModuleCountsForLesson(progress.currentLesson)}
            islandProgress={getIslandProgressForUI()}
          />
        )}

        {section === SectionType.PRACTICE && activeItems[currentIdx] && (
          <PracticeSection
            item={activeItems[currentIdx]}
            onResult={handleResult}
            currentIdx={new Set(logs.filter(l => l.isCorrect).map(l => l.questionId)).size}
            totalItems={PRACTICE_ITEMS.filter(i => i.moduleType === activeModule).length}
            lessonId={progress.currentLesson}
          />
        )}

        {section === SectionType.RESULTS && (
          <ResultDashboard
            score={progress.lessonData[progress.currentLesson]?.diamond || 0}
            totalTime={(Date.now() - startTime) / 1000}
            sentToTeacher={progress.sentToTeacher}
            currentLesson={progress.currentLesson}
            onWhatsApp={() => setProgress(prev => ({ ...prev, sentToTeacher: true }))}
            onNextLesson={() => {
              const next = progress.currentLesson + 1;
              setProgress(prev => ({
                ...prev, currentLesson: next,
                lessonData: { ...prev.lessonData, [next]: prev.lessonData[next] || { diamond: 0, islandScores: {}, islandCompletionDates: {} } }
              }));
              setSection(SectionType.PATH);
            }}
            onRestart={() => setSection(SectionType.PATH)}
            isAdmin={isAdmin}
            todayKey={getTodayKey()}
          />
        )}
      </div>
      <footer className="fixed bottom-0 left-0 right-0 bg-black/90 text-[8px] text-white/70 px-2 py-1 text-center font-mono">
        {authStatus.status === 'ok' ? `Auth: OK ${authStatus.uid?.substring(0,8)}` : `Auth: ${authStatus.status}`}
      </footer>
    </div>
  );
};

export default App;