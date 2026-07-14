import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Day, UserProgress, LessonLanguageCode, Workbook } from '../../types';
import { getUnitNumberFromLessonNumber } from '../../utils/workbookUnits';
import {
  completeExercise,
  dayCompletionSummary,
  emptyExerciseProgress,
  exerciseCompletionKey,
  loadExerciseProgress,
  lessonCompletionSummary,
  mergeLegacyCompletedDays,
  practiceRunSummary,
  resolvePracticeStart,
  saveExerciseProgress,
  workbookCompletionSummary,
  type ExerciseProgressState,
} from '../../engine/exerciseCompletionEngine';
import { PracticeSection } from '../UI';

interface ExercisePracticeProps {
  day: Day;
  lessonId: string;
  currentLanguage?: LessonLanguageCode;
  progress: UserProgress;
  onComplete: (
    dayId: string,
    score: number,
    analytics?: { attempts: number; errors: number; accuracy: number; points: number },
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
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<'exercise' | 'transition' | 'summary'>('exercise');
  const [attemptCount, setAttemptCount] = useState(0);
  const [lastPoints, setLastPoints] = useState(0);
  const [storageWarning, setStorageWarning] = useState(false);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgressState>(emptyExerciseProgress);
  const [runId, setRunId] = useState('');
  const [runEndExclusive, setRunEndExclusive] = useState(day.exercises.length);
  const [isReplay, setIsReplay] = useState(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCompletedRef = useRef(false);
  const exercises = day.exercises;

  const createRunId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const activeRunStorageKey = `learnendo_active_practice_run_v1:${userId}:w${workbookId}:${lessonId}:${day.id}`;

  useEffect(() => {
    const storage = typeof window === 'undefined' ? null : window.localStorage;
    const completedDayIds = new Set([
      ...(progress.completedActivities ?? []),
      ...Object.entries(progress.days ?? {}).filter(([, completed]) => completed).map(([id]) => id),
    ]);
    if (isDayCompleted) completedDayIds.add(day.id);
    const loaded = loadExerciseProgress(storage, userId);
    const restored = workbook ? mergeLegacyCompletedDays(loaded, workbook, completedDayIds) : loaded;
    if (restored !== loaded) saveExerciseProgress(storage, userId, restored);
    const firstIncomplete = day.exercises.findIndex((exercise) =>
      !restored.records[exerciseCompletionKey(workbookId, lessonId, day.id, exercise.id)]
    );
    const start = resolvePracticeStart(day.exercises.length, firstIncomplete, initialExerciseIndex);
    const historicallyComplete = start.isReplay;
    let nextRunId = '';
    try { nextRunId = window.sessionStorage.getItem(activeRunStorageKey) ?? ''; } catch { /* non-blocking */ }
    if (!nextRunId) {
      nextRunId = createRunId();
      try { window.sessionStorage.setItem(activeRunStorageKey, nextRunId); } catch { /* non-blocking */ }
    }
    const firstUnfinishedInActiveRun = day.exercises.findIndex((exercise) =>
      !restored.runs[`${nextRunId}::${exerciseCompletionKey(workbookId, lessonId, day.id, exercise.id)}`]
    );
    const hasActiveRunProgress = day.exercises.some((exercise) =>
      Boolean(restored.runs[`${nextRunId}::${exerciseCompletionKey(workbookId, lessonId, day.id, exercise.id)}`])
    );
    setExerciseProgress(restored);
    setRunId(nextRunId);
    setIsReplay(historicallyComplete || completedDayIds.has(day.id));
    setCurrentIdx(hasActiveRunProgress
      ? (firstUnfinishedInActiveRun === -1 ? Math.max(0, day.exercises.length - 1) : firstUnfinishedInActiveRun)
      : start.index);
    setRunEndExclusive(initialExerciseIndex == null ? day.exercises.length : start.index + 1);
    setPhase(hasActiveRunProgress && firstUnfinishedInActiveRun === -1 ? 'summary' : 'exercise');
    setAttemptCount(0);
    setLastPoints(0);
    setStorageWarning(false);
    isCompletedRef.current = false;
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
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
  const summary = useMemo(
    () => dayCompletionSummary(exerciseProgress, workbookId, lessonId, day),
    [day, exerciseProgress, lessonId, workbookId],
  );
  const runSummary = useMemo(() => practiceRunSummary(exerciseProgress, runId), [exerciseProgress, runId]);
  const lessonSummary = useMemo(
    () => workbook ? lessonCompletionSummary(workbook, lessonId, exerciseProgress) : null,
    [exerciseProgress, lessonId, workbook],
  );
  const workbookSummary = useMemo(
    () => workbook ? workbookCompletionSummary(workbook, exerciseProgress) : null,
    [exerciseProgress, workbook],
  );

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

  const finishTransition = (nextIdx: number) => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = null;
    setAttemptCount(0);
    if (nextIdx >= runEndExclusive) setPhase('summary');
    else {
      setCurrentIdx(nextIdx);
      setPhase('exercise');
    }
  };

  const handleResult = (correct: boolean) => {
    if (!correct || phase !== 'exercise') return;
    const result = completeExercise(exerciseProgress, {
      workbookId,
      lessonId,
      dayId: day.id,
      exercise: currentExercise,
      attempts: Math.max(1, attemptCount),
      runId,
    });
    setExerciseProgress(result.state);
    setLastPoints(result.pointsAwarded);
    const storage = typeof window === 'undefined' ? null : window.localStorage;
    setStorageWarning(!saveExerciseProgress(storage, userId, result.state));
    const nextIdx = currentIdx + 1;
    setPhase('transition');
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    transitionTimerRef.current = setTimeout(() => finishTransition(nextIdx), reduceMotion ? 0 : 1400);
  };

  const handleDayContinue = (continueToNextDay = false) => {
    if (isReplay) {
      try { window.sessionStorage.removeItem(activeRunStorageKey); } catch { /* non-blocking */ }
      if (continueToNextDay && onContinueToNextDay) onContinueToNextDay();
      else onBack();
      return;
    }
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;
    const completionScore = summary.total ? Math.round((summary.completed / summary.total) * 100) : 0;
    void Promise.resolve(onComplete(day.id, completionScore, {
      attempts: runSummary.attempts,
      errors: runSummary.errors,
      accuracy: runSummary.accuracy,
      points: runSummary.points,
    })).then(() => {
      try { window.sessionStorage.removeItem(activeRunStorageKey); } catch { /* non-blocking */ }
      if (continueToNextDay) onContinueToNextDay?.();
    }).catch((error) => {
      console.error('[ExercisePractice] onComplete failed:', error);
      isCompletedRef.current = false;
    });
  };

  const startNewRun = (startIndex = 0, endExclusive = exercises.length) => {
    const nextRunId = createRunId();
    try { window.sessionStorage.setItem(activeRunStorageKey, nextRunId); } catch { /* non-blocking */ }
    setRunId(nextRunId);
    setIsReplay(true);
    setCurrentIdx(startIndex);
    setRunEndExclusive(endExclusive);
    setAttemptCount(0);
    setLastPoints(0);
    setPhase('exercise');
  };

  const backToTrail = () => {
    try { window.sessionStorage.removeItem(activeRunStorageKey); } catch { /* non-blocking */ }
    onBack();
  };

  return (
    <div className="relative min-h-full">
      <div className="fixed left-1/2 top-[76px] z-40 flex max-w-[90vw] -translate-x-1/2 gap-1 rounded-full bg-slate-900/85 px-3 py-2 shadow-lg" aria-label="Exercise progress">
        {exercises.map((exercise, index) => {
          const completed = Boolean(exerciseProgress.runs[`${runId}::${exerciseCompletionKey(workbookId, lessonId, day.id, exercise.id)}`]);
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
        onAttempt={({ attemptNumber }) => setAttemptCount(attemptNumber)}
      />
      {phase === 'transition' && (
        <div className="fixed inset-x-0 top-[68px] bottom-[56px] z-50 flex items-center justify-center bg-slate-950/95 px-6 text-center" role="status">
          <div className="w-full max-w-sm rounded-3xl border border-emerald-400/40 bg-slate-900 p-8 shadow-2xl">
            <div className="text-5xl text-emerald-300">✓</div>
            <p className="mt-3 text-2xl font-black text-emerald-300">Exercise complete</p>
            <p className="mt-2 text-lg font-bold text-white">+{lastPoints} points</p>
            <p className="mt-2 text-sm text-slate-300">{currentIdx + 1} of {exercises.length} · {Math.round(((currentIdx + 1) / exercises.length) * 100)}%</p>
            <button onClick={() => finishTransition(currentIdx + 1)} className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white">Skip</button>
          </div>
        </div>
      )}
      {phase === 'summary' && (
        <div className="fixed inset-x-0 top-[68px] bottom-[56px] z-50 flex items-center justify-center overflow-y-auto bg-slate-950 px-6 py-8 text-center">
          <div className="w-full max-w-md rounded-3xl border border-cyan-400/30 bg-slate-900 p-7 shadow-2xl">
            <div className="text-5xl">🎉</div>
            <p className="mt-3 text-2xl font-black text-white">{runEndExclusive === exercises.length ? 'Day complete' : 'Practice complete'}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl bg-slate-800 p-4"><span className="text-xs text-slate-400">Exercises this run</span><p className="font-black text-white">{runSummary.completed}/{runEndExclusive === exercises.length ? exercises.length : 1}</p></div>
              <div className="rounded-2xl bg-slate-800 p-4"><span className="text-xs text-slate-400">Accuracy</span><p className="font-black text-white">{runSummary.accuracy}%</p></div>
              <div className="rounded-2xl bg-slate-800 p-4"><span className="text-xs text-slate-400">Total earned</span><p className="font-black text-white">{runSummary.points}</p></div>
              <div className="rounded-2xl bg-slate-800 p-4"><span className="text-xs text-slate-400">Practice run</span><p className="font-black text-white">{runSummary.practiceRun}</p></div>
              <div className="rounded-2xl bg-slate-800 p-4"><span className="text-xs text-slate-400">Replay bonus</span><p className="font-black text-white">+{runSummary.replayBonus}</p></div>
              <div className="rounded-2xl bg-slate-800 p-4"><span className="text-xs text-slate-400">{isReplay ? 'Vocabulary reviewed' : 'New vocabulary'}</span><p className="font-black text-white">{isReplay ? runSummary.vocabularyReviewed : runSummary.newVocabulary}</p></div>
            </div>
            {(lessonSummary || workbookSummary) && (
              <div className="mt-4 space-y-3 rounded-2xl bg-slate-800 p-4 text-left">
                {lessonSummary && <div><div className="flex justify-between text-xs text-slate-300"><span>Lesson progress</span><span>{lessonSummary.completed}/{lessonSummary.total}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-700"><div className="h-full bg-cyan-400" style={{ width: `${lessonSummary.percentage}%` }} /></div></div>}
                {workbookSummary && <div><div className="flex justify-between text-xs text-slate-300"><span>Workbook progress</span><span>{workbookSummary.completed}/{workbookSummary.total}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-700"><div className="h-full bg-emerald-400" style={{ width: `${workbookSummary.percentage}%` }} /></div></div>}
              </div>
            )}
            {storageWarning && <p className="mt-4 text-sm text-amber-300">This device could not cache progress, but you can continue safely.</p>}
            <div className="mt-6 grid gap-3">
              {onContinueToNextDay && <button onClick={() => handleDayContinue(true)} className="w-full rounded-2xl bg-blue-600 px-6 py-4 font-black uppercase text-white">Continue to next day</button>}
              <button onClick={() => startNewRun()} className="w-full rounded-2xl bg-emerald-600 px-6 py-3 font-black uppercase text-white">Repeat this day</button>
              <button onClick={isReplay ? backToTrail : () => handleDayContinue(false)} className="w-full rounded-2xl border border-slate-600 px-6 py-3 font-black uppercase text-slate-100">Back to trail</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
