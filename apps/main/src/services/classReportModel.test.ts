import assert from 'node:assert/strict';
import type { TeacherStudentRow } from '../engine/teacherService.ts';
import { detectAlerts } from '../engine/alertService.ts';
import { buildClassPerformanceReport, getCurriculumProgressPercent } from './classReportModel.ts';

function student(
  name: string,
  overrides: Partial<TeacherStudentRow> = {},
): TeacherStudentRow {
  return {
    uid: `uid-${name}`,
    role: 'student',
    displayName: name,
    email: `${name.toLowerCase()}@private.example`,
    totalStars: 0,
    totalFire: 0,
    totalIce: 0,
    totalDiamonds: 0,
    lessonsStarted: 0,
    daysCompleted: 0,
    totalTimeSpent: 0,
    timeSpentToday: 0,
    totalErrors: 0,
    totalAttempts: 0,
    avgAccuracy: 0,
    score: 0,
    rank: 1,
    alerts: [],
    pathLabel: 'W1 L1 E1',
    lastActivityLabel: '—',
    dashboardStatus: 'Registered',
    selectedCourseLabel: 'English',
    selectedLanguageLabel: 'English',
    lessonsCompleted: 0,
    lessonsLabel: '0E',
    placementLabel: 'Not Done',
    currentWorkbook: 1,
    currentLesson: 1,
    currentDay: 1,
    ...overrides,
  };
}

const generatedAt = new Date('2026-08-11T12:00:00Z');
const report = buildClassPerformanceReport('Learnendo Kids', [
  student('Ana', { totalStars: 10, totalDiamonds: 2, avgAccuracy: 80, daysCompleted: 4, totalAttempts: 10, totalErrors: 2, lastActivity: '2026-08-11T09:00:00Z' }),
  student('Bia', { totalStars: 4, avgAccuracy: 70, daysCompleted: 2, totalAttempts: 8, totalErrors: 3, lastActivity: '2026-08-08T09:00:00Z' }),
  student('Caio'),
  student('Legacy student', { role: undefined }),
  student('Teacher', { role: 'teacher', totalStars: 999, totalAttempts: 100, totalErrors: 0 }),
  student('Admin', { role: 'admin', totalStars: 999, totalAttempts: 100, totalErrors: 0 }),
], generatedAt);

assert.equal(report.summary.students, 4);
assert.equal(report.students[0].name, 'Ana');
assert.equal(report.students[0].score, 34.8, 'the official Learnendo score formula must be reused exactly');
assert.equal(report.summary.completedActivities, 6);
assert.equal(report.summary.attempts, 18);
assert.equal(report.summary.correctAnswers, 13);
assert.equal(report.summary.errors, 5);
assert.equal(report.summary.activeRecently, 1);
assert.equal(report.students[2].lastActivity, 'No activity recorded');
assert.equal(report.students.some((entry) => entry.name === 'Teacher' || entry.name === 'Admin'), false);
assert.equal(report.students.some((entry) => entry.name === 'Legacy student'), true);

const timezoneReport = buildClassPerformanceReport('Timezone', [
  student('Same Brazilian day', { lastActivity: '2026-08-10T23:30:00Z' }),
  student('Previous Brazilian day', { lastActivity: '2026-08-10T02:30:00Z' }),
], new Date('2026-08-11T02:00:00Z'));
assert.equal(timezoneReport.students.find((item) => item.name === 'Same Brazilian day')?.lastActivity, 'Today');
assert.equal(timezoneReport.students.find((item) => item.name === 'Previous Brazilian day')?.lastActivity, 'Yesterday');
assert.equal(report.students[2].attempts, 0);

const historicalErrorStudent = student('Historical errors', {
  totalAttempts: 50,
  totalErrors: 43,
  avgAccuracy: 86,
  lastActivity: '2026-08-11T09:00:00Z',
});
historicalErrorStudent.alerts = detectAlerts(historicalErrorStudent, generatedAt);
const historicalErrorReport = buildClassPerformanceReport('Historical errors', [historicalErrorStudent], generatedAt);
assert.equal(historicalErrorReport.students[0].errors, 43, 'historical errors must remain available as report data');
assert.deepEqual(historicalErrorReport.students[0].needsAttention, [],
  'historical errors alone must not appear as an active class-report concern');

const tieReport = buildClassPerformanceReport('Tie class', [
  student('Zoe', { totalStars: 5, daysCompleted: 2 }),
  student('Alice', { totalStars: 5, daysCompleted: 2 }),
  student('Lower', { totalStars: 1 }),
], generatedAt);
assert.deepEqual(tieReport.students.map((entry) => [entry.name, entry.position]), [
  ['Alice', 1],
  ['Zoe', 1],
  ['Lower', 3],
]);

const serialized = JSON.stringify(report);
assert.equal(serialized.includes('@private.example'), false, 'the shareable report must not contain email addresses');
assert.equal(serialized.includes('uid-Ana'), false, 'the shareable report must not contain UIDs');
assert.equal(getCurriculumProgressPercent(student('End', { currentWorkbook: 8, currentLesson: 12, currentDay: 7 })), 100);

const learnendoKidsProgress = buildClassPerformanceReport('Learnendo Kids', [
  student('Ryan Miranda', { currentWorkbook: 1, currentLesson: 1, currentDay: 1, daysCompleted: 38 }),
  student('Aquilles Donadon', { currentWorkbook: 1, currentLesson: 1, currentDay: 1, daysCompleted: 7 }),
  student('Lara Donadon', { currentWorkbook: 1, currentLesson: 1, currentDay: 1, daysCompleted: 1 }),
], generatedAt);
assert.deepEqual(
  Object.fromEntries(learnendoKidsProgress.students.map((entry) => [entry.name, entry.progressPercent])),
  { 'Ryan Miranda': 5.7, 'Aquilles Donadon': 1, 'Lara Donadon': 0.1 },
  'legacy W1/L1/E1 pointers must fall back to unique completed activities in the official curriculum',
);

const largeReport = buildClassPerformanceReport(
  'Large class',
  Array.from({ length: 150 }, (_, index) => student(`Student ${index + 1}`, { totalStars: index, daysCompleted: index % 20 })),
  generatedAt,
);
assert.equal(largeReport.students.length, 150);
assert.equal(largeReport.students[0].name, 'Student 150');

console.log('class report model tests passed');
