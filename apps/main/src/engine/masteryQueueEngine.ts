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
  currentReviewHadError: boolean;
  technicalFailures: number;
}

export interface MasterySessionState {
  exerciseIds: string[];
  items: Record<string, MasteryItemState>;
  phase: 'first-pass' | 'review' | 'complete' | 'blocked';
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

export function createMasterySession(exerciseIds: string[]): MasterySessionState {
  const uniqueIds = [...new Set(exerciseIds)];
  return {
    exerciseIds: uniqueIds,
    items: Object.fromEntries(uniqueIds.map((exerciseId) => [exerciseId, {
      exerciseId, status: 'unseen', firstPassAttempts: 0, reviewAttempts: 0,
      firstPassHadError: false, currentReviewHadError: false, technicalFailures: 0,
    }])),
    phase: uniqueIds.length ? 'first-pass' : 'complete',
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

function finishFirstPass(state: MasterySessionState): MasterySessionState {
  if (state.reviewQueue.length) return { ...state, phase: 'review', currentExerciseId: state.reviewQueue[0] };
  return { ...state, phase: 'complete', currentExerciseId: null, completionBonus: MASTERY_COMPLETION_BONUS };
}

export function recordMasteryAttempt(state: MasterySessionState, exerciseId: string, correct: boolean): MasterySessionState {
  if (state.currentExerciseId !== exerciseId || !['first-pass', 'review'].includes(state.phase)) return state;
  const item = state.items[exerciseId];
  if (!item) return state;

  if (state.phase === 'first-pass') {
    if (!correct) {
      const firstError = !item.firstPassHadError;
      const reviewQueue = state.reviewQueue.includes(exerciseId) ? state.reviewQueue : [...state.reviewQueue, exerciseId];
      return { ...state, reviewQueue, firstPassErrors: state.firstPassErrors + (firstError ? 1 : 0),
        items: { ...state.items, [exerciseId]: { ...item, status: 'incorrect', firstPassAttempts: item.firstPassAttempts + 1, firstPassHadError: true } } };
    }
    const clean = !item.firstPassHadError;
    const nextIndex = state.firstPassIndex + 1;
    const next: MasterySessionState = { ...state, firstPassIndex: nextIndex,
      firstTryCorrect: state.firstTryCorrect + (clean ? 1 : 0), masteredCount: state.masteredCount + (clean ? 1 : 0),
      items: { ...state.items, [exerciseId]: { ...item, status: clean ? 'mastered' : 'queued-for-review',
        firstPassAttempts: item.firstPassAttempts + 1 } },
      currentExerciseId: state.exerciseIds[nextIndex] ?? null };
    return next.currentExerciseId ? next : finishFirstPass(next);
  }

  const reviewAttempts = state.reviewAttempts + 1;
  if (!correct) {
    return { ...state, reviewAttempts, items: { ...state.items, [exerciseId]: { ...item, status: 'incorrect',
      reviewAttempts: item.reviewAttempts + 1, currentReviewHadError: true } } };
  }
  const queueWithoutCurrent = state.reviewQueue.slice(1);
  const clean = !item.currentReviewHadError;
  const reviewQueue = clean ? queueWithoutCurrent : [...queueWithoutCurrent, exerciseId];
  const reviewedExerciseIds = state.reviewedExerciseIds.includes(exerciseId)
    ? state.reviewedExerciseIds : [...state.reviewedExerciseIds, exerciseId];
  const next: MasterySessionState = { ...state, reviewAttempts, reviewQueue, reviewedExerciseIds,
    masteredCount: state.masteredCount + (clean ? 1 : 0), reviewPoints: state.reviewPoints + (clean ? MASTERY_REVIEW_POINTS : 0),
    items: { ...state.items, [exerciseId]: { ...item, status: clean ? 'mastered' : 'queued-for-review',
      reviewAttempts: item.reviewAttempts + 1, currentReviewHadError: false } },
    currentExerciseId: reviewQueue[0] ?? null };
  return next.currentExerciseId ? next : { ...next, phase: 'complete', completionBonus: MASTERY_COMPLETION_BONUS };
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
  if (state.phase === 'first-pass') {
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
  };
}
