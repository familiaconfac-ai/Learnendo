import assert from 'node:assert/strict';
import test from 'node:test';
import type { Workbook } from '../types.ts';
import {
  courseIdForReportLanguage, findReportedExercise, loadReportedExerciseFromPublishedSequence,
  normalizeReportedLocationId, normalizeReportedWorkbookId, PublishedSequenceSourceError,
  reportedWorkbookCandidates, resolveWorkbookModule, resolveReportedExerciseIdentity,
} from './exerciseReportCurriculum.ts';

const workbook = {
  id: 1,
  title: 'Workbook 1',
  lessons: [{
    id: 'wb1_l3',
    title: 'Lesson 3',
    days: [{
      id: 'wb1_l3_d4',
      type: 'practice',
      exercises: [
        { id: 'first', type: 'writing', instruction: 'Write.', audioValue: 'A', correctValue: 'A' },
        { id: 'reported', type: 'writing', instruction: 'Write.', audioValue: 'B', correctValue: 'B' },
      ],
    }],
  }],
} as Workbook;

test('resolves a workbook export from a dynamic module', () => {
  assert.equal(resolveWorkbookModule({ workbook1: workbook }, 1), workbook);
  assert.equal(resolveWorkbookModule({ default: workbook }, 1), workbook);
});

test('tries the report workbook first and retains stable IDs for legacy lookup fallback', () => {
  assert.deepEqual(reportedWorkbookCandidates({
    workbookId: 2,
    lessonId: 'wb1_l1',
    dayId: 'wb1_l1_d6',
    exerciseId: 'wb1_l1_speak_number_12',
  }, [1, 2, 3]), [2, 1, 3]);
});

test('editor prioritizes report metadata for EN/ES/PT and shares a validated identity with publication', () => {
  for (const language of ['en', 'es', 'pt']) {
    const prefix = language === 'en' ? '' : `${language}_`;
    const book = { ...structuredClone(workbook), id: `${prefix}wb1` };
    book.lessons[0].id = `${prefix}wb1_l3`;
    book.lessons[0].days[0].id = `${prefix}wb1_l3_d4`;
    const location = { workbook: book, lesson: book.lessons[0], day: book.lessons[0].days[0], exerciseIndex: 0 };
    assert.equal(resolveReportedExerciseIdentity(location, { workbookId: 2 }, language)?.workbookId, 2);
    assert.deepEqual(resolveReportedExerciseIdentity(location, { workbookId: 1 }, language), {
      workbookId: 1, exerciseId: 'first', lessonId: `${prefix}wb1_l3`, dayId: `${prefix}wb1_l3_d4`, language, exerciseType: 'writing',
    });
    assert.equal(resolveReportedExerciseIdentity(location, null, language)?.workbookId, 1);
    book.id = 'unavailable';
    assert.equal(resolveReportedExerciseIdentity(location, { workbookId: NaN }, language)?.workbookId, 1);
    location.lesson.id = 'unavailable';
    assert.equal(resolveReportedExerciseIdentity(location, null, language)?.workbookId, 1);
    location.day.id = 'unavailable';
    location.day.exercises[0].id = `${prefix}wb1_l3_d4_e1`;
    assert.equal(resolveReportedExerciseIdentity(location, null, language)?.workbookId, 1);
    location.day.exercises[0].id = 'unavailable';
    assert.equal(resolveReportedExerciseIdentity(location, null, language), null);
    assert.equal(resolveReportedExerciseIdentity({ ...location, exerciseIndex: 99 }, { workbookId: 1 }, language), null);
    assert.deepEqual(reportedWorkbookCandidates({ workbookId: NaN, lessonId: `${prefix}wb1_l1`, dayId: '', exerciseId: '' }, [0, 101, 2]), [1, 2]);
  }
});

test('normalizes workbook identifiers from number, numeric string and wb prefix', () => {
  assert.equal(normalizeReportedWorkbookId(1), 1);
  assert.equal(normalizeReportedWorkbookId('1'), 1);
  assert.equal(normalizeReportedWorkbookId('wb1'), 1);
  assert.equal(normalizeReportedWorkbookId('invalid'), null);
});

test('normalizes report language and trims hierarchical identifiers', () => {
  assert.equal(courseIdForReportLanguage('English', 'spanish'), 'english');
  assert.equal(courseIdForReportLanguage('en-US', 'spanish'), 'english');
  assert.equal(courseIdForReportLanguage('pt-BR', 'english'), 'portuguese_foreigners');
  assert.equal(courseIdForReportLanguage('unknown', 'spanish'), 'spanish');
  assert.equal(normalizeReportedLocationId('  wb1_l6_d1  '), 'wb1_l6_d1');
});

test('finds the exact reported exercise without traversing prior exercises', () => {
  const found = findReportedExercise(workbook, {
    lessonId: 'wb1_l3', dayId: 'wb1_l3_d4', exerciseId: 'reported', currentExerciseIndex: 0,
  });
  assert.equal(found?.lesson.id, 'wb1_l3');
  assert.equal(found?.day.id, 'wb1_l3_d4');
  assert.equal(found?.exerciseIndex, 1);
});

test('finds a valid report even when its stored identifiers contain surrounding spaces', () => {
  const found = findReportedExercise(workbook, {
    lessonId: ' wb1_l3 ', dayId: ' wb1_l3_d4 ', exerciseId: ' reported ', currentExerciseIndex: 0,
  });
  assert.equal(found?.exerciseIndex, 1);
});

test('does not fall back to an array position when a recorded exercise id no longer exists', () => {
  const found = findReportedExercise(workbook, {
    lessonId: 'wb1_l3', dayId: 'wb1_l3_d4', exerciseId: 'old-id', currentExerciseIndex: 1,
  });
  assert.equal(found, null);
});

test('labels the index fallback explicitly for reports that predate exercise ids', () => {
  const found = findReportedExercise(workbook, {
    lessonId: 'wb1_l3', dayId: 'wb1_l3_d4', exerciseId: 'not-informed', currentExerciseIndex: 1,
  });
  assert.equal(found?.exerciseIndex, 1);
  assert.equal(found?.resolutionKind, 'legacy-index');
  assert.equal(found?.sourceCollection, 'legacy-index-fallback');
});

test('similar ids and reordered arrays still resolve by complete exact id', () => {
  const reordered = structuredClone(workbook);
  reordered.lessons[0].days[0].exercises = [
    { id: 'wb1_l2_final_v2_speak_10', type: 'speaking', instruction: 'Ten', audioValue: 'Ten', correctValue: 'Ten' },
    { id: 'wb1_l2_final_v2_speak_2', type: 'speaking', instruction: 'Two', audioValue: 'Two', correctValue: 'Two' },
    { id: 'wb1_l2_final_v2_speak_1', type: 'speaking', instruction: 'One', audioValue: 'One', correctValue: 'One' },
  ];
  const found = findReportedExercise(reordered, {
    lessonId: 'wb1_l3', dayId: 'wb1_l3_d4', exerciseId: 'wb1_l2_final_v2_speak_1', currentExerciseIndex: 0,
  });
  assert.equal(found?.exerciseIndex, 2);
  assert.equal(found?.day.exercises[found.exerciseIndex].id, 'wb1_l2_final_v2_speak_1');
  assert.equal(found?.resolutionKind, 'exact-id');
});

const publishedSpeakReport = {
  lessonId: 'wb1_l3', dayId: 'wb1_l3_d4', exerciseId: 'wb1_l2_final_v2_speak_2',
};
const publishedSpeak2 = {
  id: 'wb1_l2_final_v2_speak_2', type: 'multiple-choice' as const,
  instruction: 'Choose the correct word.', displayValue: 'It is ___ kite.',
  audioValue: '', options: ['a', 'an'], correctValue: 'a',
};

test('loads the published sequence without consulting an inaccessible draft', async () => {
  let draftReads = 0;
  const loadDraft = async () => { draftReads += 1; throw new Error('permission-denied'); };
  const found = await loadReportedExerciseFromPublishedSequence({
    workbook, report: publishedSpeakReport, sourcePath: 'publishedDayExerciseSequences/scope',
    loadPublished: async () => ({ version: 7, exercises: [publishedSpeak2] }),
  });
  assert.equal(found?.day.exercises[0].type, 'multiple-choice');
  assert.equal(found?.publicationVersion, 7);
  assert.equal(draftReads, 0);
  assert.equal(typeof loadDraft, 'function');
});

test('loads the published sequence without consulting an inaccessible canonical document', async () => {
  let canonicalReads = 0;
  const loadCanonical = async () => { canonicalReads += 1; throw new Error('permission-denied'); };
  const found = await loadReportedExerciseFromPublishedSequence({
    workbook, report: publishedSpeakReport, sourcePath: 'publishedDayExerciseSequences/scope',
    loadPublished: async () => ({ version: 7, exercises: [publishedSpeak2] }),
  });
  assert.equal(found?.day.exercises[0].instruction, 'Choose the correct word.');
  assert.equal(canonicalReads, 0);
  assert.equal(typeof loadCanonical, 'function');
});

test('reports the failed published source instead of returning packaged curriculum', async () => {
  await assert.rejects(() => loadReportedExerciseFromPublishedSequence({
    workbook, report: publishedSpeakReport, sourcePath: 'publishedDayExerciseSequences/english__en__w1__wb1_l3__wb1_l3_d4',
    loadPublished: async () => { throw new Error('permission-denied'); },
  }), (error: unknown) => {
    assert.ok(error instanceof PublishedSequenceSourceError);
    assert.match(error.message, /currículo empacotado não será usado/i);
    assert.match(error.message, /publishedDayExerciseSequences\/english__en__w1/i);
    return true;
  });
});

test('resolves speak_2 with the exact published multiple-choice structure', async () => {
  const found = await loadReportedExerciseFromPublishedSequence({
    workbook, report: publishedSpeakReport, sourcePath: 'publishedDayExerciseSequences/scope',
    loadPublished: async () => ({ version: 1, exercises: [publishedSpeak2] }),
  });
  const exercise = found?.day.exercises[found.exerciseIndex];
  assert.deepEqual(exercise, publishedSpeak2);
  assert.equal(found?.sourceCollection, 'publishedDayExerciseSequences');
});

test('does not fall back when a published sequence exists without the requested id', async () => {
  await assert.rejects(() => loadReportedExerciseFromPublishedSequence({
    workbook, report: publishedSpeakReport, sourcePath: 'publishedDayExerciseSequences/scope',
    loadPublished: async () => ({ version: 1, exercises: [{ ...publishedSpeak2, id: 'another-id' }] }),
  }), /sequência publicada existe.*não contém.*speak_2/i);
});
