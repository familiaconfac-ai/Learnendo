export type MasteryPhase = 'initial' | 'review' | 'complete' | 'blocked';
export type AttemptPhase = 'initial' | 'review';

export interface MasteryAttempt {
  phase: AttemptPhase;
  correct: boolean;
}

export type MasteryItemStatus =
  | 'unseen'
  | 'correct-first-try'
  | 'incorrect'
  | 'corrected-with-feedback'
  | 'queued-for-review'
  | 'mastered'
  | 'skipped-technical';

export interface MasteryItemState {
  exerciseId: string;
  status: MasteryItemStatus;
  firstPassAttempts: number;
  reviewAttempts: number;
  firstPassHadError: boolean;
  incorrectDuringInitial: boolean;
  masteredDuringReview: boolean;
  attemptHistory: MasteryAttempt[];
  currentReviewHadError: boolean;
  incorrectAttempts: number;
  technicalFailures: number;
}

export interface MasterySessionState {
  exerciseIds: string[];
  items: Record<string, MasteryItemState>;
  phase: MasteryPhase;
  currentExerciseId: string | null;
  firstPassIndex: number;
  reviewQueue: string[];
  reviewedExerciseIds: string[];
  firstTryCorrect: number;
  firstPassErrors: number;
  reviewAttempts: number;
  masteredCount: number;
  technicalSkips: number;
  reviewPoints: number;
  completionBonus: number;
}

export const MASTERY_REVIEW_POINTS = 3;
export const MASTERY_COMPLETION_BONUS = 5;
export const MASTERY_LESSON_COMPLETION_BONUS = 10;
export const MAX_TECHNICAL_FAILURES = 3;

function createItem(exerciseId: string): MasteryItemState {
  return {
    exerciseId,
    status: 'unseen',
    firstPassAttempts: 0,
    reviewAttempts: 0,
    firstPassHadError: false,
    incorrectDuringInitial: false,
    masteredDuringReview: false,
    attemptHistory: [],
    currentReviewHadError: false,
    incorrectAttempts: 0,
    technicalFailures: 0,
  };
}

export function createMasterySession(exerciseIds: string[]): MasterySessionState {
  const uniqueIds = [...new Set(exerciseIds)];
  return {
    exerciseIds: uniqueIds,
    items: Object.fromEntries(uniqueIds.map((exerciseId) => [exerciseId, createItem(exerciseId)])),
    phase: uniqueIds.length ? 'initial' : 'complete',
    currentExerciseId: uniqueIds[0] ?? null,
    firstPassIndex: 0,
    reviewQueue: [],
    reviewedExerciseIds: [],
    firstTryCorrect: 0,
    firstPassErrors: 0,
    reviewAttempts: 0,
    masteredCount: 0,
    technicalSkips: 0,
    reviewPoints: 0,
    completionBonus: uniqueIds.length ? 0 : MASTERY_COMPLETION_BONUS,
  };
}

function finishInitial(state: MasterySessionState): MasterySessionState {
  if (state.reviewQueue.length) {
    return { ...state, phase: 'review', currentExerciseId: state.reviewQueue[0], completionBonus: 0 };
  }
  return { ...state, phase: 'complete', currentExerciseId: null, completionBonus: MASTERY_COMPLETION_BONUS };
}

export function recordMasteryAttempt(state: MasterySessionState, exerciseId: string, correct: boolean): MasterySessionState {
  if (state.currentExerciseId !== exerciseId || !['initial', 'review'].includes(state.phase)) return state;
  const item = state.items[exerciseId];
  if (!item) return state;

  if (state.phase === 'initial') {
    const attemptHistory = [...item.attemptHistory, { phase: 'initial' as const, correct }];
    if (!correct) {
      const firstError = !item.incorrectDuringInitial;
      const reviewQueue = state.reviewQueue.includes(exerciseId) ? state.reviewQueue : [...state.reviewQueue, exerciseId];
      return {
        ...state,
        reviewQueue,
        firstPassErrors: state.firstPassErrors + (firstError ? 1 : 0),
        items: {
          ...state.items,
          [exerciseId]: {
            ...item,
            status: 'incorrect',
            firstPassAttempts: item.firstPassAttempts + 1,
            firstPassHadError: true,
            incorrectDuringInitial: true,
            attemptHistory,
            incorrectAttempts: item.incorrectAttempts + 1,
          },
        },
      };
    }

    const clean = !item.incorrectDuringInitial;
    const nextIndex = state.firstPassIndex + 1;
    const next: MasterySessionState = {
      ...state,
      firstPassIndex: nextIndex,
      firstTryCorrect: state.firstTryCorrect + (clean ? 1 : 0),
      masteredCount: state.masteredCount + (clean ? 1 : 0),
      items: {
        ...state.items,
        [exerciseId]: {
          ...item,
          status: clean ? 'mastered' : 'queued-for-review',
          firstPassAttempts: item.firstPassAttempts + 1,
          attemptHistory,
          currentReviewHadError: false,
        },
      },
      currentExerciseId: state.exerciseIds[nextIndex] ?? null,
    };
    return next.currentExerciseId ? next : finishInitial(next);
  }

  const attemptHistory = [...item.attemptHistory, { phase: 'review' as const, correct }];
  const reviewAttempts = state.reviewAttempts + 1;
  if (!correct) {
    return {
      ...state,
      reviewAttempts,
      items: {
        ...state.items,
        [exerciseId]: {
          ...item,
          status: 'incorrect',
          reviewAttempts: item.reviewAttempts + 1,
          currentReviewHadError: true,
          attemptHistory,
          incorrectAttempts: item.incorrectAttempts + 1,
        },
      },
    };
  }

  const reviewQueue = state.reviewQueue.filter((queuedId) => queuedId !== exerciseId);
  const reviewedExerciseIds = state.reviewedExerciseIds.includes(exerciseId)
    ? state.reviewedExerciseIds
    : [...state.reviewedExerciseIds, exerciseId];
  const next: MasterySessionState = {
    ...state,
    reviewAttempts,
    reviewQueue,
    reviewedExerciseIds,
    masteredCount: state.masteredCount + (item.masteredDuringReview ? 0 : 1),
    reviewPoints: state.reviewPoints + (item.masteredDuringReview ? 0 : MASTERY_REVIEW_POINTS),
    items: {
      ...state.items,
      [exerciseId]: {
        ...item,
        status: 'mastered',
        reviewAttempts: item.reviewAttempts + 1,
        masteredDuringReview: true,
        currentReviewHadError: false,
        attemptHistory,
      },
    },
    currentExerciseId: reviewQueue[0] ?? null,
  };
  return next.currentExerciseId
    ? next
    : { ...next, phase: 'complete', completionBonus: MASTERY_COMPLETION_BONUS };
}

/** Restores current and pre-v4 caches without discarding an earned review obligation. */
export function restoreMasterySession(raw: MasterySessionState): MasterySessionState {
  const exerciseIds = [...new Set(raw.exerciseIds ?? [])];
  const legacyPhase = String(raw.phase) === 'first-pass' ? 'initial' : raw.phase;
  const items = Object.fromEntries(exerciseIds.map((exerciseId) => {
    const source = raw.items?.[exerciseId] as Partial<MasteryItemState> | undefined;
    const base = createItem(exerciseId);
    const incorrectDuringInitial = source?.incorrectDuringInitial ?? source?.firstPassHadError ?? false;
    const inferredHistory: MasteryAttempt[] = source?.attemptHistory ?? [
      ...Array.from({ length: source?.incorrectAttempts ?? 0 }, () => ({ phase: 'initial' as const, correct: false })),
    ];
    return [exerciseId, {
      ...base,
      ...source,
      exerciseId,
      incorrectDuringInitial,
      firstPassHadError: incorrectDuringInitial,
      masteredDuringReview: source?.masteredDuringReview ?? false,
      attemptHistory: inferredHistory,
      incorrectAttempts: source?.incorrectAttempts ?? inferredHistory.filter((attempt) => !attempt.correct).length,
    }];
  })) as Record<string, MasteryItemState>;

  const migratedLegacyPending = exerciseIds.filter((exerciseId) => {
    const item = items[exerciseId];
    return item.incorrectDuringInitial && !item.masteredDuringReview && item.reviewAttempts === 0;
  });
  const reviewQueue = [...new Set([...(raw.reviewQueue ?? []), ...migratedLegacyPending])]
    .filter((exerciseId) => exerciseIds.includes(exerciseId) && !items[exerciseId].masteredDuringReview);
  for (const exerciseId of reviewQueue) {
    if (items[exerciseId].status === 'mastered' || items[exerciseId].status === 'corrected-with-feedback') {
      items[exerciseId] = { ...items[exerciseId], status: 'queued-for-review' };
    }
  }

  let phase = legacyPhase as MasteryPhase;
  let currentExerciseId = raw.currentExerciseId ?? null;
  if ((phase === 'complete' || phase === 'review') && reviewQueue.length) {
    phase = 'review';
    currentExerciseId = currentExerciseId && reviewQueue.includes(currentExerciseId) ? currentExerciseId : reviewQueue[0];
  } else if (phase === 'review' && !reviewQueue.length) {
    phase = 'complete';
    currentExerciseId = null;
  }
  const masteredCount = exerciseIds.filter((exerciseId) => items[exerciseId].status === 'mastered' && !reviewQueue.includes(exerciseId)).length;
  return {
    ...raw,
    exerciseIds,
    items,
    phase,
    currentExerciseId,
    reviewQueue,
    reviewedExerciseIds: (raw.reviewedExerciseIds ?? []).filter((exerciseId) => items[exerciseId]?.masteredDuringReview),
    firstTryCorrect: raw.firstTryCorrect ?? 0,
    firstPassErrors: raw.firstPassErrors ?? migratedLegacyPending.length,
    reviewAttempts: raw.reviewAttempts ?? 0,
    masteredCount,
    technicalSkips: raw.technicalSkips ?? 0,
    reviewPoints: (raw.reviewedExerciseIds ?? []).filter((exerciseId) => items[exerciseId]?.masteredDuringReview).length * MASTERY_REVIEW_POINTS,
    completionBonus: phase === 'complete' ? MASTERY_COMPLETION_BONUS : 0,
  };
}

export function recordTechnicalFailure(state: MasterySessionState, exerciseId: string, failures = 1): MasterySessionState {
  const item = state.items[exerciseId];
  if (!item) return state;
  return { ...state, items: { ...state.items, [exerciseId]: {
    ...item,
    technicalFailures: item.technicalFailures + Math.max(1, failures),
  } } };
}

export function skipTechnicalExercise(state: MasterySessionState, exerciseId: string): MasterySessionState {
  const item = state.items[exerciseId];
  if (!item || item.technicalFailures < MAX_TECHNICAL_FAILURES) return state;
  const items = { ...state.items, [exerciseId]: { ...item, status: 'skipped-technical' as const } };
  if (state.phase === 'initial') {
    const nextIndex = state.firstPassIndex + 1;
    const nextId = state.exerciseIds[nextIndex] ?? null;
    return nextId ? { ...state, items, firstPassIndex: nextIndex, currentExerciseId: nextId, technicalSkips: state.technicalSkips + 1 }
      : { ...state, items, phase: 'blocked', currentExerciseId: null, technicalSkips: state.technicalSkips + 1 };
  }
  const reviewQueue = state.reviewQueue.filter((id) => id !== exerciseId);
  return { ...state, items, reviewQueue, currentExerciseId: reviewQueue[0] ?? null, phase: reviewQueue.length ? 'review' : 'blocked', technicalSkips: state.technicalSkips + 1 };
}

export function masteryMetrics(state: MasterySessionState) {
  const total = state.exerciseIds.length;
  const totalIncorrectAttempts = Object.values(state.items)
    .reduce((sum, item) => sum + (item.incorrectAttempts ?? 0), 0);
  return {
    uniqueExercises: total,
    firstTryCorrect: state.firstTryCorrect,
    firstPassErrors: state.firstPassErrors,
    exercisesReviewed: state.reviewedExerciseIds.length,
    reviewAttempts: state.reviewAttempts,
    mastered: state.masteredCount,
    initialAccuracy: total ? Math.round((state.firstTryCorrect / total) * 100) : 0,
    finalMastery: total ? Math.round((state.masteredCount / total) * 100) : 100,
    reviewPoints: state.reviewPoints,
    completionBonus: state.completionBonus,
    technicalSkips: state.technicalSkips,
    totalIncorrectAttempts,
  };
}
