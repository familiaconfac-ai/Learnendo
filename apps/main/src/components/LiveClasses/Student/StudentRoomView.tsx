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
import { Track, RoomEvent } from 'livekit-client';
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
  onExit: () => void;
}> = ({ liveClass, user, session, onExit }) => {
  const [mainStageMode, setMainStageMode] = useState<MainStageMode>(getDefaultMainStageMode());
  const [chatOpen, setChatOpen] = useState(false);
  const [audioPlaybackOk, setAudioPlaybackOk] = useState(false);
  const hasAppliedInitialStageRef = useRef(false);
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
    if (!hasAppliedInitialStageRef.current) {
      hasAppliedInitialStageRef.current = true;
      setMainStageMode(getDefaultMainStageMode());
      return;
    }

    setMainStageMode(sanitizeMainStageMode(session.mainStageMode));
  }, [session.mainStageMode]);

  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();

  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const screenShareTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);

  // Prefer the teacher track when role metadata is present; otherwise fall back
  // to the first remote camera track so the student still sees the host video.
  const teacherTrack = tracks.find((t) => {
    if (!t.participant || t.participant.isLocal) return false;
    try {
      const meta = JSON.parse(t.participant.metadata || '{}');
      return meta.role === 'teacher';
    } catch {
      return false;
    }
  }) ?? tracks.find((t) => t.participant && !t.participant.isLocal);

  // Teacher screen share track — any remote ScreenShare track (teacher is expected
  // to be the only publisher; if multiple exist, first wins)
  const teacherScreenTrack = screenShareTracks.find(
    (t) => t.participant && !t.participant.isLocal
  );
  const isTeacherSharing = !!teacherScreenTrack && isTrackReference(teacherScreenTrack);

  // ── Local camera preview via ref (direct MediaStream — bypasses useTracks) ──
  const localVideoRef = useRef<HTMLVideoElement>(null);

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
    const onSub = (track: any, _pub: any, p: any) =>
      console.log('[Student] TrackSubscribed', track.kind, track.source, 'from', p.identity);
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

  return (
    <>
    {/* ── Mobile landscape: board fills most of screen ───────────────────── */}
    <style>{`
      @media (orientation: landscape) and (max-width: 767px) {
        .student-stage-root {
          padding-top: 0 !important;
          padding-bottom: 3.5rem !important;
          flex-direction: row !important;
          align-items: stretch !important;
        }
        .student-title-bar { display: none !important; }
        .student-main-stage {
          min-height: unset !important;
          height: 100% !important;
          aspect-ratio: unset !important;
          flex: 1 !important;
          margin-bottom: 0 !important;
        }
        .student-local-preview { width: 4.5rem !important; }
      }
    `}</style>
    <div className="student-stage-root min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 px-2 pb-20 pt-2 sm:pb-24 sm:pt-4 flex flex-col items-center w-full">
      {/* Título da sala */}
      <div className="student-title-bar w-full max-w-3xl mb-2 sm:mb-3 flex items-center justify-between px-2">
        <h1 className="text-lg md:text-xl font-black text-white truncate drop-shadow">
          {liveClass.title}
        </h1>
        <button
          type="button"
          className="text-xs md:text-sm font-bold text-rose-400 hover:bg-rose-900/20 rounded-lg px-3 py-1 transition"
          onClick={() => window.history.back()}
        >
          Sair
        </button>
      </div>

      {/* PALCO PRINCIPAL */}
      <div className="relative w-full max-w-3xl flex flex-col items-center flex-1 min-h-0">
        {/* Audio blocked banner */}
        {!audioPlaybackOk && (
          <button
            onClick={() => startAudio()}
            className="w-full flex items-center justify-center gap-2 py-2 bg-amber-600/90 text-white text-sm font-bold rounded-xl mb-2 z-40 animate-pulse"
          >
            🔇 Toque aqui para ativar o áudio
          </button>
        )}

        <div className={`student-main-stage relative w-full rounded-2xl shadow-xl border border-slate-800 bg-slate-900/80 mb-3 overflow-hidden transition-all ${
          mainStageMode === 'workspace' ? 'min-h-[72vw] sm:aspect-[16/9] sm:min-h-0' : 'min-h-[55vw] sm:aspect-[16/9] sm:min-h-0'
        }`}>
          {/* CAMERA DO PROFESSOR — sempre montada, só escondida */}
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

          {/* WORKSPACE — always mounted, shown when teacher activates workspace mode */}
          <div
            className={`absolute inset-0 transition-opacity ${
              mainStageMode === 'workspace'
                ? 'opacity-100 pointer-events-auto z-20'
                : 'opacity-0 pointer-events-none z-0'
            }`}
          >
            <WorkspaceCanvas
              classId={liveClass.id}
              userId={user.uid}
              userName={user.displayName || user.email || 'Aluno'}
              readOnly={false}
              toolbarLeading={
                <button
                  onClick={onExit}
                  className="w-7 h-7 flex items-center justify-center rounded border transition text-sm text-slate-600 border-slate-200 hover:bg-slate-100"
                  title="Home"
                  aria-label="Home"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20"><path d="M3 9.5L10 4l7 5.5V17a1 1 0 01-1 1h-4.5v-4.5h-3V18H4a1 1 0 01-1-1V9.5z"/></svg>
                </button>
              }
            />
            {/* Teacher camera PIP while workspace is active */}
            {mainStageMode === 'workspace' && teacherTrack && isTrackReference(teacherTrack) && (
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

          {/* Preview local do aluno */}
          {isCameraEnabled && (
            <div className="student-local-preview absolute top-2 right-2 sm:top-3 sm:right-3 w-20 sm:w-32 aspect-video rounded-xl overflow-hidden border-2 border-emerald-500/60 shadow-lg z-30 bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
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
          }`}
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
          onClick={() => {
            localParticipant.setCameraEnabled(!isCameraEnabled).catch((err) => {
              console.warn('[StudentRoomView] camera toggle failed:', err);
            });
          }}
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
      <StudentStage liveClass={liveClass} user={user} session={session} onExit={onExit} />
    </LiveKitRoom>
  );
};
