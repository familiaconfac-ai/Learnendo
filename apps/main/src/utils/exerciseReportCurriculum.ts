import type { Day, Exercise, Lesson, Workbook } from '../types.ts';
import type { ExerciseReport } from '../services/exerciseReportsService.ts';
import { normalizeExerciseWorkbookId } from '../models/exerciseOverride.ts';

export type ReportExerciseLocation = {
  workbook: Workbook;
  lesson: Lesson;
  day: Day;
  exerciseIndex: number;
  sourceCollection?: 'packaged-curriculum' | 'publishedDayExerciseSequences' | 'legacy-index-fallback';
  documentPath?: string;
  publicationVersion?: number | null;
  resolutionKind?: 'exact-id' | 'legacy-index';
};

type PublishedReportSequence = {
  version: number;
  exercises: Exercise[];
};

export class PublishedSequenceSourceError extends Error {
  readonly sourcePath: string;

  constructor(sourcePath: string, message: string, options?: ErrorOptions) {
    super(`${message} Fonte: ${sourcePath}.`, options);
    this.name = 'PublishedSequenceSourceError';
    this.sourcePath = sourcePath;
  }
}

export async function loadReportedExerciseFromPublishedSequence(input: {
  workbook: Workbook;
  report: Pick<ExerciseReport, 'lessonId' | 'dayId' | 'exerciseId'>;
  sourcePath: string;
  loadPublished: () => Promise<PublishedReportSequence | null>;
}): Promise<ReportExerciseLocation | null> {
  const lessonId = normalizeReportedLocationId(input.report.lessonId);
  const dayId = normalizeReportedLocationId(input.report.dayId);
  const exerciseId = normalizeReportedLocationId(input.report.exerciseId);
  const lesson = input.workbook.lessons.find((candidate) => candidate.id === lessonId);
  const day = lesson?.days.find((candidate) => candidate.id === dayId);
  if (!lesson || !day || !exerciseId || exerciseId === 'not-informed') return null;

  let published: PublishedReportSequence | null;
  try {
    published = await input.loadPublished();
  } catch (cause) {
    throw new PublishedSequenceSourceError(
      input.sourcePath,
      'Não foi possível carregar a sequência publicada. O currículo empacotado não será usado como substituto.',
      { cause },
    );
  }
  if (!published) return null;

  const exerciseIndex = published.exercises.findIndex((exercise) => exercise.id.trim() === exerciseId);
  if (exerciseIndex < 0) {
    throw new PublishedSequenceSourceError(
      input.sourcePath,
      `A sequência publicada existe, mas não contém o exercício solicitado ${exerciseId}.`,
    );
  }
  return {
    workbook: input.workbook,
    lesson,
    day: { ...day, exercises: published.exercises },
    exerciseIndex,
    sourceCollection: 'publishedDayExerciseSequences',
    documentPath: input.sourcePath,
    publicationVersion: published.version,
    resolutionKind: 'exact-id',
  };
}

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

export function normalizeReportedWorkbookId(value: unknown): number | null {
  const workbookId = normalizeExerciseWorkbookId(value);
  return Number.isInteger(workbookId) && workbookId > 0 ? workbookId : null;
}

export function normalizeReportedLocationId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function courseIdForReportLanguage(language: unknown, fallbackCourseId = 'english'): string {
  const normalized = typeof language === 'string' ? language.trim().toLowerCase().replace('_', '-') : '';
  if (normalized === 'english' || normalized === 'en' || normalized.startsWith('en-')) return 'english';
  if (normalized === 'spanish' || normalized === 'es' || normalized.startsWith('es-')) return 'spanish';
  if (normalized === 'greek' || normalized === 'el' || normalized.startsWith('el-')) return 'greek_koine';
  if (normalized === 'hebrew' || normalized === 'he' || normalized.startsWith('he-')) return 'hebrew_biblical';
  if (normalized === 'portuguese' || normalized === 'pt' || normalized.startsWith('pt-')) return 'portuguese_foreigners';
  return fallbackCourseId;
}

export function reportedWorkbookCandidates(report: Pick<ExerciseReport,
  'workbookId' | 'lessonId' | 'dayId' | 'exerciseId'
>, availableWorkbookIds: number[]): number[] {
  return [...new Set([
    workbookIdFromStableId(report.exerciseId),
    workbookIdFromStableId(report.dayId),
    workbookIdFromStableId(report.lessonId),
    normalizeReportedWorkbookId(report.workbookId),
    ...availableWorkbookIds,
  ].filter((workbookId): workbookId is number => Number.isInteger(workbookId) && Number(workbookId) > 0))];
}

export function findReportedExercise(workbook: Workbook, report: Pick<ExerciseReport,
  'lessonId' | 'dayId' | 'exerciseId' | 'currentExerciseIndex'
>): ReportExerciseLocation | null {
  const lessonId = normalizeReportedLocationId(report.lessonId);
  const dayId = normalizeReportedLocationId(report.dayId);
  const exerciseId = normalizeReportedLocationId(report.exerciseId);
  const exactLesson = workbook.lessons.find((lesson) => lesson.id === lessonId);
  const lesson = exactLesson ?? workbook.lessons.find((candidate) =>
    candidate.days.some((day) => day.exercises.some((exercise) => exercise.id === exerciseId))
  );
  if (!lesson) return null;

  const exactDay = lesson.days.find((day) => day.id === dayId);
  const day = exactDay ?? lesson.days.find((candidate) =>
    candidate.exercises.some((exercise) => exercise.id === exerciseId)
  );
  if (!day) return null;

  const exactIndex = day.exercises.findIndex((exercise) => exercise.id === exerciseId);
  // A recorded ID is an identity, not a hint. Falling back to an old array
  // position when a non-empty ID disappeared can silently open another item
  // after an editorial reorder. Only reports that predate exercise IDs may use
  // the explicitly labelled legacy fallback.
  const allowsLegacyIndex = !exerciseId || exerciseId === 'not-informed';
  const fallbackIndex = allowsLegacyIndex && Number.isInteger(report.currentExerciseIndex)
    && report.currentExerciseIndex >= 0
    && report.currentExerciseIndex < day.exercises.length
      ? report.currentExerciseIndex
      : -1;
  const exerciseIndex = exactIndex >= 0 ? exactIndex : fallbackIndex;
  if (exerciseIndex < 0) return null;

  return {
    workbook, lesson, day, exerciseIndex,
    sourceCollection: exactIndex >= 0 ? 'packaged-curriculum' : 'legacy-index-fallback',
    documentPath: exactIndex >= 0 ? 'apps/main/src/courses/courseRegistry.ts' : undefined,
    publicationVersion: null,
    resolutionKind: exactIndex >= 0 ? 'exact-id' : 'legacy-index',
  };
}
