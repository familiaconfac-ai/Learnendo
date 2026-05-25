import { LessonLanguageCode, ScalableLesson } from '../types';

export const BASE_LESSON_COUNT = 96;
export const LESSONS_PER_WORKBOOK = 12;

export const getWorkbookIslandPath = (workbookNumber: number) => `/islands/workbook${workbookNumber}.gif`;

export const getLessonIslandPath = (lessonNumber: number) => `/islands/lessons/lesson${lessonNumber}.png`;

export const getDayIslandPath = (dayNumber: number) => `/islands/days/day${dayNumber}.png`;

export const resolveLocalizedLessonTitle = (
  lesson: Pick<ScalableLesson, 'id' | 'languages'>,
  language: LessonLanguageCode,
  fallback: string,
): string => {
  const localized = lesson.languages[language]?.title?.trim();
  if (localized) return localized;

  const english = lesson.languages.en?.title?.trim();
  if (english) return english;

  return fallback;
};

export const createScalableLessonShell = (lessonNumber: number, workbookNumber: number): ScalableLesson => ({
  id: `lesson${lessonNumber}`,
  unit: lessonNumber,
  workbook: workbookNumber,
  image: getLessonIslandPath(lessonNumber),
  dayImages: Array.from({ length: 7 }, (_, index) => getDayIslandPath(index + 1)),
  vocabularyNew: [],
  languages: {
    en: { title: `Lesson ${lessonNumber}` },
    pt: { title: `Licao ${lessonNumber}` },
    es: { title: `Leccion ${lessonNumber}` },
    el: { title: `Lesson ${lessonNumber}` },
    he: { title: `Lesson ${lessonNumber}` },
  },
  practice: {},
});

export const createBaseLessonShells = (): ScalableLesson[] =>
  Array.from({ length: BASE_LESSON_COUNT }, (_, index) => {
    const lessonNumber = index + 1;
    const workbookNumber = Math.ceil(lessonNumber / LESSONS_PER_WORKBOOK);
    return createScalableLessonShell(lessonNumber, workbookNumber);
  });
