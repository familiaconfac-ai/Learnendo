/** Canonical workbook totals for each registered Learnendo course. */
export const COURSE_WORKBOOK_TOTALS: Record<string, number> = {
  english: 9,
  spanish: 8,
  portuguese_native: 1,
  portuguese_foreigners: 8,
  greek_koine: 1,
  hebrew_biblical: 1,
  bible_language_track: 1,
};

export function getCourseWorkbookTotal(courseId = 'english'): number {
  return COURSE_WORKBOOK_TOTALS[courseId] ?? COURSE_WORKBOOK_TOTALS.english;
}
