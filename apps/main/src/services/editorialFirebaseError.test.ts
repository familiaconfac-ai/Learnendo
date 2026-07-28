import assert from 'node:assert/strict';
import test from 'node:test';
import { describeEditorialFirebaseError } from './editorialFirebaseError.ts';

const codedError = (code: string, message = code) => Object.assign(new Error(message), { code });

test('explains permission mismatch without hiding the Firebase code', () => {
  const message = describeEditorialFirebaseError(codedError('storage/unauthorized'), 'upload');
  assert.match(message, /role.*admin/i);
  assert.match(message, /storage\/unauthorized/);
});

test('distinguishes cancellation, stalled upload and unavailable Firestore', () => {
  assert.match(describeEditorialFirebaseError(codedError('storage/canceled'), 'upload'), /cancelado/i);
  assert.match(describeEditorialFirebaseError(codedError('storage/upload-stalled'), 'upload'), /não foi possível iniciar/i);
  assert.match(describeEditorialFirebaseError(codedError('unavailable'), 'draft'), /temporariamente indisponível/i);
});

test('preserves validation and conflict messages', () => {
  const validation = new Error('A resposta correta não está entre as alternativas.');
  const conflict = new Error('Este exercício foi alterado por outro administrador.');
  assert.equal(describeEditorialFirebaseError(validation, 'publish'), validation.message);
  assert.equal(describeEditorialFirebaseError(conflict, 'publish'), conflict.message);
});
