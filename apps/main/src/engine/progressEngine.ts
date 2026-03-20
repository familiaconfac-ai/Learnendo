import { UserProgress } from '../types';

const STORAGE_PREFIX = 'learnendo_progress_v1';

const getStorageKey = (userId: string) => `${STORAGE_PREFIX}:${userId}`;

const normalizeProgress = (userId: string, raw: Partial<UserProgress> | null): UserProgress | null => {
  if (!raw) return null;

  const completedActivities = Array.isArray(raw.completedActivities) ? raw.completedActivities : [];
  const completedLessonNumbers = completedActivities
    .filter((activityId) => activityId.startsWith('lesson_test_passed_'))
    .map((activityId) => Number(activityId.replace('lesson_test_passed_', '')))
    .filter((value) => Number.isFinite(value));
  const maxCompletedLesson = completedLessonNumbers.length ? Math.max(...completedLessonNumbers) : 0;
  const nextLesson = maxCompletedLesson > 0 ? maxCompletedLesson + 1 : 1;

  return {
    userId,
    currentWorkbook: Number(raw.currentWorkbook || 1),
    currentLesson: Math.max(Number(raw.currentLesson || 1), nextLesson),
    currentDay: Number(raw.currentDay || 1),
    completedActivities,
    lastCompletedDate: raw.lastCompletedDate || new Date(0).toISOString(),
    placementScore: raw.placementScore,
    currentCourseId: raw.currentCourseId,
  };
};

export class ProgressEngine {
  static loadProgress(userId: string): UserProgress | null {
    if (typeof window === 'undefined') return null;

    try {
      const saved = window.localStorage.getItem(getStorageKey(userId));
      if (!saved) return null;
      const loaded = normalizeProgress(userId, JSON.parse(saved));
      console.log('Firestore returned: localStorage progress for', userId, loaded);
      return loaded;
    } catch (error) {
      console.warn('[ProgressEngine] Failed to load progress:', error);
      return null;
    }
  }

  static saveProgress(progress: UserProgress): void {
    if (typeof window === 'undefined' || !progress.userId) return;

    try {
      console.log('Saving progress:', progress);
      window.localStorage.setItem(getStorageKey(progress.userId), JSON.stringify(progress));
    } catch (error) {
      console.warn('[ProgressEngine] Failed to save progress:', error);
    }
  }

  static updateProgress(progress: UserProgress, updates: Partial<UserProgress>): UserProgress {
    const mergedProgress = { ...progress, ...updates };
    return normalizeProgress(mergedProgress.userId, mergedProgress) || mergedProgress;
  }
}
