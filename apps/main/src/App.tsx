import React, { useEffect, useState } from 'react';
import { Course, Day, UserProgress, SectionType } from './types';
import { Dashboard } from './components/Dashboard';
import { CoursesView } from './components/CoursesView';
import { BottomNavigation } from './components/BottomNavigation';
import { PlacementTest } from './components/PlacementTest';
import { WorkbookView } from './components/WorkbookView';
import { LessonView } from './components/LessonView';
import { ExercisePractice } from './components/ExercisePractice';
import { ProgressEngine } from './engine/progressEngine';
import { PlacementEngine } from './engine/placementEngine';
import { COURSES } from './courses/courseList';
import { COURSE_WORKBOOKS } from './courses/courseRegistry';

const App: React.FC = () => {
  const [progress, setProgress] = useState<UserProgress>({
    userId: 'user1',
    currentWorkbook: 1,
    currentLesson: 1,
    currentDay: 1,
    completedActivities: [],
    lastCompletedDate: new Date().toISOString()
  });
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState<SectionType>(SectionType.COURSES);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentWorkbookId, setCurrentWorkbookId] = useState<number | null>(null);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [currentWorkbook, setCurrentWorkbook] = useState<any>(null);
  const [isWorkbookLoading, setIsWorkbookLoading] = useState(false);
  const [currentDay, setCurrentDay] = useState<Day | null>(null);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  useEffect(() => {
    try {
      const loadedProgress = ProgressEngine.loadProgress('user1');
      if (loadedProgress) {
        setProgress(loadedProgress);
      }
    } catch {
      // Keep default progress so first render always succeeds.
    }
  }, []);

  useEffect(() => {
    if (!currentWorkbookId) return;

    const loadWorkbook = async () => {
      const courseId = currentCourseId ?? 'english';
      const registry = COURSE_WORKBOOKS[courseId] ?? COURSE_WORKBOOKS['english'];
      const loader = registry[currentWorkbookId as keyof typeof registry];
      if (!loader) {
        setCurrentSection(SectionType.DASHBOARD);
        return;
      }

      setIsWorkbookLoading(true);
      try {
        const module = await loader();
        const resolvedWorkbook =
          (module as any)[`workbook${currentWorkbookId}`] ||
          (module as any).default ||
          Object.values(module)[0] ||
          null;

        if (!resolvedWorkbook) {
          setCurrentSection(SectionType.DASHBOARD);
          return;
        }

        setCurrentWorkbook(resolvedWorkbook);
        setCurrentSection(SectionType.WORKBOOK);
      } catch {
        setCurrentSection(SectionType.DASHBOARD);
      } finally {
        setIsWorkbookLoading(false);
      }
    };

    loadWorkbook();
  }, [currentWorkbookId, currentCourseId]);

  const handleNavigate = (section: SectionType, params?: any) => {
    if (section === SectionType.COURSES) {
      setCurrentSection(SectionType.COURSES);
      return;
    }

    if (params?.lessonId) {
      setCurrentLessonId(params.lessonId);
    }

    if (section === SectionType.WORKBOOK) {
      const workbookId = Number(params?.workbookId || progress.currentWorkbook || 1);
      setCurrentWorkbookId(workbookId);
      return;
    }

    setCurrentSection(section);
  };

  const handlePlacementComplete = (score: number) => {
    const workbook = PlacementEngine.determineWorkbook(score);
    const updated = { ...progress, currentWorkbook: workbook, placementScore: score };
    setProgress(updated);
    try {
      ProgressEngine.saveProgress(updated);
    } catch {
      // Do not block rendering when persistence fails.
    }
    setCurrentSection(SectionType.DASHBOARD);
  };

  const handleDayComplete = (dayId: string, score: number) => {
    console.log(`[App] Day "${dayId}" completed. Score: ${score}%`);
    const alreadyDone = progress.completedActivities.includes(dayId);
    const updated: UserProgress = {
      ...progress,
      completedActivities: alreadyDone
        ? progress.completedActivities
        : [...progress.completedActivities, dayId],
    };
    setProgress(updated);
    try {
      ProgressEngine.saveProgress(updated);
    } catch {
      // Persistence failure should not block navigation.
    }
    // Return to the lesson view so the player can see the updated state.
    setCurrentDay(null);
    setCurrentSection(SectionType.LESSON);
  };

  const renderSection = () => {
    switch (currentSection) {
      case SectionType.COURSES:
        return (
          <CoursesView
            courses={COURSES}
            currentCourseId={currentCourseId}
            onSelectCourse={(id) => {
              setCurrentCourseId(id);
              setCurrentSection(SectionType.DASHBOARD);
            }}
          />
        );
      case SectionType.DASHBOARD: {
        const activeCourse: Course | null =
          COURSES.find(c => c.id === currentCourseId) ?? null;
        return (
          <Dashboard
            progress={progress}
            currentCourse={activeCourse}
            onNavigate={handleNavigate}
          />
        );
      }
      case SectionType.PLACEMENT_TEST:
        return <PlacementTest onComplete={handlePlacementComplete} />;
      case SectionType.WORKBOOK:
        if (isWorkbookLoading) return <div>Loading workbook...</div>;
        if (!currentWorkbook) return <Dashboard progress={progress} currentCourse={COURSES.find(c => c.id === currentCourseId) ?? null} onNavigate={handleNavigate} />;
        return (
          <WorkbookView
            workbookId={currentWorkbookId || progress.currentWorkbook}
            lessons={currentWorkbook.lessons || []}
            progress={progress}
            onSelectLesson={(lessonId) => handleNavigate(SectionType.LESSON, { lessonId })}
            onBack={() => handleNavigate(SectionType.DASHBOARD)}
          />
        );
      case SectionType.LESSON: {
        const lesson = currentWorkbook?.lessons?.find((l: any) => l.id === currentLessonId);
        if (!lesson) return <Dashboard progress={progress} currentCourse={COURSES.find(c => c.id === currentCourseId) ?? null} onNavigate={handleNavigate} />;
        return (
          <LessonView
            lesson={lesson}
            progress={progress}
            onStartDay={(day: Day) => {
              setCurrentDay(day);
              setCurrentSection(SectionType.PRACTICE);
            }}
            onBack={() => handleNavigate(SectionType.WORKBOOK, { workbookId: currentWorkbookId || progress.currentWorkbook })}
          />
        );
      }
      case SectionType.PRACTICE: {
        if (!currentDay) return <Dashboard progress={progress} currentCourse={COURSES.find(c => c.id === currentCourseId) ?? null} onNavigate={handleNavigate} />;
        return (
          <ExercisePractice
            day={currentDay}
            lessonId={currentLessonId || ''}
            progress={progress}
            onComplete={handleDayComplete}
            onBack={() => {
              setCurrentDay(null);
              setCurrentSection(SectionType.LESSON);
            }}
          />
        );
      }
      case SectionType.PRONUNCIATION:
        return <div>Pronunciation Practice Placeholder</div>;
      case SectionType.SHARE:
        return <div>Share App Placeholder</div>;
      default:
        return <Dashboard progress={progress} currentCourse={COURSES.find(c => c.id === currentCourseId) ?? null} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="app">
      <header className="top-bar">
        <button onClick={toggleMenu} className="hamburger">☰</button>
        <h1>Learnendo</h1>
      </header>
      {menuOpen && (
        <nav className="hamburger-menu">
          <button onClick={() => { setCurrentSection(SectionType.COURSES); setMenuOpen(false); }}>Courses</button>
          <button onClick={() => { setCurrentSection(SectionType.DASHBOARD); setMenuOpen(false); }}>Dashboard</button>
          <button onClick={() => { setCurrentSection(SectionType.PLACEMENT_TEST); setMenuOpen(false); }}>Placement Test</button>
          <button onClick={() => { setCurrentSection(SectionType.PRONUNCIATION); setMenuOpen(false); }}>Pronunciation Practice</button>
          <button onClick={() => { /* logout */ }}>Settings</button>
          <button onClick={() => { /* logout */ }}>Logout</button>
        </nav>
      )}
      {renderSection()}
      <BottomNavigation currentSection={currentSection} onNavigate={handleNavigate} />
    </div>
  );
};

export default App;