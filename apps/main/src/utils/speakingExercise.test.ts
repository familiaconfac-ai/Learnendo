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

test('reported Joe answer accepts normalization without accepting another name', () => {
  const choosingTeam = {
    instruction: 'Listen and answer aloud in English.',
    audioValue: 'Who came first?',
    correctValue: 'Joe',
    acceptedAnswers: ['Joe', 'Jo'],
    assessmentMode: 'speaking' as const,
  };
  for (const answer of ['Joe', ' joe ', 'JOE.', 'Joe!', 'Jo']) {
    assert.equal(isSpeakingResponseCorrect(choosingTeam, answer), true, answer);
  }
  for (const answer of ['John', 'Tom', 'Sam']) {
    assert.equal(isSpeakingResponseCorrect(choosingTeam, answer), false, answer);
  }
});

test('open day speaking accepts a day alone or in a complete sentence', () => {
  const openDay = {
    instruction: 'Say any day of the week.',
    audioValue: 'Today is Monday.',
    correctValue: 'Today is Monday.',
    acceptedAnswers: ['Monday', 'Today is Tuesday.', 'It is Wednesday.'],
    assessmentMode: 'speaking' as const,
  };
  assert.equal(classifySpeakingExercise(openDay), 'question-and-answer');
  for (const answer of ['Monday', 'Today is Monday.', 'Today is Tuesday.', 'It is Wednesday.']) {
    assert.equal(isSpeakingResponseCorrect(openDay, answer), true, answer);
  }
});

test('isolated letters use a Bluetooth-safe TTS phrase without changing the target', () => {
  assert.equal(resolvePromptAudioText({ audioValue: 'H', correctValue: 'H' }), 'This is the letter H.');
  assert.equal(resolvePromptAudioText({ audioValue: 'A', correctValue: 'A' }), 'This is the letter A.');
  assert.equal(resolvePromptAudioText({ audioValue: 'E', correctValue: 'E' }), 'This is the letter E.');
  assert.notEqual(resolvePromptAudioText({ audioValue: 'H', correctValue: 'H' }), 'eight');
});
