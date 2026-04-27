import React, { useCallback, useEffect, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useLocalParticipant,
  useRoomContext,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { isTrackReference } from '@livekit/components-core';
import { RoomEvent, Track, createLocalVideoTrack } from 'livekit-client';
import { User } from 'firebase/auth';
import { WorkspaceCanvas } from '../Workspace/WorkspaceCanvas';
import { LiveClassChat } from '../LiveClassChat';
import { BattlePlayerView } from '../Battle/BattlePlayerView';
import { subscribeBattleSession } from '../Battle/battleService';
import { BattleSession } from '../Battle/battleTypes';
import { requestLiveAudioCredentials } from '../../../services/liveAudioService';
import {
  getDefaultMainStageMode,
  isActiveBattleStatus,
  sanitizeMainStageMode,
  type MainStageMode,
} from '../../../services/liveClassStage';
import { LiveClass, LiveClassPresence, LiveClassSession } from '../../../types';
import { LiveClassRoomShell } from '../Shared/LiveClassRoomShell';

interface StudentRoomViewProps {
  liveClass: LiveClass;
  user: User;
  session: LiveClassSession;
  presence: LiveClassPresence[];
  assignedRoster: Array<{ uid: string; label: string; isOnline: boolean }>;
  showWhiteboard: boolean;
  setShowWhiteboard: (show: boolean) => void;
  showExerciseSession: boolean;
  setShowExerciseSession: (show: boolean) => void;
  handleUpdateSession: (patch: Partial<LiveClassSession>) => Promise<void>;
  onOpenBattleHub: () => void;
  onExit: () => void;
}

const StudentStage: React.FC<{
  liveClass: LiveClass;
  user: User;
  session: LiveClassSession;
  assignedRoster: Array<{ uid: string; label: string; isOnline: boolean }>;
  onOpenBattleHub: () => void;
  onExit: () => void;
}> = ({ liveClass, user, session, assignedRoster, onOpenBattleHub, onExit }) => {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const cameraTrackRefs = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]).filter(
    isTrackReference,
  );
  const screenShareTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);

  const [mainStageMode, setMainStageMode] = useState<MainStageMode>(getDefaultMainStageMode());
  const [chatOpen, setChatOpen] = useState(false);
  const [audioPlaybackOk, setAudioPlaybackOk] = useState(false);
  const [expandedCameraId, setExpandedCameraId] = useState<string | null>(null);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [battleSession, setBattleSession] = useState<BattleSession | null>(null);
  const [showTeacherMiniCamera, setShowTeacherMiniCamera] = useState(true);

  useEffect(() => {
    const nextMode = sanitizeMainStageMode(session.mainStageMode);
    setMainStageMode(nextMode === 'camera' ? 'workspace' : nextMode);
  }, [session.mainStageMode]);

  useEffect(() => {
    console.info('[BATTLE FIREBASE] student listener attach', {
      classId: liveClass.id,
      docPath: `liveClasses/${liveClass.id}/session/battle`,
      studentUid: user.uid,
    });

    const unsub = subscribeBattleSession(
      liveClass.id,
      (nextSession) => {
        console.info('[BATTLE FIREBASE] student snapshot received', {
          classId: liveClass.id,
          docPath: `liveClasses/${liveClass.id}/session/battle`,
          studentUid: user.uid,
          hasSession: Boolean(nextSession),
          sessionId: nextSession?.id ?? null,
          status: nextSession?.status ?? null,
          roundParticipantIds: nextSession?.roundParticipantIds ?? [],
        });

        if (!nextSession) {
          setBattleSession(null);
          return;
        }

        if (
          nextSession.status === 'WAITING' ||
          isActiveBattleStatus(nextSession.status) ||
          nextSession.status === 'FINISHED'
        ) {
          console.info('[BATTLE STUDENT SUBSCRIBE] accepting shared battle session', {
            component: 'StudentRoomView',
            classId: liveClass.id,
            sessionId: nextSession.id,
            status: nextSession.status,
            roundParticipantIds: nextSession.roundParticipantIds ?? [],
          });
          setBattleSession(nextSession);
          return;
        }

        console.info('[BATTLE STUDENT SUBSCRIBE] unsupported status - clearing session', {
          component: 'StudentRoomView',
          classId: liveClass.id,
          sessionId: nextSession.id,
          status: nextSession.status,
        });
        setBattleSession(null);
      },
      (error) => {
        console.error('[BATTLE STUDENT SUBSCRIBE] error listening', {
          component: 'StudentRoomView',
          classId: liveClass.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    );

    return unsub;
  }, [liveClass.id, user.uid]);

  useEffect(() => {
    console.info('[STUDENT BATTLE RENDER]', {
      roomId: liveClass.id,
      hasBattleSession: Boolean(battleSession),
      status: battleSession?.status ?? null,
      updatedAt: battleSession?.updatedAt ?? null,
      currentQuestionIndex: battleSession?.currentQuestionIndex ?? null,
    });
    console.info('[BATTLE SESSION MATCH] student battle session snapshot', {
      component: 'StudentRoomView',
      classId: liveClass.id,
      sessionId: battleSession?.id ?? null,
      status: battleSession?.status ?? null,
      role: 'student',
    });
    if (battleSession) {
      console.info('[BATTLE STUDENT LIVE ACCESS] student following official classroom battle session', {
        component: 'StudentRoomView',
        classId: liveClass.id,
        sessionId: battleSession.id,
        status: battleSession.status,
      });
    }
  }, [battleSession, liveClass.id]);

  useEffect(() => {
    console.log('[LIVE BATTLE SESSION] loaded', {
      liveClassId: liveClass.id,
      userId: user.uid,
      role: 'student',
      status: battleSession?.status ?? null,
      currentQuestionIndex: battleSession?.currentQuestionIndex ?? null,
      participants: battleSession?.participants ?? null,
      answers: battleSession?.answers ?? battleSession?.currentAnswers ?? null,
    });
  }, [battleSession, liveClass.id, user.uid]);

  const startAudio = useCallback(async () => {
    try {
      await room.startAudio();
      setAudioPlaybackOk(true);
    } catch (err) {
      console.warn('[StudentRoomView] startAudio failed:', err);
    }
  }, [room]);

  useEffect(() => {
    void startAudio();

    const retry = () => {
      void startAudio();
    };

    document.addEventListener('click', retry);
    document.addEventListener('touchstart', retry);

    return () => {
      document.removeEventListener('click', retry);
      document.removeEventListener('touchstart', retry);
    };
  }, [startAudio]);

  useEffect(() => {
    const onAudio = () => {
      setAudioPlaybackOk(room.canPlaybackAudio);
    };

    room.on(RoomEvent.AudioPlaybackStatusChanged, onAudio);
    setAudioPlaybackOk(room.canPlaybackAudio);

    return () => {
      room.off(RoomEvent.AudioPlaybackStatusChanged, onAudio);
    };
  }, [room]);

  const localCameraTrack =
    cameraTrackRefs.find((track) => track.participant?.isLocal) ?? null;

  const remoteParticipants = Array.from(room.remoteParticipants.values()).sort((left, right) => {
    const getRole = (participant: typeof left) => {
      try {
        return JSON.parse(participant.metadata || '{}').role || 'student';
      } catch {
        return 'student';
      }
    };

    const leftRole = getRole(left);
    const rightRole = getRole(right);
    if (leftRole !== rightRole) return leftRole === 'teacher' ? -1 : 1;
    return (left.name || left.identity).localeCompare(right.name || right.identity);
  });

  const teacherRemoteParticipant =
    remoteParticipants.find((participant) => {
      try {
        return JSON.parse(participant.metadata || '{}').role === 'teacher';
      } catch {
        return false;
      }
    }) ?? null;

  const otherRemoteParticipants = remoteParticipants.filter(
    (participant) => participant !== teacherRemoteParticipant,
  );

  const teacherScreenTrack = screenShareTracks.find(
    (track) => track.participant && !track.participant.isLocal,
  );
  const isTeacherSharing = !!teacherScreenTrack && isTrackReference(teacherScreenTrack);

  const uiLang: 'en' | 'pt' | 'es' = (() => {
    try {
      return (localStorage.getItem('learnendo_base_ui_lang') as 'en' | 'pt' | 'es') ?? 'pt';
    } catch {
      return 'pt';
    }
  })();

  const labels = {
    exit: uiLang === 'en' ? 'Log out' : uiLang === 'es' ? 'Salir' : 'Sair',
    cameras: uiLang === 'en' ? 'Cameras' : uiLang === 'es' ? 'Camaras' : 'Cameras',
    you: uiLang === 'en' ? 'You' : uiLang === 'es' ? 'Tu' : 'Voce',
    cameraOff: uiLang === 'en' ? 'Camera off' : uiLang === 'es' ? 'Camara apagada' : 'Sem cam',
    noCamera: uiLang === 'en' ? 'No camera' : uiLang === 'es' ? 'Sin camara' : 'Sem cam',
    back: uiLang === 'en' ? 'Back' : uiLang === 'es' ? 'Volver' : 'Voltar',
    workspace: uiLang === 'en' ? 'Workspace' : uiLang === 'es' ? 'Pizarra' : 'Lousa',
    battle: uiLang === 'en' ? 'Battle' : uiLang === 'es' ? 'Batalla' : 'Batalha',
    screen: uiLang === 'en' ? 'Screen share' : uiLang === 'es' ? 'Compartir pantalla' : 'Compartilhar tela',
    tapForAudio:
      uiLang === 'en'
        ? 'Tap here to enable audio'
        : uiLang === 'es'
          ? 'Toca aqui para activar el audio'
          : 'Toque aqui para ativar o audio',
    teacherScreen:
      uiLang === 'en'
        ? 'Teacher screen'
        : uiLang === 'es'
          ? 'Pantalla del profesor'
          : 'Tela do professor',
  };

  const teacherCameraTile = teacherRemoteParticipant
    ? {
        id: teacherRemoteParticipant.sid,
        label: teacherRemoteParticipant.name || teacherRemoteParticipant.identity,
        trackRef:
          cameraTrackRefs.find(
            (track) =>
              track.participant?.sid === teacherRemoteParticipant.sid &&
              !track.participant?.isLocal,
          ) ?? null,
        emptyLabel: labels.noCamera,
      }
    : null;

  const studentCameraTiles = [
    ...(teacherCameraTile ? [teacherCameraTile] : []),
    {
      id: 'local',
      label: labels.you,
      trackRef: localCameraTrack,
      emptyLabel: labels.cameraOff,
    },
    ...otherRemoteParticipants.map((participant) => ({
      id: participant.sid,
      label: participant.name || participant.identity,
      trackRef:
        cameraTrackRefs.find(
          (track) => track.participant?.sid === participant.sid && !track.participant?.isLocal,
        ) ?? null,
      emptyLabel: labels.noCamera,
    })),
  ];

  const expandedCameraTile =
    studentCameraTiles.find((tile) => tile.id === expandedCameraId && tile.trackRef) ?? null;

  useEffect(() => {
    if (!expandedCameraId) return;
    if (!studentCameraTiles.some((tile) => tile.id === expandedCameraId && tile.trackRef)) {
      setExpandedCameraId(null);
    }
  }, [expandedCameraId, studentCameraTiles]);

  useEffect(() => {
    setShowTeacherMiniCamera(true);
  }, [teacherCameraTile?.id]);

  const toggleCameraWithRecovery = useCallback(
    async (forceEnable = !isCameraEnabled) => {
      if (cameraBusy) return;

      setCameraBusy(true);
      setCameraError(null);
      try {
        if (!forceEnable) {
          await localParticipant.setCameraEnabled(false);
          return;
        }

        await localParticipant.setCameraEnabled(true);
        const publication = localParticipant.getTrackPublication(Track.Source.Camera);
        const mediaTrack = (publication?.track as any)?.mediaStreamTrack as
          | MediaStreamTrack
          | undefined;

        if (!mediaTrack || mediaTrack.readyState !== 'live') {
          if (publication?.track) {
            await localParticipant.unpublishTrack(publication.track).catch(() => {});
            try {
              publication.track.stop();
            } catch {
              // ignore stale cleanup
            }
          }

          const newTrack = await createLocalVideoTrack();
          await localParticipant.publishTrack(newTrack, { source: Track.Source.Camera });
        }
      } catch (err) {
        console.warn('[StudentRoomView] camera toggle with recovery failed:', err);
        setCameraError('Camera indisponivel. Verifique as permissoes do navegador.');
      } finally {
        setCameraBusy(false);
      }
    },
    [cameraBusy, isCameraEnabled, localParticipant],
  );

  return (
    <LiveClassRoomShell
      title={liveClass.title}
      exitLabel={labels.exit}
      onExit={onExit}
      mainContent={
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <div className="relative flex-1 min-h-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
          {!audioPlaybackOk ? (
            <button
              type="button"
              onClick={() => {
                void startAudio();
              }}
              className="absolute inset-x-3 top-3 z-40 flex items-center justify-center rounded-xl bg-amber-600/90 px-3 py-2 text-sm font-bold text-white shadow-lg"
            >
              🔇 {labels.tapForAudio}
            </button>
          ) : null}

          {!expandedCameraTile ? (
            <div className="student-main-stage absolute inset-0 z-20 overflow-hidden transition-opacity opacity-100 pointer-events-auto">
              <WorkspaceCanvas
                classId={liveClass.id}
                userId={user.uid}
                userName={user.displayName || user.email || 'Aluno'}
                userEmail={user.email}
                readOnly={false}
                isTeacher={false}
                studentEditingEnabled={session.studentEditingEnabled ?? true}
                classTeacherUserId={liveClass.teacherUid ?? null}
                assignedRoster={assignedRoster}
                toolbarLeading={
                  <>
                    <button
                      type="button"
                      onClick={() => setMainStageMode('workspace')}
                      className="flex h-7 w-7 items-center justify-center rounded border border-blue-600 bg-blue-600 text-sm text-white transition"
                      title={labels.workspace}
                      aria-label={labels.workspace}
                    >
                      &#x270F;&#xFE0F;
                    </button>
                    {cameraError ? (
                      <span className="flex items-center text-[10px] text-red-500" title={cameraError}>
                        &#x26A0;&#xFE0F;
                      </span>
                    ) : null}
                  </>
                }
              />
            </div>
          ) : null}

          {expandedCameraTile ? (
            <div className="absolute inset-0 z-20 bg-black">
              <VideoTrack
                trackRef={expandedCameraTile.trackRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div className="absolute left-2 top-2 z-30 flex items-center gap-2">
                <span className="rounded-full bg-black/60 px-2 py-1 text-xs font-semibold text-white">
                  {expandedCameraTile.label}
                </span>
                <button
                  onClick={() => setExpandedCameraId(null)}
                  className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-black/80"
                >
                  {labels.back}
                </button>
              </div>
            </div>
          ) : null}

          {isTeacherSharing && teacherScreenTrack ? (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black">
              <VideoTrack
                trackRef={teacherScreenTrack}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-orange-600/90 px-3 py-1 text-xs font-bold text-white">
                {labels.teacherScreen}
              </div>
            </div>
          ) : null}
        </div>
        </div>
      }
      desktopSidebar={
        <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-y-auto px-2 py-3">
          <span className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {labels.cameras}
          </span>
          {studentCameraTiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              onDoubleClick={() => tile.trackRef && setExpandedCameraId(tile.id)}
              className={`relative flex aspect-video w-full flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-black ${
                expandedCameraId === tile.id ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-700'
              }`}
              title={tile.trackRef ? labels.back : tile.emptyLabel}
            >
              {tile.trackRef ? (
                <VideoTrack
                  trackRef={tile.trackRef}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span className="px-2 text-[10px] text-slate-500">{tile.emptyLabel}</span>
              )}
              <span className="absolute bottom-1 left-1 max-w-[90%] truncate rounded bg-slate-800/80 px-1.5 text-[9px] font-semibold text-slate-300">
                {tile.label}
              </span>
            </button>
          ))}
        </div>
      }
      mobileFloatingCameras={
        <>
          {showTeacherMiniCamera && teacherCameraTile?.trackRef ? (
            <button
              type="button"
              onClick={() => setShowTeacherMiniCamera(false)}
              className="relative flex h-20 w-28 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-black shadow-2xl"
              title={teacherCameraTile.label}
            >
              <VideoTrack
                trackRef={teacherCameraTile.trackRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span className="absolute bottom-1 left-1 max-w-[90%] truncate rounded bg-slate-800/85 px-1.5 text-[9px] font-semibold text-slate-200">
                {teacherCameraTile.label}
              </span>
            </button>
          ) : null}
          {isCameraEnabled && localCameraTrack ? (
            <button
              type="button"
              onClick={() => setExpandedCameraId('local')}
              className="relative flex h-20 w-28 items-center justify-center overflow-hidden rounded-2xl border border-blue-500/40 bg-black shadow-2xl"
              title={labels.you}
            >
              <VideoTrack
                trackRef={localCameraTrack}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span className="absolute bottom-1 left-1 max-w-[90%] truncate rounded bg-slate-800/85 px-1.5 text-[9px] font-semibold text-slate-200">
                {labels.you}
              </span>
            </button>
          ) : null}
        </>
      }
      bottomBar={
        <div className="fixed bottom-0 left-0 z-50 flex w-full justify-center gap-3 border-t border-slate-800 bg-slate-950/90 py-2 backdrop-blur-sm sm:py-3">
          <button
            onClick={() => {
              localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled).catch((err) => {
                console.warn('[StudentRoomView] mic toggle failed:', err);
              });
            }}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-lg shadow transition ${
              isMicrophoneEnabled
                ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title={isMicrophoneEnabled ? 'Desligar microfone' : 'Ligar microfone'}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
              {!isMicrophoneEnabled ? <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" /> : null}
            </svg>
          </button>

          <button
            onClick={() => {
              void toggleCameraWithRecovery(!isCameraEnabled);
            }}
            disabled={cameraBusy}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-lg shadow transition ${
              isCameraEnabled
                ? 'bg-sky-500 text-white hover:bg-sky-400'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            } disabled:opacity-60`}
            title={isCameraEnabled ? 'Desligar camera' : 'Ligar camera'}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              {!isCameraEnabled ? <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" /> : null}
            </svg>
          </button>

          <button
            onClick={() => setChatOpen((current) => !current)}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-lg shadow transition ${
              chatOpen
                ? 'bg-violet-500 text-white hover:bg-violet-400'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title={chatOpen ? 'Fechar chat' : 'Abrir chat'}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
            </svg>
          </button>
        </div>
      }
      overlay={
        <>
          {chatOpen ? (
            <div className="fixed inset-x-0 bottom-16 top-0 z-40 flex flex-col bg-slate-950/95">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
                <span className="text-sm font-bold text-white">Chat</span>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-lg text-slate-400 hover:text-white"
                >
                  &times;
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <LiveClassChat
                  classId={liveClass.id}
                  user={user}
                  role="student"
                  allowAudioNotes={session.audioNotesEnabled !== false}
                />
              </div>
            </div>
          ) : null}
          {battleSession ? (
            (() => {
              console.log('[LIVE BATTLE MAP]', {
                role: 'student',
                liveClassId: liveClass.id,
                component: 'BattlePlayerView',
                handler: 'battleService.submitBattleAnswer',
                source: 'StudentRoomView',
              });
              console.log('[BATTLE NEW FLOW] BattlePlayerView is rendering because battleSession is active.');
              console.info('[BATTLE STUDENT RENDER] BattlePlayerView render start', {
                component: 'StudentRoomView',
                classId: liveClass.id,
                sessionId: battleSession.id,
                status: battleSession.status,
                uid: user.uid,
                name: user.displayName || user.email,
              });
              return (
                <BattlePlayerView
                  session={battleSession}
                  classId={liveClass.id}
                  uid={user.uid}
                  name={user.displayName || user.email || 'Aluno'}
                />
              );
            })()
          ) : (
            (() => {
              console.log('[BATTLE NEW FLOW] BattlePlayerView is NOT rendering because battleSession is null.');
              console.info('[BATTLE STUDENT RENDER] no battleSession - BattlePlayerView skipped', {
                component: 'StudentRoomView',
                classId: liveClass.id,
              });
              return null;
            })()
          )}
        </>
      }
    />
  );
};

export const StudentRoomView: React.FC<StudentRoomViewProps> = (props) => {
  const { liveClass, user, session, onOpenBattleHub, onExit } = props;
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  useEffect(() => {
    const getCreds = async () => {
      try {
        const creds = await requestLiveAudioCredentials({
          classId: liveClass.id,
          userId: user.uid,
          userName: user.displayName || 'Aluno',
          role: 'student',
        });
        setToken(creds.token);
        setWsUrl(creds.wsUrl);
      } catch (err) {
        console.error('[StudentRoomView] LiveKit credentials error:', err);
      }
    };

    void getCreds();
  }, [liveClass.id, user.displayName, user.uid]);

  if (!token || !wsUrl) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <span className="text-base text-slate-400">Conectando a sala...</span>
      </div>
    );
  }

  return (
    <LiveKitRoom serverUrl={wsUrl} token={token} connect={true} video={true} audio={true}>
      <RoomAudioRenderer />
      <StudentStage
        liveClass={liveClass}
        user={user}
        session={session}
        assignedRoster={props.assignedRoster}
        onOpenBattleHub={onOpenBattleHub}
        onExit={onExit}
      />
    </LiveKitRoom>
  );
};
