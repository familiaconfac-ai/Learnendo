import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { LiveExerciseBlock, LiveExerciseBlockStatus, LiveExerciseSession } from '../../types';
import {
  clearExerciseBlockStudentResponse,
  createExerciseBlock,
  endExerciseSession,
  saveExerciseSession,
  setExerciseBlockStudentLock,
  setExerciseBlockStudentStatus,
  subscribeExerciseBlocks,
  subscribeExerciseSession,
  updateExerciseBlock,
  updateExerciseBlockResponse,
} from '../../services/liveSessionService';

interface ExerciseSessionPanelProps {
  classId: string;
  user: User;
  isTeacher: boolean;
  assignedRoster: Array<{
    uid: string;
    label: string;
    isOnline: boolean;
  }>;
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

function getStudentStatus(block: LiveExerciseBlock, studentUid: string): LiveExerciseBlockStatus {
  const mappedStatus = block.responseStatuses[studentUid];
  if (mappedStatus) return mappedStatus;
  return getStudentResponse(block, studentUid).trim() ? 'in_progress' : 'pending';
}

function isStudentLocked(block: LiveExerciseBlock, studentUid: string) {
  return Boolean(block.responseLocks[studentUid]);
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

    const nextStatus: LiveExerciseBlockStatus = draft.trim()
      ? (ownStatus === 'done' ? 'done' : 'in_progress')
      : 'pending';

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
    } catch (error) {
      console.warn('[ExerciseSessionPanel] end session failed:', error);
      setActionError('Unable to end the exercise session right now.');
    } finally {
      setSavingSessionState(false);
    }
  };

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-slate-900 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-violet-300">Exercise Session</h2>
          <p className="mt-1 text-sm text-slate-200">
            Every exercise stores one live response per student. Teachers can follow the whole class in real time.
          </p>
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
