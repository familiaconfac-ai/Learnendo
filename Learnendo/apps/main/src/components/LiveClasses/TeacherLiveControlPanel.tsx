import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { LiveClassSession } from '../../types';
import { updateLiveSession } from '../../services/liveSessionService';

interface TeacherLiveControlPanelProps {
  classId: string;
  session: LiveClassSession;
  user: User;
}

export const TeacherLiveControlPanel: React.FC<TeacherLiveControlPanelProps> = ({
  classId,
  session,
  user,
}) => {
  const [local, setLocal] = useState<LiveClassSession>(session);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocal(session);
  }, [session]);

  const setField = <K extends keyof LiveClassSession>(key: K, value: LiveClassSession[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLiveSession(classId, local, user.uid);
    } catch (error) {
      console.warn('[TeacherLiveControlPanel] update failed:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-500/40 bg-slate-900 p-3">
      <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-blue-300">Teacher Room Controls</h3>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select
          value={local.sessionStatus}
          onChange={(e) => setField('sessionStatus', e.target.value as LiveClassSession['sessionStatus'])}
          className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
        >
          <option value="idle">Idle</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="ended">Ended</option>
        </select>

        <input
          type="number"
          min={1}
          value={local.activeWorkbookId ?? ''}
          onChange={(e) => setField('activeWorkbookId', e.target.value ? Number(e.target.value) : null)}
          className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
          placeholder="activeWorkbookId"
        />

        <input
          type="text"
          value={local.activeLessonId ?? ''}
          onChange={(e) => setField('activeLessonId', e.target.value || null)}
          className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
          placeholder="activeLessonId"
        />

        <input
          type="text"
          value={local.activeExerciseId ?? ''}
          onChange={(e) => setField('activeExerciseId', e.target.value || null)}
          className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
          placeholder="activeExerciseId"
        />

        <select
          value={local.liveAudioTransport ?? 'not-configured'}
          onChange={(e) => setField('liveAudioTransport', e.target.value as LiveClassSession['liveAudioTransport'])}
          className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
        >
          <option value="not-configured">Transport pending</option>
          <option value="connecting">Connecting</option>
          <option value="connected">Connected</option>
        </select>

        <select
          value={local.teacherLiveMicEnabled ? 'live' : 'muted'}
          onChange={(e) => setField('teacherLiveMicEnabled', e.target.value === 'live')}
          className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
        >
          <option value="muted">Teacher live mic muted</option>
          <option value="live">Teacher live mic live</option>
        </select>

        <select
          value={local.teacherCameraEnabled ? 'live' : 'off'}
          onChange={(e) => setField('teacherCameraEnabled', e.target.value === 'live')}
          className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
        >
          <option value="off">Teacher camera off</option>
          <option value="live">Teacher camera live</option>
        </select>

        <select
          value={local.allowStudentLiveMic ? 'open' : 'muted'}
          onChange={(e) => setField('allowStudentLiveMic', e.target.value === 'open')}
          className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
        >
          <option value="muted">Students muted by room</option>
          <option value="open">Students may unmute</option>
        </select>

        <select
          value={local.studentCameraMode ?? 'off'}
          onChange={(e) => setField('studentCameraMode', e.target.value as LiveClassSession['studentCameraMode'])}
          className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
        >
          <option value="off">Student camera off</option>
          <option value="follow-mic">Student camera follows mic</option>
          <option value="required">Student camera required</option>
        </select>

        <select
          value={local.audioNotesEnabled === false ? 'disabled' : 'enabled'}
          onChange={(e) => setField('audioNotesEnabled', e.target.value === 'enabled')}
          className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
        >
          <option value="enabled">Audio notes enabled</option>
          <option value="disabled">Audio notes disabled</option>
        </select>
      </div>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-[0_4px_0_0_#1d4ed8] disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Push Live Session State'}
      </button>
    </div>
  );
};
