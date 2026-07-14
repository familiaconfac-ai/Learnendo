import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePromptAudioText } from './fillInBlankAudio.ts';
import { classifySpeakingExercise, isSpeakingResponseCorrect } from './speakingExercise.ts';

const shadowing = {
  instruction: 'Listen and repeat exactly as you hear.',
  audioValue: 'What is five plus five?',
  correctValue: 'what is five plus five',
};

test('shadowing repeats the question and rejects its semantic answer', () => {
  assert.equal(classifySpeakingExercise(shadowing), 'shadowing');
  assert.equal(isSpeakingResponseCorrect(shadowing, 'What is five plus five?'), true);
  assert.equal(isSpeakingResponseCorrect(shadowing, '10'), false);
  assert.equal(isSpeakingResponseCorrect(shadowing, "It's ten"), false);
});

test('question-and-answer accepts authored answer variants, not the question', () => {
  const qa = { instruction: 'Answer the question.', audioValue: 'What is five plus five?', correctValue: '10', acceptedAnswers: ['ten', "It's ten", 'It is ten'] };
  assert.equal(classifySpeakingExercise(qa), 'question-and-answer');
  for (const answer of ['10', 'ten', "It's ten"]) assert.equal(isSpeakingResponseCorrect(qa, answer), true);
  assert.equal(isSpeakingResponseCorrect(qa, 'What is five plus five?'), false);
});

test('isolated H uses an unambiguous TTS phrase without changing the target', () => {
  assert.equal(resolvePromptAudioText({ audioValue: 'H', correctValue: 'H' }), 'the letter H');
  assert.notEqual(resolvePromptAudioText({ audioValue: 'H', correctValue: 'H' }), 'eight');
});
