import type { Day, Lesson, Workbook } from '../types.ts';
import type { ExerciseReport } from '../services/exerciseReportsService.ts';

export type ReportExerciseLocation = {
  workbook: Workbook;
  lesson: Lesson;
  day: Day;
  exerciseIndex: number;
};

export function resolveWorkbookModule(module: Record<string, unknown>, workbookId: number): Workbook | null {
  const candidate = module[`workbook${workbookId}`]
    ?? module.default
    ?? Object.values(module)[0];
  if (!candidate || typeof candidate !== 'object') return null;
  const workbook = candidate as Workbook;
  return Array.isArray(workbook.lessons) ? workbook : null;
}

function workbookIdFromStableId(value?: string): number | null {
  const match = value?.match(/^wb(\d+)(?:_|$)/i);
  if (!match) return null;
  const workbookId = Number(match[1]);
  return Number.isInteger(workbookId) && workbookId > 0 ? workbookId : null;
}

export function reportedWorkbookCandidates(report: Pick<ExerciseReport,
  'workbookId' | 'lessonId' | 'dayId' | 'exerciseId'
>, availableWorkbookIds: number[]): number[] {
  return [...new Set([
    workbookIdFromStableId(report.exerciseId),
    workbookIdFromStableId(report.dayId),
    workbookIdFromStableId(report.lessonId),
    report.workbookId,
    ...availableWorkbookIds,
  ].filter((workbookId): workbookId is number => Number.isInteger(workbookId) && Number(workbookId) > 0))];
}

export function findReportedExercise(workbook: Workbook, report: Pick<ExerciseReport,
  'lessonId' | 'dayId' | 'exerciseId' | 'currentExerciseIndex'
>): ReportExerciseLocation | null {
  const exactLesson = workbook.lessons.find((lesson) => lesson.id === report.lessonId);
  const lesson = exactLesson ?? workbook.lessons.find((candidate) =>
    candidate.days.some((day) => day.exercises.some((exercise) => exercise.id === report.exerciseId))
  );
  if (!lesson) return null;

  const exactDay = lesson.days.find((day) => day.id === report.dayId);
  const day = exactDay ?? lesson.days.find((candidate) =>
    candidate.exercises.some((exercise) => exercise.id === report.exerciseId)
  );
  if (!day) return null;

  const exactIndex = day.exercises.findIndex((exercise) => exercise.id === report.exerciseId);
  const fallbackIndex = Number.isInteger(report.currentExerciseIndex)
    && report.currentExerciseIndex >= 0
    && report.currentExerciseIndex < day.exercises.length
      ? report.currentExerciseIndex
      : -1;
  const exerciseIndex = exactIndex >= 0 ? exactIndex : fallbackIndex;
  if (exerciseIndex < 0) return null;

  return { workbook, lesson, day, exerciseIndex };
}
