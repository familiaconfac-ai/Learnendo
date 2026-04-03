import React, { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { LiveWhiteboardState } from '../../types';
import { subscribeLiveWhiteboard, updateLiveWhiteboard } from '../../services/liveSessionService';

interface VirtualWhiteboardProps {
  classId: string;
  user: User;
  canManageBoard: boolean;
  canEditBoard: boolean;
  allowStudentWhiteboardEdit: boolean;
  onUpdateSession?: (patch: { allowStudentWhiteboardEdit?: boolean }) => Promise<void>;
}

function getWhiteboardErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'permission-denied') {
    return 'Your whiteboard change could not be saved because this account does not have permission to update the shared board.';
  }
  return fallback;
}

export const VirtualWhiteboard: React.FC<VirtualWhiteboardProps> = ({
  classId,
  user,
  canManageBoard,
  canEditBoard,
  allowStudentWhiteboardEdit,
  onUpdateSession,
}) => {
  const [whiteboard, setWhiteboard] = useState<LiveWhiteboardState>({ content: '' });
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<'idle' | 'syncing'>('idle');
  const [error, setError] = useState('');
  const [updatingPermission, setUpdatingPermission] = useState(false);
  const syncTimeoutRef = useRef<number | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const lastRemoteContentRef = useRef('');
  const latestDraftRef = useRef('');
  const pendingLocalPublishRef = useRef<string | null>(null);
  const actorName = user.displayName || user.email || 'Learnendo user';
  const isStudentView = !canManageBoard;

  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    setLoading(true);
    setError('');
    lastRemoteContentRef.current = '';
    pendingLocalPublishRef.current = null;

    const unsubscribe = subscribeLiveWhiteboard(
      classId,
      (next) => {
        console.info('[VirtualWhiteboard] realtime update received', {
          classId,
          viewerUid: user.uid,
          updatedByUid: next.updatedByUid ?? '',
          contentLength: next.content?.length ?? 0,
        });
        setWhiteboard(next);
        const nextContent = next.content ?? '';
        lastRemoteContentRef.current = nextContent;

        if (
          pendingLocalPublishRef.current
          && pendingLocalPublishRef.current !== nextContent
          && latestDraftRef.current !== nextContent
        ) {
          setLoading(false);
          return;
        }

        if (pendingLocalPublishRef.current === nextContent) {
          pendingLocalPublishRef.current = null;
        }

        isApplyingRemoteRef.current = true;
        setDraft(nextContent);
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
  }, [classId]);

  useEffect(() => {
    if (loading || isApplyingRemoteRef.current) return () => {};
    if (!canEditBoard) {
      setSyncState('idle');
      return () => {};
    }
    if (draft === lastRemoteContentRef.current) {
      setSyncState('idle');
      return () => {};
    }

    setSyncState('syncing');
    setError('');

    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      pendingLocalPublishRef.current = draft;
      console.info('[VirtualWhiteboard] submitting shared update', {
        classId,
        actorUid: user.uid,
        contentLength: draft.length,
      });
      void updateLiveWhiteboard(
        classId,
        draft,
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
  }, [actorName, canEditBoard, classId, draft, loading, user.uid]);

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
      await updateLiveWhiteboard(
        classId,
        '',
        user.uid,
        actorName,
      );
    } catch (error) {
      console.warn('[VirtualWhiteboard] clear failed:', error);
      setError(getWhiteboardErrorMessage(error, 'Unable to clear the shared whiteboard right now.'));
    } finally {
      setSyncState('idle');
    }
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

      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className={`mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base leading-relaxed text-white placeholder:text-slate-500 ${isStudentView ? 'h-[70vh] sm:h-[60vh]' : 'h-64 sm:h-72'}`}
        placeholder={isStudentView
          ? 'Write here and everyone in the room will see it live.'
          : 'Write a sentence, paste a prompt, ask students to correct a mistake, or let them answer here...'}
        disabled={loading}
        readOnly={!canEditBoard}
      />

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
                ? 'Disable Student Editing'
                : 'Enable Student Editing'}
          </button>
        ) : null}
        {canManageBoard ? (
          <button
            type="button"
            onClick={() => void handleClear()}
            disabled={syncState === 'syncing' || loading || !draft.trim()}
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-slate-200"
          >
            Clear Board
          </button>
        ) : null}
      </div>
    </div>
  );
};
