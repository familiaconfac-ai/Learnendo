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
  jumpToMasteryExercise,
  masteryMetrics,
  MAX_TECHNICAL_FAILURES,
  MASTERY_LESSON_COMPLETION_BONUS,
  recordMasteryAttempt,
  recordTechnicalFailure,
  restoreMasterySession,
  skipTechnicalExercise,
  type MasterySessionState,
} from '../../engine/masteryQueueEngine';
import { buildFinalTestReport } from '../../engine/finalTestReportEngine';
import {
  createExerciseReport,
  EXERCISE_REPORT_CATEGORIES,
  type ExerciseReportCategory,
} from '../../services/exerciseReportsService';
import { loadPublishedDayOverrides, readCachedDayOverrides } from '../../services/exerciseOverrideService';
import {
  loadPublishedDaySequence, readCachedDaySequence, resolveAuthoredDayExercises,
} from '../../services/dayExerciseAuthoringService';
import { settleEditorialSequenceLoad, type EditorialSequenceLoadStatus } from '../../models/editorialSequenceLoading';

const debugEditorialSequence = import.meta.env.DEV && import.meta.env.VITE_DEBUG_EDITORIAL_SEQUENCE === 'true';

interface ExercisePracticeProps {
  day: Day;
  lessonId: string;
  currentLanguage?: LessonLanguageCode;
  courseId?: string;
  interfaceLocale?: string;
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
  userName?: string | null;
  userEmail?: string | null;
  workbookTitle?: string;
  lessonTitle?: string;
  initialExerciseIndex?: number;
  onContinueToNextDay?: () => void;
  isDayCompleted?: boolean;
  isLastDayOfLesson?: boolean;
  isLastLessonOfWorkbook?: boolean;
  hasNextWorkbook?: boolean;
  onContinueToNextLesson?: () => void;
  onContinueToNextWorkbook?: () => void;
  onRepeatLesson?: () => void;
  onLessonProgressChange?: (stats: { completedExercises: number; errors: number }) => void;
}

export const ExercisePractice: React.FC<ExercisePracticeProps> = ({
  day,
  lessonId,
  currentLanguage = 'en',
  courseId,
  interfaceLocale,
  progress,
  onComplete,
  onBack,
  totalDays,
  onGrammar,
  userId = 'anonymous',
  workbookId = 1,
  workbook,
  userName = null,
  userEmail = null,
  workbookTitle = '',
  lessonTitle = '',
  initialExerciseIndex,
  onContinueToNextDay,
  isDayCompleted = false,
  isLastDayOfLesson = false,
  isLastLessonOfWorkbook = false,
  hasNextWorkbook = false,
  onContinueToNextLesson,
  onContinueToNextWorkbook,
  onRepeatLesson,
  onLessonProgressChange,
}) => {
  const editorialCourseId = courseId ?? (currentLanguage === 'es' ? 'spanish'
    : currentLanguage === 'el' ? 'greek_koine'
      : currentLanguage === 'he' ? 'hebrew_biblical'
        : currentLanguage === 'pt' ? 'portuguese_foreigners' : 'english');
  const daySequenceIdentity = {
    courseId: editorialCourseId, language: currentLanguage, workbookId, lessonId, dayId: day.id,
  };
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<'exercise' | 'summary'>('exercise');
  const [storageWarning, setStorageWarning] = useState(false);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgressState>(emptyExerciseProgress);
  const exerciseProgressRef = useRef<ExerciseProgressState>(emptyExerciseProgress());
  const [runId, setRunId] = useState('');
  const [runEndExclusive, setRunEndExclusive] = useState(day.exercises.length);
  const [isReplay, setIsReplay] = useState(false);
  const [technicalHelpOpen, setTechnicalHelpOpen] = useState(false);
  const [contextualHelpOpen, setContextualHelpOpen] = useState(false);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<ExerciseReportCategory>(EXERCISE_REPORT_CATEGORIES[0]);
  const [reportComment, setReportComment] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportConfirmation, setReportConfirmation] = useState('');
  const [lastStudentAnswer, setLastStudentAnswer] = useState<string | null>(null);
  const [lastAttemptCount, setLastAttemptCount] = useState(0);
  const [mastery, setMastery] = useState<MasterySessionState>(() => createMasterySession([]));
  const masteryRef = useRef(mastery);
  const isCompletedRef = useRef(false);
  const completionPromiseRef = useRef<Promise<void> | null>(null);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const [resolvedExercises, setResolvedExercises] = useState(() => {
    const cached = readCachedDayOverrides(workbookId, lessonId, day.id, currentLanguage);
    const sequence = readCachedDaySequence(daySequenceIdentity);
    return resolveAuthoredDayExercises(day.exercises, cached, sequence).filter((exercise) => !exercise.editorialDisabled);
  });
  const [editorialLoadStatus, setEditorialLoadStatus] = useState<EditorialSequenceLoadStatus>('loading');
  const exercises = resolvedExercises;

  useEffect(() => {
    window.history?.pushState?.({ learnendoExercise: true }, '');
    const onPopState = () => onBackRef.current();
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      if (window.history?.state?.learnendoExercise) window.history.replaceState(null, '');
    };
  }, []);

  const leaveExercise = () => {
    if (window.history?.state?.learnendoExercise) window.history.replaceState(null, '');
    onBackRef.current();
  };

  useEffect(() => {
    const cached = readCachedDayOverrides(workbookId, lessonId, day.id, currentLanguage);
    const immediate = resolveAuthoredDayExercises(day.exercises, cached, readCachedDaySequence(daySequenceIdentity)).filter((exercise) => !exercise.editorialDisabled);
    setResolvedExercises(immediate);
    setEditorialLoadStatus('loading');
    if (debugEditorialSequence) console.info('[EDITORIAL_SEQUENCE] load:start', { ...daySequenceIdentity, localCount: day.exercises.length });
    let cancelled = false;
    void Promise.all([
      loadPublishedDayOverrides(workbookId, lessonId, day.id, currentLanguage),
      loadPublishedDaySequence(daySequenceIdentity),
    ]).then(([overrides, sequence]) => {
      if (cancelled) return;
      const outcome = settleEditorialSequenceLoad(day.exercises, sequence?.exercises ?? null);
      const compatibleSequence = outcome.status === 'published' ? sequence : null;
      const next = resolveAuthoredDayExercises(day.exercises, overrides, compatibleSequence).filter((exercise) => !exercise.editorialDisabled);
      setResolvedExercises(next);
      setEditorialLoadStatus(outcome.status);
      setCurrentIdx((index) => Math.min(index, Math.max(0, next.length - 1)));
      if (debugEditorialSequence) console.info('[EDITORIAL_SEQUENCE] load:complete', { ...daySequenceIdentity, version: sequence?.version ?? null, publishedCount: sequence?.exercises?.length ?? 0, resolvedCount: next.length, status: outcome.status, diagnostic: outcome.diagnostic });
    }).catch((error) => {
      if (cancelled) return;
      const outcome = settleEditorialSequenceLoad(day.exercises, null, error);
      setResolvedExercises(outcome.exercises);
      setEditorialLoadStatus(outcome.status);
      console.error('[ExercisePractice] authored day load failed; local curriculum retained:', error);
      if (debugEditorialSequence) console.info('[EDITORIAL_SEQUENCE] load:complete', { ...daySequenceIdentity, resolvedCount: outcome.exercises.length, status: outcome.status, diagnostic: outcome.diagnostic });
    });
    return () => { cancelled = true; };
  }, [currentLanguage, day.id, day.exercises, editorialCourseId, lessonId, workbookId]);

  useEffect(() => {
    // Report context belongs only to the exercise currently on screen. Without
    // this reset, opening help immediately after Continue could attach the
    // previous exercise's answer to the new exercise report.
    setLastStudentAnswer(null);
    setLastAttemptCount(0);
  }, [currentIdx, day.id]);

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
    if (editorialLoadStatus === 'loading') return;
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
    const firstIncomplete = exercises.findIndex((exercise) =>
      !restored.records[exerciseCompletionKey(workbookId, lessonId, day.id, exercise.id)]
    );
    const start = resolvePracticeStart(exercises.length, firstIncomplete, initialExerciseIndex);
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
    const firstUnfinishedInActiveRun = exercises.findIndex((exercise) =>
      !restored.runs[`${nextRunId}::${exerciseCompletionKey(workbookId, lessonId, day.id, exercise.id)}`]
    );
    const hasActiveRunProgress = exercises.some((exercise) =>
      Boolean(restored.runs[`${nextRunId}::${exerciseCompletionKey(workbookId, lessonId, day.id, exercise.id)}`])
    );
    setExerciseProgress(restored);
    exerciseProgressRef.current = restored;
    setRunId(nextRunId);
    setIsReplay(historicallyComplete || completedDayIds.has(day.id));
    setCurrentIdx(hasActiveRunProgress
      ? (firstUnfinishedInActiveRun === -1 ? Math.max(0, exercises.length - 1) : firstUnfinishedInActiveRun)
      : start.index);
    setRunEndExclusive(initialExerciseIndex == null ? exercises.length : start.index + 1);
    setPhase(hasActiveRunProgress && firstUnfinishedInActiveRun === -1 ? 'summary' : 'exercise');
    const masteryStartIndex = hasActiveRunProgress && firstUnfinishedInActiveRun >= 0 ? firstUnfinishedInActiveRun : start.index;
    const targetExerciseIds = exercises
      .slice(masteryStartIndex, initialExerciseIndex == null ? exercises.length : masteryStartIndex + 1)
      .map((exercise) => exercise.id);
    let nextMastery = createMasterySession(targetExerciseIds);
    try {
      const cachedRaw = window.localStorage.getItem(masteryStorageKey(nextRunId))
        ?? window.sessionStorage.getItem(masteryStorageKey(nextRunId));
      const cached = JSON.parse(cachedRaw ?? 'null') as MasterySessionState | null;
      const currentDayIds = new Set(exercises.map((exercise) => exercise.id));
      if (cached && cached.exerciseIds?.length && cached.exerciseIds.every((id) => currentDayIds.has(id)) && cached.items) {
        nextMastery = restoreMasterySession(cached);
        window.localStorage.setItem(masteryStorageKey(nextRunId), JSON.stringify(nextMastery));
        window.sessionStorage.removeItem(masteryStorageKey(nextRunId));
      }
    } catch { /* a corrupt session cache safely starts a new mastery run */ }
    masteryRef.current = nextMastery;
    setMastery(nextMastery);
    if (nextMastery.currentExerciseId) {
      const restoredMasteryIndex = exercises.findIndex((exercise) => exercise.id === nextMastery.currentExerciseId);
      if (restoredMasteryIndex >= 0) setCurrentIdx(restoredMasteryIndex);
      setPhase('exercise');
    } else if (nextMastery.phase === 'complete' || nextMastery.phase === 'blocked') {
      setPhase('summary');
    }
    setStorageWarning(false);
    setTechnicalHelpOpen(false);
    setContextualHelpOpen(false);
    setReportFormOpen(false);
    setReportConfirmation('');
    setLastStudentAnswer(null);
    setLastAttemptCount(0);
    isCompletedRef.current = false;
    completionPromiseRef.current = null;
  }, [day.id, editorialLoadStatus, exercises, lessonId, userId, workbookId, initialExerciseIndex, workbook, isDayCompleted]);

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

  useEffect(() => {
    if (!lessonSummary) return;
    onLessonProgressChange?.({
      completedExercises: lessonSummary.completed,
      errors: masterySummary.totalIncorrectAttempts,
    });
  }, [lessonSummary?.completed, masterySummary.totalIncorrectAttempts, onLessonProgressChange]);
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
        <button onClick={leaveExercise} className="mt-4 text-blue-400">← Back</button>
      </div>
    );
  }

  if (debugEditorialSequence && editorialLoadStatus === 'error') {
    console.warn('[EDITORIAL_SEQUENCE] recoverable empty state', { ...daySequenceIdentity });
  }

  if (currentIdx < 0 || currentIdx >= exercises.length) {
    return (
      <div className="fixed inset-x-0 top-[68px] bottom-[56px] z-30 flex items-center justify-center bg-slate-900 px-6 text-center">
        <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-800 px-6 py-8 shadow-2xl">
          <div className="text-4xl">⚠️</div>
          <p className="mt-4 text-lg font-black text-white">Exercise unavailable</p>
          <p className="mt-2 text-sm text-slate-300">Your progress is safe. Return to the lesson and resume.</p>
          <button onClick={leaveExercise} className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white">Back to lesson</button>
        </div>
      </div>
    );
  }

  const currentExercise = exercises[currentIdx];
  const practiceItem = { ...currentExercise, moduleType: `${lessonId}_${day.id}`, lessonId: lessonNumber };
  const contextualHelp = currentExercise.grammarHelp ?? {
    title: 'Ajuda deste exercício',
    explanation: currentExercise.translation
      ? currentExercise.translation.replace(/\*\*/g, '')
      : 'Observe a pergunta, escute o áudio novamente e responda usando o mesmo padrão apresentado na lição.',
    examples: [currentExercise.correctValue].filter(Boolean),
  };

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

  const handleAttempt = ({ answer, attemptNumber, isCorrect }: { answer: string; attemptNumber: number; isCorrect: boolean }) => {
    setLastStudentAnswer(answer);
    setLastAttemptCount(attemptNumber);
    const before = masteryRef.current;
    if (before.phase !== 'initial' && before.phase !== 'review') return;
    const next = recordMasteryAttempt(before, currentExercise.id, isCorrect);
    masteryRef.current = next;
    setMastery(next);
    storeMastery(next);
    const wasMastered = before.items[currentExercise.id]?.status === 'mastered';
    const isNowMastered = next.items[currentExercise.id]?.status === 'mastered';
    if (isCorrect && !wasMastered && isNowMastered) {
      const item = next.items[currentExercise.id];
      const result = completeExercise(exerciseProgressRef.current, {
        workbookId, lessonId, dayId: day.id, exercise: currentExercise,
        attempts: Math.max(1, item.firstPassAttempts + item.reviewAttempts), runId,
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
      (destination ?? leaveExercise)();
      return;
    }
    void persistDayCompletion().then(() => {
      clearActiveRunStorage(runId);
      (destination ?? leaveExercise)();
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

  const navigateToExercise = (index: number) => {
    if (index === currentIdx || index < 0 || index >= exercises.length) return;
    const target = exercises[index];
    const next = jumpToMasteryExercise(masteryRef.current, target.id);
    if (next !== masteryRef.current) {
      masteryRef.current = next;
      setMastery(next);
      storeMastery(next);
    }
    // A previously mastered/corrected dot is a harmless review. Its answer is
    // not counted twice; after a correct response the active pending path resumes.
    setCurrentIdx(index);
    setPhase('exercise');
  };

  const reportTechnicalProblem = () => {
    const reported = recordTechnicalFailure(masteryRef.current, currentExercise.id, MAX_TECHNICAL_FAILURES);
    masteryRef.current = reported;
    setMastery(reported);
    storeMastery(reported);
    setTechnicalHelpOpen(false);
    setReportFormOpen(true);
    setReportCategory('Exercício travado');
  };

  const submitProblemReport = async () => {
    if (reportSubmitting) return;
    setReportSubmitting(true);
    setReportConfirmation('');
    try {
      const userAgent = navigator.userAgent;
      const browser = /Edg\//.test(userAgent) ? 'Microsoft Edge' : /OPR\//.test(userAgent) ? 'Opera' : /Chrome\//.test(userAgent) ? 'Chrome' : /Firefox\//.test(userAgent) ? 'Firefox' : /Safari\//.test(userAgent) ? 'Safari' : 'Outro';
      const operatingSystem = /Windows/.test(userAgent) ? 'Windows' : /Android/.test(userAgent) ? 'Android' : /iPhone|iPad|iPod/.test(userAgent) ? 'iOS/iPadOS' : /Mac OS/.test(userAgent) ? 'macOS' : /Linux/.test(userAgent) ? 'Linux' : 'Outro';
      const deviceType = /Mobi|Android|iPhone/.test(userAgent) ? 'mobile' : /iPad|Tablet/.test(userAgent) ? 'tablet' : 'desktop';
      const result = await createExerciseReport({
        source: 'exercise-practice',
        userId,
        userName,
        userEmail,
        language: currentLanguage,
        workbookId,
        workbookTitle: workbookTitle || workbook?.title || `Workbook ${workbookId}`,
        lessonId,
        lessonTitle: lessonTitle || lessonId,
        dayId: day.id,
        dayNumber: dayNumber ?? null,
        exerciseId: currentExercise.id,
        exerciseType: currentExercise.type,
        exerciseMode: currentExercise.assessmentMode ?? currentExercise.promptMode ?? null,
        sessionPhase: masteryRef.current.phase,
        currentExerciseIndex: currentIdx,
        instruction: currentExercise.instruction,
        displayedText: currentExercise.displayValue ?? null,
        audioText: currentExercise.audioValue || null,
        audioSource: currentExercise.audioValue ? 'text-to-speech' : null,
        options: currentExercise.options ?? [],
        expectedAnswer: currentExercise.correctValue,
        acceptedAnswers: [currentExercise.correctValue, ...(currentExercise.acceptedAnswers ?? [])],
        studentAnswer: lastStudentAnswer,
        attemptCount: lastAttemptCount,
        problemCategory: reportCategory,
        studentComment: reportComment.trim(),
        route: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        appVersion: import.meta.env.VITE_APP_VERSION ?? '0.0.0',
        browser,
        operatingSystem,
        deviceType,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
      });
      setReportComment('');
      setReportFormOpen(false);
      setReportConfirmation(result.duplicate ? `Relatório já recebido (${result.reportId}).` : `Relatório enviado (${result.reportId}).`);
      window.setTimeout(() => setReportConfirmation(''), 5000);
    } catch (error) {
      console.error('[ExercisePractice] report submission failed:', error);
      setReportConfirmation('Não foi possível enviar agora. Tente novamente sem sair do exercício.');
    } finally { setReportSubmitting(false); }
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
    leaveExercise();
  };

  return (
    <div className="relative min-h-full">
      <div className="fixed left-1/2 top-[76px] z-40 flex max-w-[90vw] -translate-x-1/2 gap-1 rounded-full bg-slate-900/85 px-3 py-2 shadow-lg" aria-label="Exercise progress">
        {exercises.map((exercise, index) => {
          const itemState = mastery.items[exercise.id];
          const completed = itemState?.status === 'mastered';
          const incorrectAttempts = itemState?.incorrectAttempts ?? 0;
          const active = phase === 'exercise' && index === currentIdx;
          const statusClass = incorrectAttempts > 0 ? 'bg-amber-400' : completed ? 'bg-emerald-400' : active ? 'bg-blue-400 ring-2 ring-white' : 'bg-slate-600';
          const attemptLabel = incorrectAttempts > 0 ? `, ${incorrectAttempts} incorrect attempt${incorrectAttempts === 1 ? '' : 's'}, eventually corrected` : completed ? ', correct on first attempt' : '';
          return <button type="button" key={exercise.id} title={`Practice exercise ${index + 1}${attemptLabel}`} aria-label={`Practice exercise ${index + 1}${attemptLabel}`}
            onClick={() => navigateToExercise(index)} className={`h-3 w-3 rounded-full ${statusClass}`} />;
        })}
      </div>
      <PracticeSection
        item={practiceItem as any}
        onResult={handleResult}
        currentIdx={currentIdx}
        totalItems={exercises.length}
        lessonId={lessonNumber}
        unitNumber={unitNumber}
        onBack={leaveExercise}
        onGrammar={onGrammar}
        onContextHelp={() => setContextualHelpOpen(true)}
        dayNumber={dayNumber}
        totalDays={totalDays}
        currentLanguage={currentLanguage}
        uiLanguage={interfaceLocale}
        onAttempt={handleAttempt}
        validateChoiceOnSelect
      />
      {reportConfirmation && <div role="status" className="fixed bottom-[122px] left-1/2 z-[90] w-[min(92vw,30rem)] -translate-x-1/2 rounded-2xl border border-emerald-500/50 bg-slate-950 p-3 text-center text-sm font-bold text-emerald-300 shadow-2xl">{reportConfirmation}</div>}
      {phase === 'exercise' && contextualHelpOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/65 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4" onClick={() => setContextualHelpOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="contextual-help-title" className="max-h-[min(82dvh,42rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-cyan-400/40 bg-slate-900 p-5 text-left shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Ajuda gramatical</p>
            <h2 id="contextual-help-title" className="mt-1 text-xl font-black text-white">{contextualHelp.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-200">{contextualHelp.explanation}</p>
            {contextualHelp.examples.length > 0 && (
              <div className="mt-4 rounded-2xl bg-slate-800 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Exemplo</p>
                {contextualHelp.examples.slice(0, 2).map((example) => <p key={example} className="mt-1 font-bold text-amber-200">{example}</p>)}
              </div>
            )}
            <button type="button" onClick={() => setContextualHelpOpen(false)} className="mt-5 w-full rounded-2xl bg-blue-600 px-4 py-3 font-black text-white">Voltar ao exercício</button>
            <button type="button" onClick={() => { setContextualHelpOpen(false); setReportFormOpen(true); }} className="mt-2 w-full rounded-2xl px-4 py-3 text-sm font-bold text-slate-300 underline decoration-slate-500 underline-offset-4">Reportar problema</button>
          </section>
        </div>
      )}
      {phase === 'exercise' && reportFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={() => !reportSubmitting && setReportFormOpen(false)}>
          <form className="w-full max-w-md rounded-3xl border border-slate-600 bg-slate-900 p-5 text-left shadow-2xl" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); void submitProblemReport(); }}>
            <h2 className="text-xl font-black text-white">Reportar problema</h2>
            <p className="mt-1 text-sm text-slate-300">O exercício e seu progresso permanecerão exatamente como estão.</p>
            <label className="mt-4 block text-sm font-bold text-slate-200">Categoria
              <select value={reportCategory} onChange={(event) => setReportCategory(event.target.value as ExerciseReportCategory)} disabled={reportSubmitting} className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-white">
                {EXERCISE_REPORT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-sm font-bold text-slate-200">Comentário (opcional)
              <textarea value={reportComment} onChange={(event) => setReportComment(event.target.value)} maxLength={2000} disabled={reportSubmitting} className="mt-1 min-h-28 w-full rounded-xl border border-slate-600 bg-slate-800 p-3 font-normal text-white" placeholder="Conte o que aconteceu…" />
            </label>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" disabled={reportSubmitting} onClick={() => setReportFormOpen(false)} className="rounded-xl border border-slate-600 p-3 font-black text-white disabled:opacity-50">Cancelar</button>
              <button type="submit" disabled={reportSubmitting} className="rounded-xl bg-blue-600 p-3 font-black text-white disabled:opacity-50">{reportSubmitting ? 'Enviando…' : 'Enviar relatório'}</button>
            </div>
          </form>
        </div>
      )}
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
              <div className="rounded-2xl bg-slate-800 p-4"><span className="text-xs text-slate-400">Incorrect attempts</span><p className="font-black text-white">{masterySummary.totalIncorrectAttempts}</p><p className="text-[11px] text-slate-400">{masterySummary.exercisesReviewed} exercises corrected</p></div>
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
                      <p className="text-[11px] text-slate-400">{finalTestReport[skill].correctedAfterError} corrected · {finalTestReport[skill].incorrectAttempts} errors</p>
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
              <button onClick={isReplay ? backToTrail : () => handleDayContinue(leaveExercise)} className="w-full rounded-2xl border border-slate-600 px-6 py-3 font-black uppercase text-slate-100">Back to trail</button>
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
