export function getUnitNumberFromLessonNumber(lessonNumber: number): number {
  if (lessonNumber >= 1 && lessonNumber <= 6) return 1;
  if (lessonNumber >= 7 && lessonNumber <= 12) return 2;
  if (lessonNumber >= 13 && lessonNumber <= 18) return 3;
  if (lessonNumber >= 19 && lessonNumber <= 24) return 4;
  return 1;
}

export function isUnitCompletionLesson(lessonNumber: number): boolean {
  return lessonNumber === 6 || lessonNumber === 12 || lessonNumber === 18 || lessonNumber === 24;
}
