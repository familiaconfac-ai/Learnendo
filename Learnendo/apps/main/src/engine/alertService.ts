/**
 * alertService.ts
 *
 * Pure, stateless alert detection for the teacher dashboard.
 * All logic lives here — no alert logic inside UI components.
 *
 * Thresholds:
 *   INACTIVE_DAYS     — 2+ days without any recorded activity
 *   LOW_ACCURACY      — avgAccuracy < 60 % (requires ≥ 2 completed days for reliability)
 *   HIGH_ERROR_THRESHOLD — more than 10 cumulative errors
 */

import { UserProgressSummary } from './courseProgressEngine';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type AlertType = 'inactive' | 'low_accuracy' | 'high_errors';

export interface StudentAlert {
  type: AlertType;
  message: string;
}

// ─────────────────────────────────────────────────────────────
// Configurable thresholds (module-level constants — no magic numbers in logic)
// ─────────────────────────────────────────────────────────────

const INACTIVE_DAYS_THRESHOLD   = 2;
const LOW_ACCURACY_THRESHOLD    = 60;
const HIGH_ERROR_THRESHOLD      = 10;
const MIN_DAYS_FOR_ACCURACY_CHECK = 2; // avoid noise from brand-new students

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Convert a Firestore Timestamp, ISO string, or null to a Date (or null). */
function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate() as Date;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function daysSince(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Compute all active alerts for a single student.
 * Pure function — deterministic given the same input.
 *
 * @returns  Array of StudentAlert (empty = no issues detected)
 */
export function detectAlerts(summary: UserProgressSummary): StudentAlert[] {
  const alerts: StudentAlert[] = [];

  // ── Inactive check ──────────────────────────────────────────
  const lastDate = toDate(summary.lastActivity);
  if (lastDate) {
    const days = daysSince(lastDate);
    if (days >= INACTIVE_DAYS_THRESHOLD) {
      const rounded = Math.floor(days);
      alerts.push({
        type: 'inactive',
        message: `${rounded} day${rounded !== 1 ? 's' : ''} without activity`,
      });
    }
  }

  // ── Low accuracy check ──────────────────────────────────────
  // Requires real answer attempts — avgAccuracy of 0 without attempts is
  // a missing-data sentinel, NOT a true zero-accuracy score.
  // Only fire this alert when accuracy data is actually available (>0 means it was computed
  // from real answers).  avgAccuracy=0 is a "no-data" sentinel, not genuinely zero accuracy.
  if (
    summary.daysCompleted >= MIN_DAYS_FOR_ACCURACY_CHECK &&
    summary.totalAttempts > 0 &&
    summary.avgAccuracy > 0 &&
    summary.avgAccuracy < LOW_ACCURACY_THRESHOLD
  ) {
    alerts.push({
      type: 'low_accuracy',
      message: `Accuracy below ${LOW_ACCURACY_THRESHOLD}% (${summary.avgAccuracy}%)`,
    });
  }

  // ── High error rate ─────────────────────────────────────────
  if (summary.totalErrors > HIGH_ERROR_THRESHOLD) {
    const where = summary.lastLessonId ? ` (latest: ${summary.lastLessonId})` : '';
    alerts.push({
      type: 'high_errors',
      message: `${summary.totalErrors} total errors recorded${where}`,
    });
  }

  return alerts;
}

/**
 * Return the most severe alert type for a student, or null if no alerts.
 * Priority: high_errors > low_accuracy > inactive
 */
export function mostSevereAlert(alerts: StudentAlert[]): AlertType | null {
  if (alerts.some(a => a.type === 'high_errors'))  return 'high_errors';
  if (alerts.some(a => a.type === 'low_accuracy')) return 'low_accuracy';
  if (alerts.some(a => a.type === 'inactive'))     return 'inactive';
  return null;
}
