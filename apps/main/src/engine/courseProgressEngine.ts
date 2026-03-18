/**
 * courseProgressEngine.ts
 *
 * Scalable progress tracking for the language learning app.
 *
 * Firestore layout (NEW — does NOT replace existing weeklyProgress):
 *
 *   users/{uid}/courseProgress/{language}_{workbook}
 *     startedAt, lastUpdated, language, workbook
 *     lessons: [
 *       { lessonId, unlockedAt, days: [{ dayNumber, unlockedAt, completedAt, completed, score, diamond, fire, ice }] }
 *     ]
 *
 *   groups/{groupId}
 *     resetDay, startDay, name
 *
 *   users/{uid}/meta
 *     group, currentLanguage, currentWorkbook, currentLesson, currentDay
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
// Types
// ─────────────────────────────────────────────────────────────

export type Language = 'en' | 'pt' | 'es' | 'el' | 'he';
export type GroupId = 'tuesday' | 'saturday' | string;
export type ResetScope = 'all' | 'language' | 'workbook';

export interface DayRecord {
  dayNumber: number;       // 1–7
  unlockedAt: string;      // ISO date string — when this day became available
  completedAt: string | null;
  completed: boolean;
  score: number | null;    // 0–100 exercise score
  diamond: boolean;        // score === 100
  fire: boolean;           // completed on the same calendar day as unlockedAt
  ice: boolean;            // completed late (after unlockedAt day)
}

export interface LessonRecord {
  lessonId: number;        // 1–12
  unlockedAt: string;      // ISO datetime of when lesson was started
  days: DayRecord[];
}

export interface CourseProgressDoc {
  language: Language;
  workbook: number;
  startedAt: any;          // serverTimestamp
  lastUpdated: any;        // serverTimestamp
  lessons: LessonRecord[];
}

export interface WeekScores {
  fire: number;
  ice: number;
  diamonds: number;
  stars: number;           // fire + diamonds
  totalDays: number;       // completed day count
}

export interface GroupConfig {
  groupId: GroupId;
  name: string;
  startDay: string;        // e.g. 'tuesday', 'saturday'
  resetDay: string;        // e.g. 'monday', 'friday'
}

export interface UserMeta {
  group?: GroupId;
  currentLanguage?: Language;
  currentWorkbook?: number;
  currentLesson?: number;
  currentDay?: number;
}

// ─────────────────────────────────────────────────────────────
// Calendar / time helpers  (local time, not UTC)
// ─────────────────────────────────────────────────────────────

/** Returns midnight of the given date in local time */
function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Add N calendar days to a date (local time) */
function addLocalDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

/** True when two dates fall on the same calendar day in local time */
function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/** ISO date string (YYYY-MM-DD) for the current local day */
function todayLocalISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function courseDocId(language: Language, workbook: number): string {
  return `${language}_${workbook}`;
}

/**
 * Build a 7-day array anchored to the lesson's startedAt date.
 * Day 1 unlocks on startedAt, day 2 = startedAt + 1, etc.
 * Using local midnight ensures unlock schedule matches the user's clock.
 */
function buildDays(lessonStartedAt: string): DayRecord[] {
  const base = startOfLocalDay(new Date(lessonStartedAt));
  return Array.from({ length: 7 }, (_, i) => {
    const unlockDate = addLocalDays(base, i);
    const unlockISO = `${unlockDate.getFullYear()}-${String(unlockDate.getMonth() + 1).padStart(2, '0')}-${String(unlockDate.getDate()).padStart(2, '0')}`;
    console.log(`[UNLOCK] day ${i + 1} unlockedAt: ${unlockISO}`);
    return {
      dayNumber: i + 1,
      unlockedAt: unlockISO,         // YYYY-MM-DD local date
      completedAt: null,
      completed: false,
      score: null,
      diamond: false,
      fire: false,
      ice: false,
    };
  });
}

/** Guard: ensure a lesson's days array is intact (7 entries with required fields). */
function guardDays(lesson: LessonRecord): DayRecord[] {
  const startedAt = lesson.unlockedAt ?? new Date().toISOString();
  if (!Array.isArray(lesson.days) || lesson.days.length !== 7) {
    console.warn('[UNLOCK] days array invalid — rebuilding from startedAt:', startedAt);
    return buildDays(startedAt);
  }
  // Ensure every day has required boolean/nullable fields
  return lesson.days.map(d => ({
    dayNumber: d.dayNumber,
    unlockedAt: d.unlockedAt ?? '',
    completedAt: d.completedAt ?? null,
    completed: d.completed ?? false,
    score: d.score ?? null,
    diamond: d.diamond ?? false,
    fire: d.fire ?? false,
    ice: d.ice ?? false,
  }));
}

/**
 * Recompute fire/ice/diamond/stars by iterating stored day records.
 * NEVER trust pre-aggregated totals — always rebuild from source.
 */
export function rebuildLessonStats(days: DayRecord[]): WeekScores {
  let fire = 0, ice = 0, diamonds = 0, totalDays = 0;
  for (const d of days) {
    if (d.fire) fire++;
    if (d.ice) ice++;
    if (d.diamond) diamonds++;
    if (d.completed) totalDays++;
  }
  const stars = fire + diamonds;
  console.log('[REBUILD] totals:', { fire, ice, diamonds, stars, totalDays });
  return { fire, ice, diamonds, stars, totalDays };
}

// ─────────────────────────────────────────────────────────────
// Course progress — read
// ─────────────────────────────────────────────────────────────

export async function getCourseProgress(
  uid: string,
  language: Language,
  workbook: number,
): Promise<CourseProgressDoc | null> {
  if (!db) return null;
  try {
    const ref = doc(db, `users/${uid}/courseProgress/${courseDocId(language, workbook)}`);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as CourseProgressDoc) : null;
  } catch (e) {
    console.error('[UNLOCK] getCourseProgress error:', e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Course progress — ensure lesson + day 1 exist
// ─────────────────────────────────────────────────────────────

/**
 * Called when the user opens a lesson for the first time.
 * Creates the lesson record and unlocks day 1 immediately.
 * Subsequent days unlock midnight after the previous day.
 */
export async function ensureLessonStarted(
  uid: string,
  language: Language,
  workbook: number,
  lessonId: number,
): Promise<CourseProgressDoc | null> {
  if (!db) return null;

  const docId = courseDocId(language, workbook);
  const ref = doc(db, `users/${uid}/courseProgress/${docId}`);

  try {
    const snap = await getDoc(ref);
    const existing = snap.exists() ? (snap.data() as CourseProgressDoc) : null;
    const lessons: LessonRecord[] = existing?.lessons ?? [];

    const alreadyExists = lessons.some(l => l.lessonId === lessonId);
    if (alreadyExists) {
      console.log(`[UNLOCK] Lesson ${lessonId} already started for ${uid}`);
      return existing;
    }

    // Use a real local-time ISO string so buildDays can anchor unlock dates
    const lessonStartedAt = new Date().toISOString();
    const newLesson: LessonRecord = {
      lessonId,
      unlockedAt: lessonStartedAt,
      days: buildDays(lessonStartedAt),
    };

    const updatedLessons = [...lessons, newLesson].sort((a, b) => a.lessonId - b.lessonId);

    const updatedDoc: Partial<CourseProgressDoc> = {
      language,
      workbook,
      lastUpdated: serverTimestamp(),
      lessons: updatedLessons,
    };

    if (!existing) {
      (updatedDoc as CourseProgressDoc).startedAt = serverTimestamp();
    }

    await setDoc(ref, updatedDoc, { merge: true });
    console.log(`[UNLOCK] Lesson ${lessonId} started. lessonStartedAt: ${lessonStartedAt}`);

    const updated = await getDoc(ref);
    return updated.data() as CourseProgressDoc;
  } catch (e) {
    console.error('[UNLOCK] ensureLessonStarted error:', e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Day completion
// ─────────────────────────────────────────────────────────────

/**
 * Mark a day as completed and persist to Firestore.
 * Wrapped in a Firestore transaction to prevent race conditions and double-completions.
 * Returns updated WeekScores (rebuilt from stored data) for immediate UI use.
 *
 * TODO: Remove weeklyProgress reads after full migration to courseProgress.
 */
export async function completeCourseDay(
  uid: string,
  language: Language,
  workbook: number,
  lessonId: number,
  dayNumber: number,
  exerciseScore: number,
): Promise<{ success: boolean; scores: WeekScores }> {
  const zeroScores: WeekScores = { fire: 0, ice: 0, diamonds: 0, stars: 0, totalDays: 0 };

  if (!db) {
    console.error('[SAVE] db is null — Firestore not initialized');
    return { success: false, scores: zeroScores };
  }

  const docId = courseDocId(language, workbook);
  const ref = doc(db, `users/${uid}/courseProgress/${docId}`);

  console.log('[SAVE] userId:', uid);
  console.log('[SAVE] courseDocId:', docId, '| lessonId:', lessonId, '| dayNumber:', dayNumber);
  console.log('[SAVE] exerciseScore:', exerciseScore);

  let resultScores = zeroScores;

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);

      // Auto-init if doc is missing inside transaction
      let data: CourseProgressDoc;
      if (!snap.exists()) {
        console.warn('[SAVE] courseProgress doc missing — initialising inside transaction');
        const lessonStartedAt = new Date().toISOString();
        data = {
          language,
          workbook,
          startedAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          lessons: [{
            lessonId,
            unlockedAt: lessonStartedAt,
            days: buildDays(lessonStartedAt),
          }],
        };
      } else {
        data = snap.data() as CourseProgressDoc;
      }

      let lessonIdx = data.lessons.findIndex(l => l.lessonId === lessonId);
      if (lessonIdx === -1) {
        // Lesson not found — append it
        const lessonStartedAt = new Date().toISOString();
        data = {
          ...data,
          lessons: [...data.lessons, {
            lessonId,
            unlockedAt: lessonStartedAt,
            days: buildDays(lessonStartedAt),
          }].sort((a, b) => a.lessonId - b.lessonId),
        };
        lessonIdx = data.lessons.findIndex(l => l.lessonId === lessonId);
      }

      const lesson = data.lessons[lessonIdx];
      const sanitisedDays = guardDays(lesson);  // safety guard
      const dayIdx = dayNumber - 1;

      if (dayIdx < 0 || dayIdx >= sanitisedDays.length) {
        console.error('[SAVE] Invalid dayNumber:', dayNumber);
        throw new Error(`Invalid dayNumber: ${dayNumber}`);
      }

      const day = sanitisedDays[dayIdx];

      // Calendar-day fire/ice using LOCAL time (not UTC)
      const now = new Date();
      const unlockedDate = new Date(day.unlockedAt); // YYYY-MM-DD parses to local midnight in most envs
      const fireEarned = isSameCalendarDay(now, unlockedDate);
      const iceEarned = !fireEarned;
      const diamond = exerciseScore === 100;

      console.log(`[COMPLETE] dayNumber: ${dayNumber}, fire: ${fireEarned}, ice: ${iceEarned}, diamond: ${diamond}`);

      const updatedDay: DayRecord = {
        ...day,
        completedAt: now.toISOString(),
        completed: true,
        score: exerciseScore,
        diamond,
        fire: fireEarned,
        ice: iceEarned,
      };

      const updatedDays = sanitisedDays.map((d, i) => (i === dayIdx ? updatedDay : d));
      const updatedLesson: LessonRecord = { ...lesson, days: updatedDays };
      const updatedLessons = data.lessons.map((l, i) => (i === lessonIdx ? updatedLesson : l));

      // Always rebuild from stored day records — never trust cached totals
      resultScores = rebuildLessonStats(updatedDays);

      console.log('[SAVE] updatedDay:', JSON.stringify({ dayNumber, exerciseScore, fire: fireEarned, ice: iceEarned, diamond }));

      tx.set(ref, { lessons: updatedLessons, lastUpdated: serverTimestamp() }, { merge: true });
    });

    console.log('[SAVE] courseProgress persisted to Firestore ✓');
    return { success: true, scores: resultScores };
  } catch (e) {
    console.error('[SAVE ERROR] completeCourseDay transaction failed:', e);
    return { success: false, scores: zeroScores };
  }
}

// ─────────────────────────────────────────────────────────────
// Aggregate metrics for a lesson
// ─────────────────────────────────────────────────────────────

export async function getLessonScores(
  uid: string,
  language: Language,
  workbook: number,
  lessonId: number,
): Promise<WeekScores> {
  const zero: WeekScores = { fire: 0, ice: 0, diamonds: 0, stars: 0, totalDays: 0 };
  const cp = await getCourseProgress(uid, language, workbook);
  if (!cp) return zero;
  const lesson = cp.lessons.find(l => l.lessonId === lessonId);
  if (!lesson) return zero;
  // Always rebuild from stored day records
  return rebuildLessonStats(guardDays(lesson));
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
 * Check whether today is on or after the group's startDay.
 * Used to gate Day 1 access.
 *
 * startDay is a day-of-week name ('tuesday', 'saturday', …).
 * Returns true when today's weekday name >= startDay name (cyclically).
 * For simplicity we allow access if today IS the startDay or later in the week.
 */
const DOW = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function canStartLesson(group: GroupConfig): boolean {
  const todayDow = DOW[new Date().getDay()];
  const startIdx = DOW.indexOf(group.startDay.toLowerCase());
  const todayIdx = DOW.indexOf(todayDow);
  if (startIdx === -1) return true; // unknown day name → allow
  // Allow if today is the start day or any day after it in the same week
  return todayIdx >= startIdx;
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
 * Fetch a progress summary for every user (for teacher dashboard).
 * Reads /users collection + each user's courseProgress subcollection.
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
        } catch {}

        let totalStars = 0, totalFire = 0, totalIce = 0, totalDiamonds = 0;
        let lessonsStarted = 0, daysCompleted = 0;

        try {
          const cpSnap = await getDocs(collection(db!, `users/${uid}/courseProgress`));
          for (const cpDoc of cpSnap.docs) {
            const cpData = cpDoc.data() as CourseProgressDoc;
            for (const lesson of (cpData.lessons ?? [])) {
              lessonsStarted++;
              for (const day of lesson.days) {
                if (day.completed) {
                  daysCompleted++;
                  if (day.fire) totalFire++;
                  if (day.ice) totalIce++;
                  if (day.diamond) totalDiamonds++;
                }
              }
            }
          }
          totalStars = totalFire + totalDiamonds;
        } catch {}

        return {
          uid,
          displayName: userData.displayName ?? userData.name,
          email: userData.email,
          group: metaGroup,
          totalStars,
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
