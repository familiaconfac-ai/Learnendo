import assert from 'node:assert/strict';
import test from 'node:test';
import { workbook1 } from '../node_modules/.cache/workbook1-test-bundle.mjs';

const normalized = (value = '') => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

test('all Workbook 1 lessons have the approved 100-exercise distribution and unique IDs', () => {
  for (const lesson of workbook1.lessons) {
    assert.deepEqual(lesson.days.map((day) => day.exercises.length), [15, 15, 15, 10, 15, 10, 20], lesson.id);
    const ids = lesson.days.flatMap((day) => day.exercises.map((exercise) => exercise.id));
    assert.equal(new Set(ids).size, 100, lesson.id);
  }
});

test('each Final Test has 8 listening-writing, 6 shadowing and 6 speaking exercises', () => {
  for (const lesson of workbook1.lessons) {
    const finalTest = lesson.days[6].exercises;
    for (const [mode, count] of [['listening-writing', 8], ['shadowing', 6], ['speaking', 6]]) {
      assert.equal(finalTest.filter((exercise) => exercise.assessmentMode === mode).length, count, `${lesson.id}:${mode}`);
    }
    assert.ok(finalTest.filter((exercise) => exercise.assessmentMode === 'speaking').every((exercise) => /\?$/.test(exercise.audioValue.trim())), lesson.id);
    assert.ok(finalTest.filter((exercise) => exercise.assessmentMode === 'speaking').every((exercise) => !/appropriate English response|answer this prompt aloud/i.test(exercise.audioValue)), lesson.id);
    assert.ok(finalTest.every((exercise) => exercise.coverageObjective), lesson.id);
    const assessmentKeys = finalTest.map((exercise) => `${exercise.assessmentMode}|${exercise.audioValue}|${exercise.correctValue}`.toLowerCase());
    assert.equal(new Set(assessmentKeys).size, 20, `${lesson.id}: repeated Final Test item`);
    const practice = lesson.days.slice(0, 6).flatMap((day) => day.exercises);
    const taughtValues = new Set(practice.flatMap((exercise) => [exercise.audioValue, exercise.correctValue, exercise.displayValue, exercise.fullSentenceAfterAnswer, ...(exercise.acceptedAnswers ?? [])].map(normalized)).filter(Boolean));
    const taughtCorpus = normalized(practice.flatMap((exercise) => [exercise.audioValue, exercise.correctValue, exercise.displayValue, exercise.fullSentenceAfterAnswer, ...(exercise.acceptedAnswers ?? [])]).join(' '));
    for (const exercise of finalTest) {
      const testedValue = normalized(exercise.assessmentMode === 'speaking' ? exercise.correctValue : exercise.audioValue);
      const taught = taughtValues.has(testedValue) || taughtCorpus.includes(testedValue);
      assert.equal(taught, true, `${lesson.id}: Final Test uses untaught content: ${exercise.id}`);
    }
  }
});

test('generated Final Tests use versioned IDs instead of reassigning practice IDs', () => {
  for (const lesson of workbook1.lessons) {
    if (lesson.id === 'wb1_l1') continue;
    const practiceIds = new Set(lesson.days.slice(0, 6).flatMap((day) => day.exercises.map((exercise) => exercise.id)));
    const finalIds = lesson.days[6].exercises.map((exercise) => exercise.id);
    assert.ok(finalIds.every((id) => id.startsWith(`${lesson.id}_final_v2_`)), lesson.id);
    assert.ok(finalIds.every((id) => !practiceIds.has(id)), lesson.id);
  }
});

test('Lesson 1 starts deterministically with alphabet and numbers and contains no greetings', () => {
  const lesson = workbook1.lessons[0];
  assert.deepEqual(lesson.days[0].exercises.slice(0, 5).map((exercise) => exercise.id), [
    'wb1_l1_letter_recognition_a', 'wb1_l1_letter_recognition_b', 'wb1_l1_letter_recognition_c',
    'wb1_l1_letter_recognition_d', 'wb1_l1_letter_recognition_e',
  ]);
  assert.ok(lesson.days[0].exercises.every((exercise) => ['alphabet', 'numbers'].includes(exercise.pedagogicalTopic)));
  const renderedText = lesson.days.flatMap((day) => day.exercises)
    .map((exercise) => `${exercise.instruction} ${exercise.audioValue} ${exercise.correctValue}`)
    .join(' ');
  assert.doesNotMatch(renderedText, /hello|good morning|how are you|nice to meet you|good night|good evening|goodbye|my name|birthday|monday|january|red|blue|green|yellow|orange|purple|pink|brown|black|white/i);
});

test('Lesson 1 covers every letter with presentation, contrast recognition and Yes/No', () => {
  const lesson = workbook1.lessons[0];
  const practice = lesson.days.slice(0, 6).flatMap((day) => day.exercises);
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    const recognition = practice.find((exercise) => exercise.id === `wb1_l1_letter_recognition_${letter.toLowerCase()}`);
    const yesNo = practice.find((exercise) => exercise.id === `wb1_l1_letter_yes_no_${letter.toLowerCase()}`);
    assert.ok(recognition, `${letter}: recognition missing`);
    assert.equal(recognition.displayValue, letter);
    assert.match(recognition.audioValue, new RegExp(`^${letter}\\. This is the letter ${letter}\\.$`));
    assert.equal(recognition.options.length, 4);
    assert.ok(recognition.options.includes(letter));
    assert.ok(yesNo, `${letter}: Yes/No missing`);
    assert.equal(yesNo.instruction, 'Choose YES or NO.');
    assert.ok(['YES', 'NO'].includes(yesNo.correctValue));
  }
});

test('Lesson 1 covers 0-20 before number writing, shadowing and speaking', () => {
  const lesson = workbook1.lessons[0];
  const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  const practice = lesson.days.slice(0, 6).flatMap((day) => day.exercises);
  for (let value = 0; value <= 20; value += 1) {
    const recognition = practice.find((exercise) => exercise.id === `wb1_l1_number_recognition_${value}`);
    assert.ok(recognition, `${value}: recognition missing`);
    assert.equal(recognition.displayValue, String(value));
    assert.equal(recognition.correctValue, value <= 10 || value === 14 ? String(value) : numberWords[value]);
    assert.equal(recognition.options.length, 4);
    assert.ok(recognition.options.includes(recognition.correctValue));
  }
  assert.ok(practice.filter((exercise) => exercise.id.startsWith('wb1_l1_number_recognition_')).slice(0, 11).every((exercise) => /^\d+$/.test(exercise.correctValue)));
  assert.deepEqual(practice.find((exercise) => exercise.id === 'wb1_l1_number_recognition_14').options, ['14', '4', '40', '44']);
  assert.ok(practice.filter((exercise) => exercise.id.startsWith('wb1_l1_number_recognition_') && Number(exercise.displayValue) >= 11 && exercise.displayValue !== '14').every((exercise) => /^[a-z-]+$/.test(exercise.correctValue)));
  const productionStart = practice.findIndex((exercise) => ['writing', 'speaking'].includes(exercise.type));
  const lastRecognition = Math.max(...practice.map((exercise, index) => exercise.id.startsWith('wb1_l1_number_recognition_') ? index : -1));
  assert.ok(productionStart > lastRecognition);
  assert.ok(practice.some((exercise) => exercise.id === 'wb1_l1_number_write_7'));
  assert.ok(practice.some((exercise) => exercise.id === 'wb1_l1_number_write_16'));
  assert.ok(practice.some((exercise) => exercise.assessmentMode === 'shadowing'));
  assert.ok(practice.some((exercise) => exercise.assessmentMode === 'speaking'));
});

test('Lesson 1 instructions are short and Final Test content was modeled first', () => {
  const lesson = workbook1.lessons[0];
  const allowedInstructions = new Set([
    'Choose the correct letter.', 'Choose the correct number.', 'Choose YES or NO.',
    'Write the number word.', 'Listen and repeat.', 'Listen and answer.', 'Listen and write.',
  ]);
  assert.ok(lesson.days.flatMap((day) => day.exercises).every((exercise) => allowedInstructions.has(exercise.instruction)));
  assert.ok(lesson.days[6].exercises.every((exercise) => !exercise.introducesNewContent));
});
