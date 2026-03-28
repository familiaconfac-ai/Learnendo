import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { LiveClass, LiveClassPresence } from '../../types';
import {
  getLiveClassMeetLink,
} from '../../services/liveClassesService';
import {
  markLivePresenceOffline,
  subscribeLivePresence,
  subscribeLiveSession,
  upsertLivePresence,
} from '../../services/liveSessionService';
import { LiveClassChat } from './LiveClassChat';

interface LiveClassRoomPageProps {
  liveClass: LiveClass;
  user: User;
  isTeacher: boolean;
  onExit: () => void;
}

const openExternalLink = (rawUrl: string) => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return;
  const target = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  window.open(target, '_blank', 'noopener,noreferrer');
};

export const LiveClassRoomPage: React.FC<LiveClassRoomPageProps> = ({
  liveClass,
  user,
  isTeacher,
  onExit,
}) => {
  const [presence, setPresence] = useState<LiveClassPresence[]>([]);
  const [sessionLabel, setSessionLabel] = useState('idle');
  const role = isTeacher || liveClass.createdBy === user.uid ? 'teacher' : 'student';

  useEffect(() => {
    const displayName = user.displayName || user.email || 'Student';

    const syncPresence = () => upsertLivePresence(liveClass.id, user.uid, displayName, role);
    void syncPresence();

    const heartbeat = window.setInterval(() => {
      void syncPresence();
    }, 30000);

    return () => {
      window.clearInterval(heartbeat);
      void markLivePresenceOffline(liveClass.id, user.uid);
    };
  }, [liveClass.id, role, user.displayName, user.email, user.uid]);

  useEffect(() => {
    const unsubscribe = subscribeLivePresence(
      liveClass.id,
      (next) => setPresence(next),
      (error) => console.warn('[LiveClassRoomPage] presence subscription failed:', error),
    );
    return unsubscribe;
  }, [liveClass.id]);

  useEffect(() => {
    const unsubscribe = subscribeLiveSession(
      liveClass.id,
      (session) => setSessionLabel(session.sessionStatus),
      (error) => console.warn('[LiveClassRoomPage] session subscription failed:', error),
    );
    return unsubscribe;
  }, [liveClass.id]);

  const onlinePresence = useMemo(
    () => presence
      .filter((item) => item.isOnline)
      .sort((a, b) => {
        if (a.role === b.role) return a.name.localeCompare(b.name);
        return a.role === 'teacher' ? -1 : 1;
      }),
    [presence],
  );

  const meetLink = getLiveClassMeetLink(liveClass);

  return (
    <div className="min-h-screen bg-slate-950 px-3 pb-28 pt-6 sm:px-4">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button type="button" onClick={onExit} className="text-sm font-bold text-slate-200">← Leave Room</button>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-300">
            {sessionLabel}
          </span>
        </div>

        <h1 className="text-xl font-black text-white">{liveClass.title}</h1>
        <p className="mt-1 text-sm text-slate-300">Teacher: {liveClass.teacherName}</p>

        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/80 p-3">
          <p className="text-xs font-black uppercase tracking-wide text-blue-300">Lesson Context</p>
          <p className="mt-1 text-sm text-slate-200">
            Workbook {liveClass.workbookId ?? '-'} | Unit {liveClass.unitId ?? '-'} | Lesson {liveClass.lessonId ?? '-'}
          </p>
        </div>

        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/80 p-3">
          <p className="text-xs font-black uppercase tracking-wide text-amber-300">Room Presence ({onlinePresence.length})</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {onlinePresence.length === 0 ? (
              <span className="text-xs text-slate-400">Nobody connected yet.</span>
            ) : (
              onlinePresence.map((item) => (
                <span
                  key={item.uid}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    item.role === 'teacher'
                      ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                      : 'border-blue-400/40 bg-blue-500/15 text-blue-200'
                  }`}
                >
                  {item.name}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => openExternalLink(meetLink)}
            disabled={!meetLink}
            className={`rounded-xl px-3 py-2 text-sm font-black ${
              meetLink
                ? 'bg-emerald-500 text-slate-900 shadow-[0_4px_0_0_#059669]'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            Open Meet (Optional)
          </button>

          <div className="rounded-xl border border-dashed border-slate-700 px-3 py-2 text-sm text-slate-300">
            Presentation sync placeholder (Phase 2)
          </div>
        </div>
      </div>

      <div className="mt-4">
        <LiveClassChat classId={liveClass.id} user={user} role={role} allowAudio />
      </div>
    </div>
  );
};
