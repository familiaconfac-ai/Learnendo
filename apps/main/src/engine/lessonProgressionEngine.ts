export type LessonAccessStatus = 'completed' | 'in-progress' | 'locked';

export function getPedagogicalLessonStatus(
  lessonNumber: number,
  completedLessons: ReadonlySet<number>,
  isAdmin = false,
): LessonAccessStatus {
  if (completedLessons.has(lessonNumber)) return 'completed';
  if (isAdmin || lessonNumber <= 1 || completedLessons.has(lessonNumber - 1)) return 'in-progress';
  return 'locked';
}

export function appendUniqueCompletionActivities(
  current: string[],
  dayId: string,
  lessonCompletionMarker?: string | null,
): string[] {
  return [...new Set([...current, dayId, ...(lessonCompletionMarker ? [lessonCompletionMarker] : [])])];
}

export function completionDestination(input: {
  isLastDay: boolean;
  isLastLesson: boolean;
  hasNextWorkbook: boolean;
}): 'next-day' | 'next-lesson' | 'next-workbook' | 'workbook-list' {
  if (!input.isLastDay) return 'next-day';
  if (!input.isLastLesson) return 'next-lesson';
  return input.hasNextWorkbook ? 'next-workbook' : 'workbook-list';
}
