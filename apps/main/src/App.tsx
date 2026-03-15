import React, { useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { Course, Day, UserProgress, SectionType } from './types';
import { Dashboard } from './components/Dashboard';
import { CoursesView } from './components/CoursesView';
import { BottomNavigation } from './components/BottomNavigation';
import { LoginScreen } from './components/LoginScreen';
import { PlacementTest } from './components/PlacementTest';
import { WorkbookView } from './components/WorkbookView';
import { LessonView } from './components/LessonView';
import { ExercisePractice } from './components/ExercisePractice';
import { ProgressEngine } from './engine/progressEngine';
import { PlacementEngine } from './engine/placementEngine';
import { COURSES } from './courses/courseList';
import { COURSE_WORKBOOKS } from './courses/courseRegistry';
import { auth, loginWithEmail, registerWithEmail } from './services/firebase';
import { createStudentProfile } from './services/db';

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
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const authenticatedUser = firebaseUser && !firebaseUser.isAnonymous ? firebaseUser : null;
      setUser(authenticatedUser);
      setAuthLoading(false);

      if (!authenticatedUser) {
        setCurrentCourseId(null);
        setCurrentSection(SectionType.COURSES);
        setProgress((prev) => ({
          ...prev,
          userId: 'user1',
          completedActivities: [],
        }));
        return;
      }

      try {
        const loadedProgress = ProgressEngine.loadProgress(authenticatedUser.uid);
        if (loadedProgress) {
          setProgress(loadedProgress);
        } else {
          setProgress((prev) => ({ ...prev, userId: authenticatedUser.uid }));
        }
      } catch {
        setProgress((prev) => ({ ...prev, userId: authenticatedUser.uid }));
      }
    });

    return unsubscribe;
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

  const handleLogin = async (email: string, password: string) => {
    const user = await loginWithEmail(email, password);
    await createStudentProfile(user.uid, user.email || email, user.displayName || undefined);
    setMenuOpen(false);
  };

  const handleRegister = async (email: string, password: string) => {
    const fullName = email.split('@')[0];
    const user = await registerWithEmail(email, password, fullName);
    await createStudentProfile(user.uid, user.email || email, user.displayName || fullName);
    setMenuOpen(false);
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
    // Return to the workbook island map after finishing practice.
    setCurrentDay(null);
    setCurrentSection(SectionType.WORKBOOK);
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
            onStartFirstDay={(day, lessonId) => {
              setCurrentLessonId(lessonId);
              setCurrentDay(day);
              setCurrentSection(SectionType.PRACTICE);
            }}
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
              setCurrentSection(SectionType.WORKBOOK);
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

  if (authLoading) {
    return null;
  }

  if (!user) {
    return (
      <LoginScreen
        menuOpen={menuOpen}
        onToggleMenu={toggleMenu}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  return (
    <div className="app">
      <header className="top-bar">
        <button
          onClick={toggleMenu}
          className="absolute top-4 left-4 cursor-pointer rounded-2xl bg-white p-[10px] text-[28px] text-slate-700 shadow-sm active:scale-95"
        >
          ☰
        </button>
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