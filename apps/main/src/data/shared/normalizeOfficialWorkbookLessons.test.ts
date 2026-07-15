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
