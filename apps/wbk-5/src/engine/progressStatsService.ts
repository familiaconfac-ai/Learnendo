/**
 * progressStatsService.ts
 *
 * Single source of truth for all progress stats computation.
 * Use these functions everywhere stats are needed — dashboard, tables, admin views.
 *
 * Pure helpers:   computeStats, computeCourseStats, formatTime, getCurrentPath
 * Async helpers:  getProgressStats
 */

import {
  getLessonProgress,
  rebuildLessonStats,
  EMPTY_STATS,
  LessonProgress,
  LessonStats,
  CourseProgressDoc,
} from './courseProgressEngine';
import { UserProgress } from '../types';

// ─────────────────────────────────────────────────────────────
// Current learning position
// ─────────────────────────────────────────────────────────────

export interface CurrentPath {
  workbook: number;
  lesson: number;
  day: number;
}

/**
 * Returns the user's last saved learning position from their progress document.
 * This is the single source of truth for "where am I right now?".
 */
export function getCurrentPath(progress: UserProgress): CurrentPath {
  return {
    workbook: progress.currentWorkbook ?? 1,
    lesson:   progress.currentLesson   ?? 1,
    day:      progress.currentDay      ?? 1,
  };
}

// ─────────────────────────────────────────────────────────────
// Progression logic
// ─────────────────────────────────────────────────────────────

export const MAX_DAY      = 7;
export const MAX_LESSON   = 12;
export const MAX_WORKBOOK = 8;

/**
 * Given the just-completed path, return the next position the student
 * should work on.  Enforces hard bounds (7 days, 12 lessons, 8 workbooks).
 *
 * Examples:
 *   day 3 of lesson 2  → day 4 of lesson 2
 *   day 7 of lesson 2  → day 1 of lesson 3
 *   day 7 of lesson 12 → day 1 of lesson 1 of workbook+1
 *   day 7 of lesson 12 of workbook 8 → stays at 8/12/7 (course complete)
 */
export function computeNextPath(completed: CurrentPath): CurrentPath {
  let { workbook, lesson, day } = completed;

  // Clamp incoming values to valid ranges
  workbook = Math.min(Math.max(workbook, 1), MAX_WORKBOOK);
  lesson   = Math.min(Math.max(lesson,   1), MAX_LESSON);
  day      = Math.min(Math.max(day,      1), MAX_DAY);

  if (day < MAX_DAY) {
    return { workbook, lesson, day: day + 1 };
  }
  // Day 7 completed — advance lesson
  day = 1;
  if (lesson < MAX_LESSON) {
    return { workbook, lesson: lesson + 1, day };
  }
  // Lesson 12 completed — advance workbook
  lesson = 1;
  if (workbook < MAX_WORKBOOK) {
    return { workbook: workbook + 1, lesson, day };
  }
  // Course fully completed — keep at terminal state
  return { workbook: MAX_WORKBOOK, lesson: MAX_LESSON, day: MAX_DAY };
}

// ─────────────────────────────────────────────────────────────
// Pure computation helpers
// ─────────────────────────────────────────────────────────────

/**
 * Compute stats for a single lesson.
 * Pure function — no Firestore calls.
 * This is the canonical single source of truth for stats derivation.
 */
export function computeStats(lesson: LessonProgress): LessonStats {
  return rebuildLessonStats(lesson);
}

/**
 * Aggregate stats across all lessons in a CourseProgressDoc's lessons map.
 * Use this to derive course-level totals without additional DB calls.
 */
export function computeCourseStats(lessons: Record<string, LessonProgress>): LessonStats {
  const entries = Object.values(lessons);
  if (entries.length === 0) return { ...EMPTY_STATS };

  let fire = 0, ice = 0, diamonds = 0, totalCompleted = 0;
  let totalTimeSpentSum = 0, totalErrors = 0, totalAttempts = 0;
  let accSum = 0, accCount = 0;

  for (const lesson of entries) {
    const s = rebuildLessonStats(lesson);
    fire           += s.fire;
    ice            += s.ice;
    diamonds       += s.diamonds;
    totalCompleted += s.totalCompleted;
    // Reverse-engineer per-day total time from the average
    totalTimeSpentSum += s.avgTimeSpent * s.totalCompleted;
    totalErrors    += s.totalErrors;
    totalAttempts  += s.totalAttempts;
    if (s.avgAccuracy > 0) { accSum += s.avgAccuracy; accCount++; }
  }

  const stars        = fire + diamonds;
  const avgTimeSpent = totalCompleted > 0 ? Math.round(totalTimeSpentSum / totalCompleted) : 0;
  const avgAccuracy  = accCount > 0       ? Math.round(accSum / accCount)                  : 0;

  return {
    fire, ice, diamonds, stars, totalCompleted,
    sessions: totalCompleted,
    avgTimeSpent, totalErrors, totalAttempts, avgAccuracy,
  };
}

/**
 * Compute cross-workbook stats from an array of CourseProgressDoc objects.
 * Suitable for building a full user lifetime summary.
 */
export function computeAllCoursesStats(docs: CourseProgressDoc[]): LessonStats {
  const allLessons: Record<string, LessonProgress> = {};
  for (const doc of docs) {
    for (const [key, lesson] of Object.entries(doc.lessons ?? {})) {
      allLessons[`${doc.courseId}_${doc.bookNumber}_${key}`] = lesson;
    }
  }
  return computeCourseStats(allLessons);
}

// ─────────────────────────────────────────────────────────────
// Async helpers (Firestore-backed)
// ─────────────────────────────────────────────────────────────

/**
 * Fetch a single lesson's progress from Firestore and compute stats.
 * One DB read. Returns EMPTY_STATS if the lesson has not been started.
 */
export async function getProgressStats(
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
// Formatting utilities
// ─────────────────────────────────────────────────────────────

/**
 * Format a duration in seconds into a human-readable string.
 *
 * Examples:
 *   0   → '—'
 *   45  → '45s'
 *   90  → '1m 30s'
 *   120 → '2m'
 */
export function formatTime(seconds: number): string {
  if (seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

/**
 * Format an accuracy value as a percentage string.
 *   0 → '—'
 *  75 → '75%'
 * 100 → '100%'
 */
export function formatAccuracy(accuracy: number): string {
  return accuracy > 0 ? `${accuracy}%` : '—';
}
