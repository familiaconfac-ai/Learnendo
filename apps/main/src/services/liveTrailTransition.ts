import type { Day, LiveTrailCompletion } from '../types';

export type LiveTrailRecoveryAction =
  | 'resume-starting-battle'
  | 'resume-advancing'
  | 'restore-completed-trail'
  | 'restore-active-trail'
  | 'none';

export function buildLiveTrailRecoveryPlan(params: {
  mode: 'trail' | 'workspace';
  firstBlockId?: string | null;
  courseId?: string | null;
  workbookId?: number | null;
  lessonId?: string | null;
  trailId?: string | null;
  trailLabel?: string | null;
}) {
  const restoringTrail = params.mode === 'trail';
  if (restoringTrail && !params.firstBlockId) {
    throw new Error('Trail recovery requires a valid first exercise block.');
  }
  return {
    state: {
      mainStageMode: restoringTrail ? 'trail' as const : 'workspace' as const,
      sessionStatus: restoringTrail ? 'active' as const : 'idle' as const,
      activeCourseId: restoringTrail ? params.courseId ?? null : null,
      activeWorkbookId: restoringTrail ? params.workbookId ?? null : null,
      activeLessonId: restoringTrail ? params.lessonId ?? null : null,
      activeExerciseId: restoringTrail ? params.trailId ?? null : null,
      activeTrailIds: restoringTrail && params.trailId ? [params.trailId] : [],
      activeTrailLabel: restoringTrail ? params.trailLabel ?? null : null,
      trailCompletion: null,
    },
    exercise: {
      isActive: restoringTrail,
      currentBlockId: restoringTrail ? params.firstBlockId ?? null : null,
    },
    clearLegacyTransitionFields: true,
    deleteBattleSession: true,
  };
}

export function getLiveTrailRecoveryAction(params: {
  mainStageMode?: string | null;
  currentBlockId?: string | null;
  completion?: LiveTrailCompletion | null;
  activeTrailIds?: string[];
}): LiveTrailRecoveryAction {
  if (params.mainStageMode !== 'trail' || params.currentBlockId !== '__complete__') return 'none';
  if (!params.completion) {
    return params.activeTrailIds?.length ? 'restore-active-trail' : 'none';
  }
  if (params.completion.status === 'starting-battle') return 'resume-starting-battle';
  if (params.completion.status === 'advancing') return 'resume-advancing';
  if (params.completion.status === 'battle') return 'restore-completed-trail';
  return 'none';
}

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
