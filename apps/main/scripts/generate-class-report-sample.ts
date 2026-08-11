import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { TeacherStudentRow } from '../src/engine/teacherService';
import { buildClassPerformanceReport } from '../src/services/classReportModel';
import { createClassReportPdf } from '../src/services/classReportService';

function sampleStudent(name: string, overrides: Partial<TeacherStudentRow>): TeacherStudentRow {
  return {
    uid: `sample-${name}`,
    displayName: name,
    email: 'excluded-from-report@example.test',
    totalStars: 0,
    totalFire: 0,
    totalIce: 0,
    totalDiamonds: 0,
    lessonsStarted: 0,
    daysCompleted: 0,
    totalTimeSpent: 0,
    totalErrors: 0,
    totalAttempts: 0,
    avgAccuracy: 0,
    score: 0,
    rank: 1,
    alerts: [],
    pathLabel: 'W1 L1 E1',
    lastActivityLabel: '—',
    dashboardStatus: 'Active',
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

const report = buildClassPerformanceReport('Learnendo Kids', [
  sampleStudent('Joao', { totalStars: 28, totalDiamonds: 4, avgAccuracy: 86, daysCompleted: 42, totalAttempts: 51, totalErrors: 7, currentWorkbook: 2, currentLesson: 8, currentDay: 3, lastActivity: '2026-08-11T09:30:00Z' }),
  sampleStudent('Maria', { totalStars: 24, totalDiamonds: 3, avgAccuracy: 79, daysCompleted: 38, totalAttempts: 48, totalErrors: 10, currentWorkbook: 2, currentLesson: 6, currentDay: 5, lastActivity: '2026-08-10T16:15:00Z' }),
  sampleStudent('Pedro', { totalStars: 17, totalDiamonds: 2, avgAccuracy: 71, daysCompleted: 34, totalAttempts: 44, totalErrors: 13, currentWorkbook: 2, currentLesson: 3, currentDay: 2, lastActivity: '2026-07-30T11:00:00Z', alerts: [{ type: 'inactive', message: '12 days without activity' }] }),
], new Date('2026-08-11T12:00:00Z'));

const outputPath = resolve('output/pdf/class-performance-report-sample.pdf');
mkdirSync(dirname(outputPath), { recursive: true });
const buffer = Buffer.from(createClassReportPdf(report).output('arraybuffer'));
writeFileSync(outputPath, buffer);
console.log(outputPath);
