
import React, { useState, useEffect, useMemo } from 'react';
import { SectionType, PracticeItem, PracticeModuleType, UserProgress, AnswerLog } from './types';
import { PRACTICE_ITEMS, MODULE_NAMES, LESSON_CONFIGS } from './constants';
import { 
  InfoSection, PracticeSection, ResultDashboard, Header, LearningPathView
} from './components/UI';
import { saveAssessmentResult } from './services/db';

const STORAGE_KEY = 'learnendo_v8_mastery';
const BYPASS_KEY = 'Martins73';

const ISLAND_WEIGHTS = [25, 15, 15, 15, 10, 10, 10];

const App: React.FC = () => {
  const [section, setSection] = useState<SectionType>(SectionType.INFO);
  const [student, setStudent] = useState({ name: '' });
  
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
      bypassActive: false
    };
  });
  
  const [activeItems, setActiveItems] = useState<PracticeItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [firstTryCorrectCount, setFirstTryCorrectCount] = useState(0);
  const [logs, setLogs] = useState<AnswerLog[]>([]);
  const [activeModule, setActiveModule] = useState<PracticeModuleType | undefined>();

  const isAdmin = student.name === BYPASS_KEY || progress.bypassActive;

  // Helper: Get effective current date key (string YYYY-MM-DD)
  const getTodayKey = (offset: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + (progress.virtualDayOffset || 0) + offset);
    return d.toISOString().split('T')[0];
  };

  const getYesterdayKey = () => getTodayKey(-1);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  // Handle Streak and Ice Logic on mount and day change
  useEffect(() => {
    const today = getTodayKey();
    if (progress.lastActiveDayKey === today) return;

    setProgress(prev => {
      const yesterday = getYesterdayKey();
      let newStreak = prev.streakCount;
      let newIce = prev.iceCount;

      // If last active was not today or yesterday, streak might break or ice increase
      if (prev.lastActiveDayKey && prev.lastActiveDayKey !== yesterday) {
        // Find gap
        const lastDate = new Date(prev.lastActiveDayKey);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        
        if (diffDays > 1) {
          newStreak = 0; // Broke streak
          newIce += (diffDays - 1); // Missed days are ice
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

  const startModule = (type: PracticeModuleType) => {
    const items = PRACTICE_ITEMS.filter(i => i.moduleType === type);
    setActiveItems(items);
    setCurrentIdx(0);
    setFirstTryCorrectCount(0);
    setLogs([]);
    setActiveModule(type);
    setSection(SectionType.PRACTICE);
  };

  const calculateDifficultyStar = (type: string) => {
    switch(type) {
      case 'speaking': return 10;
      case 'writing': return 5;
      case 'multiple-choice': return 2;
      case 'identification': return 2;
      default: return 3;
    }
  };

  const handleResult = (isCorrect: boolean, val: string) => {
    const item = activeItems[currentIdx];
    const isFirstTry = !logs.some(l => l.question === item.instruction);
    
    setLogs(prev => [...prev, {
      question: item.instruction,
      userAnswer: val,
      correctAnswer: item.correctValue,
      isCorrect,
      isFirstTry
    }]);

    if (!isCorrect) {
      setActiveItems(prev => [...prev, { ...item, id: `${item.id}-retry-${Date.now()}` }]);
      setCurrentIdx(prev => prev + 1);
      return; 
    }

    if (isFirstTry) {
      setFirstTryCorrectCount(prev => prev + 1);
      // Star points are cumulative and never capped
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
    const weight = ISLAND_WEIGHTS[trackIndex] || 10;

    const baseItemsCount = PRACTICE_ITEMS.filter(i => i.moduleType === currentTrack).length;
    const islandPercentage = firstTryCorrectCount / baseItemsCount;
    const rawIslandScore = Math.round(islandPercentage * weight);

    setProgress(prev => {
      const lessonData = { ...prev.lessonData };
      if (!lessonData[lessonId]) lessonData[lessonId] = { diamond: 0, islandScores: {} };
      
      const oldScores = { ...lessonData[lessonId].islandScores };
      // Diamond score respects the ceiling per island
      oldScores[currentTrack] = Math.max(oldScores[currentTrack] || 0, rawIslandScore);

      // Fix: Cast Object.values to number[] to ensure reduce results in a number and avoid 'unknown' operator issues on lines 171, 178, and 188
      const totalDiamond = (Object.values(oldScores) as number[]).reduce((a: number, b: number) => a + b, 0);
      
      const isLastIsland = trackIndex === lessonConfig.modules.length - 1;
      const today = getTodayKey();

      // Streak logic: If lesson reaches 100 today for the first time
      let newStreak = prev.streakCount;
      if (totalDiamond >= 100 && lessonData[lessonId].diamond < 100) {
        if (lessonData[lessonId].lastCompletionDayKey !== today) {
           newStreak += 1;
           lessonData[lessonId].lastCompletionDayKey = today;
        }
      }

      lessonData[lessonId] = {
        ...lessonData[lessonId],
        islandScores: oldScores,
        diamond: Math.min(100, totalDiamond)
      };

      return { ...prev, lessonData, streakCount: newStreak };
    });

    const isMasteryTrack = trackIndex === lessonConfig.modules.length - 1;
    if (isMasteryTrack) {
      finishLesson();
    } else {
      setSection(SectionType.PATH);
    }
  };

  const finishLesson = async () => {
    setSection(SectionType.RESULTS);
    const totalTime = (Date.now() - startTime) / 1000;
    const baseItemsCount = PRACTICE_ITEMS.filter(i => i.moduleType === activeModule).length;
    const finalScore = (firstTryCorrectCount / baseItemsCount) * 10;

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

  const isLessonLocked = (lessonId: number) => {
    if (isAdmin) return false;
    if (lessonId === 1) return false;
    
    const prevL = lessonId - 1;
    const prevData = progress.lessonData[prevL];
    if (!prevData || prevData.diamond < 100) return true;

    // Check if it's past midnight of completion day
    const completionDay = prevData.lastCompletionDayKey;
    const today = getTodayKey();
    if (completionDay === today) return true; // Still the same day

    return false;
  };

  return (
    <div className="min-h-screen bg-blue-50 pb-8 flex justify-center">
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
              islandWeights={ISLAND_WEIGHTS}
            />
            {isAdmin && (
              <div className="fixed bottom-4 left-4 z-[200]">
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
            currentIdx={currentIdx} 
            totalItems={activeItems.length}
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
    </div>
  );
};

export default App;
