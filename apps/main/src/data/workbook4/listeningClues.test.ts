import assert from 'node:assert/strict';
import test from 'node:test';
import { workbook4 } from './index.ts';

const lesson38 = workbook4.lessons.find((lesson) => lesson.id === 'wb4_l38');
assert.ok(lesson38, 'Lesson 38 must exist');

const expectedAudioByAnswer = new Map([
  ['apple', 'Which fruit is round and can be red or green?'],
  ['banana', 'Which fruit is long and yellow?'],
  ['carrot', 'Which vegetable is orange and grows underground?'],
  ['lettuce', 'Which leafy green vegetable is often used in salads?'],
  ['spinach', 'Which dark green leafy vegetable is often cooked or used in salads?'],
  ['rice', 'Which food consists of small grains and is eaten with many meals?'],
  ['garlic', 'Which strong-smelling ingredient is often used in cooking?'],
  ['bunch', 'What do you call a group of fruit or vegetables held together?'],
  ['clove', 'What do you call one small section of a head of garlic?'],
  ['broccoli', 'Which green vegetable has a thick stem and small flower-like tops?'],
]);

test('Lesson 38 keeps all equivalent vocabulary clues audio-only', () => {
  const audioOnly = lesson38.days.flatMap((day) => day.exercises).filter((exercise) =>
    exercise.instruction === 'Listen to the clue and choose the correct word.',
  );

  assert.equal(audioOnly.length, 10);
  assert.ok(audioOnly.every((exercise) => exercise.id.startsWith('wb4_l38_d1_')));
  for (const exercise of audioOnly) {
    assert.equal(exercise.type, 'identification', exercise.id);
    assert.equal(exercise.displayValue, '', exercise.id);
    assert.equal(exercise.audioValue, expectedAudioByAnswer.get(exercise.correctValue), exercise.id);
    assert.equal(exercise.options?.length, 4, exercise.id);
    assert.ok(exercise.options?.includes(exercise.correctValue), exercise.id);
  }
});

test('the audio-only correction is scoped to Lesson 38 and preserves other listening layouts', () => {
  const lesson37 = workbook4.lessons.find((lesson) => lesson.id === 'wb4_l37');
  assert.ok(lesson37);
  assert.equal(lesson37.days.flatMap((day) => day.exercises).some((exercise) =>
    exercise.instruction === 'Listen to the clue and choose the correct word.'
    && !exercise.displayValue,
  ), false);

  const visibleSentenceChoices = lesson38.days[0].exercises.slice(10, 15);
  assert.ok(visibleSentenceChoices.every((exercise) => exercise.displayValue?.includes('____')));
});
