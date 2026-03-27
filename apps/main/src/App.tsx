import React, { useEffect, useRef, useState, useCallback } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, updateDoc, serverTimestamp, increment, onSnapshot } from 'firebase/firestore';
import { Course, Day, UserProgress, SectionType, LessonLanguageCode, ActiveCourse } from './types';
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
import { LanguageSelector } from './components/LanguageSelector';
import { RankScreen } from './components/RankScreen';
import { ProgressEngine } from './engine/progressEngine';
import { PlacementEngine } from './engine/placementEngine';
import { COURSES } from './courses/courseList';
import { COURSE_WORKBOOKS } from './courses/courseRegistry';
import { GRAMMAR_GUIDES } from './constants';
import { auth, db, loginWithEmail, registerWithEmail } from './services/firebase';
import { createSession, createStudentProfile, finishSession, recordDailyAccess, updateLastActive, createOrUpdateUserProfile, createSessionForUser, recordLessonCompletion, getSessionCount, getWeeklyProgress, promoteAdminIfNeeded } from './services/db';
import { completeDayAndGetResult, saveStudentPlacementTest } from './engine/weeklyProgressEngine';
import { WeekCompletionPopup } from './components/WeekCompletionPopup/WeekCompletionPopup';
import { WeekCompletionResult } from './services/db';
import { calculateWeeklyScore, DayProgress, ScoreResult } from './engine/scoringEngine';
import { ensureLessonStarted, completeCourseDay, getCumulativeUserStats, LessonProgress, DayAnalytics } from './engine/courseProgressEngine';
import { computeNextPath } from './engine/progressStatsService';
import { ResultAnimation } from './components/ResultAnimation/ResultAnimation';
import { trackLessonCompletion } from './services/progressService';
import { lesson1NewWords } from './data/workbook1/lesson1';

/** Accumulated unique word count per lesson number.
 * Lesson N value = sum of all new words introduced from lesson 1 through N.
 * Add new entries here as each lesson is authored. */
const LESSON_WORD_COUNTS: Record<number, number> = {
  1: lesson1NewWords.length,
  // 2: lesson1NewWords.length + lesson2NewWords.length,
  // ...
};

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



const COURSE_SELECTOR_OPTIONS = [
  { id: 'english', label: 'English', flag: '🇺🇸' },
  { id: 'portuguese_foreigners', label: 'Português', flag: '🇧🇷' },
  { id: 'spanish', label: 'Español', flag: '🇪🇸' },
  { id: 'greek_koine', label: 'Greek', flag: '🇬🇷' },
  { id: 'hebrew_biblical', label: 'Hebrew', flag: '🇮🇱' },
] as const;

const getLessonNumberFromId = (lessonId: string | null | undefined) => {
  if (!lessonId) return NaN;
  // IDs like "wb1_l3" encode the lesson number after "_l"; extract that first.
  const wbMatch = lessonId.match(/_l(\d+)/i);
  if (wbMatch) return Number(wbMatch[1]);
  // Fallback for simple IDs like "lesson2".
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

  // Update localStorage when language changes (course sync is handled explicitly in handleCourseChange)
  const setLanguage = useCallback((newLanguage: LessonLanguageCode) => {
    console.log('[App] Language changed:', newLanguage);
    setLanguageState(newLanguage);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
      // Persist base UI language (non-biblical) so Greek/Hebrew courses can inherit it
      if (newLanguage !== 'el' && newLanguage !== 'he') {
        localStorage.setItem('learnendo_base_ui_lang', newLanguage);
      }
    }
  }, []);

  // UI language: Greek and Hebrew are content-only languages; the app shell stays
  // in the last modern language the user had (or English as fallback).
  const uiLanguage: 'en' | 'pt' | 'es' = (() => {
    if (language !== 'el' && language !== 'he') return language as 'en' | 'pt' | 'es';
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('learnendo_base_ui_lang');
      if (stored === 'pt' || stored === 'es') return stored;
    }
    return 'en';
  })();

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
  const [authReady, setAuthReady] = useState(false);
  /** True once the Firestore courseProgress/main snapshot has responded (even if empty).
   *  The main UI is not rendered until this is true, preventing the empty-state flicker. */
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weekCompletionResult, setWeekCompletionResult] = useState<WeekCompletionResult | null>(null);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [showResultAnimation, setShowResultAnimation] = useState(false);
  const [conversionReason, setConversionReason] = useState<string | undefined>();
  const [conversionSuccess, setConversionSuccess] = useState(false);
  const [showGrammarModal, setShowGrammarModal] = useState(false);
  const isAdmin = user?.email?.toLowerCase() === 'learnendo@gmail.com';
  const activeCourseId = currentCourseId ?? DEFAULT_COURSE_ID;
  const hasPlacementDone = progressLoaded && (
    (progress.placementScore != null) ||
    (user?.uid ? !!localStorage.getItem(`learnendo_placement_${user.uid}`) : false)
  );
  const showPlacementBanner = progressLoaded && !hasPlacementDone &&
    !([SectionType.PLACEMENT_TEST, SectionType.PRACTICE, SectionType.LESSON] as string[]).includes(currentSection);
  const activeCourse = COURSES.find((course) => course.id === activeCourseId) ?? null;
  // Qualify the lesson-test prefix with the current language so that English
  // completions ('lesson_test_passed_1') never appear as completed in PT/ES
  // ('lesson_test_passed_pt_1' / 'lesson_test_passed_es_1') and vice-versa.
  const langTestSuffix = language !== 'en' ? `${language}_` : '';
  const fullLessonTestPrefix = `${LESSON_TEST_PREFIX}${langTestSuffix}`;
  const completedLessonNumbers = (progress.completedActivities || [])
    .filter((activityId) => activityId.startsWith(fullLessonTestPrefix))
    .map((activityId) => Number(activityId.replace(fullLessonTestPrefix, '')))
    .filter((value) => Number.isFinite(value));
  const completedLessonSet = new Set(completedLessonNumbers);
  const completedLessonCount = completedLessonSet.size;
  const streak = Number((progress as any).streakCount ?? completedLessonCount);
  const freeze = Number((progress as any).iceCount ?? 0);
  const diamonds = Number((progress as any).diamonds ?? completedLessonCount * 10);
  const stars = Number((progress as any).totalStars ?? (progress.completedActivities || []).length);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [score, setScore] = useState<ScoreResult | null>(null);
  /** Per-lesson score accumulator — updated locally on every exercise completion.
   *  Source of truth for header stats and result popup (no Firebase round-trip needed).
   *  Reset to zero whenever a new lesson is opened. */
  const [lessonScore, setLessonScore] = useState<{ correct: number; total: number; completed: number; missed: number }>({ correct: 0, total: 0, completed: 0, missed: 0 });
  /** Progress for the currently open lesson — read from Firestore on lesson open. */
  const [lessonProgress, setLessonProgress] = useState<LessonProgress | null>(null);
  /** Ensures the splash is visible for at least 1.5 s even if Firebase resolves instantly. */
  const [minSplashDone, setMinSplashDone] = useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setMinSplashDone(true), 1500);
    return () => clearTimeout(t);
  }, []);
  const activeSessionRef = useRef<{ uid: string; sessionId: string; startedAt: number } | null>(null);
  const lastLocalUpdateRef = useRef<string | null>(null);
  /** Timestamp (ms) when the current day practice started — used to compute timeSpent. */
  const dayStartTimeRef = useRef<number | null>(null);
  /** Always holds the latest progress to avoid stale closures in async callbacks. */
  const latestProgressRef = useRef<UserProgress>(progress);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  // Keep latestProgressRef in sync with the latest progress state
  useEffect(() => {
    latestProgressRef.current = progress;
  }, [progress]);

  // Log whenever language changes
  useEffect(() => {
    console.log('[LANGUAGE CHANGED]', {
      newLanguage: language,
      currentCourseId,
      currentWorkbookId,
      progressCurrentWorkbook: progress.currentWorkbook,
      progressCurrentLesson: progress.currentLesson,
      completedDaysCount: countCompletedDays((progress as any).days),
      daysKeys: Object.keys((progress as any).days ?? {}).sort(),
    });
  }, [language]);

  // Sync language with course selection
  const handleCourseChange = useCallback((courseId: string) => {
    console.log('[COURSE CHANGE] handleCourseChange called', {
      newCourseId: courseId,
      previousCourseId: currentCourseId,
      currentLanguage: language,
      currentWorkbook: progress.currentWorkbook,
      completedDaysCount: countCompletedDays((progress as any).days),
    });
    setCurrentCourseId(courseId);
    const languageForCourse = COURSE_TO_LANGUAGE[courseId];
    if (languageForCourse && languageForCourse !== language) {
      console.log('[LANGUAGE CHANGE] via handleCourseChange', {
        newLanguage: languageForCourse,
        previousLanguage: language,
        courseId,
        currentWorkbook: progress.currentWorkbook,
        completedDaysCount: countCompletedDays((progress as any).days),
      });
      setLanguage(languageForCourse);
    }
  }, [language, setLanguage, currentCourseId, progress]);



  const triggerConversion = (reason?: string) => {
    setConversionReason(reason);
    setShowConversionModal(true);
  };

  const countCompletedDays = (days: unknown): number => {
    if (!days || typeof days !== 'object') return 0;
    return Object.values(days as Record<string, boolean>).filter(v => v === true).length;
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
        closeActiveSession();
        setCurrentCourseId(null);
        setCurrentSection(SectionType.COURSES);
        console.log('SET WORKBOOK ID', null, '← logout/signout'); console.trace('TRACE WORKBOOK ID');
        setCurrentWorkbookId(null);
        setCurrentLessonId(null);
        setCurrentDay(null);
        setActiveWeeklyTest(null);
        setLessonTestCompleted({});
        setLessonTestScores({});
        setProgressLoaded(false); // reset so next login waits for Firestore again
        setLoading(true);
        setUser(null);
        setAuthReady(true);
        return;
      }

      setUser(authenticatedUser);

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

        // Sync displayName/email to the flat progress doc so rankings show real names.
        // Anonymous users get a stable "Player_XXXXXX" identifier derived from their UID.
        if (db) {
          const displayName =
            authenticatedUser.displayName ??
            (authenticatedUser.isAnonymous
              ? `Player_${authenticatedUser.uid.slice(0, 6)}`
              : authenticatedUser.email?.split('@')[0] ?? 'User');
          console.log('[WRITE] setDoc', {
            path: `users/${authenticatedUser.uid}/progress`,
            workbookId: null,
            courseId: currentCourseId ?? DEFAULT_COURSE_ID,
            completedDays: countCompletedDays(progress.days),
            payloadKeys: ['displayName', 'email', 'courseId'],
          });
          setDoc(
            doc(db, 'progress', authenticatedUser.uid),
            {
              displayName,
              email: authenticatedUser.email ?? null,
              courseId: currentCourseId ?? DEFAULT_COURSE_ID,
              // Stamp lastActivity on every app open so the teacher dashboard
              // shows "Today" even for students who logged in but didn't complete a day.
              lastActivity: serverTimestamp(),
            },
            { merge: true },
          ).catch(e => console.warn('[App] progress profile write failed:', e));
        }

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

      // ========== STEP 3: SET UID & DEFAULTS ==========
      // Progress is driven SOLELY by the onSnapshot listener on courseProgress/main.
      // We only stamp userId here so that any Firestore write before the snapshot
      // arrives uses the correct key.  Do NOT set workbook/lesson/completedActivities
      // here — that would race against and overwrite the Firestore snapshot.
      // Progress fields are loaded by the onSnapshot listener on courseProgress/main.
      // token refresh (~1/hour). Only initialise to 1 if the value is still null.
      console.log('SET WORKBOOK ID', '(prev ?? 1)', '← onAuthStateChanged Step 3'); console.trace('TRACE WORKBOOK ID');
      setCurrentWorkbookId((prev) => prev ?? 1);
      setCurrentSection(SectionType.WORKBOOK);

      // Auth is now ready — user and progress are both set
      setAuthReady(true);

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

  // ── Firestore progress listener — single source of truth for UserProgress ──
  useEffect(() => {
    if (!authReady || !user?.uid || !db) return;
    setLoading(true);
    const progressRef = doc(db, 'users', user.uid, 'courseProgress', 'main');
    const progressPath = `users/${user.uid}/courseProgress/main`;
    const unsub = onSnapshot(
      progressRef,
      (snap) => {
        const rawData = snap.exists() ? snap.data() : null;
        const rawKeys = rawData ? Object.keys(rawData) : [];
        const snapshotDays = rawData && typeof rawData === 'object' ? (rawData as any).days : undefined;
        const daysDirect = !!snapshotDays && typeof snapshotDays === 'object';
        const daysNestedKeys = rawData && typeof rawData === 'object'
          ? Object.keys(rawData as Record<string, unknown>).filter(k => {
              const candidate = (rawData as Record<string, any>)[k];
              return !!candidate && typeof candidate === 'object' && !!candidate.days;
            })
          : [];
        console.log('[READ] onSnapshot — DIAGNOSTIC CONTEXT', {
          path: progressPath,
          exists: snap.exists(),
          rawKeys,
          lastUpdated: rawData && typeof rawData === 'object' ? (rawData as any).lastUpdated : undefined,
          daysDirect,
          daysNestedUnder: daysNestedKeys,
          completedDaysBeforeSetProgress: countCompletedDays(snapshotDays),
          '==== CURRENT UI CONTEXT ====': null,
          currentLanguage: language,
          currentWorkbookId,
          currentCourseId,
          currentActiveCourseId: activeCourseId,
          selectedLesson: currentLessonId,
          selectedDay: currentDay?.id,
          payloadWorkbook: rawData?.workbook ?? rawData?.currentWorkbook,
          payloadLesson: rawData?.lesson ?? rawData?.currentLesson,
          daysSnapshot: snapshotDays ? Object.keys(snapshotDays as Record<string, boolean>).map(k => `${k}:${(snapshotDays as any)[k]}`) : [],
        });
        if (snap.exists()) {
          const data = snap.data() as Partial<UserProgress> & { workbook?: number; lesson?: number; lastUpdated?: string; courseId?: string };

          // ── Accept all data from Firestore as valid ──
          // Even empty documents are valid (brand-new users).
          // Do not filter or ignore based on content shape.
          const rawDays = data.days;

          console.log('[STATE UPDATE]← Firestore snapshot (ONLY source of truth)', {
            completedDays: Object.keys(rawDays ?? {}).filter(k => (rawDays as any)?.[k] === true),
            currentWorkbook: data.currentWorkbook ?? data.workbook,
            currentLesson: data.currentLesson ?? data.lesson,
          });

          // Derive completedActivities from the days map when the array is absent/empty.
          // The days map is the authoritative Firestore representation; completedActivities
          // is the in-memory array used by UI components.
          const firestoreDays = rawDays as Record<string, boolean>;
          const resolvedActivities: string[] | undefined =
            Array.isArray(data.completedActivities) && data.completedActivities.length > 0
              ? data.completedActivities
              : firestoreDays
                ? Object.keys(firestoreDays).filter(k => firestoreDays[k] === true)
                : undefined;

          if (
            lastLocalUpdateRef.current &&
            data?.lastUpdated &&
            data.lastUpdated < lastLocalUpdateRef.current
          ) {
            console.log('[SNAPSHOT] Ignored outdated snapshot', {
              snapshotLastUpdated: data.lastUpdated,
              localLastUpdated: lastLocalUpdateRef.current,
            });
            return;
          }

          console.log('[STATE] FROM FIRESTORE', new Date().toISOString());
          console.log('[setProgress from snapshot] — APPLYING FIRESTORE STATE', {
            completedDays: countCompletedDays(firestoreDays),
            daysKeys: Object.keys(firestoreDays).sort(),
            language,
            currentWorkbookId,
            currentCourseId,
            activeCourseId,
            selectedLesson: currentLessonId,
            selectedDay: currentDay?.id,
            payloadWorkbook: data.currentWorkbook ?? data.workbook,
            payloadLesson: data.currentLesson ?? data.lesson,
            willUpdateState: {
              workbook: data.currentWorkbook ?? data.workbook,
              lesson: data.currentLesson ?? data.lesson,
              daysCount: countCompletedDays(firestoreDays),
            },
          });
          setProgress((prev) => ({
            ...prev,
            ...(((data.currentWorkbook ?? data.workbook) !== undefined) && { currentWorkbook: data.currentWorkbook ?? data.workbook }),
            ...(((data.currentLesson  ?? data.lesson)  !== undefined) && { currentLesson:   data.currentLesson  ?? data.lesson  }),
            ...(data.currentDay      !== undefined && { currentDay:      data.currentDay      }),
            ...(resolvedActivities   !== undefined && { completedActivities: resolvedActivities }),
            ...(firestoreDays        !== undefined && { days:             firestoreDays        }),
            ...(data.lastCompletedDate !== undefined && { lastCompletedDate: data.lastCompletedDate }),
            ...(data.placementScore    !== undefined && { placementScore:    data.placementScore    }),
          }));
          console.log('[STATE CONTROL ✓] Progress updated from Firestore snapshot');
          setCurrentWorkbookId(data.currentWorkbook ?? data.workbook ?? 1);
          // Restore the saved courseId so ensureLessonStarted reads the correct
          // courseProgress/{courseId}_{bookNumber} document after logout/login.
          if (data.courseId) {
            setCurrentCourseId(data.courseId);
            // ── COLD-START FIX: sync language to match the restored course ──────
            // handleCourseChange() does this on user interaction, but the Firestore
            // restore path previously skipped it.  On a cold start (cleared storage),
            // language defaults to 'en' while courseId may be e.g.
            // 'portuguese_foreigners' → TTS and UI stayed in English.
            const restoredLanguage = COURSE_TO_LANGUAGE[data.courseId];
            console.log('[COLD-START INIT] Firestore courseId→language sync', {
              courseId: data.courseId,
              restoredLanguage,
              prevLanguage: language,
              willUpdate: !!restoredLanguage && restoredLanguage !== language,
            });
            if (restoredLanguage && restoredLanguage !== language) {
              setLanguage(restoredLanguage);
            }
            // Backfill courseId on the flat progress doc for returning users whose
            // doc predates the courseId field (written via merge so nothing else changes).
            if (db && user?.uid) {
              setDoc(
                doc(db, 'progress', user.uid),
                { courseId: data.courseId },
                { merge: true },
              ).catch(() => {});
            }
          }
          setProgressLoaded(true);
          setLoading(false);
        } else {
          // Document not yet created — initialize defaults LOCALLY only
          console.log('Firestore progress: no document yet — using local defaults for', user.uid);
          const defaults: Partial<UserProgress> & { workbook: number; lesson: number; days: Record<string, unknown> } = {
            workbook: 1,
            lesson: 1,
            days: {},
            currentWorkbook: 1,
            currentLesson: 1,
            currentDay: 1,
            completedActivities: [],
            lastCompletedDate: new Date(0).toISOString(),
          };
          console.log('[STATE] FROM FIRESTORE', new Date().toISOString());
          console.log('[setProgress from default builder] — NO DOCUMENT YET', {
            completedDays: countCompletedDays(defaults.days),
            language,
            currentWorkbookId,
            currentCourseId,
            activeCourseId,
            selectedLesson: currentLessonId,
            selectedDay: currentDay?.id,
            reason: 'snap.exists() === false',
            willInitializeTo: {
              workbook: defaults.workbook,
              lesson: defaults.lesson,
              daysCount: 0,
            },
          });
          setProgress((prev) => ({ ...prev, ...defaults }));
          console.log('[STATE CONTROL ✓] Firestore empty — using local defaults (awaiting user action)');
          setProgressLoaded(true); // render the empty state
          setLoading(false);
          // DO NOT write defaults to Firestore — only write when user makes progress
        }
      },
      (err) => {
        console.warn('[Progress] onSnapshot error:', err);
        setLoading(false);
      },
    );
    return unsub;
  }, [authReady, user?.uid]);

  // ── Live stats/main listener — single source of truth for dashboard stats ──
  useEffect(() => {
    if (!authReady || !user?.uid || !db) return;
    const statsRef = doc(db, 'users', user.uid, 'stats', 'main');
    const unsub = onSnapshot(
      statsRef,
      (snap) => {
        if (!snap.exists()) {
          console.log('[Stats] stats/main does not exist yet for', user.uid, '— will be created on first lesson completion');
          return;
        }
        const data = snap.data();
        console.log('Firestore returned:', data);
        if (typeof data.sessions === 'number') setSessionCount(data.sessions);
      },
      (err) => console.warn('[Stats] onSnapshot error:', err),
    );
    return unsub;
  }, [authReady, user?.uid]);

  useEffect(() => {
    if (!authReady || !user?.uid || !currentLessonId) return;
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
  }, [authReady, user?.uid, currentLessonId]);

  useEffect(() => {
    // This effect initializes defaults ONLY before Firestore loads.
    // Once progressLoaded is true, DO NOT re-run — let Firestore state persist.
    if (!user || progressLoaded) return;
    console.log('[EFFECT] ensure-defaults running', {
      reason: 'user exists but progressLoaded is false',
      currentCourseId,
      currentWorkbookId,
      language,
      progressCurrentWorkbook: progress.currentWorkbook,
      progressCurrentLesson: progress.currentLesson,
    });
    if (!currentCourseId) {
      console.log('[ACTION] Setting DEFAULT_COURSE_ID', {
        newValue: DEFAULT_COURSE_ID,
        reason: 'currentCourseId is falsy',
        language,
      });
      setCurrentCourseId(DEFAULT_COURSE_ID);
    }
    if (!currentWorkbookId) {
      console.log('[ACTION] Setting currentWorkbookId from progress', {
        newValue: progress.currentWorkbook || 1,
        reason: 'currentWorkbookId is falsy',
        language,
        progressCurrentWorkbook: progress.currentWorkbook,
      });
      console.log('SET WORKBOOK ID', progress.currentWorkbook || 1, '← ensure-defaults useEffect (fired because currentWorkbookId is falsy)');
      setCurrentWorkbookId(progress.currentWorkbook || 1);
    }
  }, [user, progressLoaded]);

  useEffect(() => {
    if (!currentWorkbookId || !progressLoaded) return;
    // Cancellation flag: if currentWorkbookId or currentCourseId changes while
    // the async import is in-flight, the stale load must NOT call setCurrentWorkbook.
    // Without this, a slow load for workbookId=1 can resolve AFTER a fast load
    // for the correct workbookId and overwrite the UI — the classic "briefly correct
    // then resets to lesson 1" race condition.
    let cancelled = false;

    const loadWorkbook = async () => {
      const courseId = currentCourseId ?? DEFAULT_COURSE_ID;
      const registry = COURSE_WORKBOOKS[courseId] ?? COURSE_WORKBOOKS[DEFAULT_COURSE_ID];
      const loader = registry[currentWorkbookId as keyof typeof registry];
      if (!loader) {
        if (!cancelled) setCurrentSection(SectionType.WORKBOOK);
        return;
      }

      if (!cancelled) setIsWorkbookLoading(true);
      try {
        const module = await loader();
        if (cancelled) return;  // stale — discard result
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
        if (!cancelled) setCurrentSection(SectionType.WORKBOOK);
      } finally {
        if (!cancelled) setIsWorkbookLoading(false);
      }
    };

    loadWorkbook();
    return () => { cancelled = true; };
  }, [currentWorkbookId, currentCourseId, progressLoaded]);

  const handleNavigate = (section: SectionType, params?: any) => {
    setCourseMenuOpen(false);
    setActiveWeeklyTest(null);

    if (section === SectionType.DASHBOARD) {
      setCurrentDay(null);
      setCurrentLessonId(null);
      const workbookId = Number(progress.currentWorkbook || 1);
      console.log('SET WORKBOOK ID', workbookId, '← handleNavigate DASHBOARD'); console.trace('TRACE WORKBOOK ID');
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
      // Show the workbook picker only when no workbook is currently known AND the course
      // has multiple workbooks.  Once a workbook is active (progress.currentWorkbook ≥ 1),
      // navigate directly to it so the bottom-nav icon reliably opens the island map.
      if (!params?.workbookId && !(currentWorkbookId || progress.currentWorkbook)) {
        const _courseId = currentCourseId ?? DEFAULT_COURSE_ID;
        const _registry = COURSE_WORKBOOKS[_courseId] ?? COURSE_WORKBOOKS[DEFAULT_COURSE_ID];
        if (Object.keys(_registry).length > 1) {
          setCurrentSection(SectionType.WORKBOOK_LIST);
          return;
        }
      }
      const workbookId = Number(params?.workbookId || currentWorkbookId || progress.currentWorkbook || 1);
      console.log('SET WORKBOOK ID', workbookId, '← handleNavigate WORKBOOK', params); console.trace('TRACE WORKBOOK ID');
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

  const handleSelectWorkbook = (workbookId: number) => {
    const updated = { ...progress, currentWorkbook: workbookId };
    setProgress(updated);
    setCurrentWorkbookId(workbookId);
    try { ProgressEngine.saveProgress(updated); } catch { /* non-blocking */ }
    if (user?.uid && db) {
      const now = new Date().toISOString();
      lastLocalUpdateRef.current = now;
      setDoc(
        doc(db, 'users', user.uid, 'courseProgress', 'main'),
        { currentWorkbook: workbookId, lastUpdated: now },
        { merge: true },
      ).catch(e => console.warn('[WORKBOOK] persist workbook selection failed:', e));
    }
    handleNavigate(SectionType.WORKBOOK, { workbookId });
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

    // ── FIX: clear stale lessonProgress BEFORE navigating to the lesson ──
    // Without this, LessonView renders immediately with the previous lesson's
    // completed days (green), then corrects itself when the async resolves (reset to blue).
    // Setting null here forces LessonView to fall back to completedActivities
    // during the async window — no flash of wrong green days.
    setLessonProgress(null);

    // Initialise (or reload) lesson progress from courseProgress
    if (user?.uid) {
      const courseId = currentCourseId ?? DEFAULT_COURSE_ID;
      console.log('[OPEN LESSON] ensureLessonStarted path:', `users/${user.uid}/courseProgress/${courseId}_${progress.currentWorkbook}`, {
        lessonNumber,
        language,
        courseId,
        workbook: progress.currentWorkbook,
      });
      ensureLessonStarted(user.uid, courseId, progress.currentWorkbook, lessonNumber)
        .then(lp => {
          console.log('[OPEN LESSON] ensureLessonStarted resolved', {
            lessonNumber,
            language,
            courseId,
            returnedLpPresent: !!lp,
            returnedLpStartedAt: lp?.startedAt ?? null,
            returnedCompletedDays: lp
              ? lp.days.filter(d => d.completed).map(d => `day${d.day}`)
              : [],
          });
          setLessonProgress(lp);
        })
        .catch(e => console.warn('[UNLOCK] ensureLessonStarted failed:', e));
    } else {
      setLessonProgress(null);
    }

    // Reset accumulated score so the header and result popup always reflect the
    // current lesson — not stale data from a previously opened lesson.
    setLessonScore({ correct: 0, total: 0, completed: 0, missed: 0 });
    setCurrentLessonId(lessonId);
    setCurrentDay(null);
    setCurrentSection(SectionType.LESSON);

    // Auto-show grammar on first visit to this lesson.
    const courseId = currentCourseId ?? DEFAULT_COURSE_ID;
    const grammarKey = `grammar_seen_${courseId}_${progress.currentWorkbook}_${lessonNumber}`;
    if (!localStorage.getItem(grammarKey)) {
      localStorage.setItem(grammarKey, '1');
      setShowGrammarModal(true);
    }
  };

  const startWeeklyTest = (lessonId: string, lessonNumber: number, day: Day) => {
    setCurrentLessonId(lessonId);
    setCurrentDay(day);
    setLessonTestCompleted((prev) => ({ ...prev, [lessonNumber]: false }));
    setActiveWeeklyTest({ lessonNumber, lessonId });
    setCurrentSection(SectionType.PRACTICE);
  };

  const handlePlacementComplete = (score: number, level: string) => {
    const workbook = PlacementEngine.determineWorkbook(score);
    const updated = { ...progress, currentWorkbook: workbook, placementScore: score };
    setProgress(updated);
    setCurrentWorkbookId(workbook);
    try { ProgressEngine.saveProgress(updated); } catch { /* non-blocking */ }

    // Mark placement as done in localStorage so the gate banner disappears immediately.
    if (user?.uid) {
      localStorage.setItem(`learnendo_placement_${user.uid}`, '1');
    }

    // Persist placement test result (score + level) to flat progress doc.
    // Write both the legacy `placement` key and the per-language `placements[lang]`
    // key so future multi-language dashboard reads work correctly.
    if (user?.uid && db) {
      const placementRecord = { score, level, date: new Date().toISOString(), languageCode: language };
      const placementPayload = {
        tests: {
          placement: placementRecord,
          placements: { [language]: placementRecord },
        },
      };
      console.log('[WRITE] setDoc', {
        path: `progress/${user.uid}`,
        workbookId: progress.currentWorkbook,
        courseId: currentCourseId ?? DEFAULT_COURSE_ID,
        completedDays: countCompletedDays(progress.days),
        payloadKeys: Object.keys(placementPayload),
      });
      setDoc(
        doc(db, 'progress', user.uid),
        placementPayload,
        { merge: true },
      ).catch(e => console.warn('[PROGRESS] placement test save failed:', e));

      // Also persist placementScore + determined workbook to courseProgress/main
      // so the Firestore snapshot re-hydrates these fields on the next session.
      const now = new Date().toISOString();
      lastLocalUpdateRef.current = now;
      setDoc(
        doc(db, 'users', user.uid, 'courseProgress', 'main'),
        { placementScore: score, currentWorkbook: workbook, lastUpdated: now },
        { merge: true },
      ).catch(e => console.warn('[PROGRESS] courseProgress/main placement persist failed:', e));
    }

    handleNavigate(SectionType.WORKBOOK, { workbookId: workbook });
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

    // ── Accumulate local lesson score immediately (no Firebase dependency) ────────
    // Reverse-engineer the correct count from the percentage score reported by
    // ExercisePractice.  This runs for BOTH regular exercises and the weekly test
    // so that the final ResultAnimation shows cumulative lesson totals.
    const _qCount = Math.max(1, currentDay?.exercises?.length ?? 0);
    const _cCount = Math.round((score / 100) * _qCount);
    setLessonScore(prev => ({
      correct:   prev.correct   + _cCount,
      total:     prev.total     + _qCount,
      completed: prev.completed + 1,
      missed:    prev.missed, // days missed — tracked separately, 0 until implemented
    }));

    if (activeWeeklyTest) {
      const { lessonNumber, lessonId } = activeWeeklyTest;
      setLessonTestScores((prev) => ({ ...prev, [lessonNumber]: score }));
      setLessonTestCompleted((prev) => ({ ...prev, [lessonNumber]: true }));
      setCurrentDay(null);
      setActiveWeeklyTest(null);

      if (score === 100) {
        const testMarker = `${fullLessonTestPrefix}${lessonNumber}`;
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

        // DO NOT call setProgress here — let Firestore snapshot update state
        try { ProgressEngine.saveProgress(updated); } catch { /* non-blocking */ }

        // Navigate immediately so the first CONTINUE click advances the UI without
        // waiting for the Firestore round-trip (which blocked navigation before and
        // caused users to see "Exercicio indisponivel." for 300–1000 ms, making
        // them think their click had not registered).
        setCurrentLessonId(null);
        setCurrentSection(SectionType.WORKBOOK);

        // Persist progress to Firestore — fire-and-forget (no await).
        if (user?.uid && db) {
          const currentDays = latestProgressRef.current?.days ?? {};
          const progressToSave = {
            workbook: updated.currentWorkbook,
            lesson:   updated.currentLesson,
            currentWorkbook: updated.currentWorkbook,
            currentLesson:   updated.currentLesson,
            currentDay:      updated.currentDay,
            completedActivities: updated.completedActivities,
            courseId: currentCourseId ?? DEFAULT_COURSE_ID,
            days: currentDays,
            lastCompletedDate: updated.lastCompletedDate,
          };
          const now = new Date().toISOString();
          lastLocalUpdateRef.current = now;
          console.log('[WRITE] setDoc to courseProgress/main — WEEKLY TEST COMPLETED', {
            path: `users/${user.uid}/courseProgress/main`,
            language,
            currentWorkbookId,
            currentCourseId: currentCourseId ?? DEFAULT_COURSE_ID,
            activeCourseId,
            completedDays: countCompletedDays(progressToSave.days),
            daysKeys: Object.keys(progressToSave.days as any),
            sourceWorkbook: updated.currentWorkbook,
            sourceLesson: updated.currentLesson,
            sourceCurrentDay: updated.currentDay,
            payloadKeys: [...Object.keys(progressToSave), 'lastUpdated'],
          });
          setDoc(
            doc(db, 'users', user.uid, 'courseProgress', 'main'),
            {
              ...progressToSave,
              lastUpdated: now,
            },
            { merge: true },
          ).then(() => console.log('[PROGRESS] courseProgress/main write succeeded ✓'))
            .catch(e => console.error('[PROGRESS] courseProgress/main write failed:', e));
        }

        // Persist lesson test result to flat progress doc (Day 7 test)
        if (user?.uid && db) {
          const key = `W${progress.currentWorkbook}L${lessonNumber}`;
          const lessonTestPayload = {
            tests: {
              lessons: {
                [key]: {
                  workbook: progress.currentWorkbook,
                  lesson: lessonNumber,
                  day: 7,
                  score,
                  date: new Date().toISOString(),
                },
              },
            },
          };
          console.log('[WRITE] setDoc', {
            path: `progress/${user.uid}`,
            workbookId: progress.currentWorkbook,
            courseId: currentCourseId ?? DEFAULT_COURSE_ID,
            completedDays: countCompletedDays(progress.days),
            payloadKeys: Object.keys(lessonTestPayload),
          });
          setDoc(
            doc(db, 'progress', user.uid),
            lessonTestPayload,
            { merge: true },
          ).catch(e => console.warn('[PROGRESS] lesson test save failed:', e));
        }

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
      // Accumulate the days map — keys are preserved individually in Firestore.
      days: {
        ...(progress.days ?? {}),
        [dayId]: true,
      },
      // Advance to next position (capped to valid bounds by computeNextPath)
      ...(nextPath && {
        currentDay:      nextPath.day,
        currentLesson:   nextPath.lesson,
        currentWorkbook: nextPath.workbook,
      }),
      lastCompletedDate: new Date().toISOString(),
    };
    // DO NOT call setProgress here — let Firestore snapshot update state
    try { ProgressEngine.saveProgress(updated); } catch { /* non-blocking */ }

    // Navigate immediately so the CONTINUE click on the last exercise is instant —
    // same pattern used for weekly tests. Firebase writes continue in the background.
    setCurrentDay(null);
    setCurrentSection(SectionType.LESSON);

    // Immediately surface the completion in local state so LessonView unlocks
    // the next exercise before the Firestore onSnapshot arrives.
    setProgress(prev => ({
      ...prev,
      completedActivities: prev.completedActivities.includes(dayId)
        ? prev.completedActivities
        : [...prev.completedActivities, dayId],
      days: { ...(prev.days ?? {}), [dayId]: true },
    }));

    // Persist progress to Firestore.
    if (user?.uid && db) {
      const currentDays = latestProgressRef.current?.days ?? {};
      const newDays = {
        ...currentDays,
        [dayId]: true,
      };
      const progressToSave = {
        workbook: updated.currentWorkbook,
        lesson:   updated.currentLesson,
        currentWorkbook: updated.currentWorkbook,
        currentLesson:   updated.currentLesson,
        currentDay:      updated.currentDay,
        completedActivities: updated.completedActivities,
        courseId: currentCourseId ?? DEFAULT_COURSE_ID,
        days: newDays,
        lastCompletedDate: updated.lastCompletedDate,
      };
      try {
        const now = new Date().toISOString();
        lastLocalUpdateRef.current = now;
        console.log('[WRITE] setDoc to courseProgress/main — NORMAL DAY COMPLETED', {
          path: `users/${user.uid}/courseProgress/main`,
          language,
          currentWorkbookId,
          currentCourseId: currentCourseId ?? DEFAULT_COURSE_ID,
          activeCourseId,
          completedDaysBefore: countCompletedDays(currentDays),
          completedDaysAfter: countCompletedDays(newDays),
          newDayAdded: dayId,
          daysKeysAfter: Object.keys(newDays).sort(),
          sourceWorkbook: updated.currentWorkbook,
          sourceLesson: updated.currentLesson,
          sourceCurrentDay: updated.currentDay,
          sourceCurrentDay_fromUpdated: updated.currentDay,
          payloadKeys: [...Object.keys(progressToSave), 'lastUpdated'],
        });
        await setDoc(
          doc(db, 'users', user.uid, 'courseProgress', 'main'),
          {
            ...progressToSave,
            lastUpdated: now,
          },
          { merge: true },
        );
        console.log('[PROGRESS] courseProgress/main write succeeded ✓');
      } catch (e) {
        console.error('[PROGRESS] courseProgress/main write failed:', e);
      }
    }

    // Optimistically mark the completed day in local lessonProgress so LessonView
    // unlocks the next day immediately, without waiting for the Firestore round-trip.
    if (!isNaN(dayNumber)) {
      setLessonProgress(prev => {
        if (!prev) return prev;
        const updatedDays = prev.days.map((d, i) =>
          i === dayNumber - 1
            ? { ...d, completed: true, completedAt: new Date().toISOString(), score }
            : d
        );
        return { ...prev, days: updatedDays };
      });
    }

    // ── Bonus flag: reward consistency (different calendar day) — no score inflation ──
    const isSameDay = (a: string | undefined, b: string | undefined): boolean => {
      if (!a || !b) return false;
      return new Date(a).toDateString() === new Date(b).toDateString();
    };
    const earnsBonus = !isSameDay(progress.lastCompletedDate, new Date().toISOString());
    if (earnsBonus && score > 0) {
      console.log(`[Bonus] Different day — bonus earned! score kept real at ${score}`);
    }

    // Firebase: Track day completion and check for week completion
    if (user?.uid && currentLessonId) {
      // ── Atomic progress write (independent of completeCourseDay) ──
      if (user?.uid) {
        const questionCount = Math.max(1, currentDay?.exercises?.length ?? 0);
        const estimatedCorrect = Math.round((score / 100) * questionCount);
        trackLessonCompletion({
          userId: user.uid,
          lessonId: dayId,
          score,
          totalQuestions: questionCount,
          correctAnswers: estimatedCorrect,
        }).catch(e => console.warn('[App] trackLessonCompletion failed:', e));
      }

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
            accuracy: score,
          };
          completeCourseDay(user.uid, courseId, progress.currentWorkbook, lessonNumber, dayNumber, score, analytics)
            .then(async ({ success, stats }) => {
              if (success) {
                console.log('[SAVE] courseProgress stats (current lesson):', stats);
                // Refresh the in-memory lessonProgress so LessonView shows the tick
                ensureLessonStarted(user.uid!, courseId, progress.currentWorkbook, lessonNumber)
                  .then(lp => { if (lp) setLessonProgress(lp); })
                  .catch(() => {});

                // Write to flat "progress" collection for realtime teacher dashboard.
                // Use CUMULATIVE stats across all lessons/books so the ranking score
                // never resets when the student moves to a new lesson or workbook.
                if (db) {
                  const cumulativeStats = await getCumulativeUserStats(user.uid!);
                  const flatProgressPayload = {
                    uid: user.uid,
                    displayName: user.displayName ?? null,
                    email: user.email ?? null,
                    courseId: currentCourseId ?? DEFAULT_COURSE_ID,
                    currentWorkbook: updated.currentWorkbook,
                    currentLesson: updated.currentLesson,
                    currentDay: updated.currentDay,
                    lastActivity: serverTimestamp(),
                    totalStars: cumulativeStats.stars,
                    totalDiamonds: cumulativeStats.diamonds,
                    totalFire: cumulativeStats.fire,
                    totalIce: cumulativeStats.ice,
                    daysCompleted: cumulativeStats.sessions,
                    avgAccuracy: cumulativeStats.avgAccuracy,
                    totalTimeSpent: cumulativeStats.sessions * cumulativeStats.avgTimeSpent,
                    totalErrors: cumulativeStats.totalErrors,
                    totalAttempts: cumulativeStats.totalAttempts,
                    lessonsStarted: Math.max(updated.currentLesson, lessonNumber),
                  };
                  console.log('[WRITE] setDoc to progress/{uid} — FLAT DOC (should not affect courseProgress/main)', {
                    path: `progress/${user.uid}`,
                    language,
                    workbookId: updated.currentWorkbook,
                    courseId: currentCourseId ?? DEFAULT_COURSE_ID,
                    completedDays: countCompletedDays((progress as any).days),
                    payloadKeys: Object.keys(flatProgressPayload),
                  });
                  setDoc(
                    doc(db, 'progress', user.uid!),
                    flatProgressPayload,
                    { merge: true },
                  ).then(() => {
                    // Mark this course as active using updateDoc with a dotted field path
                    // so other courses in the map are never overwritten.
                    // This is the single write that powers multi-language tracking and
                    // per-course ranking filters.
                    const activeCourseId = currentCourseId ?? DEFAULT_COURSE_ID;
                    const activeCourseEntry: ActiveCourse = {
                      courseId:        activeCourseId,
                      languageCode:    COURSE_TO_LANGUAGE[activeCourseId],
                      lastActivityAt:  new Date().toISOString(),
                      currentWorkbook: updated.currentWorkbook,
                      currentLesson:   updated.currentLesson,
                      currentDay:      updated.currentDay,
                    };
                    updateDoc(
                      doc(db!, 'progress', user.uid!),
                      { [`courses.${activeCourseId}`]: activeCourseEntry },
                    ).catch(() => {}); // non-critical — silently ignore
                  }).catch(e => console.warn('[PROGRESS] flat doc write failed:', e));

                  // Update dashboard stats collection with lesson results
                  const safeDiamonds = stats.diamonds ?? 0;
                  const safeStars    = stats.stars    ?? 0;
                  const safeFire     = stats.fire     ?? 0;
                  const safeIce      = stats.ice      ?? 0;
                  console.log('📊 STATS UPDATED:', { diamonds: safeDiamonds, stars: safeStars, fire: safeFire, ice: safeIce });
                  const statsPayload = {
                    diamonds: increment(safeDiamonds),
                    stars: increment(safeStars),
                    fire: increment(safeFire),
                    ice: increment(safeIce),
                    lastLessonId: dayId,
                    lastUpdated: serverTimestamp(),
                  };
                  console.log('[WRITE] setDoc to stats/main — INCREMENTS ONLY (should not affect courseProgress/main)', {
                    path: `users/${user.uid}/stats/main`,
                    language,
                    workbookId: updated.currentWorkbook,
                    courseId: currentCourseId ?? DEFAULT_COURSE_ID,
                    completedDays: countCompletedDays((progress as any).days),
                    payloadKeys: Object.keys(statsPayload),
                  });
                  setDoc(
                    doc(db, 'users', user.uid!, 'stats', 'main'),
                    statsPayload,
                    { merge: true },
                  ).catch(e => console.warn('[STATS] stats/main write failed:', e));
                }
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

    // ── DEBUG: force test write to verify Firestore connectivity ──
    if (user?.uid && db) {
      const debugPayload = {
        test: true,
        time: new Date().toISOString(),
        lessonId: dayId,
        userId: user.uid,
        score,
      };
      console.log('[WRITE] setDoc to debug_test/{uid} — CONNECTIVITY TEST (should not affect courseProgress/main)', {
        path: `debug_test/${user.uid}`,
        language,
        workbookId: progress.currentWorkbook,
        courseId: currentCourseId ?? DEFAULT_COURSE_ID,
        completedDays: countCompletedDays((progress as any).days),
        payloadKeys: Object.keys(debugPayload),
      });
      setDoc(doc(db, 'debug_test', user.uid), {
        ...debugPayload,
      }).then(() => console.log('🟢 DEBUG write OK — Firestore is reachable'))
        .catch(e => console.error('🔴 DEBUG write FAILED:', e));
    }
  };

  const renderSection = () => {
    switch (currentSection) {
      case SectionType.COURSES:
        return (
          <CoursesView
            courses={COURSES}
            currentCourseId={currentCourseId}
            currentLanguage={uiLanguage}
            onLanguageChange={setLanguage}
            onLogoClick={() => handleNavigate(SectionType.WORKBOOK)}
            onSelectCourse={(id) => {
              handleCourseChange(id);
              setCurrentLessonId(null);
              setCurrentDay(null);
              // Null out the workbook ID so the loadWorkbook effect returns early
              // (it guards on !currentWorkbookId) and cannot override the
              // WORKBOOK_LIST section we set below. Normal continue-flow restores
              // the workbook ID via onAuthStateChanged / Firestore snapshot.
              setCurrentWorkbookId(null);
              setCurrentSection(SectionType.WORKBOOK_LIST);
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
            currentLanguage={uiLanguage}
            currentUser={user ? { displayName: user.displayName, email: user.email } : undefined}
            onNavigate={handleNavigate}
          />
        );
      }
      case SectionType.WORKBOOK_LIST: {
        const _courseId = currentCourseId ?? DEFAULT_COURSE_ID;
        const _registry = COURSE_WORKBOOKS[_courseId] ?? COURSE_WORKBOOKS[DEFAULT_COURSE_ID];
        const workbookIds = Object.keys(_registry).map(Number).sort((a, b) => a - b);
        const currentWbkId = currentWorkbookId || progress.currentWorkbook || 1;
        return (
          <div className="min-h-screen bg-slate-900 pb-28 px-4 pt-6">
            <button
              onClick={() => handleNavigate(SectionType.COURSES)}
              className="mb-5 text-white font-bold text-base flex items-center gap-1"
            >
              ← {uiLanguage === 'pt' ? 'Cursos' : uiLanguage === 'es' ? 'Cursos' : 'Courses'}
            </button>
            <h1 className="text-2xl font-black text-yellow-400 mb-6">
              {uiLanguage === 'pt' ? 'Cadernos' : uiLanguage === 'es' ? 'Libros de trabajo' : 'Workbooks'}
            </h1>
            {!hasPlacementDone && (
              <div className="mb-5 bg-amber-400/10 border border-amber-400 rounded-2xl p-4 flex items-center justify-between gap-3">
                <p className="text-amber-300 text-sm font-semibold">
                  {uiLanguage === 'pt'
                    ? '📝 Faça seu teste de nivelamento para descobrir o caderno ideal.'
                    : uiLanguage === 'es'
                    ? '📝 Haz tu prueba de nivel para encontrar tu libro ideal.'
                    : '📝 Take your placement test to find your ideal workbook.'}
                </p>
                <button
                  onClick={() => setCurrentSection(SectionType.PLACEMENT_TEST)}
                  className="shrink-0 bg-amber-400 text-slate-900 font-bold text-xs px-3 py-1.5 rounded-full active:scale-95"
                >
                  {uiLanguage === 'pt' ? 'Iniciar' : uiLanguage === 'es' ? 'Iniciar' : 'Start'}
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {workbookIds.map(id => (
                <button
                  key={id}
                  onClick={() => handleSelectWorkbook(id)}
                  className={`flex flex-col items-center justify-center gap-2 py-5 px-4 rounded-2xl border-2 transition-all active:scale-95 ${
                    currentWbkId === id
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-blue-500'
                  }`}
                >
                  <img
                    src={`/islands/workbook/wbk${id}.png`}
                    alt={`Workbook ${id}`}
                    className="w-14 h-14 object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className="font-bold text-lg">
                    {uiLanguage === 'pt' ? `Caderno ${id}` : uiLanguage === 'es' ? `Libro ${id}` : `Workbook ${id}`}
                  </span>
                  {currentWbkId === id && (
                    <span className="text-xs font-semibold opacity-75">
                      {uiLanguage === 'pt' ? '✓ atual' : uiLanguage === 'es' ? '✓ actual' : '✓ current'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
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
            currentLanguage={language}
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
            wordCount={LESSON_WORD_COUNTS[lessonNumber]}
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
            onGrammar={() => setShowGrammarModal(true)}
          />
        );
      }
      case SectionType.SETTINGS:
        return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6 text-center">
            <p className="text-slate-300 font-semibold">This feature is under construction</p>
          </div>
        );
      case SectionType.HELP:
        return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6 text-center gap-6">
            <h1 className="text-2xl font-black text-white">
              {uiLanguage === 'pt' ? 'Ajuda & Suporte' : uiLanguage === 'es' ? 'Ayuda y Soporte' : 'Help & Support'}
            </h1>
            <p className="text-slate-300 font-semibold max-w-sm">
              {uiLanguage === 'pt'
                ? 'Entre em contato com seu professor para tirar dúvidas ou relatar problemas.'
                : uiLanguage === 'es'
                ? 'Contacta a tu profesor para resolver dudas o reportar problemas.'
                : 'Contact your teacher for questions or to report issues.'}
            </p>
            <a
              href="https://wa.me/5517991010930"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 bg-green-600 text-white font-black px-8 py-4 rounded-2xl shadow-[0_4px_0_0_#15803d] active:translate-y-1 transition-all"
            >
              <i className="fab fa-whatsapp text-2xl"></i>
              <span>WhatsApp — Learnendo</span>
            </a>
          </div>
        );
      case SectionType.PRACTICE: {
        if (!currentDay) return <div className="px-4 py-6 text-white">Exercicio indisponivel.</div>;
        const practiceTotalDays = currentWorkbook?.lessons?.find((l: any) => l.id === currentLessonId)?.days?.length ?? 7;
        return (
          <ExercisePractice
            day={currentDay}
            lessonId={currentLessonId || ''}
            currentLanguage={language}
            progress={progress}
            onComplete={handleDayComplete}
            totalDays={practiceTotalDays}
            onGrammar={() => setShowGrammarModal(true)}
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
          <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6 text-center">
            <p className="text-slate-300 font-semibold">Access denied. Teacher dashboard is for authorized users only.</p>
          </div>
        );
      case SectionType.RANK:
        return <RankScreen currentUserId={user?.uid} courseId={currentCourseId ?? DEFAULT_COURSE_ID} />;
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

  if (!authReady) {
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

  if (loading || !progressLoaded || !minSplashDone) {
    return (
      <div className="fixed inset-0 bg-blue-600 flex items-center justify-center">
        <span
          className="text-5xl font-black text-white tracking-tight"
          style={{ animation: 'splashEnter 0.5s ease-out forwards' }}
        >
          Learnendo
        </span>
      </div>
    );
  }

  return (
    <div className="app overflow-x-hidden bg-slate-900 min-h-screen">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-700 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-full items-center justify-between gap-1 sm:gap-2 px-2 sm:px-3 py-2 overflow-x-auto">
          <button
            type="button"
            className="flex h-10 items-center rounded-lg sm:rounded-xl bg-slate-800 px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-slate-200 shadow-sm active:scale-95 flex-shrink-0"
            onClick={() => handleNavigate(SectionType.WORKBOOK)}
            aria-label="Go to lesson list"
          >
            <span className="text-base leading-none">🏠</span>
            <span className="ml-1">Home</span>
          </button>

          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-200 flex-shrink-0">
            <button
              type="button"
              onClick={() => setCurrentSection(SectionType.COURSES)}
              className="rounded-full p-0.5 ring-2 ring-blue-400 ring-offset-1 active:scale-95 flex-shrink-0"
              title={`Language: ${language.toUpperCase()}`}
              aria-label="Change language"
            >
              <img
                src={`/flags/${{ en: 'us', pt: 'br', es: 'es', el: 'gr', he: 'il' }[language as string] ?? 'us'}.png`}
                alt={language}
                width="24"
                height="24"
                className="rounded-full block"
              />
            </button>
            <span className="rounded-lg bg-slate-800 px-1.5 py-1">🔥 {currentLessonId ? Math.min(1, lessonScore.completed) : (score?.streak ?? 0)}</span>
            <span className="rounded-lg bg-slate-800 px-1.5 py-1">❄️ {currentLessonId ? lessonScore.missed : (score?.freeze ?? 0)}</span>
            <span className="rounded-lg bg-slate-800 px-1.5 py-1">💎 {currentLessonId ? lessonScore.total : (score?.diamonds ?? 0)}</span>
            <span className="rounded-lg bg-slate-800 px-1.5 py-1">⭐ {currentLessonId ? lessonScore.total + Math.min(1, lessonScore.completed) : (score?.stars ?? 0)}</span>
          </div>

          <button
            onClick={toggleMenu}
            className="flex h-10 w-10 items-center justify-center rounded-lg sm:rounded-xl bg-slate-800 text-[22px] sm:text-[26px] leading-none text-slate-200 shadow-sm active:scale-95 flex-shrink-0"
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
      <main className="pt-[68px] pb-[56px]">{renderSection()}</main>
      {weekCompletionResult && (
        <WeekCompletionPopup
          result={weekCompletionResult}
          onClose={() => setWeekCompletionResult(null)}
        />
      )}
      {showResultAnimation && (
        <ResultAnimation
          streak={Math.min(1, lessonScore.completed)}
          freeze={lessonScore.missed}
          diamonds={lessonScore.total}
          stars={lessonScore.total + Math.min(1, lessonScore.completed)}
          percentage={lessonScore.total > 0 ? Math.round(lessonScore.correct / lessonScore.total * 100) : 0}
          newWords={progress.currentLesson === 1 ? lesson1NewWords.length : 0}
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
      {showGrammarModal && (() => {
        const lessonNum = getLessonNumberFromId(currentLessonId) || progress.currentLesson || 1;
        const entries = Object.entries(GRAMMAR_GUIDES).filter(([k]) => k.startsWith(`L${lessonNum}_`));
        return (
          <div
            className="fixed inset-0 z-[1001] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowGrammarModal(false)}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                <h2 className="text-lg font-bold text-slate-800">📖 Lesson {lessonNum} Grammar</h2>
                <button
                  onClick={() => setShowGrammarModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                  aria-label="Close"
                >×</button>
              </div>
              <div className="px-6 py-4 space-y-5">
                {entries.length === 0 ? (
                  <p className="text-slate-500 text-sm">No grammar notes available for this lesson yet.</p>
                ) : (
                  entries.map(([key, tips]) => (
                    <div key={key}>
                      <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">
                        {key.replace('_', ' › ')}
                      </p>
                      <ul className="space-y-1.5">
                        {tips.map((tip, i) => (
                          <li key={i} className="flex gap-2 text-sm text-slate-700">
                            <span className="text-blue-400 flex-shrink-0">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}
      {showPlacementBanner && (
        <div className="fixed top-[68px] left-0 right-0 z-40 bg-amber-400 text-slate-900 flex items-center justify-between gap-2 px-4 py-2.5 shadow-lg">
          <span className="text-sm font-bold">
            {uiLanguage === 'pt'
              ? '📝 Faça seu teste de nivelamento'
              : uiLanguage === 'es'
              ? '📝 Haz tu prueba de nivel'
              : '📝 Take your placement test'}
          </span>
          <button
            onClick={() => setCurrentSection(SectionType.PLACEMENT_TEST)}
            className="shrink-0 bg-slate-900 text-amber-400 font-bold text-xs px-3 py-1.5 rounded-full active:scale-95"
          >
            {uiLanguage === 'pt' ? 'Começar' : uiLanguage === 'es' ? 'Empezar' : 'Start'}
          </button>
        </div>
      )}
      <BottomNavigation
        currentSection={currentSection}
        onNavigate={handleNavigate}
        onShare={handleShare}
      />
    </div>
  );
};

export default App;