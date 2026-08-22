import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TeacherStudentRow } from '../engine/teacherService';
import { createStudentReportPdf, resolveStudentReportPlacement } from './reportService';

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
  selectedLanguageCode: 'en',
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
  selectedLanguageCode: undefined,
  tests: { placements: { en: placement, es: olderPlacement } },
} as TeacherStudentRow), placement);

const reportWithoutPlacement = createStudentReportPdf(baseStudent);
assert.equal(reportWithoutPlacement.getNumberOfPages(), 1);
assert.match(reportWithoutPlacement.output(), /Not Done/);

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
}

console.log('student report tests passed');
