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

test('Lesson 4 address feedback preserves the complete modeled sentence', () => {
  const exercise = workbook1.lessons
    .flatMap((lesson) => lesson.days)
    .flatMap((day) => day.exercises)
    .find((item) => item.id === 'wb1_l4_d4_e10');
  assert.ok(exercise, 'wb1_l4_d4_e10 missing');
  assert.equal(exercise.correctValue, '21 First Street');
  assert.equal(exercise.fullSentenceAfterAnswer, 'It is at 21 First Street.');
  assert.ok(exercise.acceptedAnswers.some((answer) => normalized(answer) === normalized('It is at 21 First Street ')));
});

test('reported Lesson 4 exercises keep their corrected answers and visual context', () => {
  const lesson = workbook1.lessons.find((item) => item.id === 'wb1_l4');
  const exercises = lesson.days.flatMap((day) => day.exercises);
  const byId = (id) => exercises.find((exercise) => exercise.id === id);

  const joe = byId('wb1_l4_final_v2_speak_5');
  assert.equal(joe.correctValue, 'Joe');
  assert.ok(joe.acceptedAnswers.includes('Joe'));
  assert.ok(joe.acceptedAnswers.includes('Jo'));

  const birthday = byId('wb1_l4_final_v2_listen_write_5');
  assert.equal(birthday.correctValue, 'My birthday is January twenty-first.');
  assert.ok(birthday.acceptedAnswers.includes('My birthday is January twenty-first.'));
  assert.ok(birthday.acceptedAnswers.includes('My birthday is January 21st.'));

  const sam = byId('wb1_l4_final_v2_listen_write_8');
  assert.equal(sam.audioValue, 'Sam is fifth.');
  assert.equal(sam.correctValue, 'Sam is fifth.');

  const ordinalLine = byId('wb1_l4_d5_e1');
  assert.equal(ordinalLine.displayValue, 'Who is first in line?');
  assert.deepEqual(ordinalLine.contextVisual.people, ['Anna', 'Lucas', 'Daniel', 'Emily']);
  for (const answer of ['Anna.', 'Anna is first.', 'Anna is first in line.']) {
    assert.ok(ordinalLine.acceptedAnswers.includes(answer));
  }
  for (const id of ['wb1_l4_d5_e2', 'wb1_l4_d5_e3', 'wb1_l4_d5_e4']) {
    assert.deepEqual(byId(id).contextVisual, ordinalLine.contextVisual, `${id}: missing shared ordinal-line context`);
  }
});

test('Lesson 8 follows the updated Spoken Patterns scope and register rules', () => {
  const lesson = workbook1.lessons.find((item) => item.id === 'wb1_l8');
  assert.ok(lesson, 'wb1_l8 missing');
  assert.deepEqual(lesson.days.map((day) => day.exercises.length), [15, 15, 15, 10, 15, 10, 20]);

  const day4 = lesson.days[3].exercises;
  assert.equal(day4.length, 10);
  const reportedExercise = day4.find((exercise) => exercise.id === 'wb1_l8_d4_e8');
  assert.equal(reportedExercise.type, 'multiple-choice');
  assert.equal(reportedExercise.audioValue, "I'm happy, ___?");
  assert.equal(reportedExercise.correctValue, "aren't I?");
  assert.match(reportedExercise.instruction, /complete the sentence/i);
  assert.ok(day4.every((exercise) => /aren['’]t i/i.test(exercise.correctValue)), 'Day 4 must teach the fixed standard tag');
  assert.ok(day4.every((exercise) => !/amn['’]t i|ain['’]t i/i.test(exercise.correctValue)), 'nonstandard tags cannot be correct');

  const day6 = lesson.days[5].exercises;
  assert.equal(day6.length, 10);
  assert.ok(day6.every((exercise) => /informal english/i.test(exercise.instruction)), 'every ain’t activity needs an Informal English label');
  assert.ok(day6.every((exercise) => /ain['’]t/i.test(`${exercise.audioValue} ${exercise.displayValue ?? ''}`)), 'every Day 6 item must explicitly contain ain’t');
  assert.ok(day6.every((exercise) => /^standard:/i.test(exercise.fullSentenceAfterAnswer ?? '')), 'every ain’t activity needs its standard equivalent');
  assert.ok(day6.some((exercise) => /Dialogue 18 — They Ain't Late/.test(exercise.displayValue ?? '') && /Informal Spoken English/.test(exercise.displayValue ?? '')), 'informal Dialogue 18 label missing');
  assert.ok(day6.some((exercise) => exercise.type === 'writing' && /exactly what you hear/i.test(exercise.instruction) && /ain['’]t/i.test(exercise.correctValue)), 'exact informal transcription missing');

  const standardPractice = lesson.days.slice(0, 5).flatMap((day) => day.exercises);
  assert.ok(standardPractice.every((exercise) => !/ain['’]t/i.test(exercise.correctValue)), 'standard practice cannot use ain’t as the answer');
  assert.ok(standardPractice.every((exercise) => !(exercise.acceptedAnswers ?? []).some((answer) => /amn['’]t|ain['’]t/i.test(answer))), 'nonstandard forms cannot be accepted');

  const practiceCorpus = lesson.days.slice(0, 6)
    .flatMap((day) => day.exercises)
    .map((exercise) => `${exercise.audioValue} ${exercise.displayValue ?? ''} ${exercise.correctValue}`)
    .join(' ');
  for (const term of ['zoo', 'animal', 'animals', 'lion', 'zebra', 'giraffe', 'giraffes', 'guide', 'tree', 'strong', 'beautiful', 'afraid']) {
    assert.match(practiceCorpus, new RegExp(`\\b${term}\\b`, 'i'), `Lesson 8 zoo vocabulary missing: ${term}`);
  }
  for (const term of ['explore', 'entrance', 'beside', 'nature', 'group']) {
    assert.match(practiceCorpus, new RegExp(`\\b${term}\\b`, 'i'), `Lesson 8 reading vocabulary missing: ${term}`);
  }
  assert.match(practiceCorpus, /Reading — At the Zoo/i, 'updated zoo reading missing');
  assert.match(practiceCorpus, /school|classroom|teacher|students/i, 'familiar school context must remain represented');
  assert.doesNotMatch(practiceCorpus, /\bI['’]d\b/i, 'I’d is outside the Lesson 8 scope');

  const finalTest = lesson.days[6].exercises;
  const finalCorpus = finalTest.map((exercise) => `${exercise.audioValue} ${exercise.correctValue}`).join(' ');
  assert.match(finalCorpus, /\bI am\b|\bI'm\b/i, 'affirmative contractions missing from Final Test');
  assert.match(finalCorpus, /isn['’]t|aren['’]t|not/i, 'negative contractions missing from Final Test');
  assert.match(finalCorpus, /\b(?:is|are)\b[^?]*\?/i, 'questions and short answers missing from Final Test');
  assert.match(finalCorpus, /aren['’]t I/i, 'aren’t I missing from Final Test');
  assert.match(finalCorpus, /ain['’]t/i, 'informal ain’t recognition missing from Final Test');
  assert.ok(finalTest.filter((exercise) => ['listening-writing', 'shadowing'].includes(exercise.assessmentMode)).every((exercise) => exercise.audioValue.trim()), 'listening and shadowing audio must be populated');
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
    assert.equal(recognition.options.length, 4);
    assert.equal(new Set(recognition.options).size, 4);
    assert.ok(recognition.options.includes(recognition.correctValue));
    const numericDisplay = /^\d+$/.test(recognition.displayValue);
    const numericOptions = recognition.options.every((option) => /^\d+$/.test(option));
    const wordOptions = recognition.options.every((option) => /^[a-z-]+$/i.test(option));
    assert.notEqual(recognition.displayValue.toLowerCase(), recognition.correctValue.toLowerCase(), `${value}: answer revealed`);
    assert.equal(numericDisplay ? wordOptions : numericOptions, true, `${value}: display/options must use inverse formats`);
    assert.equal(numericDisplay ? recognition.correctValue : numberWords[Number(recognition.correctValue)], numberWords[value]);
  }
  const fourteen = practice.find((exercise) => exercise.id === 'wb1_l1_number_recognition_14');
  assert.equal(fourteen.displayValue, '14');
  assert.deepEqual(fourteen.options, ['four', 'fourteen', 'forty', 'forty-four']);
  assert.equal(fourteen.correctValue, 'fourteen');
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

test('reported Lesson 1 speaking answers preserve meaning without requiring punctuation', () => {
  const lesson = workbook1.lessons.find((item) => item.id === 'wb1_l1');
  const exercises = lesson.days.flatMap((day) => day.exercises);
  const byId = (id) => exercises.find((exercise) => exercise.id === id);

  const number = byId('wb1_l1_speak_number_12');
  assert.ok(number.acceptedAnswers.includes('This is a number.'));

  const yes = byId('wb1_l1_final_speak_yes_letter');
  assert.ok(yes.acceptedAnswers.includes('Yes'));

  const no = byId('wb1_l1_final_speak_no_letter');
  assert.ok(no.acceptedAnswers.includes('No'));
});
