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

console.log('Firebase Auth Object:', auth);

// Bump this to force a clean reset for testing
const STORAGE_KEY = 'learnendo_v10_mastery';
const BYPASS_KEY = 'Martins';

// Helper: total item counts (denominators) for each module in a given lesson.
// This is the TRUE "max" for each island (e.g., 25, 15, etc.).
const getModuleCountsForLesson = (lessonId: number) => {
  const config = LESSON_CONFIGS.find(l => l.id === lessonId);
  if (!config) return [];
  return config.modules.map(m => PRACTICE_ITEMS.filter(i => i.moduleType === m).length);
};

// Local extension: we attach stable base ids to each active item to avoid collisions.
type ActivePracticeItem = PracticeItem & {
  __baseId: string; // stable id per original question
};

const App: React.FC = () => {
  const [section, setSection] = useState<SectionType>(SectionType.INFO);
  const [student, setStudent] = useState({ name: '' });
  const [authStatus, setAuthStatus] = useState<{ status: 'loading' | 'ok' | 'error'; uid?: string; message?: string }>({ status: 'loading' });

  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {
      currentLesson: 1,
      lessonData: {
        1: { diamond: 0, islandScores: {} }
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

  // Perfect progress: counts ONLY first-try correct answers (no mistakes)
  const [firstTryCorrectCount, setFirstTryCorrectCount] = useState(0);

  // Tracks whether each base question has been attempted already in this run (to detect first try)
  const [attemptedBaseIds, setAttemptedBaseIds] = useState<Record<string, boolean>>({});

  const [logs, setLogs] = useState<AnswerLog[]>([]);
  const [activeModule, setActiveModule] = useState<PracticeModuleType | undefined>();

  const isAdmin = student.name === BYPASS_KEY || progress.bypassActive;

  // Initialize Anonymous Auth
  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      try {
        const res = await ensureAnonAuth();
        if (mounted) setAuthStatus({ status: 'ok', uid: res.uid });
      } catch (err: any) {
        console.error("Authentication failed:", err);
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

  const getYesterdayKey = () => getTodayKey(-1);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  // Streak/Ice logic (kept as-is)
  useEffect(() => {
    const today = getTodayKey();
    if (progress.lastActiveDayKey === today) return;

    setProgress(prev => {
      const yesterday = getYesterdayKey();
      let newStreak = prev.streakCount;
      let newIce = prev.iceCount;

      if (prev.lastActiveDayKey && prev.lastActiveDayKey !== yesterday) {
        const lastDate = new Date(prev.lastActiveDayKey);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

        if (diffDays > 1) {
          newStreak = 0;
          new (newIce) += (diffDays - 1);
        }
      }

      return {
        ...prev,
        streakCount: newStreak,
        iceCount: newIce,
        lastActiveDayKey: today
      };
    });
  }, [progress.virtualDayOffset]);

  const startLesson = (name: string) => {
    const isNowAdmin = name === BYPASS_KEY;
    setStudent({ name });
    setStartTime(Date.now());

    if (isNowAdmin) {
      setProgress(prev => ({ ...prev, bypassActive: true }));
    }
    setSection(SectionType.PATH);
  };

  /**
   * Start a module (island).
   * Critical: we generate a stable __baseId per question based on (moduleType + index),
   * ignoring any existing item.id to avoid collisions that cause 1/25, 5/15, etc.
   */
  const startModule = (type: PracticeModuleType) => {
    const baseItems: ActivePracticeItem[] = PRACTICE_ITEMS
      .filter(i => i.moduleType === type)
      .map((item, idx) => {
        const baseId = `${type}__${idx + 1}`;
        return {
          ...item,
          id: baseId,      // unique render id
          __baseId: baseId // stable id for first-try tracking
        } as ActivePracticeItem;
      });

    setActiveItems(baseItems);
    setCurrentIdx(0);
    setFirstTryCorrectCount(0);
    setAttemptedBaseIds({});
    setLogs([]);
    setActiveModule(type);
    setSection(SectionType.PRACTICE);
  };

  const calculateDifficultyStar = (type: string) => {
    switch (type) {
      case 'speaking': return 10;
      case 'writing': return 5;
      case 'multiple-choice': return 2;
      case 'identification': return 2;
      default: return 3;
    }
  };

  /**
   * Perfect logic:
   * - First-try is tracked per __baseId (not instruction, not question text).
   * - If the student answers wrong on first try, that baseId is marked attempted,
   *   and even if they later fix it via retry, it will NOT count toward perfect.
   */
  const handleResult = (isCorrect: boolean, val: string) => {
    const item = activeItems[currentIdx];
    const baseId = item.__baseId;

    const isFirstTry = !attemptedBaseIds[baseId];

    // Mark base as attempted at the first interaction with that base question
    if (isFirstTry) {
      setAttemptedBaseIds(prev => ({ ...prev, [baseId]: true }));
    }

    setLogs(prev => [...prev, {
      question: item.instruction,
      userAnswer: val,
      correctAnswer: item.correctValue,
      isCorrect,
      isFirstTry
    }]);

    if (!isCorrect) {
      // Append a retry item (same baseId, new render id)
      const retry: ActivePracticeItem = {
        ...item,
        id: `${baseId}-retry-${Date.now()}`,
        __baseId: baseId
      };

      setActiveItems(prev => [...prev, retry]);
      setCurrentIdx(prev => prev + 1);
      return;
    }

    // Correct answer
    if (isFirstTry) {
      setFirstTryCorrectCount(prev => prev + 1);
      const starPoints = calculateDifficultyStar(item.type);
      setProgress(prev => ({ ...prev, totalStars: prev.totalStars + starPoints }));
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
    const lessonConfig = LESSON_CONFIGS.find(l => l.id === lessonId)!;
    const trackIndex = lessonConfig.modules.indexOf(currentTrack);

    const moduleCounts = getModuleCountsForLesson(lessonId);
    const baseItemsCount = PRACTICE_ITEMS.filter(i => i.moduleType === currentTrack).length;

    // Perfect means first-try correct count equals total questions in this island
    const isPerfect = firstTryCorrectCount === baseItemsCount;

    // We store the island score as number of perfect first-try hits (0..baseItemsCount)
    const rawIslandScore = firstTryCorrectCount;

    setProgress(prev => {
      const lessonData = { ...prev.lessonData };
      if (!lessonData[lessonId]) lessonData[lessonId] = { diamond: 0, islandScores: {} };

      const oldScores = { ...lessonData[lessonId].islandScores };

      // Keep the best run for this island (max perfect hits achieved)
      oldScores[currentTrack] = Math.max(oldScores[currentTrack] || 0, rawIslandScore);

      // Completion dates: only set when perfect
      const today = getTodayKey();

      if (isPerfect) {
        if (!lessonData[lessonId].islandCompletionDates) lessonData[lessonId].islandCompletionDates = {};
        if (!lessonData[lessonId].islandCompletionDates[currentTrack]) {
          lessonData[lessonId].islandCompletionDates[currentTrack] = today;
        }
      }

      // Diamond must be a TRUE percentage across the entire lesson:
      // sum(perfectHits) / sum(totalItems) * 100
      const lessonTotalItems = moduleCounts.reduce((a, b) => a + b, 0);
      const totalPerfect = (Object.values(oldScores) as number[]).reduce((a: number, b: number) => a + b, 0);
      const diamondPct = lessonTotalItems > 0 ? Math.round((totalPerfect / lessonTotalItems) * 100) : 0;

      lessonData[lessonId] = {
        ...lessonData[lessonId],
        islandScores: oldScores,
        diamond: Math.min(100, diamondPct)
      };

      return { ...prev, lessonData };
    });

    setSection(SectionType.PATH);
  };

  const finishLesson = async () => {
    setSection(SectionType.RESULTS);
    const totalTime = (Date.now() - startTime) / 1000;
    const baseItemsCount = PRACTICE_ITEMS.filter(i => i.moduleType === activeModule).length;
    const finalScore = baseItemsCount > 0 ? (firstTryCorrectCount / baseItemsCount) * 10 : 0;

    await saveAssessmentResult({
      studentName: student.name,
      studentEmail: '',
      lesson: `Lesson ${progress.currentLesson} Mastery`,
      score: parseFloat(finalScore.toFixed(1)),
      durationSeconds: Math.round(totalTime),
      allAnswers: logs
    });
  };

  const nextLessonAction = () => {
    const nextL = progress.currentLesson + 1;
    if (nextL <= 24) {
      setProgress(prev => ({
        ...prev,
        currentLesson: nextL,
        lessonData: {
          ...prev.lessonData,
          [nextL]: prev.lessonData[nextL] || { diamond: 0, islandScores: {} }
        },
        sentToTeacher: false
      }));
      setSection(SectionType.PATH);
    }
  };

  const simulateNextDay = () => {
    setProgress(prev => ({ ...prev, virtualDayOffset: prev.virtualDayOffset + 1 }));
  };

  /**
   * Unlock rule:
   * - Must be perfect on previous island: islandScores[prevModule] === prevMax (count)
   * - Must be a different day than completion date (cooldown)
   */
  const isModuleLocked = (moduleType: PracticeModuleType) => {
    if (isAdmin) return false;

    const lessonId = progress.currentLesson;
    const lessonConfig = LESSON_CONFIGS.find(l => l.id === lessonId)!;
    const trackIndex = lessonConfig.modules.indexOf(moduleType);

    if (trackIndex === 0) return false; // first island always open

    const prevModule = lessonConfig.modules[trackIndex - 1];
    const prevScore = progress.lessonData[lessonId]?.islandScores[prevModule] || 0;

    const moduleCounts = getModuleCountsForLesson(lessonId);
    const prevMax = moduleCounts[trackIndex - 1]; // total items in prev island

    // Criterion (a): must be perfect
    if (prevScore < prevMax) return true;

    // Criterion (b): only next day
    const completionDate = progress.lessonData[lessonId]?.islandCompletionDates?.[prevModule];
    const today = getTodayKey();
    if (completionDate === today) return true;

    return false;
  };

  const isLessonLocked = (lessonId: number) => {
    if (isAdmin) return false;
    if (lessonId === 1) return false;

    const prevL = lessonId - 1;
    const prevData = progress.lessonData[prevL];
    if (!prevData) return true;

    // Lesson must be 100% diamond to unlock next lesson
    if (prevData.diamond < 100) return true;

    // Also enforce "next day" after last island perfect completion
    const lessonConfig = LESSON_CONFIGS.find(l => l.id === prevL)!;
    const lastModule = lessonConfig.modules[lessonConfig.modules.length - 1];

    const completionDay = prevData.islandCompletionDates?.[lastModule];
    const today = getTodayKey();
    if (completionDay === today) return true;

    return false;
  };

  // Denominator counts for UI island progress (X/Y). This fixes the “21/25 stuck” issue.
  const islandCounts = getModuleCountsForLesson(progress.currentLesson);

  return (
    <div className="min-h-screen bg-blue-50 pb-8 flex flex-col items-center">
      <div className="w-full max-w-sm px-4 pt-6">
        {section !== SectionType.INFO && section !== SectionType.PRACTICE && (
          <Header lessonId={progress.currentLesson} progress={progress} />
        )}

        {section === SectionType.INFO && <InfoSection onStart={startLesson} />}

        {section === SectionType.PATH && (
          <>
            <LearningPathView
              progress={progress}
              moduleNames={MODULE_NAMES}
              onSelectModule={startModule}
              isLessonLocked={isLessonLocked}
              isModuleLocked={isModuleLocked}
              islandWeights={islandCounts}
            />

            {isAdmin && (
              <div className="fixed bottom-10 left-4 z-[200]">
                <button
                  onClick={simulateNextDay}
                  className="bg-slate-800 text-white text-[10px] font-black px-4 py-2 rounded-full shadow-lg border-2 border-slate-600 uppercase tracking-tighter active:scale-95"
                >
                  <i className="fas fa-clock mr-2"></i> Simulate Next Day (+{progress.virtualDayOffset})
                </button>
              </div>
            )}
          </>
        )}

        {section === SectionType.PRACTICE && activeItems[currentIdx] && (
          <PracticeSection
            item={activeItems[currentIdx]}
            onResult={handleResult}
            // This shows perfect progress (first-try correct) out of total base items
            currentIdx={firstTryCorrectCount}
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
            onNextLesson={nextLessonAction}
            onRestart={() => setSection(SectionType.PATH)}
            isAdmin={isAdmin}
            todayKey={getTodayKey()}
            lastCompletionDayKey={progress.lessonData[progress.currentLesson]?.lastCompletionDayKey}
          />
        )}
      </div>

      {/* Debug Auth Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/90 text-[8px] text-white/70 px-2 py-1 pointer-events-none z-[9999] font-mono text-center border-t border-white/10">
        {authStatus.status === 'ok'
          ? `Auth: OK uid=${authStatus.uid?.substring(0, 8)}`
          : `Auth: ${authStatus.status === 'loading' ? 'LOADING...' : 'ERROR: ' + (authStatus.message || 'Unknown Failure')}`}
      </footer>
    </div>
  );
};

export default App;