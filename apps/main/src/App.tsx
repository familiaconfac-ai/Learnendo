import React, { useEffect, useRef, useState, useCallback } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { Course, Day, UserProgress, SectionType, LessonLanguageCode } from './types';
import { Dashboard } from './components/Dashboard';
import { CoursesView } from './components/CoursesView';
import { BottomNavigation } from './components/BottomNavigation';
import { LoginScreen } from './components/LoginScreen';
import { PlacementTest } from './components/PlacementTest';
import { WorkbookView } from './components/WorkbookView';
import { LessonView } from './components/LessonView';
import { ExercisePractice } from './components/ExercisePractice';
import { PronunciationTrainer } from './components/PronunciationTrainer/PronunciationTrainer';
import { TeacherDashboard } from './components/TeacherDashboard/TeacherDashboard';
import { ConversionModal } from './components/AnonymousConversion/ConversionModal';
import { ProgressEngine } from './engine/progressEngine';
import { PlacementEngine } from './engine/placementEngine';
import { COURSES } from './courses/courseList';
import { COURSE_WORKBOOKS } from './courses/courseRegistry';
import { auth, loginWithEmail, registerWithEmail } from './services/firebase';
import { createSession, createStudentProfile, finishSession, recordDailyAccess, updateLastActive, createOrUpdateUserProfile, createSessionForUser, recordLessonCompletion, getSessionCount, getWeeklyProgress, promoteAdminIfNeeded } from './services/db';
import { completeDayAndGetResult, saveStudentPlacementTest } from './engine/weeklyProgressEngine';
import { WeekCompletionPopup } from './components/WeekCompletionPopup/WeekCompletionPopup';
import { WeekCompletionResult } from './services/db';
import { calculateWeeklyScore, DayProgress, ScoreResult } from './engine/scoringEngine';
import { ensureLessonStarted, completeCourseDay, LessonProgress, DayAnalytics } from './engine/courseProgressEngine';
import { computeNextPath } from './engine/progressStatsService';
import { ResultAnimation } from './components/ResultAnimation/ResultAnimation';

const DEFAULT_COURSE_ID = 'english';
const DEFAULT_LANGUAGE = 'en' as LessonLanguageCode;
const LESSON_TEST_PREFIX = 'lesson_test_passed_';
const LANGUAGE_STORAGE_KEY = 'learnendo_user_language';

// Map courses to language codes
const COURSE_TO_LANGUAGE: Record<string, LessonLanguageCode> = {
  'english': 'en',
  'portuguese_foreigners': 'pt',
  'portuguese_native': 'pt',
  'spanish': 'es',
  'greek_koine': 'el',
  'hebrew_biblical': 'he',
};

// Map language codes to course IDs
const LANGUAGE_TO_COURSE: Record<LessonLanguageCode, string> = {
  'en': 'english',
  'pt': 'portuguese_foreigners',
  'es': 'spanish',
  'el': 'greek_koine',
  'he': 'hebrew_biblical',
};

const COURSE_SELECTOR_OPTIONS = [
  { id: 'english', label: 'English', flag: '🇺🇸' },
  { id: 'portuguese_foreigners', label: 'Português', flag: '🇧🇷' },
  { id: 'spanish', label: 'Español', flag: '🇪🇸' },
  { id: 'greek_koine', label: 'Greek', flag: '🇬🇷' },
  { id: 'hebrew_biblical', label: 'Hebrew', flag: '🇮🇱' },
] as const;

const getLessonNumberFromId = (lessonId: string | null | undefined) => {
  if (!lessonId) return NaN;
  const match = lessonId.match(/(\d+)/);
  return match ? Number(match[1]) : NaN;
};

const App: React.FC = () => {
  // ===== LANGUAGE STATE =====
  const [language, setLanguageState] = useState<LessonLanguageCode>(() => {
    // Load from localStorage on initial render
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LessonLanguageCode | null;
      if (stored && ['en', 'pt', 'es', 'el', 'he'].includes(stored)) {
        return stored;
      }
    }
    return DEFAULT_LANGUAGE;
  });

  // Update localStorage and course when language changes
  const setLanguage = useCallback((newLanguage: LessonLanguageCode) => {
    console.log('[App] Language changed:', newLanguage);
    setLanguageState(newLanguage);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
    }
    // Auto-switch course to match language
    const courseForLanguage = LANGUAGE_TO_COURSE[newLanguage];
    if (courseForLanguage) {
      setCurrentCourseId(courseForLanguage);
    }
  }, []);

  // ===== APP STATE =====
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
  const [weekCompletionResult, setWeekCompletionResult] = useState<WeekCompletionResult | null>(null);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [showResultAnimation, setShowResultAnimation] = useState(false);
  const [conversionReason, setConversionReason] = useState<string | undefined>();
  const [conversionSuccess, setConversionSuccess] = useState(false);
  const isAdmin = user?.email?.toLowerCase() === 'learnendo@gmail.com';
  const activeCourseId = currentCourseId ?? DEFAULT_COURSE_ID;
  const activeCourse = COURSES.find((course) => course.id === activeCourseId) ?? null;
  const completedLessonNumbers = (progress.completedActivities || [])
    .filter((activityId) => activityId.startsWith(LESSON_TEST_PREFIX))
    .map((activityId) => Number(activityId.replace(LESSON_TEST_PREFIX, '')))
    .filter((value) => Number.isFinite(value));
  const completedLessonSet = new Set(completedLessonNumbers);
  const completedLessonCount = completedLessonSet.size;
  const streak = Number((progress as any).streakCount ?? completedLessonCount);
  const freeze = Number((progress as any).iceCount ?? 0);
  const diamonds = Number((progress as any).diamonds ?? completedLessonCount * 10);
  const stars = Number((progress as any).totalStars ?? (progress.completedActivities || []).length);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [score, setScore] = useState<ScoreResult | null>(null);
  /** Progress for the currently open lesson — read from Firestore on lesson open. */
  const [lessonProgress, setLessonProgress] = useState<LessonProgress | null>(null);
  const activeSessionRef = useRef<{ uid: string; sessionId: string; startedAt: number } | null>(null);
  /** Timestamp (ms) when the current day practice started — used to compute timeSpent. */
  const dayStartTimeRef = useRef<number | null>(null);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  // Sync language with course selection
  const handleCourseChange = useCallback((courseId: string) => {
    setCurrentCourseId(courseId);
    const languageForCourse = COURSE_TO_LANGUAGE[courseId];
    if (languageForCourse && languageForCourse !== language) {
      setLanguage(languageForCourse);
    }
  }, [language, setLanguage]);

  const triggerConversion = (reason?: string) => {
    setConversionReason(reason);
    setShowConversionModal(true);
  };

  const closeActiveSession = () => {
    const activeSession = activeSessionRef.current;
    if (!activeSession) return;

    const durationSeconds = Math.max(1, Math.round((Date.now() - activeSession.startedAt) / 1000));
    activeSessionRef.current = null;
    void finishSession(activeSession.uid, activeSession.sessionId, durationSeconds);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // ========== STEP 1: ENSURE AUTHENTICATION ==========
      // Accept both anonymous and email-authenticated users
      let authenticatedUser = firebaseUser;
      
      // If no user is authenticated, we need to check if this is acceptable
      if (!authenticatedUser) {
        setAuthLoading(false);
        closeActiveSession();
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
        setUser(null);
        return;
      }

      setUser(authenticatedUser);
      setAuthLoading(false);

      // ========== STEP 2: TRACK ALL AUTHENTICATED USERS ==========
      // This runs for EVERY authenticated user (including restricted)
      // Tracking happens BEFORE any permission/content logic
      console.log('[App] User authenticated:', authenticatedUser.uid, {
        email: authenticatedUser.email,
        isAnonymous: authenticatedUser.isAnonymous
      });

      try {
        // Create or update user profile in Firestore
        console.log('[App] Recording user profile...');
        await createOrUpdateUserProfile(authenticatedUser);

        // Promote to admin if the email is in the ADMIN_EMAILS list
        await promoteAdminIfNeeded(authenticatedUser);
        
        // Create session entry
        console.log('[App] Creating session...');
        const sessionId = await createSessionForUser(authenticatedUser);
        
        // Record daily access
        console.log('[App] Recording daily access...');
        await updateLastActive(authenticatedUser.uid);
        await recordDailyAccess(authenticatedUser.uid);

        console.log('[App] ✅ Firestore tracking complete for:', authenticatedUser.uid);
      } catch (trackingError) {
        console.error('[App] ❌ Firestore tracking error:', trackingError);
        // Do NOT return - continue even if tracking fails
      }

      // ========== STEP 3: LOAD PROGRESS & CONTENT ==========
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
      } catch (progressError) {
        console.warn('[App] Progress load error:', progressError);
        setProgress((prev) => ({ ...prev, userId: authenticatedUser.uid, currentWorkbook: 1, currentLesson: 1 }));
        setCurrentWorkbookId(1);
        setCurrentSection(SectionType.WORKBOOK);
      }

      // ========== STEP 4: SESSION MANAGEMENT ==========
      // Create/manage session reference for tracking activity
      try {
        const existingSession = activeSessionRef.current;
        if (!existingSession || existingSession.uid !== authenticatedUser.uid) {
          closeActiveSession();
          const sessionId = await createSession(
            authenticatedUser.uid,
            progress.currentLesson,
            typeof navigator !== 'undefined' ? navigator.userAgent : undefined
          );

          if (sessionId) {
            activeSessionRef.current = {
              uid: authenticatedUser.uid,
              sessionId,
              startedAt: Date.now(),
            };
          }
        }
      } catch (sessionError) {
        console.warn('[App] Session management error:', sessionError);
      }

      // ========== STEP 5: PERMISSION & RESTRICTION LOGIC ==========
      // Apply any permission checks or restrictions AFTER tracking
      // (Add permission checks here if needed)
    });

    return () => {
      unsubscribe();
      closeActiveSession();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      void updateLastActive(user.uid);
      void recordDailyAccess(user.uid);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      closeActiveSession();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    getSessionCount(user.uid).then(setSessionCount).catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !currentLessonId) return;
    const lessonNumber = getLessonNumberFromId(currentLessonId);
    if (isNaN(lessonNumber)) return;
    const uid = user.uid;
    const weekId = `workbook_${progress.currentWorkbook}_lesson_${lessonNumber}`;
    console.log('[Score] Loading weekly progress for weekId:', weekId);
    getWeeklyProgress(uid, weekId)
      .then((week) => {
        console.log('[Score] USER DATA (weeklyProgress):', week);
        if (!week) {
          console.log('[Score] No week data — setting all zeros.');
          setScore({ streak: 0, freeze: 0, diamonds: 0, stars: 0, activeDays: 0, totalDays: 7 });
          return;
        }
        const today = new Date().toISOString().split('T')[0];
        const dayProgress: DayProgress[] = week.days
          .filter(d => d.status !== 'pending' || d.scheduledDate <= today)
          .map(d => ({
            dayNumber: d.dayNumber,
            completed: d.status !== 'pending',
            score: d.diamondEarned ? 100 : (d.status !== 'pending' ? 0 : undefined),
          }));
        const weekly = calculateWeeklyScore(dayProgress);
        setScore({
          streak: weekly.fire,
          freeze: weekly.freeze,
          diamonds: weekly.diamonds,
          stars: weekly.stars,
          activeDays: weekly.fire,
          totalDays: 7,
        });
      })
      .catch(() => {
        console.warn('[Score] Failed to load weeklyProgress — setting all zeros.');
        setScore({ streak: 0, freeze: 0, diamonds: 0, stars: 0, activeDays: 0, totalDays: 7 });
      });
  }, [user?.uid, currentLessonId]);

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

      if (params?.resumeCurrentDay && currentWorkbook?.lessons?.length) {
        const lessonIndex = Math.max(0, (progress.currentLesson || 1) - 1);
        const lesson = currentWorkbook.lessons[lessonIndex];
        if (lesson) {
          setCurrentLessonId(lesson.id);
          const nextDay = lesson.days?.find((day: Day) => !progress.completedActivities.includes(day.id));
          if (nextDay) {
            setCurrentDay(nextDay);
            setCurrentSection(SectionType.PRACTICE);
            return;
          }
          setCurrentDay(null);
          setCurrentSection(SectionType.LESSON);
          return;
        }
      }

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
    return true;
  };

  const openLesson = (lessonId: string) => {
    const lessonNumber = getLessonNumberFromId(lessonId);
    if (!Number.isFinite(lessonNumber)) return;

    if (!canOpenLessonToday(lessonNumber)) {
      alert('Come back tomorrow to continue your journey.');
      return;
    }

    // Initialise (or reload) lesson progress from courseProgress
    if (user?.uid) {
      const courseId = currentCourseId ?? DEFAULT_COURSE_ID;
      ensureLessonStarted(user.uid, courseId, progress.currentWorkbook, lessonNumber)
        .then(lp => setLessonProgress(lp))
        .catch(e => console.warn('[UNLOCK] ensureLessonStarted failed:', e));
    } else {
      setLessonProgress(null);
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

  const handleLogout = async () => {
    closeActiveSession();
    await signOut(auth);
    setMenuOpen(false);
  };

  const handleDayComplete = async (dayId: string, score: number) => {
    console.log(`[App] Day "${dayId}" completed. Score: ${score}%`);

    // Compute time spent since the day was opened
    const timeSpent = dayStartTimeRef.current
      ? Math.round((Date.now() - dayStartTimeRef.current) / 1000)
      : undefined;
    dayStartTimeRef.current = null;

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

        setCurrentLessonId(null);
        setCurrentSection(SectionType.WORKBOOK);

        // Recalculate weekly score from Firestore before showing animation
        if (user?.uid) {
          const weekId = `workbook_${progress.currentWorkbook}_lesson_${lessonNumber}`;
          console.log('[Score] Pre-animation fetch for weekId:', weekId);
          getWeeklyProgress(user.uid, weekId)
            .then((week) => {
              console.log('[Score] Pre-animation USER DATA (weeklyProgress):', week);
              if (!week) {
                console.log('[Score] No week data before animation — setting all zeros.');
                setScore({ streak: 0, freeze: 0, diamonds: 0, stars: 0, activeDays: 0, totalDays: 7 });
                return;
              }
              const today = new Date().toISOString().split('T')[0];
              const dayProgress: DayProgress[] = week.days
                .filter(d => d.status !== 'pending' || d.scheduledDate <= today)
                .map(d => ({
                  dayNumber: d.dayNumber,
                  completed: d.status !== 'pending',
                  score: d.diamondEarned ? 100 : (d.status !== 'pending' ? 0 : undefined),
                }));
              const weekly = calculateWeeklyScore(dayProgress);
              setScore({
                streak: weekly.fire,
                freeze: weekly.freeze,
                diamonds: weekly.diamonds,
                stars: weekly.stars,
                activeDays: weekly.fire,
                totalDays: 7,
              });
            })
            .catch(() => {
              console.warn('[Score] Pre-animation fetch failed — setting all zeros.');
              setScore({ streak: 0, freeze: 0, diamonds: 0, stars: 0, activeDays: 0, totalDays: 7 });
            })
            .finally(() => setShowResultAnimation(true));
        } else {
          setShowResultAnimation(true);
        }
        return;
      }

      setCurrentLessonId(lessonId);
      setCurrentSection(SectionType.LESSON);
      return;
    }

    const alreadyDone = progress.completedActivities.includes(dayId);

    // Extract day/lesson numbers early so we can update the path in progress
    const dayMatch = dayId.match(/d(\d+)/);
    const dayNumber = dayMatch ? parseInt(dayMatch[1], 10) : NaN;
    const lessonNumber = getLessonNumberFromId(currentLessonId);

    // Compute the NEXT position the student should work on after this day
    const nextPath = (!isNaN(dayNumber) && !isNaN(lessonNumber))
      ? computeNextPath({
          workbook: progress.currentWorkbook,
          lesson: lessonNumber,
          day: dayNumber,
        })
      : null;

    const updated: UserProgress = {
      ...progress,
      completedActivities: alreadyDone
        ? progress.completedActivities
        : [...progress.completedActivities, dayId],
      // Advance to next position (capped to valid bounds by computeNextPath)
      ...(nextPath && {
        currentDay:      nextPath.day,
        currentLesson:   nextPath.lesson,
        currentWorkbook: nextPath.workbook,
      }),
      lastCompletedDate: new Date().toISOString(),
    };
    setProgress(updated);
    try {
      ProgressEngine.saveProgress(updated);
    } catch {
      // Persistence failure should not block navigation.
    }

    // Firebase: Track day completion and check for week completion
    if (user?.uid && currentLessonId) {
      try {
        if (!isNaN(lessonNumber) && !isNaN(dayNumber)) {
          // ── Existing weeklyProgress path (kept unchanged) ──
          const result = await completeDayAndGetResult(
            user.uid,
            progress.currentWorkbook,
            lessonNumber,
            dayNumber,
            score  // forward the real exercise score (0-100)
          );

          console.log('[App] Firebase day completion result:', result);

          // Immediately refresh header scores — no waiting for useEffect re-run
          if (result.success && result.weekScores) {
            setScore({
              streak: result.weekScores.fire,
              freeze: result.weekScores.freeze,
              diamonds: result.weekScores.diamonds,
              stars: result.weekScores.stars,
              activeDays: result.weekScores.fire,
              totalDays: 7,
            });
            console.log('[App] Score state updated from saved week data:', result.weekScores);
          }

          // Show week completion popup if week is complete
          if (result.weekComplete && result.weekResult) {
            setWeekCompletionResult(result.weekResult);
          }

          // ── New courseProgress path ──
          const courseId = currentCourseId ?? DEFAULT_COURSE_ID;
          const analytics: DayAnalytics = {
            timeSpent,
            accuracy: score,  // score is 0–100 percentage correct
          };
          completeCourseDay(user.uid, courseId, progress.currentWorkbook, lessonNumber, dayNumber, score, analytics)
            .then(({ success, stats }) => {
              if (success) {
                console.log('[SAVE] courseProgress stats:', stats);
                // Refresh the in-memory lessonProgress so LessonView shows the tick
                ensureLessonStarted(user.uid!, courseId, progress.currentWorkbook, lessonNumber)
                  .then(lp => { if (lp) setLessonProgress(lp); })
                  .catch(() => {});
              }
            })
            .catch(e => console.warn('[SAVE] completeCourseDay failed:', e));

          await recordLessonCompletion(user.uid, lessonNumber, {
            completedIslands: [dayId],
            diamondPercent: score,
            timeSpentSeconds: 0,
            totalCorrect: Math.round(score),
            totalAnswers: 100,
          });
        }
      } catch (error) {
        console.warn('[App] Firebase day tracking failed:', error);
        // Continue UI flow even if Firebase fails
      }
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
            currentLanguage={language}
            onLanguageChange={setLanguage}
            onLogoClick={() => handleNavigate(SectionType.WORKBOOK)}
            onSelectCourse={(id) => {
              handleCourseChange(id);
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
            userId={user?.uid ?? null}
            onNavigate={handleNavigate}
          />
        );
      }
      case SectionType.PLACEMENT_TEST:
        return <PlacementTest currentLanguage={language} onComplete={handlePlacementComplete} onTriggerConversion={triggerConversion} />;
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
            lessonProgress={lessonProgress}
            currentLanguage={language}
            isAdmin={isAdmin}
            testCompleted={lessonTestCompleted[lessonNumber] || false}
            testScore={lessonTestScores[lessonNumber]}
            testPassed={completedLessonSet.has(lessonNumber)}
            onStartDay={(day: Day) => {
              dayStartTimeRef.current = Date.now();
              setCurrentDay(day);
              setActiveWeeklyTest(null);
              setCurrentSection(SectionType.PRACTICE);
            }}
            onStartWeeklyTest={(day: Day) => { dayStartTimeRef.current = Date.now(); startWeeklyTest(lesson.id, lessonNumber, day); }}
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
            currentLanguage={language}
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
        return <PronunciationTrainer onFinish={() => handleNavigate(SectionType.COURSES)} />;
      case SectionType.TEACHER_DASHBOARD:
        return user && isAdmin ? (
          <TeacherDashboard user={user} />
        ) : (
          <div className="min-h-screen bg-blue-50 flex items-center justify-center px-6 text-center">
            <p className="text-slate-700 font-semibold">Access denied. Teacher dashboard is for authorized users only.</p>
          </div>
        );
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
    <div className="app overflow-x-hidden">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-full items-center justify-between gap-1 sm:gap-2 px-2 sm:px-3 py-2 overflow-x-auto">
          <button
            type="button"
            className="flex h-10 items-center rounded-lg sm:rounded-xl bg-slate-50 px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm active:scale-95 flex-shrink-0"
            onClick={() => {
              setCurrentDay(null);
              setCurrentLessonId(null);
              setCurrentSection(SectionType.COURSES);
            }}
            aria-label="Go to language selection"
          >
            <span className="text-base leading-none">🏠</span>
            <span className="ml-1">Home</span>
          </button>

          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setCourseMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-lg sm:rounded-xl bg-slate-50 text-xl sm:text-2xl shadow-sm active:scale-95"
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
                <div className="absolute right-0 sm:left-0 top-12 z-40 w-48 sm:w-52 overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-xl">
                  {COURSE_SELECTOR_OPTIONS.map((courseOption) => {
                    const selected = courseOption.id === activeCourseId;
                    return (
                      <button
                        key={courseOption.id}
                        type="button"
                        onClick={() => {
                          handleCourseChange(courseOption.id);
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

          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 flex-shrink-0">
            <span className="rounded-lg bg-blue-100 text-blue-700 px-1.5 py-1" title="Current Language">
              {language.toUpperCase()}
            </span>
            <span className="rounded-lg bg-slate-100 px-1.5 py-1">🔥 {score?.streak ?? 0}</span>
            <span className="rounded-lg bg-slate-100 px-1.5 py-1">❄️ {score?.freeze ?? 0}</span>
            <span className="rounded-lg bg-slate-100 px-1.5 py-1">💎 {score?.diamonds ?? 0}</span>
            <span className="rounded-lg bg-slate-100 px-1.5 py-1">⭐ {score?.stars ?? 0}</span>
          </div>

          <button
            onClick={toggleMenu}
            className="flex h-10 w-10 items-center justify-center rounded-lg sm:rounded-xl bg-slate-50 text-[22px] sm:text-[26px] leading-none text-slate-700 shadow-sm active:scale-95 flex-shrink-0"
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-sm flex items-center justify-center" onClick={() => setMenuOpen(false)}>
          <div
            className="bg-white rounded-3xl shadow-2xl p-6 w-11/12 max-w-sm mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <button className="block w-full text-left px-4 py-3 rounded-xl hover:bg-blue-50 font-medium transition-colors" onClick={() => { setCurrentSection(SectionType.WORKBOOK); setMenuOpen(false); }}>Lesson Islands</button>
              <button className="block w-full text-left px-4 py-3 rounded-xl hover:bg-blue-50 font-medium transition-colors" onClick={() => { setCurrentSection(SectionType.COURSES); setMenuOpen(false); }}>Courses</button>
              <button className="block w-full text-left px-4 py-3 rounded-xl hover:bg-blue-50 font-medium transition-colors" onClick={() => { setCurrentSection(SectionType.PLACEMENT_TEST); setMenuOpen(false); }}>Placement Test</button>
              {isAdmin && (
                <button className="block w-full text-left px-4 py-3 rounded-xl hover:bg-purple-50 text-purple-600 font-medium transition-colors" onClick={() => { setCurrentSection(SectionType.TEACHER_DASHBOARD); setMenuOpen(false); }}>📊 Teacher Dashboard</button>
              )}
              <button className="block w-full text-left px-4 py-3 rounded-xl hover:bg-blue-50 font-medium transition-colors" onClick={() => { setCurrentSection(SectionType.SETTINGS); setMenuOpen(false); }}>Settings</button>
              <button className="block w-full text-left px-4 py-3 rounded-xl hover:bg-blue-50 font-medium transition-colors" onClick={() => { setCurrentSection(SectionType.HELP); setMenuOpen(false); }}>Help</button>
              <button className="block w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 font-medium transition-colors" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}
      <main className="pt-[68px]">{renderSection()}</main>
      {weekCompletionResult && (
        <WeekCompletionPopup
          result={weekCompletionResult}
          onClose={() => setWeekCompletionResult(null)}
        />
      )}
      {showResultAnimation && (
        <ResultAnimation
          streak={score?.streak ?? 0}
          freeze={score?.freeze ?? 0}
          diamonds={score?.diamonds ?? 0}
          stars={score?.stars ?? 0}
          onClose={() => setShowResultAnimation(false)}
        />
      )}
      {user && user.isAnonymous && (
        <ConversionModal
          user={user}
          isOpen={showConversionModal}
          onSuccess={() => {
            setShowConversionModal(false);
            setConversionSuccess(true);
            setTimeout(() => setConversionSuccess(false), 3000);
          }}
          onCancel={() => setShowConversionModal(false)}
          reason={conversionReason}
        />
      )}
      {conversionSuccess && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg z-[998] animate-pulse">
          ✅ Account created successfully! Your progress is saved.
        </div>
      )}
      <BottomNavigation currentSection={currentSection} onNavigate={handleNavigate} onShare={handleShare} />
    </div>
  );
};

export default App;