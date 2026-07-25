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

test('beginner day speaking uses a simple model and accepts short or complete answers', () => {
  const modeledDay = {
    instruction: 'Listen and say the day.',
    audioValue: 'Monday',
    correctValue: 'Monday',
    acceptedAnswers: ['Monday', 'It is Monday.', 'Today is Monday.'],
    assessmentMode: 'speaking' as const,
  };
  assert.equal(classifySpeakingExercise(modeledDay), 'question-and-answer');
  for (const answer of ['Monday', 'It is Monday.', 'Today is Monday.']) {
    assert.equal(isSpeakingResponseCorrect(modeledDay, answer), true, answer);
  }
  assert.equal(isSpeakingResponseCorrect(modeledDay, 'Say any day of the week.'), false);
  assert.equal(isSpeakingResponseCorrect(modeledDay, 'Tuesday'), false);
});

test('isolated letters use a Bluetooth-safe TTS phrase without changing the target', () => {
  assert.equal(resolvePromptAudioText({ audioValue: 'H', correctValue: 'H' }), 'This is the letter H.');
  assert.equal(resolvePromptAudioText({ audioValue: 'A', correctValue: 'A' }), 'This is the letter A.');
  assert.equal(resolvePromptAudioText({ audioValue: 'E', correctValue: 'E' }), 'This is the letter E.');
  assert.notEqual(resolvePromptAudioText({ audioValue: 'H', correctValue: 'H' }), 'eight');
});
