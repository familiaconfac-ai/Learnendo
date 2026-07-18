import React, { useEffect, useRef, useState, useCallback } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, updateDoc, serverTimestamp, increment, onSnapshot } from 'firebase/firestore';
import { Course, Day, Lesson, UserProgress, SectionType, LessonLanguageCode, ActiveCourse, LiveClass, LiveClassSession } from './types';
import { Dashboard } from './components/Dashboard';
import { CoursesView } from './components/CoursesView';
import { BottomNavigation } from './components/BottomNavigation';
import { BattleHubPage } from './components/BattleHub/BattleHubPage';
import { LoginScreen } from './components/LoginScreen';
import { PlacementTest } from './components/PlacementTest';
import type { PlacementTestCompletionPayload } from './components/PlacementTest';
import { WorkbookView } from './components/WorkbookView';
import { WorkbookPdfView } from './components/WorkbookPdfView/WorkbookPdfView';
import { LessonView } from './components/LessonView';
import { ExercisePractice } from './components/ExercisePractice';
import { PronunciationTrainer } from './components/PronunciationTrainer/PronunciationTrainer';
import { TeacherDashboard } from './components/TeacherDashboard/TeacherDashboard';
import { ProblemReportsDashboard } from './components/ProblemReports/ProblemReportsDashboard';
import { ConversionModal } from './components/AnonymousConversion/ConversionModal';
import { LanguageSelector } from './components/LanguageSelector';
import { RankScreen } from './components/RankScreen';
import { LiveClassesPage } from './components/LiveClasses/LiveClassesPage';
import { MyVocabularyPage } from './components/MyVocabularyPage';
import { ProgressEngine } from './engine/progressEngine';
import { COURSES } from './courses/courseList';
import { COURSE_WORKBOOKS } from './courses/courseRegistry';
import { appendUniqueCompletionActivities } from './engine/lessonProgressionEngine';
import { GRAMMAR_GUIDES } from './constants';
import { auth, db, loginWithEmail, registerWithEmail, convertAnonymousToUser } from './services/firebase';
import { createSession, createStudentProfile, finishSession, recordDailyAccess, updateLastActive, createOrUpdateUserProfile, createSessionForUser, recordLessonCompletion, getSessionCount, getWeeklyProgress, promoteAdminIfNeeded } from './services/db';
import { completeDayAndGetResult, saveStudentPlacementTest } from './engine/weeklyProgressEngine';
import { WeekCompletionPopup } from './components/WeekCompletionPopup/WeekCompletionPopup';
import { WeekCompletionResult } from './services/db';
import { calculateWeeklyScore, DayProgress, ScoreResult } from './engine/scoringEngine';
import { ensureLessonStarted, completeCourseDay, getCumulativeUserStats, LessonProgress, DayAnalytics } from './engine/courseProgressEngine';
import { computeNextPath } from './engine/progressStatsService';
import { ResultAnimation } from './components/ResultAnimation/ResultAnimation';
import { trackLessonCompletion } from './services/progressService';
import { subscribePendingExerciseReportCount } from './services/exerciseReportsService';
import { lesson1NewWords } from './data/workbook1/lesson1';
import { subscribeLiveSession, updateLiveSession } from './services/liveSessionService';
import {
  getAllowedViewModes,
  getUserViewModeStorageKey,
  normalizeUserViewMode,
  PENDING_VIEW_MODE_STORAGE_KEY,
  subscribeUserAccountProfile,
  UserAccountProfile,
  UserViewMode,
} from './services/userRoles';
import {
  BASE_UI_LANGUAGE_STORAGE_KEY,
  TabAppContext,
  USER_LANGUAGE_STORAGE_KEY,
  getScopedStorageItem,
  getSessionStorageItem,
  loadTabAppContext,
  saveTabAppContext,
  setScopedStorageItem,
} from './utils/tabScopedStorage';
import { getUnitNumberFromLessonNumber, isUnitCompletionLesson } from './utils/workbookUnits';

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

// Map courses to language codes
const COURSE_TO_LANGUAGE: Record<string, LessonLanguageCode> = {
  'english': 'en',
  'portuguese_foreigners': 'pt',
  'portuguese_native': 'pt',
  'spanish': 'es',
  'greek_koine': 'el',
  'hebrew_biblical': 'he',
};

const LANGUAGE_TO_PRIMARY_COURSE: Record<LessonLanguageCode, string> = {
  en: 'english',
  pt: 'portuguese_foreigners',
  es: 'spanish',
  el: 'greek_koine',
  he: 'hebrew_biblical',
};

const COURSE_ID_ALIASES: Record<string, string> = {
  en: 'english',
  english: 'english',
  pt: 'portuguese_foreigners',
  portuguese: 'portuguese_foreigners',
  portuguese_foreigners: 'portuguese_foreigners',
  es: 'spanish',
  spanish: 'spanish',
  el: 'greek_koine',
  greek: 'greek_koine',
  greek_koine: 'greek_koine',
  he: 'hebrew_biblical',
  hebrew: 'hebrew_biblical',
  hebrew_biblical: 'hebrew_biblical',
};



const COURSE_SELECTOR_OPTIONS = [
  { id: 'english', label: 'English', flag: '🇺🇸' },
  { id: 'portuguese_foreigners', label: 'Português', flag: '🇧🇷' },
  { id: 'spanish', label: 'Español', flag: '🇪🇸' },
  { id: 'greek_koine', label: 'Greek', flag: '🇬🇷' },
  { id: 'hebrew_biblical', label: 'Hebrew', flag: '🇮🇱' },
] as const;

const VALID_LANGUAGES = new Set<LessonLanguageCode>(['en', 'pt', 'es', 'el', 'he']);
const VALID_SECTIONS = new Set<SectionType>(Object.values(SectionType));
const VIEW_MODE_LABELS: Record<UserViewMode, string> = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Admin',
};

const buildTabViewModeStorageKey = (uid: string) => `learnendo_tab_view_mode:${uid}`;

const getRequestedTabViewModeFromSearch = (): UserViewMode | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const requestedMode = params.get('tabViewMode');
  if (requestedMode === 'student' || requestedMode === 'teacher' || requestedMode === 'admin') {
    return requestedMode;
  }
  return null;
};

const hasTabNavigationContext = (context: TabAppContext): boolean => (
  Boolean(context.courseId)
  || typeof context.workbookId === 'number'
  || Boolean(context.lessonId)
  || Boolean(context.section)
);

/**
 * validateAndFixState — pure state guard.
 * Returns a corrected snapshot of (language, courseId, workbookId).
 * Does NOT call any React setter. Callers apply the returned corrections.
 * Safe to call at any time — never causes a render loop.
 */
function validateAndFixState(opts: {
  language: LessonLanguageCode | null | undefined;
  courseId: string | null | undefined;
  workbookId: number | null | undefined;
  section: SectionType | null | undefined;
  context: string;
}): {
  language: LessonLanguageCode;
  courseId: string;
  workbookId: number;
  section: SectionType;
  fixed: boolean;
} {
  let fixed = false;
  const problems: string[] = [];

  // 1. Language must be a known code
  let lang: LessonLanguageCode = (opts.language && VALID_LANGUAGES.has(opts.language))
    ? opts.language
    : DEFAULT_LANGUAGE;
  if (lang !== opts.language) {
    problems.push(`language: '${opts.language}' → '${lang}'`);
    fixed = true;
  }

  // 2. CourseId must be known; if missing/unknown, derive from language
  const knownCourses = new Set(Object.keys(COURSE_TO_LANGUAGE));
  const normalizedCourseId = typeof opts.courseId === 'string'
    ? COURSE_ID_ALIASES[opts.courseId.trim().toLowerCase()] ?? opts.courseId.trim()
    : '';
  let courseId: string = normalizedCourseId && knownCourses.has(normalizedCourseId)
    ? normalizedCourseId
    : (LANGUAGE_TO_PRIMARY_COURSE[lang] ?? DEFAULT_COURSE_ID);
  if (courseId !== opts.courseId) {
    problems.push(`courseId: '${opts.courseId}' → '${courseId}'`);
    fixed = true;
  }

  // Keep the content language synchronized with the selected course.
  const courseLanguage = COURSE_TO_LANGUAGE[courseId] ?? DEFAULT_LANGUAGE;
  if (lang !== courseLanguage) {
    problems.push(`language/course mismatch: '${lang}' -> '${courseLanguage}' for course '${courseId}'`);
    lang = courseLanguage;
    fixed = true;
  }

  // 3. WorkbookId must exist in the course registry
  const registry = COURSE_WORKBOOKS[courseId] ?? COURSE_WORKBOOKS[DEFAULT_COURSE_ID];
  const validWorkbookIds = new Set(Object.keys(registry).map(Number));
  const rawWbId = opts.workbookId ?? 0;
  let workbookId: number = (validWorkbookIds.has(rawWbId) && rawWbId > 0)
    ? rawWbId
    : getDefaultWorkbookIdForCourse(courseId);
  if (workbookId !== rawWbId) {
    problems.push(`workbookId: ${rawWbId} → ${workbookId}`);
    fixed = true;
  }

  // 5. Section must be a known enum value
  const section: SectionType = (opts.section && VALID_SECTIONS.has(opts.section))
    ? opts.section
    : SectionType.WORKBOOK;
  if (section !== opts.section) {
    problems.push(`section: '${opts.section}' → '${section}'`);
    fixed = true;
  }

  if (fixed) {
    console.warn('[STATE FIXED]', opts.context, { problems, result: { lang, courseId, workbookId, section } });
  } else {
    console.log('[STATE VALID]', opts.context, { language: lang, courseId, workbookId, section });
  }

  return { language: lang, courseId, workbookId, section, fixed };
}

const normalizeCourseId = (
  rawCourseId: string | null | undefined,
  fallbackLanguage: LessonLanguageCode = DEFAULT_LANGUAGE,
): string => {
  const normalized = (rawCourseId ?? '').trim().toLowerCase();
  if (normalized && COURSE_ID_ALIASES[normalized]) {
    return COURSE_ID_ALIASES[normalized];
  }
  if (normalized && COURSE_TO_LANGUAGE[normalized]) {
    return normalized;
  }
  return LANGUAGE_TO_PRIMARY_COURSE[fallbackLanguage] ?? DEFAULT_COURSE_ID;
};

const getPrimaryCourseForLanguage = (
  selectedLanguage: LessonLanguageCode,
  fallbackCourseId?: string | null,
) => {
  if (selectedLanguage === 'en' || selectedLanguage === 'pt' || selectedLanguage === 'es') {
    return LANGUAGE_TO_PRIMARY_COURSE[selectedLanguage];
  }
  return normalizeCourseId(fallbackCourseId, selectedLanguage);
};

const getLessonNumberFromId = (lessonId: string | null | undefined) => {
  if (!lessonId) return NaN;
  // IDs like "wb1_l3" encode the lesson number after "_l"; extract that first.
  const wbMatch = lessonId.match(/_l(\d+)/i);
  if (wbMatch) return Number(wbMatch[1]);
  // Fallback for simple IDs like "lesson2".
  const match = lessonId.match(/(\d+)/);
  return match ? Number(match[1]) : NaN;
};

const findLessonByNumber = (
  lessons: Lesson[] | undefined,
  lessonNumber: number,
  lessonId?: string | null,
): Lesson | null => {
  if (!lessons?.length) return null;
  if (lessonId) {
    const byId = lessons.find((lesson) => lesson.id === lessonId);
    if (byId) return byId;
  }
  return (
    lessons.find((lesson) => getLessonNumberFromId(lesson.id) === lessonNumber)
    ?? null
  );
};

const getDefaultWorkbookIdForCourse = (courseId: string | null | undefined): number => {
  const registry = COURSE_WORKBOOKS[courseId ?? DEFAULT_COURSE_ID] ?? COURSE_WORKBOOKS[DEFAULT_COURSE_ID];
  const workbookIds = Object.keys(registry)
    .map(Number)
    .filter((id) => Number.isFinite(id))
    .sort((a, b) => a - b);
  return workbookIds[0] ?? 1;
};

type NormalizedGrammarSection = {
  title: string;
  lines: string[];
};

type NormalizedGrammarGuide = {
  label?: string;
  lessonTitle?: string;
  grammarTitle?: string;
  sections: NormalizedGrammarSection[];
};

const normalizeGrammarGuide = (guide: (typeof GRAMMAR_GUIDES)[string]): NormalizedGrammarGuide => {
  if (Array.isArray(guide)) {
    return {
      sections: [{ title: 'Notes', lines: guide }],
    };
  }

  const lessonTitle = guide.sections.find((section) => section.title === 'Lesson Title')?.lines[0];
  const grammarTitle = guide.sections.find((section) => section.title === 'Grammar Title')?.lines[0];
  const sections = guide.sections.filter(
    (section) => section.title !== 'Lesson Title' && section.title !== 'Grammar Title',
  );

  return {
    label: guide.label,
    lessonTitle,
    grammarTitle,
    sections,
  };
};

const renderInlineFormatting = (text: string): React.ReactNode[] => {
  let nodeKey = 0;

  const parse = (value: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let index = 0;

    while (index < value.length) {
      if (value.startsWith('**', index)) {
        const end = value.indexOf('**', index + 2);
        if (end !== -1) {
          nodes.push(
            <strong key={`strong-${nodeKey++}`}>
              {parse(value.slice(index + 2, end))}
            </strong>,
          );
          index = end + 2;
          continue;
        }
      }

      if (value[index] === '*') {
        const end = value.indexOf('*', index + 1);
        if (end !== -1) {
          nodes.push(
            <em key={`em-${nodeKey++}`}>
              {parse(value.slice(index + 1, end))}
            </em>,
          );
          index = end + 1;
          continue;
        }
      }

      const nextStrong = value.indexOf('**', index);
      const nextEm = value.indexOf('*', index);
      const nextIndex = [nextStrong, nextEm]
        .filter((candidate) => candidate !== -1)
        .reduce((smallest, candidate) => Math.min(smallest, candidate), value.length);

      nodes.push(value.slice(index, nextIndex));
      index = nextIndex;
    }

    return nodes;
  };

  return parse(text);
};

const findLessonGrammarKey = (lessonNumber: number): string | null => {
  const grammarKey = `L${lessonNumber}_GRAMMAR`;
  return Object.prototype.hasOwnProperty.call(GRAMMAR_GUIDES, grammarKey) ? grammarKey : null;
};

const getGrammarGuideForLesson = (lessonNumber: number): NormalizedGrammarGuide | null => {
  const grammarKey = findLessonGrammarKey(lessonNumber);
  if (!grammarKey) return null;
  return normalizeGrammarGuide(GRAMMAR_GUIDES[grammarKey]);
};

const getGrammarSectionTitle = (title: string): string => {
  if (title === 'Examples by Person or Structure') return 'Examples';
  return title;
};

const shouldRenderGrammarBullets = (section: NormalizedGrammarSection): boolean => {
  if (section.lines.length > 1) return true;
  return ['Main Notes', 'Examples by Person or Structure', 'Questions', 'Negative Sentences', 'Common Mistakes'].includes(section.title);
};

const renderGrammarLine = (line: string, sectionTitle: string): React.ReactNode => {
  if (sectionTitle !== 'Common Mistakes') {
    return renderInlineFormatting(line);
  }

  const match = line.match(/^(Correct|Incorrect):\s*(.*)$/i);
  if (!match) return renderInlineFormatting(line);

  const status = match[1].toLowerCase();
  const content = match[2];
  const statusClass = status === 'correct' ? 'text-blue-600' : 'text-red-600';

  return (
    <>
      <strong className={statusClass}>
        {match[1]}
        :
      </strong>{' '}
      {renderInlineFormatting(content)}
    </>
  );
};

const findLessonIdInWorkbook = (workbook: any, lessonReference: string | null | undefined): string | null => {
  const lessons = workbook?.lessons ?? [];
  if (!lessonReference || !lessons.length) return null;

  const exactMatch = lessons.find((lesson: any) => lesson.id === lessonReference);
  if (exactMatch?.id) return exactMatch.id;

  const lessonNumber = getLessonNumberFromId(lessonReference);
  if (!Number.isFinite(lessonNumber) || lessonNumber < 1) return null;
  return lessons[lessonNumber - 1]?.id ?? null;
};

const findDayInLesson = (lesson: Lesson | null | undefined, exerciseReference: string | null | undefined): Day | null => {
  const days = lesson?.days ?? [];
  if (!exerciseReference || !days.length) return null;

  const exactMatch = days.find((day) => day.id === exerciseReference);
  if (exactMatch) return exactMatch;

  const match = exerciseReference.match(/d(\d+)/i);
  if (!match) return null;
  const dayNumber = Number(match[1]);
  if (!Number.isFinite(dayNumber) || dayNumber < 1) return null;
  return days[dayNumber - 1] ?? null;
};

const App: React.FC = () => {
  const initialTabContextRef = useRef<TabAppContext>(loadTabAppContext());
  const initialStoredLanguage = (getScopedStorageItem(USER_LANGUAGE_STORAGE_KEY) as LessonLanguageCode | null);

  // ===== LANGUAGE STATE =====
  const [language, setLanguageState] = useState<LessonLanguageCode>(() => {
    if (initialStoredLanguage && ['en', 'pt', 'es', 'el', 'he'].includes(initialStoredLanguage)) {
      return initialStoredLanguage;
    }
    return DEFAULT_LANGUAGE;
  });

  // Update localStorage when language changes (course sync is handled explicitly in handleCourseChange)
  const setLanguage = useCallback((newLanguage: LessonLanguageCode) => {
    console.log('[App] Language changed:', newLanguage);
    setLanguageState(newLanguage);
    setScopedStorageItem(USER_LANGUAGE_STORAGE_KEY, newLanguage, true);
    // Persist base UI language (non-biblical) so Greek/Hebrew courses can inherit it.
    if (newLanguage !== 'el' && newLanguage !== 'he') {
      setScopedStorageItem(BASE_UI_LANGUAGE_STORAGE_KEY, newLanguage, true);
    }
  }, []);

  // UI language: Greek and Hebrew are content-only languages; the app shell stays
  // in the last modern language the user had (or English as fallback).
  const uiLanguage: 'en' | 'pt' | 'es' = (() => {
    if (language !== 'el' && language !== 'he') return language as 'en' | 'pt' | 'es';
    const stored = getScopedStorageItem(BASE_UI_LANGUAGE_STORAGE_KEY);
    if (stored === 'pt' || stored === 'es') return stored;
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
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(() => {
    const storedCourseId = initialTabContextRef.current.courseId;
    return storedCourseId ? normalizeCourseId(storedCourseId, initialStoredLanguage ?? DEFAULT_LANGUAGE) : null;
  });
  const [currentSection, setCurrentSection] = useState<SectionType>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/live-class/')) {
      return SectionType.LIVE_CLASSES;
    }
    const storedSection = initialTabContextRef.current.section;
    if (storedSection && VALID_SECTIONS.has(storedSection as SectionType)) {
      return storedSection as SectionType;
    }
    return SectionType.COURSES;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingProblemReports, setPendingProblemReports] = useState(0);
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  const [currentWorkbookId, setCurrentWorkbookId] = useState<number | null>(() => initialTabContextRef.current.workbookId ?? null);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(() => initialTabContextRef.current.lessonId ?? null);
  const [currentWorkbook, setCurrentWorkbook] = useState<any>(null);
  const [isWorkbookLoading, setIsWorkbookLoading] = useState(false);
  const [contentLoadError, setContentLoadError] = useState<string | null>(null);
  const [currentDay, setCurrentDay] = useState<Day | null>(null);
  const [pendingLiveLessonRef, setPendingLiveLessonRef] = useState<{ workbookId: number; lessonRef: string | null } | null>(null);
  const [activeOnlineClass, setActiveOnlineClass] = useState<LiveClass | null>(null);
  const [activeOnlineSession, setActiveOnlineSession] = useState<LiveClassSession | null>(null);
  const [activeWeeklyTest, setActiveWeeklyTest] = useState<{ lessonNumber: number; lessonId: string } | null>(null);
  const [lessonTestCompleted, setLessonTestCompleted] = useState<Record<number, boolean>>({});
  const [lessonTestScores, setLessonTestScores] = useState<Record<number, number>>({});
  const [user, setUser] = useState<User | null>(null);
  const [userAccountProfile, setUserAccountProfile] = useState<UserAccountProfile | null>(null);
  const [userViewMode, setUserViewMode] = useState<UserViewMode>('student');
  const [authReady, setAuthReady] = useState(false);
  /** True once the Firestore courseProgress/main snapshot has responded (even if empty).
   *  The main UI is not rendered until this is true, preventing the empty-state flicker. */
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weekCompletionResult, setWeekCompletionResult] = useState<WeekCompletionResult | null>(null);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [showResultAnimation, setShowResultAnimation] = useState(false);
  const [resultAnimationMeta, setResultAnimationMeta] = useState<{
    emoji?: string;
    title?: string;
    subtitle?: string;
    buttonLabel?: string;
    lessonNumber?: number;
  } | null>(null);
  const [conversionReason, setConversionReason] = useState<string | undefined>();
  const [conversionSuccess, setConversionSuccess] = useState(false);
  const [showGrammarModal, setShowGrammarModal] = useState(false);
  const [activeGrammarLessonNumber, setActiveGrammarLessonNumber] = useState<number | null>(null);
  const grammarModalScrollRef = useRef<HTMLDivElement | null>(null);
  const applyingRemoteGrammarScrollRef = useRef(false);
  const grammarScrollSyncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRole = userAccountProfile?.role ?? 'student';
  const isGuestAccount = Boolean(user?.isAnonymous);
  const isAdmin = userRole === 'admin';
  const isTeacherAccount = userRole === 'teacher' || userRole === 'admin';
  const canAccessTeacherDashboard = isTeacherAccount && userViewMode !== 'student';
  const canManageUsers = isAdmin;
  const canManageLiveClasses = isAdmin || (isTeacherAccount && userViewMode !== 'student');
  const liveClassViewerRole = userRole === 'teacher' && !canManageLiveClasses ? 'student' : userRole;
  const availableViewModes = getAllowedViewModes(userRole);
  const activeCourseId = currentCourseId ?? DEFAULT_COURSE_ID;
  const languagePlacement = (progress.tests as any)?.placements?.[language];
  const legacyPlacement = (progress.tests as any)?.placement;
  const hasPlacementScore =
    typeof (languagePlacement as any)?.score === 'number' ||
    typeof (legacyPlacement as any)?.score === 'number' ||
    typeof (progress as any)?.placementScore === 'number';
  const hasPlacementLevel = Boolean(
    (languagePlacement as any)?.level ||
    (legacyPlacement as any)?.level ||
    (progress as any)?.placementLevel,
  );
  const hasPlacementReport = Boolean(
    (progress as any)?.placementPdf ||
    (progress as any)?.placementReport ||
    (progress as any)?.placementReportUrl,
  );
  const localPlacementDone = user?.uid
    ? Boolean(
      localStorage.getItem(`learnendo_placement_${user.uid}_${language}`)
      || localStorage.getItem(`learnendo_placement_${user.uid}`),
    )
    : false;
  const hasPlacementResult = progressLoaded && (
    Boolean(languagePlacement) ||
    Boolean(legacyPlacement) ||
    hasPlacementScore ||
    hasPlacementLevel ||
    hasPlacementReport ||
    localPlacementDone
  );
  const shouldPromptPlacementTest = userRole === 'student';
  const showPlacementBanner = progressLoaded && shouldPromptPlacementTest && !hasPlacementResult &&
    !([SectionType.PLACEMENT_TEST, SectionType.PRACTICE, SectionType.LESSON, SectionType.LIVE_CLASSES] as string[]).includes(currentSection);
  const isInLiveRoom =
    currentSection === SectionType.LIVE_CLASSES &&
    (Boolean(activeOnlineClass) || (typeof window !== 'undefined' && window.location.pathname.startsWith('/live-class/')));
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
  const accountDisplayName =
    userAccountProfile?.name ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    (user ? `Player_${user.uid.slice(0, 6)}` : 'User');
  const accountDisplayEmail = userAccountProfile?.email || user?.email || null;
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
  /** Safety net: if both loading and progressLoaded are still stuck after 8 s, unblock. */
  React.useEffect(() => {
    if (progressLoaded) return; // already resolved — no-op
    const t = setTimeout(() => {
      if (!progressLoaded) {
        console.warn('[SPLASH_DEBUG] Safety timeout: progressLoaded still false after 8s — forcing unblock');
        setProgressLoaded(true);
        setLoading(false);
      }
    }, 8000);
    return () => clearTimeout(t);
  }, [progressLoaded]);
  /** Safety net: if authReady is still false after 12 s (Firebase SDK failure), force it. */
  React.useEffect(() => {
    if (authReady) return;
    const t = setTimeout(() => {
      if (!authReady) {
        console.warn('[LOGIN_FLOW_DEBUG] authReady safety timeout — Firebase SDK may not have initialized; forcing authReady=true');
        setAuthReady(true);
        setLoading(false);
      }
    }, 12000);
    return () => clearTimeout(t);
  }, [authReady]);
  const activeSessionRef = useRef<{ uid: string; sessionId: string; startedAt: number } | null>(null);
  const lastLocalUpdateRef = useRef<string | null>(null);
  /** Timestamp (ms) when the current day practice started — used to compute timeSpent. */
  const dayStartTimeRef = useRef<number | null>(null);
  /** Always holds the latest progress to avoid stale closures in async callbacks. */
  const latestProgressRef = useRef<UserProgress>(progress);
  /** Mirror of currentSection kept in a ref so the workbook-load effect can read
   *  it without it becoming a reactive dependency (avoids re-running on every nav). */
  const currentSectionRef = useRef<SectionType>(currentSection);
  const tabContextRef = useRef<TabAppContext>(initialTabContextRef.current);
  /** Timestamp of the last user-initiated language/course action.
   *  Firestore restores that arrive AFTER a manual action are suppressed if they
   *  would revert the user's explicit choice (race-condition guard). */
  const lastUserActionRef = useRef<number>(0);

  const persistTabContext = useCallback((patch: Partial<TabAppContext>) => {
    tabContextRef.current = {
      ...tabContextRef.current,
      ...patch,
    };
    saveTabAppContext(tabContextRef.current);
  }, []);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  useEffect(() => {
    if (!user?.uid) {
      setUserAccountProfile(null);
      setUserViewMode('student');
      return;
    }

    const storageKey = getUserViewModeStorageKey(user.uid);
    const tabStorageKey = buildTabViewModeStorageKey(user.uid);
    let pendingMode = getSessionStorageItem(PENDING_VIEW_MODE_STORAGE_KEY);
    const forcedTabViewMode = getRequestedTabViewModeFromSearch();
    const shouldPersistOnlyToTab = forcedTabViewMode !== null;
    let initialRequestedMode = forcedTabViewMode
      ?? getSessionStorageItem(tabStorageKey)
      ?? pendingMode
      ?? getScopedStorageItem(storageKey);

    const unsubscribe = subscribeUserAccountProfile(
      user.uid,
      user.email,
      (profile) => {
        setUserAccountProfile(profile);
        setUserViewMode((currentMode) => {
          const requestedMode = initialRequestedMode ?? currentMode;
          const nextMode = normalizeUserViewMode(profile.role, requestedMode);
          if (typeof window !== 'undefined') {
            setScopedStorageItem(tabStorageKey, nextMode);
            if (!shouldPersistOnlyToTab) {
              localStorage.setItem(storageKey, nextMode);
            }
            if (pendingMode) {
              window.sessionStorage.removeItem(PENDING_VIEW_MODE_STORAGE_KEY);
            }
          }
          initialRequestedMode = null;
          pendingMode = null;
          return nextMode;
        });
      },
      (error) => {
        console.warn('[App] user role subscription failed:', error);
      },
    );

    return unsubscribe;
  }, [user?.email, user?.uid]);

  useEffect(() => {
    if (currentSection === SectionType.TEACHER_DASHBOARD && !canAccessTeacherDashboard) {
      setCurrentSection(SectionType.COURSES);
    }
    if (currentSection === SectionType.PROBLEM_REPORTS && !isAdmin) {
      setCurrentSection(SectionType.COURSES);
    }
  }, [canAccessTeacherDashboard, currentSection, isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setPendingProblemReports(0);
      return;
    }
    return subscribePendingExerciseReportCount(
      setPendingProblemReports,
      (error) => console.warn('[App] problem report badge subscription failed:', error),
    );
  }, [isAdmin]);

  // Self-heal navigation/restore races where the active course changes but the
  // content language stays on the previous course, which makes TTS pick the
  // wrong locale for exercise audio.
  useEffect(() => {
    if (!currentCourseId) return;
    const expectedLanguage = COURSE_TO_LANGUAGE[currentCourseId];
    if (!expectedLanguage || expectedLanguage === language) return;
    console.warn('[LANG_SYNC] Fixing language to match active course', {
      currentCourseId,
      previousLanguage: language,
      nextLanguage: expectedLanguage,
    });
    setLanguage(expectedLanguage);
  }, [currentCourseId, language, setLanguage]);

  // Keep latestProgressRef in sync with the latest progress state
  useEffect(() => {
    latestProgressRef.current = progress;
  }, [progress]);

  // Keep currentSectionRef in sync so the workbook-load effect can read it
  useEffect(() => {
    currentSectionRef.current = currentSection;
  }, [currentSection]);

  useEffect(() => {
    persistTabContext({
      courseId: currentCourseId ?? null,
      workbookId: currentWorkbookId ?? null,
      lessonId: currentLessonId ?? null,
      section: currentSection ?? null,
    });
  }, [currentCourseId, currentLessonId, currentSection, currentWorkbookId, persistTabContext]);

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
    const nextCourseId = normalizeCourseId(courseId, language);
    const defaultWorkbookId = getDefaultWorkbookIdForCourse(nextCourseId);
    console.log('[COURSE CHANGE] handleCourseChange called', {
      newCourseId: nextCourseId,
      previousCourseId: currentCourseId,
      currentLanguage: language,
      currentWorkbook: progress.currentWorkbook,
      nextWorkbookId: defaultWorkbookId,
      completedDaysCount: countCompletedDays((progress as any).days),
    });
    setCurrentCourseId(nextCourseId);
    setCurrentWorkbookId(defaultWorkbookId);
    setCurrentWorkbook(null);
    setCurrentLessonId(null);
    setCurrentDay(null);
    setPendingLiveLessonRef(null);
    const languageForCourse = COURSE_TO_LANGUAGE[nextCourseId];
    if (languageForCourse && languageForCourse !== language) {
      console.log('[LANGUAGE CHANGE] via handleCourseChange', {
        newLanguage: languageForCourse,
        previousLanguage: language,
        courseId: nextCourseId,
        currentWorkbook: progress.currentWorkbook,
        completedDaysCount: countCompletedDays((progress as any).days),
      });
      setLanguage(languageForCourse);
    }
    // Persist the new courseId to Firestore immediately so future Firestore snapshots
    // return the correct courseId and don't revert the user's language choice.
    if (user?.uid && db) {
      const now = new Date().toISOString();
      lastLocalUpdateRef.current = now;
      setDoc(
        doc(db, 'users', user.uid, 'courseProgress', 'main'),
        { courseId: nextCourseId, lastUpdated: now },
        { merge: true },
      ).catch(e => console.warn('[COURSE] persist courseId to Firestore failed:', e));
    }
  }, [language, setLanguage, currentCourseId, progress, user?.uid]);

  const handleLanguageSelect = useCallback((newLanguage: LessonLanguageCode) => {
    const targetCourseId = LANGUAGE_TO_PRIMARY_COURSE[newLanguage] ?? DEFAULT_COURSE_ID;
    console.log('[LANG_DEBUG] handleLanguageSelect', {
      newLanguage,
      targetCourseId,
      currentCourseId,
      currentLanguage: language,
      currentSection: currentSectionRef.current,
    });

    // Stamp user action time so Firestore restores arriving within 3s are suppressed
    lastUserActionRef.current = Date.now();

    if (currentCourseId !== targetCourseId) {
      handleCourseChange(targetCourseId);
    } else if (language !== newLanguage) {
      setLanguage(newLanguage);
    }

    setCourseMenuOpen(false);
  }, [currentCourseId, handleCourseChange, language, setLanguage]);



  const triggerConversion = (reason?: string) => {
    setConversionReason(reason);
    setShowConversionModal(true);
  };

  const openGuestConversion = () => {
    setMenuOpen(false);
    triggerConversion('Create an account to save your name, email, and progress across devices.');
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
        console.log('[LOGIN_FLOW_DEBUG] auth ready (no user / logout)');
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
      console.log('[LOGIN_FLOW_DEBUG] auth ready', { uid: authenticatedUser.uid, email: authenticatedUser.email });
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
    if (!authReady || !user?.uid) return;

    // ── FIX: if Firebase/Firestore is not available, unblock the UI immediately ──
    // Without this, loading & progressLoaded stay in their initial stuck state
    // and the blue splash screen never clears (both after login and on refresh
    // when the Firestore SDK is unavailable).
    if (!db) {
      const fallbackCourseId = LANGUAGE_TO_PRIMARY_COURSE[language] ?? DEFAULT_COURSE_ID;
      console.warn('[SPLASH_DEBUG] db not initialized — unblocking UI with local defaults for', user.uid,
        { fallbackCourseId, language });
      // Sync courseId with language so there's no mismatch when Firestore is unavailable
      if (!currentCourseId) setCurrentCourseId(fallbackCourseId);
      setProgressLoaded(true);
      setLoading(false);
      return;
    }

    console.log('[BOOT_DEBUG] Starting Firestore progress listener', {
      uid: user.uid,
      email: user.email,
      userRole,
      userViewMode,
      savedLanguage: getScopedStorageItem(USER_LANGUAGE_STORAGE_KEY),
      savedCourseId: null, // read from Firestore snapshot
    });

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
          console.log('[setProgress from snapshot] applying Firestore state', {
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
            ...(((data.currentLesson ?? data.lesson) !== undefined) && { currentLesson: data.currentLesson ?? data.lesson }),
            ...(data.currentDay !== undefined && { currentDay: data.currentDay }),
            ...(resolvedActivities !== undefined && { completedActivities: resolvedActivities }),
            ...(firestoreDays !== undefined && { days: firestoreDays }),
            ...(data.lastCompletedDate !== undefined && { lastCompletedDate: data.lastCompletedDate }),
            ...(data.placementScore !== undefined && { placementScore: data.placementScore }),
          }));

          const keepTabNavigation = hasTabNavigationContext(tabContextRef.current);
          console.log('[STATE CONTROL] Progress updated from Firestore snapshot', { keepTabNavigation });
          if (!keepTabNavigation) {
            setCurrentWorkbookId(data.currentWorkbook ?? data.workbook ?? 1);
          }

          if (data.courseId) {
            const msSinceUserAction = Date.now() - lastUserActionRef.current;
            if (msSinceUserAction < 3000) {
              console.warn('[STATE ERROR] Firestore restore suppressed because user action is too recent', {
                msSinceUserAction,
                snapshotCourseId: data.courseId,
                currentCourseId,
              });
            } else if (keepTabNavigation) {
              console.log('[TAB_CONTEXT] Firestore navigation restore skipped for this tab', {
                snapshotCourseId: data.courseId,
                tabContext: tabContextRef.current,
              });
            } else {
              const restoredCourseId = normalizeCourseId(data.courseId, language);
              setCurrentCourseId(restoredCourseId);
              const restoredLanguage = COURSE_TO_LANGUAGE[restoredCourseId];
              console.log('[RESTORE_DEBUG] Firestore courseId/language restore', {
                uid: user?.uid,
                courseId: restoredCourseId,
                restoredLanguage,
                currentLanguage: language,
                willChangeLanguage: false,
              });
              const validated = validateAndFixState({
                language,
                courseId: restoredCourseId,
                workbookId: data.currentWorkbook ?? data.workbook ?? 1,
                section: currentSectionRef.current,
                context: 'Firestore restore',
              });
              if (validated.fixed) {
                if (validated.courseId !== restoredCourseId) setCurrentCourseId(validated.courseId);
                if (validated.language !== language) setLanguage(validated.language);
                if (validated.workbookId !== (data.currentWorkbook ?? data.workbook ?? 1)) {
                  setCurrentWorkbookId(validated.workbookId);
                }
              }
              if (db && user?.uid) {
                setDoc(
                  doc(db, 'progress', user.uid),
                  { courseId: restoredCourseId },
                  { merge: true },
                ).catch(() => {});
              }
            }
          } else {
            const validated = validateAndFixState({
              language,
              courseId: currentCourseId,
              workbookId: data.currentWorkbook ?? data.workbook ?? 1,
              section: currentSectionRef.current,
              context: 'Firestore restore (no courseId in doc)',
            });
            if (validated.fixed && !keepTabNavigation) {
              if (validated.courseId !== currentCourseId) setCurrentCourseId(validated.courseId);
              if (validated.language !== language) setLanguage(validated.language);
              if (validated.workbookId !== (data.currentWorkbook ?? data.workbook ?? 1)) {
                setCurrentWorkbookId(validated.workbookId);
              }
            }
          }
          console.log('[LOGIN_FLOW_DEBUG] progress restore ready', { uid: user?.uid });
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
          console.log('[LOGIN_FLOW_DEBUG] progress restore ready (no Firestore doc)', { uid: user?.uid });
          setProgressLoaded(true); // render the empty state
          setLoading(false);
          // DO NOT write defaults to Firestore — only write when user makes progress
        }
      },
      (err) => {
        // ── FIX: setProgressLoaded(true) was missing here ──
        // Also sync courseId with language so there's no mismatch when Firestore errors.
        const storedLang = getScopedStorageItem(USER_LANGUAGE_STORAGE_KEY) as LessonLanguageCode | null;
        const resolvedLang: LessonLanguageCode =
          storedLang && (['en', 'pt', 'es', 'el', 'he'] as string[]).includes(storedLang)
            ? storedLang
            : DEFAULT_LANGUAGE;
        const fallbackCourseId = LANGUAGE_TO_PRIMARY_COURSE[resolvedLang] ?? DEFAULT_COURSE_ID;
        console.warn('[SPLASH_DEBUG] Firestore onSnapshot error — unblocking UI:', err.code, err.message,
          { resolvedLang, fallbackCourseId });
        if (!currentCourseId) setCurrentCourseId(fallbackCourseId);
        setProgressLoaded(true);
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
      // ── FIX: derive courseId from the user's saved language, not from DEFAULT_COURSE_ID ──
      // Using DEFAULT_COURSE_ID='english' here caused Spanish/Portuguese students to have
      // language='es'/'pt' (from localStorage) but courseId='english' during the window
      // between auth and Firestore loading. If Firestore then errored out, they stayed stuck
      // with English workbook and mismatched Spanish UI.
      const courseFromLanguage = LANGUAGE_TO_PRIMARY_COURSE[language] ?? DEFAULT_COURSE_ID;
      console.log('[BOOT_DEBUG] ensure-defaults: deriving courseId from language', {
        language,
        courseFromLanguage,
        reason: 'currentCourseId is falsy before Firestore loads',
      });
      setCurrentCourseId(courseFromLanguage);
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

    // ── FIX: Do not forcibly navigate away from LIVE_CLASSES when a language/course
    // change triggers this workbook reload.  Using a ref avoids adding currentSection
    // as a reactive dependency (which would cause the effect to re-run on every nav).
    const navigateToWorkbook = () => {
      if (
        currentSectionRef.current !== SectionType.LIVE_CLASSES &&
        currentSectionRef.current !== SectionType.BATTLE
      ) {
        setCurrentSection(SectionType.WORKBOOK);
      }
    };

    const loadWorkbook = async () => {
      const courseId = currentCourseId ?? DEFAULT_COURSE_ID;
      const registry = COURSE_WORKBOOKS[courseId] ?? COURSE_WORKBOOKS[DEFAULT_COURSE_ID];
      if (!cancelled) {
        setCurrentWorkbook(null);
        setContentLoadError(null);
        setIsWorkbookLoading(true);
      }

      // Guard: validate the combo before even attempting the import
      const validated = validateAndFixState({
        language,
        courseId,
        workbookId: currentWorkbookId,
        section: currentSectionRef.current,
        context: 'loadWorkbook',
      });
      if (validated.fixed && validated.workbookId !== currentWorkbookId) {
        // The workbookId was invalid for this course — apply the fix and let the
        // effect re-run with the corrected value instead of loading with a bad id.
        if (!cancelled) {
          setIsWorkbookLoading(true); // show spinner during the reset window
          setCurrentWorkbookId(validated.workbookId);
        }
        return;
      }

      const loader = registry[currentWorkbookId as keyof typeof registry];
      if (!loader) {
        if (!cancelled) {
          // ── FIX: reset workbookId to default so the effect re-runs with a valid combo ──
          // Without this, currentWorkbook stays null and renderSection shows an invisible
          // "Workbook unavailable" text on the dark background (looks like a blank page).
          const defaultId = getDefaultWorkbookIdForCourse(courseId);
          console.warn('[COURSE_DEBUG] No workbook loader found — resetting workbookId to default', { courseId, currentWorkbookId, defaultId });
          setContentLoadError(`Workbook ${currentWorkbookId} is not available for ${courseId}.`);
          // Keep the spinner visible during the reset+re-run window.
          setIsWorkbookLoading(true);
          setCurrentWorkbookId(defaultId);
          navigateToWorkbook();
        }
        return;
      }

      try {
        const module = await loader();
        if (cancelled) return;  // stale — discard result
        const resolvedWorkbook =
          (module as any)[`workbook${currentWorkbookId}`] ||
          (module as any).default ||
          Object.values(module)[0] ||
          null;

        if (!resolvedWorkbook) {
          console.warn('[COURSE_DEBUG] Workbook module resolved but no workbook export found', { courseId, currentWorkbookId });
          setContentLoadError(`Workbook ${currentWorkbookId} could not be opened for ${courseId}.`);
          navigateToWorkbook();
          return;
        }

        if (currentWorkbookId !== 1 && Array.isArray((resolvedWorkbook as any).lessons) && (resolvedWorkbook as any).lessons.length === 0) {
          setCurrentWorkbookId(getDefaultWorkbookIdForCourse(courseId));
          navigateToWorkbook();
          return;
        }

        console.log('[COURSE_DEBUG] Workbook loaded', { courseId, currentWorkbookId, lessonCount: (resolvedWorkbook as any).lessons?.length ?? 0 });
        setCurrentWorkbook(resolvedWorkbook);
        setContentLoadError(null);
        navigateToWorkbook();
      } catch (err) {
        if (!cancelled) {
          console.error('[COURSE_DEBUG] Workbook load error', { courseId, currentWorkbookId, err });
          setContentLoadError(`Workbook ${currentWorkbookId} failed to load for ${courseId}.`);
          navigateToWorkbook();
        }
      } finally {
        if (!cancelled) setIsWorkbookLoading(false);
      }
    };

    loadWorkbook();
    return () => { cancelled = true; };
  }, [currentWorkbookId, currentCourseId, progressLoaded]);

  useEffect(() => {
    if (!pendingLiveLessonRef || !currentWorkbook || currentWorkbookId !== pendingLiveLessonRef.workbookId) return;
    const targetLessonId = findLessonIdInWorkbook(currentWorkbook, pendingLiveLessonRef.lessonRef);
    console.log('[ONLINE_DEBUG] pending live lesson lookup', {
      selectedLanguage: language,
      selectedCourse: currentCourseId ?? DEFAULT_COURSE_ID,
      workbookId: currentWorkbookId,
      lessonId: pendingLiveLessonRef.lessonRef,
      lessonFound: Boolean(targetLessonId),
    });
    setPendingLiveLessonRef(null);
    if (targetLessonId) {
      setContentLoadError(null);
      openLesson(targetLessonId, { force: Boolean(activeOnlineClass) });
      return;
    }
    setContentLoadError(`The assigned lesson "${pendingLiveLessonRef.lessonRef ?? ''}" was not found in workbook ${currentWorkbookId}.`);
  }, [activeOnlineClass, currentWorkbook, currentWorkbookId, currentCourseId, language, pendingLiveLessonRef]);

  useEffect(() => {
    if (!activeOnlineClass?.id) {
      setActiveOnlineSession(null);
      return;
    }

    const unsubscribe = subscribeLiveSession(
      activeOnlineClass.id,
      (nextSession) => setActiveOnlineSession(nextSession),
      (error) => console.warn('[App] live session subscription failed:', error),
    );

    return unsubscribe;
  }, [activeOnlineClass?.id]);

  const clearLiveRoomContext = useCallback(() => {
    setActiveOnlineClass(null);
    setActiveOnlineSession(null);
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/live-class/')) {
      window.history.pushState({}, '', '/');
    }
  }, []);

  const goToWorkbookList = useCallback(() => {
    clearLiveRoomContext();
    setCurrentSection(SectionType.WORKBOOK_LIST);
  }, [clearLiveRoomContext]);

  const handleNavigate = (section: SectionType, params?: any) => {
    setCourseMenuOpen(false);
    setActiveWeeklyTest(null);

    if (section === SectionType.DASHBOARD) {
      setActiveOnlineClass(null);
      setActiveOnlineSession(null);
      setCurrentDay(null);
      setCurrentLessonId(null);
      const workbookId = Number(progress.currentWorkbook || 1);
      console.log('SET WORKBOOK ID', workbookId, '← handleNavigate DASHBOARD'); console.trace('TRACE WORKBOOK ID');
      setCurrentWorkbookId(workbookId);
      setCurrentSection(SectionType.WORKBOOK);
      return;
    }

    if (section === SectionType.COURSES) {
      setActiveOnlineClass(null);
      setActiveOnlineSession(null);
      setCurrentSection(SectionType.COURSES);
      return;
    }

    if (section === SectionType.LIVE_CLASSES) {
      setCurrentDay(null);
      setCurrentLessonId(null);
      setPendingLiveLessonRef(null);
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/live-class/')) {
        window.history.pushState({}, '', '/');
      }
      setCurrentSection(SectionType.LIVE_CLASSES);
      return;
    }

    if (section === SectionType.BATTLE) {
      setActiveWeeklyTest(null);
      setCurrentDay(null);
      setCurrentSection(SectionType.BATTLE);
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

  const handleSelectWorkbook = (workbookId: number, nextSection: SectionType = SectionType.WORKBOOK) => {
    const effectiveCourseId = currentCourseId ?? DEFAULT_COURSE_ID;
    console.log('[WORKBOOK_CLICK_DEBUG] handleSelectWorkbook called', {
      workbookId,
      language,
      currentCourseId,
      effectiveCourseId,
      previousWorkbookId: currentWorkbookId,
    });
    const updated = { ...progress, currentWorkbook: workbookId };
    setProgress(updated);
    setCurrentWorkbook(null);
    setCurrentLessonId(null);
    setCurrentDay(null);
    setContentLoadError(null);
    setIsWorkbookLoading(true);
    setCurrentWorkbookId(workbookId);
    // Stamp user-action time so the race-condition guard suppresses any
    // concurrent Firestore snapshot from reverting courseId/language.
    lastUserActionRef.current = Date.now();
    try { ProgressEngine.saveProgress(updated); } catch { /* non-blocking */ }
    if (user?.uid && db) {
      const now = new Date().toISOString();
      lastLocalUpdateRef.current = now;
      // ── ROOT CAUSE FIX: always include courseId in this write ──
      // Without courseId here, the Firestore snapshot triggered by this write
      // comes back with the OLD courseId (e.g. 'spanish' from the previous session),
      // which overwrites currentCourseId and loads the wrong workbook.
      setDoc(
        doc(db, 'users', user.uid, 'courseProgress', 'main'),
        { currentWorkbook: workbookId, courseId: effectiveCourseId, lastUpdated: now },
        { merge: true },
      ).catch(e => console.warn('[WORKBOOK] persist workbook selection failed:', e));
    }
    handleNavigate(nextSection, { workbookId });
  };

  const canOpenLessonToday = (lessonNumber: number) => {
    if (isAdmin) return true;
    if (lessonNumber <= 1) return true;
    if (lessonNumber <= completedLessonCount) return true;
    if (lessonNumber > completedLessonCount + 1) return false;
    return true;
  };

  const pushLiveSessionState = useCallback(async (patch: Partial<LiveClassSession>) => {
    if (!activeOnlineClass?.id || !user?.uid || !canManageLiveClasses) return;
    try {
      await updateLiveSession(activeOnlineClass.id, patch, user.uid);
    } catch (error) {
      console.warn('[App] live session state update failed:', error);
    }
  }, [activeOnlineClass?.id, canManageLiveClasses, user?.uid]);

  const pushSharedGrammarSessionState = useCallback(async (patch: Partial<LiveClassSession>) => {
    if (!activeOnlineClass?.id || !user?.uid) return;
    try {
      await updateLiveSession(activeOnlineClass.id, patch, user.uid);
    } catch (error) {
      console.warn('[App] shared grammar sync failed:', error);
    }
  }, [activeOnlineClass?.id, user?.uid]);

  const openLesson = (
    lessonId: string,
    options?: {
      force?: boolean;
      syncToSession?: boolean;
    },
  ) => {
    const lessonNumber = getLessonNumberFromId(lessonId);
    if (!Number.isFinite(lessonNumber)) return;

    const forceOpen = options?.force === true;
    const syncToSession = options?.syncToSession !== false;

    if (!forceOpen && !canOpenLessonToday(lessonNumber)) {
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
      const activeWorkbookNumber = currentWorkbookId || progress.currentWorkbook || 1;
      console.log('[WORKBOOK_CLICK_DEBUG] openLesson called', {
        lessonId,
        language,
        courseId,
        workbookId: activeWorkbookNumber,
        resolvedLessonNumber: getLessonNumberFromId(lessonId),
      });
      console.log('[OPEN LESSON] ensureLessonStarted path:', `users/${user.uid}/courseProgress/${courseId}_${activeWorkbookNumber}`, {
        lessonNumber,
        language,
        courseId,
        workbook: activeWorkbookNumber,
      });
      ensureLessonStarted(user.uid, courseId, activeWorkbookNumber, lessonNumber)
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

    // Declare here (shared by live-session sync below AND grammar key).
    // Must come before any use to avoid the Temporal Dead Zone error.
    const courseId = currentCourseId ?? DEFAULT_COURSE_ID;
    const activeWorkbookNumber = currentWorkbookId || progress.currentWorkbook || 1;

    if (syncToSession && activeOnlineClass?.id && canManageLiveClasses) {
      void pushLiveSessionState({
        sessionStatus: 'active',
        activeWorkbookId: activeWorkbookNumber,
        activeLessonId: lessonId,
        activeExerciseId: null,
      });
    }

  };

  const startWeeklyTest = (lessonId: string, lessonNumber: number, day: Day) => {
    setCurrentLessonId(lessonId);
    setCurrentDay(day);
    setLessonTestCompleted((prev) => ({ ...prev, [lessonNumber]: false }));
    setActiveWeeklyTest({ lessonNumber, lessonId });
    setCurrentSection(SectionType.PRACTICE);
  };

  const openGrammarForLesson = useCallback((lessonNumber: number) => {
    setActiveGrammarLessonNumber(lessonNumber);
    setShowGrammarModal(true);
    if (grammarModalScrollRef.current) {
      grammarModalScrollRef.current.scrollTop = 0;
    }
    void pushSharedGrammarSessionState({
      sharedGrammarOpen: true,
      sharedGrammarLessonNumber: lessonNumber,
      sharedGrammarScrollRatio: 0,
    });
  }, [pushSharedGrammarSessionState]);

  const openGrammarOverview = useCallback(() => {
    setActiveGrammarLessonNumber(null);
    setShowGrammarModal(true);
    if (grammarModalScrollRef.current) {
      grammarModalScrollRef.current.scrollTop = 0;
    }
    void pushSharedGrammarSessionState({
      sharedGrammarOpen: true,
      sharedGrammarLessonNumber: null,
      sharedGrammarScrollRatio: 0,
    });
  }, [pushSharedGrammarSessionState]);

  const closeGrammarModal = useCallback(() => {
    setShowGrammarModal(false);
    void pushSharedGrammarSessionState({
      sharedGrammarOpen: false,
      sharedGrammarLessonNumber: activeGrammarLessonNumber ?? null,
      sharedGrammarScrollRatio: null,
    });
  }, [activeGrammarLessonNumber, pushSharedGrammarSessionState]);

  const handleGrammarModalScroll = useCallback(() => {
    const element = grammarModalScrollRef.current;
    if (!element || applyingRemoteGrammarScrollRef.current) return;
    if (!activeOnlineClass?.id || !user?.uid || !showGrammarModal) return;

    const maxScroll = element.scrollHeight - element.clientHeight;
    const scrollRatio = maxScroll > 0 ? element.scrollTop / maxScroll : 0;

    if (grammarScrollSyncDebounceRef.current) {
      clearTimeout(grammarScrollSyncDebounceRef.current);
    }

    grammarScrollSyncDebounceRef.current = setTimeout(() => {
      void pushSharedGrammarSessionState({
        sharedGrammarOpen: true,
        sharedGrammarLessonNumber: activeGrammarLessonNumber ?? null,
        sharedGrammarScrollRatio: Number.isFinite(scrollRatio) ? Math.max(0, Math.min(1, scrollRatio)) : 0,
      });
    }, 120);
  }, [
    activeGrammarLessonNumber,
    activeOnlineClass?.id,
    pushSharedGrammarSessionState,
    showGrammarModal,
    user?.uid,
  ]);

  const openLiveClassContent = useCallback((liveClass: LiveClass) => {
    console.log('[ONLINE_DEBUG] openLiveClassContent called', {
      classId: liveClass.id,
      classCourseId: liveClass.courseId,
      classWorkbookId: liveClass.workbookId,
      classLessonId: liveClass.lessonId,
      currentCourseId,
      currentLanguage: language,
    });
    setActiveOnlineClass(liveClass);
    const targetCourseId = getPrimaryCourseForLanguage(
      language,
      liveClass.courseId?.trim() || currentCourseId || DEFAULT_COURSE_ID,
    );
    const targetLanguage = language;
    // ── FIX: do NOT fall back to currentWorkbookId for the target course ──
    // If admin was on workbook 2 of English and opens a Greek class (workbook 1 only),
    // targetWorkbookId would be 2, which has no loader → blank page.
    // Use the class's explicit workbookId, or the default workbook for the target course.
    const targetWorkbookId = liveClass.workbookId ?? getDefaultWorkbookIdForCourse(targetCourseId);
    const targetLessonRef = liveClass.lessonId ?? null;
    console.log('[ONLINE_DEBUG] openLiveClassContent resolved targets', { targetCourseId, targetLanguage, targetWorkbookId, targetLessonRef });

    // Validate the computed targets before applying them
    const validated = validateAndFixState({
      language: targetLanguage,
      courseId: targetCourseId,
      workbookId: targetWorkbookId,
      section: SectionType.WORKBOOK,
      context: 'openLiveClassContent',
    });

    // Stamp as user action so Firestore doesn't override this choice for 3s
    lastUserActionRef.current = Date.now();
    setContentLoadError(null);

    const currentResolvedCourseId = currentCourseId ?? DEFAULT_COURSE_ID;
    const courseChanged = validated.courseId !== currentResolvedCourseId;
    const workbookChanged = validated.workbookId !== currentWorkbookId;

    console.log('[ONLINE_DEBUG] openLiveClassContent navigation state', {
      selectedLanguage: targetLanguage,
      selectedCourse: validated.courseId,
      workbookId: validated.workbookId,
      lessonId: targetLessonRef,
      courseChanged,
      workbookChanged,
      hasCurrentWorkbook: Boolean(currentWorkbook),
    });

    if (courseChanged) {
      setCurrentCourseId(validated.courseId);
    }
    setCurrentDay(null);

    if (courseChanged || workbookChanged) {
      setCurrentWorkbookId(validated.workbookId);
      setCurrentWorkbook(null);
      if (targetLessonRef) {
        setPendingLiveLessonRef({ workbookId: validated.workbookId, lessonRef: targetLessonRef });
      } else {
        setPendingLiveLessonRef(null);
      }
      setCurrentSection(SectionType.WORKBOOK);
    } else if (targetLessonRef) {
      const resolvedLessonId = findLessonIdInWorkbook(currentWorkbook, targetLessonRef);
      console.log('[ONLINE_DEBUG] immediate live lesson lookup', {
        selectedLanguage: targetLanguage,
        selectedCourse: validated.courseId,
        workbookId: validated.workbookId,
        lessonId: targetLessonRef,
        lessonFound: Boolean(resolvedLessonId),
      });
      if (resolvedLessonId) {
        openLesson(resolvedLessonId, { force: true, syncToSession: false });
      } else {
        setPendingLiveLessonRef({ workbookId: validated.workbookId, lessonRef: targetLessonRef });
        setContentLoadError(`The assigned lesson "${targetLessonRef}" was not found in workbook ${validated.workbookId}.`);
        setCurrentSection(SectionType.WORKBOOK);
      }
    } else {
      setPendingLiveLessonRef(null);
      setCurrentSection(SectionType.WORKBOOK);
    }

    if (targetLessonRef && user?.uid && canManageLiveClasses) {
      void updateLiveSession(liveClass.id, {
        sessionStatus: 'active',
        activeWorkbookId: targetWorkbookId,
        activeLessonId: targetLessonRef,
        activeExerciseId: null,
      }, user.uid).catch((error) => {
        console.warn('[App] failed to start synced live lesson:', error);
      });
    } else if (!targetLessonRef) {
      setPendingLiveLessonRef(null);
    }
  }, [canManageLiveClasses, currentCourseId, currentWorkbook, currentWorkbookId, language, openLesson, user?.uid]);

  useEffect(() => {
    if (!activeOnlineClass || !activeOnlineSession) return;

    // ── FIX: Admin is the session CONTROLLER, not a follower ──
    // Without this guard the session-sync effect ran for admin too, overriding their
    // selected language/course to match the class's courseId and forcing section
    // changes — causing the flag to appear broken and blank pages when the session
    // had a different course (e.g. Spanish) than the admin's current state (English).
    if (canManageLiveClasses) {
      console.log('[ONLINE_DEBUG] Admin — skipping session-sync follow (admin controls session, not follows it)');
      return;
    }

    if (currentSection === SectionType.LIVE_CLASSES) return;
    const targetCourseId = getPrimaryCourseForLanguage(
      language,
      activeOnlineClass.courseId?.trim() || currentCourseId || DEFAULT_COURSE_ID,
    );
    console.log('[ONLINE_DEBUG] Student session sync', { targetCourseId, currentCourseId, language });
    const targetWorkbookId = activeOnlineSession.activeWorkbookId ?? null;
    const targetLessonRef = activeOnlineSession.activeLessonId ?? null;
    const targetExerciseRef = activeOnlineSession.activeExerciseId ?? null;

    if (!targetWorkbookId || !targetLessonRef) return;

    if (targetCourseId !== currentCourseId) {
      setCurrentCourseId(targetCourseId);
    }
    if (currentWorkbookId !== targetWorkbookId) {
      setCurrentWorkbookId(targetWorkbookId);
      setCurrentWorkbook(null);
      setCurrentDay(null);
      setPendingLiveLessonRef({ workbookId: targetWorkbookId, lessonRef: targetLessonRef });
      setCurrentSection(SectionType.WORKBOOK);
      return;
    }

    if (!currentWorkbook) return;

    const resolvedLessonId = findLessonIdInWorkbook(currentWorkbook, targetLessonRef);
    if (!resolvedLessonId) return;

    if (currentLessonId !== resolvedLessonId || currentSection === SectionType.WORKBOOK) {
      openLesson(resolvedLessonId, { force: true, syncToSession: false });
      return;
    }

    const resolvedLesson =
      currentWorkbook?.lessons?.find((lesson: Lesson) => lesson.id === resolvedLessonId) ??
      currentWorkbook?.lessons?.[getLessonNumberFromId(resolvedLessonId) - 1] ??
      null;

    if (!targetExerciseRef) {
      if (currentDay) {
        setCurrentDay(null);
        setActiveWeeklyTest(null);
      }
      if (currentSection !== SectionType.LESSON) {
        setCurrentSection(SectionType.LESSON);
      }
      return;
    }

    const targetDay = findDayInLesson(resolvedLesson, targetExerciseRef);
    if (!targetDay) return;

    if (currentDay?.id !== targetDay.id || currentSection !== SectionType.PRACTICE) {
      dayStartTimeRef.current = Date.now();
      setCurrentDay(targetDay);
      setActiveWeeklyTest(null);
      setCurrentSection(SectionType.PRACTICE);
    }
  }, [
    activeOnlineClass,
    activeOnlineSession,
    currentCourseId,
    currentDay,
    canManageLiveClasses,
    currentLessonId,
    currentSection,
    currentWorkbook,
    currentWorkbookId,
    language,
    openLesson,
    setLanguage,
  ]);

  useEffect(() => {
    if (!activeOnlineClass || !activeOnlineSession) return;
    const remoteOpen = Boolean(activeOnlineSession.sharedGrammarOpen);
    const remoteLessonNumber =
      typeof activeOnlineSession.sharedGrammarLessonNumber === 'number'
        ? activeOnlineSession.sharedGrammarLessonNumber
        : null;

    setShowGrammarModal((current) => (current === remoteOpen ? current : remoteOpen));
    setActiveGrammarLessonNumber((current) => (current === remoteLessonNumber ? current : remoteLessonNumber));
  }, [
    activeOnlineClass,
    activeOnlineSession,
    activeOnlineSession?.sharedGrammarLessonNumber,
    activeOnlineSession?.sharedGrammarOpen,
  ]);

  useEffect(() => {
    if (!showGrammarModal || !activeOnlineClass || !activeOnlineSession) return;
    if (typeof activeOnlineSession.sharedGrammarScrollRatio !== 'number') return;

    const element = grammarModalScrollRef.current;
    if (!element) return;

    const maxScroll = element.scrollHeight - element.clientHeight;
    applyingRemoteGrammarScrollRef.current = true;
    element.scrollTop = maxScroll > 0 ? activeOnlineSession.sharedGrammarScrollRatio * maxScroll : 0;
    window.requestAnimationFrame(() => {
      applyingRemoteGrammarScrollRef.current = false;
    });
  }, [
    activeOnlineClass,
    activeOnlineSession,
    activeOnlineSession?.sharedGrammarLessonNumber,
    activeOnlineSession?.sharedGrammarScrollRatio,
    showGrammarModal,
  ]);

  useEffect(() => () => {
    if (grammarScrollSyncDebounceRef.current) {
      clearTimeout(grammarScrollSyncDebounceRef.current);
    }
  }, []);

  const handlePlacementComplete = (result: PlacementTestCompletionPayload) => {
    const workbook = result.recommendedBook ?? 9;
    const updated = { ...progress, currentWorkbook: workbook, placementScore: result.percentage };
    setProgress(updated);
    setCurrentWorkbookId(workbook);
    try { ProgressEngine.saveProgress(updated); } catch { /* non-blocking */ }

    // Mark placement as done in localStorage so the gate banner disappears immediately.
    if (user?.uid) {
      localStorage.setItem(`learnendo_placement_${user.uid}`, '1');
      localStorage.setItem(`learnendo_placement_${user.uid}_${language}`, '1');
    }

    if (user?.uid && db) {
      // The PlacementTest component already persists the rich placement record
      // to progress/history. The App layer only syncs workbook selection.
      const now = new Date().toISOString();
      lastLocalUpdateRef.current = now;
      setDoc(
        doc(db, 'users', user.uid, 'courseProgress', 'main'),
        { placementScore: result.percentage, currentWorkbook: workbook, lastUpdated: now },
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

  const handleViewModeChange = (nextMode: UserViewMode) => {
    if (!user?.uid) return;
    const normalized = normalizeUserViewMode(userRole, nextMode);
    setUserViewMode(normalized);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(buildTabViewModeStorageKey(user.uid), normalized);
      localStorage.setItem(getUserViewModeStorageKey(user.uid), normalized);
    }
  };

  const rememberPendingViewMode = (nextMode: 'student' | 'teacher') => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(PENDING_VIEW_MODE_STORAGE_KEY, nextMode);
    }
  };

  const handleLogin = async (email: string, password: string, nextMode: 'student' | 'teacher') => {
    rememberPendingViewMode(nextMode);
    const user = await loginWithEmail(email, password);
    await createStudentProfile(user.uid, user.email || email, user.displayName || undefined);
    setMenuOpen(false);
  };

  const handleRegister = async (email: string, password: string, nextMode: 'student' | 'teacher') => {
    rememberPendingViewMode(nextMode);
    const fullName = email.split('@')[0];
    if (auth.currentUser?.isAnonymous) {
      const convertedUser = await convertAnonymousToUser(email, password);
      await createOrUpdateUserProfile(convertedUser, email);
      await createStudentProfile(convertedUser.uid, convertedUser.email || email, convertedUser.displayName || fullName);
      setConversionSuccess(true);
      setTimeout(() => setConversionSuccess(false), 3000);
    } else {
      const user = await registerWithEmail(email, password, fullName);
      await createStudentProfile(user.uid, user.email || email, user.displayName || fullName);
    }
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    closeActiveSession();
    await signOut(auth);
    setMenuOpen(false);
  };

  const handleDayComplete = async (
    dayId: string,
    score: number,
    exerciseAnalytics?: {
      attempts: number;
      errors: number;
      accuracy: number;
      points: number;
      initialAccuracy?: number;
      reviewedExercises?: number;
      reviewAttempts?: number;
      finalMastery?: number;
      isLessonFinalReview?: boolean;
    },
  ) => {
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
        const completedUnitNumber = getUnitNumberFromLessonNumber(lessonNumber);
        const completedUnit = isUnitCompletionLesson(lessonNumber);
        const nextPath = computeNextPath({
          workbook: progress.currentWorkbook,
          lesson: lessonNumber,
          day: 7,
        });
        const advancedWorkbook = nextPath.workbook > progress.currentWorkbook;
        const updated: UserProgress = {
          ...progress,
          currentWorkbook: nextPath.workbook,
          currentLesson: nextPath.lesson,
          currentDay: nextPath.day,
          completedActivities: alreadyDone
            ? progress.completedActivities
            : [...progress.completedActivities, testMarker],
          lastCompletedDate: new Date().toISOString(),
        };

        try { ProgressEngine.saveProgress(updated); } catch { /* non-blocking */ }

        setProgress(updated);
        setCurrentWorkbookId(nextPath.workbook);
        setCurrentLessonId(null);
        setCurrentSection(advancedWorkbook ? SectionType.WORKBOOK_LIST : SectionType.WORKBOOK);
        setResultAnimationMeta(
          completedUnit
            ? {
                emoji: lessonNumber === 24 ? '👑' : '🏆',
                title: `Unit ${completedUnitNumber} Complete!`,
                subtitle: lessonNumber === 24
                  ? 'You finished Unit 4 and completed the Workbook 2 journey.'
                  : advancedWorkbook
                  ? `You closed Unit ${completedUnitNumber}. Choose the next workbook to keep going.`
                  : `You closed Unit ${completedUnitNumber}. The next unit is ready for you.`,
                buttonLabel: advancedWorkbook ? 'Choose Workbook' : 'Continue',
                lessonNumber,
              }
            : {
                lessonNumber,
              },
        );

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
                  workbook: nextPath.workbook,
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
      if (activeOnlineClass?.id && canManageLiveClasses) {
        void pushLiveSessionState({
          sessionStatus: 'active',
          activeWorkbookId: currentWorkbookId || progress.currentWorkbook || 1,
          activeLessonId: lessonId,
          activeExerciseId: null,
        });
      }
      return;
    }

    const alreadyDone = progress.completedActivities.includes(dayId);

    // Extract day/lesson numbers early so we can update the path in progress
    const dayMatch = dayId.match(/d(\d+)/);
    const dayNumber = dayMatch ? parseInt(dayMatch[1], 10) : NaN;
    const lessonNumber = getLessonNumberFromId(currentLessonId);
    const lessonCompletionMarker = exerciseAnalytics?.isLessonFinalReview && Number.isFinite(lessonNumber)
      ? `${fullLessonTestPrefix}${lessonNumber}`
      : null;
    const completedActivities = appendUniqueCompletionActivities(
      progress.completedActivities,
      dayId,
      lessonCompletionMarker,
    );

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
      completedActivities,
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
    if (activeOnlineClass?.id && canManageLiveClasses) {
      void pushLiveSessionState({
        sessionStatus: 'active',
        activeWorkbookId: currentWorkbookId || progress.currentWorkbook || 1,
        activeLessonId: currentLessonId || null,
        activeExerciseId: null,
      });
    }

    // Immediately surface the completion in local state so LessonView unlocks
    // the next exercise before the Firestore onSnapshot arrives.
    setProgress(prev => ({
      ...prev,
      completedActivities: appendUniqueCompletionActivities(prev.completedActivities, dayId, lessonCompletionMarker),
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
      if (user?.uid && !alreadyDone) {
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
            attempts: exerciseAnalytics?.attempts,
            errors: exerciseAnalytics?.errors,
            accuracy: exerciseAnalytics?.accuracy ?? score,
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
            onLanguageChange={handleLanguageSelect}
            onLogoClick={goToWorkbookList}
            onSelectCourse={(id) => {
              handleCourseChange(id);
              setCurrentLessonId(null);
              setCurrentDay(null);
              goToWorkbookList();
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
            currentCourseId={activeCourseId}
            currentLanguage={uiLanguage}
            currentUser={user ? { displayName: user.displayName, email: user.email } : undefined}
            onNavigate={handleNavigate}
          />
        );
      }
      case SectionType.LIVE_CLASSES:
        console.log('[ONLINE_DEBUG] Rendering LiveClassesPage', { currentCourseId, language, isAdmin });
        return (
          <LiveClassesPage
            user={user}
            accountRole={userRole}
            userRole={liveClassViewerRole}
            viewMode={userViewMode}
            canManageClasses={canManageLiveClasses}
            currentCourseId={currentCourseId ?? DEFAULT_COURSE_ID}
            onOpenClassContent={openLiveClassContent}
            onRoomContextChange={setActiveOnlineClass}
            onOpenBattleHub={() => handleNavigate(SectionType.BATTLE)}
            onBack={() => handleNavigate(SectionType.COURSES)}
          />
        );
      case SectionType.BATTLE:
        return (
          <BattleHubPage
            uid={user?.uid ?? 'guest'}
            name={user?.displayName || user?.email || 'Player'}
            courseId={currentCourseId ?? DEFAULT_COURSE_ID}
            workbookId={currentWorkbookId || progress.currentWorkbook || 1}
            lessonId={currentLessonId || null}
            uiLanguage={uiLanguage}
            fire={currentLessonId ? Math.min(1, lessonScore.completed) : (score?.streak ?? 0)}
            ice={currentLessonId ? lessonScore.missed : (score?.freeze ?? 0)}
            diamonds={currentLessonId ? lessonScore.total : (score?.diamonds ?? 0)}
            stars={currentLessonId ? lessonScore.total + Math.min(1, lessonScore.completed) : (score?.stars ?? 0)}
            onOpenLiveClasses={() => handleNavigate(SectionType.LIVE_CLASSES)}
          />
        );
      case SectionType.WORKBOOK_LIST: {
        const _courseId = currentCourseId ?? DEFAULT_COURSE_ID;
        const _registry = COURSE_WORKBOOKS[_courseId] ?? COURSE_WORKBOOKS[DEFAULT_COURSE_ID];
        const workbookIds = Object.keys(_registry).map(Number).sort((a, b) => a - b);
        const currentWbkId = progress.currentWorkbook || currentWorkbookId || 1;
        const maxWorkbookId = workbookIds[workbookIds.length - 1] ?? currentWbkId;
        const nextUnlockedWorkbookId = Math.min(currentWbkId + 1, maxWorkbookId);
        const getWorkbookState = (id: number): 'completed' | 'current' | 'available' | 'locked' => {
          if (isAdmin) {
            if (id < currentWbkId) return 'completed';
            if (id === currentWbkId) return 'current';
            return 'available';
          }
          if (id < currentWbkId) return 'completed';
          if (id === currentWbkId) return 'current';
          if (id === nextUnlockedWorkbookId && currentWbkId < maxWorkbookId) return 'available';
          return 'locked';
        };
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
            {shouldPromptPlacementTest && !hasPlacementResult && (
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {workbookIds.map(id => {
                const state = getWorkbookState(id);
                const canOpenTracks = state !== 'locked';
                const stateCopy =
                  state === 'completed'
                    ? (uiLanguage === 'pt' ? 'Concluido' : uiLanguage === 'es' ? 'Completado' : 'Completed')
                    : state === 'current'
                      ? (uiLanguage === 'pt' ? 'Em andamento' : uiLanguage === 'es' ? 'En progreso' : 'In progress')
                      : state === 'available'
                        ? (uiLanguage === 'pt' ? 'Proximo' : uiLanguage === 'es' ? 'Siguiente' : 'Next')
                        : (uiLanguage === 'pt' ? 'Fechado' : uiLanguage === 'es' ? 'Bloqueado' : 'Locked');
                const cardClasses =
                  state === 'completed'
                    ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100'
                    : state === 'current'
                      ? 'border-blue-400/70 bg-blue-500/20 text-white'
                      : state === 'available'
                        ? 'border-yellow-300/70 bg-yellow-400/15 text-yellow-100'
                        : 'border-slate-600 bg-slate-800 text-slate-400';
                const badgeClasses =
                  state === 'completed'
                    ? 'bg-emerald-400 text-slate-950'
                    : state === 'current'
                      ? 'bg-blue-400 text-slate-950'
                      : state === 'available'
                        ? 'bg-yellow-300 text-slate-950'
                        : 'bg-slate-700 text-slate-200';
                return (
                  <div
                    key={id}
                    className={`rounded-3xl border p-4 shadow-[0_18px_40px_rgba(15,23,42,0.35)] ${cardClasses}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <img
                        src={`/islands/workbook/wbk${id}.png`}
                        alt={`Workbook ${id}`}
                        className="h-16 w-16 object-contain"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${badgeClasses}`}>
                        {stateCopy}
                      </span>
                    </div>
                    <div className="mt-3">
                      <p className="text-lg font-black">
                        {uiLanguage === 'pt' ? `Caderno ${id}` : uiLanguage === 'es' ? `Libro ${id}` : `Workbook ${id}`}
                      </p>
                      <p className="mt-1 text-xs leading-5 opacity-80">
                        {state === 'current'
                          ? (uiLanguage === 'pt' ? 'Este e o livro que a pessoa esta fazendo agora.' : uiLanguage === 'es' ? 'Este es el libro que la persona esta haciendo ahora.' : 'This is the workbook the learner is doing now.')
                          : state === 'completed'
                            ? (uiLanguage === 'pt' ? 'Livro ja concluido e liberado para revisao.' : uiLanguage === 'es' ? 'Libro ya completado y listo para repasar.' : 'Workbook already completed and open for review.')
                            : state === 'available'
                              ? (uiLanguage === 'pt' ? 'Proximo livro liberado para continuar a jornada.' : uiLanguage === 'es' ? 'Siguiente libro liberado para continuar la ruta.' : 'Next workbook unlocked for the next step.')
                              : (uiLanguage === 'pt' ? 'Este livro ainda fica fechado ate avancar na sequencia.' : uiLanguage === 'es' ? 'Este libro sigue cerrado hasta avanzar en la secuencia.' : 'This workbook stays locked until the sequence advances.')}
                      </p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => canOpenTracks && handleSelectWorkbook(id)}
                        disabled={!canOpenTracks}
                        className={`flex-1 rounded-2xl px-4 py-3 text-sm font-black transition active:scale-95 ${
                          state === 'completed'
                            ? 'bg-emerald-400 text-slate-950'
                            : state === 'current'
                              ? 'bg-blue-400 text-slate-950'
                              : state === 'available'
                                ? 'bg-yellow-300 text-slate-950'
                                : 'cursor-not-allowed bg-slate-700 text-slate-300'
                        }`}
                      >
                        {uiLanguage === 'pt' ? 'Abrir trilha' : uiLanguage === 'es' ? 'Abrir ruta' : 'Open tracks'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentWorkbookId(id);
                          setCurrentSection(SectionType.WORKBOOK_PDF);
                        }}
                        className="rounded-2xl border border-white/15 bg-slate-950/20 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-950/35"
                      >
                        PDF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      case SectionType.PLACEMENT_TEST:
        return <PlacementTest currentLanguage={language} onComplete={handlePlacementComplete} onTriggerConversion={triggerConversion} />;
      case SectionType.WORKBOOK_PDF: {
        const workbookRegistry = COURSE_WORKBOOKS[currentCourseId ?? DEFAULT_COURSE_ID] ?? COURSE_WORKBOOKS[DEFAULT_COURSE_ID];
        const availableWorkbookIds = Object.keys(workbookRegistry)
          .map(Number)
          .filter((id) => Number.isFinite(id))
          .sort((a, b) => a - b);
        return (
          <WorkbookPdfView
            workbookId={currentWorkbookId || progress.currentWorkbook || 1}
            availableWorkbookIds={availableWorkbookIds}
            uiLanguage={uiLanguage}
            courseTitle={activeCourse?.title}
            courseFlag={activeCourse?.flag}
            onBack={() => handleNavigate(SectionType.COURSES)}
            onOpenTracks={() => handleNavigate(SectionType.WORKBOOK, { workbookId: currentWorkbookId || progress.currentWorkbook || 1 })}
            onOpenWorkbookList={goToWorkbookList}
            onSelectWorkbook={(workbookId) => handleSelectWorkbook(workbookId, SectionType.WORKBOOK_PDF)}
          />
        );
      }
      case SectionType.WORKBOOK: {
        const hasAnyDays = Object.keys(progress.days ?? {}).some(k => (progress.days as any)?.[k] === true);
        const hasAnyActivity = (progress.completedActivities?.length ?? 0) > 0;
        const hasProgress = hasAnyDays || hasAnyActivity;
        console.log('[EMPTY_STATE_DEBUG]', { language, courseId: currentCourseId, hasProgress, isWorkbookLoading, hasWorkbook: !!currentWorkbook });
        if (isWorkbookLoading) {
          return (
            <div className="flex min-h-[60vh] items-center justify-center px-4">
              <div className="text-center">
                <div className="mb-4 text-4xl">📚</div>
                <p className="text-slate-300 font-semibold">
                  {uiLanguage === 'pt' ? 'Carregando caderno...' : uiLanguage === 'es' ? 'Cargando libro...' : 'Loading content...'}
                </p>
              </div>
            </div>
          );
        }
        if (!currentWorkbook) {
          return (
            <div className="flex min-h-[60vh] items-center justify-center px-4">
              <div className="max-w-md text-center">
                <div className="mb-4 text-4xl">⚠️</div>
                <p className="text-slate-100 font-semibold">
                  {contentLoadError
                    ?? (uiLanguage === 'pt'
                      ? 'Não foi possível abrir o conteúdo desta aula.'
                      : uiLanguage === 'es'
                        ? 'No fue posible abrir el contenido de esta lección.'
                        : 'This lesson content could not be opened.')}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {uiLanguage === 'pt'
                    ? 'Verifique o workbook e lesson atribuídos à live class.'
                    : uiLanguage === 'es'
                      ? 'Revisa el workbook y la lesson asignados a la live class.'
                      : 'Check the workbook and lesson assigned to this live class.'}
                </p>
              </div>
            </div>
          );
        }
        // Workbook loaded but student has no completed days or activities — show orientation
        if (!hasProgress) {
          const title =
            uiLanguage === 'pt' ? 'Você ainda não iniciou este curso.'
            : uiLanguage === 'es' ? 'Aún no has iniciado este curso.'
            : 'You have not started this course yet.';
          const wbkLabel =
            uiLanguage === 'pt' ? 'Começar Caderno 1'
            : uiLanguage === 'es' ? 'Empezar Libro 1'
            : 'Start Workbook 1';
          const testLabel =
            uiLanguage === 'pt' ? 'Fazer Teste de Nivelamento'
            : uiLanguage === 'es' ? 'Hacer Prueba de Nivel'
            : 'Start Placement Test';
          console.log('[EMPTY_STATE_DEBUG] fallback rendered — no progress', { language, courseId: currentCourseId });
          return (
            <div className="flex min-h-[60vh] items-center justify-center px-6">
              <div className="text-center max-w-sm">
                <div className="mb-4 text-6xl">🌟</div>
                <h2 className="text-xl font-black text-white mb-3">{title}</h2>
                <p className="text-slate-400 text-sm mb-6">
                  {uiLanguage === 'pt'
                    ? 'Escolha como quer começar:'
                    : uiLanguage === 'es'
                    ? 'Elige cómo quieres comenzar:'
                    : 'Choose how you want to start:'}
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setCurrentSection(SectionType.PLACEMENT_TEST)}
                    className="w-full py-3 px-4 rounded-2xl bg-yellow-400 text-slate-900 font-bold text-base active:scale-95 transition-transform"
                  >
                    🎯 {testLabel}
                  </button>
                  <button
                    onClick={() => handleSelectWorkbook(1)}
                    className="w-full py-3 px-4 rounded-2xl bg-blue-600 text-white font-bold text-base active:scale-95 transition-transform"
                  >
                    📖 {wbkLabel}
                  </button>
                </div>
              </div>
            </div>
          );
        }
        return (
          <WorkbookView
            workbookId={currentWorkbookId || progress.currentWorkbook}
            lessons={currentWorkbook.lessons || []}
            progress={progress}
            onSelectLesson={openLesson}
            onOpenGrammarOverview={
              (currentWorkbook.lessons || []).some((lesson) => {
                const lessonNumber = getLessonNumberFromId(lesson.id);
                return Number.isFinite(lessonNumber) && !!getGrammarGuideForLesson(lessonNumber);
              })
                ? openGrammarOverview
                : undefined
            }
            isAdmin={isAdmin}
            currentLanguage={language}
            uiLanguage={uiLanguage}
            onBack={() => handleNavigate(SectionType.COURSES)}
          />
        );
      }
      case SectionType.LESSON: {
        const parsedLessonNumber = getLessonNumberFromId(currentLessonId || `lesson${progress.currentLesson}`);
        const lessonNumber = Number.isFinite(parsedLessonNumber) ? parsedLessonNumber : progress.currentLesson;
        const lesson = findLessonByNumber(currentWorkbook?.lessons, lessonNumber, currentLessonId) || {
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
            canAccessAllDays={canManageLiveClasses}
            testCompleted={lessonTestCompleted[lessonNumber] || false}
            testScore={lessonTestScores[lessonNumber]}
            testPassed={completedLessonSet.has(lessonNumber)}
            onStartDay={(day: Day) => {
              dayStartTimeRef.current = Date.now();
              setCurrentDay(day);
              setActiveWeeklyTest(null);
              setCurrentSection(SectionType.PRACTICE);
              if (activeOnlineClass?.id && canManageLiveClasses) {
                void pushLiveSessionState({
                  sessionStatus: 'active',
                  activeWorkbookId: currentWorkbookId || progress.currentWorkbook || 1,
                  activeLessonId: lesson.id,
                  activeExerciseId: day.id,
                });
              }
            }}
            onStartWeeklyTest={(day: Day) => {
              dayStartTimeRef.current = Date.now();
              startWeeklyTest(lesson.id, lessonNumber, day);
              if (activeOnlineClass?.id && canManageLiveClasses) {
                void pushLiveSessionState({
                  sessionStatus: 'active',
                  activeWorkbookId: currentWorkbookId || progress.currentWorkbook || 1,
                  activeLessonId: lesson.id,
                  activeExerciseId: day.id,
                });
              }
            }}
            onBack={() => handleNavigate(SectionType.WORKBOOK, { workbookId: currentWorkbookId || progress.currentWorkbook })}
            onGrammar={() => openGrammarForLesson(lessonNumber)}
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
            <div className="max-w-sm space-y-3 text-slate-300">
              <p className="font-semibold">
                {uiLanguage === 'pt'
                  ? 'Precisa de ajuda? Fale direto com o suporte do Learnendo.'
                  : uiLanguage === 'es'
                  ? 'Necesitas ayuda? Habla directamente con el soporte de Learnendo.'
                  : 'Need help? Talk directly to Learnendo support.'}
              </p>
              <p className="text-sm">WhatsApp: +55 17 99101-0930</p>
              <p className="text-sm">Email: learnendo@gmail.com</p>
            </div>
            <a
              href="https://wa.me/5517991010930?text=Oi!%20Preciso%20de%20ajuda%20com%20o%20Learnendo."
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 bg-green-600 text-white font-black px-8 py-4 rounded-2xl shadow-[0_4px_0_0_#15803d] active:translate-y-1 transition-all"
            >
              <i className="fab fa-whatsapp text-2xl"></i>
              <span>WhatsApp - Learnendo</span>
            </a>
            <a
              href="mailto:learnendo@gmail.com"
              className="rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              learnendo@gmail.com
            </a>
          </div>
        );
      case SectionType.PRACTICE: {
        if (!currentDay) {
          return (
            <div className="flex min-h-[60vh] items-center justify-center px-6 text-center">
              <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-800/90 px-6 py-8 shadow-2xl">
                <div className="text-4xl">📘</div>
                <p className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-cyan-300">
                  {uiLanguage === 'pt' ? 'Transicao' : uiLanguage === 'es' ? 'Transicion' : 'Transition'}
                </p>
                <p className="mt-3 text-base font-semibold text-white">
                  {uiLanguage === 'pt'
                    ? 'Finalizando a lição...'
                    : uiLanguage === 'es'
                      ? 'Terminando la lección...'
                      : 'Finishing the lesson...'}
                </p>
              </div>
            </div>
          );
        }
        const currentPracticeLesson = findLessonByNumber(
          currentWorkbook?.lessons,
          getLessonNumberFromId(currentLessonId || `lesson${progress.currentLesson}`),
          currentLessonId,
        );
        const practiceTotalDays = currentPracticeLesson?.days?.length ?? 7;
        const currentPracticeDayIndex = currentPracticeLesson?.days.findIndex((day) => day.id === currentDay.id) ?? -1;
        const nextPracticeDay = currentPracticeDayIndex >= 0
          ? currentPracticeLesson?.days[currentPracticeDayIndex + 1]
          : undefined;
        const currentPracticeLessonIndex = currentWorkbook?.lessons?.findIndex(
          (lesson: { id: string }) => lesson.id === currentPracticeLesson?.id,
        ) ?? -1;
        const nextPracticeLesson = currentPracticeLessonIndex >= 0
          ? currentWorkbook?.lessons?.[currentPracticeLessonIndex + 1]
          : undefined;
        const isLastPracticeDay = currentPracticeDayIndex >= 0
          && currentPracticeDayIndex === practiceTotalDays - 1;
        const isLastPracticeLesson = currentPracticeLessonIndex >= 0
          && currentPracticeLessonIndex === (currentWorkbook?.lessons?.length ?? 0) - 1;
        const activePracticeWorkbookId = currentWorkbookId || progress.currentWorkbook || 1;
        const workbookRegistry = COURSE_WORKBOOKS[currentCourseId ?? DEFAULT_COURSE_ID] ?? COURSE_WORKBOOKS[DEFAULT_COURSE_ID];
        const hasNextPracticeWorkbook = Boolean(workbookRegistry[activePracticeWorkbookId + 1]);
        const isCurrentPracticeDayCompleted = Boolean(
          progress.completedActivities.includes(currentDay.id)
          || progress.days?.[currentDay.id]
          || (currentPracticeDayIndex >= 0 && lessonProgress?.days?.[currentPracticeDayIndex]?.completed)
        );
        return (
          <ExercisePractice
            day={currentDay}
            lessonId={currentLessonId || ''}
            currentLanguage={language}
            progress={progress}
            userId={user?.uid ?? 'anonymous'}
            workbookId={progress.currentWorkbook}
            workbook={currentWorkbook ?? undefined}
            userName={accountDisplayName}
            userEmail={accountDisplayEmail}
            workbookTitle={currentWorkbook?.title}
            lessonTitle={currentPracticeLesson?.title}
            isDayCompleted={isCurrentPracticeDayCompleted}
            onComplete={handleDayComplete}
            onContinueToNextDay={nextPracticeDay ? () => {
              dayStartTimeRef.current = Date.now();
              setCurrentDay(nextPracticeDay);
              setActiveWeeklyTest(null);
              setCurrentSection(SectionType.PRACTICE);
            } : undefined}
            isLastDayOfLesson={isLastPracticeDay}
            isLastLessonOfWorkbook={isLastPracticeLesson}
            hasNextWorkbook={hasNextPracticeWorkbook}
            onContinueToNextLesson={nextPracticeLesson ? () => {
              dayStartTimeRef.current = null;
              setCurrentDay(null);
              setActiveWeeklyTest(null);
              openLesson(nextPracticeLesson.id);
            } : undefined}
            onContinueToNextWorkbook={isLastPracticeLesson ? () => {
              setCurrentDay(null);
              setActiveWeeklyTest(null);
              handleNavigate(
                hasNextPracticeWorkbook ? SectionType.WORKBOOK : SectionType.WORKBOOK_LIST,
                hasNextPracticeWorkbook ? { workbookId: activePracticeWorkbookId + 1 } : undefined,
              );
            } : undefined}
            onRepeatLesson={currentPracticeLesson?.days?.[0] ? () => {
              dayStartTimeRef.current = Date.now();
              setCurrentDay(currentPracticeLesson.days[0]);
              setActiveWeeklyTest(null);
              setCurrentSection(SectionType.PRACTICE);
            } : undefined}
            totalDays={practiceTotalDays}
            onGrammar={() => {
              const lessonNumber = getLessonNumberFromId(currentLessonId || `lesson${progress.currentLesson}`);
              if (Number.isFinite(lessonNumber)) {
                openGrammarForLesson(lessonNumber);
              }
            }}
            onBack={() => {
              setCurrentDay(null);
              setActiveWeeklyTest(null);
              setCurrentSection(SectionType.LESSON);
              if (activeOnlineClass?.id && canManageLiveClasses) {
                void pushLiveSessionState({
                  sessionStatus: 'active',
                  activeWorkbookId: currentWorkbookId || progress.currentWorkbook || 1,
                  activeLessonId: currentLessonId || null,
                  activeExerciseId: null,
                });
              }
            }}
          />
        );
      }
      case SectionType.PRONUNCIATION:
        return <PronunciationTrainer
          onFinish={() => handleNavigate(SectionType.COURSES)}
          courseId={currentCourseId ?? 'english'}
          workbookId={currentWorkbookId || progress.currentWorkbook || 1}
          uiLanguage={uiLanguage}
        />;
      case SectionType.TEACHER_DASHBOARD:
        return user && canAccessTeacherDashboard ? (
          <TeacherDashboard user={user} canManageUsers={canManageUsers} teacherUid={canManageUsers ? null : user.uid} />
        ) : (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6 text-center">
            <p className="text-slate-300 font-semibold">Access denied. Teacher dashboard is for authorized users only.</p>
          </div>
        );
      case SectionType.PROBLEM_REPORTS:
        return (
          <ProblemReportsDashboard
            isAdmin={isAdmin}
            reviewer={{ uid: user?.uid ?? '', name: accountDisplayName }}
            onBack={() => setCurrentSection(SectionType.COURSES)}
          />
        );
      case SectionType.RANK:
        return <RankScreen currentUserId={user?.uid} courseId={currentCourseId ?? DEFAULT_COURSE_ID} />;
      case SectionType.SHARE:
        return <div>Share App Placeholder</div>;
      case SectionType.VOCABULARY:
        return (
          <MyVocabularyPage
            userId={user?.uid ?? ''}
            uiLanguage={uiLanguage as 'en' | 'pt' | 'es'}
            onBack={() => handleNavigate(SectionType.COURSES)}
          />
        );
      default:
        return (
          <WorkbookView
            workbookId={currentWorkbookId || progress.currentWorkbook}
            lessons={currentWorkbook?.lessons || []}
            progress={progress}
            onSelectLesson={openLesson}
            onOpenGrammarOverview={
              (currentWorkbook?.lessons || []).some((lesson) => {
                const lessonNumber = getLessonNumberFromId(lesson.id);
                return Number.isFinite(lessonNumber) && !!getGrammarGuideForLesson(lessonNumber);
              })
                ? openGrammarOverview
                : undefined
            }
            isAdmin={isAdmin}
            currentLanguage={language}
            uiLanguage={uiLanguage}
            onBack={() => handleNavigate(SectionType.COURSES)}
          />
        );
    }
  };

  if (!authReady) {
    console.log('[LOGIN_FLOW_DEBUG] waiting for auth — showing splash');
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
    console.log('[SPLASH_DEBUG] Still showing splash', { loading, progressLoaded, minSplashDone, uid: user?.uid });
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

  // Final guard before render: ensure no invalid combination reaches the component tree
  {
    const preRenderCheck = validateAndFixState({
      language,
      courseId: currentCourseId,
      workbookId: currentWorkbookId,
      section: currentSection,
      context: 'pre-render',
    });
    if (preRenderCheck.fixed) {
      // Corrections will trigger a re-render; current render is invalid — bail early.
      if (preRenderCheck.language !== language) setLanguageState(preRenderCheck.language);
      if (preRenderCheck.courseId !== currentCourseId) setCurrentCourseId(preRenderCheck.courseId);
      if (preRenderCheck.workbookId !== currentWorkbookId) setCurrentWorkbookId(preRenderCheck.workbookId);
      return null; // skip rendering with bad state; corrected state triggers immediate re-render
    }
  }

  return (
    <div className="app overflow-x-hidden bg-slate-900 min-h-screen">
      <style>{`
        body[data-workspace-presentation="true"] [data-app-chrome="header"],
        body[data-workspace-presentation="true"] [data-app-chrome="menu"],
        body[data-workspace-presentation="true"] [data-app-chrome="banner"] {
          display: none !important;
        }
        body[data-workspace-presentation="true"] [data-app-chrome="main"] {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
      `}</style>
      <header data-app-chrome="header" className="fixed inset-x-0 top-0 z-50 border-b border-slate-700 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-full items-center justify-between gap-1 sm:gap-2 px-2 sm:px-3 py-2 overflow-x-auto">
          <button
            type="button"
            className="flex h-10 items-center rounded-lg sm:rounded-xl bg-slate-800 px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-slate-200 shadow-sm active:scale-95 flex-shrink-0"
            onClick={goToWorkbookList}
            aria-label="Go to lesson list"
          >
            <span className="text-base leading-none">🏠</span>
            <span className="ml-1">Home</span>
          </button>

          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-200 flex-shrink-0">
            <div className="flex-shrink-0">
              <LanguageSelector current={language} onChange={handleLanguageSelect} />
            </div>
            {isGuestAccount && (
              <span className="rounded-lg border border-amber-400/50 bg-amber-400/15 px-1.5 py-1 text-amber-200">
                Guest
              </span>
            )}
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
        <div data-app-chrome="menu" className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-sm flex items-center justify-center" onClick={() => setMenuOpen(false)}>
          <div
            className="bg-white rounded-3xl shadow-2xl p-6 w-11/12 max-w-sm mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {isAdmin ? (
              <div className="mb-4 rounded-2xl bg-slate-50 p-3">
                <div className="flex flex-wrap gap-2">
                  {availableViewModes.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleViewModeChange(mode)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                        userViewMode === mode
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {VIEW_MODE_LABELS[mode]}
                    </button>
                  ))}
                </div>
              </div>
            ) : isTeacherAccount ? (
              <div className="mb-4 rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-bold text-slate-800">Teacher</p>
              </div>
            ) : null}
            {isGuestAccount ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Guest mode</p>
                <p className="mt-2 text-sm text-amber-900">
                  You are using Learnendo without a saved account. Create one to keep your name, email, and progress.
                </p>
                <button
                  type="button"
                  onClick={openGuestConversion}
                  className="mt-3 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-600"
                >
                  Create account
                </button>
              </div>
            ) : (
              <div className="mb-4 rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-bold text-slate-800">{accountDisplayName}</p>
                {accountDisplayEmail ? (
                  <p className="text-xs text-slate-500">{accountDisplayEmail}</p>
                ) : null}
              </div>
            )}
            <div className="space-y-2">
              <button className="block w-full text-left px-4 py-3 rounded-xl hover:bg-blue-50 font-medium transition-colors" onClick={() => { goToWorkbookList(); setMenuOpen(false); }}>Workbooks</button>
              <button className="block w-full text-left px-4 py-3 rounded-xl hover:bg-blue-50 font-medium transition-colors" onClick={() => { setCurrentSection(SectionType.COURSES); setMenuOpen(false); }}>Courses</button>
              <button className="block w-full text-left px-4 py-3 rounded-xl hover:bg-blue-50 font-medium transition-colors" onClick={() => { setCurrentSection(SectionType.PLACEMENT_TEST); setMenuOpen(false); }}>Placement Test</button>
              {canAccessTeacherDashboard && (
                <button className="block w-full text-left px-4 py-3 rounded-xl hover:bg-purple-50 text-purple-600 font-medium transition-colors" onClick={() => { setCurrentSection(SectionType.TEACHER_DASHBOARD); setMenuOpen(false); }}>📊 Teacher Dashboard</button>
              )}
              {isAdmin && (
                <button className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left font-medium text-rose-700 transition-colors hover:bg-rose-50" onClick={() => { setCurrentSection(SectionType.PROBLEM_REPORTS); setMenuOpen(false); }}>
                  <span>Relatórios de problemas</span>
                  {pendingProblemReports > 0 && <span className="min-w-6 rounded-full bg-rose-600 px-2 py-0.5 text-center text-xs font-black text-white">{pendingProblemReports}</span>}
                </button>
              )}
              <button className="block w-full text-left px-4 py-3 rounded-xl hover:bg-blue-50 font-medium transition-colors" onClick={() => { setCurrentSection(SectionType.SETTINGS); setMenuOpen(false); }}>Settings</button>
              <button className="block w-full text-left px-4 py-3 rounded-xl hover:bg-blue-50 font-medium transition-colors" onClick={() => { setCurrentSection(SectionType.HELP); setMenuOpen(false); }}>Help</button>
              <button className="block w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 font-medium transition-colors" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}
      <main data-app-chrome="main" className="pt-[68px] pb-[56px]">{renderSection()}</main>
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
          newWords={resultAnimationMeta?.lessonNumber === 1 ? lesson1NewWords.length : 0}
          emoji={resultAnimationMeta?.emoji}
          title={resultAnimationMeta?.title}
          subtitle={resultAnimationMeta?.subtitle}
          buttonLabel={resultAnimationMeta?.buttonLabel}
          onClose={() => {
            setShowResultAnimation(false);
            setResultAnimationMeta(null);
          }}
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
        const fallbackLessonNumber = getLessonNumberFromId(currentLessonId) || progress.currentLesson || 1;
        const lessonNum = activeGrammarLessonNumber ?? fallbackLessonNumber;
        const guide = getGrammarGuideForLesson(lessonNum);
        const grammarOverviewItems = (currentWorkbook?.lessons ?? [])
          .map((lesson, index) => {
            const lessonNumber = getLessonNumberFromId(lesson.id) || index + 1;
            const lessonGuide = getGrammarGuideForLesson(lessonNumber);
            if (!lessonGuide) return null;

            const topic = (lessonGuide.lessonTitle ?? '')
              .replace(/^Lesson\s+\d+\s*:\s*/i, '')
              .trim();

            return {
              lessonNumber,
              grammarTitle: lessonGuide.grammarTitle ?? lessonGuide.label ?? `Lesson ${lessonNumber}`,
              topic,
            };
          })
          .filter((item): item is { lessonNumber: number; grammarTitle: string; topic: string } => item !== null);
        const isOverviewMode = activeGrammarLessonNumber === null;
        return (
          <div
            className="fixed inset-0 z-[1001] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={closeGrammarModal}
          >
            <div
              className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[92vh] sm:max-w-5xl sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-8 sm:py-5">
                <div>
                  {isOverviewMode ? (
                    <>
                      <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-500">
                        Workbook {currentWorkbookId || progress.currentWorkbook}
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
                        Grammar Focus
                      </h2>
                      <p className="mt-1 text-sm text-slate-500 sm:text-base">
                        Choose the lesson you want to open.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-500">
                        Lesson {lessonNum}
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
                        Grammar Focus
                      </h2>
                      <p className="mt-2 text-lg font-semibold text-slate-700 sm:text-xl">
                        {guide?.grammarTitle ?? guide?.label ?? 'Grammar Notes'}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isOverviewMode && grammarOverviewItems.length > 1 && (
                    <button
                      onClick={openGrammarOverview}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      All grammar points
                    </button>
                  )}
                  <button
                    onClick={closeGrammarModal}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-2xl leading-none text-slate-400 transition hover:text-slate-700"
                    aria-label="Close"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M6 6L18 18" />
                      <path d="M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              </div>
              <div
                ref={grammarModalScrollRef}
                onScroll={handleGrammarModalScroll}
                className="flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-7"
              >
                {isOverviewMode ? (
                  grammarOverviewItems.length === 0 ? (
                    <p className="text-sm text-slate-500">No grammar notes available for this workbook yet.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {grammarOverviewItems.map((item) => (
                        <button
                          key={item.lessonNumber}
                          onClick={() => openGrammarForLesson(item.lessonNumber)}
                          className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-blue-300 hover:bg-blue-50"
                        >
                          <p className="text-xs font-black uppercase tracking-[0.26em] text-blue-500">
                            Lesson {item.lessonNumber}
                          </p>
                          <p className="mt-2 text-lg font-bold text-slate-900">
                            {item.grammarTitle}
                          </p>
                          {item.topic && (
                            <p className="mt-2 text-sm text-slate-500">
                              {item.topic}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )
                ) : (!guide ? (
                  <p className="text-sm text-slate-500">No grammar notes available for this lesson yet.</p>
                ) : (
                  <div className="space-y-6">
                    {guide.sections.map((section) => {
                      const useBullets = shouldRenderGrammarBullets(section);

                      return (
                        <section
                          key={section.title}
                          className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5 sm:px-6"
                        >
                          <h3 className="text-base font-black text-slate-900 sm:text-lg">
                            {getGrammarSectionTitle(section.title)}
                          </h3>
                          {useBullets ? (
                            <ul className="ml-5 mt-3 list-disc space-y-2 text-sm leading-7 text-slate-700 sm:text-[15px]">
                              {section.lines.map((line, index) => (
                                <li key={`${section.title}-${index}`}>
                                  {renderGrammarLine(line, section.title)}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700 sm:text-[15px]">
                              {section.lines.map((line, index) => (
                                <p key={`${section.title}-${index}`}>
                                  {renderGrammarLine(line, section.title)}
                                </p>
                              ))}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
      {showPlacementBanner && (
        <div data-app-chrome="banner" className="fixed top-[68px] left-0 right-0 z-40 bg-amber-400 text-slate-900 flex items-center justify-between gap-2 px-4 py-2.5 shadow-lg">
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
      {!isInLiveRoom && (
        <BottomNavigation
          currentSection={currentSection}
          onNavigate={handleNavigate}
          onShare={handleShare}
          uiLanguage={uiLanguage}
        />
      )}
    </div>
  );
};

export default App;



