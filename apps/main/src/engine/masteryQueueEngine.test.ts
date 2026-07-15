import assert from 'node:assert/strict';
import test from 'node:test';
import { createMasterySession, masteryMetrics, recordMasteryAttempt } from './masteryQueueEngine.ts';

test('errors 3 and 7 cycle through review until both are cleanly mastered', () => {
  const ids = Array.from({ length: 10 }, (_, index) => String(index + 1));
  let state = createMasterySession(ids);
  for (const id of ids) {
    if (id === '3' || id === '7') state = recordMasteryAttempt(state, id, false);
    state = recordMasteryAttempt(state, id, true);
  }
  assert.deepEqual(state.reviewQueue, ['3', '7']);
  state = recordMasteryAttempt(state, '3', true);
  assert.deepEqual(state.reviewQueue, ['7']);
  state = recordMasteryAttempt(state, '7', false);
  state = recordMasteryAttempt(state, '7', true);
  assert.deepEqual(state.reviewQueue, ['7']);
  state = recordMasteryAttempt(state, '7', true);
  assert.equal(state.phase, 'complete');
  assert.deepEqual(masteryMetrics(state), {
    uniqueExercises: 10, firstTryCorrect: 8, firstPassErrors: 2, exercisesReviewed: 2,
    reviewAttempts: 4, mastered: 10, initialAccuracy: 80, finalMastery: 100,
    reviewPoints: 6, completionBonus: 5, technicalSkips: 0,
  });
});

test('mandatory review does not create another unique exercise', () => {
  let state = createMasterySession(['one']);
  state = recordMasteryAttempt(state, 'one', false);
  state = recordMasteryAttempt(state, 'one', true);
  state = recordMasteryAttempt(state, 'one', true);
  const metrics = masteryMetrics(state);
  assert.equal(metrics.uniqueExercises, 1);
  assert.equal(metrics.mastered, 1);
  assert.equal(metrics.finalMastery, 100);
});
