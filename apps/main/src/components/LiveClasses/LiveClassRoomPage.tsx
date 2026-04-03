import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { LiveClass, LiveClassPresence, LiveClassSession } from '../../types';
import {
  getLiveClassMeetLink,
  getLiveClassPresentationLink,
} from '../../services/liveClassesService';
import {
  markLivePresenceOffline,
  subscribeLivePresence,
  subscribeLiveSession,
  updateLiveSession,
  upsertLivePresence,
} from '../../services/liveSessionService';
import { ExerciseSessionPanel } from './ExerciseSessionPanel';
import { LiveClassChat } from './LiveClassChat';
import { LiveMicPanel } from './LiveMicPanel';
import { resolvePresentationMedia } from './presentationMedia';
import { VirtualWhiteboard } from './VirtualWhiteboard';

interface LiveClassRoomPageProps {
  liveClass: LiveClass;
  user: User;
  isTeacher: boolean;
  onOpenClassContent: (liveClass: LiveClass) => void;
  onEditClass: (liveClass: LiveClass) => void;
  onExit: () => void;
}

const openExternalLink = (rawUrl: string) => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return;
  const target = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  window.open(target, '_blank', 'noopener,noreferrer');
};

const buildRoomShareLink = (classId: string) => {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/live-class/${encodeURIComponent(classId)}`;
};

const buildWhatsappShareUrl = (liveClass: LiveClass) => {
  const roomLink = buildRoomShareLink(liveClass.id);
  const message = `Join "${liveClass.title}" on Learnendo: ${roomLink}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
};

export const LiveClassRoomPage: React.FC<LiveClassRoomPageProps> = ({
  liveClass,
  user,
  isTeacher,
  onOpenClassContent,
  onEditClass,
  onExit,
}) => {
  const [presence, setPresence] = useState<LiveClassPresence[]>([]);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showExerciseSession, setShowExerciseSession] = useState(false);
  const [session, setSession] = useState<LiveClassSession>({
    sessionStatus: 'idle',
    activeWorkbookId: null,
    activeLessonId: null,
    activeExerciseId: null,
    liveAudioTransport: 'not-configured',
    teacherLiveMicEnabled: false,
    teacherCameraEnabled: false,
    allowStudentLiveMic: false,
    studentCameraMode: 'off',
    audioNotesEnabled: true,
  });
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
      (next) => setSession(next),
      (error) => console.warn('[LiveClassRoomPage] session subscription failed:', error),
    );
    return unsubscribe;
  }, [liveClass.id]);

  useEffect(() => {
    if (!showExerciseSession) return () => {};

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    // Keep scrolling inside the exercise panel instead of leaving the page in a locked state.
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [showExerciseSession]);

  const handleUpdateSession = useCallback(async (patch: Partial<LiveClassSession>) => {
    await updateLiveSession(liveClass.id, patch, user.uid);
  }, [liveClass.id, user.uid]);

  const onlinePresence = useMemo(
    () => presence
      .filter((item) => item.isOnline)
      .sort((a, b) => {
        if (a.role === b.role) return a.name.localeCompare(b.name);
        return a.role === 'teacher' ? -1 : 1;
      }),
    [presence],
  );
  const assignedRoster = useMemo(() => {
    const ids = liveClass.assignedStudentIds ?? [];
    const names = liveClass.assignedStudentNames ?? [];
    return ids.map((uid, index) => ({
      uid,
      label: names[index] || uid,
      isOnline: onlinePresence.some((item) => item.uid === uid),
    }));
  }, [liveClass.assignedStudentIds, liveClass.assignedStudentNames, onlinePresence]);

  const meetLink = getLiveClassMeetLink(liveClass);
  const presentationLink = getLiveClassPresentationLink(liveClass);
  const presentationMedia = useMemo(
    () => resolvePresentationMedia(presentationLink),
    [presentationLink],
  );
  const hasPresentationLink = presentationMedia.kind !== 'none';
  const whatsappShareLink = useMemo(() => buildWhatsappShareUrl(liveClass), [liveClass]);

  return (
    <div className="min-h-screen bg-slate-950 px-3 pb-28 pt-6 sm:px-4">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button type="button" onClick={onExit} className="text-sm font-bold text-slate-200">← Leave Room</button>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-300">
            {session.sessionStatus}
          </span>
        </div>

        <h1 className="text-xl font-black text-white">{liveClass.title}</h1>
        <p className="mt-1 text-sm text-slate-300">Teacher: {liveClass.teacherName}</p>

        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/80 p-3">
          <p className="text-xs font-black uppercase tracking-wide text-blue-300">Lesson Context</p>
          <p className="mt-1 text-sm text-slate-200">
            Workbook {liveClass.workbookId ?? '-'} | Unit {liveClass.unitId ?? '-'} | Lesson {liveClass.lessonId ?? '-'}
          </p>
          {(liveClass.workbookId || liveClass.lessonId) ? (
            <button
              type="button"
              onClick={() => onOpenClassContent(liveClass)}
              className="mt-3 rounded-xl bg-amber-500 px-3 py-2 text-sm font-black text-slate-900 shadow-[0_4px_0_0_#b45309]"
            >
              Open Lesson Content
            </button>
          ) : null}
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

        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/80 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-emerald-300">Assigned Students</p>
              <p className="mt-1 text-sm text-slate-300">
                {assignedRoster.length} assigned for this class
              </p>
            </div>
            {role === 'teacher' ? (
              <button
                type="button"
                onClick={() => onEditClass(liveClass)}
                className="rounded-xl border border-slate-500 px-3 py-2 text-sm font-bold text-slate-100"
              >
                Add or Remove Students
              </button>
            ) : null}
          </div>

          {assignedRoster.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {assignedRoster.map((student) => (
                <span
                  key={student.uid}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    student.isOnline
                      ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                      : 'border-slate-600 bg-slate-800 text-slate-300'
                  }`}
                >
                  {student.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              This room does not have assigned students yet.
            </p>
          )}
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

          <button
            type="button"
            onClick={() => openExternalLink(presentationMedia.openUrl)}
            disabled={!hasPresentationLink}
            className={`rounded-xl px-3 py-2 text-sm font-black ${
              hasPresentationLink
                ? 'bg-violet-500 text-white shadow-[0_4px_0_0_#7c3aed]'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            Open Material
          </button>

          <button
            type="button"
            onClick={() => openExternalLink(whatsappShareLink)}
            className="rounded-xl bg-green-600 px-3 py-2 text-sm font-black text-white shadow-[0_4px_0_0_#047857]"
          >
            Share Link on WhatsApp
          </button>

          <button
            type="button"
            onClick={() => {
              setShowWhiteboard((prev) => !prev);
              setShowExerciseSession(false);
            }}
            className="rounded-xl bg-cyan-500 px-3 py-2 text-sm font-black text-slate-950 shadow-[0_4px_0_0_#0891b2]"
          >
            {showWhiteboard ? 'Hide Whiteboard' : 'Virtual Whiteboard'}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowExerciseSession((prev) => !prev);
              setShowWhiteboard(false);
            }}
            className="rounded-xl bg-violet-500 px-3 py-2 text-sm font-black text-white shadow-[0_4px_0_0_#7c3aed]"
          >
            {showExerciseSession ? 'Hide Exercise Session' : 'Exercise Session'}
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/80 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-violet-300">Class Material</p>
              <p className="mt-1 text-sm text-slate-300">
                {hasPresentationLink
                  ? `${presentationMedia.title} attached to this room.`
                  : 'No presentation link added to this class yet.'}
              </p>
            </div>
            {hasPresentationLink ? (
              <button
                type="button"
                onClick={() => openExternalLink(presentationMedia.openUrl)}
                className="rounded-xl border border-violet-400/40 px-3 py-2 text-sm font-bold text-violet-200"
              >
                Open in New Tab
              </button>
            ) : null}
          </div>

          {hasPresentationLink ? (
            presentationMedia.kind === 'image' ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                <img
                  src={presentationMedia.embedUrl ?? presentationMedia.openUrl}
                  alt="Class material"
                  className="max-h-[520px] w-full object-contain"
                />
              </div>
            ) : presentationMedia.kind === 'video' ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-700 bg-black">
                <video
                  src={presentationMedia.embedUrl ?? presentationMedia.openUrl}
                  controls
                  className="max-h-[520px] w-full"
                />
              </div>
            ) : presentationMedia.embedUrl ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-700 bg-white">
                <iframe
                  title="Class presentation"
                  src={presentationMedia.embedUrl}
                  className="h-[420px] w-full bg-white"
                  allow="autoplay; fullscreen; clipboard-read; clipboard-write"
                />
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-300">
                This material link was saved to the class, but inline preview is not available for this provider yet.
                Use Open Presentation or Open in New Tab.
              </div>
            )
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <LiveMicPanel
          classId={liveClass.id}
          userId={user.uid}
          role={role}
          session={session}
          isTeacher={role === 'teacher'}
          userName={user.displayName || user.email || 'Student'}
          onUpdateSession={handleUpdateSession}
        />
      </div>

      {showWhiteboard ? (
        <div className="fixed inset-0 z-[1000] overflow-y-auto bg-slate-950/80 px-3 py-3 backdrop-blur-sm sm:px-6 sm:py-6">
          <div className="flex min-h-screen w-full items-stretch justify-center">
            <div className="flex w-full max-w-5xl flex-col">
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowWhiteboard(false)}
                  className="rounded-xl border border-slate-500 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-100"
                >
                  Close Whiteboard
                </button>
              </div>
              <VirtualWhiteboard classId={liveClass.id} user={user} canManageBoard={role === 'teacher'} />
            </div>
          </div>
        </div>
      ) : null}

      {showExerciseSession ? (
        <div className="fixed inset-0 z-[1000] overflow-y-auto bg-slate-950/80 backdrop-blur-sm">
          <div className="flex min-h-screen w-full items-stretch justify-center sm:px-6 sm:py-6">
            <div className="flex h-screen w-full max-w-6xl flex-col border border-slate-700 bg-slate-950 sm:h-auto sm:max-h-[90vh] sm:rounded-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-950/95 px-4 py-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-violet-300">Live Class</p>
                  <p className="text-sm font-bold text-white">Exercise Session</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExerciseSession(false)}
                  className="rounded-xl border border-slate-500 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-100"
                >
                  Close
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-6 sm:py-4">
                <div className="min-h-full">
                  <ExerciseSessionPanel
                    classId={liveClass.id}
                    user={user}
                    isTeacher={role === 'teacher'}
                    assignedRoster={assignedRoster}
                  />
                </div>
              </div>
              <div className="border-t border-slate-700 bg-slate-950/95 px-4 py-3 sm:hidden">
                <button
                  type="button"
                  onClick={() => setShowExerciseSession(false)}
                  className="w-full rounded-xl border border-slate-500 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-100"
                >
                  Close Exercise Session
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <LiveClassChat
          classId={liveClass.id}
          user={user}
          role={role}
          allowAudioNotes={session.audioNotesEnabled !== false}
        />
      </div>
    </div>
  );
};
