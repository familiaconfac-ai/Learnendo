import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { workbook1 } from '../node_modules/.cache/workbook1-test-bundle.mjs';

const exercises = workbook1.lessons.flatMap((lesson) => lesson.days.flatMap((day) => day.exercises));
const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
const get = (id) => {
  const exercise = byId.get(id);
  assert.ok(exercise, `${id} missing`);
  return exercise;
};
const normalized = (value = '') => value.toLocaleLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9{}]+/g, ' ').trim();

const AUDIO_REMOVED = [
  ...Array.from({ length: 10 }, (_, index) => `wb1_l5_d2_e${index + 1}`),
  'wb1_l6_d1_e8', 'wb1_l6_d1_e9', 'wb1_l6_d2_e1', 'wb1_l6_d2_e2', 'wb1_l6_d4_e4', 'wb1_l6_d5_e15',
  'wb1_l8_d3_e8', 'wb1_l8_d3_e10',
  'wb1_l9_d2_e8', 'wb1_l9_d2_e9', 'wb1_l9_d2_e11', 'wb1_l9_d2_e12',
  ...Array.from({ length: 15 }, (_, index) => `wb1_l10_d2_e${index + 1}`),
];
const INVALID_OPTIONS = ['wb1_l6_d1_e8', 'wb1_l6_d1_e9', 'wb1_l6_d2_e1', 'wb1_l6_d2_e2', 'wb1_l6_d5_e15'];
const WRITE_QUESTIONS = [
  'wb1_l6_d6_e2', 'wb1_l6_d6_e4', 'wb1_l6_d6_e5',
  'wb1_l7_d6_e2', 'wb1_l7_d6_e3', 'wb1_l7_d6_e4', 'wb1_l7_d6_e5', 'wb1_l7_d6_e6', 'wb1_l7_d6_e9', 'wb1_l7_d6_e10',
];
const LONG_SHADOWING = [
  'wb1_l6_d4_e1', 'wb1_l6_d5_e8', 'wb1_l6_d6_e1', 'wb1_l6_d6_e8',
  'wb1_l7_d4_e1', 'wb1_l7_d5_e8', 'wb1_l7_d6_e1', 'wb1_l7_d6_e8',
  'wb1_l8_d5_e1', 'wb1_l8_d5_e2', 'wb1_l8_d6_e7',
  'wb1_l11_final_v2_shadow_4', 'wb1_l12_final_v2_shadow_1',
];
const LONG_DICTATION = ['wb1_l6_final_v2_listen_write_6', 'wb1_l8_final_v2_listen_write_7', 'wb1_l11_final_v2_listen_write_5'];
const DICTATION_ORTHOGRAPHY = [
  'wb1_l3_final_v2_listen_write_3', 'wb1_l3_final_v2_listen_write_8',
  'wb1_l4_final_v2_listen_write_1', 'wb1_l4_final_v2_listen_write_4',
  'wb1_l6_final_v2_listen_write_4', 'wb1_l6_final_v2_listen_write_6', 'wb1_l6_final_v2_listen_write_7', 'wb1_l6_final_v2_listen_write_8',
  'wb1_l8_final_v2_listen_write_3', 'wb1_l8_final_v2_listen_write_7',
  'wb1_l9_final_v2_listen_write_1', 'wb1_l9_final_v2_listen_write_3', 'wb1_l9_final_v2_listen_write_6', 'wb1_l9_final_v2_listen_write_8',
  'wb1_l11_final_v2_listen_write_5', 'wb1_l11_final_v2_listen_write_6', 'wb1_l12_final_v2_listen_write_5',
];
const DUPLICATE_ACCEPTED = [
  'wb1_l4_d4_e10', 'wb1_l4_final_v2_speak_3', 'wb1_l6_final_v2_listen_write_5',
  'wb1_l7_final_v2_listen_write_6', 'wb1_l7_final_v2_speak_2', 'wb1_l7_final_v2_speak_3',
];
const OTHER_FIXED = [
  'wb1_l2_final_v2_speak_1', 'wb1_l2_final_v2_speak_5', 'wb1_l2_final_v2_speak_6',
  'wb1_l3_final_v2_speak_3', 'wb1_l4_final_v2_speak_3', 'wb1_l5_final_v2_speak_1',
  'wb1_l6_d6_e7', 'wb1_l6_final_v2_speak_3', 'wb1_l6_final_v2_speak_4', 'wb1_l6_final_v2_speak_5', 'wb1_l6_final_v2_speak_6',
  'wb1_l7_final_v2_speak_2', 'wb1_l11_final_v2_speak_1',
];
const FIXED_IDS = new Set([
  ...AUDIO_REMOVED, ...INVALID_OPTIONS, ...WRITE_QUESTIONS, ...LONG_SHADOWING, ...LONG_DICTATION,
  ...DICTATION_ORTHOGRAPHY, ...DUPLICATE_ACCEPTED, ...OTHER_FIXED,
]);

test('the approved Workbook 1 batch contains exactly the 94 V2 INVALID IDs', () => {
  assert.equal(FIXED_IDS.size, 94);
  assert.ok([...FIXED_IDS].every((id) => byId.has(id)));
});

test('answer-bearing audio is absent and blank-audio exercises remain actionable', () => {
  assert.equal(AUDIO_REMOVED.length, 37);
  for (const id of AUDIO_REMOVED) assert.equal(get(id).audioValue, '', id);
  const ui = fs.readFileSync(new URL('../src/components/UI.tsx', import.meta.url), 'utf8');
  assert.match(ui, /const exerciseActionLocked = actionLocked \|\| \(isDictationWriting && audioStatus === 'loading'\)/);
  assert.match(ui, /onKeyDown=\{handleKeyDown\}/);
  assert.match(ui, /performPrimaryAction\(\)/);
});

test('the five fill-in choices use literal blank fillers', () => {
  assert.equal(INVALID_OPTIONS.length, 5);
  for (const id of INVALID_OPTIONS) {
    const exercise = get(id);
    assert.equal(exercise.audioValue, '', id);
    assert.ok(exercise.options.includes(exercise.correctValue), id);
    assert.ok(exercise.options.every((option) => !/\s|[!?]/.test(option)), id);
    assert.equal(exercise.displayValue.replace(/_+/, exercise.correctValue).startsWith('Good '), true, id);
  }
});

test('question-production items use determinate PT-BR prompts without audio', () => {
  assert.equal(WRITE_QUESTIONS.length, 10);
  for (const id of WRITE_QUESTIONS) {
    const exercise = get(id);
    assert.equal(exercise.type, 'writing', id);
    assert.equal(exercise.promptMode, 'write-question', id);
    assert.equal(exercise.instruction, 'Write the question in English.', id);
    assert.equal(exercise.audioValue, '', id);
    assert.doesNotMatch(exercise.displayValue, /^Answer:/i, id);
    assert.match(exercise.correctValue, /\?$/, id);
  }
});

test('wb1_l6_d6_e7 is a no-audio writing translation with the approved target', () => {
  const exercise = get('wb1_l6_d6_e7');
  assert.equal(exercise.type, 'writing');
  assert.equal(exercise.assessmentMode, undefined);
  assert.equal(exercise.instruction, 'Translate into English.');
  assert.equal(exercise.displayValue, 'Bom dia, professor. Como você está?');
  assert.equal(exercise.audioValue, '');
  assert.equal(exercise.correctValue, 'Good morning, teacher. How are you?');
});

test('the two Lesson 2 speaking redesigns preserve oral production', () => {
  const article = get('wb1_l2_final_v2_speak_5');
  assert.equal(article.type, 'speaking');
  assert.equal(article.assessmentMode, 'speaking');
  assert.equal(article.instruction, 'Complete the sentence aloud in English.');
  assert.equal(article.displayValue, 'It is ___ apple.');
  assert.equal(article.audioValue, '');
  assert.equal(article.correctValue, 'It is an apple.');
  const vocabulary = get('wb1_l2_final_v2_speak_6');
  assert.equal(vocabulary.audioValue, 'What is "sol" in English?');
  assert.equal(vocabulary.correctValue, 'sun');
});

test('visual context is present without exposing listening questions', () => {
  const kite = get('wb1_l2_final_v2_speak_1');
  assert.equal(kite.displayValue, 'fa-kite');
  assert.equal(kite.audioValue, 'What is this?');
  assert.equal(kite.correctValue, 'This is a kite.');
  assert.ok(kite.acceptedAnswers.includes('It is a kite.'));
  assert.ok(kite.acceptedAnswers.includes("It's a kite."));
  const classroom = get('wb1_l6_final_v2_speak_3');
  assert.equal(classroom.displayValue, 'fa-chalkboard-user');
  assert.equal(classroom.audioValue, 'Where is Ben?');
  assert.equal(classroom.correctValue, 'Ben is in the classroom.');
  assert.ok(classroom.acceptedAnswers.includes('He is in the classroom.'));
  for (const id of ['wb1_l4_final_v2_speak_3', 'wb1_l6_final_v2_speak_4', 'wb1_l6_final_v2_speak_5', 'wb1_l6_final_v2_speak_6', 'wb1_l7_final_v2_speak_2']) {
    assert.equal(get(id).displayValue, undefined, id);
  }
  assert.ok(get('wb1_l4_final_v2_speak_3').contextVisual);
  assert.equal(get('wb1_l3_final_v2_speak_3').displayValue, undefined);
});

test('long shadowing and dictation targets are short coherent units without role markers', () => {
  assert.equal(LONG_SHADOWING.length, 13);
  for (const id of LONG_SHADOWING) {
    const exercise = get(id);
    assert.doesNotMatch(exercise.audioValue, /\b(?:Teacher|Students|Guide|Anna|Ben|Lucas|Amir|Leo):/i, id);
    assert.ok(exercise.audioValue.trim().split(/\s+/).length <= 14, id);
    assert.equal(normalized(exercise.audioValue), normalized(exercise.correctValue), id);
  }
  assert.equal(LONG_DICTATION.length, 3);
  for (const id of LONG_DICTATION) {
    const exercise = get(id);
    assert.ok(exercise.audioValue.trim().split(/\s+/).length <= 10, id);
    assert.doesNotMatch(exercise.audioValue, /\b(?:Teacher|Students|Guide|Anna|Ben|Lucas|Amir|Leo):/i, id);
  }
});

test('dictation spelling policy uses only targeted variants or explicit name context', () => {
  assert.equal(DICTATION_ORTHOGRAPHY.length, 17);
  for (const id of ['wb1_l3_final_v2_listen_write_3', 'wb1_l3_final_v2_listen_write_8', 'wb1_l4_final_v2_listen_write_1', 'wb1_l4_final_v2_listen_write_4', 'wb1_l9_final_v2_listen_write_6', 'wb1_l12_final_v2_listen_write_5']) {
    assert.match(get(id).displayValue, /^Name:/, id);
  }
  const expectedVariants = new Map([
    ['wb1_l6_final_v2_listen_write_4', 'My name is Ana.'],
    ['wb1_l6_final_v2_listen_write_7', 'Are Ben and Ana happy?'],
    ['wb1_l8_final_v2_listen_write_3', 'Lukas is not afraid.'],
    ['wb1_l8_final_v2_listen_write_7', "Lukas is near the lion. He isn't afraid."],
    ['wb1_l9_final_v2_listen_write_1', 'Hi! I’m Sophia.'],
    ['wb1_l9_final_v2_listen_write_3', 'Hi, Sophia! I’m Ben.'],
    ['wb1_l9_final_v2_listen_write_8', 'How old is Sophia?'],
    ['wb1_l11_final_v2_listen_write_6', 'Who is she? She is Ms. Greene.'],
  ]);
  for (const [id, variant] of expectedVariants) assert.ok(get(id).acceptedAnswers.includes(variant), id);
  assert.equal(get('wb1_l6_final_v2_listen_write_8').audioValue, 'See you');
  assert.equal(get('wb1_l11_final_v2_listen_write_5').audioValue, "She's in the classroom.");
});

test('accepted answers are deduplicated with the exercise matcher normalization', () => {
  assert.equal(DUPLICATE_ACCEPTED.length, 6);
  for (const id of DUPLICATE_ACCEPTED) {
    const exercise = get(id);
    const keys = (exercise.acceptedAnswers ?? []).map(normalized);
    assert.equal(new Set(keys).size, keys.length, id);
    assert.ok(keys.every((key) => key !== normalized(exercise.correctValue)), id);
  }
});

test('personal speaking prompts accept complete name templates', () => {
  for (const id of ['wb1_l5_final_v2_speak_1', 'wb1_l11_final_v2_speak_1']) {
    const exercise = get(id);
    assert.ok(exercise.acceptedAnswers.includes('My name is {name}.'), id);
    assert.ok(exercise.acceptedAnswers.includes('I am {name}.'), id);
    assert.ok(!exercise.acceptedAnswers.includes('{name}'), id);
  }
});

test('the seven final surgical fixes preserve exact transcription and complete speaking answers', () => {
  const first = get('wb1_l4_final_v2_speak_3');
  assert.deepEqual(first.acceptedAnswers, ['Anna is first.']);
  assert.ok(!first.acceptedAnswers.includes('Anna.'));

  const ben = get('wb1_l6_final_v2_speak_6');
  assert.equal(ben.correctValue, 'His name is Ben.');
  assert.deepEqual(ben.acceptedAnswers, ["The boy's name is Ben."]);

  const april = get('wb1_l7_final_v2_listen_write_6');
  assert.equal(april.correctValue, 'April');
  assert.deepEqual(april.acceptedAnswers ?? [], []);

  const january = get('wb1_l7_final_v2_speak_2');
  assert.equal(january.displayValue, undefined);
  assert.equal(january.audioValue, 'It is the first month of the year. What month is it?');
  assert.equal(january.correctValue, 'It is January.');
  assert.deepEqual(january.acceptedAnswers, ['The month is January.', 'January is the first month of the year.']);
  assert.equal(january.requiresCompleteSpokenAnswer, true);
  assert.ok(![january.correctValue, ...january.acceptedAnswers].some((answer) => /\b(?:february|march|april|may|june|july|august|september|october|november|december)\b/i.test(answer)));

  const may = get('wb1_l7_final_v2_speak_3');
  assert.equal(may.displayValue, undefined);
  assert.equal(may.audioValue, 'It comes after April. What month is it?');
  assert.equal(may.correctValue, 'It is May.');
  assert.deepEqual(may.acceptedAnswers, ['The month is May.', 'May comes after April.']);
  assert.equal(may.requiresCompleteSpokenAnswer, true);
  assert.ok(![may.correctValue, ...may.acceptedAnswers].some((answer) => /\b(?:january|february|march|june|july|august|september|october|november|december)\b/i.test(answer)));

  assert.deepEqual(get('wb1_l11_final_v2_listen_write_5').acceptedAnswers ?? [], []);
  assert.deepEqual(get('wb1_l11_final_v2_listen_write_6').acceptedAnswers, ['Who is she? She is Ms. Greene.']);
});

test('the eight human-reviewed listening-writing variants are absent', () => {
  const exactOnly = new Map([
    ['wb1_l4_final_v2_listen_write_5', 'My birthday is January twenty-first.'],
    ['wb1_l4_final_v2_listen_write_6', 'Who is second?'],
    ['wb1_l7_final_v2_listen_write_1', 'Monday'],
    ['wb1_l7_final_v2_listen_write_5', 'January first'],
    ['wb1_l8_final_v2_listen_write_6', "Are they late? No, they aren't."],
    ['wb1_l11_final_v2_listen_write_7', 'What day is it today? It is Monday.'],
    ['wb1_l11_final_v2_listen_write_8', 'Where are the students? They are at school.'],
  ]);
  for (const [id, target] of exactOnly) {
    const exercise = get(id);
    assert.equal(exercise.instruction, 'Listen and write exactly what you hear.', id);
    assert.equal(exercise.audioValue, target, id);
    assert.equal(exercise.correctValue, target, id);
    assert.deepEqual(exercise.acceptedAnswers ?? [], [], id);
  }
});

test('the eight Lesson 1 Listen and write exercises remain unchanged', () => {
  const letters = new Map([
    ['wb1_l1_final_listen_write_letter_a', 'A'],
    ['wb1_l1_final_listen_write_letter_e', 'E'],
    ['wb1_l1_final_listen_write_letter_h', 'H'],
    ['wb1_l1_final_listen_write_letter_z', 'Z'],
  ]);
  for (const [id, letter] of letters) {
    const exercise = get(id);
    assert.equal(exercise.instruction, 'Listen and write.', id);
    assert.equal(exercise.audioValue, letter, id);
    assert.equal(exercise.correctValue, letter, id);
    assert.deepEqual(exercise.acceptedAnswers, [letter, `This is the letter ${letter}.`], id);
  }
  for (const [id, word] of [
    ['wb1_l1_final_listen_write_number_0', 'zero'],
    ['wb1_l1_final_listen_write_number_4', 'four'],
    ['wb1_l1_final_listen_write_number_14', 'fourteen'],
    ['wb1_l1_final_listen_write_number_20', 'twenty'],
  ]) {
    const exercise = get(id);
    assert.equal(exercise.instruction, 'Listen and write.', id);
    assert.equal(exercise.audioValue, word, id);
    assert.equal(exercise.correctValue, word, id);
    assert.deepEqual(exercise.acceptedAnswers ?? [], [], id);
  }
});
