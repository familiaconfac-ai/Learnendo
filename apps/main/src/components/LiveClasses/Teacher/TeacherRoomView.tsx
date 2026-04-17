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
import { Track, createLocalVideoTrack } from 'livekit-client';
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
  onExit: () => void;
}

const TeacherStage: React.FC<{
  liveClass: LiveClass;
  session: LiveClassSession;
  presence: LiveClassPresence[];
  assignedRoster: Array<{ uid: string; label: string; isOnline: boolean }>;
  handleUpdateSession: (patch: Partial<LiveClassSession>) => Promise<void>;
  teacherUid: string;
  teacherName: string;
  teacherEmail?: string | null;
  onExit: () => void;
}> = ({ liveClass, session, presence, assignedRoster, handleUpdateSession, teacherUid, teacherName, teacherEmail, onExit }) => {

  const [viewMode, setViewMode] = useState<MainStageMode>(getDefaultMainStageMode());
  const [studentEditingEnabled, setStudentEditingEnabled] = useState(session.studentEditingEnabled ?? true);
  const [expandedCameraId, setExpandedCameraId] = useState<string | null>(null);
  const camVisible = false;
  const camVideoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const room = useRoomContext();
  void room;
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
      const initialMode = getDefaultMainStageMode();
      setViewMode(initialMode === 'camera' ? 'workspace' : initialMode);
      return;
    }

    const nextMode = sanitizeMainStageMode(session.mainStageMode);
    setViewMode(nextMode === 'camera' ? 'workspace' : nextMode);
  }, [session.mainStageMode]);

  const participants = useParticipants();
  const remoteParticipants = participants.filter((p) => !p.isLocal);
  const allTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const cameraTrackRefs = allTracks.filter(isTrackReference);
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();
  const [camError, setCamError] = useState<string | null>(null);
  const [cameraBusy, setCameraBusy] = useState(false);
  const localCameraTrack = cameraTrackRefs.find((track) => track.participant?.isLocal) ?? null;

  // ── Local camera preview via direct MediaStream ───────────────────────────
  // VideoTrack + withPlaceholder:true can render a blank element before the
  // track is actually published. Direct MediaStream attachment (same as
  // StudentRoomView) is the reliable fallback.

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
    const trackCount = screenShareTracks.length;
    console.log('[ScreenShare:Teacher] Track sync:', { sharing, trackCount, hasLocalTrack: !!localScreenTrack });
    setIsScreenSharing(sharing);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localScreenTrack]);

  // ── Camera toggle with error handling ─────────────────────────────────────
  async function toggleCamera() {
    console.log('[TeacherCamera] toggleCamera called, current isCameraEnabled:', isCameraEnabled);
    try {
      setCamError(null);
      await localParticipant.setCameraEnabled(!isCameraEnabled);
      console.log('[TeacherCamera] setCameraEnabled called with:', !isCameraEnabled);
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

  void toggleCamera;

  const clearCameraPreview = () => {
    [camVideoRef.current, pipVideoRef.current].forEach((element) => {
      if (!element) return;
      element.srcObject = null;
    });
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

  async function toggleCameraWithRecovery(forceEnable = !isCameraEnabled) {
    console.log('[TeacherCamera] toggleCameraWithRecovery called, current isCameraEnabled:', isCameraEnabled, 'forceEnable:', forceEnable);
    if (cameraBusy) return;

    setCameraBusy(true);
    try {
      setCamError(null);

      if (!forceEnable) {
        await localParticipant.setCameraEnabled(false);
        clearCameraPreview();
        console.log('[TeacherCamera] camera disabled');
        return;
      }

      await localParticipant.setCameraEnabled(true);
      const becameLive = await waitForLiveCameraTrack();
      if (!becameLive) {
        console.log('[TeacherCamera] no live track after enable, republishing camera');
        await republishCameraTrack();
        await waitForLiveCameraTrack();
      }

      console.log('[TeacherCamera] camera enabled and synchronized');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission denied') || msg.includes('NotAllowed') || msg.includes('NotFound')) {
        setCamError('PermissÃ£o de cÃ¢mera negada ou cÃ¢mera nÃ£o encontrada.');
      } else {
        setCamError('CÃ¢mera indisponÃ­vel. Verifique as permissÃµes do navegador.');
      }
      console.warn('[TeacherCamera] toggleCameraWithRecovery error:', err);
    } finally {
      setCameraBusy(false);
    }
  }

  async function toggleScreenShare() {
    try {
      if (isScreenSharing) {
        console.log('[ScreenShare:Teacher] Stopping screen share');
        await localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
        console.log('[ScreenShare:Teacher] Screen share stopped');
      } else {
        console.log('[ScreenShare:Teacher] Starting screen share');
        await localParticipant.setScreenShareEnabled(true, {
          audio: true,
          selfBrowserSurface: 'include',
        });
        console.log('[ScreenShare:Teacher] Screen share started');
        setIsScreenSharing(true);
      }
    } catch (err: unknown) {
      // User cancelled the picker or permission was denied — fail gracefully
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('Permission denied') && !msg.includes('NotAllowed') && !msg.includes('cancelled')) {
        console.warn('[ScreenShare] toggleScreenShare error:', err);
      } else {
        console.log('[ScreenShare:Teacher] Screen share cancelled or denied:', msg);
      }
      // Resync with actual track state
      const actual = !!localParticipant.getTrackPublication(Track.Source.ScreenShare);
      console.log('[ScreenShare:Teacher] Resyncing state:', actual);
      setIsScreenSharing(actual);
    }
  }

  const handleModeChange = (newMode: MainStageMode) => {
    setViewMode(newMode);
    handleUpdateSession({ mainStageMode: newMode });
  };

  // ── UI language & translations ──────────────────────────────────────────────────
  const _uiLang: 'en' | 'pt' | 'es' = (() => {
    try { return (localStorage.getItem('learnendo_base_ui_lang') as 'en' | 'pt' | 'es') ?? 'pt'; }
    catch { return 'pt'; }
  })();
  const ROOM_LABELS = {
    en: { camera: 'Camera', workspace: 'Workspace', battle: 'Battle', screen: 'Screen', pip: 'Cam' },
    pt: { camera: 'Câmera',  workspace: 'Lousa',     battle: 'Batalha', screen: 'Tela',     pip: 'Câm' },
    es: { camera: 'Cámara',  workspace: 'Pizarra',   battle: 'Batalla', screen: 'Pantalla', pip: 'Cám' },
  } as const;
  const rl = ROOM_LABELS[_uiLang] ?? ROOM_LABELS.pt;
  const teacherCameraTiles = [
    {
      id: 'local',
      label: _uiLang === 'en' ? 'You' : _uiLang === 'es' ? 'Tú' : 'Você',
      trackRef: localCameraTrack,
      emptyLabel: _uiLang === 'en' ? 'Camera off' : _uiLang === 'es' ? 'Cámara apagada' : 'Sem cam',
    },
    ...remoteParticipants.map((participant) => {
      const trackRef = cameraTrackRefs.find((track) => track.participant?.sid === participant.sid && !track.participant?.isLocal) ?? null;
      return {
        id: participant.sid,
        label: participant.name || participant.identity,
        trackRef,
        emptyLabel: _uiLang === 'en' ? 'No camera' : _uiLang === 'es' ? 'Sin cámara' : 'Sem cam',
      };
    }),
  ];
  const expandedCameraTile = teacherCameraTiles.find((tile) => tile.id === expandedCameraId) ?? null;

  // ── Camera button: toggle when already in camera view; switch + enable otherwise ──
  const handleCameraButton = () => {
    void toggleCameraWithRecovery(!isCameraEnabled);
  };

  useEffect(() => {
    if (!expandedCameraId) return;
    if (!teacherCameraTiles.some((tile) => tile.id === expandedCameraId && tile.trackRef)) {
      setExpandedCameraId(null);
    }
  }, [expandedCameraId, teacherCameraTiles]);

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
    <div className="teacher-stage-root box-border h-screen overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900 px-2 pb-20 pt-16 sm:pb-24 sm:pt-20 flex flex-col w-full">
      <div className="flex-1 min-h-0 w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-stretch gap-3 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-start min-w-0 min-h-0 overflow-hidden">

        {/* Header padronizado */}
        <div className="w-full max-w-6xl mx-auto mb-2 sm:mb-3 flex items-center justify-between px-2 flex-shrink-0">
          <h1 className="text-lg md:text-xl font-black text-white truncate drop-shadow">
            {liveClass.title}
          </h1>
          <button
            type="button"
            className="text-xs md:text-sm font-bold text-rose-400 hover:bg-rose-900/20 rounded-lg px-3 py-1 transition"
            onClick={() => window.history.back()}
          >
            {_uiLang === 'en' ? 'Log out' : _uiLang === 'es' ? 'Salir' : 'Sair'}
          </button>
        </div>

        <div className="relative w-full flex-1 min-h-0 sm:flex-none sm:max-w-3xl sm:aspect-[16/9] overflow-hidden border border-slate-800 bg-slate-900/80 shadow-xl rounded-xl">
          
          {/* CAMERA */}
          {false && viewMode === 'camera' && (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {/* Floating mode switcher */}
              <div className="absolute top-2 left-2 z-20 flex gap-1">
                <button onClick={handleCameraButton} disabled={cameraBusy} className="w-7 h-7 flex items-center justify-center rounded bg-blue-600 text-white text-sm shadow disabled:opacity-60" title={rl.camera} aria-label={rl.camera}>&#x1F4F7;</button>
                <button onClick={() => handleModeChange('workspace')} className="w-7 h-7 flex items-center justify-center rounded bg-black/50 text-white hover:bg-white/20 text-sm shadow transition" title={rl.workspace} aria-label={rl.workspace}>&#x270F;&#xFE0F;</button>
                <button onClick={() => setShowBattleSetup(true)} className="w-7 h-7 flex items-center justify-center rounded bg-black/50 text-orange-400 hover:bg-white/20 text-sm shadow transition" title={rl.battle} aria-label={rl.battle}>&#x2694;&#xFE0F;</button>
                <button onClick={() => void toggleScreenShare()} className={`w-7 h-7 flex items-center justify-center rounded text-sm shadow transition ${isScreenSharing ? 'bg-green-600 text-white' : 'bg-black/50 text-white hover:bg-white/20'}`} title={rl.screen} aria-label={rl.screen}>&#x1F4FA;</button>
                {camError && <span className="text-[10px] text-red-400 bg-black/50 rounded px-1.5 flex items-center" title={camError}>&#x26A0;&#xFE0F;</span>}
              </div>
              {isCameraEnabled ? (
                <video ref={camVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : camError ? (
                <div className="flex flex-col items-center justify-center text-center gap-3 px-6">
                  <span className="text-4xl">🚫</span>
                  <span className="text-red-400 text-sm font-medium">{camError}</span>
                  <button
                    onClick={() => void toggleCameraWithRecovery(true)}
                    disabled={cameraBusy}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-60"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3">
                  <span className="text-slate-500 text-4xl">🎥</span>
                  <span className="text-slate-400 text-sm font-medium">Câmera desligada</span>
                  <button
                    onClick={() => void toggleCameraWithRecovery(true)}
                    disabled={cameraBusy}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-60"
                  >
                    Ligar câmera
                  </button>
                </div>
              )}
            </div>
          )}

          {/* WORKSPACE */}
          {!expandedCameraTile?.trackRef && (
            <div className="absolute inset-0 z-10 overflow-hidden">
              <WorkspaceCanvas
                classId={liveClass.id}
                userId={teacherUid}
                userName={teacherName}
                userEmail={teacherEmail}
                readOnly={false}
                toolbarLeading={<>
                  <button onClick={() => handleModeChange('workspace')} className="w-7 h-7 flex items-center justify-center rounded border transition text-sm bg-blue-600 text-white border-blue-600" title={rl.workspace} aria-label={rl.workspace}>&#x270F;&#xFE0F;</button>
                  <button onClick={() => setShowBattleSetup(true)} className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-orange-600 hover:bg-orange-50 transition text-sm" title={rl.battle} aria-label={rl.battle}>&#x2694;&#xFE0F;</button>
                  <button onClick={() => void toggleScreenShare()} className={`w-7 h-7 flex items-center justify-center rounded border transition text-sm ${isScreenSharing ? 'bg-green-600 text-white border-green-600' : 'text-slate-600 border-slate-200 hover:bg-slate-100'}`} title={rl.screen} aria-label={rl.screen}>&#x1F4FA;</button>
                  <button onClick={() => { const newVal = !studentEditingEnabled; setStudentEditingEnabled(newVal); handleUpdateSession({ studentEditingEnabled: newVal }); }} className={`w-7 h-7 flex items-center justify-center rounded border transition text-sm ${studentEditingEnabled ? 'bg-green-600 text-white border-green-600' : 'text-slate-600 border-slate-200 hover:bg-slate-100'}`} title={studentEditingEnabled ? 'Student editing ON' : 'Student editing OFF'} aria-label={studentEditingEnabled ? 'Student editing ON' : 'Student editing OFF'}>&#x1F512;</button>
                  {camError && <span className="text-[10px] text-red-500 flex items-center" title={camError}>&#x26A0;&#xFE0F;</span>}
                </>}
                isTeacher={true}
                studentEditingEnabled={studentEditingEnabled}
                classTeacherUserId={liveClass.teacherUid ?? teacherUid}
                assignedRoster={assignedRoster}
              />
              {/* Camera PIP — teacher's own camera shown in corner while using workspace */}
              {false && (
                <div className="absolute bottom-2 right-2 sm:right-3 w-28 sm:w-36 aspect-video rounded-xl overflow-hidden border-2 border-blue-500/60 shadow-xl z-20 bg-black flex items-center justify-center pointer-events-none">
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
          {expandedCameraTile?.trackRef && (
            <div className="absolute inset-0 z-10 bg-black">
              <VideoTrack
                trackRef={expandedCameraTile.trackRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div className="absolute top-2 left-2 z-20 flex items-center gap-2">
                <span className="text-xs text-white bg-black/50 px-2 py-1 rounded-full font-semibold">
                  {expandedCameraTile.label}
                </span>
                <button
                  onClick={() => setExpandedCameraId(null)}
                  className="px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-semibold hover:bg-black/80 transition"
                >
                  {_uiLang === 'en' ? 'Back' : _uiLang === 'es' ? 'Volver' : 'Voltar'}
                </button>
              </div>
            </div>
          )}

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

        </div>
      </div>

      {/* SIDEBAR ALUNOS — horizontal strip on mobile portrait, vertical column on sm+ */}
      <div className="teacher-stage-sidebar flex flex-row sm:flex-col gap-2 items-center px-2 sm:px-0 py-1 sm:py-3 bg-slate-950/80 border-t sm:border-t-0 sm:border-l border-slate-800 overflow-x-auto sm:overflow-y-auto w-full sm:w-28 md:w-36 h-14 sm:h-auto flex-shrink-0 sm:self-stretch">
        <span className="text-[9px] sm:text-[10px] uppercase text-slate-500 font-bold tracking-wider whitespace-nowrap mb-0 sm:mb-1">
          {_uiLang === 'en' ? 'Cameras' : _uiLang === 'es' ? 'Cámaras' : 'Câmeras'}
        </span>
        <button
          type="button"
          onDoubleClick={() => localCameraTrack && setExpandedCameraId('local')}
          className={`student-tile w-16 h-10 sm:w-24 sm:h-16 rounded-lg sm:rounded-xl bg-black border overflow-hidden flex items-center justify-center relative flex-shrink-0 ${
            expandedCameraId === 'local' ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-700'
          }`}
          title={localCameraTrack ? (_uiLang === 'en' ? 'Double click to expand' : _uiLang === 'es' ? 'Doble clic para ampliar' : 'Duplo clique para ampliar') : (_uiLang === 'en' ? 'Camera off' : _uiLang === 'es' ? 'Cámara apagada' : 'Sem cam')}
        >
          {localCameraTrack ? (
            <VideoTrack trackRef={localCameraTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span className="text-[9px] text-slate-500">{_uiLang === 'en' ? 'Camera off' : _uiLang === 'es' ? 'Cámara apagada' : 'Sem cam'}</span>
          )}
          <span className="absolute bottom-0.5 left-1 text-[8px] sm:text-[9px] text-slate-300 bg-slate-800/80 px-1 rounded font-semibold truncate max-w-[90%]">
            {_uiLang === 'en' ? 'You' : _uiLang === 'es' ? 'Tú' : 'Você'}
          </span>
        </button>
        {remoteParticipants.map((p) => {
          const pTrack = cameraTrackRefs.find((t) => t.participant?.sid === p.sid && !t.participant?.isLocal) ?? null;
          return (
            <button
              key={p.sid}
              type="button"
              onDoubleClick={() => pTrack && isTrackReference(pTrack) && setExpandedCameraId(p.sid)}
              className={`student-tile w-16 h-10 sm:w-24 sm:h-16 rounded-lg sm:rounded-xl bg-black border overflow-hidden flex items-center justify-center relative flex-shrink-0 ${
                expandedCameraId === p.sid ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-700'
              }`}
              title={pTrack && isTrackReference(pTrack) ? (_uiLang === 'en' ? 'Double click to expand' : _uiLang === 'es' ? 'Doble clic para ampliar' : 'Duplo clique para ampliar') : (_uiLang === 'en' ? 'No camera' : _uiLang === 'es' ? 'Sin cámara' : 'Sem cam')}
            >
              {pTrack && isTrackReference(pTrack) ? (
                <VideoTrack trackRef={pTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span className="text-[9px] text-slate-500">{_uiLang === 'en' ? 'No camera' : _uiLang === 'es' ? 'Sin cámara' : 'Sem cam'}</span>
              )}
              <span className="absolute bottom-0.5 left-1 text-[8px] sm:text-[9px] text-slate-300 bg-slate-800/80 px-1 rounded font-semibold truncate max-w-[90%]">
                {p.name || p.identity}
              </span>
            </button>
          );
        })}
      </div>
      </div>

      {/* Overlays Battle */}
      {showBattleSetup && (
        <BattleSetupModal
          onStart={handleLaunchBattle}
          onClose={() => setShowBattleSetup(false)}
          defaultLessonId={liveClass.lessonId?.toString()}
          defaultWorkbookId={liveClass.workbookId ?? undefined}
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

      {/* ── Bottom control bar (mic / camera / chat) ─────────────────────── */}
      <div className="fixed bottom-0 left-0 w-full flex justify-center gap-3 bg-slate-950/90 py-2 sm:py-3 border-t border-slate-800 z-50 backdrop-blur-sm">
        {/* Microfone */}
        <button
          onClick={() => {
            localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled).catch((err) => {
              console.warn('[TeacherRoomView] mic toggle failed:', err);
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
            </svg>
          )}
        </button>

        {/* Chat */}
        <button
          onClick={() => { /* TODO: implement teacher chat */ }}
          className="w-12 h-12 rounded-full flex items-center justify-center text-lg shadow transition bg-slate-700 hover:bg-slate-600 text-slate-300"
          title="Chat (em desenvolvimento)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
          </svg>
        </button>
      </div>
    </div>
    </>
  );
};

export const TeacherRoomView: React.FC<TeacherRoomViewProps> = (props) => {
  const { liveClass, user, session, presence, assignedRoster, handleUpdateSession, onExit } = props;
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
        assignedRoster={assignedRoster}
        handleUpdateSession={handleUpdateSession}
        teacherUid={user.uid}
        teacherName={user.displayName || 'Professor'}
        teacherEmail={user.email}
        onExit={onExit}
      />
    </LiveKitRoom>
  );
};
