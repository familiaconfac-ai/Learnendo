import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { Day, Lesson, LiveClassSession, LiveExerciseAnswerVerdict, LiveExerciseBlock, LiveExerciseBlockStatus, LiveExerciseSession, Workbook } from '../../types';
import {
  clearExerciseBlockStudentResponse,
  createExerciseBlock,
  endExerciseSession,
  saveExerciseSession,
  seedExerciseSessionFromLessonTrails,
  setExerciseBlockStudentLock,
  setExerciseBlockStudentStatus,
  subscribeExerciseBlocks,
  subscribeExerciseSession,
  updateExerciseBlock,
  updateExerciseBlockResponse,
} from '../../services/liveSessionService';
import { getWorkbookOptionsForCourse, loadWorkbookForWhiteboard, resolveLessonForWhiteboard } from '../../services/liveWhiteboardActivities';

interface ExerciseSessionPanelProps {
  classId: string;
  user: User;
  isTeacher: boolean;
  assignedRoster: Array<{
    uid: string;
    label: string;
    isOnline: boolean;
  }>;
  defaultCourseId?: string;
  defaultWorkbookId?: number | null;
  defaultLessonId?: string | null;
  onUpdateSession?: (patch: Partial<LiveClassSession>) => Promise<void>;
}

interface TeacherExerciseBlockCardProps {
  block: LiveExerciseBlock;
  roster: ExerciseSessionPanelProps['assignedRoster'];
  actorUid: string;
  actorName: string;
  classId: string;
}

interface StudentExerciseBlockCardProps {
  block: LiveExerciseBlock;
  actorUid: string;
  actorName: string;
  actorLabel: string;
  classId: string;
  canEdit: boolean;
  sessionIsActive: boolean;
}

const EMPTY_SESSION: LiveExerciseSession = {
  title: '',
  isActive: false,
};

const statusClassName: Record<LiveExerciseBlockStatus, string> = {
  pending: 'border-slate-600 bg-slate-800 text-slate-200',
  in_progress: 'border-amber-400/40 bg-amber-500/20 text-amber-200',
  done: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200',
};

const getActorName = (user: User) => user.displayName || user.email || 'Learnendo user';

function getExerciseErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'permission-denied') {
    return 'Your account does not have permission to update this exercise right now.';
  }
  return fallback;
}

const getStatusLabel = (status: LiveExerciseBlockStatus) => {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'done') return 'Done';
  return 'Pending';
};

function getStudentResponse(block: LiveExerciseBlock, studentUid: string) {
  return block.responses[studentUid] ?? '';
}

function normalizeExerciseAnswer(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getStudentStatus(block: LiveExerciseBlock, studentUid: string): LiveExerciseBlockStatus {
  const mappedStatus = block.responseStatuses[studentUid];
  if (mappedStatus) return mappedStatus;
  return getStudentResponse(block, studentUid).trim() ? 'in_progress' : 'pending';
}

function isStudentLocked(block: LiveExerciseBlock, studentUid: string) {
  return Boolean(block.responseLocks[studentUid]);
}

function getStudentVerdict(block: LiveExerciseBlock, studentUid: string): LiveExerciseAnswerVerdict | null {
  return block.responseVerdicts[studentUid] ?? null;
}

function evaluateResponseVerdict(block: LiveExerciseBlock, answer: string, attempts: number): LiveExerciseAnswerVerdict | null {
  const normalizedAnswer = normalizeExerciseAnswer(answer);
  if (!normalizedAnswer) return null;

  const acceptedAnswers = [
    ...(block.acceptedAnswers ?? []),
    ...(block.expectedAnswer ? [block.expectedAnswer] : []),
  ]
    .map(normalizeExerciseAnswer)
    .filter(Boolean);

  if (acceptedAnswers.length === 0) return null;
  const isCorrect = acceptedAnswers.includes(normalizedAnswer);
  if (!isCorrect) return 'wrong';
  return attempts > 1 ? 'correct_second_try' : 'correct';
}

const TeacherExerciseBlockCard: React.FC<TeacherExerciseBlockCardProps> = ({
  block,
  roster,
  actorUid,
  actorName,
  classId,
}) => {
  const [promptDraft, setPromptDraft] = useState(block.prompt);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPromptDraft(block.prompt);
    setError('');
  }, [block.id, block.prompt]);

  const handleSaveDetails = async () => {
    setSaving(true);
    setError('');
    try {
      await updateExerciseBlock(
        classId,
        block.id,
        {
          prompt: promptDraft,
        },
        actorUid,
        actorName,
      );
    } catch (saveError) {
      console.warn('[ExerciseSessionPanel] block details update failed:', saveError);
      setError(getExerciseErrorMessage(saveError, 'Unable to save this exercise block right now.'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (studentUid: string, status: LiveExerciseBlockStatus) => {
    setSaving(true);
    setError('');
    try {
      await setExerciseBlockStudentStatus(classId, block.id, studentUid, status, actorUid, actorName);
    } catch (saveError) {
      console.warn('[ExerciseSessionPanel] block status update failed:', saveError);
      setError(getExerciseErrorMessage(saveError, 'Unable to update the student status right now.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLock = async (studentUid: string, nextLocked: boolean) => {
    setSaving(true);
    setError('');
    try {
      await setExerciseBlockStudentLock(
        classId,
        block.id,
        studentUid,
        nextLocked,
        actorUid,
        actorName,
      );
    } catch (saveError) {
      console.warn('[ExerciseSessionPanel] block lock update failed:', saveError);
      setError(getExerciseErrorMessage(saveError, 'Unable to change edit permissions right now.'));
    } finally {
      setSaving(false);
    }
  };

  const handleClearAnswer = async (studentUid: string) => {
    setSaving(true);
    setError('');
    try {
      await clearExerciseBlockStudentResponse(
        classId,
        block.id,
        studentUid,
        actorUid,
        actorName,
      );
    } catch (saveError) {
      console.warn('[ExerciseSessionPanel] block clear failed:', saveError);
      setError(getExerciseErrorMessage(saveError, 'Unable to clear this response right now.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-black uppercase tracking-wide text-cyan-200">
            Exercise {block.order}
          </span>
          <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200">
            {roster.length} students
          </span>
        </div>
        {block.updatedBy?.name ? (
          <span className="text-xs text-slate-400">
            Last change by {block.updatedBy.name}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-200">
          {error}
        </p>
      ) : null}

      <label className="mt-3 block text-xs font-black uppercase tracking-wide text-slate-400">
        Prompt
      </label>
      <textarea
        value={promptDraft}
        onChange={(event) => setPromptDraft(event.target.value)}
        className="mt-2 h-24 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500"
        placeholder="Write the instruction or exercise prompt here..."
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleSaveDetails()}
          disabled={saving}
          className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 shadow-[0_4px_0_0_#0891b2] disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Prompt'}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        {roster.map((student) => {
          const response = getStudentResponse(block, student.uid);
          const status = getStudentStatus(block, student.uid);
          const locked = isStudentLocked(block, student.uid);

          return (
            <section key={student.uid} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClassName[status]}`}>
                    {getStatusLabel(status)}
                  </span>
                  <span className="text-sm font-bold text-white">
                    {student.label}
                  </span>
                  <span className={`text-xs ${student.isOnline ? 'text-emerald-300' : 'text-slate-500'}`}>
                    {student.isOnline ? 'online' : 'offline'}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {locked ? 'Editing locked' : 'Live response'}
                </span>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Response</p>
                <p className="mt-2 min-h-[88px] whitespace-pre-wrap text-sm text-slate-100">
                  {response.trim() || 'No answer yet.'}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleStatusChange(student.uid, 'pending')}
                  disabled={saving}
                  className="rounded-xl border border-slate-600 px-3 py-2 text-xs font-bold text-slate-200"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => void handleStatusChange(student.uid, 'done')}
                  disabled={saving}
                  className="rounded-xl border border-emerald-500/40 px-3 py-2 text-xs font-bold text-emerald-200"
                >
                  Mark Done
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleLock(student.uid, !locked)}
                  disabled={saving}
                  className="rounded-xl border border-amber-500/40 px-3 py-2 text-xs font-bold text-amber-200"
                >
                  {locked ? 'Unlock Editing' : 'Lock Editing'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleClearAnswer(student.uid)}
                  disabled={saving}
                  className="rounded-xl border border-rose-500/40 px-3 py-2 text-xs font-bold text-rose-200"
                >
                  Clear Response
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
};

const StudentExerciseBlockCard: React.FC<StudentExerciseBlockCardProps> = ({
  block,
  actorUid,
  actorName,
  actorLabel,
  classId,
  canEdit,
  sessionIsActive,
}) => {
  const ownAnswer = getStudentResponse(block, actorUid);
  const ownStatus = getStudentStatus(block, actorUid);
  const ownVerdict = getStudentVerdict(block, actorUid);
  const locked = isStudentLocked(block, actorUid);
  const [draft, setDraft] = useState(ownAnswer);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(ownAnswer);
    setError('');
    setSaveState('idle');
  }, [block.id, ownAnswer]);

  const handleSubmit = async () => {
    if (!canEdit) return;

    const trimmedDraft = draft.trim();
    const nextAttempts = trimmedDraft ? Math.max(1, (block.responseAttempts[actorUid] ?? 0) + 1) : 0;
    const verdict = trimmedDraft ? evaluateResponseVerdict(block, trimmedDraft, nextAttempts) : null;
    const nextStatus: LiveExerciseBlockStatus = !trimmedDraft
      ? 'pending'
      : verdict === 'correct' || verdict === 'correct_second_try'
        ? 'done'
        : 'in_progress';

    setSaveState('saving');
    setError('');

    try {
      console.info('[ExerciseSessionPanel] student response submit', {
        classId,
        blockId: block.id,
        actorUid,
        responseLength: draft.length,
        nextStatus,
      });
      await updateExerciseBlockResponse(
        classId,
        block.id,
        actorUid,
        draft,
        nextStatus,
        actorUid,
        actorName,
        {
          attempts: nextAttempts,
          verdict: verdict ?? undefined,
          answeredAt: new Date().toISOString(),
        },
      );
      setSaveState('saved');
    } catch (saveError) {
      console.warn('[ExerciseSessionPanel] student response submit failed:', saveError);
      setError(getExerciseErrorMessage(saveError, 'Unable to sync your answer right now.'));
      setSaveState('idle');
    }
  };

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-black uppercase tracking-wide text-cyan-200">
            Exercise {block.order}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClassName[ownStatus]}`}>
            {getStatusLabel(ownStatus)}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {locked
            ? 'Locked by teacher'
            : ownStatus === 'done'
              ? 'Marked done by teacher'
              : (sessionIsActive ? 'Live editing' : 'Session closed')}
        </span>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Prompt</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-100">
          {block.prompt.trim() || 'Your teacher will add the prompt here.'}
        </p>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-200">
          {error}
        </p>
      ) : null}

      {ownVerdict ? (
        <p
          className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold ${
            ownVerdict === 'correct' || ownVerdict === 'correct_second_try'
              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
              : 'border-amber-500/40 bg-amber-950/30 text-amber-200'
          }`}
        >
          {ownVerdict === 'correct'
            ? 'Correct answer'
            : ownVerdict === 'correct_second_try'
              ? 'Correct on the second try'
              : 'Answer saved. You can try again.'}
        </p>
      ) : null}

      <textarea
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setSaveState('idle');
        }}
        disabled={!canEdit}
        className="mt-3 h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-70"
        placeholder={canEdit ? 'Type your answer here, then tap Submit.' : 'Your answer is read-only right now.'}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-400">{actorLabel}</span>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canEdit || saveState === 'saving' || draft === ownAnswer}
          className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 shadow-[0_4px_0_0_#0891b2] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        >
          {saveState === 'saving' ? 'Submitting...' : 'Submit Response'}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>{draft === ownAnswer ? 'No pending edits' : 'Unsaved changes'}</span>
        <span>
          {saveState === 'saving'
            ? 'Submitting...'
            : saveState === 'saved'
              ? 'Submitted'
              : 'Waiting for submit'}
        </span>
      </div>
    </article>
  );
};

export const ExerciseSessionPanel: React.FC<ExerciseSessionPanelProps> = ({
  classId,
  user,
  isTeacher,
  assignedRoster,
  defaultCourseId = 'english',
  defaultWorkbookId = 1,
  defaultLessonId = '',
  onUpdateSession,
}) => {
  const [session, setSession] = useState<LiveExerciseSession>(EMPTY_SESSION);
  const [blocks, setBlocks] = useState<LiveExerciseBlock[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [sessionTitleDraft, setSessionTitleDraft] = useState('');
  const [actionError, setActionError] = useState('');
  const [savingSessionState, setSavingSessionState] = useState(false);

  const actorName = getActorName(user);
  const actorLabel = user.displayName || user.email || 'My response';
  const [courseId, setCourseId] = useState(defaultCourseId);
  const [workbookId, setWorkbookId] = useState(defaultWorkbookId ?? 1);
  const [lessonId, setLessonId] = useState(defaultLessonId ?? '');
  const [selectedTrailIds, setSelectedTrailIds] = useState<string[]>([]);
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [loadingWorkbook, setLoadingWorkbook] = useState(false);

  const workbookOptions = useMemo(() => getWorkbookOptionsForCourse(courseId), [courseId]);
  const lessonOptions = useMemo(() => workbook?.lessons ?? [], [workbook]);
  const selectedLesson = useMemo(() => resolveLessonForWhiteboard(workbook, lessonId), [lessonId, workbook]);
  const trailOptions = useMemo(() => selectedLesson?.days ?? [], [selectedLesson]);

  useEffect(() => {
    let active = true;
    setLoadingWorkbook(true);

    loadWorkbookForWhiteboard(courseId, workbookId)
      .then((nextWorkbook) => {
        if (!active) return;
        setWorkbook(nextWorkbook);
        const nextLesson = resolveLessonForWhiteboard(nextWorkbook, lessonId);
        const resolvedLessonId = nextLesson?.id ?? nextWorkbook?.lessons?.[0]?.id ?? '';
        setLessonId((previous) => previous || resolvedLessonId);
      })
      .catch((error) => {
        console.warn('[ExerciseSessionPanel] workbook load failed:', error);
        if (!active) return;
        setWorkbook(null);
        setActionError('Unable to load the selected workbook right now.');
      })
      .finally(() => {
        if (active) setLoadingWorkbook(false);
      });

    return () => {
      active = false;
    };
  }, [courseId, lessonId, workbookId]);

  useEffect(() => {
    if (!trailOptions.length) {
      setSelectedTrailIds([]);
      return;
    }

    setSelectedTrailIds((previous) => {
      const filtered = previous.filter((trailId) => trailOptions.some((trail) => trail.id === trailId));
      if (filtered.length > 0) return filtered;
      return [trailOptions[0].id];
    });
  }, [trailOptions]);

  useEffect(() => {
    setLoadingSession(true);
    setActionError('');

    const unsubscribe = subscribeExerciseSession(
      classId,
      (next) => {
        setSession(next);
        setSessionTitleDraft(next.title);
        setLoadingSession(false);
      },
      (error) => {
        console.warn('[ExerciseSessionPanel] session subscription failed:', error);
        setLoadingSession(false);
        setActionError('Unable to load the exercise session right now.');
      },
    );

    return unsubscribe;
  }, [classId]);

  useEffect(() => {
    setLoadingBlocks(true);
    setActionError('');

    const unsubscribe = subscribeExerciseBlocks(
      classId,
      (next) => {
        console.info('[ExerciseSessionPanel] blocks realtime update', {
          classId,
          blockCount: next.length,
          viewerUid: user.uid,
          isTeacher,
        });
        setBlocks(next);
        setLoadingBlocks(false);
      },
      (error) => {
        console.warn('[ExerciseSessionPanel] blocks subscription failed:', error);
        setLoadingBlocks(false);
        setActionError('Unable to load the exercise blocks right now.');
      },
    );

    return unsubscribe;
  }, [classId]);

  const visibleBlocks = useMemo(() => blocks, [blocks]);

  const completedCount = useMemo(() => {
    if (isTeacher) {
      return blocks.reduce(
        (total, block) => total + assignedRoster.filter((student) => getStudentStatus(block, student.uid) === 'done').length,
        0,
      );
    }
    return blocks.filter((block) => getStudentStatus(block, user.uid) === 'done').length;
  }, [assignedRoster, blocks, isTeacher, user.uid]);

  const totalResponses = useMemo(() => {
    if (isTeacher) {
      return blocks.length * Math.max(assignedRoster.length, 1);
    }
    return blocks.length;
  }, [assignedRoster.length, blocks.length, isTeacher]);

  const currentBlock = useMemo(() => {
    return blocks.find((block) => {
      if (assignedRoster.length === 0) return true;
      return assignedRoster.some((student) => getStudentStatus(block, student.uid) !== 'done');
    }) ?? blocks[0] ?? null;
  }, [assignedRoster, blocks]);

  const teacherSummary = useMemo(() => {
    if (!currentBlock) {
      return {
        respondedCount: 0,
        accuracyRate: 0,
        pendingStudents: [] as string[],
        mostCommonAnswer: null as string | null,
        topErrorBlock: null as LiveExerciseBlock | null,
        studentRows: [] as Array<{ uid: string; label: string; status: string }>,
      };
    }

    const answerCounts = new Map<string, number>();
    const studentRows = assignedRoster.map((student) => {
      const verdict = getStudentVerdict(currentBlock, student.uid);
      const status = getStudentStatus(currentBlock, student.uid);
      const response = getStudentResponse(currentBlock, student.uid).trim();
      const questionType = currentBlock.questionType ?? '';
      const attempts = currentBlock.responseAttempts[student.uid] ?? 0;

      if (response) {
        answerCounts.set(response, (answerCounts.get(response) ?? 0) + 1);
      }

      let label = 'aguardando';
      if (questionType === 'speaking' && status === 'in_progress' && !response) {
        label = 'gravando audio';
      } else if (!response && status === 'pending') {
        label = 'aguardando';
      } else if (status === 'in_progress' && response) {
        label = verdict === 'wrong' ? 'errou' : 'respondendo';
      } else if (verdict === 'correct_second_try') {
        label = 'acertou na segunda tentativa';
      } else if (verdict === 'correct') {
        label = 'acertou';
      } else if (verdict === 'wrong') {
        label = 'errou';
      } else if (response) {
        label = attempts > 0 ? 'respondeu' : 'respondendo';
      }

      return {
        uid: student.uid,
        label: student.label,
        status: label,
      };
    });

    const respondedCount = studentRows.filter((row) => row.status !== 'aguardando').length;
    const correctCount = assignedRoster.filter((student) => {
      const verdict = getStudentVerdict(currentBlock, student.uid);
      return verdict === 'correct' || verdict === 'correct_second_try';
    }).length;

    const mostCommonAnswer = Array.from(answerCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
    const topErrorBlock = blocks
      .map((block) => ({
        block,
        errorCount: assignedRoster.filter((student) => getStudentVerdict(block, student.uid) === 'wrong').length,
      }))
      .sort((left, right) => right.errorCount - left.errorCount)[0]?.block ?? null;

    return {
      respondedCount,
      accuracyRate: assignedRoster.length > 0 ? Math.round((correctCount / assignedRoster.length) * 100) : 0,
      pendingStudents: studentRows.filter((row) => row.status === 'aguardando').map((row) => row.label),
      mostCommonAnswer,
      topErrorBlock,
      studentRows,
    };
  }, [assignedRoster, blocks, currentBlock]);

  const handleSaveSession = async (nextIsActive = true) => {
    setSavingSessionState(true);
    setActionError('');
    try {
      await saveExerciseSession(
        classId,
        {
          title: sessionTitleDraft.trim() || 'Exercise Session',
          isActive: nextIsActive,
        },
        user.uid,
        actorName,
      );
    } catch (error) {
      console.warn('[ExerciseSessionPanel] session save failed:', error);
      setActionError('Unable to save the exercise session right now.');
    } finally {
      setSavingSessionState(false);
    }
  };

  const handleAddBlock = async () => {
    setSavingSessionState(true);
    setActionError('');
    try {
      await saveExerciseSession(
        classId,
        {
          title: sessionTitleDraft.trim() || session.title || 'Exercise Session',
          isActive: true,
        },
        user.uid,
        actorName,
      );

      const nextOrder = blocks.reduce((highest, block) => Math.max(highest, block.order), 0) + 1;
      await createExerciseBlock(
        classId,
        {
          order: nextOrder,
        },
        user.uid,
        actorName,
      );
    } catch (error) {
      console.warn('[ExerciseSessionPanel] add block failed:', error);
      setActionError('Unable to create a new exercise block right now.');
    } finally {
      setSavingSessionState(false);
    }
  };

  const handleEndSession = async () => {
    setSavingSessionState(true);
    setActionError('');
    try {
      await endExerciseSession(classId, user.uid, actorName);
      await onUpdateSession?.({
        sessionStatus: 'idle',
        activeExerciseId: null,
        activeTrailIds: [],
        activeTrailLabel: null,
        mainStageMode: 'workspace',
      });
    } catch (error) {
      console.warn('[ExerciseSessionPanel] end session failed:', error);
      setActionError('Unable to end the exercise session right now.');
    } finally {
      setSavingSessionState(false);
    }
  };

  const handleStartSelectedTrails = async () => {
    if (!selectedLesson || selectedTrailIds.length === 0) {
      setActionError('Select a lesson and at least one trail before starting the live session.');
      return;
    }

    setSavingSessionState(true);
    setActionError('');
    try {
      const seeded = await seedExerciseSessionFromLessonTrails({
        classId,
        courseId,
        workbookId,
        lessonId: selectedLesson.id,
        trailIds: selectedTrailIds,
        updatedByUid: user.uid,
        updatedByName: actorName,
      });

      await onUpdateSession?.({
        sessionStatus: 'active',
        activeWorkbookId: workbookId,
        activeLessonId: selectedLesson.id,
        activeExerciseId: selectedTrailIds.length === 1 ? selectedTrailIds[0] : null,
        activeTrailIds: seeded.trailIds,
        activeTrailLabel: seeded.trailLabel,
        mainStageMode: 'workspace',
      });
      setSessionTitleDraft(seeded.title);
    } catch (error) {
      console.warn('[ExerciseSessionPanel] trail session seed failed:', error);
      setActionError('Unable to start the selected trail session right now.');
    } finally {
      setSavingSessionState(false);
    }
  };

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-slate-900 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-violet-300">Trail Session</h2>
          <p className="mt-1 text-sm text-slate-200">
            Every trail question stores one live response per student. Teachers can follow the whole class in real time.
          </p>
          {session.sourceTrailLabel ? (
            <p className="mt-2 text-xs font-semibold text-violet-200">
              {session.title || 'Live trail'} - {session.sourceTrailLabel}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full border px-3 py-1 font-bold ${session.isActive ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200' : 'border-slate-600 bg-slate-800 text-slate-200'}`}>
            {session.isActive ? 'Live' : 'Inactive'}
          </span>
          <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 font-bold text-slate-200">
            {completedCount}/{totalResponses} done
          </span>
        </div>
      </div>

      {isTeacher && currentBlock ? (
        <div className="mt-3 rounded-2xl border border-violet-500/30 bg-slate-950/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-violet-200">
                Questao {Math.min(currentBlock.order, blocks.length)}/{Math.max(blocks.length, 1)}
              </p>
              <p className="mt-1 text-sm text-slate-200">{currentBlock.prompt.split('\n')[0]}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 font-bold text-slate-200">
                Respondidos: {teacherSummary.respondedCount}/{Math.max(assignedRoster.length, 1)}
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-bold text-emerald-200">
                Acertos: {teacherSummary.accuracyRate}%
              </span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Status dos alunos</p>
              <div className="mt-2 space-y-1.5 text-sm text-slate-200">
                {teacherSummary.studentRows.map((row) => (
                  <div key={row.uid} className="flex items-center justify-between gap-2 rounded-xl bg-slate-950/60 px-3 py-2">
                    <span className="truncate">{row.label}</span>
                    <span className="text-xs font-semibold text-violet-200">{row.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-200">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Resumo</p>
              <p className="mt-2">
                Ainda sem resposta: {teacherSummary.pendingStudents.length > 0 ? teacherSummary.pendingStudents.join(', ') : 'ninguem'}
              </p>
              <p className="mt-2">
                Resposta mais comum: {teacherSummary.mostCommonAnswer || 'sem respostas ainda'}
              </p>
              <p className="mt-2">
                Questao com mais erros: {teacherSummary.topErrorBlock ? `#${teacherSummary.topErrorBlock.order}` : 'sem erros ainda'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {loadingSession || loadingBlocks ? (
        <p className="mt-3 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
          Loading exercise session...
        </p>
      ) : null}

      {actionError ? (
        <p className="mt-3 rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-200">
          {actionError}
        </p>
      ) : null}

      {isTeacher ? (
        <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-black uppercase tracking-wide text-slate-400">
              Course
              <input
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-normal uppercase text-white"
              />
            </label>
            <label className="text-xs font-black uppercase tracking-wide text-slate-400">
              Book
              <select
                value={String(workbookId)}
                onChange={(event) => setWorkbookId(Number(event.target.value) || 1)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-normal text-white"
              >
                {workbookOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-black uppercase tracking-wide text-slate-400">
              Lesson
              <select
                value={lessonId}
                onChange={(event) => setLessonId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-normal text-white"
                disabled={loadingWorkbook || lessonOptions.length === 0}
              >
                {lessonOptions.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                ))}
              </select>
            </label>
            <div className="text-xs font-black uppercase tracking-wide text-slate-400">
              Trails
              <div className="mt-2 flex flex-wrap gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-3">
                {trailOptions.map((trail, index) => {
                  const isActive = selectedTrailIds.includes(trail.id);
                  return (
                    <button
                      key={trail.id}
                      type="button"
                      onClick={() => {
                        setSelectedTrailIds((previous) => (
                          previous.includes(trail.id)
                            ? previous.filter((value) => value !== trail.id)
                            : [...previous, trail.id]
                        ));
                      }}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                        isActive
                          ? 'border-violet-400 bg-violet-500/20 text-violet-100'
                          : 'border-slate-700 bg-slate-950 text-slate-300'
                      }`}
                    >
                      Trail {index + 1}
                    </button>
                  );
                })}
                {trailOptions.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setSelectedTrailIds(trailOptions.map((trail) => trail.id))}
                    className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200"
                  >
                    All Trails
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <label className="text-xs font-black uppercase tracking-wide text-slate-400">
            Session Title
          </label>
          <input
            type="text"
            value={sessionTitleDraft}
            onChange={(event) => setSessionTitleDraft(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500"
            placeholder="Example: Unit 3 Review - Simple Present"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleStartSelectedTrails()}
              disabled={savingSessionState || selectedTrailIds.length === 0}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950 shadow-[0_4px_0_0_#059669] disabled:opacity-60"
            >
              {savingSessionState ? 'Starting...' : 'Start Selected Trails'}
            </button>
            <button
              type="button"
              onClick={() => void handleSaveSession(true)}
              disabled={savingSessionState}
              className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-black text-white shadow-[0_4px_0_0_#7c3aed] disabled:opacity-60"
            >
              {savingSessionState ? 'Saving...' : (session.isActive ? 'Save Session' : 'Start Session')}
            </button>
            <button
              type="button"
              onClick={() => void handleAddBlock()}
              disabled={savingSessionState}
              className="rounded-xl border border-cyan-500/40 px-4 py-2 text-sm font-bold text-cyan-200"
            >
              Add Exercise
            </button>
            <button
              type="button"
              onClick={() => void handleEndSession()}
              disabled={savingSessionState || (!session.isActive && !session.title && blocks.length === 0)}
              className="rounded-xl border border-rose-500/40 px-4 py-2 text-sm font-bold text-rose-200"
            >
              End Session
            </button>
          </div>
        </div>
      ) : null}

      {!isTeacher && session.title ? (
        <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Current Session</p>
          <p className="mt-1 text-lg font-black text-white">{session.title}</p>
          <p className="mt-1 text-sm text-slate-300">
            {session.isActive
              ? 'Each exercise keeps your own answer private on this side while your teacher sees every response live.'
              : 'This exercise session is currently closed.'}
          </p>
        </div>
      ) : null}

      {!loadingSession && !loadingBlocks && blocks.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-300">
          {isTeacher
            ? 'Create the session title and add the first exercise block. Each block will collect one response per student.'
            : 'The teacher has not started an exercise session for this live class yet.'}
        </div>
      ) : null}

      {isTeacher && assignedRoster.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-300">
          Add students to this live class first so the panel can track one response per student.
        </div>
      ) : null}

      {visibleBlocks.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-3">
          {visibleBlocks.map((block) => (
            isTeacher ? (
              <TeacherExerciseBlockCard
                key={block.id}
                block={block}
                roster={assignedRoster}
                actorUid={user.uid}
                actorName={actorName}
                classId={classId}
              />
            ) : (
              <StudentExerciseBlockCard
                key={block.id}
                block={block}
                actorUid={user.uid}
                actorName={actorName}
                actorLabel={actorLabel}
                classId={classId}
                canEdit={session.isActive && !isStudentLocked(block, user.uid) && getStudentStatus(block, user.uid) !== 'done'}
                sessionIsActive={session.isActive}
              />
            )
          ))}
        </div>
      ) : null}
    </div>
  );
};
