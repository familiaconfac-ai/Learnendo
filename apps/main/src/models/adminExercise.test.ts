import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adminExerciseToPracticeExercise, assertAdminExerciseRevision, emptyAdminExerciseContent,
  generateAdminExerciseId, parseAdminExerciseOptions, validateAdminExerciseForPublication,
  validateExternalImageUrl, versionDocumentId,
} from './adminExercise.ts';

const identity = {
  exerciseId: 'ex_test-12345678', courseId: 'english', language: 'en', workbookId: 1,
  lessonId: 'lesson1', dayId: 'day1', type: 'multiple-choice' as const,
};

test('gera ID estável com prefixo ex_', () => {
  const first = generateAdminExerciseId();
  const second = generateAdminExerciseId();
  assert.match(first, /^ex_[A-Za-z0-9-]+$/);
  assert.notEqual(first, second, 'a duplicação deve receber outro ID');
});

test('normaliza lista colada preservando ordem, removendo vazios e limitando a dez', () => {
  const value = parseAdminExerciseOptions(' A \n\nB\n C \nD\nE\nF\nG\nH\nI\nJ\nK');
  assert.deepEqual(value, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);
});

test('bloqueia publicação incompleta, duplicada e com mais de dez alternativas', () => {
  const content = { ...emptyAdminExerciseContent('en'), instruction: 'Choose',
    options: Array.from({ length: 11 }, (_, index) => index === 10 ? 'ONE' : `Option ${index}`),
    correctValue: 'Option 0', speechLanguage: 'en' };
  content.options[1] = 'option 0';
  const errors = validateAdminExerciseForPublication({ identity, content, changeReason: 'Publicação inicial' });
  assert.ok(errors.some((item) => item.includes('dez')));
  assert.ok(errors.some((item) => item.includes('duplicadas')));
});

test('aceita conteúdo publicável e projeta no PracticeSection sem metadados privados', () => {
  const content = { ...emptyAdminExerciseContent('en-US'), instruction: 'Choose', audioValue: 'Choose',
    options: ['One', 'Two'], correctValue: 'One', feedbackCorrect: 'Good' };
  assert.deepEqual(validateAdminExerciseForPublication({ identity, content, changeReason: 'Publicação inicial' }), []);
  const exercise = adminExerciseToPracticeExercise(identity, content);
  assert.equal(exercise.id, identity.exerciseId);
  assert.equal(exercise.type, 'multiple-choice');
  assert.equal(exercise.feedbackCorrect, 'Good');
  assert.equal('adminNote' in exercise, false);
});

test('valida somente URL HTTPS externa sem credenciais', () => {
  assert.equal(validateExternalImageUrl('https://images.example.test/picture.png'), null);
  assert.match(validateExternalImageUrl('http://example.test/a.png') ?? '', /HTTPS/);
  assert.match(validateExternalImageUrl('blob:https://example.test/id') ?? '', /HTTPS/);
  assert.match(validateExternalImageUrl('data:image/png;base64,AAAA') ?? '', /HTTPS/);
  assert.match(validateExternalImageUrl('javascript:alert(1)') ?? '', /HTTPS/);
  assert.match(validateExternalImageUrl('https://user:pass@example.test/a.png') ?? '', /credenciais/);
  assert.match(validateExternalImageUrl('not-a-url') ?? '', /válida/);
  assert.match(validateExternalImageUrl(`https://example.test/${'a'.repeat(2048)}`) ?? '', /2.048/);
  assert.equal(validateExternalImageUrl(''), null, 'remover a referência deve ser válido');
});

test('valida limites de alternativas, motivo, workbook e tipo', () => {
  const make = (count: number) => ({ ...emptyAdminExerciseContent('en'), instruction: 'Choose',
    options: Array.from({ length: count }, (_, index) => `Option ${index + 1}`),
    correctValue: count ? 'Option 1' : '', speechLanguage: 'en' });
  for (const count of [2, 4, 10]) {
    assert.deepEqual(validateAdminExerciseForPublication({ identity, content: make(count), changeReason: 'Motivo válido' }), [], `${count} opções devem ser válidas`);
  }
  assert.ok(validateAdminExerciseForPublication({ identity, content: make(1), changeReason: 'Motivo válido' }).some((item) => item.includes('duas')));
  assert.ok(validateAdminExerciseForPublication({ identity, content: make(11), changeReason: 'Motivo válido' }).some((item) => item.includes('dez')));
  assert.ok(validateAdminExerciseForPublication({ identity, content: { ...make(2), correctValue: 'Missing' }, changeReason: 'Motivo válido' }).some((item) => item.includes('entre as alternativas')));
  for (const reason of ['', '    ']) assert.ok(validateAdminExerciseForPublication({ identity, content: make(2), changeReason: reason }).some((item) => item.includes('motivo')));
  assert.ok(validateAdminExerciseForPublication({ identity: { ...identity, workbookId: '1' as unknown as number }, content: make(2), changeReason: 'Motivo válido' }).some((item) => item.includes('livro')));
  assert.deepEqual(validateAdminExerciseForPublication({ identity: { ...identity, workbookId: 1 }, content: make(2), changeReason: 'Motivo válido' }), []);
  assert.ok(validateAdminExerciseForPublication({ identity: { ...identity, type: 'writing' as 'multiple-choice' }, content: make(2), changeReason: 'Motivo válido' }).some((item) => item.includes('múltipla escolha')));
});

test('controle otimista rejeita edição e publicação concorrentes', () => {
  assert.doesNotThrow(() => assertAdminExerciseRevision({ currentVersion: 2, expectedVersion: 2, currentDraftRevision: 4, expectedDraftRevision: 4 }));
  assert.throws(() => assertAdminExerciseRevision({ currentVersion: 3, expectedVersion: 2 }), /outro administrador/);
  assert.throws(() => assertAdminExerciseRevision({ currentVersion: 2, expectedVersion: 2, currentDraftRevision: 5, expectedDraftRevision: 4 }), /outro administrador/);
});

test('IDs de histórico têm ordenação lexical estável', () => {
  assert.equal(versionDocumentId(1), '000001');
  assert.equal(versionDocumentId(42), '000042');
});

test('publica resposta principal equivalente a uma alternativa sem reescrever o texto', () => {
  const content = { ...emptyAdminExerciseContent('en-US'), instruction: 'Choose',
    options: ['Good night!', 'Hello!', 'Goodbye!', 'GOOD AFTERNOON!'],
    correctValue: 'Good afternoon!' };
  assert.deepEqual(validateAdminExerciseForPublication({ identity, content, changeReason: 'Corrige validação' }), []);
  assert.equal(content.correctValue, 'Good afternoon!');
  assert.equal(content.options[3], 'GOOD AFTERNOON!');
});
