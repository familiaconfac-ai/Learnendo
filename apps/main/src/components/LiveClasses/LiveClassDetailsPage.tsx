import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { LiveClass, LiveClassSession } from '../../types';
import { subscribeLiveSession } from '../../services/liveSessionService';
import { getLiveClassMeetLink } from '../../services/liveClassesService';
import { LiveClassChat } from './LiveClassChat';
import { TeacherLiveControlPanel } from './TeacherLiveControlPanel';

interface LiveClassDetailsPageProps {
  liveClass: LiveClass;
  user: User;
  isTeacher: boolean;
  hasRoomAccess: boolean;
  onBack: () => void;
  onEdit: () => void;
  onEnterRoom: () => void;
}

const statusClassMap: Record<LiveClass['status'], string> = {
  upcoming: 'bg-amber-500 text-slate-900',
  live: 'bg-emerald-500 text-slate-900',
  finished: 'bg-slate-600 text-white',
};

const openExternalLink = (rawUrl: string) => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return;
  const target = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  window.open(target, '_blank', 'noopener,noreferrer');
};

export const LiveClassDetailsPage: React.FC<LiveClassDetailsPageProps> = ({
  liveClass,
  user,
  isTeacher,
  hasRoomAccess,
  onBack,
  onEdit,
  onEnterRoom,
}) => {
  const [session, setSession] = useState<LiveClassSession>({
    sessionStatus: 'idle',
    activeWorkbookId: null,
    activeLessonId: null,
    activeExerciseId: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeLiveSession(
      liveClass.id,
      (next) => setSession(next),
      (error) => console.warn('[LiveClassDetailsPage] session subscription failed:', error),
    );
    return unsubscribe;
  }, [liveClass.id]);

  const meetLink = useMemo(() => getLiveClassMeetLink(liveClass), [liveClass]);
  const canOpenMeet = useMemo(() => !!meetLink, [meetLink]);
  const canOpenWhatsapp = useMemo(() => !!(liveClass.whatsappLink ?? '').trim(), [liveClass.whatsappLink]);

  return (
    <div className="min-h-screen bg-slate-900 px-3 pb-28 pt-6 sm:px-4">
      <button onClick={onBack} className="mb-4 text-sm font-bold text-slate-200" type="button">← Back to classes</button>

      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h1 className="text-xl font-black text-white">{liveClass.title}</h1>
          <span className={`rounded-full px-2 py-1 text-xs font-black uppercase ${statusClassMap[liveClass.status]}`}>
            {liveClass.status}
          </span>
        </div>

        <p className="text-sm text-slate-300">Teacher: {liveClass.teacherName}</p>
        <p className="text-sm text-slate-300">Date: {liveClass.date} • {liveClass.time}</p>
        {liveClass.description && <p className="mt-3 text-sm text-slate-200">{liveClass.description}</p>}
        {liveClass.isPrivate && !hasRoomAccess && (
          <p className="mt-3 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-200">
            Private class. You are not assigned to this room.
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onEnterRoom}
            disabled={!hasRoomAccess}
            className={`rounded-xl px-3 py-2 text-center text-sm font-black ${
              hasRoomAccess
                ? 'bg-emerald-500 text-slate-900 shadow-[0_4px_0_0_#059669]'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            Enter Room
          </button>

          <button
            type="button"
            onClick={() => openExternalLink(meetLink)}
            disabled={!canOpenMeet}
            className={`rounded-xl px-3 py-2 text-center text-sm font-black ${
              canOpenMeet
                ? 'bg-blue-500 text-white shadow-[0_4px_0_0_#1d4ed8]'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            Open Meet (Optional)
          </button>

          <button
            type="button"
            onClick={() => openExternalLink(liveClass.whatsappLink ?? '')}
            disabled={!canOpenWhatsapp}
            className={`rounded-xl px-3 py-2 text-center text-sm font-black ${
              canOpenWhatsapp
                ? 'bg-emerald-600 text-white shadow-[0_4px_0_0_#047857]'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            Open WhatsApp
          </button>
        </div>

        {isTeacher && (
          <button
            type="button"
            onClick={onEdit}
            className="mt-3 w-full rounded-xl border border-slate-500 px-3 py-2 text-sm font-bold text-slate-100"
          >
            Edit Class
          </button>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-800 p-3">
        <h2 className="text-sm font-black uppercase tracking-wide text-blue-300">Live Session (Phase 2 Ready)</h2>
        <p className="mt-2 text-sm text-slate-200">Status: {session.sessionStatus}</p>
        <p className="text-sm text-slate-200">activeWorkbookId: {session.activeWorkbookId ?? '-'}</p>
        <p className="text-sm text-slate-200">activeLessonId: {session.activeLessonId ?? '-'}</p>
        <p className="text-sm text-slate-200">activeExerciseId: {session.activeExerciseId ?? '-'}</p>
      </div>

      {isTeacher && (
        <div className="mt-4">
          <TeacherLiveControlPanel classId={liveClass.id} session={session} user={user} />
        </div>
      )}

      <div className="mt-4">
        <LiveClassChat classId={liveClass.id} user={user} role={isTeacher ? 'teacher' : 'student'} />
      </div>
    </div>
  );
};
