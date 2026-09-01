export interface LiveAttendanceExercise {
  exerciseId: string;
  lessonId?: string | null;
  workbookId?: number | null;
  attempts: number;
  firstVerdict?: 'correct' | 'wrong' | 'correct_second_try';
  finalVerdict?: 'correct' | 'wrong' | 'correct_second_try';
  answeredAt?: string;
}

export interface LiveAttendanceRecord {
  id: string;
  studentUid: string;
  classId: string;
  classTitle: string;
  groupName?: string;
  courseId?: string;
  date: string;
  joinedAt: string;
  leftAt?: string | null;
  activeSegmentStartedAt?: string | null;
  durationSeconds: number;
  workbookId?: number | null;
  lessonId?: string | null;
  grammarFocusTitles: string[];
  exercises: Record<string, LiveAttendanceExercise>;
}

export interface LiveAttendanceMetrics {
  exercises: number;
  firstPassCorrect: number;
  incorrect: number;
  corrected: number;
  finalCorrect: number;
}

export function getSaoPauloAttendanceDay(value: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function getLiveAttendanceMetrics(record: LiveAttendanceRecord): LiveAttendanceMetrics {
  const exercises = Object.values(record.exercises ?? {});
  return {
    exercises: exercises.length,
    firstPassCorrect: exercises.filter((exercise) => exercise.firstVerdict === 'correct').length,
    incorrect: exercises.filter((exercise) => exercise.firstVerdict === 'wrong').length,
    corrected: exercises.filter((exercise) => exercise.firstVerdict === 'wrong'
      && (exercise.finalVerdict === 'correct' || exercise.finalVerdict === 'correct_second_try')).length,
    finalCorrect: exercises.filter((exercise) => exercise.finalVerdict === 'correct'
      || exercise.finalVerdict === 'correct_second_try').length,
  };
}

export function getLiveAttendanceDuration(record: LiveAttendanceRecord, now = new Date()): number {
  const stored = Math.max(0, Number(record.durationSeconds) || 0);
  if (!record.activeSegmentStartedAt || record.leftAt) return stored;
  const startedAt = Date.parse(record.activeSegmentStartedAt);
  return Number.isFinite(startedAt)
    ? stored + Math.max(0, Math.floor((now.getTime() - startedAt) / 1000))
    : stored;
}

export function normalizeLiveAttendanceRecords(
  value: unknown,
  studentUid: string,
): LiveAttendanceRecord[] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>)
    .map<LiveAttendanceRecord | null>(([id, raw]) => {
      if (!raw || typeof raw !== 'object') return null;
      const record = raw as Partial<LiveAttendanceRecord>;
      if (!record.joinedAt || !record.classId || !record.date) return null;
      return {
        id,
        studentUid: record.studentUid || studentUid,
        classId: record.classId,
        classTitle: record.classTitle || 'Online Class',
        groupName: record.groupName,
        courseId: record.courseId,
        date: record.date,
        joinedAt: record.joinedAt,
        leftAt: record.leftAt ?? null,
        activeSegmentStartedAt: record.activeSegmentStartedAt ?? null,
        durationSeconds: Math.max(0, Number(record.durationSeconds) || 0),
        workbookId: record.workbookId ?? null,
        lessonId: record.lessonId ?? null,
        grammarFocusTitles: Array.isArray(record.grammarFocusTitles)
          ? record.grammarFocusTitles.filter((title): title is string => typeof title === 'string' && Boolean(title.trim()))
          : [],
        exercises: record.exercises && typeof record.exercises === 'object' ? record.exercises : {},
      };
    })
    .filter((record): record is LiveAttendanceRecord => record !== null)
    .sort((left, right) => Date.parse(right.joinedAt) - Date.parse(left.joinedAt));
}
