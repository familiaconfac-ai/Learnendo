// apps/main/src/services/progressDefaults.ts

export type LessonProgress = {
  islandScores?: number[];
  completedIslands?: number[];
  stars?: number;
};

export type UserProgress = {
  currentLesson: number;
  lessonData: Record<string, LessonProgress>;
  streakCount: number;
  totalStars: number;
};

export const DEFAULT_PROGRESS: UserProgress = {
  currentLesson: 1,
  lessonData: {},
  streakCount: 0,
  totalStars: 0,
};

/**
 * Normaliza qualquer coisa (undefined, {}, parcial) para um UserProgress seguro.
 * Regra: NUNCA retorna undefined.
 */
export function normalizeProgress(raw: any): UserProgress {
  const p = raw ?? {};

  const currentLesson =
    typeof p.currentLesson === "number" && Number.isFinite(p.currentLesson) && p.currentLesson >= 1
      ? p.currentLesson
      : DEFAULT_PROGRESS.currentLesson;

  const lessonData =
    p.lessonData && typeof p.lessonData === "object" && !Array.isArray(p.lessonData)
      ? p.lessonData
      : DEFAULT_PROGRESS.lessonData;

  const streakCount =
    typeof p.streakCount === "number" && Number.isFinite(p.streakCount) && p.streakCount >= 0
      ? p.streakCount
      : DEFAULT_PROGRESS.streakCount;

  const totalStars =
    typeof p.totalStars === "number" && Number.isFinite(p.totalStars) && p.totalStars >= 0
      ? p.totalStars
      : DEFAULT_PROGRESS.totalStars;

  return { currentLesson, lessonData, streakCount, totalStars };
}