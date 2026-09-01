import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildLiveTrailSessionTitle,
  getWorkbookOptionsForCourse,
  loadWorkbookForWhiteboard,
  resolveLessonForLiveTrails,
  resolveLessonForWhiteboard,
} from './liveWhiteboardActivities';

assert.deepEqual(getWorkbookOptionsForCourse('english').map((option) => option.id), [1, 2, 3, 4, 5, 6, 7, 8, 9]);

for (const workbookId of getWorkbookOptionsForCourse('english').map((option) => option.id)) {
  const workbook = await loadWorkbookForWhiteboard('english', workbookId);
  assert.ok(workbook, `Workbook ${workbookId} must load through the shared course registry`);
  assert.equal(workbook.lessons.length, 12, `Workbook ${workbookId} must expose its actual lessons`);
  for (const lesson of workbook.lessons) {
    const resolved = resolveLessonForLiveTrails(workbook, lesson.id);
    assert.equal(resolved?.id, lesson.id, `Workbook ${workbookId} must resolve ${lesson.id}`);
    assert.equal(resolved?.days.length, 7, `${lesson.id} must expose seven real curriculum trails`);
    for (const trail of resolved?.days ?? []) {
      assert.ok(trail.exercises.length > 0, `${trail.id} must contain actual lesson exercises`);
      assert.ok(trail.id.startsWith(lesson.id), `${trail.id} must belong to ${lesson.id}`);
    }
  }
}

const workbook1 = await loadWorkbookForWhiteboard('english', 1);
const workbook3 = await loadWorkbookForWhiteboard('english', 3);
const workbook4 = await loadWorkbookForWhiteboard('english', 4);
const lesson1 = resolveLessonForLiveTrails(workbook1, 'wb1_l1');
const lesson25 = resolveLessonForLiveTrails(workbook3, 'wb3_l25');
const lesson37 = resolveLessonForLiveTrails(workbook4, 'wb4_l37');
assert.equal(lesson1?.title, 'Lesson 1: The Alphabet and Numbers');
assert.equal(lesson25?.title, 'Lesson 25: School');
assert.equal(lesson37?.id, 'wb4_l37');
assert.equal(lesson1?.days[0]?.id, 'wb1_l1_d1');
assert.equal(lesson1?.days[0]?.exercises[0]?.id, 'wb1_l1_letter_recognition_a',
  'starting W1/L1/Trail 1 must use the real alphabet exercise instead of an old W3 activity');
assert.equal(lesson25?.days[0]?.exercises[0]?.id, 'wb3_l25_d1_e1');
assert.equal(lesson37?.days[0]?.exercises[0]?.id, 'wb4_l37_d1_e1');
assert.ok(lesson1?.days[0]?.exercises.every((exercise) => Boolean(exercise.instruction)));
assert.equal(resolveLessonForWhiteboard(workbook1, lesson25?.id), null,
  'the old Workbook 3 lesson reference does not belong to Workbook 1');

const staleTrailId = lesson25?.days[4]?.id ?? '';
assert.equal(buildLiveTrailSessionTitle(lesson25, [staleTrailId]), 'Lesson 25: School - Trail 5');
const switchedLesson = resolveLessonForLiveTrails(workbook1, lesson25?.id);
assert.equal(switchedLesson?.id, 'wb1_l1', 'switching workbooks must fall back to the new workbook first real lesson');
assert.ok(!switchedLesson?.days.some((trail) => trail.id === staleTrailId),
  'the previous workbook Trail 5 cannot survive the new lesson selection');
assert.equal(buildLiveTrailSessionTitle(switchedLesson, [switchedLesson!.days[0].id]),
  'Lesson 1: The Alphabet and Numbers - Trail 1');
assert.equal(buildLiveTrailSessionTitle(lesson1, lesson1!.days.map((trail) => trail.id)),
  'Lesson 1: The Alphabet and Numbers - All Trails (1, 2, 3, 4, 5, 6, 7)');
assert.equal(resolveLessonForLiveTrails({ lessons: [] } as never, 'missing'), null,
  'a workbook without lesson trails must not receive invented curriculum');

const panelSource = readFileSync(resolve(process.cwd(), 'src/components/LiveClasses/ExerciseSessionPanel.tsx'), 'utf8');
assert.doesNotMatch(panelSource, /setLessonId\(\(previous\) => previous \|\| resolvedLessonId\)/,
  'a previous workbook lesson id must never override the newly resolved lesson');
assert.match(panelSource, /setSessionTitleDraft\(buildLiveTrailSessionTitle\(selectedLesson, selectedTrailIds\)\)/,
  'the Session Title must track the current lesson and selected trails');
assert.match(panelSource, /setWorkbookId\([\s\S]{0,250}setWorkbook\(null\)[\s\S]{0,250}setLessonId\(''\)[\s\S]{0,250}setSelectedTrailIds\(\[\]\)/,
  'changing Workbook must clear stale lesson and trail selection before loading its curriculum');

console.log('live class workbook trails tests passed for all 9 workbooks and 108 lessons');
