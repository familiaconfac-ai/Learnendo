/**
 * teacherService.ts
 *
 * Single entry point for all teacher dashboard data.
 * Ties together the three engines: courseProgressEngine, alertService, rankingService.
 *
 * Components import from here — never from the lower-level engines directly.
 */

import { getAllUserProgressSummaries, UserProgressSummary } from './courseProgressEngine';
import { detectAlerts, StudentAlert } from './alertService';
import { rankStudents, RankedStudent, computeScore } from './rankingService';
import { formatTime, formatAccuracy } from './progressStatsService';

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
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function relativeDate(value: any): string {
  if (!value) return '—';
  try {
    const date: Date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
    if (isNaN(date.getTime())) return '—';
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0)  return 'Today';
    if (days === 1)  return 'Yesterday';
    if (days < 30)   return `${days} days ago`;
    if (days < 365)  return `${Math.floor(days / 30)} mo ago`;
    return `${Math.floor(days / 365)} yr ago`;
  } catch {
    return '—';
  }
}

function pathLabel(summary: UserProgressSummary): string {
  const wb = summary.currentWorkbook ?? 1;
  const ls = summary.currentLesson   ?? 1;
  const dy = summary.currentDay      ?? 1;
  return `Wbk ${wb} · L${ls} · D${dy}`;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Fetch and enrich all student data for the teacher dashboard.
 * Returns students pre-sorted by score (rank 1 first).
 *
 * One Firestore fan-out per student (courseProgress subcollection read).
 * Results are not cached — call sparingly or memoize at the component level.
 */
export async function getTeacherDashboardData(): Promise<TeacherStudentRow[]> {
  const summaries = await getAllUserProgressSummaries();
  const ranked = rankStudents(summaries);
  return ranked.map(student => ({
    ...student,
    alerts:            detectAlerts(student),
    pathLabel:         pathLabel(student),
    lastActivityLabel: relativeDate(student.lastActivity),
  }));
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
