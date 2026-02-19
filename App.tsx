
import React, { useState, useEffect } from 'react';
import { SectionType, PracticeItem, PracticeModuleType, UserProgress, AnswerLog } from './types';
import { PRACTICE_ITEMS, MODULE_NAMES, LESSON_CONFIGS } from './constants';
import { 
  InfoSection, PracticeSection, ResultDashboard, Header, LearningPathView
} from './components/UI';
import { saveAssessmentResult } from './services/db';

const STORAGE_KEY = 'learnendo_user_v7';
// Corrected bypass key as requested: Martins73
const BYPASS_KEY = 'Martins73';

const App: React.FC = () => {
  const [section, setSection] = useState<SectionType>(SectionType.INFO);
  const [student, setStudent] = useState({ name: '' });
  
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {
      currentLesson: 1,
      unlockedModules: ['L1_TRACK1'],
      completedModules: [],
      totalPoints: 0,
      streakCount: 0,
      startDate: new Date().toISOString(),
      sentToTeacher: false,
      bypassActive: false
    };
  });
  
  const [activeItems, setActiveItems] = useState<PracticeItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [firstTryCorrectCount, setFirstTryCorrectCount] = useState(0);
  const [logs, setLogs] = useState<AnswerLog[]>([]);
  const [activeModule, setActiveModule] = useState<PracticeModuleType | undefined>();

  // Logical Flag for Admin Access
  const isAdmin = student.name === BYPASS_KEY || progress.bypassActive;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    checkDailyUnlock(progress);
  }, [progress, student.name]);

  const checkDailyUnlock = (p: UserProgress) => {
    // ADMIN BYPASS: Ignore all daily locking rules
    if (isAdmin) return;

    const now = new Date();
    const start = new Date(p.startDate || now.toISOString());
    const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 3600 * 24));
    
    const currentLessonConfig = LESSON_CONFIGS.find(l => l.id === p.currentLesson);
    if (!currentLessonConfig) return;

    const newUnlocked = [...p.unlockedModules];
    let changed = false;

    currentLessonConfig.modules.forEach((modType, idx) => {
      if (idx === 0) return; 
      
      const prevMod = currentLessonConfig.modules[idx - 1];
      const isPrevCompleted = p.completedModules.includes(prevMod);
      const isTimeRight = daysSinceStart >= idx;

      if (isTimeRight && isPrevCompleted && !newUnlocked.includes(modType)) {
        newUnlocked.push(modType);
        changed = true;
      }
    });

    if (changed) {
      setProgress(prev => ({ ...prev, unlockedModules: [...new Set(newUnlocked)] }));
    }
  };

  const startLesson = (name: string) => {
    // Logic: Admin Mode prevails immediately
    const isNowAdmin = name === BYPASS_KEY;
    setStudent({ name });
    setStartTime(Date.now());
    
    if (isNowAdmin) {
      // Unlock all possible modules for all lessons immediately
      const allModules = LESSON_CONFIGS.flatMap(l => l.modules);
      setProgress(prev => ({ 
        ...prev, 
        bypassActive: true, 
        unlockedModules: allModules as PracticeModuleType[] 
      }));
    } else {
      setProgress(prev => ({ ...prev, bypassActive: false }));
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

    if (isFirstTry) setFirstTryCorrectCount(prev => prev + 1);

    if (currentIdx < activeItems.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      const activeModuleType = activeModule!;
      const baseItemsCount = PRACTICE_ITEMS.filter(i => i.moduleType === activeModuleType).length;
      const pointsGained = Math.round((firstTryCorrectCount / baseItemsCount) * 100);
      
      const newCompleted = [...new Set([...progress.completedModules, activeModuleType])];
      const now = new Date();

      const currentLessonConfig = LESSON_CONFIGS.find(l => l.id === progress.currentLesson)!;
      const isMasteryTrack = currentLessonConfig.modules[currentLessonConfig.modules.length - 1] === activeModuleType;

      setProgress(prev => ({ 
        ...prev, 
        completedModules: newCompleted, 
        totalPoints: prev.totalPoints + pointsGained,
        streakCount: prev.streakCount + 1,
        lastCompletionDate: now.toISOString()
      }));

      // Only show result dashboard for the final Mastery track
      if (isMasteryTrack) {
        finishLesson();
      } else {
        setSection(SectionType.PATH);
      }
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
    if (progress.currentLesson < 24) { 
      const nextL = progress.currentLesson + 1;
      const firstModOfNext = `L${nextL}_TRACK1`;
      
      setProgress(prev => ({
        ...prev,
        currentLesson: nextL,
        startDate: new Date().toISOString(),
        unlockedModules: isAdmin ? prev.unlockedModules : [...new Set([...prev.unlockedModules, firstModOfNext])],
        sentToTeacher: false
      }));
      setSection(SectionType.PATH);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 pb-8 flex justify-center">
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
          />
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
            score={(firstTryCorrectCount / PRACTICE_ITEMS.filter(i => i.moduleType === activeModule).length) * 10} 
            totalTime={(Date.now() - startTime) / 1000}
            sentToTeacher={progress.sentToTeacher}
            currentLesson={progress.currentLesson}
            onWhatsApp={() => setProgress(prev => ({ ...prev, sentToTeacher: true }))}
            onNextLesson={nextLessonAction}
            onRestart={() => setSection(SectionType.PATH)}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </div>
  );
};

export default App;
