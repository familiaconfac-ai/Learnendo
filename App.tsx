import React, { useState, useEffect } from 'react';
import { SectionType, PracticeItem, PracticeModuleType, UserProgress, AnswerLog } from './types';
import { PRACTICE_ITEMS, MODULE_NAMES, LESSON_CONFIGS } from './constants';
import { 
  InfoSection, PracticeSection, ResultDashboard, Header, LearningPathView
} from './components/UI';
import { saveAssessmentResult } from './services/db';
import { ensureAnonAuth, auth } from './services/firebase';

console.log('Firebase Auth Object:', auth);

const STORAGE_KEY = 'learnendo_v8_mastery';
const BYPASS_KEY = 'Martins73';

const ISLAND_WEIGHTS = [25, 15, 15, 10, 10, 10, 15];

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
  
  const [activeItems, setActiveItems] = useState<PracticeItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [firstTryCorrectCount, setFirstTryCorrectCount] = useState(0);
  const [logs, setLogs] = useState<AnswerLog[]>([]);
  const [activeModule, setActiveModule] = useState<PracticeModuleType | undefined>();

  const isAdmin = student.name === BYPASS_KEY || progress.bypassActive;

  // Initialize Anonymous Auth on mount within a useEffect
  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      try {
        const res = await ensureAnonAuth();
        if (mounted) {
          setAuthStatus({ status: 'ok', uid: res.uid });
        }
      } catch (err: any) {
        console.error("Authentication failed:", err);
        if (mounted) {
          setAuthStatus({ status: 'error', message: err.message || 'Auth failure' });
        }
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
      
      // Update score only if it's better
      oldScores[currentTrack] = Math.max(oldScores[currentTrack] || 0, rawIslandScore);
      
      // Calculate total diamond score for the lesson
      const totalDiamond = (Object.values(oldScores) as number[]).reduce((a: number, b: number) => a + b, 0);
      
      const today = getTodayKey();
      let newStreak = prev.streakCount;
      
      // Check if this specific island was just completed perfectly for the first time today
      if (rawIslandScore >= weight) {
         if (!lessonData[lessonId].islandCompletionDates) {
            lessonData[lessonId].islandCompletionDates = {};
         }
         if (!lessonData[lessonId].islandCompletionDates[currentTrack]) {
            lessonData[lessonId].islandCompletionDates[currentTrack] = today;
            // Only increment streak if the whole lesson reaches 100%? 
            // The user said "If the person gets 21 out of 25, it means they did not get 100%. On that island, so they have to do it again. Because then the next island will not open."
         }
      }

      lessonData[lessonId] = {
        ...lessonData[lessonId],
        islandScores: oldScores,
        diamond: Math.min(100, totalDiamond)
      };

      return { ...prev, lessonData, streakCount: newStreak };
    });

    setSection(SectionType.PATH);
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

  const isModuleLocked = (moduleType: PracticeModuleType) => {
    if (isAdmin) return false;
    const lessonId = progress.currentLesson;
    const lessonConfig = LESSON_CONFIGS.find(l => l.id === lessonId)!;
    const trackIndex = lessonConfig.modules.indexOf(moduleType);
    
    if (trackIndex === 0) return false; // First island always open
    
    const prevModule = lessonConfig.modules[trackIndex - 1];
    const prevScore = progress.lessonData[lessonId]?.islandScores[prevModule] || 0;
    const prevMax = ISLAND_WEIGHTS[trackIndex - 1];
    
    // Must have 100% on previous island
    if (prevScore < prevMax) return true;
    
    // Must be a different day than when previous island was completed
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
    if (!prevData || prevData.diamond < 100) return true;
    
    // Check if the last island of the previous lesson was completed today
    const lessonConfig = LESSON_CONFIGS.find(l => l.id === prevL)!;
    const lastModule = lessonConfig.modules[lessonConfig.modules.length - 1];
    const completionDay = prevData.islandCompletionDates?.[lastModule];
    
    const today = getTodayKey();
    if (completionDay === today) return true;
    return false;
  };

  const handleAuthAction = async (email: string, pass: string, isLogin: boolean) => {
    try {
      const { loginWithEmail, registerWithEmail } = await import('./services/firebase');
      const user = isLogin 
        ? await loginWithEmail(email, pass)
        : await registerWithEmail(email, pass);
        
      if (user && user.email) {
        startLesson(user.email.split('@')[0]);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      alert(err.message || "Authentication failed");
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 pb-8 flex flex-col items-center">
      <div className="w-full max-w-sm px-4 pt-6">
        {section !== SectionType.INFO && section !== SectionType.PRACTICE && (
          <Header lessonId={progress.currentLesson} progress={progress} />
        )}
        
        {section === SectionType.INFO && <InfoSection onStart={startLesson} onAuthAction={handleAuthAction} />}
        {section === SectionType.PATH && (
          <>
            <LearningPathView 
              progress={progress} 
              moduleNames={MODULE_NAMES} 
              onSelectModule={startModule}
              isLessonLocked={isLessonLocked}
              isModuleLocked={isModuleLocked}
              islandWeights={ISLAND_WEIGHTS}
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