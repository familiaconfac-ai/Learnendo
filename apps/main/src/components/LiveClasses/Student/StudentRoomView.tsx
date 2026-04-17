import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useLocalParticipant,
  RoomAudioRenderer,
  useRoomContext,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track, RoomEvent, createLocalVideoTrack } from 'livekit-client';
import { isTrackReference } from '@livekit/components-core';
import { WorkspaceCanvas } from '../Workspace/WorkspaceCanvas';
import { User } from 'firebase/auth';
import { LiveClass, LiveClassSession, LiveClassPresence } from '../../../types';
import { requestLiveAudioCredentials } from '../../../services/liveAudioService';
import { LiveClassChat } from '../LiveClassChat';
import { BattlePlayerView } from '../Battle/BattlePlayerView';
import { BattleSession } from '../Battle/battleTypes';
import { subscribeBattleSession } from '../Battle/battleService';
import { getDefaultMainStageMode, isActiveBattleStatus, sanitizeMainStageMode, type MainStageMode, BATTLE_STALE_THRESHOLD_MS } from '../../../services/liveClassStage';

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
  onExit: () => void;
}

/** Inner component — runs inside <LiveKitRoom> so LiveKit hooks have context. */
const StudentStage: React.FC<{
  liveClass: LiveClass;
  user: User;
  session: LiveClassSession;
  assignedRoster: Array<{ uid: string; label: string; isOnline: boolean }>;
  onExit: () => void;
}> = ({ liveClass, user, session, assignedRoster, onExit }) => {
  const [mainStageMode, setMainStageMode] = useState<MainStageMode>(getDefaultMainStageMode());
  const [chatOpen, setChatOpen] = useState(false);
  const [audioPlaybackOk, setAudioPlaybackOk] = useState(false);
  const [camVisible, setCamVisible] = useState(true);
  const [expandedCameraId, setExpandedCameraId] = useState<string | null>(null);
  const battleWasActivatedRef = useRef(false);
  const mountedAtRef = useRef(Date.now());
  // NOTE: do NOT use a boolean one-shot flag here — Firestore onSnapshot fires
  // TWICE on subscribe (cache then server). A 1 s time-window ensures BOTH
  // callbacks are treated as "initial state" so a stale lobby session can't
  // auto-open the battle overlay.

  // ── Battle subscription ────────────────────────────────────────────────────
  const [battleSession, setBattleSession] = useState<BattleSession | null>(null);
  useEffect(() => {
    console.log('[Battle:Student] subscribing, classId:', liveClass.id);
    const unsub = subscribeBattleSession(liveClass.id, (s) => {
      console.log('[Battle:Student] snapshot — status:', s?.status ?? 'null (no doc)');

      // ── Initial window after entering the room ─────────────────────────────
      // Firestore fires a cache snapshot AND a server confirmation within ~200 ms.
      // Using a 1 s window instead of a one-shot boolean ensures BOTH are treated
      // as "current state" rather than "a new battle just started".
      const isInInitialWindow = Date.now() - mountedAtRef.current < 1000;
      if (isInInitialWindow) {
        if (
          s &&
          isActiveBattleStatus(s.status) &&
          (s.updatedAt || 0) > mountedAtRef.current - BATTLE_STALE_THRESHOLD_MS
        ) {
          console.log('[Battle:Student] initial window — recovering live battle');
          battleWasActivatedRef.current = true;
          setBattleSession(s);
        } else {
          console.log('[Battle:Student] initial window — stale battle ignored');
        }
        return;
      }

      if (!s) {
        battleWasActivatedRef.current = false;
        setBattleSession(null);
        return;
      }

      if (isActiveBattleStatus(s.status)) {
        battleWasActivatedRef.current = true;
        setBattleSession(s);
        return;
      }

      if (s.status === 'finished' && battleWasActivatedRef.current) {
        setBattleSession(s);
        return;
      }

      battleWasActivatedRef.current = false;
      setBattleSession(null);
    });
    return unsub;
  }, [liveClass.id]);

  useEffect(() => {
    // Teacher session state is the source of truth for student main stage.
    const nextMode = sanitizeMainStageMode(session.mainStageMode);
    setMainStageMode(nextMode === 'camera' ? 'workspace' : nextMode);
  }, [session.mainStageMode]);

  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const screenShareTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);
  const cameraTrackRefs = tracks.filter(isTrackReference);
  const localCameraTrack = cameraTrackRefs.find((track) => track.participant?.isLocal) ?? null;

  // Prefer the teacher track when role metadata is present; otherwise fall back
  // to the first remote camera track so the student still sees the host video.
  const teacherTrack = cameraTrackRefs.find((t) => {
    if (!t.participant || t.participant.isLocal) return false;
    try {
      const meta = JSON.parse(t.participant.metadata || '{}');
      return meta.role === 'teacher';
    } catch {
      return false;
    }
  }) ?? cameraTrackRefs.find((t) => t.participant && !t.participant.isLocal);

  // Teacher screen share track — any remote ScreenShare track (teacher is expected
  // to be the only publisher; if multiple exist, first wins)
  const teacherScreenTrack = screenShareTracks.find(
    (t) => t.participant && !t.participant.isLocal
  );
  const isTeacherSharing = !!teacherScreenTrack && isTrackReference(teacherScreenTrack);
  
  // DIAGNOSTIC: Log screen share state changes
  useEffect(() => {
    console.log('[ScreenShare:Student] State check:', {
      screenShareTracksCount: screenShareTracks.length,
      hasTeacherScreenTrack: !!teacherScreenTrack,
      isTrackRef: teacherScreenTrack ? isTrackReference(teacherScreenTrack) : 'N/A',
      isTeacherSharing,
      mainStageMode,
    });
  }, [screenShareTracks.length, teacherScreenTrack, isTeacherSharing, mainStageMode]);

  // ── Local camera preview via ref (direct MediaStream — bypasses useTracks) ──
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // DIAGNOSTIC: Log screen share render condition
  useEffect(() => {
    if (isTeacherSharing) {
      console.log('[ScreenShare:Student] RENDER CONDITION TRUE - screen share element should be visible');
    } else if (teacherScreenTrack) {
      console.log('[ScreenShare:Student] RENDER BLOCKED: track exists but isTeacherSharing is false');
    }
  }, [isTeacherSharing, teacherScreenTrack]);

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;

    if (!isCameraEnabled) {
      el.srcObject = null;
      return;
    }

    const attach = () => {
      for (const pub of localParticipant.trackPublications.values()) {
        if (pub.source === Track.Source.Camera && (pub as any).track?.mediaStreamTrack) {
          el.srcObject = new MediaStream([(pub as any).track.mediaStreamTrack]);
          el.play().catch(() => {});
          console.log('[Student] Camera preview attached via ref');
          return true;
        }
      }
      return false;
    };

    if (!attach()) {
      const t = setInterval(() => {
        if (attach()) clearInterval(t);
      }, 250);
      const stop = setTimeout(() => clearInterval(t), 5000);

      return () => {
        clearInterval(t);
        clearTimeout(stop);
      };
    }
  }, [localParticipant, isCameraEnabled]);

  const clearLocalCameraPreview = () => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = null;
  };

  const hasLiveCameraTrack = () => {
    const publication = localParticipant.getTrackPublication(Track.Source.Camera);
    const mediaTrack = (publication?.track as any)?.mediaStreamTrack as MediaStreamTrack | undefined;
    return Boolean(publication?.track && mediaTrack && mediaTrack.readyState === 'live');
  };

  const waitForLiveCameraTrack = async (timeoutMs = 1500) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (hasLiveCameraTrack()) return true;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    return hasLiveCameraTrack();
  };

  const republishCameraTrack = async () => {
    const publication = localParticipant.getTrackPublication(Track.Source.Camera);
    if (publication?.track) {
      await localParticipant.unpublishTrack(publication.track).catch(() => {});
      try {
        publication.track.stop();
      } catch {
        // ignore cleanup failures from stale camera tracks
      }
    }

    const newTrack = await createLocalVideoTrack();
    await localParticipant.publishTrack(newTrack, { source: Track.Source.Camera });
  };

  const toggleCameraWithRecovery = useCallback(async (forceEnable = !isCameraEnabled) => {
    if (cameraBusy) return;

    setCameraBusy(true);
    setCameraError(null);
    try {
      if (!forceEnable) {
        await localParticipant.setCameraEnabled(false);
        clearLocalCameraPreview();
        return;
      }

      await localParticipant.setCameraEnabled(true);
      const becameLive = await waitForLiveCameraTrack();
      if (!becameLive) {
        await republishCameraTrack();
        await waitForLiveCameraTrack();
      }
    } catch (err) {
      console.warn('[StudentRoomView] camera toggle with recovery failed:', err);
      setCameraError('Camera unavailable. Please check browser permissions.');
    } finally {
      setCameraBusy(false);
    }
  }, [cameraBusy, isCameraEnabled, localParticipant]);

  // ── Audio: room.startAudio() to defeat browser autoplay policy ──
  const startAudio = useCallback(async () => {
    try {
      await room.startAudio();
      setAudioPlaybackOk(true);
      console.log('[Student] startAudio OK');
    } catch (err) {
      console.warn('[Student] startAudio failed:', err);
    }
  }, [room]);

  useEffect(() => {
    startAudio();

    const h = () => startAudio();
    document.addEventListener('click', h);
    document.addEventListener('touchstart', h);

    return () => {
      document.removeEventListener('click', h);
      document.removeEventListener('touchstart', h);
    };
  }, [startAudio]);

  // ── Diagnostic logging (temporary) ──
  useEffect(() => {
    const onConn = () => console.log('[Student] Room connected');
    const onDisc = () => console.log('[Student] Room disconnected');
    const onSub = (track: any, _pub: any, p: any) => {
      if (track.source === 'screen_share') {
        console.log('[ScreenShare:Student] SCREEN SHARE SUBSCRIBED!', { kind: track.kind, from: p.identity });
      } else {
        console.log('[Student] TrackSubscribed', track.kind, track.source, 'from', p.identity);
      }
    };
    const onUnsub = (track: any, _pub: any, p: any) =>
      console.log('[Student] TrackUnsubscribed', track.kind, track.source, 'from', p.identity);
    const onLocalPub = (pub: any) =>
      console.log('[Student] LocalTrackPublished', pub.kind, pub.source);
    const onLocalUnpub = (pub: any) =>
      console.log('[Student] LocalTrackUnpublished', pub.kind, pub.source);
    const onAudio = () => {
      const ok = room.canPlaybackAudio;
      console.log('[Student] AudioPlaybackStatusChanged canPlayback:', ok);
      setAudioPlaybackOk(ok);
    };

    room.on(RoomEvent.Connected, onConn);
    room.on(RoomEvent.Disconnected, onDisc);
    room.on(RoomEvent.TrackSubscribed, onSub);
    room.on(RoomEvent.TrackUnsubscribed, onUnsub);
    room.on(RoomEvent.LocalTrackPublished, onLocalPub);
    room.on(RoomEvent.LocalTrackUnpublished, onLocalUnpub);
    room.on(RoomEvent.AudioPlaybackStatusChanged, onAudio);

    setAudioPlaybackOk(room.canPlaybackAudio);
    console.log('[Student] Room state:', room.state, 'canPlayback:', room.canPlaybackAudio);

    return () => {
      room.off(RoomEvent.Connected, onConn);
      room.off(RoomEvent.Disconnected, onDisc);
      room.off(RoomEvent.TrackSubscribed, onSub);
      room.off(RoomEvent.TrackUnsubscribed, onUnsub);
      room.off(RoomEvent.LocalTrackPublished, onLocalPub);
      room.off(RoomEvent.LocalTrackUnpublished, onLocalUnpub);
      room.off(RoomEvent.AudioPlaybackStatusChanged, onAudio);
    };
  }, [room]);

  // Remote audio track count (for debug panel)
  const remoteAudioCount = (() => {
    let count = 0;
    for (const p of room.remoteParticipants.values()) {
      for (const pub of p.trackPublications.values()) {
        if (pub.source === Track.Source.Microphone && pub.isSubscribed) count++;
      }
    }
    return count;
  })();
  void remoteAudioCount;

  const _uiLang: 'en' | 'pt' | 'es' = (() => {
    try { return (localStorage.getItem('learnendo_base_ui_lang') as 'en' | 'pt' | 'es') ?? 'pt'; }
    catch { return 'pt'; }
  })();

  const cameraUi = {
    title: _uiLang === 'en' ? 'Cameras' : _uiLang === 'es' ? 'Cámaras' : 'Câmeras',
    you: _uiLang === 'en' ? 'You' : _uiLang === 'es' ? 'Tú' : 'Você',
    cameraOff: _uiLang === 'en' ? 'Camera off' : _uiLang === 'es' ? 'Cámara apagada' : 'Sem cam',
    noCamera: _uiLang === 'en' ? 'No camera' : _uiLang === 'es' ? 'Sin cámara' : 'Sem cam',
    doubleClick: _uiLang === 'en' ? 'Double click to expand' : _uiLang === 'es' ? 'Doble clic para ampliar' : 'Duplo clique para ampliar',
    back: _uiLang === 'en' ? 'Back' : _uiLang === 'es' ? 'Volver' : 'Voltar',
  };

  const remoteCameraParticipants = Array.from(room.remoteParticipants.values()).sort((left, right) => {
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

  const teacherRemoteParticipant = remoteCameraParticipants.find((participant) => {
    try {
      return JSON.parse(participant.metadata || '{}').role === 'teacher';
    } catch {
      return false;
    }
  }) ?? null;

  const otherRemoteParticipants = remoteCameraParticipants.filter((participant) => participant !== teacherRemoteParticipant);

  const studentCameraTiles = [
    ...(teacherRemoteParticipant
      ? [{
          id: teacherRemoteParticipant.sid,
          label: teacherRemoteParticipant.name || teacherRemoteParticipant.identity,
          trackRef: cameraTrackRefs.find(
            (track) => track.participant?.sid === teacherRemoteParticipant.sid && !track.participant?.isLocal,
          ) ?? null,
          emptyLabel: cameraUi.noCamera,
        }]
      : []),
    {
      id: 'local',
      label: cameraUi.you,
      trackRef: localCameraTrack,
      emptyLabel: cameraUi.cameraOff,
    },
    ...otherRemoteParticipants.map((participant) => {
      const trackRef =
        cameraTrackRefs.find(
          (track) =>
            track.participant?.sid === participant.sid &&
            !track.participant?.isLocal,
        ) ?? null;

      return {
        id: participant.sid,
        label: participant.name || participant.identity,
        trackRef,
        emptyLabel: cameraUi.noCamera,
      };
    }),
  ];

  const expandedCameraTile = studentCameraTiles.find((tile) => tile.id === expandedCameraId) ?? null;

  useEffect(() => {
    if (!expandedCameraId) return;
    if (!studentCameraTiles.some((tile) => tile.id === expandedCameraId && tile.trackRef)) {
      setExpandedCameraId(null);
    }
  }, [expandedCameraId, studentCameraTiles]);

  return (
    <>
    {/* ── Mobile landscape: board fills most of screen ───────────────────── */}
    {/* <style>{`
      @media (orientation: landscape) and (max-width: 767px) {
        .student-stage-root {
          flex-direction: column !important;
          align-items: center !important;
        }
        .student-title-bar { display: none !important; }
        .student-main-stage {
          min-height: unset !important;
          height: 100% !important;
          aspect-ratio: unset !important;
          flex: 1 !important;
          margin-bottom: 0 !important;
        }
        .student-camera-sidebar {
          width: 100% !important;
          height: 3.5rem !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
        }
        .student-camera-tile { width: 3rem !important; height: 2.25rem !important; }
      }
    `}</style> */}
    <div className="student-stage-root box-border h-screen overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900 px-2 pb-20 pt-16 sm:pb-24 sm:pt-20 flex flex-col w-full">


        {/* Título da sala */}
        <div className="student-title-bar w-full max-w-6xl mx-auto mb-2 sm:mb-3 flex items-center justify-between px-2 flex-shrink-0">
          <h1 className="text-lg md:text-xl font-black text-white truncate drop-shadow">
            {liveClass.title}
          </h1>
          <button
            type="button"
            className="text-xs md:text-sm font-bold text-rose-400 hover:bg-rose-900/20 rounded-lg px-3 py-1 transition"
            onClick={() => window.history.back()}
          >
            {(() => { try { return (localStorage.getItem('learnendo_base_ui_lang') as 'en' | 'pt' | 'es') ?? 'pt'; } catch { return 'pt'; } })() === 'en' ? 'Log out' : 'Sair'}
          </button>
        </div>

        <div className="flex-1 min-h-0 w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-stretch gap-3 overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-start min-w-0 min-h-0 overflow-hidden">
          <div className="relative w-full flex-1 min-h-0 sm:flex-none sm:max-w-3xl sm:aspect-[16/9] overflow-hidden border border-slate-800 bg-slate-900/80 shadow-xl rounded-xl">
            {!audioPlaybackOk && (
          <button
            onClick={() => startAudio()}
            className="w-full flex items-center justify-center gap-2 py-2 bg-amber-600/90 text-white text-sm font-bold rounded-xl mb-2 z-40 animate-pulse"
          >
            🔇 Toque aqui para ativar o áudio
          </button>
        )}

        <div className={`student-main-stage absolute inset-0 overflow-hidden transition-all ${
          mainStageMode === 'workspace' ? 'min-h-[72vw] sm:aspect-[16/9] sm:min-h-0' : 'min-h-[55vw] sm:aspect-[16/9] sm:min-h-0'
        }`}>
          {/* CAMERA DO PROFESSOR — sempre montada, só escondida */}
          {false && (
          <div
            className={`absolute inset-0 bg-black flex items-center justify-center transition-opacity ${
              mainStageMode === 'camera'
                ? 'opacity-100 pointer-events-auto z-10'
                : 'opacity-0 pointer-events-none z-0'
            }`}
          >
            {teacherTrack && isTrackReference(teacherTrack) ? (
              <VideoTrack
                trackRef={teacherTrack}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-2">
                  <svg
                    className="w-8 h-8 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <span className="text-slate-400 text-base font-medium">
                  Aguardando câmera do professor…
                </span>
              </div>
            )}
          </div>
          )}

          {/* WORKSPACE — always mounted, shown when teacher activates workspace mode */}
          {!expandedCameraTile?.trackRef && (
          <div className="absolute inset-0 z-20 transition-opacity opacity-100 pointer-events-auto">
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
                    onClick={() => setMainStageMode('workspace')}
                    className="w-7 h-7 flex items-center justify-center rounded border transition text-sm bg-blue-600 text-white border-blue-600"
                    title="Workspace"
                    aria-label="Workspace"
                  >
                    &#x270F;&#xFE0F;
                  </button>
                </>
              }
            />
            {/* Legacy workspace camera PIP removed in favor of the right sidebar. */}
            {false && mainStageMode === 'workspace' && teacherTrack && isTrackReference(teacherTrack) && (
              <div className="absolute top-2 left-2 w-24 sm:w-32 aspect-video rounded-xl overflow-hidden border-2 border-blue-500/40 shadow-lg z-10 bg-black pointer-events-none">
                <VideoTrack
                  trackRef={teacherTrack}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div className="absolute bottom-0.5 right-0.5 text-[8px] text-white/80 bg-black/50 px-1 rounded leading-tight">
                  Prof.
                </div>
              </div>
            )}
          </div>
          )}

          {/* Legacy floating self-view removed in favor of the right sidebar. */}
          {false && camVisible && isCameraEnabled && (
            <div className="student-local-preview absolute top-2 right-4 sm:top-3 sm:right-4 w-20 sm:w-32 aspect-video rounded-xl overflow-hidden border-2 border-emerald-500/60 shadow-lg z-30 bg-black cursor-pointer" onClick={() => setCamVisible(false)}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {expandedCameraTile?.trackRef && (
            <div className="absolute inset-0 z-30 bg-black">
              <VideoTrack
                trackRef={expandedCameraTile.trackRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div className="absolute top-2 left-2 z-40 flex items-center gap-2">
                <span className="text-xs text-white bg-black/50 px-2 py-1 rounded-full font-semibold">
                  {expandedCameraTile.label}
                </span>
                <button
                  onClick={() => setExpandedCameraId(null)}
                  className="px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-semibold hover:bg-black/80 transition"
                >
                  {cameraUi.back}
                </button>
              </div>
            </div>
          )}

          {/* SCREEN SHARE — overlaid above everything when teacher is sharing */}
          {isTeacherSharing && teacherScreenTrack && (
            <div className="absolute inset-0 z-40 bg-black flex items-center justify-center">
              <VideoTrack
                trackRef={teacherScreenTrack}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-orange-600/90 text-white text-[11px] font-bold px-3 py-0.5 rounded-full pointer-events-none">
                📺 Tela do professor
              </div>
            </div>
          )}
          </div>
          </div>

          </div>

          <div className="student-camera-sidebar flex flex-row sm:flex-col gap-2 items-center px-2 sm:px-0 py-1 sm:py-3 bg-slate-950/80 border-t sm:border-t-0 sm:border-l border-slate-800 overflow-x-auto sm:overflow-y-auto w-full sm:w-28 md:w-36 h-14 sm:h-auto flex-shrink-0 sm:self-stretch">
        <span className="text-[9px] sm:text-[10px] uppercase text-slate-500 font-bold tracking-wider whitespace-nowrap mb-0 sm:mb-1">
          {cameraUi.title}
        </span>
        {studentCameraTiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            onDoubleClick={() => tile.trackRef && setExpandedCameraId(tile.id)}
            className={`student-camera-tile w-16 h-10 sm:w-24 sm:h-16 rounded-lg sm:rounded-xl bg-black border overflow-hidden flex items-center justify-center relative flex-shrink-0 ${
              expandedCameraId === tile.id ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-700'
            }`}
            title={tile.trackRef ? cameraUi.doubleClick : tile.emptyLabel}
          >
            {tile.trackRef ? (
              <VideoTrack trackRef={tile.trackRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span className="text-[9px] text-slate-500">{tile.emptyLabel}</span>
            )}
            <span className="absolute bottom-0.5 left-1 text-[8px] sm:text-[9px] text-slate-300 bg-slate-800/80 px-1 rounded font-semibold truncate max-w-[90%]">
              {tile.label}
            </span>
          </button>
        ))}
      </div>
      </div>

      {/* Barra de controles mínimos */}
      <div className="fixed bottom-0 left-0 w-full flex justify-center gap-3 bg-slate-950/90 py-2 sm:py-3 border-t border-slate-800 z-50 backdrop-blur-sm">
        {/* Microfone */}
        <button
          onClick={() => {
            localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled).catch((err) => {
              console.warn('[StudentRoomView] mic toggle failed:', err);
            });
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg shadow transition ${
            isMicrophoneEnabled
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          } disabled:opacity-60`}
          title={isMicrophoneEnabled ? 'Desligar microfone' : 'Ligar microfone'}
        >
          {isMicrophoneEnabled ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 10v2a7 7 0 01-14 0v-2"
              />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 10v2a7 7 0 01-14 0v-2"
              />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
              <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
            </svg>
          )}
        </button>

        {/* Câmera */}
        <button
          onClick={() => { void toggleCameraWithRecovery(!isCameraEnabled); }}
          disabled={cameraBusy}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg shadow transition ${
            isCameraEnabled
              ? 'bg-sky-500 hover:bg-sky-400 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }`}
          title={isCameraEnabled ? 'Desligar câmera' : 'Ligar câmera'}
        >
          {isCameraEnabled ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
              <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
            </svg>
          )}
        </button>
        {cameraError && (
          <span className="sr-only">{cameraError}</span>
        )}

        {/* Chat */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg shadow transition ${
            chatOpen
              ? 'bg-violet-500 hover:bg-violet-400 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }`}
          title={chatOpen ? 'Fechar chat' : 'Abrir chat'}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
            />
          </svg>
        </button>

      </div>

      {/* Chat */}
      <div
        className={
          chatOpen
            ? 'fixed inset-x-0 bottom-16 top-0 z-40 bg-slate-950/95 flex flex-col'
            : 'hidden'
        }
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
          <span className="text-white font-bold text-sm">Chat</span>
          <button
            onClick={() => setChatOpen(false)}
            className="text-slate-400 hover:text-white text-lg"
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

      {/* ── Battle overlay ─────────────────────────────────────────────────── */}
      {battleSession && (
        <BattlePlayerView
          session={battleSession}
          classId={liveClass.id}
          uid={user.uid}
          name={user.displayName || user.email || 'Aluno'}
        />
      )}
    </div>
    </>
  );
};

/** Outer component — fetches LiveKit token, then mounts LiveKitRoom + stage. */
export const StudentRoomView: React.FC<StudentRoomViewProps> = (props) => {
  const { liveClass, user, session, onExit } = props;
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
    getCreds();
  }, [liveClass.id, user.uid]);

  if (!token || !wsUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <span className="text-slate-400 text-base">Conectando à sala…</span>
      </div>
    );
  }

  return (
    <LiveKitRoom serverUrl={wsUrl} token={token} connect={true} video={true} audio={true}>
      <RoomAudioRenderer />
      <StudentStage liveClass={liveClass} user={user} session={session} assignedRoster={props.assignedRoster} onExit={onExit} />
    </LiveKitRoom>
  );
};
