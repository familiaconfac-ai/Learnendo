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
import { BattleHubPage } from '../BattleHub/BattleHubPage';
import { StudentRoomView } from './Student/StudentRoomView';
import { TeacherRoomView } from './Teacher/TeacherRoomView';

interface LiveClassRoomPageProps {
  liveClass: LiveClass;
  user: User;
  isTeacher: boolean;
  onOpenClassContent: (liveClass: LiveClass) => void;
  onEditClass: (liveClass: LiveClass) => void;
  onOpenBattleHub: () => void;
  onExit: () => void;
}

export const LiveClassRoomPage: React.FC<LiveClassRoomPageProps> = ({
  liveClass,
  user,
  isTeacher,
  onOpenBattleHub,
  onExit,
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
  const isBattleStage = session.mainStageMode === 'battle';

  useEffect(() => {
    const displayName = user.displayName || user.email || 'Usuario';
    const syncPresence = () => upsertLivePresence(liveClass.id, user.uid, displayName, role);

    void syncPresence();
    const heartbeat = window.setInterval(() => {
      void syncPresence();
    }, 30_000);

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

  const handleUpdateSession = useCallback(
    async (patch: Partial<LiveClassSession>) => {
      await updateLiveSession(liveClass.id, patch, user.uid);
    },
    [liveClass.id, user.uid],
  );

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

  const battleOnlineParticipants = useMemo(
    () =>
      Array.from(
        new Map(
          onlinePresence
            .filter((participant) => participant.uid !== user.uid && participant.role === 'student')
            .map((participant) => [
              participant.uid,
              {
                uid: participant.uid,
                name: participant.name,
              },
            ])
        ).values()
      ),
    [onlinePresence, user.uid],
  );

  const handleOpenBattleHub = useCallback(() => {
    console.log('[BATTLE DEBUG] open battle from live class', {
      liveClassId: liveClass?.id,
      teacherUid: user?.uid,
      onlineParticipants: onlinePresence.map((participant) => ({
        uid: participant.uid,
        name: participant.name,
        role: participant.role,
        isOnline: participant.isOnline,
      })),
    });

    void handleUpdateSession({ mainStageMode: 'battle' });
  }, [handleUpdateSession, liveClass?.id, onlinePresence, user?.uid]);

  const handleReturnToWorkspace = useCallback(() => {
    void handleUpdateSession({ mainStageMode: 'workspace' });
  }, [handleUpdateSession]);

  if (!sessionLoaded) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950">
        <img src={learnendoLogo} alt="Learnendo" className="mb-4 h-auto w-48 animate-pulse" />
        <div className="text-sm uppercase tracking-widest text-blue-500">Carregando Sala...</div>
      </div>
    );
  }

  if (role === 'teacher') {
    return (
      <>
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
          onOpenBattleHub={handleOpenBattleHub}
          onExit={onExit}
        />
        {isBattleStage ? (
          <BattleHubPage
            uid={user.uid}
            name={user.displayName || user.email || 'Professor'}
            courseId={liveClass.courseId ?? null}
            workbookId={liveClass.workbookId ?? null}
            lessonId={liveClass.lessonId?.toString() ?? null}
            activeLiveClass={liveClass}
            uiLanguage="pt"
            fire={0}
            ice={0}
            diamonds={0}
            stars={0}
            onlineParticipants={battleOnlineParticipants}
            onOpenLiveClasses={handleReturnToWorkspace}
            onDismiss={handleReturnToWorkspace}
          />
        ) : null}
      </>
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
      onOpenBattleHub={onOpenBattleHub}
      onExit={onExit}
    />
  );
};
