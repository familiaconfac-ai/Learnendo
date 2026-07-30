import assert from 'node:assert/strict';
import test from 'node:test';
import { attachEditorialOperationDiagnostic, describeEditorialFirebaseError, getEditorialOperationDiagnostic } from './editorialFirebaseError.ts';

const codedError = (code: string, message = code) => Object.assign(new Error(message), { code });

test('does not blame role when Firestore only reports permission denied', () => {
  const message = describeEditorialFirebaseError(codedError('storage/unauthorized'), 'upload');
  assert.doesNotMatch(message, /role.*admin/i);
  assert.match(message, /storage\/unauthorized/);
});

test('reports role only when the real profile diagnostic is incompatible', () => {
  const message = describeEditorialFirebaseError(codedError('permission-denied'), 'draft', {
    userDocumentExists: true, roleType: 'string', isExactAdminRole: false,
  });
  assert.match(message, /role.*admin/i);
});

test('preserves the exact denied operation and payload diagnostic', () => {
  const error = attachEditorialOperationDiagnostic(codedError('permission-denied'), {
    action: 'salvar rascunho', collection: 'exerciseDrafts', targetPath: 'exerciseDrafts/ex1',
    operationType: 'create', stage: 'gravação isolada do rascunho',
    confirmationState: 'not-applicable', completedOperations: [], payload: { status: 'draft' },
  });
  assert.equal(getEditorialOperationDiagnostic(error)?.targetPath, 'exerciseDrafts/ex1');
  assert.match(describeEditorialFirebaseError(error, 'draft', {
    userDocumentExists: true, roleType: 'string', isExactAdminRole: true,
  }), /exerciseDrafts\/ex1.*autenticada como admin/);
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
