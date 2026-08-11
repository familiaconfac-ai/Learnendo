import assert from 'node:assert/strict';
import type { ClassPerformanceReport } from './classReportModel';
import { createClassReportPdf } from './classReportService';

const students = Array.from({ length: 80 }, (_, index) => ({
  name: `Student ${index + 1}`,
  position: index + 1,
  score: 100 - index,
  progressPercent: index % 101,
  learningPosition: `Book ${1 + (index % 8)} - Lesson ${1 + (index % 12)} - Activity ${1 + (index % 7)}`,
  completedActivities: index,
  attempts: index * 2,
  correctAnswers: index,
  errors: index,
  accuracy: index === 0 ? 0 : 50,
  lastActivity: index % 2 ? 'Today' : 'No activity recorded',
  daysWithoutActivity: index % 2 ? 0 : null,
  needsAttention: index % 10 === 0 ? ['No activity recorded'] : [],
}));

const report: ClassPerformanceReport = {
  className: 'Large class',
  generatedAt: new Date('2026-08-11T12:00:00Z'),
  rankingCriterion: 'Official formula.',
  summary: {
    students: students.length,
    activeRecently: 40,
    withoutRecentActivity: 40,
    averageProgress: 40,
    averageAccuracy: 50,
    averageScore: 60,
    completedActivities: 3160,
    attempts: 6320,
    correctAnswers: 3160,
    errors: 3160,
  },
  students,
};

const document = createClassReportPdf(report);
assert.ok(document.getNumberOfPages() >= 6, 'a large class must paginate without truncating rows');
const bytes = Buffer.from(document.output('arraybuffer'));
assert.ok(bytes.length > 20_000, 'the generated PDF must contain the complete report');

console.log('class report PDF tests passed');
