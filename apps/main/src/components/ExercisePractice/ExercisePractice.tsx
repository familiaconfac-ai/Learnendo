import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Day, UserProgress, LessonLanguageCode, Workbook } from '../../types';
import { getUnitNumberFromLessonNumber } from '../../utils/workbookUnits';
import {
  completeExercise,
  emptyExerciseProgress,
  exerciseCompletionKey,
  loadExerciseProgress,
  lessonCompletionSummary,
  mergeLegacyCompletedDays,
  migrateMovedExerciseProgress,
  practiceRunSummary,
  resolvePracticeStart,
  saveExerciseProgress,
  workbookCompletionSummary,
  type ExerciseProgressState,
} from '../../engine/exerciseCompletionEngine';
import { PracticeSection } from '../UI';
import {
  createMasterySession,
  masteryMetrics,
  MAX_TECHNICAL_FAILURES,
  MASTERY_LESSON_COMPLETION_BONUS,
  recordMasteryAttempt,
  recordTechnicalFailure,
  skipTechnicalExercise,
  type MasterySessionState,
} from '../../engine/masteryQueueEngine';
import { buildFinalTestReport } from '../../engine/finalTestReportEngine';

interface ExercisePracticeProps {
  day: Day;
  lessonId: string;
  currentLanguage?: LessonLanguageCode;
  progress: UserProgress;
  onComplete: (
    dayId: string,
    score: number,
    analytics?: {
      attempts: number;
      errors: number;
      accuracy: number;
      points: number;
      initialAccuracy?: number;
      reviewedExercises?: number;
      reviewAttempts?: number;
      finalMastery?: number;
      isLessonFinalReview?: boolean;
    },
  ) => void | Promise<void>;
  onBack: () => void;
  totalDays?: number;
  onGrammar?: () => void;
  userId?: string;
  workbookId?: number;
  workbook?: Workbook;
  initialExerciseIndex?: number;
  onContinueToNextDay?: () => void;
  isDayCompleted?: boolean;
  isLastDayOfLesson?: boolean;
  isLastLessonOfWorkbook?: boolean;
  hasNextWorkbook?: boolean;
  onContinueToNextLesson?: () => void;
  onContinueToNextWorkbook?: () => void;
  onRepeatLesson?: () => void;
}

export const ExercisePractice: React.FC<ExercisePracticeProps> = ({
  day,
  lessonId,
  currentLanguage = 'en',
  progress,
  onComplete,
  onBack,
  totalDays,
  onGrammar,
  userId = 'anonymous',
  workbookId = 1,
  workbook,
  initialExerciseIndex,
  onContinueToNextDay,
  isDayCompleted = false,
  isLastDayOfLesson = false,
  isLastLessonOfWorkbook = false,
  hasNextWorkbook = false,
  onContinueToNextLesson,
  onContinueToNextWorkbook,
  onRepeatLesson,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<'exercise' | 'summary'>('exercise');
  const [storageWarning, setStorageWarning] = useState(false);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgressState>(emptyExerciseProgress);
  const exerciseProgressRef = useRef<ExerciseProgressState>(emptyExerciseProgress());
  const [runId, setRunId] = useState('');
  const [runEndExclusive, setRunEndExclusive] = useState(day.exercises.length);
  const [isReplay, setIsReplay] = useState(false);
  const [technicalHelpOpen, setTechnicalHelpOpen] = useState(false);
  const [mastery, setMastery] = useState<MasterySessionState>(() => createMasterySession([]));
  const masteryRef = useRef(mastery);
  const isCompletedRef = useRef(false);
  const completionPromiseRef = useRef<Promise<void> | null>(null);
  const exercises = day.exercises;

  const createRunId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const activeRunStorageKey = `learnendo_active_practice_run_v1:${userId}:w${workbookId}:${lessonId}:${day.id}`;
  const masteryStorageKey = (targetRunId: string) => `${activeRunStorageKey}:${targetRunId}:mastery`;
  const clearActiveRunStorage = (targetRunId: string) => {
    try { window.localStorage.removeItem(activeRunStorageKey); } catch { /* non-blocking */ }
    try { window.localStorage.removeItem(masteryStorageKey(targetRunId)); } catch { /* non-blocking */ }
    try { window.sessionStorage.removeItem(activeRunStorageKey); } catch { /* legacy cleanup */ }
    try { window.sessionStorage.removeItem(masteryStorageKey(targetRunId)); } catch { /* legacy cleanup */ }
  };
  const storeMastery = (next: MasterySessionState, targetRunId = runId) => {
    if (!targetRunId) return;
    try { window.localStorage.setItem(masteryStorageKey(targetRunId), JSON.stringify(next)); } catch { /* non-blocking */ }
  };

  useEffect(() => {
    const storage = typeof window === 'undefined' ? null : window.localStorage;
    const completedDayIds = new Set([
      ...(progress.completedActivities ?? []),
      ...Object.entries(progress.days ?? {}).filter(([, completed]) => completed).map(([id]) => id),
    ]);
    if (isDayCompleted) completedDayIds.add(day.id);
    const loaded = loadExerciseProgress(storage, userId);
    const legacyMerged = workbook ? mergeLegacyCompletedDays(loaded, workbook, completedDayIds) : loaded;
    const restored = workbook ? migrateMovedExerciseProgress(legacyMerged, workbook) : legacyMerged;
    if (restored !== loaded) saveExerciseProgress(storage, userId, restored);
    const firstIncomplete = day.exercises.findIndex((exercise) =>
      !restored.records[exerciseCompletionKey(workbookId, lessonId, day.id, exercise.id)]
    );
    const start = resolvePracticeStart(day.exercises.length, firstIncomplete, initialExerciseIndex);
    const historicallyComplete = start.isReplay;
    let nextRunId = '';
    try {
      nextRunId = window.localStorage.getItem(activeRunStorageKey)
        ?? window.sessionStorage.getItem(activeRunStorageKey)
        ?? '';
      if (nextRunId) {
        window.localStorage.setItem(activeRunStorageKey, nextRunId);
        window.sessionStorage.removeItem(activeRunStorageKey);
      }
    } catch { /* non-blocking */ }
    if (!nextRunId) {
      nextRunId = createRunId();
      try { window.localStorage.setItem(activeRunStorageKey, nextRunId); } catch { /* non-blocking */ }
    }
    const firstUnfinishedInActiveRun = day.exercises.findIndex((exercise) =>
      !restored.runs[`${nextRunId}::${exerciseCompletionKey(workbookId, lessonId, day.id, exercise.id)}`]
    );
    const hasActiveRunProgress = day.exercises.some((exercise) =>
      Boolean(restored.runs[`${nextRunId}::${exerciseCompletionKey(workbookId, lessonId, day.id, exercise.id)}`])
    );
    setExerciseProgress(restored);
    exerciseProgressRef.current = restored;
    setRunId(nextRunId);
    setIsReplay(historicallyComplete || completedDayIds.has(day.id));
    setCurrentIdx(hasActiveRunProgress
      ? (firstUnfinishedInActiveRun === -1 ? Math.max(0, day.exercises.length - 1) : firstUnfinishedInActiveRun)
      : start.index);
    setRunEndExclusive(initialExerciseIndex == null ? day.exercises.length : start.index + 1);
    setPhase(hasActiveRunProgress && firstUnfinishedInActiveRun === -1 ? 'summary' : 'exercise');
    const masteryStartIndex = hasActiveRunProgress && firstUnfinishedInActiveRun >= 0 ? firstUnfinishedInActiveRun : start.index;
    const targetExerciseIds = day.exercises
      .slice(masteryStartIndex, initialExerciseIndex == null ? day.exercises.length : masteryStartIndex + 1)
      .map((exercise) => exercise.id);
    let nextMastery = createMasterySession(targetExerciseIds);
    try {
      const cachedRaw = window.localStorage.getItem(masteryStorageKey(nextRunId))
        ?? window.sessionStorage.getItem(masteryStorageKey(nextRunId));
      const cached = JSON.parse(cachedRaw ?? 'null') as MasterySessionState | null;
      const currentDayIds = new Set(day.exercises.map((exercise) => exercise.id));
      if (cached && cached.exerciseIds?.length && cached.exerciseIds.every((id) => currentDayIds.has(id)) && cached.items) {
        nextMastery = cached;
        window.localStorage.setItem(masteryStorageKey(nextRunId), JSON.stringify(cached));
        window.sessionStorage.removeItem(masteryStorageKey(nextRunId));
      }
    } catch { /* a corrupt session cache safely starts a new mastery run */ }
    masteryRef.current = nextMastery;
    setMastery(nextMastery);
    if (nextMastery.currentExerciseId) {
      const restoredMasteryIndex = day.exercises.findIndex((exercise) => exercise.id === nextMastery.currentExerciseId);
      if (restoredMasteryIndex >= 0) setCurrentIdx(restoredMasteryIndex);
      setPhase('exercise');
    } else if (nextMastery.phase === 'complete' || nextMastery.phase === 'blocked') {
      setPhase('summary');
    }
    setStorageWarning(false);
    setTechnicalHelpOpen(false);
    isCompletedRef.current = false;
    completionPromiseRef.current = null;
  }, [day.id, day.exercises, lessonId, userId, workbookId, initialExerciseIndex, workbook, isDayCompleted]);

  const dayNumber = (() => {
    const match = day.id.match(/d(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  })();
  const lessonNumber = (() => {
    const match = lessonId.match(/_l(\d+)/i) ?? lessonId.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  })();
  const unitNumber = getUnitNumberFromLessonNumber(lessonNumber);
  const runSummary = useMemo(() => practiceRunSummary(exerciseProgress, runId), [exerciseProgress, runId]);
  const masterySummary = useMemo(() => masteryMetrics(mastery), [mastery]);
  const lessonCompletionBonus = isLastDayOfLesson && mastery.phase === 'complete'
    ? MASTERY_LESSON_COMPLETION_BONUS
    : 0;
  const totalEarned = runSummary.points + masterySummary.reviewPoints
    + masterySummary.completionBonus + lessonCompletionBonus;
  const lessonSummary = useMemo(
    () => workbook ? lessonCompletionSummary(workbook, lessonId, exerciseProgress) : null,
    [exerciseProgress, lessonId, workbook],
  );
  const workbookSummary = useMemo(
    () => workbook ? workbookCompletionSummary(workbook, exerciseProgress) : null,
    [exerciseProgress, workbook],
  );
  const finalTestReport = useMemo(
    () => buildFinalTestReport(exercises, mastery.items),
    [exercises, mastery.items],
  );
  const vocabularyPracticed = useMemo(
    () => new Set(exercises.filter((exercise) => exercise.isNewVocab).map((exercise) => exercise.correctValue.trim().toLowerCase())).size,
    [exercises],
  );
  const coverageObjectives = useMemo(
    () => [...new Set(exercises.map((exercise) => exercise.coverageObjective).filter((value): value is string => Boolean(value)))],
    [exercises],
  );

  const persistDayCompletion = () => {
    if (isReplay) return Promise.resolve();
    if (completionPromiseRef.current) return completionPromiseRef.current;
    isCompletedRef.current = true;
    const request = Promise.resolve(onComplete(day.id, masterySummary.finalMastery, {
      attempts: runSummary.attempts,
      errors: runSummary.errors,
      accuracy: masterySummary.initialAccuracy,
      points: totalEarned,
      initialAccuracy: masterySummary.initialAccuracy,
      reviewedExercises: masterySummary.exercisesReviewed,
      reviewAttempts: masterySummary.reviewAttempts,
      finalMastery: masterySummary.finalMastery,
      isLessonFinalReview: isLastDayOfLesson,
    })).catch((error) => {
      console.error('[ExercisePractice] onComplete failed:', error);
      isCompletedRef.current = false;
      completionPromiseRef.current = null;
      throw error;
    });
    completionPromiseRef.current = request;
    return request;
  };

  useEffect(() => {
    if (phase === 'summary' && mastery.phase === 'complete' && !isReplay) {
      void persistDayCompletion().catch(() => { /* the summary keeps a retry path */ });
    }
  }, [phase, mastery.phase, isReplay]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!exercises.length) {
    return (
      <div className="p-4 text-center text-white">
        <p>No exercises available for this day.</p>
        <button onClick={onBack} className="mt-4 text-blue-400">← Back</button>
      </div>
    );
  }

  if (currentIdx < 0 || currentIdx >= exercises.length) {
    return (
      <div className="fixed inset-x-0 top-[68px] bottom-[56px] z-30 flex items-center justify-center bg-slate-900 px-6 text-center">
        <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-800 px-6 py-8 shadow-2xl">
          <div className="text-4xl">⚠️</div>
          <p className="mt-4 text-lg font-black text-white">Exercise unavailable</p>
          <p className="mt-2 text-sm text-slate-300">Your progress is safe. Return to the lesson and resume.</p>
          <button onClick={onBack} className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white">Back to lesson</button>
        </div>
      </div>
    );
  }

  const currentExercise = exercises[currentIdx];
  const practiceItem = { ...currentExercise, moduleType: `${lessonId}_${day.id}`, lessonId: lessonNumber };

  const finishTransition = () => {
    const nextExerciseId = masteryRef.current.currentExerciseId;
    if (masteryRef.current.phase === 'complete' || masteryRef.current.phase === 'blocked' || !nextExerciseId) setPhase('summary');
    else {
      const nextIdx = exercises.findIndex((exercise) => exercise.id === nextExerciseId);
      setCurrentIdx(nextIdx >= 0 ? nextIdx : 0);
      setPhase('exercise');
    }
  };

  const handleResult = (correct: boolean) => {
    if (!correct || phase !== 'exercise') return;
    finishTransition();
  };

  const handleAttempt = ({ attemptNumber, isCorrect }: { attemptNumber: number; isCorrect: boolean }) => {
    const before = masteryRef.current;
    if (before.phase !== 'first-pass' && before.phase !== 'review') return;
    const next = recordMasteryAttempt(before, currentExercise.id, isCorrect);
    masteryRef.current = next;
    setMastery(next);
    storeMastery(next);
    if (isCorrect) {
      const result = completeExercise(exerciseProgressRef.current, {
        workbookId, lessonId, dayId: day.id, exercise: currentExercise,
        attempts: Math.max(1, attemptNumber), runId,
      });
      exerciseProgressRef.current = result.state;
      setExerciseProgress(result.state);
      const storage = typeof window === 'undefined' ? null : window.localStorage;
      setStorageWarning(!saveExerciseProgress(storage, userId, result.state));
    }
    if (!isCorrect && attemptNumber >= MAX_TECHNICAL_FAILURES) setTechnicalHelpOpen(true);
  };

  const handleDayContinue = (destination?: () => void) => {
    if (isReplay) {
      clearActiveRunStorage(runId);
      (destination ?? onBack)();
      return;
    }
    void persistDayCompletion().then(() => {
      clearActiveRunStorage(runId);
      (destination ?? onBack)();
    }).catch(() => { /* the summary remains visible so the student can retry */ });
  };

  const startNewRun = (startIndex = 0, endExclusive = exercises.length) => {
    const nextRunId = createRunId();
    try { window.localStorage.setItem(activeRunStorageKey, nextRunId); } catch { /* non-blocking */ }
    setRunId(nextRunId);
    setIsReplay(true);
    setCurrentIdx(startIndex);
    setRunEndExclusive(endExclusive);
    const nextMastery = createMasterySession(exercises.slice(startIndex, endExclusive).map((exercise) => exercise.id));
    masteryRef.current = nextMastery;
    setMastery(nextMastery);
    storeMastery(nextMastery, nextRunId);
    setTechnicalHelpOpen(false);
    setPhase('exercise');
  };

  const reportTechnicalProblem = () => {
    const reported = recordTechnicalFailure(masteryRef.current, currentExercise.id, MAX_TECHNICAL_FAILURES);
    masteryRef.current = reported;
    setMastery(reported);
    storeMastery(reported);
  };

  const skipAsTechnical = () => {
    const next = skipTechnicalExercise(masteryRef.current, currentExercise.id);
    masteryRef.current = next;
    setMastery(next);
    storeMastery(next);
    setTechnicalHelpOpen(false);
    finishTransition();
  };

  const backToTrail = () => {
    onBack();
  };

  return (
    <div className="relative min-h-full">
      <div className="fixed left-1/2 top-[76px] z-40 flex max-w-[90vw] -translate-x-1/2 gap-1 rounded-full bg-slate-900/85 px-3 py-2 shadow-lg" aria-label="Exercise progress">
        {exercises.map((exercise, index) => {
          const completed = mastery.items[exercise.id]?.status === 'mastered';
          const active = phase === 'exercise' && index === currentIdx;
          const statusClass = completed ? 'bg-emerald-400' : active ? 'bg-blue-400 ring-2 ring-white' : index > currentIdx ? 'bg-slate-600' : 'bg-amber-400';
          return <button type="button" key={exercise.id} title={`Practice exercise ${index + 1}`} aria-label={`Practice exercise ${index + 1}`}
            onClick={() => startNewRun(index, index + 1)} className={`h-3 w-3 rounded-full ${statusClass}`} />;
        })}
      </div>
      <PracticeSection
        item={practiceItem as any}
        onResult={handleResult}
        currentIdx={currentIdx}
        totalItems={exercises.length}
        lessonId={lessonNumber}
        unitNumber={unitNumber}
        onBack={onBack}
        onGrammar={onGrammar}
        dayNumber={dayNumber}
        totalDays={totalDays}
        currentLanguage={currentLanguage}
        onAttempt={handleAttempt}
      />
      {phase === 'summary' && (
        <div className="fixed inset-x-0 top-[68px] bottom-[56px] z-50 flex items-center justify-center overflow-y-auto bg-slate-950 px-6 py-8 text-center">
          <div className="w-full max-w-md rounded-3xl border border-cyan-400/30 bg-slate-900 p-7 shadow-2xl">
            <div className={`text-5xl ${isLastDayOfLesson ? 'motion-safe:animate-bounce' : ''}`}>{isLastLessonOfWorkbook && isLastDayOfLesson ? '🏆' : isLastDayOfLesson ? '⭐' : '🎉'}</div>
            <p className="mt-3 text-2xl font-black text-white">
              {mastery.phase === 'blocked' ? 'Practice needs attention' : isLastLessonOfWorkbook && isLastDayOfLesson ? 'Workbook complete' : isLastDayOfLesson ? 'Lesson complete' : runEndExclusive === exercises.length ? 'Day complete' : 'Practice complete'}
            </p>
            {isLastDayOfLesson && mastery.phase === 'complete' && <p className="mt-2 text-sm font-bold text-cyan-300">{isLastLessonOfWorkbook ? 'Final review passed · Workbook completed' : 'Final review passed · Next lesson unlocked'}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl bg-slate-800 p-4"><span className="text-xs text-slate-400">Exercises completed</span><p className="font-black text-white">{masterySummary.mastered}/{masterySummary.uniqueExercises}</p></div>
              <div className="rounded-2xl bg-slate-800 p-4"><span className="text-xs text-slate-400">First-try accuracy</span><p className="font-black text-white">{masterySummary.initialAccuracy}%</p></div>
              <div className="rounded-2xl bg-slate-800 p-4"><span className="text-xs text-slate-400">Errors corrected</span><p className="font-black text-white">{masterySummary.exercisesReviewed}</p></div>
              <div className="rounded-2xl bg-slate-800 p-4"><span className="text-xs text-slate-400">Points earned</span><p className="font-black text-white">{totalEarned}</p></div>
            </div>
            {isLastDayOfLesson && (
              <div className="mt-4 rounded-2xl border border-cyan-700/50 bg-slate-800 p-4 text-left">
                <p className="text-xs font-black uppercase tracking-widest text-cyan-300">Final Test performance</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {(['listening', 'writing', 'shadowing', 'speaking'] as const).map((skill) => (
                    <div key={skill} className="rounded-xl bg-slate-900 p-3">
                      <span className="text-xs capitalize text-slate-400">{skill}</span>
                      <p className="font-black text-white">{finalTestReport[skill].firstTryAccuracy}%</p>
                      <p className="text-[11px] text-slate-400">{finalTestReport[skill].correctedAfterError} corrected</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-300">Vocabulary explicitly practiced: <strong>{vocabularyPracticed}</strong></p>
                {coverageObjectives.length > 0 && <p className="mt-1 text-xs text-slate-300">Objectives covered: {coverageObjectives.join(', ')}</p>}
              </div>
            )}
            {(lessonSummary || workbookSummary) && (
              <div className="mt-4 space-y-3 rounded-2xl bg-slate-800 p-4 text-left">
                {lessonSummary && <div><div className="flex justify-between text-xs text-slate-300"><span>Lesson progress</span><span>{lessonSummary.completed}/{lessonSummary.total}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-700"><div className="h-full bg-cyan-400" style={{ width: `${lessonSummary.percentage}%` }} /></div></div>}
                {workbookSummary && <div><div className="flex justify-between text-xs text-slate-300"><span>Workbook progress</span><span>{workbookSummary.completed}/{workbookSummary.total}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-700"><div className="h-full bg-emerald-400" style={{ width: `${workbookSummary.percentage}%` }} /></div></div>}
              </div>
            )}
            {storageWarning && <p className="mt-4 text-sm text-amber-300">This device could not cache progress, but you can continue safely.</p>}
            {mastery.phase === 'blocked' && <p className="mt-4 text-sm font-bold text-amber-300">A technical skip was recorded. This activity was not marked as mastered.</p>}
            <div className="mt-6 grid gap-3">
              {mastery.phase === 'complete' && isLastDayOfLesson && isLastLessonOfWorkbook && onContinueToNextWorkbook && <button onClick={() => handleDayContinue(onContinueToNextWorkbook)} className="w-full rounded-2xl bg-blue-600 px-6 py-4 font-black uppercase text-white">{hasNextWorkbook ? 'Continue to next workbook' : 'Choose a workbook'}</button>}
              {mastery.phase === 'complete' && isLastDayOfLesson && !isLastLessonOfWorkbook && onContinueToNextLesson && <button onClick={() => handleDayContinue(onContinueToNextLesson)} className="w-full rounded-2xl bg-blue-600 px-6 py-4 font-black uppercase text-white">Continue to next lesson</button>}
              {mastery.phase === 'complete' && !isLastDayOfLesson && onContinueToNextDay && <button onClick={() => handleDayContinue(onContinueToNextDay)} className="w-full rounded-2xl bg-blue-600 px-6 py-4 font-black uppercase text-white">Continue to next day</button>}
              <button onClick={() => startNewRun()} className="w-full rounded-2xl bg-emerald-600 px-6 py-3 font-black uppercase text-white">Repeat this day</button>
              {isLastDayOfLesson && onRepeatLesson && <button onClick={() => handleDayContinue(onRepeatLesson)} className="w-full rounded-2xl border border-cyan-700 px-6 py-3 font-black uppercase text-cyan-100">Repeat this lesson</button>}
              <button onClick={isReplay ? backToTrail : () => handleDayContinue(onBack)} className="w-full rounded-2xl border border-slate-600 px-6 py-3 font-black uppercase text-slate-100">Back to trail</button>
            </div>
          </div>
        </div>
      )}
      {phase === 'exercise' && technicalHelpOpen && (
        <div className="fixed inset-x-4 bottom-[76px] z-50 mx-auto max-w-md rounded-2xl border border-amber-500/50 bg-slate-950 p-4 text-center shadow-2xl" role="alert">
          <p className="font-black text-amber-300">Is this exercise technically broken?</p>
          <p className="mt-1 text-xs text-slate-300">Report only invalid answers, audio or exercise data. Student mistakes remain in the mastery queue.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button onClick={reportTechnicalProblem} className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white">Report problem</button>
            <button disabled={(mastery.items[currentExercise.id]?.technicalFailures ?? 0) < MAX_TECHNICAL_FAILURES} onClick={skipAsTechnical} className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Skip unmastered</button>
            <button onClick={backToTrail} className="rounded-xl border border-slate-600 px-3 py-2 text-xs font-black text-white">Back to trail</button>
          </div>
        </div>
      )}
    </div>
  );
};
