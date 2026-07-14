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
}

export const ExercisePractice: React.FC<ExercisePracticeProps> = ({
  day,
  lessonId,
  currentLanguage = 'en',
  onComplete,
  onBack,
  totalDays,
  onGrammar,
  userId = 'anonymous',
  workbookId = 1,
  workbook,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<'exercise' | 'transition' | 'summary'>('exercise');
  const [attemptCount, setAttemptCount] = useState(0);
  const [lastPoints, setLastPoints] = useState(0);
  const [storageWarning, setStorageWarning] = useState(false);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgressState>(emptyExerciseProgress);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCompletedRef = useRef(false);
  const exercises = day.exercises;

  useEffect(() => {
    const storage = typeof window === 'undefined' ? null : window.localStorage;
    const restored = loadExerciseProgress(storage, userId);
    const firstIncomplete = day.exercises.findIndex((exercise) =>
      !restored.records[exerciseCompletionKey(workbookId, lessonId, day.id, exercise.id)]
    );
    setExerciseProgress(restored);
    setCurrentIdx(firstIncomplete === -1 ? Math.max(0, day.exercises.length - 1) : firstIncomplete);
    setPhase(firstIncomplete === -1 && day.exercises.length ? 'summary' : 'exercise');
    setAttemptCount(0);
    setLastPoints(0);
    setStorageWarning(false);
    isCompletedRef.current = false;
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, [day.id, day.exercises, lessonId, userId, workbookId]);

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
    if (nextIdx >= exercises.length) setPhase('summary');
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

  const handleDayContinue = () => {
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;
    const completionScore = summary.total ? Math.round((summary.completed / summary.total) * 100) : 0;
    void Promise.resolve(onComplete(day.id, completionScore, {
      attempts: summary.attempts,
      errors: summary.errors,
      accuracy: summary.accuracy,
      points: summary.points,
    })).catch((error) => {
      console.error('[ExercisePractice] onComplete failed:', error);
      isCompletedRef.current = false;
    });
  };

  return (
    <div className="relative min-h-full">
      <div className="fixed left-1/2 top-[76px] z-40 flex max-w-[90vw] -translate-x-1/2 gap-1 rounded-full bg-slate-900/85 px-3 py-2 shadow-lg" aria-label="Exercise progress">
        {exercises.map((exercise, index) => {
          const completed = Boolean(exerciseProgress.records[exerciseCompletionKey(workbookId, lessonId, day.id, exercise.id)]);
          const active = phase === 'exercise' && index === currentIdx;
          const statusClass = completed ? 'bg-emerald-400' : active ? 'bg-blue-400 ring-2 ring-white' : index > currentIdx ? 'bg-slate-600' : 'bg-amber-400';
          return <span key={exercise.id} title={`Exercise ${index + 1}`} className={`h-2.5 w-2.5 rounded-full ${statusClass}`} />;
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
            <p className="mt-3 text-2xl font-black text-white">Day complete</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl bg-slate-800 p-4"><span className="text-xs text-slate-400">Exercises</span><p className="font-black text-white">{summary.completed}/{summary.total}</p></div>
              <div className="rounded-2xl bg-slate-800 p-4"><span className="text-xs text-slate-400">Accuracy</span><p className="font-black text-white">{summary.accuracy}%</p></div>
              <div className="rounded-2xl bg-slate-800 p-4"><span className="text-xs text-slate-400">Points</span><p className="font-black text-white">{summary.points}</p></div>
              <div className="rounded-2xl bg-slate-800 p-4"><span className="text-xs text-slate-400">New vocabulary</span><p className="font-black text-white">{summary.vocabularyTargets}</p></div>
            </div>
            {(lessonSummary || workbookSummary) && (
              <div className="mt-4 space-y-3 rounded-2xl bg-slate-800 p-4 text-left">
                {lessonSummary && <div><div className="flex justify-between text-xs text-slate-300"><span>Lesson progress</span><span>{lessonSummary.completed}/{lessonSummary.total}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-700"><div className="h-full bg-cyan-400" style={{ width: `${lessonSummary.percentage}%` }} /></div></div>}
                {workbookSummary && <div><div className="flex justify-between text-xs text-slate-300"><span>Workbook progress</span><span>{workbookSummary.completed}/{workbookSummary.total}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-700"><div className="h-full bg-emerald-400" style={{ width: `${workbookSummary.percentage}%` }} /></div></div>}
              </div>
            )}
            {storageWarning && <p className="mt-4 text-sm text-amber-300">This device could not cache progress, but you can continue safely.</p>}
            <button onClick={handleDayContinue} className="mt-6 w-full rounded-2xl bg-blue-600 px-6 py-4 font-black uppercase text-white">Continue</button>
          </div>
        </div>
      )}
    </div>
  );
};
