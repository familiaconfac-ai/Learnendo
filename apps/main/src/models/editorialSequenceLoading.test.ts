import assert from 'node:assert/strict';
import test from 'node:test';
import type { Exercise } from '../types';
import { daySequenceScopeId, settleEditorialSequenceLoad } from './editorialSequenceLoading.ts';

const exercise = (id: string): Exercise => ({
  id, type: 'multiple-choice', instruction: 'Choose', audioValue: 'Choose', correctValue: 'A', options: ['A', 'B'],
});

test('autoria e aluno constroem o mesmo scopeId canônico', () => {
  const identity = { courseId: 'english', language: 'en', workbookId: 1, lessonId: 'wb1_l1', dayId: 'wb1_l1_d1' };
  assert.equal(daySequenceScopeId(identity), 'english__en__w1__wb1_l1__wb1_l1_d1');
  assert.equal(daySequenceScopeId({ ...identity }), daySequenceScopeId(identity));
});

test('publicação válida vence o currículo local', () => {
  const result = settleEditorialSequenceLoad([exercise('local')], [exercise('published')]);
  assert.equal(result.status, 'published');
  assert.deepEqual(result.exercises.map(({ id }) => id), ['published']);
});

test('ausência, vazio, documento inválido, permissão e rede usam fallback local', () => {
  const local = [exercise('local')];
  for (const [published, error, diagnostic] of [
    [null, null, 'not-found'],
    [[], null, 'published-empty'],
    [{ exercises: 'invalid' }, null, 'published-invalid'],
    [null, new Error('permission-denied'), 'load-error'],
    [null, new Error('network'), 'load-error'],
    [[{ id: '', type: 'writing' }], null, 'published-invalid'],
  ] as const) {
    const result = settleEditorialSequenceLoad(local, published, error);
    assert.equal(result.status, 'fallback');
    assert.equal(result.diagnostic, diagnostic);
    assert.equal(result.exercises[0].id, 'local');
  }
});

test('sem currículo local termina em vazio ou erro explícito, nunca loading', () => {
  assert.equal(settleEditorialSequenceLoad([], null).status, 'empty');
  assert.equal(settleEditorialSequenceLoad([], []).status, 'empty');
  assert.equal(settleEditorialSequenceLoad([], null, new Error('network')).status, 'error');
  assert.equal(settleEditorialSequenceLoad([], 'invalid').status, 'error');
});
