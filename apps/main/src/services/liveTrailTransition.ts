import type { Day, LiveTrailCompletion } from '../types';

export function buildLiveTrailCompletion(params: {
  lessonId: string;
  currentTrailId: string;
  currentTrailLabel: string;
  lessonDays: Day[];
}): LiveTrailCompletion {
  const currentIndex = params.lessonDays.findIndex((day) => day.id === params.currentTrailId);
  const nextTrailId = currentIndex >= 0
    ? params.lessonDays[currentIndex + 1]?.id ?? null
    : null;

  return {
    id: `${params.lessonId}:${params.currentTrailId}`,
    status: 'awaiting-decision',
    lessonId: params.lessonId,
    completedTrailId: params.currentTrailId,
    completedTrailLabel: params.currentTrailLabel,
    nextTrailId,
    isLessonComplete: nextTrailId === null,
  };
}

export function isSameLiveTrailCompletion(
  current: LiveTrailCompletion | null | undefined,
  expectedId: string,
): current is LiveTrailCompletion {
  return Boolean(current && current.id === expectedId);
}
