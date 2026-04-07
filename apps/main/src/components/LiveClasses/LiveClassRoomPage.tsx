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
import { StudentRoomView } from './Student/StudentRoomView';
import { TeacherRoomView } from './Teacher/TeacherRoomView';

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
    allowStudentWhiteboardEdit: false,
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

  // Render by role
  if (role === 'teacher') {
    return (
      <TeacherRoomView
        liveClass={liveClass}
        user={user}
        session={session}
        presence={presence}
        assignedRoster={assignedRoster}
        showWhiteboard={showWhiteboard}
        setShowWhiteboard={setShowWhiteboard}
        showExerciseSession={showExerciseSession}
        setShowExerciseSession={setShowExerciseSession}
        handleUpdateSession={handleUpdateSession}
      />
    );
  }
  return (
    <StudentRoomView
      liveClass={liveClass}
      user={user}
      session={session}
      presence={presence}
      assignedRoster={assignedRoster}
      showWhiteboard={showWhiteboard}
      setShowWhiteboard={setShowWhiteboard}
      showExerciseSession={showExerciseSession}
      setShowExerciseSession={setShowExerciseSession}
      handleUpdateSession={handleUpdateSession}
    />
  );
};
