import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyExerciseOverride, diffExerciseOverride, EXERCISE_OPTION_LIMITS, getExerciseEditorialStatus,
  normalizeExerciseWorkbookId, parseExerciseOptions, validateExerciseOverride, type ExerciseIdentity,
} from './exerciseOverride.ts';
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
  assert.ok(validateExerciseOverride(original, identity, { correctValue: 'Three' }).includes('A resposta principal precisa estar entre as alternativas.'));
});

test('parses two through ten ordered alternatives while ignoring blank lines', () => {
  assert.deepEqual(parseExerciseOptions('Hello!\n\n Good night! \r\nGoodbye!\nGood morning!\n'), [
    'Hello!', 'Good night!', 'Goodbye!', 'Good morning!',
  ]);
  assert.equal(EXERCISE_OPTION_LIMITS.min, 2);
  assert.equal(EXERCISE_OPTION_LIMITS.max, 10);
  assert.equal(parseExerciseOptions(Array.from({ length: 10 }, (_, index) => `Option ${index + 1}`).join('\n')).length, 10);
});

test('validates minimum, maximum, duplicates, membership and character limit', () => {
  assert.ok(validateExerciseOverride(original, identity, { options: ['Only'], correctValue: 'Only' }).includes('Informe pelo menos 2 alternativas.'));
  assert.ok(validateExerciseOverride(original, identity, {
    options: Array.from({ length: 11 }, (_, index) => `Option ${index + 1}`), correctValue: 'Option 1',
  }).includes('Informe no máximo 10 alternativas.'));
  assert.ok(validateExerciseOverride(original, identity, { options: [' One ', 'one'], correctValue: 'One' }).includes('Existem alternativas repetidas.'));
  assert.ok(validateExerciseOverride(original, identity, { options: ['One', 'Two'], correctValue: 'Three' }).includes('A resposta principal precisa estar entre as alternativas.'));
  assert.ok(validateExerciseOverride(original, identity, { options: ['One', 'x'.repeat(501)], correctValue: 'One' }).some((error) => error.includes('500 caracteres')));
});

test('preserves four and five alternatives in diffs and student projection', () => {
  const options = ['One', 'Two', 'Three', 'Four', 'Five'];
  const override = diffExerciseOverride(original, { options, correctValue: 'Four' });
  assert.deepEqual(override.options, options);
  const student = applyExerciseOverride(original, { ...identity, status: 'published', version: 5, override });
  assert.deepEqual(student.options, options);
  assert.equal(student.correctValue, 'Four');
});

test('derives editorial status without mixing it with report status', () => {
  assert.equal(getExerciseEditorialStatus({}), 'original');
  assert.equal(getExerciseEditorialStatus({ published: { ...identity, status: 'published', version: 1, override: {}, changeReason: 'valid reason', adminNote: '', baseVersion: 1, updatedBy: 'admin' } }), 'published');
  assert.equal(getExerciseEditorialStatus({ published: { ...identity, status: 'disabled', version: 2, override: {}, changeReason: 'valid reason', adminNote: '', baseVersion: 2, updatedBy: 'admin' } }), 'disabled');
  assert.equal(getExerciseEditorialStatus({ draft: { ...identity, status: 'draft', version: 2, override: {}, changeReason: '', adminNote: '', baseVersion: 2, updatedBy: 'admin' } }), 'draft');
});

test('stores only fields changed from local content', () => {
  assert.deepEqual(diffExerciseOverride(original, { instruction: 'Choose.', displayValue: 'Changed' }), { displayValue: 'Changed' });
});

test('speaking keeps its real displayed dialogue editable through an override', () => {
  const speaking: Exercise = { id: 'wb1_l6_d4_e10', type: 'speaking', instruction: 'Listen and repeat.', audioValue: 'How are you?', displayValue: 'A: How are you?\nB: ______', correctValue: 'I am fine, thank you.', acceptedAnswers: ['I am fine'] };
  const speakingIdentity: ExerciseIdentity = { ...identity, exerciseId: speaking.id, lessonId: 'wb1_l6', dayId: 'wb1_l6_d4', exerciseType: 'speaking' };
  const override = diffExerciseOverride(speaking, { displayValue: 'A: How are you today?\nB: ______', acceptedAnswers: ['I am very well'] });
  const reloaded = applyExerciseOverride(speaking, { ...speakingIdentity, status: 'published', version: 1, override });
  assert.equal(reloaded.id, speaking.id);
  assert.equal(reloaded.displayValue, 'A: How are you today?\nB: ______');
  assert.deepEqual(reloaded.acceptedAnswers, ['I am very well']);
});

test('normalizes curriculum workbook ids to the integer required by Firestore rules', () => {
  assert.equal(normalizeExerciseWorkbookId('wb1'), 1);
  assert.equal(normalizeExerciseWorkbookId('9'), 9);
  assert.equal(normalizeExerciseWorkbookId(3), 3);
  assert.ok(Number.isNaN(normalizeExerciseWorkbookId('workbook-one')));
});

test('rejects a runtime string workbook id before contacting Firestore', () => {
  const invalidIdentity = { ...identity, workbookId: 'wb1' as unknown as number };
  assert.match(validateExerciseOverride(original, invalidIdentity, {}).join(' '), /livro.*número inteiro/i);
});

test('never accepts a local blob preview as published content', () => {
  const errors = validateExerciseOverride(original, identity, { imageUrl: 'blob:https://learnendo.vercel.app/local-preview' });
  assert.ok(errors.some((error) => error.includes('prévia local')));
});

test('text-only editing preserves an original local image without writing empty image fields', () => {
  const originalWithImage: Exercise = {
    ...original,
    imageUrl: '/assets/workbook/existing-image.png',
    imageAlt: 'Existing workbook image',
  };
  const override = diffExerciseOverride(originalWithImage, { instruction: 'Choose the best answer.' });
  assert.deepEqual(override, { instruction: 'Choose the best answer.' });
  assert.equal(Object.hasOwn(override, 'imageUrl'), false);
  assert.equal(Object.hasOwn(override, 'imagePath'), false);
  assert.equal(Object.hasOwn(override, 'imageAlt'), false);

  const resolved = applyExerciseOverride(originalWithImage, {
    ...identity,
    status: 'published',
    version: 3,
    override,
  });
  assert.equal(resolved.imageUrl, originalWithImage.imageUrl);
  assert.equal(resolved.imageAlt, originalWithImage.imageAlt);
});

test('an existing valid editorial HTTPS image remains supported', () => {
  const imageUrl = 'https://cdn.example.com/exercises/existing.png';
  const resolved = applyExerciseOverride(original, {
    ...identity,
    status: 'published',
    version: 4,
    override: { instruction: 'Updated text.', imageUrl, imageAlt: 'Existing editorial image' },
  });
  assert.equal(resolved.imageUrl, imageUrl);
  assert.equal(resolved.imageAlt, 'Existing editorial image');
});

test('validates the reported greeting against options with comparison-only normalization', () => {
  const fields = {
    correctValue: 'Good afternoon!',
    options: ['Good night!', 'Hello!', 'Goodbye!', 'GOOD AFTERNOON!'],
  };
  assert.equal(validateExerciseOverride(original, identity, fields).includes('A resposta principal precisa estar entre as alternativas.'), false);
  assert.equal(fields.correctValue, 'Good afternoon!');
  assert.equal(fields.options[3], 'GOOD AFTERNOON!');
});
