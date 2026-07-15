import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendUniqueCompletionActivities,
  completionDestination,
  getPedagogicalLessonStatus,
} from './lessonProgressionEngine.ts';

test('a student unlocks the next lesson immediately after the final-review marker is added', () => {
  const before = new Set<number>();
  assert.equal(getPedagogicalLessonStatus(2, before), 'locked');

  const activities = appendUniqueCompletionActivities([], 'wb1_l1_d7', 'lesson_test_passed_1');
  const completed = new Set(
    activities.filter((id) => id.startsWith('lesson_test_passed_')).map((id) => Number(id.split('_').at(-1))),
  );
  assert.equal(getPedagogicalLessonStatus(2, completed), 'in-progress');
});

test('completion activities remain unique across replay and mandatory review', () => {
  const first = appendUniqueCompletionActivities([], 'wb1_l1_d7', 'lesson_test_passed_1');
  const replay = appendUniqueCompletionActivities(first, 'wb1_l1_d7', 'lesson_test_passed_1');
  assert.deepEqual(replay, ['wb1_l1_d7', 'lesson_test_passed_1']);
});

test('completion chooses the correct primary destination for each milestone', () => {
  assert.equal(completionDestination({ isLastDay: false, isLastLesson: false, hasNextWorkbook: true }), 'next-day');
  assert.equal(completionDestination({ isLastDay: true, isLastLesson: false, hasNextWorkbook: true }), 'next-lesson');
  assert.equal(completionDestination({ isLastDay: true, isLastLesson: true, hasNextWorkbook: true }), 'next-workbook');
  assert.equal(completionDestination({ isLastDay: true, isLastLesson: true, hasNextWorkbook: false }), 'workbook-list');
});
