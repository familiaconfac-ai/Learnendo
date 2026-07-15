import assert from 'node:assert/strict';
import test from 'node:test';
import { workbook1 } from '../node_modules/.cache/workbook1-test-bundle.mjs';

function rank(exercise) {
  const visual = Boolean(exercise.displayValue?.trim());
  const instruction = exercise.instruction.toLowerCase();
  if (visual && ['identification', 'multiple-choice'].includes(exercise.type)) return 1;
  if (['identification', 'multiple-choice'].includes(exercise.type)) return /listen|hear/.test(instruction) ? 6 : 3;
  if (exercise.type === 'writing') {
    if (/complete|missing|blank/.test(instruction) && visual) return 4;
    return /listen|hear|you hear/.test(instruction) || !visual ? 7 : 5;
  }
  if (exercise.type === 'speaking') return exercise.assessmentMode === 'speaking' ? 9 : 8;
  return 3;
}

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
  }
});

test('five stable Dia 6 IDs move to the Final Test and progress can be migrated', () => {
  for (const lesson of workbook1.lessons) {
    const day6Ids = new Set(lesson.days[5].exercises.map((exercise) => exercise.id));
    const finalIds = new Set(lesson.days[6].exercises.map((exercise) => exercise.id));
    for (let exerciseNumber = 11; exerciseNumber <= 15; exerciseNumber += 1) {
      const id = `${lesson.id}_d6_e${exerciseNumber}`;
      assert.equal(day6Ids.has(id), false, id);
      assert.equal(finalIds.has(id), true, id);
    }
  }
});

test('practice activities progress from supported recognition to production', () => {
  for (const lesson of workbook1.lessons) {
    const ranks = lesson.days.slice(0, 6).flatMap((day) => day.exercises.map(rank));
    assert.deepEqual(ranks, [...ranks].sort((left, right) => left - right), lesson.id);
  }
});
