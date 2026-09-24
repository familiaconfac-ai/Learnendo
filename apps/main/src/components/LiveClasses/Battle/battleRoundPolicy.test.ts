import assert from 'node:assert/strict';
import {
  getBattleRoundDurationMs,
  isFirstCorrectAnswerQuestion,
  resolveFirstCorrectSubmission,
} from './battleUtils';

assert.equal(isFirstCorrectAnswerQuestion({ kind: 'audio-open' }), true);
assert.equal(isFirstCorrectAnswerQuestion({ kind: 'multiple-choice' }), false);
assert.equal(isFirstCorrectAnswerQuestion({ kind: 'audio-choice' }), false);
assert.equal(isFirstCorrectAnswerQuestion({ kind: 'speaking' }), false);
assert.equal(getBattleRoundDurationMs({ kind: 'audio-open' }, { timePerQuestion: 20 } as any), null);
assert.equal(getBattleRoundDurationMs({ kind: 'multiple-choice' }, { timePerQuestion: 20 } as any), 20_000);
assert.equal(getBattleRoundDurationMs({ kind: 'audio-choice' }, { timePerQuestion: 30 } as any), 30_000);

assert.equal(resolveFirstCorrectSubmission(null, false), 'retry');
assert.equal(resolveFirstCorrectSubmission(null, true), 'accept-winner');
assert.equal(resolveFirstCorrectSubmission('student-a', true), 'round-won');
assert.equal(resolveFirstCorrectSubmission('student-a', false), 'round-won');

// Wrong submissions do not claim the round; the same or another student may still win.
assert.equal(resolveFirstCorrectSubmission(null, false), 'retry');
assert.equal(resolveFirstCorrectSubmission(null, true), 'accept-winner');
// Once the transaction stores a winner, later correct submissions cannot replace it.
assert.equal(resolveFirstCorrectSubmission('student-b', true), 'round-won');

console.log('battleRoundPolicy tests passed');
