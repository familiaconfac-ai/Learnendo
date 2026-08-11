import assert from 'node:assert/strict';
import { getClassMemberRows } from './classMembership.ts';
import { buildClassPerformanceReport } from './classReportModel.ts';
import type { TeacherStudentRow } from '../engine/teacherService.ts';

const students = [
  { uid: 'marcio', displayName: 'Márcio Martins' },
  { uid: 'ryan', displayName: 'Ryan Miranda' },
  { uid: 'aquilles', displayName: 'Aquilles Toledo Donadon' },
  { uid: 'grego', displayName: 'gregosetelip' },
  { uid: 'conceicao', displayName: 'Conceição Martins' },
].map((student) => ({
  ...student,
  email: `${student.uid}@example.com`,
  totalStars: 0,
  totalDiamonds: 0,
  avgAccuracy: 0,
  daysCompleted: 0,
  totalAttempts: 0,
  totalErrors: 0,
  currentWorkbook: 1,
  currentLesson: 1,
  currentDay: 1,
  alerts: [],
})) as TeacherStudentRow[];

const kids = getClassMemberRows({ assignedStudentIds: ['marcio', 'ryan', 'aquilles'] }, students);
assert.deepEqual(kids.map((student) => student.uid), ['marcio', 'ryan', 'aquilles']);
assert.equal(kids.some((student) => student.uid === 'grego'), false);
assert.equal(kids.some((student) => student.uid === 'conceicao'), false);
assert.deepEqual(
  buildClassPerformanceReport('Learnendo Kids', kids).students.map((student) => student.name).sort(),
  ['Aquilles Toledo Donadon', 'Márcio Martins', 'Ryan Miranda'].sort(),
  'the report must receive exactly the visible class members',
);

const other = getClassMemberRows({ assignedStudentIds: ['grego'] }, students);
assert.deepEqual(other.map((student) => student.uid), ['grego']);
assert.deepEqual(getClassMemberRows(null, students), []);

console.log('class membership tests passed');
