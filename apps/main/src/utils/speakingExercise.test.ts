import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePromptAudioText } from './fillInBlankAudio.ts';
import { classifySpeakingExercise, isSpeakingResponseCorrect, resolveAcceptedSpokenAnswers } from './speakingExercise.ts';

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

test('shadowing aceita o alvo publicado Good morning com normalização central', () => {
  const published = { instruction: 'Repeat.', assessmentMode: 'shadowing' as const, audioValue: 'Good morning', correctValue: 'Good morning', acceptedAnswers: ['Morning!'] };
  for (const answer of ['Good morning', 'Good morning.', 'good morning', '  Good   morning  ']) {
    assert.equal(isSpeakingResponseCorrect(published, answer), true, answer);
  }
  assert.equal(isSpeakingResponseCorrect(published, 'Good evening'), false);
  assert.equal(isSpeakingResponseCorrect(published, 'Morning!'), true);
  assert.deepEqual(resolveAcceptedSpokenAnswers(published), ['Good morning', 'Morning!']);
});

test('resolver usa somente valores do exercício local, administrativo ou com override recebido', () => {
  const local = { instruction: 'Repeat', assessmentMode: 'shadowing' as const, audioValue: 'Local target', correctValue: 'Local target' };
  const administrative = { ...local, audioValue: 'Published target', correctValue: 'Published target' };
  const overridden = { ...administrative, correctValue: 'Override target', acceptedAnswers: ['Published target'] };
  assert.equal(isSpeakingResponseCorrect(local, 'Local target'), true);
  assert.equal(isSpeakingResponseCorrect(administrative, 'Published target'), true);
  assert.equal(isSpeakingResponseCorrect(overridden, 'Override target'), true);
  assert.equal(resolveAcceptedSpokenAnswers(overridden).includes('Published target'), true);
});

test('repeat has an explicit mode while sharing the modeled pronunciation target', () => {
  const repeat = { ...shadowing, instruction: 'Listen first. Then repeat.', assessmentMode: 'repeat' as const };
  assert.equal(classifySpeakingExercise(repeat), 'repeat');
  assert.equal(isSpeakingResponseCorrect(repeat, 'What is five plus five?'), true);
  assert.equal(isSpeakingResponseCorrect(repeat, '10'), false);
});

test('question-and-answer accepts authored answer variants, not the question', () => {
  const qa = { instruction: 'Answer the question.', audioValue: 'What is five plus five?', correctValue: '10', acceptedAnswers: ['ten', "It's ten", 'It is ten'] };
  assert.equal(classifySpeakingExercise(qa), 'question-and-answer');
  for (const answer of ['10', 'ten', "It's ten"]) assert.equal(isSpeakingResponseCorrect(qa, answer), true);
  assert.equal(isSpeakingResponseCorrect(qa, 'What is five plus five?'), false);
});

test('personal speaking templates accept complete natural answers and reject fragments', () => {
  const name = { instruction: 'Listen and answer with your name.', assessmentMode: 'speaking' as const, audioValue: 'What is your name?', correctValue: 'My name is Ana.', acceptedAnswers: ['My name is {name}.', 'I am {name}.'] };
  const age = { instruction: 'Listen and answer with your age.', assessmentMode: 'speaking' as const, audioValue: 'How old are you?', correctValue: 'I am twelve years old.', acceptedAnswers: ['I am {age} years old.', 'I am {age}.'] };
  const place = { instruction: 'Listen and answer with your country.', assessmentMode: 'speaking' as const, audioValue: 'Where are you from?', correctValue: 'I am from Brazil.', acceptedAnswers: ['I am from {place}.'] };

  for (const answer of ['My name is Beatriz.', "I'm Gabriel."]) assert.equal(isSpeakingResponseCorrect(name, answer), true, answer);
  for (const answer of ['I am 13 years old.', "I'm eleven."]) assert.equal(isSpeakingResponseCorrect(age, answer), true, answer);
  for (const answer of ['I am from Argentina.', "I'm from South Africa."]) assert.equal(isSpeakingResponseCorrect(place, answer), true, answer);
  for (const fragment of ['my name is', 'i am years old', 'i am from']) {
    assert.equal(isSpeakingResponseCorrect(name, fragment), false, fragment);
    assert.equal(isSpeakingResponseCorrect(age, fragment), false, fragment);
    assert.equal(isSpeakingResponseCorrect(place, fragment), false, fragment);
  }
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
