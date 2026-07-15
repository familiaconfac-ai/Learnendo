import assert from 'node:assert/strict';
import test from 'node:test';
import { workbook1 } from '../node_modules/.cache/workbook1-test-bundle.mjs';

const normalized = (value = '') => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

test('all Workbook 1 lessons have the approved 100-exercise distribution and unique IDs', () => {
  for (const lesson of workbook1.lessons) {
    assert.deepEqual(lesson.days.map((day) => day.exercises.length), [15, 15, 15, 10, 15, 10, 20], lesson.id);
    const ids = lesson.days.flatMap((day) => day.exercises.map((exercise) => exercise.id));
    assert.equal(new Set(ids).size, 100, lesson.id);
  }
});

test('each Final Test has 8 listening-writing, 6 shadowing and 6 speaking exercises', () => {
  for (const lesson of workbook1.lessons) {
    const finalTest = lesson.days[6].exercises;
    for (const [mode, count] of [['listening-writing', 8], ['shadowing', 6], ['speaking', 6]]) {
      assert.equal(finalTest.filter((exercise) => exercise.assessmentMode === mode).length, count, `${lesson.id}:${mode}`);
    }
    assert.ok(finalTest.filter((exercise) => exercise.assessmentMode === 'speaking').every((exercise) => /\?$/.test(exercise.audioValue.trim())), lesson.id);
    assert.ok(finalTest.filter((exercise) => exercise.assessmentMode === 'speaking').every((exercise) => !/appropriate English response|answer this prompt aloud/i.test(exercise.audioValue)), lesson.id);
    assert.ok(finalTest.every((exercise) => exercise.coverageObjective), lesson.id);
    const assessmentKeys = finalTest.map((exercise) => `${exercise.assessmentMode}|${exercise.audioValue}|${exercise.correctValue}`.toLowerCase());
    assert.equal(new Set(assessmentKeys).size, 20, `${lesson.id}: repeated Final Test item`);
    const practice = lesson.days.slice(0, 6).flatMap((day) => day.exercises);
    const taughtValues = new Set(practice.flatMap((exercise) => [exercise.audioValue, exercise.correctValue, exercise.displayValue].map(normalized)).filter(Boolean));
    for (const exercise of finalTest) {
      const taught = exercise.assessmentMode === 'speaking'
        ? taughtValues.has(normalized(exercise.correctValue))
        : taughtValues.has(normalized(exercise.audioValue));
      assert.equal(taught, true, `${lesson.id}: Final Test uses untaught content: ${exercise.id}`);
    }
  }
});

test('generated Final Tests use versioned IDs instead of reassigning practice IDs', () => {
  for (const lesson of workbook1.lessons) {
    if (lesson.id === 'wb1_l1') continue;
    const practiceIds = new Set(lesson.days.slice(0, 6).flatMap((day) => day.exercises.map((exercise) => exercise.id)));
    const finalIds = lesson.days[6].exercises.map((exercise) => exercise.id);
    assert.ok(finalIds.every((id) => id.startsWith(`${lesson.id}_final_v2_`)), lesson.id);
    assert.ok(finalIds.every((id) => !practiceIds.has(id)), lesson.id);
  }
});

test('Lesson 1 starts deterministically with alphabet and numbers and contains no greetings', () => {
  const lesson = workbook1.lessons[0];
  assert.deepEqual(lesson.days[0].exercises.slice(0, 5).map((exercise) => exercise.id), [
    'wb1_l1_intro_letter_a', 'wb1_l1_intro_letter_b', 'wb1_l1_intro_letter_c',
    'wb1_l1_intro_letter_d', 'wb1_l1_intro_letter_e',
  ]);
  assert.ok(lesson.days[0].exercises.every((exercise) => ['alphabet', 'numbers'].includes(exercise.pedagogicalTopic)));
  const renderedText = lesson.days.flatMap((day) => day.exercises)
    .map((exercise) => `${exercise.instruction} ${exercise.audioValue} ${exercise.correctValue}`)
    .join(' ');
  assert.doesNotMatch(renderedText, /hello|good morning|how are you|nice to meet you|good night|good evening|goodbye/i);
});

test('colors are introduced visually before writing, listening-only and speaking', () => {
  const lesson = workbook1.lessons[0];
  const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'black', 'white', 'purple', 'pink', 'brown'];
  const practice = lesson.days.slice(0, 6).flatMap((day, dayIndex) => day.exercises.map((exercise) => ({ exercise, dayIndex })));
  for (const color of colors) {
    const occurrences = practice.filter(({ exercise }) => normalized(`${exercise.displayValue} ${exercise.audioValue} ${exercise.correctValue}`).includes(color));
    assert.ok(occurrences.length > 0, color);
    const first = occurrences[0];
    assert.equal(first.dayIndex, 3, `${color}: first appearance must be visual introduction on Day 4`);
    assert.equal(first.exercise.introducesNewContent, true, color);
    assert.ok(first.exercise.displayValue, `${color}: visual stimulus is required`);
    for (const occurrence of occurrences.filter(({ exercise }) => exercise.assessesContent)) {
      assert.ok(occurrence.dayIndex > first.dayIndex, `${color}: assessed before introduction`);
    }
  }
  assert.ok(lesson.days[4].exercises.every((exercise) => exercise.type === 'writing'));
  assert.ok(lesson.days[5].exercises.slice(0, 4).every((exercise) => /listen/i.test(exercise.instruction)));
  assert.ok(lesson.days[5].exercises.slice(-3).every((exercise) => exercise.assessmentMode === 'shadowing'));
  assert.doesNotMatch(practice.map(({ exercise }) => `${exercise.audioValue} ${exercise.correctValue}`).join(' '), /watercolor|\bzip\b/i);
});
