/**
 * rankingService.ts
 *
 * Pure ranking computation for the teacher dashboard leaderboard.
 * Score formula:  stars + diamonds + (sessions × 0.5)
 *
 * All logic is pure and side-effect-free — safe to call in any context.
 */

import { UserProgressSummary } from './courseProgressEngine';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface RankedStudent extends UserProgressSummary {
  /** Composite score used for ranking. */
  score: number;
  /** 1-based rank position (1 = highest score). */
  rank: number;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Compute the composite score for a single student.
 * Formula: totalStars + totalDiamonds + (daysCompleted × 0.5)
 */
export function computeScore(summary: UserProgressSummary): number {
  return summary.totalStars + summary.totalDiamonds + summary.daysCompleted * 0.5;
}

/**
 * Sort students by score (descending) and attach rank positions.
 * Returns a new array — does not mutate the input.
 */
export function rankStudents(summaries: UserProgressSummary[]): RankedStudent[] {
  return summaries
    .map(s => ({ ...s, score: computeScore(s) }))
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

/**
 * Return only the top N ranked students.
 * Defaults to top 10 (standard leaderboard size).
 */
export function getTopRanked(summaries: UserProgressSummary[], n = 10): RankedStudent[] {
  return rankStudents(summaries).slice(0, n);
}

/** Medal emoji for rank 1/2/3; empty string for all others. */
export function rankMedal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}
