/**
 * teacherService.ts
 *
 * Single entry point for all teacher dashboard data.
 * Ties together the three engines: courseProgressEngine, alertService, rankingService.
 *
 * Components import from here — never from the lower-level engines directly.
 */

import { collection, onSnapshot } from 'firebase/firestore';
import { getAllUserProgressSummaries, UserProgressSummary } from './courseProgressEngine';
import { detectAlerts, StudentAlert } from './alertService';
import { rankStudents, RankedStudent, computeScore } from './rankingService';
import { formatTime, formatAccuracy } from './progressStatsService';
import { db } from '../services/firebase';
import { UserTestData } from '../types';
import { deriveDashboardAnswerMetrics, deriveDashboardRewardMetrics, formatLastPedagogicalActivityLabel, getLastPedagogicalActivity, getPreviousPedagogicalActivity, getUniqueCompletedActivityCount, resolveDashboardLanguageCode } from './dashboardMetrics';
import { subscribeToLiveAttendance, type LiveActivityScope } from '../services/livePedagogicalActivity';
import type { LiveAttendanceRecord } from '../models/liveAttendance';
import { partitionStudentAccounts } from '../services/studentRolePolicy';

// ─────────────────────────────────────────────────────────────
// Re-exports so callers only need one import
// ─────────────────────────────────────────────────────────────

export type { UserProgressSummary, RankedStudent, StudentAlert };
export { computeScore, formatTime, formatAccuracy };

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/** Full enriched row used by the teacher dashboard table. */
export interface TeacherStudentRow extends RankedStudent {
  alerts: StudentAlert[];
  /** Resolved current path — always has a value (falls back to 1/1/1). */
  pathLabel: string;           // e.g. "Wbk 2 · L3 · D5"
  lastActivityLabel: string;   // human-readable relative date
  tests?: UserTestData;
  dashboardStatus: 'Registered' | 'Placement Done' | 'Not Started' | 'Active';
  selectedCourseId?: string;
  selectedCourseLabel: string;
  selectedLanguageCode?: string;
  selectedLanguageLabel: string;
  lessonsCompleted: number;
  lessonsLabel: string;
  placementLabel: string;
}

type DashboardSource = Record<string, any>;
type PlacementRecord = {
  score?: number;
  level?: string;
  date?: string;
  languageCode?: string;
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function formatProgressLabel(summary: UserProgressSummary, dashboardStatus: TeacherStudentRow['dashboardStatus']): string {
  if (dashboardStatus === 'Placement Done') return 'PT ✔';
  if (dashboardStatus === 'Not Started') return 'Ready';
  if (dashboardStatus === 'Registered') return 'New';

  const workbook = summary.currentWorkbook ?? 1;
  const lesson = summary.currentLesson ?? 1;
  const exercise = summary.currentDay ?? 1;
  return `W${workbook} L${lesson} E${exercise}`;
}

const COURSE_LABELS: Record<string, string> = {
  english: 'English',
  portuguese_foreigners: 'Portuguese',
  portuguese_native: 'Portuguese Native',
  spanish: 'Spanish',
  greek_koine: 'Greek',
  hebrew_biblical: 'Hebrew',
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  pt: 'Portuguese',
  es: 'Spanish',
  el: 'Greek',
  he: 'Hebrew',
};

function getPlacementRecord(raw?: DashboardSource): PlacementRecord | undefined {
  const tests = raw?.tests;
  if (tests?.placement) return tests.placement as PlacementRecord;
  const placements = tests?.placements;
  if (!placements || typeof placements !== 'object') return undefined;
  const records = Object.values(placements)
    .filter((value): value is PlacementRecord => !!value && typeof value === 'object');
  if (records.length === 0) return undefined;
  return records.sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  })[0];
}

function getLessonsCompleted(raw?: DashboardSource): number {
  const lessons = raw?.tests?.lessons;
  if (!lessons || typeof lessons !== 'object') return 0;
  return Object.values(lessons).filter((value) => !!value && typeof value === 'object').length;
}

function formatCourseLabel(courseId?: string): string {
  if (!courseId) return '—';
  return COURSE_LABELS[courseId] ?? courseId.replace(/_/g, ' ');
}

function formatLanguageLabel(languageCode?: string): string {
  if (!languageCode) return '—';
  return LANGUAGE_LABELS[languageCode] ?? languageCode.toUpperCase();
}

function getDashboardStatus(
  summary: UserProgressSummary,
  placement: PlacementRecord | undefined,
  lessonsCompleted: number,
): TeacherStudentRow['dashboardStatus'] {
  const hasActiveProgress =
    summary.daysCompleted > 0 ||
    summary.totalStars > 0 ||
    summary.totalAttempts > 0 ||
    summary.lessonsStarted > 0 ||
    lessonsCompleted > 0;
  const hasStudyContext =
    !!summary.courseId ||
    !!summary.languageCode ||
    Object.keys(summary.courses ?? {}).length > 0;

  if (hasActiveProgress) return 'Active';
  if (placement) return 'Placement Done';
  if (hasStudyContext) return 'Not Started';
  return 'Registered';
}

function formatPlacementLabel(placement?: PlacementRecord): string {
  if (!placement) return 'Not Done';
  const level = placement.level?.trim();
  if (level && placement.score != null) return `${level} (${placement.score}%)`;
  if (level) return level;
  if (placement.score != null) return `${placement.score}%`;
  return 'Done';
}

function pathLabel(summary: UserProgressSummary, dashboardStatus: TeacherStudentRow['dashboardStatus']): string {
  return formatProgressLabel(summary, dashboardStatus);
}

function formatLessonsLabel(student: RankedStudent & UserProgressSummary, lessonsCompleted: number): string {
  if ((student.daysCompleted ?? 0) > 0) return `${student.daysCompleted}E`;
  if (lessonsCompleted > 0) return `${lessonsCompleted}L`;
  return '0E';
}

function buildTeacherRow(student: RankedStudent & UserProgressSummary, raw?: DashboardSource): TeacherStudentRow {
  const placement = getPlacementRecord(raw);
  const lessonsCompleted = getLessonsCompleted(raw);
  const dashboardStatus = getDashboardStatus(student, placement, lessonsCompleted);
  const rankedStudent = { ...student, dashboardStatus } as RankedStudent & UserProgressSummary & { dashboardStatus: TeacherStudentRow['dashboardStatus'] };
  const selectedCourseId = student.courseId;
  const selectedLanguageCode = student.languageCode ?? placement?.languageCode;

  return {
    ...student,
    alerts: detectAlerts(student),
    pathLabel: pathLabel(student, dashboardStatus),
    lastActivityLabel: formatLastPedagogicalActivityLabel(student.lastActivity),
    tests: raw?.tests ?? student.tests,
    dashboardStatus,
    selectedCourseId,
    selectedCourseLabel: formatCourseLabel(selectedCourseId),
    selectedLanguageCode,
    selectedLanguageLabel: formatLanguageLabel(selectedLanguageCode),
    lessonsCompleted,
    lessonsLabel: formatLessonsLabel(rankedStudent, lessonsCompleted),
    placementLabel: formatPlacementLabel(placement),
  };
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Fetch and enrich all student data for the teacher dashboard.
 * Returns students pre-sorted by score (rank 1 first).
 *
 * Pass `courseId` to get ranking for a specific language/course only.
 * IMPORTANT: ranking must always be filtered by courseId —
 * students should only compete with others in the same language/course.
 *
 * One Firestore fan-out per student (courseProgress subcollection read).
 * Results are not cached — call sparingly or memoize at the component level.
 */
export async function getTeacherDashboardData(courseId?: string): Promise<TeacherStudentRow[]> {
  const allSummaries = await getAllUserProgressSummaries();
  const { students } = partitionStudentAccounts(allSummaries);
  // Filter by course when requested — per-course ranking rule
  const summaries = courseId
    ? students.filter(s => !s.courseId || s.courseId === courseId)
    : students;
  const ranked = rankStudents(summaries);
  return ranked.map(student => buildTeacherRow(student, { tests: student.tests }));
}

/**
 * Re-sort an already-loaded list by the given column.
 * This is a pure function — use it inside components to avoid re-fetching.
 */
export type SortColumn =
  | 'name' | 'email' | 'path' | 'sessions' | 'accuracy'
  | 'stars' | 'score' | 'lastActivity' | 'alerts';

export function sortRows(
  rows: TeacherStudentRow[],
  col: SortColumn,
  dir: 'asc' | 'desc',
): TeacherStudentRow[] {
  const factor = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (col) {
      case 'name':         return factor * (a.displayName ?? '').localeCompare(b.displayName ?? '');
      case 'email':        return factor * (a.email ?? '').localeCompare(b.email ?? '');
      case 'path':         return factor * a.rank - factor * b.rank; // rank is derived from score
      case 'sessions':     return factor * (a.daysCompleted - b.daysCompleted);
      case 'accuracy':     return factor * (a.avgAccuracy - b.avgAccuracy);
      case 'stars':        return factor * (a.totalStars - b.totalStars);
      case 'score':        return factor * (a.score - b.score);
      case 'lastActivity': return factor * (
        (typeof a.lastActivity?.toMillis === 'function' ? a.lastActivity.toMillis() : new Date(a.lastActivity ?? 0).getTime()) -
        (typeof b.lastActivity?.toMillis === 'function' ? b.lastActivity.toMillis() : new Date(b.lastActivity ?? 0).getTime())
      );
      case 'alerts':       return factor * (a.alerts.length - b.alerts.length);
      default:             return 0;
    }
  });
}

/**
 * Filter rows by a search string (name or email, case-insensitive).
 */
export function filterRows(rows: TeacherStudentRow[], query: string): TeacherStudentRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(r =>
    (r.displayName ?? '').toLowerCase().includes(q) ||
    (r.email       ?? '').toLowerCase().includes(q),
  );
}

// ─────────────────────────────────────────────────────────────
// Course target language is resolved centrally by dashboardMetrics.
// Used to match legacy Firestore docs that stored languageCode instead of courseId.
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Realtime subscription (flat "progress" collection)
// ─────────────────────────────────────────────────────────────

/**
 * Subscribe to realtime teacher dashboard data from the flat
 * `"progress"` Firestore collection (one doc per student, keyed by uid).
 *
 * Returns an unsubscribe function — call it to stop listening.
 * Falls back to an empty list and calls `cb([])` when Firestore is unavailable.
 */
export function subscribeToTeacherData(
  cb: (rows: TeacherStudentRow[], context: { administrativeRows: TeacherStudentRow[] }) => void,
  courseId?: string | null,
  teacherUid?: string | null,
  liveActivityScope?: LiveActivityScope,
): () => void {
  if (!db) {
    cb([], { administrativeRows: [] });
    return () => {};
  }

  const progressQuery = collection(db, 'progress');
  const usersQuery = collection(db, 'users');
  let progressDocs = new Map<string, DashboardSource>();
  let userDocs = new Map<string, DashboardSource>();
  let liveAttendanceByStudent = new Map<string, LiveAttendanceRecord[]>();

  const buildRows = () => {
    const allUids = new Set<string>([
      ...progressDocs.keys(),
      ...userDocs.keys(),
    ]);

    const ghostNameRe = /^(player_|user_|anonymous$)/i;
    const isGhostName = (name: string | undefined): boolean => {
      if (!name) return true;
      const normalized = name.trim();
      return !normalized || normalized === '—' || ghostNameRe.test(normalized);
    };

    const summaries: UserProgressSummary[] = Array.from(allUids).map((uid) => {
      const progressData = progressDocs.get(uid) ?? {};
      const userData = userDocs.get(uid) ?? {};
      const placement = getPlacementRecord(progressData);
      const { totalAttempts, totalErrors, avgAccuracy } = deriveDashboardAnswerMetrics(progressData);
      const { totalStars, totalDiamonds, totalFire } = deriveDashboardRewardMetrics(progressData);

      return {
        uid,
        role: userData.role === 'student' || userData.role === 'teacher' || userData.role === 'admin'
          ? userData.role
          : undefined,
        displayName: progressData.displayName ?? userData.displayName ?? userData.name ?? undefined,
        email: progressData.email ?? userData.email ?? undefined,
        group: progressData.group ?? userData.group ?? undefined,
        totalStars,
        totalFire,
        totalIce: progressData.totalIce ?? 0,
        totalDiamonds,
        lessonsStarted: progressData.lessonsStarted ?? 0,
        daysCompleted: getUniqueCompletedActivityCount(progressData),
        totalTimeSpent: progressData.totalTimeSpent ?? 0,
        timeSpentToday: progressData.timeSpentToday ?? 0,
        totalErrors,
        totalAttempts,
        avgAccuracy,
        currentWorkbook: progressData.currentWorkbook ?? 1,
        currentLesson: progressData.currentLesson ?? 1,
        currentDay: progressData.currentDay ?? 1,
        lastLessonId: progressData.lastLesson ?? undefined,
        lastActivity: getLastPedagogicalActivity(progressData) ?? undefined,
        lastPedagogicalActivity: progressData.lastPedagogicalActivityAt,
        previousPedagogicalActivity: getPreviousPedagogicalActivity(
          progressData,
          progressData.lastPedagogicalActivityAt,
        ) ?? undefined,
        liveAttendance: liveAttendanceByStudent.get(uid) ?? [],
        courseId: progressData.courseId ?? userData.courseId ?? undefined,
        languageCode: resolveDashboardLanguageCode(
          progressData.courseId ?? userData.courseId,
          progressData.language,
          progressData.languageCode,
          userData.languageCode,
          placement?.languageCode,
        ),
        studyProfile: progressData.studyProfile ?? userData.studyProfile ?? undefined,
        tests: progressData.tests ?? undefined,
        courses: progressData.courses ?? undefined,
      } as UserProgressSummary;
    }).filter((summary) => {
      const progressData = progressDocs.get(summary.uid) ?? {};
      const hasIdentity = !isGhostName(summary.displayName) || (!!summary.email && summary.email.includes('@'));
      const hasStudySignals =
        summary.daysCompleted > 0 ||
        summary.totalStars > 0 ||
        summary.totalAttempts > 0 ||
        summary.lessonsStarted > 0 ||
        getLessonsCompleted(progressData) > 0 ||
        !!getPlacementRecord(progressData) ||
        !!summary.courseId ||
        !!summary.languageCode ||
        Object.keys(summary.courses ?? {}).length > 0;

      return hasStudySignals || hasIdentity;
    });

    const partitioned = partitionStudentAccounts(summaries);
    const forDashboard = courseId
      ? partitioned.students.filter((summary) => {
          if (summary.courseId === courseId) return true;
          if (summary.courses?.[courseId] !== undefined) return true;
          const expectedLang = resolveDashboardLanguageCode(courseId);
          if (expectedLang && summary.languageCode === expectedLang) return true;
          const placementLanguage = getPlacementRecord(progressDocs.get(summary.uid))?.languageCode;
          if (expectedLang && placementLanguage === expectedLang) return true;
          return false;
        })
      : partitioned.students;

    const scopedDashboard = teacherUid
      ? forDashboard.filter((summary) => {
          const userData = userDocs.get(summary.uid) ?? {};
          return (userData.assignedTeacherUid ?? null) === teacherUid;
        })
      : forDashboard;

    const ranked = rankStudents(scopedDashboard);
    const administrativeRows = rankStudents(partitioned.administrative)
      .map((account) => buildTeacherRow(account, progressDocs.get(account.uid)));
    cb(
      ranked.map((student) => buildTeacherRow(student, progressDocs.get(student.uid))),
      { administrativeRows },
    );
  };

  const unsubProgress = onSnapshot(
    progressQuery,
    (snap) => {
      progressDocs = new Map(snap.docs.map((docSnap) => [docSnap.id, docSnap.data()]));
      buildRows();
    },
    (err) => {
      console.error('[TeacherService] onSnapshot error:', err);
      cb([], { administrativeRows: [] });
    },
  );

  const unsubUsers = onSnapshot(
    usersQuery,
    (snap) => {
      userDocs = new Map(snap.docs.map((docSnap) => [docSnap.id, docSnap.data()]));
      buildRows();
    },
    (err) => {
      console.error('[TeacherService] users onSnapshot error:', err);
      cb([], { administrativeRows: [] });
    },
  );

  const unsubLiveActivity = liveActivityScope
    ? subscribeToLiveAttendance(
        liveActivityScope,
        (attendanceByStudent) => {
          liveAttendanceByStudent = attendanceByStudent;
          buildRows();
        },
        (err) => console.error('[TeacherService] live attendance subscription error:', err),
      )
    : () => {};

  return () => {
    unsubProgress();
    unsubUsers();
    unsubLiveActivity();
  };
}
