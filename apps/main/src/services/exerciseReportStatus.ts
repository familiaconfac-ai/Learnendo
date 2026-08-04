export const ACTIVE_EXERCISE_REPORT_STATUSES = ['new', 'reviewing'] as const;

export function isActiveExerciseReport(report: { status: string }): boolean {
  return ACTIVE_EXERCISE_REPORT_STATUSES.includes(
    report.status as typeof ACTIVE_EXERCISE_REPORT_STATUSES[number],
  );
}

export function isVisibleExerciseReport(report: { status: string }): boolean {
  return ['new', 'reviewing', 'resolved', 'dismissed'].includes(report.status);
}

type DuplicateReportSource = {
  reportId: string;
  exerciseId: string;
  userId?: string | null;
  problemCategory?: string | null;
  studentComment?: string | null;
  instruction?: string | null;
  displayedText?: string | null;
  audioText?: string | null;
  options?: string[] | null;
  expectedAnswer?: string | null;
  acceptedAnswers?: string[] | null;
};

const normalizeDuplicateField = (value: unknown): string => String(value ?? '')
  .normalize('NFKC')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleLowerCase('en-US');

export function exactExerciseReportProblemKey(report: DuplicateReportSource): string {
  return JSON.stringify([
    report.exerciseId,
    report.userId,
    report.problemCategory,
    report.studentComment,
    report.instruction,
    report.displayedText,
    report.audioText,
    ...(report.options ?? []),
    report.expectedAnswer,
    ...(report.acceptedAnswers ?? []),
  ].map(normalizeDuplicateField));
}

export function isExactExerciseReportDuplicate(
  origin: DuplicateReportSource,
  candidate: DuplicateReportSource & { status: string },
): boolean {
  return origin.reportId !== candidate.reportId
    && isActiveExerciseReport(candidate)
    && exactExerciseReportProblemKey(origin) === exactExerciseReportProblemKey(candidate);
}
