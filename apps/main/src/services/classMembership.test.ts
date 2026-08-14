import assert from 'node:assert/strict';
import { getClassComposition, getClassMemberRows } from './classMembership.ts';
import { buildClassPerformanceReport } from './classReportModel.ts';
import { partitionStudentAccounts } from './studentRolePolicy.ts';
import { rankStudents } from '../engine/rankingService.ts';
import type { TeacherStudentRow } from '../engine/teacherService.ts';

const students = [
  { uid: 'KoPeImR8pfhjoJX8nmELT5f3X7l1', displayName: 'Márcio Martins', role: 'admin' as const },
  { uid: 'JOn1CpbJWbMKmVk7o08h4G6iGEm1', displayName: 'Ryan Miranda', role: undefined },
  { uid: 'CXdWaHfHhVWg8cu75jpmUyhxWh13', displayName: 'Aquilles Toledo Donadon', role: 'student' as const },
  { uid: 'P2WM6XcLyEe2VyYrUf8nwBhyctq1', displayName: 'Lara Donadon', role: undefined },
  { uid: 'grego', displayName: 'gregosetelip', role: 'student' as const },
  { uid: 'conceicao', displayName: 'Conceição Martins', role: 'teacher' as const },
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

const learnendoKids = {
  createdBy: 'KoPeImR8pfhjoJX8nmELT5f3X7l1',
  assignedStudentIds: [
    'KoPeImR8pfhjoJX8nmELT5f3X7l1',
    'JOn1CpbJWbMKmVk7o08h4G6iGEm1',
    'CXdWaHfHhVWg8cu75jpmUyhxWh13',
    'P2WM6XcLyEe2VyYrUf8nwBhyctq1',
  ],
};

const composition = getClassComposition(learnendoKids, students);
const members = getClassMemberRows(learnendoKids, students);
const dashboardAccounts = partitionStudentAccounts(students);
assert.deepEqual(dashboardAccounts.students.map((student) => student.displayName), [
  'Ryan Miranda',
  'Aquilles Toledo Donadon',
  'Lara Donadon',
  'gregosetelip',
]);
assert.deepEqual(dashboardAccounts.administrative.map((student) => student.displayName), [
  'Márcio Martins',
  'Conceição Martins',
]);
assert.equal(dashboardAccounts.students.length, 4, 'the Students total must count only student accounts');
const studentRanking = rankStudents(dashboardAccounts.students);
assert.equal(studentRanking.some((student) => student.role === 'teacher' || student.role === 'admin'), false);
assert.equal(studentRanking.length, 4);
assert.equal(composition.teacher?.displayName, 'Márcio Martins');
assert.deepEqual(composition.students.map((student) => student.displayName), [
  'Ryan Miranda',
  'Aquilles Toledo Donadon',
  'Lara Donadon',
]);
assert.equal(composition.members.length, 4);
assert.deepEqual(members.map((student) => student.uid), learnendoKids.assignedStudentIds);
assert.equal(members.some((student) => student.uid === 'grego'), false);
assert.equal(members.some((student) => student.uid === 'conceicao'), false);

const report = buildClassPerformanceReport(
  'Learnendo Kids',
  composition.students,
  new Date(),
  composition.teacher?.displayName,
);
assert.equal(report.teacherName, 'Márcio Martins');
assert.deepEqual(report.students.map((student) => student.name).sort(), [
  'Aquilles Toledo Donadon',
  'Lara Donadon',
  'Ryan Miranda',
].sort(), 'legacy members without a role must remain in the report');
assert.equal(report.students.some((student) => student.name === 'Márcio Martins'), false);

const other = getClassMemberRows({ assignedStudentIds: ['grego'], createdBy: 'teacher-not-loaded' }, students);
assert.deepEqual(other.map((student) => student.uid), ['grego']);
assert.deepEqual(getClassMemberRows(null, students), []);

console.log('class membership tests passed');
