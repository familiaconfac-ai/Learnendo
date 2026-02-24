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
const STORAGE_KEY = 'learnendo_v11_mastery'; // Mudado para v11 para forçar reset
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
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      currentLesson: 1,
      lessonData: {
        1: { 
          diamond: 0, 
          islandScores: {},
          islandCompletionDates: {} 
        }
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

  // Streak/Ice logic
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
          newIce += (diffDays - 1);
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
   * Generate stable __baseId per question based on (moduleType + index)
   */
  const startModule = (type: PracticeModuleType) => {
    const baseItems: ActivePracticeItem[] = PRACTICE_ITEMS
      .filter(i => i.moduleType === type)
      .map((item, idx) => {
        const baseId = `${type}__${idx + 1}`;
        return {
          ...item,
          id: baseId,      // unique render id
          __baseId: baseId // stable id for tracking
        } as ActivePracticeItem;
      });

    setActiveItems(baseItems);
    setCurrentIdx(0);
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
   * Handle answer result
   * - Track first tries for stars
   * - Track all correct answers for progress
   */
  const handleResult = (isCorrect: boolean, val: string) => {
    const item = activeItems[currentIdx];
    const baseId = item.__baseId;

    const isFirstTry = !attemptedBaseIds[baseId];

    if (isFirstTry) {
      setAttemptedBaseIds(prev => ({ ...prev, [baseId]: true }));
    }

    // Add to logs with question ID for tracking
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

    // Correct answer - give stars only on first try
    if (isFirstTry) {
      const starPoints = calculateDifficultyStar(item.type);
      setProgress(prev => ({ ...prev, totalStars: prev.totalStars + starPoints }));
    }

    // Move to next question or finish
    if (currentIdx < activeItems.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      finalizeIsland();
    }
  };

  /**
   * Finalize island and update progress
   * - Count unique correct answers for progress
   * - Check if perfect (all questions answered correctly)
   * - Update diamond percentage
   */
  const finalizeIsland = () => {
    const currentTrack = activeModule!;
    const lessonId = progress.currentLesson;
    const lessonConfig = LESSON_CONFIGS.find(l => l.id === lessonId)!;
    const trackIndex = lessonConfig.modules.indexOf(currentTrack);

    const moduleCounts = getModuleCountsForLesson(lessonId);
    const baseItemsCount = PRACTICE_ITEMS.filter(i => i.moduleType === currentTrack).length;

    // Count UNIQUE correct answers (each question only counts once)
    const uniqueCorrectAnswers = new Set<string>();
    
    logs.forEach(log => {
      if (log.isCorrect && log.questionId) {
        uniqueCorrectAnswers.add(log.questionId);
      }
    });
    
    const correctUniqueCount = uniqueCorrectAnswers.size;

    // Check if ALL questions were answered correctly at least once
    const isPerfect = correctUniqueCount === baseItemsCount;

    setProgress(prev => {
      const lessonData = { ...prev.lessonData };
      if (!lessonData[lessonId]) {
        lessonData[lessonId] = { 
          diamond: 0, 
          islandScores: {},
          islandCompletionDates: {} 
        };
      }

      // Ensure islandCompletionDates exists
      if (!lessonData[lessonId].islandCompletionDates) {
        lessonData[lessonId].islandCompletionDates = {};
      }

      const oldScores = { ...lessonData[lessonId].islandScores };

      // Store the number of unique correct answers (not first-try only)
      oldScores[currentTrack] = Math.max(oldScores[currentTrack] || 0, correctUniqueCount);

      const today = getTodayKey();

      // If perfect, record completion date (for cooldown)
      if (isPerfect) {
        lessonData[lessonId].islandCompletionDates![currentTrack] = today;
      }

      // Calculate diamond percentage based on total correct answers across all islands
      const lessonTotalItems = moduleCounts.reduce((a, b) => a + b, 0);
      
      // Sum all island scores (unique correct answers per island)
      const totalCorrect = Object.values(oldScores).reduce((a: number, b: number) => a + b, 0);
      
      const diamondPct = lessonTotalItems > 0 
        ? Math.min(100, Math.round((totalCorrect / lessonTotalItems) * 100)) 
        : 0;

      lessonData[lessonId] = {
        ...lessonData[lessonId],
        islandScores: oldScores,
        diamond: diamondPct
      };

      return { ...prev, lessonData };
    });

    setSection(SectionType.PATH);
  };

  const finishLesson = async () => {
    setSection(SectionType.RESULTS);
    const totalTime = (Date.now() - startTime) / 1000;
    
    // Count unique correct answers for score
    const uniqueCorrect = new Set<string>();
    logs.forEach(log => {
      if (log.isCorrect && log.questionId) {
        uniqueCorrect.add(log.questionId);
      }
    });
    
    const baseItemsCount = PRACTICE_ITEMS.filter(i => i.moduleType === activeModule).length;
    const finalScore = baseItemsCount > 0 ? (uniqueCorrect.size / baseItemsCount) * 10 : 0;

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
          [nextL]: prev.lessonData[nextL] || { 
            diamond: 0, 
            islandScores: {},
            islandCompletionDates: {} 
          }
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
   * Check if module is locked
   * Rules:
   * 1. Must have perfect score on previous module (all questions answered correctly)
   * 2. Must be a different day than completion date (cooldown)
   */
  const isModuleLocked = (moduleType: PracticeModuleType) => {
    if (isAdmin) return false;

    const lessonId = progress.currentLesson;
    const lessonConfig = LESSON_CONFIGS.find(l => l.id === lessonId);
    if (!lessonConfig) return true;
    
    const trackIndex = lessonConfig.modules.indexOf(moduleType);

    if (trackIndex === 0) return false; // first island always open

    const prevModule = lessonConfig.modules[trackIndex - 1];
    const prevScore = progress.lessonData[lessonId]?.islandScores[prevModule] || 0;

    const moduleCounts = getModuleCountsForLesson(lessonId);
    const prevMax = moduleCounts[trackIndex - 1]; // total items in prev island

    // Criterion 1: must have answered all questions correctly at least once
    if (prevScore < prevMax) return true;

    // Criterion 2: must wait until next day
    const completionDate = progress.lessonData[lessonId]?.islandCompletionDates?.[prevModule];
    const today = getTodayKey();
    if (completionDate === today) return true;

    return false;
  };

  /**
   * Check if lesson is locked
   * Rules:
   * 1. Previous lesson must be 100% complete (diamond = 100)
   * 2. Must wait until next day after completing last module
   */
  const isLessonLocked = (lessonId: number) => {
    if (isAdmin) return false;
    if (lessonId === 1) return false;

    const prevL = lessonId - 1;
    const prevData = progress.lessonData[prevL];
    if (!prevData) return true;

    // Lesson must be 100% diamond to unlock next lesson
    if (prevData.diamond < 100) return true;

    // Also enforce "next day" after last island perfect completion
    const lessonConfig = LESSON_CONFIGS.find(l => l.id === prevL);
    if (!lessonConfig) return true;
    
    const lastModule = lessonConfig.modules[lessonConfig.modules.length - 1];

    const completionDay = prevData.islandCompletionDates?.[lastModule];
    const today = getTodayKey();
    if (completionDay === today) return true;

    return false;
  };

  // Get denominator counts for UI island progress
  const islandCounts = getModuleCountsForLesson(progress.currentLesson);

  // Calculate current progress for practice section
  const getCurrentProgress = () => {
    if (!activeModule) return 0;
    
    // Count unique correct answers so far in this session
    const uniqueCorrectInSession = new Set<string>();
    logs.forEach(log => {
      if (log.isCorrect && log.questionId) {
        uniqueCorrectInSession.add(log.questionId);
      }
    });
    
    return uniqueCorrectInSession.size;
  };

  const getTotalItemsForCurrentModule = () => {
    if (!activeModule) return 0;
    return PRACTICE_ITEMS.filter(i => i.moduleType === activeModule).length;
  };

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
            // Show progress based on unique correct answers
            currentIdx={getCurrentProgress()}
            totalItems={getTotalItemsForCurrentModule()}
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
            lastCompletionDayKey={progress.lessonData[progress.currentLesson]?.islandCompletionDates?.[activeModule!]}
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