import assert from 'node:assert/strict';
import test from 'node:test';
import { describeExerciseSpeechLocale, resolveExerciseSpeechLocale } from './exerciseSpeechLocale.ts';

test('interface locale never overrides English workbook content', () => {
  assert.equal(resolveExerciseSpeechLocale({}, 'en', 'pt-BR'), 'en-US');
  assert.equal(resolveExerciseSpeechLocale({}, 'en', 'es-ES'), 'en-US');
});

test('explicit exercise language has priority over workbook and interface', () => {
  assert.equal(resolveExerciseSpeechLocale({ speechLanguage: 'pt' }, 'en', 'es-ES'), 'pt-BR');
  assert.equal(resolveExerciseSpeechLocale({ speechLanguage: 'es-ES' }, 'en', 'pt-BR'), 'es-ES');
});

test('workbook language resolves Portuguese and Spanish voices', () => {
  assert.equal(resolveExerciseSpeechLocale({}, 'pt', 'en-US'), 'pt-BR');
  assert.equal(resolveExerciseSpeechLocale({}, 'es', 'en-US'), 'es-ES');
});

test('pedagogical fallback is English and does not inherit interface locale', () => {
  assert.equal(resolveExerciseSpeechLocale({}, undefined, 'pt-BR'), 'en-US');
  assert.equal(resolveExerciseSpeechLocale(undefined, undefined, 'es-ES'), 'en-US');
  assert.equal(describeExerciseSpeechLocale('en-US'), 'English — en-US');
});
