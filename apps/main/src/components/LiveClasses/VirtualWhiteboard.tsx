import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { LiveWhiteboardState } from '../../types';
import { subscribeLiveWhiteboard, updateLiveWhiteboard } from '../../services/liveSessionService';

interface VirtualWhiteboardProps {
  classId: string;
  user: User;
}

export const VirtualWhiteboard: React.FC<VirtualWhiteboardProps> = ({ classId, user }) => {
  const [whiteboard, setWhiteboard] = useState<LiveWhiteboardState>({ content: '' });
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    const unsubscribe = subscribeLiveWhiteboard(
      classId,
      (next) => {
        setWhiteboard(next);
        setDraft(next.content ?? '');
        setLoading(false);
        setError('');
      },
      (subscriptionError) => {
        console.warn('[VirtualWhiteboard] subscription failed:', subscriptionError);
        setLoading(false);
        setError('Unable to load the shared whiteboard right now.');
      },
    );
    return unsubscribe;
  }, [classId]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateLiveWhiteboard(
        classId,
        draft,
        user.uid,
        user.displayName || user.email || 'Learnendo user',
      );
    } catch (error) {
      console.warn('[VirtualWhiteboard] save failed:', error);
      setError('Unable to update the shared whiteboard right now.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    setError('');
    try {
      await updateLiveWhiteboard(
        classId,
        '',
        user.uid,
        user.displayName || user.email || 'Learnendo user',
      );
    } catch (error) {
      console.warn('[VirtualWhiteboard] clear failed:', error);
      setError('Unable to clear the shared whiteboard right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-slate-900 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-cyan-300">Virtual Whiteboard</h2>
          <p className="mt-1 text-sm text-slate-200">
            Type prompts, corrections, examples, or short activities here. Everyone in the room sees the same board.
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
        className="mt-3 h-64 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base leading-relaxed text-white placeholder:text-slate-500"
        placeholder="Write a sentence, paste a prompt, ask students to correct a mistake, or let them answer here..."
        disabled={loading}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || loading}
          className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 shadow-[0_4px_0_0_#0891b2] disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Update Whiteboard'}
        </button>
        <button
          type="button"
          onClick={() => void handleClear()}
          disabled={saving || loading || !draft.trim()}
          className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-slate-200"
        >
          Clear Board
        </button>
      </div>
    </div>
  );
};
