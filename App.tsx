
import React, { useState, useEffect } from 'react';
import { SectionType, PracticeItem, PracticeModuleType, UserProgress, AnswerLog } from './types';
import { PRACTICE_ITEMS, MODULE_NAMES, LESSON_CONFIGS } from './constants';
import { 
  InfoSection, PracticeSection, ResultDashboard, Header, LearningPathView
} from './components/UI';
import { saveAssessmentResult } from './services/db';

const STORAGE_KEY = 'learnendo_user_v6';
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    checkDailyUnlock(progress);
  }, [progress]);

  const checkDailyUnlock = (p: UserProgress) => {
    if (p.bypassActive) return;

    const now = new Date();
    const start = new Date(p.startDate || now.toISOString());
    const dayOfStudy = Math.floor((now.getTime() - start.getTime()) / (1000 * 3600 * 24));
    
    const lessonConfig = LESSON_CONFIGS.find(l => l.id === p.currentLesson);
    if (!lessonConfig) return;

    const lastCompletedIdxInLesson = p.completedModules.filter(m => m.startsWith(`L${p.currentLesson}_TRACK`)).length - 1;
    const nextIdx = lastCompletedIdxInLesson + 1;

    if (nextIdx < lessonConfig.modules.length) {
      const nextMod = lessonConfig.modules[nextIdx] as PracticeModuleType;
      // Unlock logic: Current track must be completed and midnight passed for next island
      if (dayOfStudy >= nextIdx && !p.unlockedModules.includes(nextMod)) {
        setProgress(prev => ({ ...prev, unlockedModules: [...new Set([...prev.unlockedModules, nextMod])] }));
      }
    }
  };

  const startLesson = (name: string) => {
    const isBypass = name === BYPASS_KEY;
    setStudent({ name });
    setStartTime(Date.now());
    
    if (isBypass) {
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
    const isFirstTry = !logs.some(l => l.question === item.id);
    
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

      const lessonModules = LESSON_CONFIGS[progress.currentLesson - 1].modules;
      const lessonComplete = lessonModules.every(m => newCompleted.includes(m));

      setProgress(prev => ({ 
        ...prev, 
        completedModules: newCompleted, 
        totalPoints: prev.totalPoints + pointsGained,
        streakCount: prev.streakCount + (lessonComplete ? 0 : 1),
        lastCompletionDate: now.toISOString()
      }));

      if (lessonComplete) {
        finishLesson();
      } else {
        setSection(SectionType.PATH);
      }
    }
  };

  const finishLesson = async () => {
    setSection(SectionType.RESULTS);
    const totalTime = (Date.now() - startTime) / 1000;
    const finalScore = (firstTryCorrectCount / activeItems.length) * 10;

    await saveAssessmentResult({
      studentName: student.name,
      studentEmail: '',
      lesson: `Lesson ${progress.currentLesson}`,
      score: parseFloat(finalScore.toFixed(1)),
      durationSeconds: Math.round(totalTime),
      allAnswers: logs
    });
  };

  const nextLessonAction = () => {
    if (progress.currentLesson < 12) {
      const nextL = progress.currentLesson + 1;
      const firstMod = `L${nextL}_TRACK1`;
      
      setProgress(prev => ({
        ...prev,
        currentLesson: nextL,
        unlockedModules: prev.bypassActive ? prev.unlockedModules : [...new Set([...prev.unlockedModules, firstMod])],
        sentToTeacher: false,
        startDate: new Date().toISOString()
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
            score={(firstTryCorrectCount / activeItems.length) * 10} 
            totalTime={(Date.now() - startTime) / 1000}
            sentToTeacher={progress.sentToTeacher}
            currentLesson={progress.currentLesson}
            onWhatsApp={() => setProgress(prev => ({ ...prev, sentToTeacher: true }))}
            onNextLesson={nextLessonAction}
            onRestart={() => setSection(SectionType.PATH)}
          />
        )}
      </div>
    </div>
  );
};

export default App;
