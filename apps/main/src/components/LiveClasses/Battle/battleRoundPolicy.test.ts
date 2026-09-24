import assert from 'node:assert/strict';
import {
  getBattleRoundDurationMs,
  isFirstCorrectAnswerQuestion,
  isOpenTextBattleQuestion,
  resolveFirstCorrectSubmission,
  sanitizeBattleQuestion,
} from './battleUtils';

const audioOpen = {
  kind: 'audio-open' as const,
  responseMode: 'open-text' as const,
  requiresTextInput: true,
  promptAudioText: 'Where is the TV?',
  correctText: 'The TV is in the living room.',
  acceptedAnswers: ['The TV is in the living room.'],
};
const textOpen = {
  kind: 'speaking' as const,
  sourceQuestionType: 'speaking',
  responseMode: 'open-text' as const,
  requiresTextInput: true,
  correctText: 'It is on the table.',
  acceptedAnswers: ['It is on the table.'],
};
const audioChoice = {
  kind: 'audio-choice' as const,
  responseMode: 'choice' as const,
  requiresTextInput: false,
  promptAudioText: 'Where is the TV?',
  options: ['on the wall', 'under the bed'],
  correctIndex: 0,
};
const multipleChoice = {
  kind: 'multiple-choice' as const,
  responseMode: 'choice' as const,
  requiresTextInput: false,
  options: ['in', 'on'],
  correctIndex: 1,
};
const unexpectedOpenKind = {
  kind: 'multiple-choice' as const,
  responseMode: 'open-text' as const,
  requiresTextInput: true,
  correctText: 'The TV is next to the sofa.',
};

assert.equal(isOpenTextBattleQuestion(audioOpen), true);
assert.equal(isOpenTextBattleQuestion(textOpen), true);
assert.equal(isOpenTextBattleQuestion(audioChoice), false);
assert.equal(isOpenTextBattleQuestion(multipleChoice), false);
assert.equal(isOpenTextBattleQuestion(unexpectedOpenKind), true);
assert.equal(isFirstCorrectAnswerQuestion(audioOpen), true);
assert.equal(getBattleRoundDurationMs(audioOpen, { timePerQuestion: 20 } as any), null);
assert.equal(getBattleRoundDurationMs(textOpen, { timePerQuestion: 20 } as any), null);
assert.equal(getBattleRoundDurationMs({ kind: 'multiple-choice' }, { timePerQuestion: 20 } as any), 20_000);
assert.equal(getBattleRoundDurationMs(audioChoice, { timePerQuestion: 30 } as any), 30_000);

const transformedSpeaking = sanitizeBattleQuestion({
  id: 'trail-speaking-1',
  sourceExerciseId: 'exercise-1',
  sourceQuestionType: 'speaking',
  kind: 'speaking',
  responseMode: 'open-text',
  requiresTextInput: true,
  text: 'Listen and answer with a short sentence.\nWhere is the TV?',
  promptAudioText: 'Where is the TV?',
  correctText: 'The TV is in the living room.',
  acceptedAnswers: ['The TV is in the living room.'],
});
assert.ok(transformedSpeaking);
assert.equal(transformedSpeaking.responseMode, 'open-text');
assert.equal(transformedSpeaking.requiresTextInput, true);
assert.equal(transformedSpeaking.sourceQuestionType, 'speaking');
assert.equal(getBattleRoundDurationMs(transformedSpeaking, { timePerQuestion: 30 } as any), null);

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
