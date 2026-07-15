import assert from 'node:assert/strict';
import test from 'node:test';
import type { Exercise } from '../../types.ts';
import { validateNumberRecognitionExercise } from './numberRecognitionValidation.ts';

const exercise = (displayValue: string, options: string[], correctValue: string): Exercise => ({
  id: 'number-14',
  type: 'identification',
  instruction: 'Choose the correct number.',
  audioValue: 'fourteen. This is the number fourteen.',
  displayValue,
  options,
  correctValue,
});

test('digit 14 requires word options and matches the audio target', () => {
  const result = validateNumberRecognitionExercise(exercise('14', ['four', 'fourteen', 'forty', 'forty-four'], 'fourteen'));
  assert.equal(result.valid, true);
  assert.equal(result.displayFormat, 'digits');
  assert.equal(result.optionsFormat, 'words');
  assert.equal(result.targetNumber, 14);
});

test('word FOURTEEN requires digit options and matches the audio target', () => {
  const result = validateNumberRecognitionExercise(exercise('FOURTEEN', ['4', '14', '40', '44'], '14'));
  assert.equal(result.valid, true);
  assert.equal(result.displayFormat, 'words');
  assert.equal(result.optionsFormat, 'digits');
  assert.equal(result.targetNumber, 14);
});

test('rejects number over number and a literally revealed answer', () => {
  const result = validateNumberRecognitionExercise(exercise('14', ['4', '14', '40', '44'], '14'));
  assert.equal(result.valid, false);
  assert.ok(result.issues.includes('numeric-display-requires-word-options'));
  assert.ok(result.issues.includes('same-display-and-options-format'));
  assert.ok(result.issues.includes('correct-answer-revealed-by-display'));
});

test('rejects word over word and a literally revealed answer', () => {
  const result = validateNumberRecognitionExercise(exercise('FOURTEEN', ['four', 'fourteen', 'forty', 'forty-four'], 'FOURTEEN'));
  assert.equal(result.valid, false);
  assert.ok(result.issues.includes('word-display-requires-numeric-options'));
  assert.ok(result.issues.includes('same-display-and-options-format'));
  assert.ok(result.issues.includes('correct-answer-revealed-by-display'));
});

test('rejects incompatible audio, display and correct targets', () => {
  const result = validateNumberRecognitionExercise({
    ...exercise('14', ['four', 'fourteen', 'forty', 'forty-four'], 'fourteen'),
    audioValue: 'This is the number thirteen.',
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.includes('audio-display-correct-target-mismatch'));
});
