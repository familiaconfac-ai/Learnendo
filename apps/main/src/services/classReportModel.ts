import type { TeacherStudentRow } from '../engine/teacherService';
import { isStudentAccountRole } from './studentRolePolicy';
import { computeScore } from '../engine/rankingService';
import { resolveCurriculumProgressPercent } from '../engine/curriculumProgress';
import { getDaysWithoutActivity } from '../engine/dashboardMetrics';

export interface ClassReportStudent {
  name: string;
  position: number;
  score: number;
  progressPercent: number;
  learningPosition: string;
  completedActivities: number;
  attempts: number;
  correctAnswers: number;
  errors: number;
  accuracy: number;
  lastActivity: string;
  daysWithoutActivity: number | null;
  needsAttention: string[];
}

export interface ClassPerformanceReport {
  className: string;
  teacherName?: string;
  generatedAt: Date;
  rankingCriterion: string;
  summary: {
    students: number;
    activeRecently: number;
    withoutRecentActivity: number;
    averageProgress: number;
    averageAccuracy: number;
    averageScore: number;
    completedActivities: number;
    attempts: number;
    correctAnswers: number;
    errors: number;
  };
  students: ClassReportStudent[];
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const resolved = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(resolved.getTime()) ? null : resolved;
  }
  const resolved = new Date(value as string | number | Date);
  return Number.isNaN(resolved.getTime()) ? null : resolved;
}

export function getCurriculumProgressPercent(
  student: Pick<TeacherStudentRow, 'currentWorkbook' | 'currentLesson' | 'currentDay' | 'daysCompleted'>,
): number {
  return resolveCurriculumProgressPercent(student);
}

function formatActivity(date: Date | null, generatedAt: Date) {
  if (!date) return { label: 'No activity recorded', days: null };
  const days = getDaysWithoutActivity(date, generatedAt) ?? 0;
  if (days === 0) return { label: 'Today', days };
  if (days === 1) return { label: 'Yesterday', days };
  return { label: `${days} days ago`, days };
}

export function buildClassPerformanceReport(
  className: string,
  rows: TeacherStudentRow[],
  generatedAt = new Date(),
  teacherName?: string,
): ClassPerformanceReport {
  const ordered = rows
    // Legacy student profiles may not have a role. Exclude only accounts that
    // are positively identified as teacher/admin; class composition owns the
    // membership decision before the report reaches this point.
    .filter((student) => isStudentAccountRole(student.role))
    .map((student) => ({ student, score: computeScore(student) }))
    .sort((left, right) => right.score - left.score ||
      (left.student.displayName || '').localeCompare(right.student.displayName || ''));

  let previousScore: number | null = null;
  let previousPosition = 0;
  const students = ordered.map(({ student, score }, index): ClassReportStudent => {
    const tied = previousScore !== null && Math.abs(score - previousScore) < 0.000001;
    const position = tied ? previousPosition : index + 1;
    previousScore = score;
    previousPosition = position;
    const activity = formatActivity(toDate(student.lastActivity), generatedAt);
    const attempts = Math.max(0, student.totalAttempts || 0);
    const errors = Math.min(attempts, Math.max(0, student.totalErrors || 0));

    return {
      name: student.displayName?.trim() || 'Student',
      position,
      score,
      progressPercent: getCurriculumProgressPercent(student),
      learningPosition: `Book ${student.currentWorkbook ?? 1} - Lesson ${student.currentLesson ?? 1} - Activity ${student.currentDay ?? 1}`,
      completedActivities: Math.max(0, student.daysCompleted || 0),
      attempts,
      correctAnswers: Math.max(0, attempts - errors),
      errors,
      accuracy: attempts > 0 ? Math.max(0, Math.min(100, student.avgAccuracy || 0)) : 0,
      lastActivity: activity.label,
      daysWithoutActivity: activity.days,
      needsAttention: student.alerts.map((alert) => alert.message),
    };
  });

  const sum = (pick: (student: ClassReportStudent) => number) => students.reduce((total, student) => total + pick(student), 0);
  const count = students.length;
  const activeRecently = students.filter((student) => student.daysWithoutActivity !== null && student.daysWithoutActivity < 2).length;
  const studentsWithAttempts = students.filter((student) => student.attempts > 0);

  return {
    className,
    teacherName: teacherName?.trim() || undefined,
    generatedAt,
    rankingCriterion: 'Official Learnendo score: stars x2 + diamonds x3 + accuracy /10 + unique completed activities x0.2.',
    summary: {
      students: count,
      activeRecently,
      withoutRecentActivity: count - activeRecently,
      averageProgress: count ? Math.round(sum((student) => student.progressPercent) / count) : 0,
      averageAccuracy: studentsWithAttempts.length
        ? Math.round(studentsWithAttempts.reduce((total, student) => total + student.accuracy, 0) / studentsWithAttempts.length)
        : 0,
      averageScore: count ? sum((student) => student.score) / count : 0,
      completedActivities: sum((student) => student.completedActivities),
      attempts: sum((student) => student.attempts),
      correctAnswers: sum((student) => student.correctAnswers),
      errors: sum((student) => student.errors),
    },
    students,
  };
}
