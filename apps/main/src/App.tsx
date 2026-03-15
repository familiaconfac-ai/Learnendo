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

const DEFAULT_COURSE_ID = 'english';
const LESSON_TEST_PREFIX = 'lesson_test_passed_';

const COURSE_SELECTOR_OPTIONS = [
  { id: 'english', label: 'English', flag: '🇺🇸' },
  { id: 'portuguese_foreigners', label: 'Português', flag: '🇧🇷' },
  { id: 'spanish', label: 'Español', flag: '🇪🇸' },
  { id: 'greek_koine', label: 'Greek', flag: '🇬🇷' },
  { id: 'hebrew_biblical', label: 'Hebrew', flag: '🇮🇱' },
] as const;

const getTodayKey = (date: Date) => date.toISOString().slice(0, 10);

const getLessonNumberFromId = (lessonId: string | null | undefined) => {
  if (!lessonId) return NaN;
  const match = lessonId.match(/(\d+)/);
  return match ? Number(match[1]) : NaN;
};

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
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  const [currentWorkbookId, setCurrentWorkbookId] = useState<number | null>(null);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [currentWorkbook, setCurrentWorkbook] = useState<any>(null);
  const [isWorkbookLoading, setIsWorkbookLoading] = useState(false);
  const [currentDay, setCurrentDay] = useState<Day | null>(null);
  const [activeWeeklyTest, setActiveWeeklyTest] = useState<{ lessonNumber: number; lessonId: string } | null>(null);
  const [lessonTestCompleted, setLessonTestCompleted] = useState<Record<number, boolean>>({});
  const [lessonTestScores, setLessonTestScores] = useState<Record<number, number>>({});
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const isAdmin = user?.email?.toLowerCase() === 'learnendo@gmail.com';
  const activeCourseId = currentCourseId ?? DEFAULT_COURSE_ID;
  const activeCourse = COURSES.find((course) => course.id === activeCourseId) ?? null;
  const completedLessonNumbers = (progress.completedActivities || [])
    .filter((activityId) => activityId.startsWith(LESSON_TEST_PREFIX))
    .map((activityId) => Number(activityId.replace(LESSON_TEST_PREFIX, '')))
    .filter((value) => Number.isFinite(value));
  const completedLessonSet = new Set(completedLessonNumbers);
  const completedLessonCount = completedLessonSet.size;
  const todayKey = getTodayKey(new Date());
  const completedToday = getTodayKey(new Date(progress.lastCompletedDate || new Date().toISOString())) === todayKey;
  const streak = Number((progress as any).streakCount ?? completedLessonCount);
  const freeze = Number((progress as any).iceCount ?? 0);
  const diamonds = Number((progress as any).diamonds ?? completedLessonCount * 10);
  const stars = Number((progress as any).totalStars ?? (progress.completedActivities || []).length);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const authenticatedUser = firebaseUser && !firebaseUser.isAnonymous ? firebaseUser : null;
      setUser(authenticatedUser);
      setAuthLoading(false);

      if (!authenticatedUser) {
        setCurrentCourseId(null);
        setCurrentSection(SectionType.COURSES);
        setCurrentWorkbookId(null);
        setCurrentLessonId(null);
        setCurrentDay(null);
        setActiveWeeklyTest(null);
        setLessonTestCompleted({});
        setLessonTestScores({});
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
          setCurrentWorkbookId(loadedProgress.currentWorkbook || 1);
        } else {
          setProgress((prev) => ({ ...prev, userId: authenticatedUser.uid, currentWorkbook: 1, currentLesson: 1 }));
          setCurrentWorkbookId(1);
        }
        setCurrentSection(SectionType.WORKBOOK);
      } catch {
        setProgress((prev) => ({ ...prev, userId: authenticatedUser.uid, currentWorkbook: 1, currentLesson: 1 }));
        setCurrentWorkbookId(1);
        setCurrentSection(SectionType.WORKBOOK);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!currentCourseId) {
      setCurrentCourseId(DEFAULT_COURSE_ID);
    }
    if (!currentWorkbookId) {
      setCurrentWorkbookId(progress.currentWorkbook || 1);
    }
  }, [user, currentCourseId, currentWorkbookId, progress.currentWorkbook]);

  useEffect(() => {
    if (!currentWorkbookId) return;

    const loadWorkbook = async () => {
      const courseId = currentCourseId ?? DEFAULT_COURSE_ID;
      const registry = COURSE_WORKBOOKS[courseId] ?? COURSE_WORKBOOKS[DEFAULT_COURSE_ID];
      const loader = registry[currentWorkbookId as keyof typeof registry];
      if (!loader) {
        setCurrentSection(SectionType.WORKBOOK);
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
          setCurrentSection(SectionType.WORKBOOK);
          return;
        }

        setCurrentWorkbook(resolvedWorkbook);
        setCurrentSection(SectionType.WORKBOOK);
      } catch {
        setCurrentSection(SectionType.WORKBOOK);
      } finally {
        setIsWorkbookLoading(false);
      }
    };

    loadWorkbook();
  }, [currentWorkbookId, currentCourseId]);

  const handleNavigate = (section: SectionType, params?: any) => {
    setCourseMenuOpen(false);
    setActiveWeeklyTest(null);

    if (section === SectionType.DASHBOARD) {
      setCurrentDay(null);
      setCurrentLessonId(null);
      const workbookId = Number(progress.currentWorkbook || 1);
      setCurrentWorkbookId(workbookId);
      setCurrentSection(SectionType.WORKBOOK);
      return;
    }

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
      setCurrentSection(SectionType.WORKBOOK);
      return;
    }

    setCurrentSection(section);
  };

  const canOpenLessonToday = (lessonNumber: number) => {
    if (isAdmin) return true;
    if (lessonNumber <= 1) return true;
    if (lessonNumber <= completedLessonCount) return true;
    if (lessonNumber > completedLessonCount + 1) return false;
    if (completedToday && completedLessonCount >= 1 && lessonNumber === completedLessonCount + 1) return false;
    return true;
  };

  const openLesson = (lessonId: string) => {
    const lessonNumber = getLessonNumberFromId(lessonId);
    if (!Number.isFinite(lessonNumber)) return;

    if (!canOpenLessonToday(lessonNumber)) {
      alert('Come back tomorrow to continue your journey.');
      return;
    }

    setCurrentLessonId(lessonId);
    setCurrentSection(SectionType.LESSON);
  };

  const startWeeklyTest = (lessonId: string, lessonNumber: number, day: Day) => {
    setCurrentLessonId(lessonId);
    setCurrentDay(day);
    setLessonTestCompleted((prev) => ({ ...prev, [lessonNumber]: false }));
    setActiveWeeklyTest({ lessonNumber, lessonId });
    setCurrentSection(SectionType.PRACTICE);
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
    setCurrentSection(SectionType.WORKBOOK);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Learnendo',
          text: "I'm learning English with Learnendo!",
          url: window.location.href,
        });
      } catch {
        // Ignore cancellation.
      }
      return;
    }

    alert('Sharing not supported on this device');
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

    if (activeWeeklyTest) {
      const { lessonNumber, lessonId } = activeWeeklyTest;
      setLessonTestScores((prev) => ({ ...prev, [lessonNumber]: score }));
      setLessonTestCompleted((prev) => ({ ...prev, [lessonNumber]: true }));
      setCurrentDay(null);
      setActiveWeeklyTest(null);

      if (score === 100) {
        const testMarker = `${LESSON_TEST_PREFIX}${lessonNumber}`;
        const alreadyDone = progress.completedActivities.includes(testMarker);
        const nextLesson = Math.min(12, lessonNumber + 1);
        const updated: UserProgress = {
          ...progress,
          currentLesson: Math.max(progress.currentLesson, nextLesson),
          completedActivities: alreadyDone
            ? progress.completedActivities
            : [...progress.completedActivities, testMarker],
          lastCompletedDate: new Date().toISOString(),
        };

        setProgress(updated);
        try {
          ProgressEngine.saveProgress(updated);
        } catch {
          // Keep UI responsive even if persistence fails.
        }

        setCurrentLessonId(lessonId);
        setCurrentSection(SectionType.WORKBOOK);
        return;
      }

      setCurrentLessonId(lessonId);
      setCurrentSection(SectionType.LESSON);
      return;
    }

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
    // Return to day islands after finishing day practice.
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
            onLogoClick={() => handleNavigate(SectionType.WORKBOOK)}
            onSelectCourse={(id) => {
              setCurrentCourseId(id);
              setCurrentWorkbookId(1);
              setCurrentLessonId(null);
              setCurrentDay(null);
              setCurrentSection(SectionType.WORKBOOK);
            }}
          />
        );
      case SectionType.DASHBOARD: {
        return (
          <Dashboard
            progress={progress}
            currentCourse={activeCourse}
            isAdmin={isAdmin}
            onNavigate={handleNavigate}
          />
        );
      }
      case SectionType.PLACEMENT_TEST:
        return <PlacementTest onComplete={handlePlacementComplete} />;
      case SectionType.WORKBOOK:
        if (isWorkbookLoading) return <div className="px-4 py-6">Loading workbook...</div>;
        if (!currentWorkbook) return <div className="px-4 py-6">Workbook unavailable for this course.</div>;
        return (
          <WorkbookView
            workbookId={currentWorkbookId || progress.currentWorkbook}
            lessons={currentWorkbook.lessons || []}
            progress={progress}
            onSelectLesson={openLesson}
            isAdmin={isAdmin}
            onBack={() => handleNavigate(SectionType.COURSES)}
          />
        );
      case SectionType.LESSON: {
        const parsedLessonNumber = getLessonNumberFromId(currentLessonId || `lesson${progress.currentLesson}`);
        const lessonNumber = Number.isFinite(parsedLessonNumber) ? parsedLessonNumber : progress.currentLesson;
        const lesson =
          currentWorkbook?.lessons?.find((l: any) => l.id === currentLessonId) ||
          currentWorkbook?.lessons?.[lessonNumber - 1] ||
          {
            id: `lesson${lessonNumber}`,
            title: `Lesson ${lessonNumber}`,
            days: [],
          };
        return (
          <LessonView
            lesson={lesson}
            lessonNumber={lessonNumber}
            progress={progress}
            isAdmin={isAdmin}
            testCompleted={lessonTestCompleted[lessonNumber] || false}
            testScore={lessonTestScores[lessonNumber]}
            testPassed={completedLessonSet.has(lessonNumber)}
            onStartDay={(day: Day) => {
              setCurrentDay(day);
              setActiveWeeklyTest(null);
              setCurrentSection(SectionType.PRACTICE);
            }}
            onStartWeeklyTest={(day: Day) => startWeeklyTest(lesson.id, lessonNumber, day)}
            onBack={() => handleNavigate(SectionType.WORKBOOK, { workbookId: currentWorkbookId || progress.currentWorkbook })}
          />
        );
      }
      case SectionType.SETTINGS:
      case SectionType.HELP:
        return (
          <div className="min-h-screen bg-blue-50 flex items-center justify-center px-6 text-center">
            <p className="text-slate-700 font-semibold">This feature is under construction</p>
          </div>
        );
      case SectionType.PRACTICE: {
        if (!currentDay) return <div className="px-4 py-6">Day unavailable.</div>;
        return (
          <ExercisePractice
            day={currentDay}
            lessonId={currentLessonId || ''}
            progress={progress}
            onComplete={handleDayComplete}
            onBack={() => {
              setCurrentDay(null);
              setActiveWeeklyTest(null);
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
        return (
          <WorkbookView
            workbookId={currentWorkbookId || progress.currentWorkbook}
            lessons={currentWorkbook?.lessons || []}
            progress={progress}
            onSelectLesson={openLesson}
            isAdmin={isAdmin}
            onBack={() => handleNavigate(SectionType.COURSES)}
          />
        );
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
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[520px] items-center justify-between gap-2 px-3 py-2">
          <button
            type="button"
            className="flex items-center rounded-xl px-2 py-1 active:scale-95"
            onClick={() => {
              setCurrentDay(null);
              setCurrentLessonId(null);
              setCurrentWorkbookId(progress.currentWorkbook || 1);
              setCurrentSection(SectionType.WORKBOOK);
            }}
            aria-label="Go to lesson islands"
          >
            <img src="/learnendo-logo-transp.png" alt="Learnendo" className="logo-header h-[44px] w-[44px] object-contain" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setCourseMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-2xl shadow-sm active:scale-95"
              aria-label="Open language selector"
              aria-expanded={courseMenuOpen}
            >
              <span>{activeCourse?.flag ?? '🇺🇸'}</span>
            </button>
            {courseMenuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-30 cursor-default"
                  aria-label="Close language selector"
                  onClick={() => setCourseMenuOpen(false)}
                />
                <div className="absolute left-0 top-12 z-40 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  {COURSE_SELECTOR_OPTIONS.map((courseOption) => {
                    const selected = courseOption.id === activeCourseId;
                    return (
                      <button
                        key={courseOption.id}
                        type="button"
                        onClick={() => {
                          setCurrentCourseId(courseOption.id);
                          setCurrentWorkbookId(1);
                          setCurrentWorkbook(null);
                          setCurrentLessonId(null);
                          setCurrentDay(null);
                          setCurrentSection(SectionType.WORKBOOK);
                          setCourseMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                          selected ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-lg leading-none">{courseOption.flag}</span>
                        <span className="font-medium">{courseOption.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
            <span className="rounded-lg bg-slate-100 px-2 py-1">🔥 {streak}</span>
            <span className="rounded-lg bg-slate-100 px-2 py-1">❄ {freeze}</span>
            <span className="rounded-lg bg-slate-100 px-2 py-1">💎 {diamonds}</span>
            <span className="rounded-lg bg-slate-100 px-2 py-1">⭐ {stars}</span>
          </div>

          <button
            onClick={toggleMenu}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[26px] leading-none text-slate-700 shadow-sm active:scale-95"
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-[1000]" onClick={() => setMenuOpen(false)}>
          <aside
            className="h-full w-[220px] bg-white shadow-[2px_0_8px_rgba(0,0,0,0.2)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2 mt-6">
              <button className="block w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100" onClick={() => { setCurrentSection(SectionType.WORKBOOK); setMenuOpen(false); }}>Lesson Islands</button>
              <button className="block w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100" onClick={() => { setCurrentSection(SectionType.COURSES); setMenuOpen(false); }}>Courses</button>
              <button className="block w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100" onClick={() => { setCurrentSection(SectionType.PLACEMENT_TEST); setMenuOpen(false); }}>Placement Test</button>
              <button className="block w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100" onClick={() => { setCurrentSection(SectionType.SETTINGS); setMenuOpen(false); }}>Settings</button>
              <button className="block w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100" onClick={() => { setCurrentSection(SectionType.HELP); setMenuOpen(false); }}>Help</button>
            </div>
          </aside>
        </div>
      )}
      <main className="pt-[68px]">{renderSection()}</main>
      <BottomNavigation currentSection={currentSection} onNavigate={handleNavigate} onShare={handleShare} />
    </div>
  );
};

export default App;