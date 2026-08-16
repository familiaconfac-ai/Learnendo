import assert from 'node:assert/strict';
import test from 'node:test';
import type { Day, Exercise, Lesson } from '../../types.ts';
import { normalizeLessonsToOfficialTrails } from './normalizeOfficialWorkbookLessons.ts';

const choice = (id: string, question: string, answer: string): Exercise => ({
  id, type: 'multiple-choice', instruction: 'Choose the correct response.', audioValue: question,
  correctValue: answer, options: [answer, 'Wrong 1', 'Wrong 2', 'Wrong 3'],
});

const filler = (day: number): Day => ({ id: `source_d${day}`, type: 'practice', exercises: [choice(`f${day}`, `Question ${day}?`, `Answer ${day}`)] });

test('Workbook 1 recognition precedes production and preserves official day counts', () => {
  const days = Array.from({ length: 7 }, (_, index) => filler(index + 1));
  days[5] = { id: 'source_d6', type: 'practice', exercises: [
    choice('how', 'How are you?', "I'm fine, thank you."),
    choice('name', 'What is your name?', 'My name is Lucas.'),
    choice('first', 'What is your first name?', 'My first name is Lucas.'),
    choice('last', 'What is your last name?', 'My last name is Silva.'),
  ] };
  const lesson: Lesson = { id: 'wb1_l1', title: 'Lesson 1', days };
  const normalized = normalizeLessonsToOfficialTrails([lesson])[0];

  assert.deepEqual(normalized.days.map((day) => day.exercises.length), [15, 15, 15, 10, 15, 15, 15]);
  for (const question of ['How are you?', 'What is your name?', 'What is your first name?', 'What is your last name?']) {
    const recognition = normalized.days[4].exercises.find((exercise) => exercise.audioValue === question && exercise.type === 'multiple-choice');
    const production = normalized.days[5].exercises.find((exercise) => exercise.correctValue === question && exercise.promptMode === 'write-question');
    assert.ok(recognition, `missing recognition for ${question}`);
    assert.ok(production, `missing question production for ${question}`);
  }
});

test('the question-production correction is scoped to Workbook 1', () => {
  const lesson: Lesson = { id: 'wb2_l1', title: 'Lesson 1', days: Array.from({ length: 7 }, (_, index) => filler(index + 1)) };
  const normalized = normalizeLessonsToOfficialTrails([lesson])[0];
  assert.equal(normalized.days.flatMap((day) => day.exercises).some((exercise) => exercise.promptMode === 'write-question'), false);
});

test('Day 4 preserves discrimination and comprehension when audio is not the answer', () => {
  const days = Array.from({ length: 7 }, (_, index) => filler(index + 1));
  days[3] = { id: 'source_d4', type: 'practice', exercises: [{
    id: 'same-different', type: 'multiple-choice',
    instruction: 'Listen. Are they the same or different?', audioValue: 'ship sheep',
    correctValue: 'different', options: ['same', 'different'],
  }] };
  const lesson: Lesson = { id: 'wb1_l3', title: 'Lesson 3', days };
  const normalized = normalizeLessonsToOfficialTrails([lesson])[0];

  const discrimination = normalized.days[3].exercises[0];
  assert.equal(discrimination.type, 'multiple-choice');
  assert.equal(discrimination.instruction, 'Listen. Are they the same or different?');
  assert.equal(discrimination.audioValue, 'ship sheep');
  assert.equal(discrimination.correctValue, 'different');
  assert.deepEqual(discrimination.options, ['same', 'different']);
});

test('Day 4 keeps the existing repeat conversion when audio already matches the answer', () => {
  const days = Array.from({ length: 7 }, (_, index) => filler(index + 1));
  days[3] = { id: 'source_d4', type: 'practice', exercises: [{
    id: 'safe-repeat', type: 'writing', instruction: 'Write what you hear.',
    audioValue: 'Good morning.', correctValue: 'good morning',
  }] };
  const lesson: Lesson = { id: 'wb1_l6', title: 'Lesson 6', days };
  const normalized = normalizeLessonsToOfficialTrails([lesson])[0];

  assert.equal(normalized.days[3].exercises[0].type, 'speaking');
  assert.equal(normalized.days[3].exercises[0].instruction, 'Listen and repeat.');
});

test('authored modeled speaking targets match the complete text heard wherever the trail reuses them', () => {
  const days = Array.from({ length: 7 }, (_, index) => filler(index + 1));
  days[5] = { id: 'source_d6', type: 'practice', exercises: [{
    id: 'modeled-text', type: 'speaking', instruction: 'Listen to the text.',
    audioValue: 'Good morning. My name is Ben.', correctValue: 'Good morning.',
  }] };
  const lesson: Lesson = { id: 'wb1_l6', title: 'Lesson 6', days };
  const normalized = normalizeLessonsToOfficialTrails([lesson])[0];
  const reused = normalized.days.flatMap((day) => day.exercises)
    .filter((exercise) => exercise.sourceExerciseId === 'modeled-text');

  assert.ok(reused.length > 1);
  assert.ok(reused.every((exercise) => exercise.assessmentMode === 'shadowing'));
  assert.ok(reused.every((exercise) => exercise.instruction === 'Listen and repeat exactly what you hear.'));
  assert.ok(reused.every((exercise) => exercise.correctValue === exercise.audioValue));
});
