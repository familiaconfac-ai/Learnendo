import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_EXERCISE_CHANGE_REASON,
  MIN_EXERCISE_CHANGE_REASON_LENGTH,
  normalizeExerciseChangeReason,
  resolveExercisePublicationReason,
  validateExerciseChangeReason,
} from './exerciseChangeReason.ts';

test('normalizes surrounding whitespace without changing the content', () => {
  assert.equal(normalizeExerciseChangeReason('  Corrige resposta.  '), 'Corrige resposta.');
});

test('rejects an empty or spaces-only publication reason', () => {
  assert.equal(validateExerciseChangeReason(''), 'Informe o motivo da alteração antes de publicar.');
  assert.equal(validateExerciseChangeReason('   '), 'Informe o motivo da alteração antes de publicar.');
});

test('uses the specific message for disabling an exercise', () => {
  assert.equal(validateExerciseChangeReason('   ', 'disable'), 'Informe o motivo da desativação antes de continuar.');
});

test('rejects a non-empty reason shorter than the minimum', () => {
  assert.equal(MIN_EXERCISE_CHANGE_REASON_LENGTH, 5);
  assert.equal(validateExerciseChangeReason('abcd'), 'Descreva o motivo da alteração com pelo menos 5 caracteres.');
});

test('accepts a reason at the minimum length and a longer reason', () => {
  assert.equal(validateExerciseChangeReason('abcde'), null);
  assert.equal(validateExerciseChangeReason('Corrige o gabarito da questão.'), null);
});

test('selects the publication reason in editorial, suggestion, description and fallback priority', () => {
  assert.equal(resolveExercisePublicationReason({
    editorialReason: '  Motivo digitado  ', suggestedReportReason: 'Motivo sugerido', reportDescription: 'Descrição',
  }), 'Motivo digitado');
  assert.equal(resolveExercisePublicationReason({
    editorialReason: ' ', suggestedReportReason: '  Motivo sugerido  ', reportDescription: 'Descrição',
  }), 'Motivo sugerido');
  assert.equal(resolveExercisePublicationReason({
    editorialReason: '', suggestedReportReason: null, reportDescription: '  Descrição original  ',
  }), 'Descrição original');
  assert.equal(resolveExercisePublicationReason({}), DEFAULT_EXERCISE_CHANGE_REASON);
  assert.equal(validateExerciseChangeReason(resolveExercisePublicationReason({})), null);
});
