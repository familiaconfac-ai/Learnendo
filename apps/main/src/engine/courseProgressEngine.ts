/**
 * courseProgressEngine.ts
 *
 * Architecture overview
 * ─────────────────────
 * One Firestore document per course + book is stored at:
 *
 *   users/{uid}/courseProgress/{courseId}_{bookNumber}
 *
 * Each document has a `lessons` map keyed by the string lesson number
 * ("1".."12").  A single course therefore has at most
 * 8 books × 12 lessons × 7 days = 672 day entries spread across 8 documents —
 * well within Firestore's 1 MB per-document limit.
 *
 * Schema:
 *   { courseId, bookNumber, createdAt: "YYYY-MM-DD", updatedAt: Timestamp,
 *     lessons: {
 *       [lessonId: string]: {
 *         startedAt: "YYYY-MM-DD",   // immutable; set once when lesson opens
 *         days: [
 *           { day, unlockedAt, completed, completedAt?, score? }
 *         ]
 *       }
 *     }
 *   }
 *
 * Related collections:
 *   groups/{groupId}          — class schedule config
 *   users/{uid}/meta/status   — user group assignment
 *
 * TODO: Remove weeklyProgress reads after full migration to courseProgress.
 */

import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  serverTimestamp,
  deleteDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  deriveDashboardAnswerMetrics,
  deriveDashboardRewardMetrics,
  getCompletedActivityRecords,
  getLastPedagogicalActivity,
  getPreviousPedagogicalActivity,
  getUniqueCompletedActivityCount,
} from './dashboardMetrics';

// ─────────────────────────────────────────────────────────────
// Domain types
// ─────────────────────────────────────────────────────────────

/** A single day’s progress record within a lesson. */
export interface DayEntry {
  day: number;           // 1–7
  unlockedAt: string;    // YYYY-MM-DD (local date, deterministic)
  completed: boolean;
  completedAt?: string;  // ISO timestamp recorded at completion
  score?: number;        // 0–100 exercise score
  timeSpent?: number;    // seconds spent on this day's exercises
  attempts?: number;     // total answer attempts made
  errors?: number;       // incorrect answers
  accuracy?: number;     // 0–100 (correct / total × 100)
}

/** A single lesson’s progress, stored as a value in CourseProgressDoc.lessons. */
export interface LessonProgress {
  startedAt: string;   // YYYY-MM-DD (local date, immutable once set)
  days: DayEntry[];    // Always length 7
}

/** Full document at users/{uid}/courseProgress/{courseId}_{bookNumber}. */
export interface CourseProgressDoc {
  courseId: string;
  bookNumber: number;
  createdAt: string;   // YYYY-MM-DD (local date)
  updatedAt: any;      // Firestore Timestamp — for display/ordering only, never for logic
  /** Map keyed by string lesson number: "1" … "12" */
  lessons: Record<string, LessonProgress>;
}

/** Aggregated stats for one lesson, computed by rebuildLessonStats(). */
export interface LessonStats {
  fire: number;           // days completed on their unlock date
  ice: number;            // days completed after their unlock date
  diamonds: number;       // days with score === 100
  stars: number;          // fire + diamonds
  totalCompleted: number; // total days with completed === true
  sessions: number;       // semantic alias for totalCompleted
  avgTimeSpent: number;   // average seconds per completed session
  totalErrors: number;    // sum of errors across completed days
  totalAttempts: number;  // sum of attempts across completed days
  avgAccuracy: number;    // average accuracy 0–100 across completed days
}

/** All-zeros LessonStats — use as a safe default / fallback. */
export const EMPTY_STATS: LessonStats = {
  fire: 0, ice: 0, diamonds: 0, stars: 0, totalCompleted: 0,
  sessions: 0, avgTimeSpent: 0, totalErrors: 0, totalAttempts: 0, avgAccuracy: 0,
};

/** Accept the legacy literal `lessons.1` fields while all new writes use the map. */
export function normalizeCourseProgressDoc(raw: Record<string, any>): CourseProgressDoc {
  const lessons: Record<string, LessonProgress> = {
    ...(raw.lessons && typeof raw.lessons === 'object' ? raw.lessons : {}),
  };
  Object.entries(raw).forEach(([field, value]) => {
    if (!field.startsWith('lessons.') || !value || typeof value !== 'object') return;
    const lessonId = field.slice('lessons.'.length);
    if (!lessons[lessonId]) lessons[lessonId] = value as LessonProgress;
  });
  return { ...(raw as CourseProgressDoc), lessons };
}

// Kept for backward compatibility with adminEngine / meta subsystem
export type Language = 'en' | 'pt' | 'es' | 'el' | 'he';
export type GroupId = 'tuesday' | 'saturday' | string;
export type ResetScope = 'all' | 'language' | 'workbook';

export interface GroupConfig {
  groupId: GroupId;
  name: string;
  startDay: string;  // day-of-week name, e.g. 'tuesday'
  resetDay: string;
}

export interface UserMeta {
  group?: GroupId;
  currentLanguage?: Language;
  currentWorkbook?: number;
  currentLesson?: number;
  currentDay?: number;
}

// ─────────────────────────────────────────────────────────────
// Calendar helpers  (local time only, never UTC)
// ─────────────────────────────────────────────────────────────

/** Format a Date as YYYY-MM-DD using local time. */
function toLocalISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Today’s YYYY-MM-DD in local time. */
function todayLocalISO(): string {
  return toLocalISO(new Date());
}

/** Midnight of a given Date in local time. */
function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Add N calendar days in local time. */
function addLocalDays(date: Date, n: number): Date {
  const d = startOfLocalDay(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** True when a and b fall on the same local calendar date. */
function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/** Returns the Firestore document ID for a course + book. */
function cpDocId(courseId: string, bookNumber: number): string {
  return `${courseId}_${bookNumber}`;
}

// ─────────────────────────────────────────────────────────────
// Exported pure helpers
// ─────────────────────────────────────────────────────────────

/**
 * Build a fresh 7-day array anchored to a lesson’s startedAt (local) date.
 * Day 1 unlocks on startedAt; day N unlocks on startedAt + (N−1) days.
 * Exported so callers can preview the schedule without a Firestore round-trip.
 */
export function buildDays(startedAt: string): DayEntry[] {
  // All days unlock immediately on lesson start — no date-based delay.
  const startISO = toLocalISO(startOfLocalDay(new Date(startedAt)));
  return Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    unlockedAt: startISO,
    completed: false,
  }));
}

/**
 * Recompute lesson stats from raw day records.
 * Never trust cached aggregates — always derive fire/ice/diamonds from source data.
 *
 * fire:            day completed on its exact unlockedAt calendar date
 * ice:             day completed after its unlockedAt date
 * diamonds:        score === 100
 * stars:           fire + diamonds
 * totalCompleted:  days with completed === true
 */
export function rebuildLessonStats(lesson: LessonProgress): LessonStats {
  let fire = 0, ice = 0, diamonds = 0, totalCompleted = 0;
  let totalTimeSpent = 0, totalErrors = 0, totalAttempts = 0;
  let totalAccuracy = 0, accuracyCount = 0;

  for (const d of lesson.days) {
    if (!d.completed || !d.completedAt) continue;
    totalCompleted++;
    const completedDay = startOfLocalDay(new Date(d.completedAt));
    const unlockedDay  = startOfLocalDay(new Date(d.unlockedAt));
    if (isSameCalendarDay(completedDay, unlockedDay)) fire++;
    else ice++;
    if ((d.score ?? 0) === 100) diamonds++;
    if (d.timeSpent  !== undefined) totalTimeSpent += d.timeSpent;
    if (d.attempts   !== undefined) totalAttempts  += d.attempts;
    if (d.errors     !== undefined) totalErrors    += d.errors;
    if (d.accuracy   !== undefined) { totalAccuracy += d.accuracy; accuracyCount++; }
  }

  const stars        = fire + diamonds;
  const avgTimeSpent = totalCompleted > 0 ? Math.round(totalTimeSpent / totalCompleted) : 0;
  const avgAccuracy  = accuracyCount  > 0 ? Math.round(totalAccuracy  / accuracyCount)  : 0;

  const result: LessonStats = {
    fire, ice, diamonds, stars, totalCompleted,
    sessions: totalCompleted,
    avgTimeSpent, totalErrors, totalAttempts, avgAccuracy,
  };
  console.log('[REBUILD] stats:', result);
  return result;
}

/**
 * Return a safe 7-day array for a lesson.
 * If the stored array is missing or has the wrong length, rebuild it from
 * startedAt so the UI is never broken by a partial Firestore write.
 */
function guardDays(lesson: LessonProgress): DayEntry[] {
  if (!Array.isArray(lesson.days) || lesson.days.length !== 7) {
    console.warn('[UNLOCK] days array corrupt — rebuilding from startedAt:', lesson.startedAt);
    return buildDays(lesson.startedAt);
  }
  return lesson.days.map(d => ({
    day: d.day,
    unlockedAt: d.unlockedAt ?? '',
    completed: d.completed ?? false,
    ...(d.completedAt !== undefined && { completedAt: d.completedAt }),
    ...(d.score      !== undefined && { score:      d.score      }),
    ...(d.timeSpent  !== undefined && { timeSpent:  d.timeSpent  }),
    ...(d.attempts   !== undefined && { attempts:   d.attempts   }),
    ...(d.errors     !== undefined && { errors:     d.errors     }),
    ...(d.accuracy   !== undefined && { accuracy:   d.accuracy   }),
  }));
}

// ─────────────────────────────────────────────────────────────
// Public API — reads
// ─────────────────────────────────────────────────────────────

/** Read the full courseProgress document for a given course + book. */
export async function getCourseProgress(
  uid: string,
  courseId: string,
  bookNumber: number,
): Promise<CourseProgressDoc | null> {
  if (!db) return null;
  try {
    const ref = doc(db, `users/${uid}/courseProgress/${cpDocId(courseId, bookNumber)}`);
    const snap = await getDoc(ref);
    return snap.exists() ? normalizeCourseProgressDoc(snap.data()) : null;
  } catch (e) {
    console.error('[UNLOCK] getCourseProgress error:', e);
    return null;
  }
}

/** Read a single lesson’s progress record. Returns null if not yet started. */
export async function getLessonProgress(
  uid: string,
  courseId: string,
  bookNumber: number,
  lessonId: number,
): Promise<LessonProgress | null> {
  const cp = await getCourseProgress(uid, courseId, bookNumber);
  return cp?.lessons[String(lessonId)] ?? null;
}

// ─────────────────────────────────────────────────────────────
// Public API — writes
// ─────────────────────────────────────────────────────────────

/**
 * Ensure a lesson record exists in Firestore.
 * Called every time the user opens a lesson — idempotent if the lesson was already started.
 * Returns the existing or newly created LessonProgress.
 */
export async function ensureLessonStarted(
  uid: string,
  courseId: string,
  bookNumber: number,
  lessonId: number,
): Promise<LessonProgress | null> {
  if (!db) return null;
  const ref = doc(db, `users/${uid}/courseProgress/${cpDocId(courseId, bookNumber)}`);

  try {
    const snap = await getDoc(ref);
    const data = snap.exists() ? normalizeCourseProgressDoc(snap.data()) : null;
    const lessonKey = String(lessonId);

    // Idempotent: lesson already started — return existing record unchanged
    if (data?.lessons?.[lessonKey]) {
      console.log(`[UNLOCK] Lesson ${lessonId} already started for uid: ${uid}`);
      return data.lessons[lessonKey];
    }

    // startedAt is the LOCAL calendar date — immutable from this point on
    const startedAt = todayLocalISO();
    const newLesson: LessonProgress = { startedAt, days: buildDays(startedAt) };
    console.log(`[UNLOCK] Starting lesson ${lessonId} for uid: ${uid} — startedAt: ${startedAt}`);

    const patch: Record<string, unknown> = {
      lessons: { [lessonKey]: newLesson },
      updatedAt: serverTimestamp(),
    };

    if (!data) {
      // First lesson for this course + book — write document-level fields too
      patch.courseId = courseId;
      patch.bookNumber = bookNumber;
      patch.createdAt = startedAt;
    }

    await setDoc(ref, patch, { merge: true });
    return newLesson;
  } catch (e) {
    console.error('[UNLOCK] ensureLessonStarted error:', e);
    return null;
  }
}

/**
 * Mark a day as completed and persist atomically.
 *
 * Safety guarantees (all enforced inside the transaction):
 *   • Future days (unlockedAt > today) are rejected.
 *   • Already-completed days are skipped (idempotent).
 *   • Missing lesson / document is auto-initialised.
 *
 * Returns rebuilt LessonStats so the UI can update immediately.
 *
 * TODO: Remove weeklyProgress parallel writes after full migration.
 */
/** Optional per-day analytics to store alongside the completion. */
export interface DayAnalytics {
  timeSpent?: number;  // seconds
  attempts?: number;
  errors?: number;
  accuracy?: number;   // 0–100
}

export async function completeCourseDay(
  uid: string,
  courseId: string,
  bookNumber: number,
  lessonId: number,
  dayIndex: number,   // 1-based
  score: number,
  analytics?: DayAnalytics,
): Promise<{ success: boolean; stats: LessonStats }> {

  if (!db) {
    console.error('[SAVE] Firestore not initialised');
    return { success: false, stats: { ...EMPTY_STATS } };
  }

  const lessonKey = String(lessonId);
  const ref = doc(db, `users/${uid}/courseProgress/${cpDocId(courseId, bookNumber)}`);

  console.log('[SAVE] completeCourseDay — uid:', uid, '| courseId:', courseId,
              '| book:', bookNumber, '| lesson:', lessonId, '| day:', dayIndex, '| score:', score);

  let resultStats: LessonStats = { ...EMPTY_STATS };

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const today = todayLocalISO();

      // ─ Auto-init document if missing ─
      let data: CourseProgressDoc;
      if (!snap.exists()) {
        console.warn('[SAVE] courseProgress document missing — auto-initialising');
        data = {
          courseId, bookNumber,
          createdAt: today, updatedAt: serverTimestamp(),
          lessons: {},
        };
      } else {
        data = normalizeCourseProgressDoc(snap.data());
      }

      // ─ Auto-init lesson if missing ─
      const lesson: LessonProgress = data.lessons[lessonKey]
        ?? { startedAt: today, days: buildDays(today) };

      const safeDays = guardDays(lesson);
      const idx = dayIndex - 1;  // convert to 0-based array index

      if (idx < 0 || idx >= safeDays.length) {
        throw new Error(`[SAVE] Invalid dayIndex: ${dayIndex}`);
      }

      const day = safeDays[idx];

      // ─ Idempotency: do not overwrite a completed day ─
      if (day.completed) {
        console.log(`[SAVE] Day ${dayIndex} already completed — skipping write`);
        resultStats = rebuildLessonStats({ ...lesson, days: safeDays });
        return;
      }

      const updatedDay: DayEntry = {
        ...day,
        completed: true,
        completedAt: new Date().toISOString(),
        score,
        ...(analytics?.timeSpent !== undefined && { timeSpent: analytics.timeSpent }),
        ...(analytics?.attempts  !== undefined && { attempts:  analytics.attempts  }),
        ...(analytics?.errors    !== undefined && { errors:    analytics.errors    }),
        ...(analytics?.accuracy  !== undefined && { accuracy:  analytics.accuracy  }),
      };

      console.log(`[COMPLETE] day ${dayIndex}: score=${score}, unlockedAt=${day.unlockedAt}`);

      const updatedDays = safeDays.map((d, i) => (i === idx ? updatedDay : d));
      const updatedLesson: LessonProgress = { ...lesson, days: updatedDays };

      resultStats = rebuildLessonStats(updatedLesson);
      console.log('[COMPLETE] rebuilt stats:', resultStats);

      tx.set(ref, {
        lessons: { [lessonKey]: updatedLesson },
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });

    console.log('[SAVE] courseProgress persisted ✓');
    return { success: true, stats: resultStats };
  } catch (e: any) {
    const msg: string = e?.message ?? String(e);
    // Business-rule rejections are not errors — return gracefully
    if (msg.includes('cannot complete before')) {
      return { success: false, stats: { ...EMPTY_STATS } };
    }
    console.error('[SAVE ERROR] completeCourseDay transaction failed:', e);
    return { success: false, stats: { ...EMPTY_STATS } };
  }
}

/**
 * Aggregate cumulative stats across ALL courseProgress subcollection documents for a user.
 *
 * Unlike completeCourseDay() which returns per-lesson stats, this function reads
 * every courseProgress document (one per courseId+bookNumber) and sums all lesson
 * stats together — giving the true lifetime totals for fire, ice, diamonds, stars,
 * sessions (days completed), accuracy, etc.
 *
 * This is the canonical source for the flat `progress/{uid}` ranking fields so that
 * ranking is never reset when the student moves from one lesson/workbook to the next.
 *
 * Returns EMPTY_STATS if Firestore is unavailable or the user has no data yet.
 */
export async function getCumulativeUserStats(uid: string): Promise<LessonStats> {
  if (!db) return { ...EMPTY_STATS };
  try {
    const [cpSnap, flatSnapshot] = await Promise.all([
      getDocs(collection(db!, `users/${uid}/courseProgress`)),
      getDoc(doc(db!, 'progress', uid)),
    ]);
    const completedDays = new Map<string, DayEntry>();

    for (const cpDoc of cpSnap.docs) {
      const cpData = normalizeCourseProgressDoc(cpDoc.data());
      for (const [lessonId, lesson] of Object.entries(cpData.lessons ?? {})) {
        if (!lesson || !Array.isArray(lesson.days)) continue;
        lesson.days.forEach((day) => {
          if (!day.completed) return;
          const id = `${cpData.courseId}:wb${cpData.bookNumber}_l${lessonId}_d${day.day}`;
          completedDays.set(id, day);
        });
      }
    }

    const flatData = flatSnapshot.data() ?? {};
    const legacyCourseId = typeof flatData.courseId === 'string' ? flatData.courseId : 'legacy';
    getCompletedActivityRecords(flatData).forEach((activity) => {
      const id = `${legacyCourseId}:${activity.id}`;
      if (completedDays.has(id)) return;
      completedDays.set(id, {
        day: Number(activity.id.match(/_d(\d+)$/)?.[1] ?? 0),
        unlockedAt: '',
        completed: true,
        completedAt: activity.completedAt as string | undefined,
        score: activity.score,
        attempts: activity.attempts ?? activity.totalQuestions,
        errors: activity.errors ?? (
          typeof activity.totalQuestions === 'number' && typeof activity.correctAnswers === 'number'
            ? Math.max(0, activity.totalQuestions - activity.correctAnswers)
            : undefined
        ),
        accuracy: typeof activity.accuracy === 'number'
          ? (activity.accuracy <= 1 ? activity.accuracy * 100 : activity.accuracy)
          : undefined,
      });
    });

    let fire = 0, ice = 0, diamonds = 0, totalTimeSpent = 0, totalErrors = 0, totalAttempts = 0;
    let accuracyTotal = 0, accuracyCount = 0;
    completedDays.forEach((day) => {
      if (day.completedAt && day.unlockedAt) {
        if (isSameCalendarDay(new Date(day.completedAt), new Date(day.unlockedAt))) fire++;
        else ice++;
      }
      if ((day.score ?? 0) === 100) diamonds++;
      totalTimeSpent += day.timeSpent ?? 0;
      totalErrors += day.errors ?? 0;
      totalAttempts += day.attempts ?? 0;
      if (typeof day.accuracy === 'number') {
        accuracyTotal += day.accuracy;
        accuracyCount++;
      }
    });

    const totalCompleted = completedDays.size;
    const stars = fire + diamonds;
    const avgTimeSpent = totalCompleted > 0 ? Math.round(totalTimeSpent / totalCompleted) : 0;
    const avgAccuracy = accuracyCount > 0 ? Math.round(accuracyTotal / accuracyCount) : 0;

    return { fire, ice, diamonds, stars, totalCompleted, sessions: totalCompleted,
             avgTimeSpent, totalErrors, totalAttempts, avgAccuracy };
  } catch (e) {
    console.error('[CumulativeStats] getCumulativeUserStats failed for uid:', uid, e);
    return { ...EMPTY_STATS };
  }
}

/** Get aggregated stats for a lesson (convenience wrapper). */
export async function getLessonStats(
  uid: string,
  courseId: string,
  bookNumber: number,
  lessonId: number,
): Promise<LessonStats> {
  const lesson = await getLessonProgress(uid, courseId, bookNumber, lessonId);
  if (!lesson) return { ...EMPTY_STATS };
  return rebuildLessonStats(lesson);
}

// ─────────────────────────────────────────────────────────────
// User meta (group, current position)
// ─────────────────────────────────────────────────────────────

export async function getUserMeta(uid: string): Promise<UserMeta | null> {
  if (!db) return null;
  try {
    const ref = doc(db, `users/${uid}/meta/status`);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as UserMeta) : null;
  } catch (e) {
    console.error('[DB] getUserMeta error:', e);
    return null;
  }
}

export async function setUserMeta(uid: string, meta: Partial<UserMeta>): Promise<void> {
  if (!db) return;
  try {
    const ref = doc(db, `users/${uid}/meta/status`);
    await setDoc(ref, meta, { merge: true });
    console.log('[DB] UserMeta updated:', uid, meta);
  } catch (e) {
    console.error('[DB] setUserMeta error:', e);
  }
}

// ─────────────────────────────────────────────────────────────
// Group config
// ─────────────────────────────────────────────────────────────

export async function getGroupConfig(groupId: GroupId): Promise<GroupConfig | null> {
  if (!db) return null;
  try {
    const ref = doc(db, `groups/${groupId}`);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as GroupConfig) : null;
  } catch (e) {
    console.error('[DB] getGroupConfig error:', e);
    return null;
  }
}

export async function setGroupConfig(config: GroupConfig): Promise<void> {
  if (!db) return;
  try {
    const ref = doc(db, `groups/${config.groupId}`);
    await setDoc(ref, config, { merge: true });
    console.log('[DB] GroupConfig saved:', config.groupId);
  } catch (e) {
    console.error('[DB] setGroupConfig error:', e);
  }
}

/**
 * Check whether today is on or after the group’s startDay.
 * Used to gate Day 1 access for scheduled classes.
 */
const DOW = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export function canStartLesson(group: GroupConfig): boolean {
  const startIdx = DOW.indexOf(group.startDay.toLowerCase() as typeof DOW[number]);
  if (startIdx === -1) return true;
  return new Date().getDay() >= startIdx;
}

// ─────────────────────────────────────────────────────────────
// Admin dashboard query
// ─────────────────────────────────────────────────────────────

export interface UserProgressSummary {
  uid: string;
  /** Real account role read from users/{uid}; never inferred from class membership. */
  role?: 'student' | 'teacher' | 'admin';
  displayName?: string;
  email?: string;
  group?: GroupId;
  totalStars: number;
  totalFire: number;
  totalIce: number;
  totalDiamonds: number;
  lessonsStarted: number;
  daysCompleted: number;
  totalTimeSpent: number;  // total seconds across all days
  timeSpentToday?: number; // total seconds completed today
  totalErrors: number;
  totalAttempts: number;
  avgAccuracy: number;     // weighted average 0–100
  // Learning position — populated from users/{uid}/meta/status
  currentWorkbook?: number;
  currentLesson?: number;
  currentDay?: number;
  lastLessonId?: string;
  // Last activity — populated from users/{uid}.lastActive
  lastActivity?: any;      // Firestore Timestamp or ISO string
  /** Canonical durable pedagogical marker used by the Student Report. */
  lastPedagogicalActivity?: any;
  /** Latest persisted pedagogical event on an earlier Sao Paulo civil day. */
  previousPedagogicalActivity?: any;
  /** Durable live classroom sessions, explicitly separate from autonomous study. */
  liveAttendance?: import('../models/liveAttendance').LiveAttendanceRecord[];
  // ── Course / language context (for per-course ranking) ──────────────────
  // IMPORTANT: ranking must always be filtered by courseId — students should
  // only compete with others studying the same language/course.
  /** The course this summary belongs to (matches Course.id, e.g. 'english-native'). */
  courseId?: string;
  /** ISO 639-1 language code of the course ('en', 'pt', 'es', 'el', 'he'). */
  languageCode?: string;
  /** Optional study profile describing the student's enrolment/access type. */
  studyProfile?: import('../types').StudentStudyProfile;
  /** Tests data (placement + lesson tests) from progress/{uid}.tests */
  tests?: import('../types').UserTestData;
  /**
   * Active courses map — keyed by courseId.
   * Populated on every real activity (exercise completion, placement test).
   * Used by the ranking system and PDF to show per-course progress.
   */
  courses?: Record<string, import('../types').ActiveCourse>;
}

/**
 * Fetch a progress summary for every user (teacher dashboard).
 * Reads /users + each user’s courseProgress subcollection.
 */
export async function getAllUserProgressSummaries(): Promise<UserProgressSummary[]> {
  if (!db) return [];
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const summaries = await Promise.all(
      usersSnap.docs.map(async (userDoc) => {
        const uid = userDoc.id;
        const userData = userDoc.data();

        // Flat dashboard doc (progress/{uid}) is written by the student app on
        // every completion. Use it to stabilise sessions/accuracy/position.
        let flatProgress: Record<string, any> = {};
        try {
          const flatSnap = await getDoc(doc(db!, 'progress', uid));
          flatProgress = flatSnap.exists() ? (flatSnap.data() as Record<string, any>) : {};
        } catch { /* no flat progress — keep defaults */ }

        // Main progress doc is the student's navigation source-of-truth.
        let mainProgress: Record<string, any> = {};
        try {
          const mainSnap = await getDoc(doc(db!, `users/${uid}/courseProgress/main`));
          mainProgress = mainSnap.exists() ? (mainSnap.data() as Record<string, any>) : {};
        } catch { /* no main progress — keep defaults */ }

        let metaGroup: GroupId | undefined;
        let metaWorkbook: number | undefined;
        let metaLesson: number  | undefined;
        let metaDay:    number  | undefined;
        try {
          const metaSnap = await getDoc(doc(db!, `users/${uid}/meta/status`));
          const metaData = metaSnap.data();
          metaGroup    = metaData?.group;
          metaWorkbook = metaData?.currentWorkbook;
          metaLesson   = metaData?.currentLesson;
          metaDay      = metaData?.currentDay;
        } catch { /* no meta — skip */ }

        const todayKey = new Date().toISOString().slice(0, 10);

        let totalFire = 0, totalIce = 0, totalDiamonds = 0;
        let lessonsStarted = 0, daysCompleted = 0;
        let totalTimeSpent = 0, timeSpentToday = 0, totalErrors = 0, totalAttempts = 0;
        let accSum = 0, accCount = 0;

        try {
          const cpSnap = await getDocs(collection(db!, `users/${uid}/courseProgress`));
          for (const cpDoc of cpSnap.docs) {
            const cpData = normalizeCourseProgressDoc(cpDoc.data());
            for (const lesson of Object.values(cpData.lessons ?? {})) {
              lessonsStarted++;
              const stats = rebuildLessonStats(lesson);
              totalFire        += stats.fire;
              totalIce         += stats.ice;
              totalDiamonds    += stats.diamonds;
              daysCompleted    += stats.totalCompleted;
              // Reverse-engineer total time from average
              totalTimeSpent   += stats.avgTimeSpent * stats.totalCompleted;
              totalErrors      += stats.totalErrors;
              totalAttempts    += stats.totalAttempts;
              if (stats.avgAccuracy > 0) { accSum += stats.avgAccuracy; accCount++; }

              // Precise "today" time from per-day records when available.
              for (const day of lesson.days ?? []) {
                if (!day.completedAt || typeof day.timeSpent !== 'number') continue;
                if (day.completedAt.slice(0, 10) === todayKey) {
                  timeSpentToday += day.timeSpent;
                }
              }
            }
          }
        } catch { /* no courseProgress — skip */ }

        const dashboardCompletedExercises = getUniqueCompletedActivityCount(flatProgress) || daysCompleted;
        const answerMetrics = deriveDashboardAnswerMetrics({
          ...flatProgress,
          totalAttempts: flatProgress.totalAttempts ?? totalAttempts,
          totalErrors: flatProgress.totalErrors ?? totalErrors,
          avgAccuracy: flatProgress.avgAccuracy ?? (accCount > 0 ? Math.round(accSum / accCount) : 0),
        });
        const rewardMetrics = deriveDashboardRewardMetrics({
          ...flatProgress,
          totalFire: flatProgress.totalFire ?? totalFire,
          totalDiamonds: flatProgress.totalDiamonds ?? totalDiamonds,
          totalStars: flatProgress.totalStars ?? (totalFire + totalDiamonds),
        });

        const dashboardWorkbook =
          typeof mainProgress.currentWorkbook === 'number'
            ? mainProgress.currentWorkbook
            : (typeof mainProgress.workbook === 'number'
                ? mainProgress.workbook
                : (typeof flatProgress.currentWorkbook === 'number'
                    ? flatProgress.currentWorkbook
                    : flatProgress.workbook))
            ?? metaWorkbook;

        const dashboardLesson =
          typeof mainProgress.currentLesson === 'number'
            ? mainProgress.currentLesson
            : (typeof mainProgress.lesson === 'number'
                ? mainProgress.lesson
                : (typeof flatProgress.currentLesson === 'number'
                    ? flatProgress.currentLesson
                    : flatProgress.lesson))
            ?? metaLesson;

        const resolvedLesson = dashboardLesson;

        const dashboardDay =
          typeof mainProgress.currentDay === 'number'
            ? mainProgress.currentDay
            : (typeof flatProgress.currentDay === 'number'
                ? flatProgress.currentDay
                : metaDay);

        const extractCompletedIdsFromMain = (): string[] => {
          const daysMap = mainProgress.days;
          if (!daysMap || typeof daysMap !== 'object') return [];
          return Object.keys(daysMap).filter((k) => (daysMap as Record<string, unknown>)[k] === true);
        };

        const extractCompletedIdsFromFlat = (): string[] => {
          return getCompletedActivityRecords(flatProgress).map((activity) => activity.id);
        };

        const completedIds = Array.from(new Set([
          ...extractCompletedIdsFromMain(),
          ...extractCompletedIdsFromFlat(),
        ]));

        const wbForPosition = dashboardWorkbook ?? 1;
        const lessonForPosition = resolvedLesson ?? 1;

        const completedDaysInCurrentLesson = completedIds
          .map((id) => {
            const m = /^wb(\d+)_l(\d+)_d(\d+)$/.exec(id);
            if (!m) return null;
            const wb = Number(m[1]);
            const ls = Number(m[2]);
            const dy = Number(m[3]);
            if (wb !== wbForPosition || ls !== lessonForPosition) return null;
            return dy;
          })
          .filter((v): v is number => Number.isFinite(v));

        const maxCompletedInCurrentLesson =
          completedDaysInCurrentLesson.length > 0
            ? Math.max(...completedDaysInCurrentLesson)
            : 0;

        const fallbackFromNextPointer =
          typeof dashboardDay === 'number' && dashboardDay > 1
            ? dashboardDay - 1
            : 0;

        const dashboardLastCompletedDay =
          maxCompletedInCurrentLesson > 0
            ? maxCompletedInCurrentLesson
            : (fallbackFromNextPointer > 0 ? fallbackFromNextPointer : 1);

        const dashboardTotalTimeSpent =
          typeof flatProgress.totalTimeSpent === 'number' && flatProgress.totalTimeSpent > 0
            ? flatProgress.totalTimeSpent
            : Math.round(totalTimeSpent);

        const dashboardTimeSpentToday =
          typeof flatProgress.timeSpentToday === 'number' && flatProgress.timeSpentToday >= 0
            ? flatProgress.timeSpentToday
            : Math.round(timeSpentToday);

        return {
          uid,
          role: userData.role === 'student' || userData.role === 'teacher' || userData.role === 'admin'
            ? userData.role
            : undefined,
          displayName: flatProgress.displayName ?? userData.displayName ?? userData.name,
          email: flatProgress.email ?? userData.email,
          group: metaGroup,
          totalStars: rewardMetrics.totalStars,
          totalFire: rewardMetrics.totalFire,
          totalIce,
          totalDiamonds: rewardMetrics.totalDiamonds,
          lessonsStarted,
          daysCompleted: dashboardCompletedExercises,
          totalTimeSpent: dashboardTotalTimeSpent,
          timeSpentToday: dashboardTimeSpentToday,
          totalErrors: answerMetrics.totalErrors,
          totalAttempts: answerMetrics.totalAttempts,
          avgAccuracy: answerMetrics.avgAccuracy,
          currentWorkbook: dashboardWorkbook,
          currentLesson:   resolvedLesson,
          currentDay:      dashboardLastCompletedDay,
          lastLessonId:    typeof flatProgress.lastLesson === 'string' ? flatProgress.lastLesson : undefined,
          lastActivity:    getLastPedagogicalActivity(flatProgress),
          lastPedagogicalActivity: flatProgress.lastPedagogicalActivityAt,
          previousPedagogicalActivity: getPreviousPedagogicalActivity(
            flatProgress,
            flatProgress.lastPedagogicalActivityAt,
          ),
          tests:           flatProgress.tests ?? undefined,
        } as UserProgressSummary;
      })
    );
    return summaries;
  } catch (e) {
    console.error('[DB] getAllUserProgressSummaries error:', e);
    return [];
  }
}
