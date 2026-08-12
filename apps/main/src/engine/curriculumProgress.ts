export const MAX_DAY = 7;
export const MAX_LESSON = 12;
export const MAX_WORKBOOK = 8;

export interface CurriculumProgressSource {
  currentWorkbook?: number;
  currentLesson?: number;
  currentDay?: number;
  daysCompleted?: number;
}

/** Resolve whole-course progress against Learnendo's official curriculum. */
export function resolveCurriculumProgressPercent(source: CurriculumProgressSource): number {
  const workbook = Math.min(MAX_WORKBOOK, Math.max(1, source.currentWorkbook ?? 1));
  const lesson = Math.min(MAX_LESSON, Math.max(1, source.currentLesson ?? 1));
  const day = Math.min(MAX_DAY, Math.max(1, source.currentDay ?? 1));
  const pointerHasAdvanced = workbook > 1 || lesson > 1 || day > 1;
  const pointerActivities = pointerHasAdvanced
    ? ((workbook - 1) * MAX_LESSON * MAX_DAY) + ((lesson - 1) * MAX_DAY) + day
    : 0;
  const completedActivities = Math.max(0, source.daysCompleted ?? 0);
  const curriculumTotal = MAX_WORKBOOK * MAX_LESSON * MAX_DAY;
  const resolvedActivities = Math.min(curriculumTotal, Math.max(pointerActivities, completedActivities));

  return Math.round((resolvedActivities / curriculumTotal) * 1_000) / 10;
}
