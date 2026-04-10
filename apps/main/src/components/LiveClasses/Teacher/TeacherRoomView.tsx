import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceCanvas } from '../Workspace/WorkspaceCanvas';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useParticipants,
  useLocalParticipant,
  RoomAudioRenderer,
  useRoomContext,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track, RoomEvent } from 'livekit-client';
import { isTrackReference } from '@livekit/components-core';
import { User } from 'firebase/auth';
import { LiveClass, LiveClassSession, LiveClassPresence } from '../../../types';
import { requestLiveAudioCredentials } from '../../../services/liveAudioService';
import { BattleSetupModal } from '../Battle/BattleSetupModal';
import { BattleHostView } from '../Battle/BattleHostView';
import { BattleSession, BattleConfig, BattleQuestion } from '../Battle/battleTypes';
import { subscribeBattleSession, createBattleSession, deleteBattleSession } from '../Battle/battleService';
import { buildInitialBattleParticipants, buildInitialBattleScores, buildSavedBattleTemplate, sanitizeBattleQuestions } from '../Battle/battleUtils';
import { appendLiveClassBattleTemplate } from '../../../services/liveClassesService';
import { getDefaultMainStageMode, isActiveBattleStatus, sanitizeMainStageMode, type MainStageMode, BATTLE_STALE_THRESHOLD_MS } from '../../../services/liveClassStage';

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
}

const TeacherStage: React.FC<{
  liveClass: LiveClass;
  session: LiveClassSession;
  presence: LiveClassPresence[];
  handleUpdateSession: (patch: Partial<LiveClassSession>) => Promise<void>;
  teacherUid: string;
  teacherName: string;
}> = ({ liveClass, session, presence, handleUpdateSession, teacherUid, teacherName }) => {

  const [viewMode, setViewMode] = useState<MainStageMode>(getDefaultMainStageMode());
  // Whether the teacher's own camera PIP is shown while in workspace mode
  const [camVisible, setCamVisible] = useState(true);
  const room = useRoomContext();
  const hasAppliedInitialStageRef = useRef(false);
  const battleWasActivatedRef = useRef(false);
  // Track the component mount time and whether we already processed the first
  // Firestore snapshot. Used to discard stale battle sessions from previous
  // class meetings without blocking recovery when re-entering a live battle.
  const mountedAtRef = useRef(Date.now());
  // NOTE: do NOT use a boolean one-shot flag here — Firestore onSnapshot fires
  // TWICE on subscribe (cache then server). A 1 s time-window ensures BOTH
  // callbacks are treated as "initial state" so a stale lobby session can't
  // auto-open the battle overlay.

  // ── Battle state ─────────────────────────────────────────────────────────────────────────────
  const [battleSession, setBattleSession] = useState<BattleSession | null>(null);
  const [showBattleSetup, setShowBattleSetup] = useState(false);

  useEffect(() => {
    const unsub = subscribeBattleSession(liveClass.id, (nextSession) => {
      // ── Initial window after entering the room ─────────────────────────────
      // Firestore fires a cache snapshot AND a server confirmation within ~200 ms.
      // Using a 1 s window instead of a one-shot boolean ensures BOTH are treated
      // as "current state" rather than "a new battle just started".
      const isInInitialWindow = Date.now() - mountedAtRef.current < 1000;
      if (isInInitialWindow) {
        if (
          nextSession &&
          isActiveBattleStatus(nextSession.status) &&
          nextSession.status !== 'lobby' &&
          (nextSession.updatedAt || 0) > mountedAtRef.current - BATTLE_STALE_THRESHOLD_MS
        ) {
          battleWasActivatedRef.current = true;
          setBattleSession(nextSession);
        }
        // Otherwise: stale / lobby session — ignore, leave whiteboard visible
        return;
      }

      // ── Subsequent real-time updates ───────────────────────────────────────
      if (!nextSession) {
        battleWasActivatedRef.current = false;
        setBattleSession(null);
        return;
      }

      if (isActiveBattleStatus(nextSession.status)) {
        battleWasActivatedRef.current = true;
        setBattleSession(nextSession);
        return;
      }

      if (nextSession.status === 'finished' && battleWasActivatedRef.current) {
        setBattleSession(nextSession);
        return;
      }

      battleWasActivatedRef.current = false;
      setBattleSession(null);
    });
    return unsub;
  }, [liveClass.id]);

  async function handleLaunchBattle(config: BattleConfig, questions: BattleQuestion[]) {
    const sanitizedQuestions = sanitizeBattleQuestions(questions);
    if (sanitizedQuestions.length === 0) {
      window.alert('Nenhuma pergunta valida foi encontrada para iniciar o Battle.');
      return;
    }

    setShowBattleSetup(false);
    const now = Date.now();
    const optimisticSession: BattleSession = {
      id: liveClass.id,
      status: 'lobby',
      config,
      questions: sanitizedQuestions,
      currentQuestionIndex: 0,
      questionStartedAt: 0,
      participants: buildInitialBattleParticipants(teacherUid, teacherName),
      roundParticipantIds: [],
      scores: buildInitialBattleScores(config, teacherUid, teacherName),
      currentAnswers: {},
      createdAt: now,
      updatedAt: now,
    };
    battleWasActivatedRef.current = true;
    setBattleSession(optimisticSession);

    createBattleSession(liveClass.id, config, teacherUid, teacherName, sanitizedQuestions).catch((err) => {
      console.error('[Battle] Firestore sync failed:', err);
      battleWasActivatedRef.current = false;
      setBattleSession(null);
      setShowBattleSetup(true);
      window.alert('Nao foi possivel iniciar o Battle. Revise a pergunta editada e tente novamente.');
    });

    const savedTemplate = buildSavedBattleTemplate(
      config,
      sanitizedQuestions,
      `${liveClass.title} • Battle ${new Date().toLocaleDateString('pt-BR')}`
    );
    appendLiveClassBattleTemplate(liveClass.id, savedTemplate).catch((err) => {
      console.warn('[Battle] save template failed:', err);
    });
  }

  async function handleCloseBattle() {
    await deleteBattleSession(liveClass.id);
    battleWasActivatedRef.current = false;
    setBattleSession(null);
  }

  useEffect(() => {
    if (!hasAppliedInitialStageRef.current) {
      hasAppliedInitialStageRef.current = true;
      setViewMode(getDefaultMainStageMode());
      return;
    }

    setViewMode(sanitizeMainStageMode(session.mainStageMode));
  }, [session.mainStageMode]);

  const participants = useParticipants();
  const remoteParticipants = participants.filter((p) => !p.isLocal);
  const allTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const { localParticipant, isCameraEnabled } = useLocalParticipant();
  const [camError, setCamError] = useState<string | null>(null);

  // ── Local camera preview via direct MediaStream ───────────────────────────
  // VideoTrack + withPlaceholder:true can render a blank element before the
  // track is actually published. Direct MediaStream attachment (same as
  // StudentRoomView) is the reliable fallback.
  const camVideoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const attach = (el: HTMLVideoElement | null): boolean => {
      if (!el) return true; // not in DOM — skip
      if (!isCameraEnabled) { el.srcObject = null; return true; }
      for (const pub of localParticipant.trackPublications.values()) {
        if (pub.source === Track.Source.Camera && (pub as any).track?.mediaStreamTrack) {
          el.srcObject = new MediaStream([(pub as any).track.mediaStreamTrack]);
          el.play().catch(() => {});
          return true;
        }
      }
      return false; // track not yet available — caller should retry
    };

    const done = attach(camVideoRef.current) && attach(pipVideoRef.current);
    if (done || !isCameraEnabled) return;

    // Track not yet published — poll every 250 ms (up to 5 s)
    const t = setInterval(() => {
      if (attach(camVideoRef.current) && attach(pipVideoRef.current)) clearInterval(t);
    }, 250);
    const stop = setTimeout(() => clearInterval(t), 5000);
    return () => { clearInterval(t); clearTimeout(stop); };
  }, [localParticipant, isCameraEnabled, viewMode, camVisible]);

  // ── Screen sharing ────────────────────────────────────────────────────────
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenShareTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);
  const localScreenTrack = screenShareTracks.find((t) => t.participant?.isLocal);

  // Sync state if the browser-native stop button ends the share
  useEffect(() => {
    const sharing = !!localParticipant.getTrackPublication(Track.Source.ScreenShare);
    setIsScreenSharing(sharing);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localScreenTrack]);

  // ── Camera toggle with error handling ─────────────────────────────────────
  async function toggleCamera() {
    try {
      setCamError(null);
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission denied') || msg.includes('NotAllowed') || msg.includes('NotFound')) {
        setCamError('Permissão de câmera negada ou câmera não encontrada.');
      } else {
        setCamError('Câmera indisponível. Verifique as permissões do navegador.');
      }
      console.warn('[TeacherCamera] toggle error:', err);
    }
  }

  async function toggleScreenShare() {
    try {
      if (isScreenSharing) {
        await localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
      } else {
        await localParticipant.setScreenShareEnabled(true, {
          audio: true,
          selfBrowserSurface: 'include',
        });
        setIsScreenSharing(true);
      }
    } catch (err: unknown) {
      // User cancelled the picker or permission was denied — fail gracefully
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('Permission denied') && !msg.includes('NotAllowed') && !msg.includes('cancelled')) {
        console.warn('[ScreenShare] toggleScreenShare error:', err);
      }
      // Resync with actual track state
      setIsScreenSharing(!!localParticipant.getTrackPublication(Track.Source.ScreenShare));
    }
  }

  const handleModeChange = (newMode: MainStageMode) => {
    setViewMode(newMode);
    handleUpdateSession({ mainStageMode: newMode });
  };

  return (
    <>
    {/* ── Mobile responsive overrides ───────────────────────────────────────── */}
    <style>{`
      @media (orientation: landscape) and (max-width: 767px) {
        .teacher-stage-root { flex-direction: row !important; }
        .teacher-stage-sidebar {
          flex-direction: column !important;
          width: 4rem !important;
          height: 100% !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          border-top: none !important;
          border-left: 1px solid rgba(30,41,59,0.8) !important;
        }
        .teacher-stage-sidebar .student-tile { width: 3rem !important; height: 2.25rem !important; }
      }
    `}</style>
    <div className="teacher-stage-root relative w-full h-screen bg-black overflow-hidden flex flex-col sm:flex-row">
      <div className="flex-1 flex flex-col items-center justify-center min-w-0 min-h-0">
        <div className="relative w-full flex-1 sm:flex-none sm:max-w-3xl sm:aspect-[16/9] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/80 shadow-xl">
          
          {/* CAMERA */}
          {viewMode === 'camera' && (
            <div className="w-full h-full flex items-center justify-center bg-black">
              {isCameraEnabled ? (
                <video ref={camVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : camError ? (
                <div className="flex flex-col items-center justify-center text-center gap-3 px-6">
                  <span className="text-4xl">🚫</span>
                  <span className="text-red-400 text-sm font-medium">{camError}</span>
                  <button
                    onClick={() => void toggleCamera()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3">
                  <span className="text-slate-500 text-4xl">🎥</span>
                  <span className="text-slate-400 text-sm font-medium">Câmera desligada</span>
                  <button
                    onClick={() => void toggleCamera()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition"
                  >
                    Ligar câmera
                  </button>
                </div>
              )}
            </div>
          )}

          {/* WORKSPACE */}
          {viewMode === 'workspace' && (
            <div className="absolute inset-0 z-10 overflow-hidden">
              <WorkspaceCanvas
                classId={liveClass.id}
                userId={teacherUid}
                userName={teacherName}
                readOnly={false}
              />
              {/* Camera PIP — teacher's own camera shown in corner while using workspace */}
              {camVisible && (
                <div className="absolute bottom-14 sm:bottom-16 right-2 sm:right-3 w-28 sm:w-36 aspect-video rounded-xl overflow-hidden border-2 border-blue-500/60 shadow-xl z-20 bg-black flex items-center justify-center pointer-events-none">
                  {isCameraEnabled ? (
                    <video ref={pipVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-500 text-[10px]">{camError ? '🚫 Câm.' : '🎥 Off'}</span>
                  )}
                  <div className="absolute bottom-0.5 left-0.5 text-[8px] text-white/80 bg-black/50 px-1 rounded leading-tight">
                    Você
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SCREEN SHARE — local preview for teacher */}
          {isScreenSharing && (
            <div className="absolute inset-0 z-10 bg-black flex items-center justify-center">
              {localScreenTrack && isTrackReference(localScreenTrack) ? (
                <VideoTrack
                  trackRef={localScreenTrack}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300 gap-2">
                  <span className="text-4xl">🖥️</span>
                  <span className="text-sm">Preparando compartilhamento…</span>
                </div>
              )}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-orange-600/90 text-white text-xs font-bold px-3 py-1 rounded-full z-20 pointer-events-none">
                📺 Compartilhando tela
              </div>
            </div>
          )}

          {/* BARRA DE FERRAMENTAS */}
          <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-3 bg-black/90 px-2.5 sm:px-4 py-1 sm:py-2 rounded-full border border-slate-700 z-[100]">
            <button
              onClick={() => {
                handleModeChange('camera');
                // If cam mode is entered and camera not yet started, try to start it
                if (!isCameraEnabled) void toggleCamera();
              }}
              className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full border-none cursor-pointer text-sm sm:text-xl flex items-center justify-center transition-all ${viewMode === 'camera' ? 'bg-blue-600 scale-110' : 'bg-transparent hover:bg-slate-800'}`}
              title="Modo câmera"
            >
              🎥
            </button>
            <button
              onClick={() => handleModeChange('workspace')}
              title="Workspace colaborativo"
              className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full border-none cursor-pointer text-sm sm:text-xl flex items-center justify-center transition-all ${viewMode === 'workspace' ? 'bg-blue-600 scale-110' : 'bg-transparent hover:bg-slate-800'}`}
            >
              ✏️
            </button>

            {/* Camera PIP toggle — only visible in workspace mode */}
            {viewMode === 'workspace' && (
              <button
                onClick={() => setCamVisible(!camVisible)}
                title={camVisible ? 'Ocultar câmera' : 'Mostrar câmera'}
                className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full border-none cursor-pointer text-sm sm:text-xl flex items-center justify-center transition-all ${
                  camVisible ? 'bg-blue-600/70 ring-1 ring-blue-400' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                🎥
              </button>
            )}

            <button
              onClick={() => setShowBattleSetup(true)}
              title="Learnendo Battle"
              className="w-8 h-8 sm:w-11 sm:h-11 rounded-full border-none cursor-pointer text-sm sm:text-xl flex items-center justify-center bg-orange-600 hover:bg-orange-500 transition-colors"
            >
              ⚔️
            </button>

            <button
              onClick={() => void toggleScreenShare()}
              title={isScreenSharing ? 'Parar compartilhamento de tela' : 'Compartilhar tela'}
              className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full border-none cursor-pointer text-sm sm:text-xl flex items-center justify-center transition-colors ${
                isScreenSharing ? 'bg-green-500 hover:bg-green-400 ring-2 ring-green-300' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              📺
            </button>
          </div>
        </div>
      </div>

      {/* SIDEBAR ALUNOS — horizontal strip on mobile portrait, vertical column on sm+ */}
      <div className="teacher-stage-sidebar flex flex-row sm:flex-col gap-2 items-center px-2 sm:px-0 py-1 sm:py-3 bg-slate-950/80 border-t sm:border-t-0 sm:border-l border-slate-800 overflow-x-auto sm:overflow-y-auto w-full sm:w-28 md:w-36 h-14 sm:h-auto flex-shrink-0">
        <span className="text-[9px] sm:text-[10px] uppercase text-slate-500 font-bold tracking-wider whitespace-nowrap mb-0 sm:mb-1">Alunos</span>
        {remoteParticipants.length === 0 && (
          <span className="text-[9px] sm:text-[10px] text-slate-600 whitespace-nowrap">Nenhum</span>
        )}
        {remoteParticipants.map((p) => {
          const pTrack = allTracks.find((t) => t.participant?.sid === p.sid && !t.participant?.isLocal);
          return (
            <div key={p.sid} className="student-tile w-16 h-10 sm:w-24 sm:h-16 rounded-lg sm:rounded-xl bg-black border border-slate-700 overflow-hidden flex items-center justify-center relative flex-shrink-0">
              {pTrack && isTrackReference(pTrack) ? (
                <VideoTrack trackRef={pTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span className="text-[9px] text-slate-500">Sem cam</span>
              )}
              <span className="absolute bottom-0.5 left-1 text-[8px] sm:text-[9px] text-slate-300 bg-slate-800/80 px-1 rounded font-semibold truncate max-w-[90%]">
                {p.name || p.identity}
              </span>
            </div>
          );
        })}
      </div>

      {/* Overlays Battle */}
      {showBattleSetup && (
        <BattleSetupModal
          onStart={handleLaunchBattle}
          onClose={() => setShowBattleSetup(false)}
          defaultLessonId={liveClass.lessonId?.toString()}
          defaultWorkbookId={liveClass.workbookId}
          defaultCourseId={liveClass.courseId}
        />
      )}
      {battleSession && (
        <BattleHostView
          session={battleSession}
          classId={liveClass.id}
          teacherUid={teacherUid}
          activeParticipants={presence.filter((participant) => participant.isOnline).map((participant) => ({
            uid: participant.uid,
            name: participant.name || participant.uid,
          }))}
          onClose={handleCloseBattle}
          onNewBattle={() => { void handleCloseBattle().then(() => setShowBattleSetup(true)); }}
        />
      )}
    </div>
    </>
  );
};

export const TeacherRoomView: React.FC<TeacherRoomViewProps> = (props) => {
  const { liveClass, user, session, presence, handleUpdateSession } = props;
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
      } catch (err) { 
        console.error("Erro ao obter credenciais LiveKit:", err); 
      }
    };
    getCreds();
  }, [liveClass.id, user.uid, user.displayName]);

  if (!token || !wsUrl) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-slate-500 animate-pulse">Conectando à sala...</div>
      </div>
    );
  }

  return (
    <LiveKitRoom serverUrl={wsUrl} token={token} connect={true} video={true} audio={true}>
      <RoomAudioRenderer />
      <TeacherStage
        liveClass={liveClass}
        session={session}
        presence={presence}
        handleUpdateSession={handleUpdateSession}
        teacherUid={user.uid}
        teacherName={user.displayName || 'Professor'}
      />
    </LiveKitRoom>
  );
};
