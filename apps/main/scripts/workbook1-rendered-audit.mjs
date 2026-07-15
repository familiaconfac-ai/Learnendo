import { mkdir, writeFile } from 'node:fs/promises';
import { rawLessons, workbook1 } from '../node_modules/.cache/workbook1-rendered-audit-bundle.mjs';

const normalize = (value = '') => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const signature = (exercise) => normalize([exercise.type, exercise.instruction, exercise.audioValue, exercise.displayValue, exercise.correctValue].join('|'));
const topicOf = (exercise) => {
  if (exercise.pedagogicalTopic) return exercise.pedagogicalTopic;
  const text = normalize([exercise.instruction, exercise.audioValue, exercise.displayValue, exercise.correctValue].join(' '));
  if (/\bhello\b|good morning|how are you|nice to meet|good night|good evening|goodbye/.test(text)) return 'greetings';
  if (/\bred\b|\bblue\b|\bgreen\b|\byellow\b|\borange\b|\bblack\b|\bwhite\b|\bpurple\b|\bpink\b|\bbrown\b|color|watercolor/.test(text)) return 'colors';
  if (/\bplus\b|\bminus\b|\btimes\b|divided by/.test(text)) return 'operations';
  if (/letter|alphabet|\b[a-z]\b/.test(text)) return 'alphabet';
  if (/number|\bzero\b|\bone\b|\btwo\b|\bthree\b|\bfour\b|\bfive\b|\bsix\b|\bseven\b|\beight\b|\bnine\b|\bten\b|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty/.test(text)) return 'numbers';
  return 'other';
};
const cleanCell = (value) => String(value ?? '').replaceAll('\t', ' ').replaceAll('\r', ' ').replaceAll('\n', ' ');

const rawById = new Map(rawLessons.flatMap((lesson) => lesson.days.flatMap((day) => day.exercises.map((exercise) => [exercise.id, exercise]))));
const rows = [];
const issues = [];

for (const lesson of workbook1.lessons) {
  let position = 0;
  const ids = new Set();
  const taughtValues = new Set();
  const taughtFragments = [];
  const introducedColors = new Set();
  for (const [dayIndex, day] of lesson.days.entries()) {
    for (const exercise of day.exercises) {
      position += 1;
      const topic = topicOf(exercise);
      const row = {
        lessonId: lesson.id,
        position,
        dayId: day.id,
        exerciseId: exercise.id,
        type: exercise.type,
        assessmentMode: exercise.assessmentMode ?? '',
        instruction: exercise.instruction,
        audio: exercise.audioValue,
        display: exercise.displayValue ?? '',
        correct: exercise.correctValue,
        origin: exercise.contentOrigin ?? exercise.sourceExerciseId ?? exercise.id,
        sourceExerciseId: exercise.sourceExerciseId ?? '',
        topic,
        prerequisite: exercise.prerequisite ?? '',
        introducesNewContent: Boolean(exercise.introducesNewContent ?? exercise.isNewVocab),
        assessesContent: Boolean(exercise.assessesContent ?? !exercise.isNewVocab),
      };
      rows.push(row);

      if (ids.has(exercise.id)) issues.push({ lessonId: lesson.id, exerciseId: exercise.id, kind: 'duplicate-id' });
      ids.add(exercise.id);
      if (lesson.id === 'wb1_l1' && topic === 'greetings') issues.push({ lessonId: lesson.id, exerciseId: exercise.id, kind: 'greeting-in-lesson-1' });
      if (/watercolor|\bzip\b/i.test(`${exercise.instruction} ${exercise.audioValue} ${exercise.correctValue}`)) issues.push({ lessonId: lesson.id, exerciseId: exercise.id, kind: 'watercolor-or-zip-residue' });
      const raw = rawById.get(exercise.id);
      if (raw && signature(raw) !== signature(exercise) && !exercise.sourceExerciseId) {
        issues.push({ lessonId: lesson.id, exerciseId: exercise.id, kind: 'same-id-different-content' });
      }
      if (topic === 'colors') {
        const color = ['red', 'blue', 'green', 'yellow', 'orange', 'black', 'white', 'purple', 'pink', 'brown']
          .find((candidate) => normalize(`${exercise.displayValue} ${exercise.audioValue} ${exercise.correctValue}`).includes(candidate));
        if (color && row.introducesNewContent && row.display) introducedColors.add(color);
        if (lesson.id === 'wb1_l1' && color && row.assessesContent && !introducedColors.has(color)) {
          issues.push({ lessonId: lesson.id, exerciseId: exercise.id, kind: 'color-assessed-before-visual-introduction', color });
        }
      }
      if (dayIndex < 6) {
        const modeledValues = [exercise.audioValue, exercise.displayValue, exercise.correctValue, exercise.fullSentenceAfterAnswer, ...(exercise.acceptedAnswers ?? [])];
        modeledValues.map(normalize).filter(Boolean).forEach((value) => taughtValues.add(value));
        taughtFragments.push(...modeledValues);
      } else {
        const testedValue = normalize(exercise.assessmentMode === 'speaking' ? exercise.correctValue : exercise.audioValue);
        if (!taughtValues.has(testedValue) && !normalize(taughtFragments.join(' ')).includes(testedValue)) {
          issues.push({ lessonId: lesson.id, exerciseId: exercise.id, kind: 'final-test-content-not-taught' });
        }
      }
    }
  }
  if (position !== 100) issues.push({ lessonId: lesson.id, kind: 'invalid-total', total: position });
}

const columns = Object.keys(rows[0]);
const toTsv = (selectedRows) => [columns.join('\t'), ...selectedRows.map((row) => columns.map((column) => cleanCell(row[column])).join('\t'))].join('\n');
const tsv = toTsv(rows);
const outputDir = new URL('../../../docs/audits/', import.meta.url);
const lesson1Rows = rows.filter((row) => row.lessonId === 'wb1_l1');
const lesson1Coverage = {
  renderedExercises: lesson1Rows.length,
  lettersRecognized: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((letter) => lesson1Rows.some((row) => row.exerciseId === `wb1_l1_letter_recognition_${letter.toLowerCase()}`)),
  lettersWithYesNo: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((letter) => lesson1Rows.some((row) => row.exerciseId === `wb1_l1_letter_yes_no_${letter.toLowerCase()}`)),
  numbersRecognized: Array.from({ length: 21 }, (_, value) => value).filter((value) => lesson1Rows.some((row) => row.exerciseId === `wb1_l1_number_recognition_${value}`)),
  finalTestModes: Object.fromEntries(['listening-writing', 'shadowing', 'speaking'].map((mode) => [mode, lesson1Rows.filter((row) => row.dayId === 'wb1_l1_d7' && row.assessmentMode === mode).length])),
  forbiddenTopicRows: lesson1Rows.filter((row) => ['greetings', 'colors', 'operations'].includes(row.topic)).map((row) => row.exerciseId),
};
await mkdir(outputDir, { recursive: true });
await writeFile(new URL('WORKBOOK1_RENDERED_SEQUENCE.tsv', outputDir), `${tsv}\n`, 'utf8');
await writeFile(new URL('WORKBOOK1_L1_RENDERED_SEQUENCE.tsv', outputDir), `${toTsv(lesson1Rows)}\n`, 'utf8');
await writeFile(new URL('WORKBOOK1_L1_COVERAGE.json', outputDir), `${JSON.stringify(lesson1Coverage, null, 2)}\n`, 'utf8');
await writeFile(new URL('WORKBOOK1_COLOR_SEQUENCE.tsv', outputDir), `${toTsv(rows.filter((row) => row.topic === 'colors'))}\n`, 'utf8');
await writeFile(new URL('WORKBOOK1_RENDERED_SEQUENCE.json', outputDir), `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
await writeFile(new URL('WORKBOOK1_RENDERED_ISSUES.json', outputDir), `${JSON.stringify(issues, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ lessons: workbook1.lessons.length, rows: rows.length, issues: issues.length, issuesByKind: Object.fromEntries([...new Set(issues.map((issue) => issue.kind))].map((kind) => [kind, issues.filter((issue) => issue.kind === kind).length])) }, null, 2));
