import assert from 'node:assert/strict';
import test from 'node:test';
import { applyExerciseOverride, diffExerciseOverride, validateExerciseOverride, type ExerciseIdentity } from './exerciseOverride.ts';
import type { Exercise } from '../types.ts';

const original: Exercise = {
  id: 'wb1_l1_d1_mc_1', type: 'multiple-choice', instruction: 'Choose.', displayValue: 'One?',
  audioValue: '', options: ['One', 'Two'], correctValue: 'One', acceptedAnswers: [],
};
const identity: ExerciseIdentity = { exerciseId: original.id, workbookId: 1, lessonId: 'wb1_l1', dayId: 'wb1_l1_d1', language: 'en', exerciseType: 'multiple-choice' };

test('applies only safe content while preserving id and type', () => {
  const resolved = applyExerciseOverride(original, { ...identity, status: 'published', version: 2, override: { instruction: 'Pick.', correctValue: 'Two' } });
  assert.equal(resolved.id, original.id); assert.equal(resolved.type, original.type);
  assert.equal(resolved.instruction, 'Pick.'); assert.equal(resolved.correctValue, 'Two');
});

test('rejects mismatched identity and an invalid multiple-choice answer', () => {
  assert.deepEqual(applyExerciseOverride(original, { ...identity, exerciseId: 'other', status: 'published', version: 1, override: { instruction: 'Unsafe' } }), original);
  assert.ok(validateExerciseOverride(original, identity, { correctValue: 'Three' }).includes('A resposta correta não está entre as alternativas.'));
});

test('stores only fields changed from local content', () => {
  assert.deepEqual(diffExerciseOverride(original, { instruction: 'Choose.', displayValue: 'Changed' }), { displayValue: 'Changed' });
});

test('never accepts a local blob preview as published content', () => {
  const errors = validateExerciseOverride(original, identity, { imageUrl: 'blob:https://learnendo.vercel.app/local-preview' });
  assert.ok(errors.some((error) => error.includes('prévia local')));
});
