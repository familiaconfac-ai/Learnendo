import type { Day, Exercise, Workbook } from '../types';

export const EXERCISE_PROGRESS_VERSION = 3;
export const FIRST_TRY_POINTS = 10;
export const RETRY_POINTS = 6;

export interface ReplayRewardConfig {
  maxMultiplier: number;
  maxRewardedReplaysPerExercisePerDay: number;
}

export const REPLAY_REWARD_CONFIG: ReplayRewardConfig = {
  maxMultiplier: 4,
  maxRewardedReplaysPerExercisePerDay: 3,
};

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
  isCompleted: true;
  completionCount: number;
  replayCount: number;
  lastCompletedAt: string;
  lastPracticedAt: string;
  bestAccuracy: number;
  totalPracticePoints: number;
  source?: 'exercise' | 'legacy-day' | 'migrated-day';
}

export interface ExerciseRunRecord {
  key: string;
  runId: string;
  exerciseKey: string;
  completionCount: number;
  isReplay: boolean;
  attempts: number;
  accuracy: number;
  basePoints: number;
  replayBonus: number;
  pointsAwarded: number;
  completedAt: string;
  vocabularyNewIds: string[];
  vocabularyReviewedIds: string[];
}

export interface ExerciseProgressState {
  version: number;
  records: Record<string, ExerciseCompletionRecord>;
  runs: Record<string, ExerciseRunRecord>;
}

export interface CompletionInput {
  workbookId: number;
  lessonId: string;
  dayId: string;
  exercise: Exercise;
  attempts: number;
  runId: string;
  completedAt?: string;
  rewardConfig?: ReplayRewardConfig;
}

export interface CompletionResult {
  state: ExerciseProgressState;
  record: ExerciseCompletionRecord;
  run: ExerciseRunRecord;
  pointsAwarded: number;
  duplicate: boolean;
}

export const emptyExerciseProgress = (): ExerciseProgressState => ({
  version: EXERCISE_PROGRESS_VERSION,
  records: {},
  runs: {},
});

export function exerciseCompletionKey(workbookId: number, lessonId: string, dayId: string, exerciseId: string): string {
  return `w${workbookId}/${lessonId}/${dayId}/${exerciseId}`;
}

export function exerciseRunKey(runId: string, exerciseKey: string): string {
  return `${runId}::${exerciseKey}`;
}

export function resolvePracticeStart(exerciseCount: number, firstIncomplete: number, requestedIndex?: number) {
  if (exerciseCount <= 0) return { index: 0, isReplay: false };
  if (requestedIndex != null) return { index: Math.max(0, Math.min(requestedIndex, exerciseCount - 1)), isReplay: firstIncomplete === -1 };
  return firstIncomplete === -1 ? { index: 0, isReplay: true } : { index: Math.max(0, firstIncomplete), isReplay: false };
}

function canonicalTargetId(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function getExplicitVocabularyTargets(exercise: Exercise): string[] {
  if (!exercise.isNewVocab) return [];
  const canonical = canonicalTargetId(exercise.correctValue);
  return canonical ? [canonical] : [];
}

export function pointsForCompletion(attempts: number): number {
  return Math.max(1, attempts) === 1 ? FIRST_TRY_POINTS : RETRY_POINTS;
}

function dayStamp(value: string): string {
  return value.slice(0, 10);
}

/** One official record per exercise, plus one idempotent event per practice run. */
export function completeExercise(current: ExerciseProgressState, input: CompletionInput): CompletionResult {
  const exerciseKey = exerciseCompletionKey(input.workbookId, input.lessonId, input.dayId, input.exercise.id);
  const runKey = exerciseRunKey(input.runId, exerciseKey);
  const previousRun = current.runs[runKey];
  const existing = current.records[exerciseKey];
  if (previousRun && existing) {
    return { state: current, record: existing, run: previousRun, pointsAwarded: 0, duplicate: true };
  }

  const completedAt = input.completedAt ?? new Date().toISOString();
  const config = input.rewardConfig ?? REPLAY_REWARD_CONFIG;
  const basePoints = pointsForCompletion(input.attempts);
  const completionCount = (existing?.completionCount ?? 0) + 1;
  const isReplay = Boolean(existing);
  const rewardedReplaysToday = Object.values(current.runs).filter((run) =>
    run.exerciseKey === exerciseKey && run.isReplay && dayStamp(run.completedAt) === dayStamp(completedAt)
  ).length;
  const replayRewarded = isReplay && rewardedReplaysToday < config.maxRewardedReplaysPerExercisePerDay;
  const multiplier = replayRewarded ? Math.min(completionCount, config.maxMultiplier) : 1;
  const pointsAwarded = basePoints * multiplier;
  const vocabularyTargets = getExplicitVocabularyTargets(input.exercise);
  const accuracy = Math.round(100 / Math.max(1, input.attempts));
  const run: ExerciseRunRecord = {
    key: runKey,
    runId: input.runId,
    exerciseKey,
    completionCount,
    isReplay,
    attempts: Math.max(1, input.attempts),
    accuracy,
    basePoints,
    replayBonus: pointsAwarded - basePoints,
    pointsAwarded,
    completedAt,
    vocabularyNewIds: isReplay ? [] : vocabularyTargets,
    vocabularyReviewedIds: isReplay ? vocabularyTargets : [],
  };
  const record: ExerciseCompletionRecord = existing ? {
    ...existing,
    attempts: existing.attempts + run.attempts,
    completionCount,
    replayCount: completionCount - 1,
    lastCompletedAt: completedAt,
    lastPracticedAt: completedAt,
    bestAccuracy: Math.max(existing.bestAccuracy, accuracy),
    totalPracticePoints: existing.totalPracticePoints + pointsAwarded,
  } : {
    key: exerciseKey,
    workbookId: input.workbookId,
    lessonId: input.lessonId,
    dayId: input.dayId,
    exerciseId: input.exercise.id,
    exerciseType: input.exercise.type,
    attempts: run.attempts,
    points: basePoints,
    completedAt,
    vocabularyTargetIds: vocabularyTargets,
    isCompleted: true,
    completionCount: 1,
    replayCount: 0,
    lastCompletedAt: completedAt,
    lastPracticedAt: completedAt,
    bestAccuracy: accuracy,
    totalPracticePoints: pointsAwarded,
    source: 'exercise',
  };
  return {
    state: { version: EXERCISE_PROGRESS_VERSION, records: { ...current.records, [exerciseKey]: record }, runs: { ...current.runs, [runKey]: run } },
    record,
    run,
    pointsAwarded,
    duplicate: false,
  };
}

type LegacyRecord = Omit<ExerciseCompletionRecord, 'isCompleted' | 'completionCount' | 'replayCount' | 'lastCompletedAt' | 'lastPracticedAt' | 'bestAccuracy' | 'totalPracticePoints'>;

function migrateRecord(record: LegacyRecord | ExerciseCompletionRecord): ExerciseCompletionRecord {
  if ('completionCount' in record) return record;
  const accuracy = Math.round(100 / Math.max(1, record.attempts));
  return { ...record, isCompleted: true, completionCount: 1, replayCount: 0, lastCompletedAt: record.completedAt,
    lastPracticedAt: record.completedAt, bestAccuracy: accuracy, totalPracticePoints: record.points, source: 'exercise' };
}

export function loadExerciseProgress(storage: Pick<Storage, 'getItem'> | null, userId: string): ExerciseProgressState {
  if (!storage) return emptyExerciseProgress();
  try {
    const currentRaw = storage.getItem(`learnendo_exercise_progress_v${EXERCISE_PROGRESS_VERSION}:${userId}`);
    const version2Raw = storage.getItem(`learnendo_exercise_progress_v2:${userId}`);
    const legacyRaw = storage.getItem(`learnendo_exercise_progress_v1:${userId}`);
    const parsed = JSON.parse(currentRaw ?? version2Raw ?? legacyRaw ?? 'null') as Partial<ExerciseProgressState> | null;
    if (!parsed?.records || typeof parsed.records !== 'object') return emptyExerciseProgress();
    return { version: EXERCISE_PROGRESS_VERSION,
      records: Object.fromEntries(Object.entries(parsed.records).map(([key, record]) => [key, migrateRecord(record as LegacyRecord)])),
      runs: parsed.runs && typeof parsed.runs === 'object' ? parsed.runs : {} };
  } catch { return emptyExerciseProgress(); }
}

export function saveExerciseProgress(storage: Pick<Storage, 'setItem'> | null, userId: string, state: ExerciseProgressState): boolean {
  if (!storage) return false;
  try { storage.setItem(`learnendo_exercise_progress_v${EXERCISE_PROGRESS_VERSION}:${userId}`, JSON.stringify(state)); return true; }
  catch { return false; }
}

/** Bridges old day-level progress into unique exercise records without awarding points. */
export function mergeLegacyCompletedDays(state: ExerciseProgressState, workbook: Workbook, completedDayIds: Iterable<string>): ExerciseProgressState {
  const completed = new Set(completedDayIds);
  let records = state.records;
  for (const lesson of workbook.lessons) for (const day of lesson.days) {
    if (!completed.has(day.id)) continue;
    for (const exercise of day.exercises) {
      const key = exerciseCompletionKey(workbook.id, lesson.id, day.id, exercise.id);
      if (records[key]) continue;
      const completedAt = new Date(0).toISOString();
      records = { ...records, [key]: { key, workbookId: workbook.id, lessonId: lesson.id, dayId: day.id,
        exerciseId: exercise.id, exerciseType: exercise.type, attempts: 1, points: 0, completedAt,
        vocabularyTargetIds: getExplicitVocabularyTargets(exercise), isCompleted: true, completionCount: 1,
        replayCount: 0, lastCompletedAt: completedAt, lastPracticedAt: completedAt, bestAccuracy: 0,
        totalPracticePoints: 0, source: 'legacy-day' } };
    }
  }
  return records === state.records ? state : { ...state, records };
}

/**
 * Keeps completion valid when editorial work moves a stable exercise ID to a
 * different day. The old record remains untouched and a new canonical record
 * is mirrored into the exercise's current location.
 */
export function migrateMovedExerciseProgress(state: ExerciseProgressState, workbook: Workbook): ExerciseProgressState {
  let records = state.records;
  for (const lesson of workbook.lessons) for (const day of lesson.days) for (const exercise of day.exercises) {
    const currentKey = exerciseCompletionKey(workbook.id, lesson.id, day.id, exercise.id);
    if (records[currentKey]) continue;
    const previous = Object.values(records).find((record) =>
      record.workbookId === workbook.id
      && record.lessonId === lesson.id
      && record.exerciseId === exercise.id
      && record.isCompleted
    );
    if (!previous) continue;
    records = { ...records, [currentKey]: {
      ...previous,
      key: currentKey,
      dayId: day.id,
      exerciseType: exercise.type,
      source: 'migrated-day',
    } };
  }
  return records === state.records ? state : { ...state, version: EXERCISE_PROGRESS_VERSION, records };
}

export function dayCompletionSummary(state: ExerciseProgressState, workbookId: number, lessonId: string, day: Day) {
  const records = day.exercises.map((exercise) => state.records[exerciseCompletionKey(workbookId, lessonId, day.id, exercise.id)])
    .filter((record): record is ExerciseCompletionRecord => Boolean(record));
  const attempts = records.reduce((sum, record) => sum + record.attempts, 0);
  return { completed: records.length, total: day.exercises.length, points: records.reduce((sum, record) => sum + record.points, 0),
    attempts, errors: Math.max(0, attempts - records.length), accuracy: attempts ? Math.round((records.length / attempts) * 100) : 0,
    vocabularyTargets: new Set(records.flatMap((record) => record.vocabularyTargetIds)).size };
}

export function practiceRunSummary(state: ExerciseProgressState, runId: string) {
  const runs = Object.values(state.runs).filter((run) => run.runId === runId);
  const attempts = runs.reduce((sum, run) => sum + run.attempts, 0);
  return { completed: runs.length, attempts, errors: Math.max(0, attempts - runs.length),
    accuracy: attempts ? Math.round((runs.length / attempts) * 100) : 0,
    basePoints: runs.reduce((sum, run) => sum + run.basePoints, 0),
    replayBonus: runs.reduce((sum, run) => sum + run.replayBonus, 0),
    points: runs.reduce((sum, run) => sum + run.pointsAwarded, 0),
    practiceRun: runs.reduce((max, run) => Math.max(max, run.completionCount), 1),
    newVocabulary: new Set(runs.flatMap((run) => run.vocabularyNewIds)).size,
    vocabularyReviewed: new Set(runs.flatMap((run) => run.vocabularyReviewedIds)).size };
}

export function workbookCompletionSummary(workbook: Workbook, state: ExerciseProgressState) {
  const exercises = workbook.lessons.flatMap((lesson) => lesson.days.flatMap((day) => day.exercises));
  let completed = 0;
  for (const lesson of workbook.lessons) for (const day of lesson.days) for (const exercise of day.exercises)
    if (state.records[exerciseCompletionKey(workbook.id, lesson.id, day.id, exercise.id)]) completed++;
  return { completed, total: exercises.length, percentage: exercises.length ? Math.round((completed / exercises.length) * 100) : 0 };
}

export function lessonCompletionSummary(workbook: Workbook, lessonId: string, state: ExerciseProgressState) {
  const lesson = workbook.lessons.find((candidate) => candidate.id === lessonId);
  if (!lesson) return { completed: 0, total: 0, percentage: 0 };
  const total = lesson.days.reduce((sum, day) => sum + day.exercises.length, 0);
  let completed = 0;
  for (const day of lesson.days) for (const exercise of day.exercises)
    if (state.records[exerciseCompletionKey(workbook.id, lesson.id, day.id, exercise.id)]) completed++;
  return { completed, total, percentage: total ? Math.round((completed / total) * 100) : 0 };
}

export function courseCompletionSummary(publishedWorkbooks: Workbook[], state: ExerciseProgressState, plannedExercises = 10_800) {
  const summaries = publishedWorkbooks.map((workbook) => workbookCompletionSummary(workbook, state));
  const completed = summaries.reduce((sum, summary) => sum + summary.completed, 0);
  const publishedTotal = summaries.reduce((sum, summary) => sum + summary.total, 0);
  return { completed, publishedTotal, plannedTotal: Math.max(plannedExercises, publishedTotal),
    publishedPercentage: publishedTotal ? Math.round((completed / publishedTotal) * 100) : 0,
    plannedPercentage: plannedExercises ? Math.round((completed / Math.max(plannedExercises, publishedTotal)) * 100) : 0 };
}
