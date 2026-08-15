import assert from 'node:assert/strict';
import test from 'node:test';
import type { Exercise, Workbook } from '../types';
import {
  completeExercise,
  courseCompletionSummary,
  dayCompletionSummary,
  emptyExerciseProgress,
  getExplicitVocabularyTargets,
  loadExerciseProgress,
  pointsForCompletion,
  saveExerciseProgress,
  lessonCompletionSummary,
  mergeLegacyCompletedDays,
  migrateMovedExerciseProgress,
  practiceRunSummary,
  practiceCompletionPersistence,
  normalizePracticeRunAnswerMetrics,
  resolvePracticeStart,
  workbookCompletionSummary,
} from './exerciseCompletionEngine.ts';

const exercise = (id: string, type: Exercise['type'] = 'multiple-choice', isNewVocab = false): Exercise => ({
  id, type, instruction: 'Answer', audioValue: 'hello', correctValue: 'Hello!', isNewVocab,
});
const input = (item = exercise('e1'), attempts = 1) => ({
  workbookId: 1, lessonId: 'lesson1', dayId: 'w1l1d1', exercise: item, attempts,
  runId: 'run-1',
  completedAt: '2026-07-14T12:00:00.000Z',
});

test('1. normal completion awards first-try points', () => {
  const result = completeExercise(emptyExerciseProgress(), input());
  assert.equal(result.pointsAwarded, 10);
  assert.equal(Object.keys(result.state.records).length, 1);
});

test('2. wrong answer followed by retry awards the retry value', () => {
  assert.equal(pointsForCompletion(2), 6);
  assert.equal(completeExercise(emptyExerciseProgress(), input(exercise('e1'), 3)).record.attempts, 3);
});

test('3. the same run completion is idempotent and cannot farm points', () => {
  const first = completeExercise(emptyExerciseProgress(), input());
  const repeated = completeExercise(first.state, input());
  assert.equal(repeated.pointsAwarded, 0);
  assert.equal(repeated.duplicate, true);
  assert.equal(repeated.state, first.state);
});

test('3b. replay points scale by completion count while unique progress stays fixed', () => {
  let state = emptyExerciseProgress();
  const points: number[] = [];
  for (let run = 1; run <= 4; run++) {
    const result = completeExercise(state, { ...input(), runId: `run-${run}` });
    state = result.state;
    points.push(result.pointsAwarded);
  }
  assert.deepEqual(points, [10, 20, 30, 40]);
  assert.equal(Object.keys(state.records).length, 1);
  assert.equal(state.records['w1/lesson1/w1l1d1/e1'].completionCount, 4);
  assert.equal(state.records['w1/lesson1/w1l1d1/e1'].replayCount, 3);
});

test('4. all supported exercise types share the completion contract', () => {
  const types: Exercise['type'][] = ['speaking', 'multiple-choice', 'writing', 'identification', 'dialogue'];
  let state = emptyExerciseProgress();
  types.forEach((type, index) => { state = completeExercise(state, input(exercise(`e${index}`, type))).state; });
  assert.deepEqual(new Set(Object.values(state.records).map((record) => record.exerciseType)), new Set(types));
});

test('5. the final exercise produces a complete day summary', () => {
  const day = { id: 'w1l1d1', type: 'practice' as const, exercises: [exercise('e1'), exercise('e2')] };
  let state = completeExercise(emptyExerciseProgress(), input(day.exercises[0])).state;
  state = completeExercise(state, input(day.exercises[1])).state;
  assert.deepEqual(dayCompletionSummary(state, 1, 'lesson1', day).completed, 2);
});

test('6. day accuracy uses real attempts and errors', () => {
  const day = { id: 'w1l1d1', type: 'practice' as const, exercises: [exercise('e1'), exercise('e2')] };
  let state = completeExercise(emptyExerciseProgress(), input(day.exercises[0], 1)).state;
  state = completeExercise(state, input(day.exercises[1], 2)).state;
  const summary = dayCompletionSummary(state, 1, 'lesson1', day);
  assert.deepEqual({ attempts: summary.attempts, errors: summary.errors, accuracy: summary.accuracy }, { attempts: 3, errors: 1, accuracy: 67 });
});

test('7. local persistence survives a reload', () => {
  const memory = new Map<string, string>();
  const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } };
  const completed = completeExercise(emptyExerciseProgress(), input()).state;
  assert.equal(saveExerciseProgress(storage, 'student-1', completed), true);
  assert.deepEqual(loadExerciseProgress(storage, 'student-1'), completed);
});

test('8. anonymous progress remains isolated under its own key', () => {
  const memory = new Map<string, string>();
  const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } };
  saveExerciseProgress(storage, 'anonymous', completeExercise(emptyExerciseProgress(), input()).state);
  assert.equal(Object.keys(loadExerciseProgress(storage, 'signed-in').records).length, 0);
});

test('9. persistence failure is non-blocking and returns false', () => {
  const storage = { setItem: () => { throw new Error('quota'); } };
  assert.equal(saveExerciseProgress(storage, 'student-1', emptyExerciseProgress()), false);
});

test('10. corrupt cached data safely falls back to an empty state', () => {
  assert.deepEqual(loadExerciseProgress({ getItem: () => '{bad json' }, 'student-1'), emptyExerciseProgress());
});

test('11. only explicitly flagged vocabulary becomes a mastery target', () => {
  assert.deepEqual(getExplicitVocabularyTargets(exercise('e1', 'writing', true)), ['hello']);
  assert.deepEqual(getExplicitVocabularyTargets(exercise('e2', 'writing', false)), []);
});

test('11b. replay reviews vocabulary instead of counting it as new again', () => {
  const vocab = exercise('e1', 'writing', true);
  const first = completeExercise(emptyExerciseProgress(), input(vocab));
  const replay = completeExercise(first.state, { ...input(vocab), runId: 'run-2' });
  assert.equal(practiceRunSummary(first.state, 'run-1').newVocabulary, 1);
  assert.equal(practiceRunSummary(replay.state, 'run-2').newVocabulary, 0);
  assert.equal(practiceRunSummary(replay.state, 'run-2').vocabularyReviewed, 1);
});

test('12. hierarchical workbook progress is derived from stable exercise keys', () => {
  const item1 = exercise('e1');
  const item2 = exercise('e2');
  const workbook: Workbook = { id: 1, title: 'Workbook 1', lessons: [{ id: 'lesson1', title: 'Lesson 1', days: [{ id: 'w1l1d1', type: 'practice', exercises: [item1, item2] }] }] };
  const state = completeExercise(emptyExerciseProgress(), input(item1)).state;
  assert.deepEqual(workbookCompletionSummary(workbook, state), { completed: 1, total: 2, percentage: 50 });
  assert.deepEqual(lessonCompletionSummary(workbook, 'lesson1', state), { completed: 1, total: 2, percentage: 50 });
  assert.deepEqual(courseCompletionSummary([workbook], state), { completed: 1, publishedTotal: 2, plannedTotal: 10800, publishedPercentage: 50, plannedPercentage: 0 });
});

test('13. legacy completed days seed non-zero lesson and workbook unique progress', () => {
  const item1 = exercise('e1');
  const item2 = exercise('e2');
  const workbook: Workbook = { id: 1, title: 'Workbook 1', lessons: [{ id: 'lesson1', title: 'Lesson 1', days: [{ id: 'w1l1d1', type: 'practice', exercises: [item1, item2] }] }] };
  const state = mergeLegacyCompletedDays(emptyExerciseProgress(), workbook, ['w1l1d1']);
  assert.deepEqual(lessonCompletionSummary(workbook, 'lesson1', state), { completed: 2, total: 2, percentage: 100 });
  assert.deepEqual(workbookCompletionSummary(workbook, state), { completed: 2, total: 2, percentage: 100 });
});

test('14. completed days and direct exercise 2 start in exercise mode, never at summary', () => {
  assert.deepEqual(resolvePracticeStart(15, -1), { index: 0, isReplay: true });
  assert.deepEqual(resolvePracticeStart(15, -1, 1), { index: 1, isReplay: true });
});

test('15. moving a stable exercise ID mirrors completion without deleting the old record', () => {
  const item1 = exercise('e1');
  const original = completeExercise(emptyExerciseProgress(), {
    workbookId: 1, lessonId: 'lesson1', dayId: 'day6', exercise: item1, attempts: 1, runId: 'before-move', completedAt: '2026-07-15T12:00:00.000Z',
  }).state;
  const workbook: Workbook = { id: 1, title: 'Workbook 1', lessons: [{ id: 'lesson1', title: 'Lesson 1', days: [
    { id: 'day6', type: 'practice', exercises: [] },
    { id: 'day7', type: 'review', exercises: [item1] },
  ] }] };
  const migrated = migrateMovedExerciseProgress(original, workbook);
  assert.ok(migrated.records['w1/lesson1/day6/e1']);
  assert.equal(migrated.records['w1/lesson1/day7/e1']?.source, 'migrated-day');
});

test('16. replay completion records activity without duplicating the unique trail', () => {
  assert.deepEqual(practiceCompletionPersistence(false), { recordActivity: true, recordUniqueCompletion: true });
  assert.deepEqual(practiceCompletionPersistence(true), { recordActivity: true, recordUniqueCompletion: false });
});

test('17. an error followed by correction remains two answer attempts', () => {
  assert.deepEqual(normalizePracticeRunAnswerMetrics(15, 16, 1), {
    totalQuestions: 15,
    attempts: 16,
    errors: 1,
    correctAnswers: 15,
  });
});
