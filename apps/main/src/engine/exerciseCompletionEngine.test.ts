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
  workbookCompletionSummary,
} from './exerciseCompletionEngine.ts';

const exercise = (id: string, type: Exercise['type'] = 'multiple-choice', isNewVocab = false): Exercise => ({
  id, type, instruction: 'Answer', audioValue: 'hello', correctValue: 'Hello!', isNewVocab,
});
const input = (item = exercise('e1'), attempts = 1) => ({
  workbookId: 1, lessonId: 'lesson1', dayId: 'w1l1d1', exercise: item, attempts,
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

test('3. the same completion is idempotent and cannot farm points', () => {
  const first = completeExercise(emptyExerciseProgress(), input());
  const repeated = completeExercise(first.state, input());
  assert.equal(repeated.pointsAwarded, 0);
  assert.equal(repeated.duplicate, true);
  assert.equal(repeated.state, first.state);
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

test('12. hierarchical workbook progress is derived from stable exercise keys', () => {
  const item1 = exercise('e1');
  const item2 = exercise('e2');
  const workbook: Workbook = { id: 1, title: 'Workbook 1', lessons: [{ id: 'lesson1', title: 'Lesson 1', days: [{ id: 'w1l1d1', type: 'practice', exercises: [item1, item2] }] }] };
  const state = completeExercise(emptyExerciseProgress(), input(item1)).state;
  assert.deepEqual(workbookCompletionSummary(workbook, state), { completed: 1, total: 2, percentage: 50 });
  assert.deepEqual(lessonCompletionSummary(workbook, 'lesson1', state), { completed: 1, total: 2, percentage: 50 });
  assert.deepEqual(courseCompletionSummary([workbook], state), { completed: 1, publishedTotal: 2, plannedTotal: 10800, publishedPercentage: 50, plannedPercentage: 0 });
});
