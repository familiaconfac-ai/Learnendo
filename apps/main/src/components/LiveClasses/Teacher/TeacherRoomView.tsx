import React, { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useLocalParticipant,
  useParticipants,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { isTrackReference } from '@livekit/components-core';
import { Track, createLocalAudioTrack, createLocalVideoTrack } from 'livekit-client';
import { User } from 'firebase/auth';
import { WorkspaceCanvas } from '../Workspace/WorkspaceCanvas';
import { LiveClassRoomShell } from '../Shared/LiveClassRoomShell';
import { BottomNavigationBattleButton } from '../../BottomNavigation/BottomNavigation';
import { requestLiveAudioCredentials } from '../../../services/liveAudioService';
import type { LiveClass, LiveClassPresence, LiveClassSession } from '../../../types';

interface TeacherRoomViewProps {
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

const TeacherStage: React.FC<{
  liveClass: LiveClass;
  session: LiveClassSession;
  assignedRoster: Array<{ uid: string; label: string; isOnline: boolean }>;
  handleUpdateSession: (patch: Partial<LiveClassSession>) => Promise<void>;
  teacherUid: string;
  teacherName: string;
  teacherEmail?: string | null;
  onOpenBattleHub: () => void;
  onExit: () => void;
}> = ({
  liveClass,
  session,
  assignedRoster,
  handleUpdateSession,
  teacherUid,
  teacherName,
  teacherEmail,
  onOpenBattleHub,
  onExit,
}) => {
  const participants = useParticipants();
  const remoteParticipants = participants.filter((participant) => !participant.isLocal);
  const cameraTrackRefs = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]).filter(
    isTrackReference,
  );
  const screenShareTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);
  const localScreenTrack = screenShareTracks.find((track) => track.participant?.isLocal);
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();

  const [expandedCameraId, setExpandedCameraId] = useState<string | null>(null);
  const [studentEditingEnabled, setStudentEditingEnabled] = useState(
    session.studentEditingEnabled ?? true,
  );
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [microphoneBusy, setMicrophoneBusy] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  useEffect(() => {
    setStudentEditingEnabled(session.studentEditingEnabled ?? true);
  }, [session.studentEditingEnabled]);

  useEffect(() => {
    const sharing = Boolean(localParticipant.getTrackPublication(Track.Source.ScreenShare));
    setIsScreenSharing(sharing);
  }, [localParticipant, localScreenTrack]);

  const localCameraTrack =
    cameraTrackRefs.find((track) => track.participant?.isLocal) ?? null;

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
    screen: uiLang === 'en' ? 'Screen share' : uiLang === 'es' ? 'Compartir pantalla' : 'Compartilhar tela',
  };

  const cameraTiles = [
    {
      id: 'local',
      label: labels.you,
      trackRef: localCameraTrack,
      emptyLabel: labels.cameraOff,
    },
    ...remoteParticipants.map((participant) => ({
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
    cameraTiles.find((tile) => tile.id === expandedCameraId && tile.trackRef) ?? null;
  const primaryMobileRemoteTile =
    cameraTiles.find((tile) => tile.id !== 'local' && tile.trackRef) ?? null;

  useEffect(() => {
    if (!expandedCameraId) return;
    if (!cameraTiles.some((tile) => tile.id === expandedCameraId && tile.trackRef)) {
      setExpandedCameraId(null);
    }
  }, [cameraTiles, expandedCameraId]);

  useEffect(() => {
    console.log('[LIVECLASS PATH DEBUG] teacher room', {
      liveClassId: liveClass.id,
      workspacePath: `liveClasses/${liveClass.id}/shared/workspace`,
      battlePath: `liveClasses/${liveClass.id}/session/battle`,
      userId: teacherUid,
      userEmail: teacherEmail ?? null,
      assignedRosterCount: assignedRoster.length,
    });
  }, [assignedRoster.length, liveClass.id, teacherEmail, teacherUid]);

  const toggleCameraWithRecovery = async (forceEnable = !isCameraEnabled) => {
    if (cameraBusy) return;

    setCameraBusy(true);
    setCamError(null);
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
    } catch (error) {
      console.warn('[TeacherRoomView] camera toggle with recovery failed:', error);
      setCamError('Camera indisponivel. Verifique as permissoes do navegador.');
    } finally {
      setCameraBusy(false);
    }
  };

  const toggleMicrophoneWithRecovery = async (forceEnable = !isMicrophoneEnabled) => {
    if (microphoneBusy) return;

    setMicrophoneBusy(true);
    setMicError(null);
    try {
      if (!forceEnable) {
        await localParticipant.setMicrophoneEnabled(false);
        return;
      }

      await localParticipant.setMicrophoneEnabled(true);
      const publication = localParticipant.getTrackPublication(Track.Source.Microphone);
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

        const newTrack = await createLocalAudioTrack();
        await localParticipant.publishTrack(newTrack, { source: Track.Source.Microphone });
      }
    } catch (error) {
      console.warn('[TeacherRoomView] microphone toggle with recovery failed:', error);
      setMicError('Microfone indisponivel. Verifique as permissoes do navegador.');
    } finally {
      setMicrophoneBusy(false);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
        return;
      }

      await localParticipant.setScreenShareEnabled(true, {
        audio: true,
        selfBrowserSurface: 'include',
      });
      setIsScreenSharing(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        !message.includes('Permission denied') &&
        !message.includes('NotAllowed') &&
        !message.includes('cancelled')
      ) {
        console.warn('[TeacherRoomView] screen share toggle failed:', error);
      }
      setIsScreenSharing(Boolean(localParticipant.getTrackPublication(Track.Source.ScreenShare)));
    }
  };

  return (
    <LiveClassRoomShell
      title={liveClass.title}
      exitLabel={labels.exit}
      onExit={onExit}
      mainContent={
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
          <div className="relative flex-1 min-h-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
            {!expandedCameraTile ? (
              <div className="absolute inset-0 z-10 overflow-hidden pointer-events-auto">
                <WorkspaceCanvas
                  classId={liveClass.id}
                  userId={teacherUid}
                  userName={teacherName}
                  userEmail={teacherEmail}
                  readOnly={false}
                  toolbarLeading={
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateSession({ mainStageMode: 'workspace' })}
                        className="flex h-7 w-7 items-center justify-center rounded border border-blue-600 bg-blue-600 text-sm text-white transition"
                        title={labels.workspace}
                        aria-label={labels.workspace}
                      >
                        &#x270F;&#xFE0F;
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void toggleScreenShare();
                        }}
                        className={`flex h-7 w-7 items-center justify-center rounded border text-sm transition ${
                          isScreenSharing
                            ? 'border-green-600 bg-green-600 text-white'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                        title={labels.screen}
                        aria-label={labels.screen}
                      >
                        &#x1F4FA;
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextValue = !studentEditingEnabled;
                          setStudentEditingEnabled(nextValue);
                          void handleUpdateSession({ studentEditingEnabled: nextValue });
                        }}
                        className={`flex h-7 w-7 items-center justify-center rounded border text-sm transition ${
                          studentEditingEnabled
                            ? 'border-green-600 bg-green-600 text-white'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                        title={studentEditingEnabled ? 'Student editing on' : 'Student editing off'}
                        aria-label={studentEditingEnabled ? 'Student editing on' : 'Student editing off'}
                      >
                        &#x1F512;
                      </button>
                      {camError || micError ? (
                        <span className="flex items-center text-[10px] text-red-500" title={camError ?? micError ?? undefined}>
                          &#x26A0;&#xFE0F;
                        </span>
                      ) : null}
                    </>
                  }
                  isTeacher={true}
                  studentEditingEnabled={studentEditingEnabled}
                  classTeacherUserId={liveClass.teacherUid ?? teacherUid}
                  assignedRoster={assignedRoster}
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

            {isScreenSharing ? (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black">
                {localScreenTrack && isTrackReference(localScreenTrack) ? (
                  <VideoTrack
                    trackRef={localScreenTrack}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-300">
                    <span className="text-4xl">🖥️</span>
                    <span className="text-sm">Preparando compartilhamento...</span>
                  </div>
                )}
                <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-orange-600/90 px-3 py-1 text-xs font-bold text-white">
                  Compartilhando tela
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
          {cameraTiles.map((tile) => (
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
          {primaryMobileRemoteTile?.trackRef ? (
            <button
              type="button"
              onClick={() => setExpandedCameraId(primaryMobileRemoteTile.id)}
              className="relative flex h-20 w-28 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-black shadow-2xl"
              title={primaryMobileRemoteTile.label}
            >
              <VideoTrack
                trackRef={primaryMobileRemoteTile.trackRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span className="absolute bottom-1 left-1 max-w-[90%] truncate rounded bg-slate-800/85 px-1.5 text-[9px] font-semibold text-slate-200">
                {primaryMobileRemoteTile.label}
              </span>
            </button>
          ) : null}
          {localCameraTrack ? (
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
            type="button"
            onClick={() => {
              void toggleMicrophoneWithRecovery(!isMicrophoneEnabled);
            }}
            disabled={microphoneBusy}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-lg shadow transition ${
              isMicrophoneEnabled
                ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            } disabled:opacity-60`}
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
            type="button"
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

          <BottomNavigationBattleButton
            isActive={false}
            onClick={onOpenBattleHub}
            uiLanguage={uiLang}
          />

          <button
            onClick={() => {
              /* TODO: implement teacher chat */
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700 text-lg text-slate-300 shadow transition hover:bg-slate-600"
            title="Chat"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
            </svg>
          </button>
        </div>
      }
    />
  );
};

export const TeacherRoomView: React.FC<TeacherRoomViewProps> = (props) => {
  const { liveClass, user, session, assignedRoster, handleUpdateSession, onOpenBattleHub, onExit } = props;
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  useEffect(() => {
    const getCreds = async () => {
      try {
        const creds = await requestLiveAudioCredentials({
          classId: liveClass.id,
          userId: user.uid,
          userName: user.displayName || 'Professor',
          role: 'teacher',
        });
        setToken(creds.token);
        setWsUrl(creds.wsUrl);
      } catch (error) {
        console.error('[TeacherRoomView] LiveKit credentials error:', error);
      }
    };

    void getCreds();
  }, [liveClass.id, user.displayName, user.uid]);

  if (!token || !wsUrl) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <div className="animate-pulse text-slate-500">Conectando a sala...</div>
      </div>
    );
  }

  return (
    <LiveKitRoom serverUrl={wsUrl} token={token} connect={true} video={true} audio={true}>
      <RoomAudioRenderer />
      <TeacherStage
        liveClass={liveClass}
        session={session}
        assignedRoster={assignedRoster}
        handleUpdateSession={handleUpdateSession}
        teacherUid={user.uid}
        teacherName={user.displayName || 'Professor'}
        teacherEmail={user.email}
        onOpenBattleHub={onOpenBattleHub}
        onExit={onExit}
      />
    </LiveKitRoom>
  );
};
