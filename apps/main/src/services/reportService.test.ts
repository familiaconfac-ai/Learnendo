import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TeacherStudentRow } from '../engine/teacherService';
import { createStudentReportPdf, formatStudentReportStudyDate, getStudentReportStudyGap, resolveStudentReportPlacement } from './reportService';
import { getCourseWorkbookTotal } from '../courses/courseWorkbookTotals';

const dashboardSource = readFileSync(
  resolve(process.cwd(), 'src/components/TeacherDashboard/TeacherDashboard.tsx'),
  'utf8',
);

assert.match(dashboardSource, />Student Report</);
assert.equal((dashboardSource.match(/handlePdf\(student\)/g) ?? []).length, 1);
assert.doesNotMatch(dashboardSource, /generatePlacementReport|handlePlacementPdf/);

const baseStudent = {
  uid: 'student-report-test',
  displayName: 'Sample Student',
  email: 'student@example.test',
  rank: 1,
  score: 10,
  alerts: [],
  daysCompleted: 3,
  timeSpentToday: 60,
  totalTimeSpent: 600,
  totalAttempts: 12,
  totalErrors: 2,
  avgAccuracy: 83,
  totalFire: 1,
  totalIce: 2,
  totalDiamonds: 3,
  totalStars: 4,
  currentWorkbook: 1,
  currentLesson: 2,
  currentDay: 3,
  courseId: 'english',
  selectedLanguageCode: 'en',
  lastPedagogicalActivity: '2026-08-24T16:30:00.000Z',
  previousPedagogicalActivity: '2026-08-19T23:15:00.000Z',
} as TeacherStudentRow;

const placement = {
  score: 75,
  date: '2026-08-20T12:00:00.000Z',
  level: 'A2',
  languageCode: 'en',
  recommendedBook: 2,
  recommendedEntryPoint: 'Workbook 2 - Lesson 1',
  answerBreakdown: [{
    questionId: 'q1',
    prompt: 'Choose the correct sentence.',
    studentAnswer: 'She go to school.',
    correctAnswer: 'She goes to school.',
    isCorrect: false,
    explanation: 'Use the third-person singular form.',
    grammarTopic: 'Present simple',
    levelBand: 'A2',
    skillType: 'multiple-choice',
  }],
};

const mapOnlyStudent = {
  ...baseStudent,
  tests: { placements: { en: placement } },
} as TeacherStudentRow;

assert.equal(resolveStudentReportPlacement(mapOnlyStudent), placement);
assert.equal(resolveStudentReportPlacement(baseStudent), undefined);
assert.equal(resolveStudentReportPlacement({ ...baseStudent, tests: { placement } } as TeacherStudentRow), placement);
const olderPlacement = { ...placement, date: '2026-07-01T12:00:00.000Z', languageCode: 'es' };
assert.equal(resolveStudentReportPlacement({
  ...baseStudent,
  tests: { placement: olderPlacement, placements: { en: placement, es: olderPlacement } },
} as TeacherStudentRow), placement);
assert.equal(resolveStudentReportPlacement({
  ...baseStudent,
  tests: { placement: olderPlacement, placements: { es: olderPlacement } },
} as TeacherStudentRow), undefined, 'an English report must not fall back to a Spanish placement');

const spanishPlacement = {
  ...olderPlacement,
  answerBreakdown: [{
    ...placement.answerBreakdown[0],
    prompt: 'Elige la oración correcta.',
    studentAnswer: 'Ella ir a la escuela.',
    correctAnswer: 'Ella va a la escuela.',
  }],
};
const mixedLanguageReport = createStudentReportPdf({
  ...baseStudent,
  tests: { placement: spanishPlacement, placements: { en: placement, es: spanishPlacement } },
} as TeacherStudentRow).output();
assert.match(mixedLanguageReport, /Choose the correct sentence\./);
assert.doesNotMatch(mixedLanguageReport, /Elige la oraci/,
  'English report must not contain the Spanish placement breakdown');

assert.equal(getCourseWorkbookTotal('english'), 9);
assert.equal(formatStudentReportStudyDate(baseStudent.lastPedagogicalActivity), '24 Aug 2026 · 1:30 PM');
assert.equal(formatStudentReportStudyDate(baseStudent.previousPedagogicalActivity), '19 Aug 2026 · 8:15 PM');
assert.equal(getStudentReportStudyGap(
  baseStudent.previousPedagogicalActivity,
  baseStudent.lastPedagogicalActivity,
), 4, 'the gap counts only whole study-free days between the two sessions');
assert.equal(getStudentReportStudyGap('2026-08-21T12:00:00.000Z', '2026-08-24T12:00:00.000Z'), 2);
assert.equal(getStudentReportStudyGap('2026-08-24T12:00:00.000Z', '2026-08-25T12:00:00.000Z'), 0);
assert.equal(getStudentReportStudyGap('2026-08-20T12:00:00.000Z', '2026-08-25T12:00:00.000Z'), 4);
assert.equal(getStudentReportStudyGap('2026-08-25T12:00:00.000Z', '2026-08-25T18:00:00.000Z'), 0);
assert.equal(getStudentReportStudyGap('2026-08-24T02:30:00.000Z', '2026-08-24T03:30:00.000Z'), 0,
  'adjacent Sao Paulo civil days have no intervening study-free day');
assert.equal(formatStudentReportStudyDate(undefined), '—');
assert.equal(getStudentReportStudyGap(undefined, baseStudent.lastPedagogicalActivity), null);

const reportWithoutPlacement = createStudentReportPdf(baseStudent);
assert.equal(reportWithoutPlacement.getNumberOfPages(), 2);
assert.match(reportWithoutPlacement.output(), /Not Done/);
assert.match(reportWithoutPlacement.output(), /Workbook/);
assert.match(reportWithoutPlacement.output(), /1 \/ 9/);
assert.match(reportWithoutPlacement.output(), /RECENT ACTIVITY/);
assert.match(reportWithoutPlacement.output(), /Last study/);
assert.match(reportWithoutPlacement.output(), /Previous study/);
assert.match(reportWithoutPlacement.output(), /Gap/);
assert.match(reportWithoutPlacement.output(), /Total study time/);
assert.match(reportWithoutPlacement.output(), /Study time today/);

const canonicalStudyTimestamp = { toDate: () => new Date() };
const todayStudent = {
  ...baseStudent,
  lastPedagogicalActivity: canonicalStudyTimestamp,
  previousPedagogicalActivity: { toDate: () => new Date(Date.now() - 86_400_000) },
  timeSpentToday: 0,
  courses: {
    english: {
      courseId: 'english',
      languageCode: 'en',
      lastActivityAt: { toDate: () => new Date('2026-08-24T13:00:00.000Z') },
      currentWorkbook: 1,
      currentLesson: 7,
      currentDay: 7,
    },
  },
} as unknown as TeacherStudentRow;

for (let generation = 0; generation < 2; generation++) {
  const refreshedReport = createStudentReportPdf(todayStudent).output();
  assert.match(refreshedReport, /Last study/);
  assert.match(refreshedReport, /Last activity: Today/,
    'the selected course must reuse the canonical pedagogical timestamp after regeneration');
  assert.match(refreshedReport, /0 days/,
    'consecutive study days must show zero whole inactive days');
  assert.match(refreshedReport, /Study time today/,
    'missing persisted daily duration must not prevent report generation');
}

const timestampOnlyCourseReport = createStudentReportPdf({
  ...baseStudent,
  lastPedagogicalActivity: undefined,
  courses: {
    english: {
      courseId: 'english',
      languageCode: 'en',
      lastActivityAt: canonicalStudyTimestamp,
    },
  },
} as unknown as TeacherStudentRow).output();
assert.match(timestampOnlyCourseReport, /Last activity: Today/,
  'Firestore Timestamp course activity must not render as an empty value');

const reportWithoutHistory = createStudentReportPdf({
  ...baseStudent,
  lastPedagogicalActivity: undefined,
  previousPedagogicalActivity: undefined,
} as TeacherStudentRow);
assert.match(reportWithoutHistory.output(), /Previous study/);
assert.match(reportWithoutHistory.output(), /Gap/);

const reportWithPlacement = createStudentReportPdf(mapOnlyStudent);
assert.equal(reportWithPlacement.getNumberOfPages(), 2);
const renderedPdf = reportWithPlacement.output();
for (const expected of [
  'Test date',
  'Score',
  '75%',
  'Book / level',
  'Book 2 - A2',
  'Recommended Entry Point',
  'Workbook 2 - Lesson 1',
  'SKILL BREAKDOWN',
  'QUESTIONS ANSWERED INCORRECTLY',
  'Choose the correct sentence.',
  'She go to school.',
  'She goes to school.',
  'Use the third-person singular form.',
]) assert.ok(renderedPdf.includes(expected), `missing PDF text: ${expected}`);

const visualOutputDirectory = process.env.STUDENT_REPORT_PDF_OUTPUT;
if (visualOutputDirectory) {
  mkdirSync(visualOutputDirectory, { recursive: true });
  writeFileSync(resolve(visualOutputDirectory, 'student-report-without-placement.pdf'), Buffer.from(reportWithoutPlacement.output('arraybuffer')));
  writeFileSync(resolve(visualOutputDirectory, 'student-report-with-placement.pdf'), Buffer.from(reportWithPlacement.output('arraybuffer')));
  writeFileSync(resolve(visualOutputDirectory, 'student-report-recent-activity.pdf'), Buffer.from(createStudentReportPdf(todayStudent).output('arraybuffer')));
}

console.log('student report tests passed');
