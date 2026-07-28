import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_EXERCISE_IMAGE_BYTES, validateExerciseImageFile } from './exerciseImageValidation.ts';

test('accepts a transparent PNG-sized payload around 70 KB without dimension restrictions', () => {
  assert.equal(validateExerciseImageFile({ type: 'image/png', size: 70 * 1024 }), 'png');
});

test('accepts JPEG and WEBP below 5 MB', () => {
  assert.equal(validateExerciseImageFile({ type: 'image/jpeg', size: 1_000_000 }), 'jpg');
  assert.equal(validateExerciseImageFile({ type: 'image/webp', size: MAX_EXERCISE_IMAGE_BYTES }), 'webp');
});

test('rejects executable MIME and payloads above 5 MB', () => {
  assert.throws(() => validateExerciseImageFile({ type: 'application/x-msdownload', size: 10_000 }), /PNG/);
  assert.throws(() => validateExerciseImageFile({ type: 'image/png', size: MAX_EXERCISE_IMAGE_BYTES + 1 }), /5 MB/);
});
