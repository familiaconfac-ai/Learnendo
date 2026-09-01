import assert from 'node:assert/strict';
import {
  getLiveAttendanceDuration,
  getLiveAttendanceMetrics,
  getSaoPauloAttendanceDay,
  normalizeLiveAttendanceRecords,
  type LiveAttendanceRecord,
} from './liveAttendance.ts';

assert.equal(getSaoPauloAttendanceDay(new Date('2026-08-25T02:30:00.000Z')), '2026-08-24');
assert.equal(getSaoPauloAttendanceDay(new Date('2026-08-25T03:30:00.000Z')), '2026-08-25');

const record: LiveAttendanceRecord = {
  id: '2026_08_25',
  studentUid: 'student-1',
  classId: 'class-1',
  classTitle: 'English Class',
  date: '2026-08-25',
  joinedAt: '2026-08-25T22:03:00.000Z',
  leftAt: '2026-08-25T23:01:00.000Z',
  durationSeconds: 3480,
  workbookId: 1,
  lessonId: 'wb1_l1',
  grammarFocusTitles: ['Letters and Numbers'],
  exercises: {
    first: { exerciseId: 'first', attempts: 1, firstVerdict: 'correct', finalVerdict: 'correct' },
    corrected: { exerciseId: 'corrected', attempts: 2, firstVerdict: 'wrong', finalVerdict: 'correct_second_try' },
    wrong: { exerciseId: 'wrong', attempts: 1, firstVerdict: 'wrong', finalVerdict: 'wrong' },
  },
};

assert.deepEqual(getLiveAttendanceMetrics(record), {
  exercises: 3,
  firstPassCorrect: 1,
  incorrect: 2,
  corrected: 1,
  finalCorrect: 2,
});
assert.equal(getLiveAttendanceDuration(record), 3480);
assert.equal(getLiveAttendanceDuration({
  ...record,
  leftAt: null,
  activeSegmentStartedAt: '2026-08-25T23:01:00.000Z',
}, new Date('2026-08-25T23:03:00.000Z')), 3600);
assert.equal(normalizeLiveAttendanceRecords({ [record.id]: record }, record.studentUid)[0]?.classTitle, 'English Class');
assert.deepEqual(normalizeLiveAttendanceRecords(undefined, record.studentUid), []);

console.log('live attendance model tests passed');
