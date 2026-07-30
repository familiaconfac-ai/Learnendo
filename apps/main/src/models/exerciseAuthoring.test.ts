import assert from 'node:assert/strict';
import test from 'node:test';
import { applyBatch, buildAiPrompt, exerciseFromCanonical, parseExerciseBatch, validateCanonicalExercise, validatePublishedExerciseTypes, PUBLISHED_TYPE_IMMUTABLE_MESSAGE } from './exerciseAuthoring.ts';
import type { Exercise } from '../types.ts';

const original: Exercise = { id: 'old-1', type: 'multiple-choice', instruction: 'Old', audioValue: 'old', correctValue: 'A', options: ['A', 'B'], translation: 'preserve', coverageObjective: 'unknown-to-editor' };

test('mapeia listening e shadowing para tipos que o aluno renderiza', () => {
  const listening = exerciseFromCanonical({ type: 'listening', instruction: 'Listen', speechText: 'Hello', correctAnswer: 'Hello' });
  assert.equal(listening.type, 'writing');
  assert.equal(listening.assessmentMode, 'listening-writing');
  const shadowing = exerciseFromCanonical({ type: 'shadowing', instruction: 'Repeat', targetText: 'Hello', speechLanguage: 'en-US' });
  assert.equal(shadowing.type, 'speaking');
  assert.equal(shadowing.assessmentMode, 'shadowing');
  const repeat = exerciseFromCanonical({ type: 'repeat', instruction: 'Listen first, then repeat', targetText: 'Hello', speechLanguage: 'en-US' });
  assert.equal(repeat.type, 'speaking');
  assert.equal(repeat.assessmentMode, 'repeat');
});

test('shadowing e repeat usam targetText quando campos opcionais normalizados vieram vazios', () => {
  const shadowing = exerciseFromCanonical({ type: 'shadowing', instruction: 'Repeat', targetText: 'Good morning', speechText: '', correctAnswer: '', speechLanguage: 'en-US' });
  assert.equal(shadowing.audioValue, 'Good morning');
  assert.equal(shadowing.correctValue, 'Good morning');
});

test('tipo pode mudar antes da publicação, mas não para o mesmo ID publicado', () => {
  const unpublishedWriting = exerciseFromCanonical({ type: 'writing', instruction: 'Write', correctAnswer: 'A' }, original);
  assert.equal(unpublishedWriting.type, 'writing');
  assert.deepEqual(validatePublishedExerciseTypes([], [unpublishedWriting]), []);
  assert.deepEqual(validatePublishedExerciseTypes([original], [unpublishedWriting]), [PUBLISHED_TYPE_IMMUTABLE_MESSAGE]);
  assert.deepEqual(validatePublishedExerciseTypes([original], [{ ...original, instruction: 'Edited' }]), []);
  assert.deepEqual(validatePublishedExerciseTypes([original], [{ ...original }]), []);
  const duplicate = exerciseFromCanonical({ type: 'writing', instruction: 'Write', correctAnswer: 'A' });
  assert.notEqual(duplicate.id, original.id);
  assert.deepEqual(validatePublishedExerciseTypes([original], [duplicate]), []);
});

test('edição preserva id e metadados que o formulário desconhece', () => {
  const next = exerciseFromCanonical({ type: 'multiple-choice', instruction: 'New', correctAnswer: 'B', alternatives: ['A', 'B'] }, original);
  assert.equal(next.id, original.id);
  assert.equal(next.translation, 'preserve');
  assert.equal(next.coverageObjective, 'unknown-to-editor');
});

test('replace_positions mantém id e posição; insert_at mantém ordem contínua', () => {
  const second = { ...original, id: 'old-2' };
  const replaced = applyBatch([original, second], [{ type: 'writing', instruction: 'Write', correctAnswer: 'yes', position: 2 }], 'replace_positions', null);
  assert.deepEqual(replaced.map((item) => item.id), ['old-1', 'old-2']);
  assert.equal(replaced[1].type, 'writing');
  const inserted = applyBatch([original, second], [{ type: 'writing', instruction: 'Write', correctAnswer: 'yes' }], 'insert_at', 2);
  assert.equal(inserted.length, 3);
  assert.equal(inserted[0].id, 'old-1');
  assert.equal(inserted[2].id, 'old-2');
});

test('os quatro modos definem política de IDs e falhas não alteram a entrada', () => {
  const second = { ...original, id: 'old-2' };
  const existing = [original, second];
  const input = { type: 'writing' as const, instruction: 'Write', correctAnswer: 'yes' };
  const appended = applyBatch(existing, [input], 'append', null);
  assert.deepEqual(appended.slice(0, 2).map((item) => item.id), ['old-1', 'old-2']);
  assert.notEqual(appended[2].id, 'old-1');
  const inserted = applyBatch(existing, [input], 'insert_at', 1);
  assert.deepEqual(inserted.slice(1).map((item) => item.id), ['old-1', 'old-2']);
  const day = applyBatch(existing, [input], 'replace_day', null);
  assert.equal(day.length, 1);
  assert.ok(!existing.some((item) => item.id === day[0].id));
  const positions = applyBatch(existing, [{ ...input, position: 2 }], 'replace_positions', null);
  assert.deepEqual(positions.map((item) => item.id), ['old-1', 'old-2']);
  assert.throws(() => applyBatch(existing, [{ ...input, position: 3 }], 'replace_positions', null), /não existe/);
  assert.deepEqual(existing.map((item) => item.id), ['old-1', 'old-2']);
});

test('importação rejeita tipo/campo não suportado e audioUrl', () => {
  const result = parseExerciseBatch(JSON.stringify({ courseId: 'english', bookId: 1, lessonId: 'l1', day: 1, mode: 'append', insertAt: null,
    exercises: [{ type: 'order-words', instruction: 'Order', audioUrl: 'https://example.com/x.mp3', invented: true }] }));
  assert.ok(result.exerciseErrors[0].some((error) => error.includes('não suportado')));
  assert.ok(result.exerciseErrors[0].some((error) => error.includes('audioUrl')));
  assert.ok(result.exerciseErrors[0].some((error) => error.includes('invented')));
});

test('valida regras contextuais', () => {
  assert.ok(validateCanonicalExercise({ type: 'multiple-choice', instruction: 'Choose', correctAnswer: 'C', alternatives: ['A', 'B'] }).length > 0);
  assert.ok(validateCanonicalExercise({ type: 'listening', instruction: 'Listen' }).length > 0);
  assert.deepEqual(validateCanonicalExercise({ type: 'repeat', instruction: 'Repeat', targetText: 'Hi', speechLanguage: 'en-US' }), []);
});

test('importa lote misto de dez itens e aplica append e replace_day atomicamente em memória', () => {
  const kinds = ['multiple-choice', 'multiple-choice', 'multiple-choice', 'listening', 'listening', 'listening', 'shadowing', 'shadowing', 'shadowing', 'repeat'];
  const rows = kinds.map((type, index) => type === 'multiple-choice'
    ? { type, instruction: `Choose ${index}`, alternatives: ['A', 'B'], correctAnswer: 'A' }
    : type === 'listening'
      ? { type, instruction: `Listen ${index}`, speechText: 'Hello', correctAnswer: 'Hello' }
      : { type, instruction: `Speak ${index}`, targetText: 'Hello', speechLanguage: 'en-US' });
  const parsed = parseExerciseBatch(JSON.stringify({ schemaVersion: 1, courseId: 'english', bookId: 1, lessonId: 'l1', dayId: 'd1', mode: 'append', insertAt: null, exercises: rows }));
  assert.equal(parsed.document?.exercises.length, 10);
  assert.equal(parsed.exerciseErrors.flat().length, 0);
  const appended = applyBatch([original], parsed.document!.exercises, 'append', null);
  assert.equal(appended.length, 11);
  assert.equal(new Set(appended.map((item) => item.id)).size, 11);
  const replaced = applyBatch([original], parsed.document!.exercises, 'replace_day', null);
  assert.equal(replaced.length, 10);
  assert.ok(replaced.every((item) => item.id !== original.id));
});

test('preserva mídia, tradução e metadados quando o campo não foi alterado', () => {
  const rich = { ...original, imageUrl: 'https://example.com/a.png', audioValue: 'original audio', imageAlt: 'alt', feedbackCorrect: 'great' };
  const next = exerciseFromCanonical({ type: 'multiple-choice', instruction: 'Changed', correctAnswer: 'A', alternatives: ['A', 'B'] }, rich);
  assert.equal(next.imageUrl, rich.imageUrl);
  assert.equal(next.audioValue, rich.audioValue);
  assert.equal(next.translation, rich.translation);
  assert.equal(next.imageAlt, rich.imageAlt);
  assert.equal(next.feedbackCorrect, rich.feedbackCorrect);
});

test('detecta JSON inválido, obrigatório ausente e tipo real sem autoria completa', () => {
  assert.deepEqual(parseExerciseBatch('{').errors, ['JSON inválido.']);
  const missing = parseExerciseBatch(JSON.stringify({ courseId: '', bookId: 0, lessonId: '', mode: 'append', exercises: [] }));
  assert.ok(missing.errors.length >= 4);
  assert.ok(validateCanonicalExercise({ type: 'dialogue' as never, instruction: 'Talk' }).some((error) => error.includes('não suportado')));
});

test('gera prompt copiável com destino, distribuição, schema e validações', () => {
  const prompt = buildAiPrompt({ courseId: 'english', bookId: 1, lessonId: 'l2', dayId: 'd3', subject: 'to be', objective: 'greetings', language: 'en', level: 'A1', quantity: 10, distribution: '3 multiple-choice, 3 listening, 3 shadowing, 1 repeat' });
  assert.match(prompt, /Livro 1/);
  assert.match(prompt, /JSON válido/);
  assert.match(prompt, /speechText/);
  assert.match(prompt, /3 multiple-choice/);
});
