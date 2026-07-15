import assert from 'node:assert/strict';
import test from 'node:test';
import { createMasterySession, masteryMetrics, recordMasteryAttempt } from './masteryQueueEngine.ts';

test('an exercise is removed from every error queue as soon as it is answered correctly', () => {
  const ids = Array.from({ length: 10 }, (_, index) => String(index + 1));
  let state = createMasterySession(ids);
  for (const id of ids) {
    if (id === '3' || id === '7') state = recordMasteryAttempt(state, id, false);
    state = recordMasteryAttempt(state, id, true);
  }
  assert.deepEqual(state.reviewQueue, []);
  assert.equal(state.phase, 'complete');
  assert.deepEqual(masteryMetrics(state), {
    uniqueExercises: 10, firstTryCorrect: 8, firstPassErrors: 2, exercisesReviewed: 2,
    reviewAttempts: 0, mastered: 10, initialAccuracy: 80, finalMastery: 100,
    reviewPoints: 6, completionBonus: 5, technicalSkips: 0, totalIncorrectAttempts: 2,
  });
});

test('ten wrong attempts followed by one correct attempt complete the only exercise', () => {
  let state = createMasterySession(['one']);
  for (let attempt = 0; attempt < 10; attempt += 1) state = recordMasteryAttempt(state, 'one', false);
  state = recordMasteryAttempt(state, 'one', true);
  const metrics = masteryMetrics(state);
  assert.equal(state.phase, 'complete');
  assert.deepEqual(state.reviewQueue, []);
  assert.equal(metrics.uniqueExercises, 1);
  assert.equal(metrics.mastered, 1);
  assert.equal(metrics.finalMastery, 100);
  assert.equal(metrics.totalIncorrectAttempts, 10);
  assert.equal(state.items.one.incorrectAttempts, 10);
});

test('a restored review item is mastered after any number of errors and one correct answer', () => {
  let state = createMasterySession(['hello']);
  state = recordMasteryAttempt(state, 'hello', false);
  state = { ...state, phase: 'review', currentExerciseId: 'hello', firstPassIndex: 1 };
  for (let attempt = 0; attempt < 4; attempt += 1) state = recordMasteryAttempt(state, 'hello', false);
  state = recordMasteryAttempt(state, 'hello', true);
  assert.equal(state.phase, 'complete');
  assert.equal(state.items.hello.status, 'mastered');
  assert.deepEqual(state.reviewQueue, []);
  assert.equal(state.items.hello.incorrectAttempts, 5);
});

test('serialized attempt history survives reload and a later correct answer', () => {
  let state = createMasterySession(['reload']);
  state = recordMasteryAttempt(state, 'reload', false);
  state = recordMasteryAttempt(state, 'reload', false);
  state = JSON.parse(JSON.stringify(state));
  state = recordMasteryAttempt(state, 'reload', true);
  assert.equal(state.items.reload.status, 'mastered');
  assert.equal(state.items.reload.incorrectAttempts, 2);
  assert.equal(masteryMetrics(state).totalIncorrectAttempts, 2);
  assert.deepEqual(state.reviewQueue, []);
});

for (const wrongAttempts of [1, 2, 4]) {
  test(`${wrongAttempts} wrong attempt(s) stay visible until one correct answer removes the queue item`, () => {
    let state = createMasterySession(['history']);
    for (let attempt = 0; attempt < wrongAttempts; attempt += 1) {
      state = recordMasteryAttempt(state, 'history', false);
      assert.deepEqual(state.reviewQueue, ['history']);
      assert.equal(state.items.history.incorrectAttempts, attempt + 1);
    }
    state = recordMasteryAttempt(state, 'history', true);
    assert.equal(state.items.history.status, 'mastered');
    assert.equal(state.items.history.incorrectAttempts, wrongAttempts);
    assert.deepEqual(state.reviewQueue, []);
    assert.equal(state.phase, 'complete');
  });
}
