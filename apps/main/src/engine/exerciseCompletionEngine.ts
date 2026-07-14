import type { Day, Exercise, Workbook } from '../types';

export const EXERCISE_PROGRESS_VERSION = 1;
export const FIRST_TRY_POINTS = 10;
export const RETRY_POINTS = 6;

export interface ExerciseCompletionRecord {
  key: string;
  workbookId: number;
  lessonId: string;
  dayId: string;
  exerciseId: string;
  exerciseType: Exercise['type'];
  attempts: number;
  points: number;
  completedAt: string;
  vocabularyTargetIds: string[];
}

export interface ExerciseProgressState {
  version: number;
  records: Record<string, ExerciseCompletionRecord>;
}

export interface CompletionInput {
  workbookId: number;
  lessonId: string;
  dayId: string;
  exercise: Exercise;
  attempts: number;
  completedAt?: string;
}

export interface CompletionResult {
  state: ExerciseProgressState;
  record: ExerciseCompletionRecord;
  pointsAwarded: number;
  duplicate: boolean;
}

export const emptyExerciseProgress = (): ExerciseProgressState => ({
  version: EXERCISE_PROGRESS_VERSION,
  records: {},
});

export function exerciseCompletionKey(
  workbookId: number,
  lessonId: string,
  dayId: string,
  exerciseId: string,
): string {
  return `w${workbookId}/${lessonId}/${dayId}/${exerciseId}`;
}

function canonicalTargetId(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Only explicitly authored vocabulary is tracked; incidental prompt text is ignored. */
export function getExplicitVocabularyTargets(exercise: Exercise): string[] {
  if (!exercise.isNewVocab) return [];
  const canonical = canonicalTargetId(exercise.correctValue);
  return canonical ? [canonical] : [];
}

export function pointsForCompletion(attempts: number): number {
  return Math.max(1, attempts) === 1 ? FIRST_TRY_POINTS : RETRY_POINTS;
}

/** Pure and idempotent: repeating the same exercise never awards points twice. */
export function completeExercise(
  current: ExerciseProgressState,
  input: CompletionInput,
): CompletionResult {
  const key = exerciseCompletionKey(input.workbookId, input.lessonId, input.dayId, input.exercise.id);
  const existing = current.records[key];
  if (existing) {
    return { state: current, record: existing, pointsAwarded: 0, duplicate: true };
  }

  const record: ExerciseCompletionRecord = {
    key,
    workbookId: input.workbookId,
    lessonId: input.lessonId,
    dayId: input.dayId,
    exerciseId: input.exercise.id,
    exerciseType: input.exercise.type,
    attempts: Math.max(1, input.attempts),
    points: pointsForCompletion(input.attempts),
    completedAt: input.completedAt ?? new Date().toISOString(),
    vocabularyTargetIds: getExplicitVocabularyTargets(input.exercise),
  };
  return {
    state: { ...current, records: { ...current.records, [key]: record } },
    record,
    pointsAwarded: record.points,
    duplicate: false,
  };
}

export function loadExerciseProgress(storage: Pick<Storage, 'getItem'> | null, userId: string): ExerciseProgressState {
  if (!storage) return emptyExerciseProgress();
  try {
    const raw = storage.getItem(`learnendo_exercise_progress_v${EXERCISE_PROGRESS_VERSION}:${userId}`);
    if (!raw) return emptyExerciseProgress();
    const parsed = JSON.parse(raw) as Partial<ExerciseProgressState>;
    return parsed.version === EXERCISE_PROGRESS_VERSION && parsed.records && typeof parsed.records === 'object'
      ? { version: EXERCISE_PROGRESS_VERSION, records: parsed.records }
      : emptyExerciseProgress();
  } catch {
    return emptyExerciseProgress();
  }
}

export function saveExerciseProgress(
  storage: Pick<Storage, 'setItem'> | null,
  userId: string,
  state: ExerciseProgressState,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(`learnendo_exercise_progress_v${EXERCISE_PROGRESS_VERSION}:${userId}`, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function dayCompletionSummary(
  state: ExerciseProgressState,
  workbookId: number,
  lessonId: string,
  day: Day,
) {
  const records = day.exercises
    .map((exercise) => state.records[exerciseCompletionKey(workbookId, lessonId, day.id, exercise.id)])
    .filter((record): record is ExerciseCompletionRecord => Boolean(record));
  const attempts = records.reduce((sum, record) => sum + record.attempts, 0);
  return {
    completed: records.length,
    total: day.exercises.length,
    points: records.reduce((sum, record) => sum + record.points, 0),
    attempts,
    errors: Math.max(0, attempts - records.length),
    accuracy: attempts ? Math.round((records.length / attempts) * 100) : 0,
    vocabularyTargets: new Set(records.flatMap((record) => record.vocabularyTargetIds)).size,
  };
}

export function workbookCompletionSummary(workbook: Workbook, state: ExerciseProgressState) {
  const exercises = workbook.lessons.flatMap((lesson) => lesson.days.flatMap((day) => day.exercises));
  const completedKeys = new Set(Object.keys(state.records));
  let completed = 0;
  for (const lesson of workbook.lessons) {
    for (const day of lesson.days) {
      for (const exercise of day.exercises) {
        if (completedKeys.has(exerciseCompletionKey(workbook.id, lesson.id, day.id, exercise.id))) completed++;
      }
    }
  }
  return {
    completed,
    total: exercises.length,
    percentage: exercises.length ? Math.round((completed / exercises.length) * 100) : 0,
  };
}

export function lessonCompletionSummary(workbook: Workbook, lessonId: string, state: ExerciseProgressState) {
  const lesson = workbook.lessons.find((candidate) => candidate.id === lessonId);
  if (!lesson) return { completed: 0, total: 0, percentage: 0 };
  const total = lesson.days.reduce((sum, day) => sum + day.exercises.length, 0);
  let completed = 0;
  for (const day of lesson.days) {
    for (const exercise of day.exercises) {
      if (state.records[exerciseCompletionKey(workbook.id, lesson.id, day.id, exercise.id)]) completed++;
    }
  }
  return { completed, total, percentage: total ? Math.round((completed / total) * 100) : 0 };
}

export function courseCompletionSummary(
  publishedWorkbooks: Workbook[],
  state: ExerciseProgressState,
  plannedExercises = 10_800,
) {
  const summaries = publishedWorkbooks.map((workbook) => workbookCompletionSummary(workbook, state));
  const completed = summaries.reduce((sum, summary) => sum + summary.completed, 0);
  const publishedTotal = summaries.reduce((sum, summary) => sum + summary.total, 0);
  return {
    completed,
    publishedTotal,
    plannedTotal: Math.max(plannedExercises, publishedTotal),
    publishedPercentage: publishedTotal ? Math.round((completed / publishedTotal) * 100) : 0,
    plannedPercentage: plannedExercises ? Math.round((completed / Math.max(plannedExercises, publishedTotal)) * 100) : 0,
  };
}
