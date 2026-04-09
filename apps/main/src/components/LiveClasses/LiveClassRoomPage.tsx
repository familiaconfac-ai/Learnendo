import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { LiveClass, LiveClassPresence, LiveClassSession } from '../../types';
import {
  markLivePresenceOffline,
  subscribeLivePresence,
  subscribeLiveSession,
  updateLiveSession,
  upsertLivePresence,
} from '../../services/liveSessionService';
import { getDefaultMainStageMode } from '../../services/liveClassStage';
import { learnendoLogo } from '../../assets/branding';
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

export const LiveClassRoomPage: React.FC<LiveClassRoomPageProps> = ({
  liveClass,
  user,
  isTeacher,
}) => {
  const [presence, setPresence] = useState<LiveClassPresence[]>([]);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showExerciseSession, setShowExerciseSession] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [session, setSession] = useState<LiveClassSession>({
    sessionStatus: 'idle',
    activeWorkbookId: liveClass.workbookId ?? null,
    activeLessonId: liveClass.lessonId ?? null,
    liveAudioTransport: 'not-configured',
    teacherLiveMicEnabled: false,
    teacherCameraEnabled: false,
    allowStudentLiveMic: false,
    studentCameraMode: 'off',
    allowStudentWhiteboardEdit: false,
    audioNotesEnabled: true,
    mainStageMode: getDefaultMainStageMode(),
  });

  const role = isTeacher ? 'teacher' : 'student';

  useEffect(() => {
    const displayName = user.displayName || user.email || 'Usuario';
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
      (error) => console.warn('[LiveClass] Presence error:', error),
    );
    return unsubscribe;
  }, [liveClass.id]);

  useEffect(() => {
    const unsubscribe = subscribeLiveSession(
      liveClass.id,
      (next) => {
        setSession({
          ...next,
          activeWorkbookId: next.activeWorkbookId ?? liveClass.workbookId ?? null,
        });
        setSessionLoaded(true);
      },
      (error) => console.warn('[LiveClass] Session error:', error),
    );
    return unsubscribe;
  }, [liveClass.id, liveClass.workbookId]);

  const handleUpdateSession = useCallback(async (patch: Partial<LiveClassSession>) => {
    await updateLiveSession(liveClass.id, patch, user.uid);
  }, [liveClass.id, user.uid]);

  const onlinePresence = useMemo(
    () => presence.filter((item) => item.isOnline),
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

  if (!sessionLoaded) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center">
        <img src={learnendoLogo} alt="Learnendo" className="w-48 h-auto mb-4 animate-pulse" />
        <div className="text-blue-500 text-sm tracking-widest uppercase">Carregando Sala...</div>
      </div>
    );
  }

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
