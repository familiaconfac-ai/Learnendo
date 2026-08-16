import assert from 'node:assert/strict';
import test from 'node:test';
import { createMasterySession, jumpToMasteryExercise, masteryMetrics, recordMasteryAttempt, restoreMasterySession } from './masteryQueueEngine.ts';

test('all initial answers correct complete without review', () => {
  let state = createMasterySession(['1', '2', '3']);
  for (const id of state.exerciseIds) state = recordMasteryAttempt(state, id, true);
  assert.equal(state.phase, 'complete');
  assert.deepEqual(state.reviewQueue, []);
  assert.equal(state.masteredCount, 3);
});

test('jumping forward preserves completed work and moves skipped exercises to the end', () => {
  let state = createMasterySession(['1', '2', '3', '4', '5']);
  state = recordMasteryAttempt(state, '1', true);
  state = jumpToMasteryExercise(state, '4');
  assert.equal(state.currentExerciseId, '4');
  assert.deepEqual(state.exerciseIds, ['1', '4', '5', '2', '3']);
  assert.equal(state.items['1'].status, 'mastered');

  for (const id of ['4', '5', '2', '3']) state = recordMasteryAttempt(state, id, true);
  assert.equal(state.phase, 'complete');
  assert.equal(state.masteredCount, 5);
});

test('an incorrect exercise still returns after jumping forward through the dots', () => {
  let state = createMasterySession(['1', '2', '3', '4']);
  state = recordMasteryAttempt(state, '1', false);
  state = recordMasteryAttempt(state, '1', true);
  state = jumpToMasteryExercise(state, '4');
  for (const id of ['4', '2', '3']) state = recordMasteryAttempt(state, id, true);

  assert.equal(state.phase, 'review');
  assert.equal(state.currentExerciseId, '1');
  assert.deepEqual(state.reviewQueue, ['1']);
  state = recordMasteryAttempt(state, '1', true);
  assert.equal(state.phase, 'complete');
});

test('jumping inside the review queue keeps every correction obligation', () => {
  let state = createMasterySession(['1', '2']);
  state = recordMasteryAttempt(state, '1', false);
  state = recordMasteryAttempt(state, '1', true);
  state = recordMasteryAttempt(state, '2', false);
  state = recordMasteryAttempt(state, '2', true);
  state = jumpToMasteryExercise(state, '2');
  assert.deepEqual(state.reviewQueue, ['2', '1']);
  assert.equal(state.currentExerciseId, '2');
});

test('initial correction unlocks progress but preserves the logical review obligation', () => {
  let state = createMasterySession(['1', '2']);
  state = recordMasteryAttempt(state, '1', false);
  assert.deepEqual(state.reviewQueue, ['1']);
  state = recordMasteryAttempt(state, '1', true);
  assert.equal(state.currentExerciseId, '2');
  assert.deepEqual(state.reviewQueue, ['1']);
  assert.equal(state.items['1'].status, 'queued-for-review');
  assert.equal(state.items['1'].masteredDuringReview, false);
  state = recordMasteryAttempt(state, '2', true);
  assert.equal(state.phase, 'review');
  assert.equal(state.currentExerciseId, '1');
  state = recordMasteryAttempt(state, '1', true);
  assert.equal(state.phase, 'complete');
  assert.deepEqual(state.reviewQueue, []);
  assert.equal(state.items['1'].masteredDuringReview, true);
});

test('two initial errors return in insertion order before completion', () => {
  let state = createMasterySession(['1', '2', '3', '4', '5']);
  for (const id of state.exerciseIds) {
    if (id === '2' || id === '4') state = recordMasteryAttempt(state, id, false);
    state = recordMasteryAttempt(state, id, true);
  }
  assert.equal(state.phase, 'review');
  assert.deepEqual(state.reviewQueue, ['2', '4']);
  assert.equal(state.currentExerciseId, '2');
  state = recordMasteryAttempt(state, '2', true);
  assert.deepEqual(state.reviewQueue, ['4']);
  assert.equal(state.currentExerciseId, '4');
  state = recordMasteryAttempt(state, '4', true);
  assert.equal(state.phase, 'complete');
});

test('four initial errors create one queue entry and preserve all attempts', () => {
  let state = createMasterySession(['one']);
  for (let attempt = 0; attempt < 4; attempt += 1) state = recordMasteryAttempt(state, 'one', false);
  state = recordMasteryAttempt(state, 'one', true);
  assert.equal(state.phase, 'review');
  assert.deepEqual(state.reviewQueue, ['one']);
  assert.equal(state.items.one.incorrectAttempts, 4);
  assert.deepEqual(state.items.one.attemptHistory.map(({ phase, correct }) => [phase, correct]), [
    ['initial', false], ['initial', false], ['initial', false], ['initial', false], ['initial', true],
  ]);
});

test('an error and correction during review rotates the item instead of mastering it', () => {
  let state = createMasterySession(['one']);
  state = recordMasteryAttempt(state, 'one', false);
  state = recordMasteryAttempt(state, 'one', true);
  state = recordMasteryAttempt(state, 'one', false);
  assert.equal(state.phase, 'review');
  assert.equal(state.currentExerciseId, 'one');
  assert.deepEqual(state.reviewQueue, ['one']);
  assert.equal(state.items.one.incorrectAttempts, 2);
  state = recordMasteryAttempt(state, 'one', true);
  assert.equal(state.phase, 'review');
  assert.deepEqual(state.reviewQueue, ['one']);
  assert.equal(state.items.one.status, 'queued-for-review');
  assert.equal(state.items.one.reviewPresentation, 1);
  state = recordMasteryAttempt(state, 'one', true);
  assert.equal(state.phase, 'complete');
  assert.deepEqual(state.reviewQueue, []);
});

test('a corrected review item moves behind the other pending exercises', () => {
  let state = createMasterySession(['1', '2']);
  for (const id of ['1', '2']) {
    state = recordMasteryAttempt(state, id, false);
    state = recordMasteryAttempt(state, id, true);
  }
  assert.deepEqual(state.reviewQueue, ['1', '2']);
  state = recordMasteryAttempt(state, '1', false);
  state = recordMasteryAttempt(state, '1', true);
  assert.deepEqual(state.reviewQueue, ['2', '1']);
  assert.equal(state.currentExerciseId, '2');
  state = recordMasteryAttempt(state, '2', true);
  assert.deepEqual(state.reviewQueue, ['1']);
  state = recordMasteryAttempt(state, '1', true);
  assert.equal(state.phase, 'complete');
});

test('refresh after a review error preserves the retrieval debt', () => {
  let state = createMasterySession(['one']);
  state = recordMasteryAttempt(state, 'one', false);
  state = recordMasteryAttempt(state, 'one', true);
  state = recordMasteryAttempt(state, 'one', false);
  state = restoreMasterySession(JSON.parse(JSON.stringify(state)));
  assert.equal(state.items.one.currentReviewHadError, true);
  state = recordMasteryAttempt(state, 'one', true);
  assert.equal(state.phase, 'review');
  assert.deepEqual(state.reviewQueue, ['one']);
});

test('a nonempty queue prevents completion at the end of the initial path', () => {
  let state = createMasterySession(['one']);
  state = recordMasteryAttempt(state, 'one', false);
  state = recordMasteryAttempt(state, 'one', true);
  assert.notEqual(state.phase, 'complete');
  assert.equal(state.completionBonus, 0);
  assert.equal(state.masteredCount, 0);
});

test('reload before review preserves queue and next initial item', () => {
  let state = createMasterySession(['1', '2']);
  state = recordMasteryAttempt(state, '1', false);
  state = recordMasteryAttempt(state, '1', true);
  state = restoreMasterySession(JSON.parse(JSON.stringify(state)));
  assert.equal(state.phase, 'initial');
  assert.equal(state.currentExerciseId, '2');
  assert.deepEqual(state.reviewQueue, ['1']);
});

test('reload during review preserves the current item, queue and history', () => {
  let state = createMasterySession(['1', '2']);
  state = recordMasteryAttempt(state, '1', false);
  state = recordMasteryAttempt(state, '1', true);
  state = recordMasteryAttempt(state, '2', false);
  state = recordMasteryAttempt(state, '2', true);
  state = recordMasteryAttempt(state, '1', false);
  state = restoreMasterySession(JSON.parse(JSON.stringify(state)));
  assert.equal(state.phase, 'review');
  assert.equal(state.currentExerciseId, '1');
  assert.deepEqual(state.reviewQueue, ['1', '2']);
  assert.equal(state.items['1'].attemptHistory.length, 3);
});

test('legacy caches that prematurely mastered corrected initial items are migrated non-destructively', () => {
  const legacy = createMasterySession(['legacy']) as any;
  legacy.phase = 'complete';
  legacy.currentExerciseId = null;
  legacy.reviewQueue = [];
  legacy.masteredCount = 1;
  legacy.reviewPoints = 3;
  legacy.reviewedExerciseIds = ['legacy'];
  legacy.items.legacy = {
    exerciseId: 'legacy', status: 'mastered', firstPassAttempts: 2, reviewAttempts: 0,
    firstPassHadError: true, currentReviewHadError: false, incorrectAttempts: 1, technicalFailures: 0,
  };
  const state = restoreMasterySession(legacy);
  assert.equal(state.phase, 'review');
  assert.equal(state.currentExerciseId, 'legacy');
  assert.deepEqual(state.reviewQueue, ['legacy']);
  assert.equal(state.masteredCount, 0);
  assert.equal(state.reviewPoints, 0);
});

test('metrics count initial errors and actual review correction separately', () => {
  let state = createMasterySession(['1', '2']);
  state = recordMasteryAttempt(state, '1', false);
  state = recordMasteryAttempt(state, '1', true);
  state = recordMasteryAttempt(state, '2', true);
  state = recordMasteryAttempt(state, '1', true);
  assert.deepEqual(masteryMetrics(state), {
    uniqueExercises: 2,
    firstTryCorrect: 1,
    firstPassErrors: 1,
    exercisesReviewed: 1,
    reviewAttempts: 1,
    mastered: 2,
    initialAccuracy: 50,
    finalMastery: 100,
    reviewPoints: 3,
    completionBonus: 5,
    technicalSkips: 0,
    totalIncorrectAttempts: 1,
  });
});
