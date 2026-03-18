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
  fire: number;          // days completed on their unlock date
  ice: number;           // days completed after their unlock date
  diamonds: number;      // days with score === 100
  stars: number;         // fire + diamonds
  totalCompleted: number;
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
  const base = startOfLocalDay(new Date(startedAt));
  return Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    unlockedAt: toLocalISO(addLocalDays(base, i)),
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
  for (const d of lesson.days) {
    if (!d.completed || !d.completedAt) continue;
    totalCompleted++;
    const completedDay = startOfLocalDay(new Date(d.completedAt));
    const unlockedDay = startOfLocalDay(new Date(d.unlockedAt));
    if (isSameCalendarDay(completedDay, unlockedDay)) {
      fire++;
    } else {
      ice++;
    }
    if ((d.score ?? 0) === 100) diamonds++;
  }
  const stars = fire + diamonds;
  console.log('[REBUILD] stats:', { fire, ice, diamonds, stars, totalCompleted });
  return { fire, ice, diamonds, stars, totalCompleted };
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
    ...(d.score    !== undefined && { score: d.score }),
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
    return snap.exists() ? (snap.data() as CourseProgressDoc) : null;
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
    const data = snap.exists() ? (snap.data() as CourseProgressDoc) : null;
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
      [`lessons.${lessonKey}`]: newLesson,
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
export async function completeCourseDay(
  uid: string,
  courseId: string,
  bookNumber: number,
  lessonId: number,
  dayIndex: number,  // 1-based
  score: number,
): Promise<{ success: boolean; stats: LessonStats }> {
  const zeroStats: LessonStats = { fire: 0, ice: 0, diamonds: 0, stars: 0, totalCompleted: 0 };

  if (!db) {
    console.error('[SAVE] Firestore not initialised');
    return { success: false, stats: zeroStats };
  }

  const lessonKey = String(lessonId);
  const ref = doc(db, `users/${uid}/courseProgress/${cpDocId(courseId, bookNumber)}`);

  console.log('[SAVE] completeCourseDay — uid:', uid, '| courseId:', courseId,
              '| book:', bookNumber, '| lesson:', lessonId, '| day:', dayIndex, '| score:', score);

  let resultStats = zeroStats;

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
        data = snap.data() as CourseProgressDoc;
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

      // ─ Guard: future days are not yet accessible ─
      if (day.unlockedAt > today) {
        const msg = `Day ${dayIndex} unlocks on ${day.unlockedAt} — cannot complete before then`;
        console.warn('[SAVE]', msg);
        throw new Error(msg);
      }

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
      };

      console.log(`[COMPLETE] day ${dayIndex}: score=${score}, unlockedAt=${day.unlockedAt}`);

      const updatedDays = safeDays.map((d, i) => (i === idx ? updatedDay : d));
      const updatedLesson: LessonProgress = { ...lesson, days: updatedDays };

      resultStats = rebuildLessonStats(updatedLesson);
      console.log('[COMPLETE] rebuilt stats:', resultStats);

      tx.set(ref, {
        [`lessons.${lessonKey}`]: updatedLesson,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });

    console.log('[SAVE] courseProgress persisted ✓');
    return { success: true, stats: resultStats };
  } catch (e: any) {
    const msg: string = e?.message ?? String(e);
    // Business-rule rejections are not errors — return gracefully
    if (msg.includes('cannot complete before')) {
      return { success: false, stats: zeroStats };
    }
    console.error('[SAVE ERROR] completeCourseDay transaction failed:', e);
    return { success: false, stats: zeroStats };
  }
}

/** Get aggregated stats for a lesson (convenience wrapper). */
export async function getLessonStats(
  uid: string,
  courseId: string,
  bookNumber: number,
  lessonId: number,
): Promise<LessonStats> {
  const zero: LessonStats = { fire: 0, ice: 0, diamonds: 0, stars: 0, totalCompleted: 0 };
  const lesson = await getLessonProgress(uid, courseId, bookNumber, lessonId);
  if (!lesson) return zero;
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
  displayName?: string;
  email?: string;
  group?: GroupId;
  totalStars: number;
  totalFire: number;
  totalIce: number;
  totalDiamonds: number;
  lessonsStarted: number;
  daysCompleted: number;
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

        let metaGroup: GroupId | undefined;
        try {
          const metaSnap = await getDoc(doc(db!, `users/${uid}/meta/status`));
          metaGroup = metaSnap.data()?.group;
        } catch { /* no meta — skip */ }

        let totalFire = 0, totalIce = 0, totalDiamonds = 0;
        let lessonsStarted = 0, daysCompleted = 0;

        try {
          const cpSnap = await getDocs(collection(db!, `users/${uid}/courseProgress`));
          for (const cpDoc of cpSnap.docs) {
            const cpData = cpDoc.data() as CourseProgressDoc;
            // lessons is a Record<string, LessonProgress>
            for (const lesson of Object.values(cpData.lessons ?? {})) {
              lessonsStarted++;
              const stats = rebuildLessonStats(lesson);
              totalFire     += stats.fire;
              totalIce      += stats.ice;
              totalDiamonds += stats.diamonds;
              daysCompleted += stats.totalCompleted;
            }
          }
        } catch { /* no courseProgress — skip */ }

        return {
          uid,
          displayName: userData.displayName ?? userData.name,
          email: userData.email,
          group: metaGroup,
          totalStars: totalFire + totalDiamonds,
          totalFire,
          totalIce,
          totalDiamonds,
          lessonsStarted,
          daysCompleted,
        } as UserProgressSummary;
      })
    );
    return summaries;
  } catch (e) {
    console.error('[DB] getAllUserProgressSummaries error:', e);
    return [];
  }
}
