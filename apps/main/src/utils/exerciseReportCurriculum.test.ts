import assert from 'node:assert/strict';
import test from 'node:test';
import type { Workbook } from '../types.ts';
import { findReportedExercise, reportedWorkbookCandidates, resolveWorkbookModule } from './exerciseReportCurriculum.ts';

const workbook = {
  id: 'wb1',
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

test('prefers the stable exercise IDs when the recorded workbook number is wrong', () => {
  assert.deepEqual(reportedWorkbookCandidates({
    workbookId: 2,
    lessonId: 'wb1_l1',
    dayId: 'wb1_l1_d6',
    exerciseId: 'wb1_l1_speak_number_12',
  }, [1, 2, 3]), [1, 2, 3]);
});

test('finds the exact reported exercise without traversing prior exercises', () => {
  const found = findReportedExercise(workbook, {
    lessonId: 'wb1_l3', dayId: 'wb1_l3_d4', exerciseId: 'reported', currentExerciseIndex: 0,
  });
  assert.equal(found?.lesson.id, 'wb1_l3');
  assert.equal(found?.day.id, 'wb1_l3_d4');
  assert.equal(found?.exerciseIndex, 1);
});

test('falls back to the recorded index only when an old exercise id no longer exists', () => {
  const found = findReportedExercise(workbook, {
    lessonId: 'wb1_l3', dayId: 'wb1_l3_d4', exerciseId: 'old-id', currentExerciseIndex: 1,
  });
  assert.equal(found?.exerciseIndex, 1);
});
