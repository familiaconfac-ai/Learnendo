export const ACTIVE_EXERCISE_REPORT_STATUSES = ['new', 'reviewing'] as const;

export function isActiveExerciseReport(report: { status: string }): boolean {
  return ACTIVE_EXERCISE_REPORT_STATUSES.includes(
    report.status as typeof ACTIVE_EXERCISE_REPORT_STATUSES[number],
  );
}
