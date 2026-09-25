import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeLessonsToOfficialTrails } from '../shared/normalizeOfficialWorkbookLessons';
import { workbook3 } from './index';
import { workbook3Lessons } from './lessons';
import { parseControlledMarkdown } from '../../utils/controlledMarkdown';

const lesson = workbook3.lessons.find((item) => item.id === 'wb3_l25');
assert.ok(lesson, 'Workbook 3 must contain Lesson 25.');
assert.equal(lesson.days.length, 7);
assert.deepEqual(
  lesson.days.map((day) => day.id),
  Array.from({ length: 7 }, (_, index) => `wb3_l25_d${index + 1}`),
);
assert.deepEqual(lesson.days.map((day) => day.exercises.length), [15, 15, 15, 10, 15, 15, 15]);

const standardNormalization = normalizeLessonsToOfficialTrails(workbook3Lessons);
for (const [lessonIndex, baselineLesson] of standardNormalization.entries()) {
  const actualLesson = workbook3.lessons[lessonIndex];
  assert.ok(actualLesson);
  if (baselineLesson.id !== 'wb3_l25') {
    assert.deepEqual(actualLesson, baselineLesson, `${baselineLesson.id} must remain unchanged.`);
    continue;
  }
  for (const [dayIndex, baselineDay] of baselineLesson.days.entries()) {
    if (dayIndex !== 4 && dayIndex !== 6) {
      assert.deepEqual(actualLesson.days[dayIndex], baselineDay, `${baselineDay.id} must remain unchanged.`);
    }
  }
}

const allExercises = lesson.days.flatMap((day) => day.exercises);
const ids = allExercises.map((exercise) => exercise.id);
assert.equal(new Set(ids).size, ids.length, 'Exercise IDs must be unique.');

const day5 = lesson.days[4].exercises;
const day5TypeCounts = day5.reduce<Record<string, number>>((counts, exercise) => {
  counts[exercise.type] = (counts[exercise.type] ?? 0) + 1;
  return counts;
}, {});
assert.deepEqual(day5TypeCounts, {
  identification: 1,
  'multiple-choice': 5,
  writing: 6,
  speaking: 3,
});
assert.equal(day5[0].correctValue, 'hear');
assert.equal(day5[1].correctValue, 'told');
assert.equal(day5[2].correctValue, 'say');
assert.equal(day5[3].correctValue, 'listen to');
assert.deepEqual(day5[12].acceptedAnswers, [
  'Could I borrow your pencil?',
  'May I borrow your pencil?',
  'Can you lend me your pencil?',
  'Could you lend me your pencil?',
]);
assert.ok(day5[13].acceptedAnswers?.includes('Could you tell me the answer?'));

const newReview = lesson.days[6].exercises.slice(-6);
assert.equal(newReview.length, 6);
const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const containsAnswer = (audio: string, answer: string) => {
  const audioWords = normalizeText(audio).split(' ');
  const answerWords = normalizeText(answer).split(' ');
  return audioWords.some((_, start) => answerWords.every((word, offset) => audioWords[start + offset] === word));
};
for (const exercise of [...day5, ...newReview]) {
  if (exercise.options) {
    assert.ok(exercise.options.includes(exercise.correctValue), `${exercise.id}: answer must be an option.`);
  }
  for (const accepted of exercise.acceptedAnswers ?? []) {
    assert.notEqual(accepted.trim().toLowerCase(), exercise.correctValue.trim().toLowerCase());
  }
  assert.ok(
    !containsAnswer(exercise.audioValue, exercise.correctValue),
    `${exercise.id}: audio must not repeat the expected answer.`,
  );
}

const newContent = [...day5, ...newReview]
  .map((exercise) => [
    exercise.instruction,
    exercise.displayValue,
    exercise.audioValue,
    exercise.correctValue,
    ...(exercise.options ?? []),
    ...(exercise.acceptedAnswers ?? []),
  ].join(' '))
  .join(' ')
  .toLowerCase();
for (const verb of ['say', 'said', 'tell', 'told', 'hear', 'heard', 'listen', 'listened', 'borrow', 'borrowed', 'lend', 'lent']) {
  assert.ok(newContent.includes(verb), `The new content must cover ${verb}.`);
}
for (const mistake of [
  'she said me the truth',
  'listen me',
  'i listened a noise',
  'can you borrow me your pencil',
  'can i lend your pencil',
  'i borrowed a book of my friend',
]) {
  assert.ok(newContent.includes(mistake), `The new content must address: ${mistake}`);
}

const grammarFocusDraft = readFileSync(
  resolve(process.cwd(), '../../docs/content/GRAMMAR_FOCUS_WB3_L25.md'),
  'utf8',
);
assert.ok(grammarFocusDraft.includes('Document ID: `english__wb3_l25`'));
const grammarFocusBody = grammarFocusDraft.split(/\r?\nBody:\r?\n\r?\n/)[1];
assert.ok(grammarFocusBody);
const grammarBlocks = parseControlledMarkdown(grammarFocusBody);
const grammarHeadings = grammarBlocks.filter((block) => block.type === 'heading').map((block) => block.text);
assert.deepEqual(grammarHeadings, [
  'Say or Tell?',
  'Structures',
  'Contrast',
  'Hear or Listen?',
  'Structures',
  'Contrast',
  'Questions',
  'Borrow or Lend?',
  'Structures',
  'Contrast',
  'Questions',
  'Common Mistakes',
  'Everyday School Examples',
]);
for (const structure of [
  'say + something + to + someone',
  'tell + someone + something',
  'listen + to + a sound/person',
  'borrow + something + from + someone',
  'lend + someone + something',
  'lend + something + to + someone',
]) {
  assert.ok(grammarFocusBody.includes(structure), `Grammar Focus must explain ${structure}.`);
}

console.log('Workbook 3 Lesson 25 curriculum assertions passed.');
