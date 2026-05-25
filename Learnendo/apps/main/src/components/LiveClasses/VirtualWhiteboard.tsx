import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { LiveClassSession, LiveWhiteboardState, Workbook } from '../../types';
import { subscribeLiveWhiteboard, updateLiveWhiteboard } from '../../services/liveSessionService';
import {
  buildLessonExerciseBoard,
  buildManualQuestionBoard,
  getWhiteboardCourseOptions,
  getWorkbookOptionsForCourse,
  loadWorkbookForWhiteboard,
  resolveDayForWhiteboard,
  resolveLessonForWhiteboard,
} from '../../services/liveWhiteboardActivities';
import { WhiteboardActivityBuilder, WhiteboardImportSelection } from './WhiteboardActivityBuilder';
import { StructuredWhiteboardBoard } from './StructuredWhiteboardBoard';

interface VirtualWhiteboardProps {
  classId: string;
  user: User;
  canManageBoard: boolean;
  canEditBoard: boolean;
  allowStudentWhiteboardEdit: boolean;
  courseId?: string;
  defaultWorkbookId?: number | null;
  defaultLessonId?: string | null;
  defaultExerciseId?: string | null;
  onUpdateSession?: (patch: Partial<LiveClassSession>) => Promise<void>;
}

const EMPTY_WHITEBOARD: LiveWhiteboardState = {
  content: '',
  mode: 'free',
  title: '',
  instruction: '',
  sourceCourseId: '',
  sourceWorkbookId: null,
  sourceLessonId: '',
  sourceExerciseId: '',
  blocks: [],
};

function getWhiteboardErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'permission-denied') {
    return 'Your whiteboard change could not be saved because this account does not have permission to update the shared board.';
  }
  return fallback;
}

function normalizeWhiteboardState(input?: LiveWhiteboardState | null): LiveWhiteboardState {
  const blocks = (input?.blocks ?? [])
    .map((block, index) => ({
      id: block.id?.trim() || `block_${index + 1}`,
      prompt: block.prompt ?? '',
      response: block.response ?? '',
      order: Number.isFinite(block.order) ? Number(block.order) : index + 1,
    }))
    .sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order;
      return left.id.localeCompare(right.id);
    });

  return {
    content: input?.content ?? '',
    mode: input?.mode ?? 'free',
    title: input?.title ?? '',
    instruction: input?.instruction ?? '',
    sourceCourseId: input?.sourceCourseId ?? '',
    sourceWorkbookId: Number.isFinite(input?.sourceWorkbookId) ? Number(input?.sourceWorkbookId) : null,
    sourceLessonId: input?.sourceLessonId ?? '',
    sourceExerciseId: input?.sourceExerciseId ?? '',
    blocks,
    updatedByUid: input?.updatedByUid ?? '',
    updatedByName: input?.updatedByName ?? '',
    updatedAt: input?.updatedAt,
  };
}

function serializeWhiteboardState(input?: LiveWhiteboardState | null) {
  const normalized = normalizeWhiteboardState(input);
  return JSON.stringify({
    mode: normalized.mode ?? 'free',
    title: normalized.title ?? '',
    instruction: normalized.instruction ?? '',
    content: normalized.content ?? '',
    sourceCourseId: normalized.sourceCourseId ?? '',
    sourceWorkbookId: normalized.sourceWorkbookId ?? null,
    sourceLessonId: normalized.sourceLessonId ?? '',
    sourceExerciseId: normalized.sourceExerciseId ?? '',
    blocks: (normalized.blocks ?? []).map((block) => ({
      id: block.id,
      prompt: block.prompt,
      response: block.response,
      order: block.order,
    })),
  });
}

function createBlankFreeBoard(previous?: LiveWhiteboardState): LiveWhiteboardState {
  return {
    ...EMPTY_WHITEBOARD,
    content: previous?.mode === 'free' ? previous.content ?? '' : '',
  };
}

export const VirtualWhiteboard: React.FC<VirtualWhiteboardProps> = ({
  classId,
  user,
  canManageBoard,
  canEditBoard,
  allowStudentWhiteboardEdit,
  courseId = 'english',
  defaultWorkbookId = 1,
  defaultLessonId = '',
  defaultExerciseId = '',
  onUpdateSession,
}) => {
  const [whiteboard, setWhiteboard] = useState<LiveWhiteboardState>(EMPTY_WHITEBOARD);
  const [draftWhiteboard, setDraftWhiteboard] = useState<LiveWhiteboardState>(EMPTY_WHITEBOARD);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<'idle' | 'syncing'>('idle');
  const [error, setError] = useState('');
  const [updatingPermission, setUpdatingPermission] = useState(false);
  const [activityPanelOpen, setActivityPanelOpen] = useState(false);
  const [activityMode, setActivityMode] = useState<'free' | 'manual-questions' | 'lesson-exercise'>('free');
  const [manualTitle, setManualTitle] = useState('');
  const [manualInstruction, setManualInstruction] = useState('');
  const [manualPromptsText, setManualPromptsText] = useState('');
  const [importSelection, setImportSelection] = useState<WhiteboardImportSelection>({
    courseId,
    workbookId: defaultWorkbookId ?? 1,
    lessonId: defaultLessonId ?? '',
    exerciseId: defaultExerciseId ?? '',
  });
  const [availableWorkbook, setAvailableWorkbook] = useState<Workbook | null>(null);
  const [loadingWorkbook, setLoadingWorkbook] = useState(false);
  const [activityError, setActivityError] = useState('');
  const syncTimeoutRef = useRef<number | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const lastRemoteSerializedRef = useRef(serializeWhiteboardState(EMPTY_WHITEBOARD));
  const latestDraftSerializedRef = useRef(serializeWhiteboardState(EMPTY_WHITEBOARD));
  const pendingLocalPublishRef = useRef<string | null>(null);
  const actorName = user.displayName || user.email || 'Learnendo user';
  const isStudentView = !canManageBoard;
  const courseOptions = useMemo(() => getWhiteboardCourseOptions(), []);
  const workbookOptions = useMemo(
    () => getWorkbookOptionsForCourse(importSelection.courseId),
    [importSelection.courseId],
  );
  const selectedLesson = useMemo(
    () => resolveLessonForWhiteboard(availableWorkbook, importSelection.lessonId),
    [availableWorkbook, importSelection.lessonId],
  );
  const selectedExercise = useMemo(
    () => resolveDayForWhiteboard(selectedLesson, importSelection.exerciseId),
    [selectedLesson, importSelection.exerciseId],
  );
  const isStructuredMode = draftWhiteboard.mode === 'manual-questions' || draftWhiteboard.mode === 'lesson-exercise';
  const structuredBlocks = draftWhiteboard.blocks ?? [];
  const hasStructuredBlocks = structuredBlocks.length > 0;

  useEffect(() => {
    latestDraftSerializedRef.current = serializeWhiteboardState(draftWhiteboard);
  }, [draftWhiteboard]);

  useEffect(() => {
    setImportSelection((previous) => ({
      courseId: previous.courseId || courseId,
      workbookId: previous.workbookId || defaultWorkbookId || 1,
      lessonId: previous.lessonId || defaultLessonId || '',
      exerciseId: previous.exerciseId || defaultExerciseId || '',
    }));
  }, [courseId, defaultExerciseId, defaultLessonId, defaultWorkbookId]);

  useEffect(() => {
    if (!canManageBoard) return () => {};

    let active = true;
    setLoadingWorkbook(true);
    setActivityError('');

    loadWorkbookForWhiteboard(importSelection.courseId, importSelection.workbookId)
      .then((workbook) => {
        if (!active) return;
        setAvailableWorkbook(workbook);

        const resolvedLesson = resolveLessonForWhiteboard(workbook, importSelection.lessonId);
        const nextLessonId = resolvedLesson?.id ?? workbook?.lessons?.[0]?.id ?? '';
        const resolvedExercise = resolveDayForWhiteboard(resolvedLesson, importSelection.exerciseId);
        const nextExerciseId = resolvedExercise?.id ?? resolvedLesson?.days?.[0]?.id ?? '';

        setImportSelection((previous) => {
          if (
            previous.lessonId === nextLessonId
            && previous.exerciseId === nextExerciseId
            && previous.courseId === importSelection.courseId
            && previous.workbookId === importSelection.workbookId
          ) {
            return previous;
          }
          return {
            ...previous,
            lessonId: nextLessonId,
            exerciseId: nextExerciseId,
          };
        });
      })
      .catch((loadError) => {
        console.warn('[VirtualWhiteboard] workbook load failed:', loadError);
        if (!active) return;
        setAvailableWorkbook(null);
        setActivityError('Unable to load workbook content for the whiteboard right now.');
      })
      .finally(() => {
        if (active) setLoadingWorkbook(false);
      });

    return () => {
      active = false;
    };
  }, [canManageBoard, importSelection.courseId, importSelection.exerciseId, importSelection.lessonId, importSelection.workbookId]);

  useEffect(() => {
    setLoading(true);
    setError('');
    lastRemoteSerializedRef.current = serializeWhiteboardState(EMPTY_WHITEBOARD);
    pendingLocalPublishRef.current = null;

    const unsubscribe = subscribeLiveWhiteboard(
      classId,
      (next) => {
        const normalized = normalizeWhiteboardState(next);
        const nextSerialized = serializeWhiteboardState(normalized);
        console.info('[VirtualWhiteboard] realtime update received', {
          classId,
          viewerUid: user.uid,
          updatedByUid: normalized.updatedByUid ?? '',
          contentLength: normalized.content?.length ?? 0,
          blockCount: normalized.blocks?.length ?? 0,
          mode: normalized.mode ?? 'free',
        });
        setWhiteboard(normalized);
        lastRemoteSerializedRef.current = nextSerialized;

        if (
          pendingLocalPublishRef.current
          && pendingLocalPublishRef.current !== nextSerialized
          && latestDraftSerializedRef.current !== nextSerialized
        ) {
          setLoading(false);
          return;
        }

        if (pendingLocalPublishRef.current === nextSerialized) {
          pendingLocalPublishRef.current = null;
        }

        isApplyingRemoteRef.current = true;
        setDraftWhiteboard(normalized);
        setLoading(false);
        setError('');
        setSyncState('idle');
        window.setTimeout(() => {
          isApplyingRemoteRef.current = false;
        }, 0);
      },
      (subscriptionError) => {
        console.warn('[VirtualWhiteboard] subscription failed:', subscriptionError);
        setLoading(false);
        setError('Unable to load the shared whiteboard right now.');
      },
    );
    return () => {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }
      unsubscribe();
    };
  }, [classId, user.uid]);

  useEffect(() => {
    if (loading || isApplyingRemoteRef.current) return () => {};
    if (!canEditBoard) {
      setSyncState('idle');
      return () => {};
    }

    const serializedDraft = serializeWhiteboardState(draftWhiteboard);
    if (serializedDraft === lastRemoteSerializedRef.current) {
      setSyncState('idle');
      return () => {};
    }

    setSyncState('syncing');
    setError('');

    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      const normalizedDraft = normalizeWhiteboardState(draftWhiteboard);
      pendingLocalPublishRef.current = serializeWhiteboardState(normalizedDraft);
      console.info('[VirtualWhiteboard] submitting shared update', {
        classId,
        actorUid: user.uid,
        contentLength: normalizedDraft.content.length,
        blockCount: normalizedDraft.blocks?.length ?? 0,
        mode: normalizedDraft.mode ?? 'free',
      });
      void updateLiveWhiteboard(
        classId,
        normalizedDraft,
        user.uid,
        actorName,
      )
        .catch((saveError) => {
          console.warn('[VirtualWhiteboard] autosync failed:', saveError);
          pendingLocalPublishRef.current = null;
          setError(getWhiteboardErrorMessage(saveError, 'Unable to sync the shared whiteboard right now.'));
          setSyncState('idle');
        });
    }, 150);

    return () => {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [actorName, canEditBoard, classId, draftWhiteboard, loading, user.uid]);

  const handleToggleStudentEdit = async () => {
    if (!canManageBoard || !onUpdateSession) return;
    setUpdatingPermission(true);
    setError('');
    try {
      await onUpdateSession({ allowStudentWhiteboardEdit: !allowStudentWhiteboardEdit });
    } catch (permissionError) {
      console.warn('[VirtualWhiteboard] whiteboard permission update failed:', permissionError);
      setError('Unable to update whiteboard editing permissions right now.');
    } finally {
      setUpdatingPermission(false);
    }
  };

  const handleClear = async () => {
    if (!canManageBoard) return;
    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
    }
    setSyncState('syncing');
    setError('');
    try {
      const nextBoard = createBlankFreeBoard(draftWhiteboard);
      setDraftWhiteboard(nextBoard);
      await updateLiveWhiteboard(classId, nextBoard, user.uid, actorName);
    } catch (clearError) {
      console.warn('[VirtualWhiteboard] clear failed:', clearError);
      setError(getWhiteboardErrorMessage(clearError, 'Unable to clear the shared whiteboard right now.'));
    } finally {
      setSyncState('idle');
    }
  };

  const applyDraftUpdate = (updater: (previous: LiveWhiteboardState) => LiveWhiteboardState) => {
    setDraftWhiteboard((previous) => normalizeWhiteboardState(updater(normalizeWhiteboardState(previous))));
  };

  const handleContentChange = (value: string) => {
    applyDraftUpdate((previous) => ({
      ...previous,
      mode: 'free',
      content: value,
      title: '',
      instruction: '',
      sourceCourseId: '',
      sourceWorkbookId: null,
      sourceLessonId: '',
      sourceExerciseId: '',
      blocks: [],
    }));
  };

  const handleBlockResponseChange = (blockId: string, value: string) => {
    applyDraftUpdate((previous) => ({
      ...previous,
      blocks: (previous.blocks ?? []).map((block) => (
        block.id === blockId ? { ...block, response: value } : block
      )),
    }));
  };

  const handleClearBlockResponse = (blockId: string) => {
    applyDraftUpdate((previous) => ({
      ...previous,
      blocks: (previous.blocks ?? []).map((block) => (
        block.id === blockId ? { ...block, response: '' } : block
      )),
    }));
  };

  const handleResetResponses = () => {
    applyDraftUpdate((previous) => ({
      ...previous,
      content: previous.mode === 'free' ? '' : previous.content,
      blocks: (previous.blocks ?? []).map((block) => ({
        ...block,
        response: '',
      })),
    }));
  };

  const handleResetActivity = () => {
    applyDraftUpdate(() => createBlankFreeBoard());
  };

  const handleApplyFreeWriting = () => {
    setActivityError('');
    applyDraftUpdate((previous) => createBlankFreeBoard(previous));
    setActivityPanelOpen(false);
  };

  const handleApplyManualQuestions = () => {
    const prompts = manualPromptsText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!prompts.length) {
      setActivityError('Add at least one manual question before loading the activity.');
      return;
    }

    setActivityError('');
    applyDraftUpdate((previous) => buildManualQuestionBoard(manualTitle, manualInstruction, prompts, previous));
    setActivityPanelOpen(false);
  };

  const handleApplyImportedLesson = () => {
    if (!selectedLesson || !selectedExercise) {
      setActivityError('Select a lesson and exercise before importing to the whiteboard.');
      return;
    }

    setActivityError('');
    applyDraftUpdate(() => buildLessonExerciseBoard(
      importSelection.courseId,
      importSelection.workbookId,
      selectedLesson,
      selectedExercise,
    ));
    setActivityPanelOpen(false);
  };

  return (
    <div className={`rounded-2xl border border-cyan-500/30 bg-slate-900 ${isStudentView ? 'p-3 sm:p-4' : 'p-4'}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-cyan-300">
            {isStudentView ? 'Shared Board' : 'Virtual Whiteboard'}
          </h2>
          {!isStudentView ? (
            <p className="mt-1 text-sm text-slate-200">
              Type prompts, corrections, examples, or short activities here. Everyone in the room sees the same board in real time.
            </p>
          ) : null}
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {canManageBoard
              ? `Student editing ${allowStudentWhiteboardEdit ? 'enabled' : 'disabled'}`
              : canEditBoard
                ? 'Collaborative editing enabled'
                : 'Waiting for teacher to enable editing'}
          </p>
        </div>
        {whiteboard.updatedAt ? (
          <div className="text-xs text-slate-400">
            Last update by {whiteboard.updatedByName || 'someone'}
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-3 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
          Loading shared whiteboard...
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-200">
          {error}
        </p>
      ) : null}

      {canManageBoard ? (
        <WhiteboardActivityBuilder
          activityPanelOpen={activityPanelOpen}
          activityMode={activityMode}
          manualTitle={manualTitle}
          manualInstruction={manualInstruction}
          manualPromptsText={manualPromptsText}
          importSelection={importSelection}
          courseOptions={courseOptions}
          workbookOptions={workbookOptions}
          lessonOptions={availableWorkbook?.lessons ?? []}
          exerciseOptions={selectedLesson?.days ?? []}
          loadingWorkbook={loadingWorkbook}
          activityError={activityError}
          selectedLessonTitle={selectedLesson?.title}
          selectedExerciseItemCount={selectedExercise?.exercises.length}
          onToggleOpen={() => setActivityPanelOpen((previous) => !previous)}
          onSelectMode={setActivityMode}
          onManualTitleChange={setManualTitle}
          onManualInstructionChange={setManualInstruction}
          onManualPromptsTextChange={setManualPromptsText}
          onImportSelectionChange={(next) => {
            const nextWorkbookOptions = getWorkbookOptionsForCourse(next.courseId);
            setImportSelection({
              ...next,
              workbookId: next.workbookId || nextWorkbookOptions[0]?.id || 1,
            });
          }}
          onApplyFreeWriting={handleApplyFreeWriting}
          onApplyManualQuestions={handleApplyManualQuestions}
          onApplyImportedLesson={handleApplyImportedLesson}
        />
      ) : null}

      {isStructuredMode ? (
        <StructuredWhiteboardBoard
          whiteboard={draftWhiteboard}
          blocks={structuredBlocks}
          canManageBoard={canManageBoard}
          canEditBoard={canEditBoard}
          isStudentView={isStudentView}
          loading={loading}
          onBlockResponseChange={handleBlockResponseChange}
          onClearBlockResponse={handleClearBlockResponse}
        />
      ) : (
        <textarea
          value={draftWhiteboard.content}
          onChange={(event) => handleContentChange(event.target.value)}
          className={`mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base leading-relaxed text-white placeholder:text-slate-500 ${isStudentView ? 'h-[70vh] sm:h-[60vh]' : 'h-64 sm:h-72'}`}
          placeholder={isStudentView
            ? 'Write here and everyone in the room will see it live.'
            : 'Write a sentence, paste a prompt, ask students to correct a mistake, or let them answer here...'}
          disabled={loading}
          readOnly={!canEditBoard}
        />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-400">
          {syncState === 'syncing'
            ? 'Syncing whiteboard...'
            : !canEditBoard
              ? 'Shared board is view-only right now'
              : isStudentView
              ? 'Live board synced'
              : 'Shared board synced'}
        </span>
        {canManageBoard ? (
          <button
            type="button"
            onClick={() => void handleToggleStudentEdit()}
            disabled={updatingPermission || loading}
            className="rounded-xl border border-cyan-500/40 px-4 py-2 text-sm font-bold text-cyan-200"
          >
            {updatingPermission
              ? 'Updating Access...'
              : allowStudentWhiteboardEdit
                ? 'Disable Students Editing'
                : 'Enable Students Editing'}
          </button>
        ) : null}
        {canManageBoard && isStructuredMode ? (
          <>
            <button
              type="button"
              onClick={handleResetResponses}
              disabled={syncState === 'syncing' || loading}
              className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-slate-200"
            >
              Clear All Responses
            </button>
            <button
              type="button"
              onClick={handleResetActivity}
              disabled={syncState === 'syncing' || loading}
              className="rounded-xl border border-amber-500/40 px-4 py-2 text-sm font-bold text-amber-200"
            >
              Reset Activity
            </button>
          </>
        ) : null}
        {canManageBoard ? (
          <button
            type="button"
            onClick={() => void handleClear()}
            disabled={syncState === 'syncing' || loading || (!draftWhiteboard.content.trim() && !hasStructuredBlocks)}
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-slate-200"
          >
            Clear Board
          </button>
        ) : null}
      </div>
    </div>
  );
};
