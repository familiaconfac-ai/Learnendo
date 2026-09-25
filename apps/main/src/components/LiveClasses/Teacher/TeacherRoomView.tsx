import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  RoomContext,
  RoomAudioRenderer,
  VideoTrack,
  useLocalParticipant,
  useParticipants,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { isTrackReference } from '@livekit/components-core';
import { ConnectionState, RoomEvent, Track, createLocalAudioTrack, createLocalVideoTrack } from 'livekit-client';
import { User } from 'firebase/auth';
import { WorkspaceCanvas } from '../Workspace/WorkspaceCanvas';
import { StudentBoardViewMonitor } from '../Workspace/StudentBoardViewMonitor';
import type { BoardMonitorDocumentState } from '../../../models/boardViewport';
import { LiveClassRoomShell } from '../Shared/LiveClassRoomShell';
import { BottomNavigationBattleButton } from '../../BottomNavigation/BottomNavigation';
import { ExerciseSessionPanel } from '../ExerciseSessionPanel';
import { LiveTrailExerciseOverlay } from '../LiveTrailExerciseOverlay';
import {
  GrammarNavigatorModal,
  type GrammarNavigatorSelection,
  type GrammarNavigatorSurfaceContent,
} from '../../GrammarFocus/GrammarNavigatorModal';
import { getLiveKitTabId, requestLiveAudioCredentials } from '../../../services/liveAudioService';
import { logLiveKitDebug, nextLiveKitDebugCounter } from '../../../services/liveKitDebug';
import { getLiveClassMeetLink } from '../../../services/liveClassesService';
import { sanitizeMainStageMode } from '../../../services/liveClassStage';
import type { SavedBattleTemplate } from '../Battle/battleTypes';
import type { LiveClass, LiveClassPresence, LiveClassSession, LiveTrailCompletion } from '../../../types';
import { useUiLanguage } from '../../../i18n/UiLanguageContext';
import { getUiLabels } from '../../../i18n/uiLabels';
import type { UserRole } from '../../../services/userRoles';
import { appendGrammarFocusWorkspacePage } from '../../../services/grammarFocusWorkspace';
import { useLiveLessonContext } from '../LiveLessonContext';
import { disconnectPersistentTeacherRoom, getPersistentTeacherRoom } from '../../../services/persistentLiveMedia';
import { createLiveMediaTabLease, confirmLiveMediaTakeover, type LiveMediaTabLease } from '../../../services/liveMediaTabLease';
import { isLiveMediaActive, LIVE_MEDIA_GRACE_PERIOD_MS } from '../../../services/liveMediaPolicy';
import { participantHasActiveMedia, subscribeLiveMediaParticipants, updateLiveMediaParticipant } from '../../../services/liveMediaParticipantService';
import { recordLiveMediaConnected, recordLiveMediaDisconnected, type LiveMediaActivationReason } from '../../../services/liveMediaTelemetry';

function openExternalLink(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) return;
  const target = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  window.open(target, '_blank', 'noopener,noreferrer');
}

const TEACHER_TRAIL_BUTTON_LABEL = 'Trail';

function hasActiveLiveTrailSession(session: LiveClassSession) {
  return session.sessionStatus === 'active'
    && (
      (session.activeTrailIds?.length ?? 0) > 0
      || Boolean(session.activeTrailLabel)
    );
}

function getStudentWorkspaceEditingEnabled(session: LiveClassSession) {
  return session.studentEditingEnabled !== false
    || session.allowStudentWhiteboardEdit === true;
}

interface TeacherRoomViewProps {
  liveClass: LiveClass;
  user: User;
  accountRole: UserRole;
  effectiveRole: UserRole;
  session: LiveClassSession;
  presence: LiveClassPresence[];
  assignedRoster: Array<{ uid: string; label: string; isOnline: boolean }>;
  showWhiteboard: boolean;
  setShowWhiteboard: (show: boolean) => void;
  showExerciseSession: boolean;
  setShowExerciseSession: (show: boolean) => void;
  handleUpdateSession: (patch: Partial<LiveClassSession>) => Promise<void>;
  onOpenBattleHub: () => void;
  onOpenBattleTemplate: (template: SavedBattleTemplate) => void;
  onStartTrailBattle: (template: SavedBattleTemplate, completion: LiveTrailCompletion) => void | Promise<void>;
  onOpenPreviewTab: (role: 'teacher' | 'student') => void;
  onOpenTrackTab: () => void;
  onExit: () => void;
  statusMessage?: string | null;
}

const TeacherStage: React.FC<{
  liveClass: LiveClass;
  user: User;
  accountRole: UserRole;
  effectiveRole: UserRole;
  session: LiveClassSession;
  presence: LiveClassPresence[];
  assignedRoster: Array<{ uid: string; label: string; isOnline: boolean }>;
  handleUpdateSession: (patch: Partial<LiveClassSession>) => Promise<void>;
  teacherUid: string;
  teacherName: string;
  teacherEmail?: string | null;
  showExerciseSession: boolean;
  setShowExerciseSession: (show: boolean) => void;
  onOpenBattleHub: () => void;
  onOpenBattleTemplate: (template: SavedBattleTemplate) => void;
  onStartTrailBattle: (template: SavedBattleTemplate, completion: LiveTrailCompletion) => void | Promise<void>;
  onOpenPreviewTab: (role: 'teacher' | 'student') => void;
  onOpenTrackTab: () => void;
  onExit: () => void;
  ensureLiveRoomConnected: (reason?: LiveMediaActivationReason, allowTakeoverPrompt?: boolean) => Promise<void>;
  onChooseMeet: () => Promise<void>;
  liveKitError: string | null;
}> = ({
  liveClass,
  user,
  accountRole,
  effectiveRole,
  session,
  presence,
  assignedRoster,
  handleUpdateSession,
  teacherUid,
  teacherName,
  teacherEmail,
  showExerciseSession,
  setShowExerciseSession,
  onOpenBattleHub,
  onOpenBattleTemplate,
  onStartTrailBattle,
  onOpenPreviewTab,
  onOpenTrackTab,
  onExit,
  ensureLiveRoomConnected,
  onChooseMeet,
  liveKitError,
}) => {
  const lessonContext = useLiveLessonContext();
  const stageMode = sanitizeMainStageMode(session.mainStageMode);
  const hasActiveTrailSession = hasActiveLiveTrailSession(session);
  const isTrailStage = stageMode === 'trail';
  const meetLink = getLiveClassMeetLink(liveClass);
  const participants = useParticipants();
  const remoteParticipants = participants.filter((participant) => !participant.isLocal);
  const cameraTrackRefs = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]).filter(
    isTrackReference,
  );
  const screenShareTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);
  const localScreenTrack = screenShareTracks.find((track) => track.participant?.isLocal);
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();

  const [expandedCameraId, setExpandedCameraId] = useState<string | null>(null);
  const [studentEditingEnabled, setStudentEditingEnabled] = useState(
    getStudentWorkspaceEditingEnabled(session),
  );
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [microphoneBusy, setMicrophoneBusy] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [workspacePresentationActive, setWorkspacePresentationActive] = useState(false);
  const [monitorDocumentState, setMonitorDocumentState] = useState<BoardMonitorDocumentState | null>(null);
  const [showWorkspaceGrammar, setShowWorkspaceGrammar] = useState(false);
  const [exercisePanelSelection, setExercisePanelSelection] = useState<GrammarNavigatorSelection | null>(null);
  const grammarScrollRef = useRef<HTMLDivElement>(null);
  const previousNonCameraStageModeRef = useRef<Exclude<LiveClassSession['mainStageMode'], 'camera'> | null>(
    stageMode === 'camera' ? null : stageMode,
  );

  useEffect(() => {
    setStudentEditingEnabled(getStudentWorkspaceEditingEnabled(session));
  }, [session.allowStudentWhiteboardEdit, session.studentEditingEnabled]);

  useEffect(() => {
    const sharing = Boolean(localParticipant.getTrackPublication(Track.Source.ScreenShare));
    setIsScreenSharing(sharing);
  }, [localParticipant, localScreenTrack]);

  useEffect(() => {
    if (stageMode !== 'camera') {
      previousNonCameraStageModeRef.current = stageMode;
    }
  }, [stageMode]);

  const localCameraTrack =
    cameraTrackRefs.find((track) => track.participant?.isLocal) ?? null;
  const localCameraPublication = localParticipant.getTrackPublication(Track.Source.Camera);
  const localCameraMediaTrack = (localCameraPublication?.track as any)?.mediaStreamTrack as
    | MediaStreamTrack
    | undefined;
  const hasLiveLocalCamera =
    Boolean(localCameraTrack) &&
    Boolean(localCameraMediaTrack) &&
    localCameraMediaTrack?.readyState === 'live' &&
    localCameraPublication?.isMuted !== true;
  const cameraActive = isCameraEnabled && hasLiveLocalCamera;

  const isBattleStage = stageMode === 'battle';
  const showStageMicrophoneControl = isTrailStage || showExerciseSession || isBattleStage;
  const showStageQuickControls = showStageMicrophoneControl;
  const stageQuickControlsZClass = isBattleStage ? 'z-[10050]' : 'z-[160]';

  const { uiLanguage: uiLang, baseLanguage } = useUiLanguage();

  const labels = {
    exit: uiLang === 'en' ? 'Log out' : uiLang === 'es' ? 'Salir' : 'Sair',
    cameras: uiLang === 'en' ? 'Cameras' : uiLang === 'es' ? 'Camaras' : 'Cameras',
    you: uiLang === 'en' ? 'You' : uiLang === 'es' ? 'Tu' : 'Voce',
    cameraOff: uiLang === 'en' ? 'Camera off' : uiLang === 'es' ? 'Camara apagada' : 'Sem cam',
    noCamera: uiLang === 'en' ? 'No camera' : uiLang === 'es' ? 'Sin camara' : 'Sem cam',
    back: uiLang === 'en' ? 'Back' : uiLang === 'es' ? 'Volver' : 'Voltar',
    workspace: uiLang === 'en' ? 'Workspace' : uiLang === 'es' ? 'Pizarra' : 'Lousa',
    screen: uiLang === 'en' ? 'Screen share' : uiLang === 'es' ? 'Compartir pantalla' : 'Compartilhar tela',
    previewStudent:
      uiLang === 'en' ? 'Open student preview' : uiLang === 'es' ? 'Abrir preview alumno' : 'Abrir preview aluno',
    previewTeacher:
      uiLang === 'en' ? 'Open track/workbook tab' : uiLang === 'es' ? 'Abrir pestana de pista/cuaderno' : 'Abrir aba da trilha/caderno',
    trailSession:
      uiLang === 'en'
        ? 'Trail session panel'
        : uiLang === 'es'
          ? 'Panel de rutas'
          : 'Painel da trilha',
    sharingNow:
      uiLang === 'en' ? 'Sharing screen now' : uiLang === 'es' ? 'Compartiendo pantalla ahora' : 'Compartilhando tela agora',
    sharingNote:
      uiLang === 'en'
        ? 'The local preview stays hidden here to avoid the infinite screen effect.'
        : uiLang === 'es'
          ? 'La previsualizacion local queda oculta aqui para evitar el efecto de pantalla infinita.'
          : 'A pre-visualizacao local fica oculta aqui para evitar o efeito de tela infinita.',
    liveFallbackTitle:
      uiLang === 'en'
        ? 'In-app audio/video is unavailable right now.'
        : uiLang === 'es'
          ? 'El audio/video interno no esta disponible ahora.'
          : 'O audio/video interno nao esta disponivel agora.',
    liveFallbackBody:
      uiLang === 'en'
        ? 'Keep the whiteboard and battle here, and use Meet as a backup room for voice.'
        : uiLang === 'es'
          ? 'Mantengan la pizarra y la batalla aqui, y usen Meet como sala de respaldo para voz.'
          : 'Mantenham a lousa e a batalha aqui, e usem o Meet como sala de backup para voz.',
    liveFallbackMeet:
      uiLang === 'en' ? 'Open Meet backup' : uiLang === 'es' ? 'Abrir Meet de respaldo' : 'Abrir Meet de backup',
    liveFallbackNoMeet:
      uiLang === 'en'
        ? 'Add the fixed Meet link in Teacher Settings to enable the backup room.'
        : uiLang === 'es'
          ? 'Agrega el enlace fijo de Meet en Teacher Settings para habilitar la sala de respaldo.'
          : 'Adicione o link fixo do Meet em Teacher Settings para habilitar a sala de backup.',
    liveFallbackEcho:
      uiLang === 'en'
        ? 'Do not leave the in-app mic open together with Meet audio, or echo can happen.'
        : uiLang === 'es'
          ? 'No dejen el micro interno activo junto con el audio de Meet, o puede haber eco.'
          : 'Nao deixe o microfone interno aberto junto com o audio do Meet, ou pode dar eco.',
  };

  const liveFallbackBanner = liveKitError ? (
    <div className="rounded-2xl border border-amber-400/40 bg-amber-950/30 px-4 py-3 text-amber-50 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black">{labels.liveFallbackTitle}</p>
          <p className="mt-1 text-xs font-medium text-amber-100/90">{liveKitError}</p>
          <p className="mt-2 text-xs text-amber-100/80">{labels.liveFallbackBody}</p>
          <p className="mt-1 text-[11px] text-amber-200/80">{labels.liveFallbackEcho}</p>
        </div>
        {meetLink ? (
          <button
            type="button"
            onClick={() => { void onChooseMeet(); }}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400 px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-300"
          >
            {labels.liveFallbackMeet}
          </button>
        ) : (
          <div className="max-w-xs text-xs font-semibold text-amber-100/80">{labels.liveFallbackNoMeet}</div>
        )}
      </div>
    </div>
  ) : null;

  const cameraTiles = [
    {
      id: 'local',
      label: labels.you,
      trackRef: hasLiveLocalCamera ? localCameraTrack : null,
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

  const waitForLiveLocalTrack = useCallback(
    async (source: Track.Source.Camera | Track.Source.Microphone | Track.Source.ScreenShare, timeoutMs = 1500) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutMs) {
        const publication = localParticipant.getTrackPublication(source);
        const mediaTrack = (publication?.track as any)?.mediaStreamTrack as
          | MediaStreamTrack
          | undefined;
        if (publication?.track && mediaTrack?.readyState === 'live') {
          return true;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 150));
      }

      const publication = localParticipant.getTrackPublication(source);
      const mediaTrack = (publication?.track as any)?.mediaStreamTrack as
        | MediaStreamTrack
        | undefined;
      return Boolean(publication?.track && mediaTrack?.readyState === 'live');
    },
    [localParticipant],
  );

  const openGrammarOnWorkspace = async (
    mode: 'document' | 'slides',
    content: GrammarNavigatorSurfaceContent,
  ) => {
    await appendGrammarFocusWorkspacePage({
      courseId: content.courseId, workbookId: content.workbookId, lessonId: content.lessonId, grammarDocumentId: content.grammarDocumentId,
      classId: liveClass.id,
      mode,
      title: content.title,
      markdown: content.body,
      lessonNumber: content.lessonNumber,
      userId: teacherUid,
      userName: teacherName,
    });
    await handleUpdateSession({
      activeCourseId: content.courseId,
      activeWorkbookId: content.workbookId,
      activeLessonId: content.lessonId,
      mainStageMode: 'workspace',
      sharedGrammarOpen: false,
      sharedGrammarWorkbookId: content.workbookId,
      sharedGrammarLessonNumber: content.lessonNumber,
      sharedGrammarScrollRatio: null,
    });
    setShowWorkspaceGrammar(false);
  };

  const republishLocalTrack = useCallback(
    async (source: Track.Source.Camera | Track.Source.Microphone) => {
      const publication = localParticipant.getTrackPublication(source);
      if (publication?.track) {
        await localParticipant.unpublishTrack(publication.track).catch(() => {});
        try {
          publication.track.stop();
        } catch {
          // ignore stale cleanup
        }
      }

      const newTrack =
        source === Track.Source.Camera
          ? await createLocalVideoTrack()
          : await createLocalAudioTrack();
      await localParticipant.publishTrack(newTrack, { source });
    },
    [localParticipant],
  );

  const toggleCameraWithRecovery = useCallback(async (forceEnable = !isCameraEnabled) => {
    if (cameraBusy) return;

    setCameraBusy(true);
    setCamError(null);
    try {
      if (!forceEnable) {
        await localParticipant.setCameraEnabled(false);
        await handleUpdateSession({ teacherCameraEnabled: false });
        console.info('[TeacherRoomView][media] toggleCamera disabled');
        return;
      }

      await handleUpdateSession({ mediaTransport: 'livekit-connecting', mediaIdleSince: null });
      await ensureLiveRoomConnected('camera');
      console.info('[TeacherRoomView][media] toggleCamera start', {
        forceEnable,
        isCameraEnabled,
        participantIdentity: localParticipant.identity,
      });
      await localParticipant.setCameraEnabled(true);
      const becameLive = await waitForLiveLocalTrack(Track.Source.Camera);
      console.info('[TeacherRoomView][media] toggleCamera after setCameraEnabled', {
        becameLive,
      });
      if (!becameLive) {
        await republishLocalTrack(Track.Source.Camera);
        const recovered = await waitForLiveLocalTrack(Track.Source.Camera);
        console.info('[TeacherRoomView][media] toggleCamera after republish', {
          recovered,
        });
        if (!recovered) {
          throw new Error('camera-track-not-live');
        }
      }
      await handleUpdateSession({
        teacherCameraEnabled: true,
        mediaTransport: 'livekit-active',
        mediaIdleSince: null,
      });
    } catch (error) {
      console.warn('[TeacherRoomView] camera toggle with recovery failed:', error);
      console.error('[TeacherRoomView][media] toggleCamera error', error);
      setCamError(
        liveKitError
          ? 'Camera indisponivel porque a sala de audio/video nao conectou.'
          : 'Camera indisponivel. Verifique as permissoes do navegador.',
      );
    } finally {
      setCameraBusy(false);
    }
  }, [cameraBusy, ensureLiveRoomConnected, handleUpdateSession, isCameraEnabled, liveKitError, localParticipant, republishLocalTrack, waitForLiveLocalTrack]);

  const toggleMicrophoneWithRecovery = useCallback(async (forceEnable = !isMicrophoneEnabled) => {
    if (microphoneBusy) return;

    setMicrophoneBusy(true);
    setMicError(null);
    try {
      if (!forceEnable) {
        await localParticipant.setMicrophoneEnabled(false);
        await handleUpdateSession({ teacherLiveMicEnabled: false });
        console.info('[TeacherRoomView][media] toggleMicrophone disabled');
        return;
      }

      await handleUpdateSession({ mediaTransport: 'livekit-connecting', mediaIdleSince: null });
      await ensureLiveRoomConnected('mic');
      console.info('[TeacherRoomView][media] toggleMicrophone start', {
        forceEnable,
        isMicrophoneEnabled,
        participantIdentity: localParticipant.identity,
      });
      await localParticipant.setMicrophoneEnabled(true);
      const becameLive = await waitForLiveLocalTrack(Track.Source.Microphone);
      console.info('[TeacherRoomView][media] toggleMicrophone after setMicrophoneEnabled', {
        becameLive,
      });
      if (!becameLive) {
        await republishLocalTrack(Track.Source.Microphone);
        const recovered = await waitForLiveLocalTrack(Track.Source.Microphone);
        console.info('[TeacherRoomView][media] toggleMicrophone after republish', {
          recovered,
        });
        if (!recovered) {
          throw new Error('microphone-track-not-live');
        }
      }
      await handleUpdateSession({
        teacherLiveMicEnabled: true,
        mediaTransport: 'livekit-active',
        mediaIdleSince: null,
      });
    } catch (error) {
      console.warn('[TeacherRoomView] microphone toggle with recovery failed:', error);
      console.error('[TeacherRoomView][media] toggleMicrophone error', error);
      setMicError(
        liveKitError
          ? 'Microfone indisponivel porque a sala de audio/video nao conectou.'
          : 'Microfone indisponivel. Verifique as permissoes do navegador.',
      );
    } finally {
      setMicrophoneBusy(false);
    }
  }, [ensureLiveRoomConnected, handleUpdateSession, isMicrophoneEnabled, liveKitError, localParticipant, microphoneBusy, republishLocalTrack, waitForLiveLocalTrack]);

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
        await handleUpdateSession({ teacherScreenShareEnabled: false });
        if (stageMode === 'camera') {
          const restoreStageMode =
            previousNonCameraStageModeRef.current
            ?? (hasActiveTrailSession ? 'trail' : 'workspace');
          await handleUpdateSession({ mainStageMode: restoreStageMode });
        }
        return;
      }

      await handleUpdateSession({ mediaTransport: 'livekit-connecting', mediaIdleSince: null });
      await ensureLiveRoomConnected('screen-share');
      if (stageMode !== 'camera') {
        previousNonCameraStageModeRef.current = stageMode;
      }
      await localParticipant.setScreenShareEnabled(true, {
        audio: true,
        selfBrowserSurface: 'include',
      });
      if (!await waitForLiveLocalTrack(Track.Source.ScreenShare)) {
        throw new Error('screen-share-track-not-live');
      }
      setIsScreenSharing(true);
      await handleUpdateSession({
        teacherScreenShareEnabled: true,
        mediaTransport: 'livekit-active',
        mediaIdleSince: null,
      });
      if (stageMode !== 'camera') {
        await handleUpdateSession({ mainStageMode: 'camera' });
      }
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

  useEffect(() => {
    if (isScreenSharing && stageMode !== 'camera') {
      void handleUpdateSession({ mainStageMode: 'camera' });
      return;
    }

    if (!isScreenSharing && stageMode === 'camera') {
      const restoreStageMode =
        previousNonCameraStageModeRef.current
        ?? (hasActiveTrailSession ? 'trail' : 'workspace');
      void handleUpdateSession({ mainStageMode: restoreStageMode });
    }
  }, [handleUpdateSession, hasActiveTrailSession, isScreenSharing, stageMode]);

  return (
    <LiveClassRoomShell
      title={liveClass.title}
      exitLabel={labels.exit}
      onExit={onExit}
      statusBanner={liveFallbackBanner}
      immersiveMode={workspacePresentationActive}
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
                  actualRole={accountRole}
                  effectiveRole={effectiveRole}
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
                        onClick={() => setShowWorkspaceGrammar(true)}
                        className="flex h-7 items-center justify-center rounded border border-violet-300 bg-violet-50 px-2 text-[10px] font-black uppercase tracking-wide text-violet-700 transition hover:bg-violet-100"
                      >
                        {getUiLabels(uiLang).grammar}
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
                  onOpenBattleTemplate={onOpenBattleTemplate}
                  onPresentationModeChange={setWorkspacePresentationActive}
                  onMonitorDocumentChange={setMonitorDocumentState}
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
                {false ? null : (
                  <div className="flex flex-col items-center gap-2 text-slate-300">
                    <span className="text-4xl">🖥️</span>
                    <span className="text-sm font-semibold text-white">{labels.sharingNow}</span>
                    <span className="max-w-md text-center text-xs leading-5 text-slate-400">{labels.sharingNote}</span>
                  </div>
                )}
                <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-orange-600/90 px-3 py-1 text-xs font-bold text-white">
                  {labels.sharingNow}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      }
      desktopSidebar={
        <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-y-auto px-2 py-3">
          <StudentBoardViewMonitor
            presence={presence}
            assignedRoster={assignedRoster}
            documentState={monitorDocumentState}
          />
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
          {hasLiveLocalCamera && localCameraTrack ? (
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
              cameraActive
                ? 'bg-sky-500 text-white hover:bg-sky-400'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            } disabled:opacity-60`}
            title={cameraActive ? 'Desligar camera' : 'Ligar camera'}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              {!cameraActive ? <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" /> : null}
            </svg>
          </button>

          <button
            type="button"
            onClick={() => { void onChooseMeet(); }}
            disabled={!meetLink}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-black shadow transition ${
              meetLink ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : 'bg-slate-800 text-slate-500'
            } disabled:cursor-not-allowed disabled:opacity-60`}
            title={meetLink ? 'Usar Google Meet' : 'Google Meet não configurado'}
          >
            M
          </button>

          <BottomNavigationBattleButton
            isActive={false}
            onClick={onOpenBattleHub}
            uiLanguage={uiLang}
          />

          <button
            type="button"
            onClick={() => {
              if (hasActiveTrailSession && !isTrailStage) {
                setExercisePanelSelection(null);
                setShowExerciseSession(false);
                void handleUpdateSession({ mainStageMode: 'trail' });
                return;
              }
              setExercisePanelSelection(null);
              setShowExerciseSession(!showExerciseSession);
            }}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-[11px] font-black shadow transition ${
              showExerciseSession || (hasActiveTrailSession && isTrailStage)
                ? 'bg-violet-500 text-white hover:bg-violet-400'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title={hasActiveTrailSession && !isTrailStage ? 'Voltar para a trilha ao vivo' : labels.trailSession}
            aria-label={hasActiveTrailSession && !isTrailStage ? 'Voltar para a trilha ao vivo' : labels.trailSession}
          >
            {TEACHER_TRAIL_BUTTON_LABEL}
          </button>

        </div>
      }
      overlay={
        <>
          {showStageQuickControls ? (
            <div className={`pointer-events-none fixed bottom-24 right-3 sm:bottom-28 sm:right-4 ${stageQuickControlsZClass}`}>
              <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl border border-slate-700 bg-slate-950/92 p-2 shadow-2xl backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => {
                    void toggleMicrophoneWithRecovery(!isMicrophoneEnabled);
                  }}
                  disabled={microphoneBusy}
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-lg shadow transition ${
                    isMicrophoneEnabled
                      ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  } disabled:opacity-60`}
                  title={isMicrophoneEnabled ? 'Desligar microfone' : 'Ligar microfone'}
                  aria-label={isMicrophoneEnabled ? 'Desligar microfone' : 'Ligar microfone'}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                    {!isMicrophoneEnabled ? <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" /> : null}
                  </svg>
                </button>
              </div>
            </div>
          ) : null}
          {hasActiveTrailSession && isTrailStage && !showExerciseSession ? (
            <LiveTrailExerciseOverlay
              classId={liveClass.id}
              user={user}
              userRole={effectiveRole}
              session={session}
              isTeacher={true}
              assignedRoster={assignedRoster}
              defaultCourseId={liveClass.courseId ?? 'english'}
              uiLanguage={uiLang}
              onReturnToWorkspace={() => {
                setShowExerciseSession(false);
                void handleUpdateSession({ mainStageMode: 'workspace' as LiveClassSession['mainStageMode'] });
              }}
              onOpenSessionPanel={(selection) => {
                setExercisePanelSelection(selection ?? null);
                setShowExerciseSession(true);
              }}
              onStartTrailBattle={onStartTrailBattle}
            />
          ) : null}
          {showExerciseSession ? (
            <div className="fixed inset-0 z-[150] bg-slate-950/70 backdrop-blur-sm">
              <div className="absolute inset-y-0 right-0 w-full max-w-3xl overflow-y-auto border-l border-slate-800 bg-slate-950 p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-black text-white">Trail Session Panel</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setExercisePanelSelection(null);
                      setShowExerciseSession(false);
                    }}
                    className="rounded-lg px-3 py-1 text-sm font-bold text-slate-300 hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>
                <ExerciseSessionPanel
                  key={`${exercisePanelSelection?.workbookId ?? session.activeWorkbookId ?? liveClass.workbookId ?? 1}:${exercisePanelSelection?.lessonId ?? session.activeLessonId ?? liveClass.lessonId ?? ''}`}
                  classId={liveClass.id}
                  user={user}
                  isTeacher={true}
                  assignedRoster={assignedRoster}
                  defaultCourseId={lessonContext.courseId}
                  defaultWorkbookId={exercisePanelSelection?.workbookId ?? lessonContext.workbookId ?? 1}
                  defaultLessonId={exercisePanelSelection?.lessonId ?? lessonContext.lessonId ?? ''}
                  onUpdateSession={handleUpdateSession}
                  onStarted={() => {
                    setExercisePanelSelection(null);
                    setShowExerciseSession(false);
                  }}
                />
              </div>
            </div>
          ) : null}
          {showWorkspaceGrammar ? (
            <GrammarNavigatorModal
              courseId={lessonContext.courseId}
              initialWorkbookId={lessonContext.workbookId ?? 1}
              currentLessonId={lessonContext.lessonId}
              activeLanguage={baseLanguage}
              userRole={effectiveRole}
              user={user}
              scrollRef={grammarScrollRef}
              onScroll={() => undefined}
              onClose={() => setShowWorkspaceGrammar(false)}
              onOpenBoard={(content) => openGrammarOnWorkspace('document', content)}
              onOpenSlides={(content) => openGrammarOnWorkspace('slides', content)}
              onOpenPractice={(selection) => {
                setExercisePanelSelection(selection);
                setShowWorkspaceGrammar(false);
                setShowExerciseSession(true);
              }}
            />
          ) : null}
        </>
      }
    />
  );
};

export const TeacherRoomView: React.FC<TeacherRoomViewProps> = (props) => {
  const { liveClass, user, accountRole, effectiveRole, session, presence, assignedRoster, handleUpdateSession, onOpenBattleHub, onOpenBattleTemplate, onStartTrailBattle, onOpenPreviewTab, onOpenTrackTab, onExit, showExerciseSession, setShowExerciseSession, statusMessage } = props;
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [liveKitError, setLiveKitError] = useState<string | null>(null);
  const [loadingCredentials, setLoadingCredentials] = useState(true);
  const [roomInstance] = useState(
    () => {
      const instanceNumber = nextLiveKitDebugCounter('teacher_room_instance');
      const room = getPersistentTeacherRoom(liveClass.id);
      logLiveKitDebug(`Room instance created #${instanceNumber}`, {
        source: 'TeacherRoomView',
        role: 'teacher',
        classId: liveClass.id,
        roomState: room.state,
      });
      return room;
    },
  );
  const connectPromiseRef = useRef<Promise<void> | null>(null);
  const pendingRoomConnectionRef = useRef<Promise<void> | null>(null);
  const lastConnectKeyRef = useRef<string | null>(null);
  const tabIdRef = useRef(getLiveKitTabId());
  const mediaLeaseRef = useRef<LiveMediaTabLease | null>(null);
  const connectedTelemetryRef = useRef(false);
  const suppressDisconnectEventRef = useRef(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const writeTeacherParticipantState = useCallback((connecting = false) => {
    if (mediaLeaseRef.current && !mediaLeaseRef.current.isOwner()) return Promise.resolve();
    const participant = roomInstance.localParticipant;
    const microphone = participant.getTrackPublication(Track.Source.Microphone);
    const camera = participant.getTrackPublication(Track.Source.Camera);
    const screenShare = participant.getTrackPublication(Track.Source.ScreenShare);
    return updateLiveMediaParticipant(liveClass.id, {
      uid: user.uid,
      role: 'teacher',
      tabId: tabIdRef.current,
      connecting,
      microphoneActive: Boolean(microphone?.track && microphone.isMuted === false),
      cameraActive: Boolean(camera?.track && camera.isMuted === false),
      screenShareActive: Boolean(screenShare?.track && screenShare.isMuted === false),
    });
  }, [liveClass.id, roomInstance, user.uid]);

  const disconnectTeacherRoom = useCallback((reason: string, resetSession: boolean, clearParticipantState = true) => {
    if (roomInstance.state !== ConnectionState.Disconnected) {
      suppressDisconnectEventRef.current = true;
      roomInstance.disconnect();
      window.setTimeout(() => { suppressDisconnectEventRef.current = false; }, 0);
    }
    if (clearParticipantState) {
      void updateLiveMediaParticipant(liveClass.id, {
        uid: user.uid,
        role: 'teacher',
        tabId: tabIdRef.current,
        connecting: false,
        microphoneActive: false,
        cameraActive: false,
        screenShareActive: false,
      }).catch(() => undefined);
    }
    if (connectedTelemetryRef.current) {
      connectedTelemetryRef.current = false;
      recordLiveMediaDisconnected({
        uid: user.uid,
        role: 'teacher',
        classId: liveClass.id,
        tabId: tabIdRef.current,
      }, reason, resetSession ? 'none' : session.mediaTransport);
    }
    if (resetSession) {
      void handleUpdateSession({
        mediaTransport: 'none',
        teacherLiveMicEnabled: false,
        teacherCameraEnabled: false,
        teacherScreenShareEnabled: false,
        anyStudentMediaActive: false,
        mediaIdleSince: null,
      }).catch(() => undefined);
    }
  }, [handleUpdateSession, liveClass.id, roomInstance, session.mediaTransport, user.uid]);
  const disconnectTeacherRoomRef = useRef(disconnectTeacherRoom);
  disconnectTeacherRoomRef.current = disconnectTeacherRoom;

  const waitForPendingRoomConnection = useCallback(async () => {
    if (roomInstance.state === ConnectionState.Connected) {
      setLiveKitError(null);
      return;
    }

    if (pendingRoomConnectionRef.current) {
      return pendingRoomConnectionRef.current;
    }

    const pendingConnection = new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error('livekit-connection-timeout'));
      }, 8_000);

      const handleRoomSettled = () => {
        if (roomInstance.state === ConnectionState.Connected) {
          cleanup();
          setLiveKitError(null);
          resolve();
          return;
        }

        if (roomInstance.state === ConnectionState.Disconnected) {
          cleanup();
          reject(new Error('livekit-disconnected-before-connect'));
        }
      };

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        roomInstance.off(RoomEvent.Connected, handleRoomSettled);
        roomInstance.off(RoomEvent.Disconnected, handleRoomSettled);
        pendingRoomConnectionRef.current = null;
      };

      roomInstance.on(RoomEvent.Connected, handleRoomSettled);
      roomInstance.on(RoomEvent.Disconnected, handleRoomSettled);
      handleRoomSettled();
    });

    pendingRoomConnectionRef.current = pendingConnection;
    return pendingConnection;
  }, [roomInstance]);

  const ensureLiveRoomConnected = useCallback(async (
    reason: LiveMediaActivationReason = 'recovery',
    allowTakeoverPrompt = true,
  ) => {
    const lease = mediaLeaseRef.current;
    if (lease && !lease.isOwner()) {
      if (!lease.acquire(false)) {
        if (!allowTakeoverPrompt || !confirmLiveMediaTakeover() || !lease.acquire(true)) {
          throw new Error('livekit-active-in-another-tab');
        }
      }
    }
    if (!token || !wsUrl) {
      logLiveKitDebug('connect skipped: missing credentials', {
        source: 'TeacherRoomView',
        role: 'teacher',
        classId: liveClass.id,
        roomState: roomInstance.state,
      });
      throw new Error('livekit-credentials-missing');
    }

    const connectKey = `${liveClass.id}|teacher|${wsUrl}|${token}`;

    if (roomInstance.state === ConnectionState.Connected) {
      lastConnectKeyRef.current = connectKey;
      logLiveKitDebug('connect skipped: already connected', {
        source: 'TeacherRoomView',
        role: 'teacher',
        classId: liveClass.id,
        roomState: roomInstance.state,
      });
      await roomInstance.startAudio().catch(() => {});
      setLiveKitError(null);
      return;
    }

    if (connectPromiseRef.current) {
      logLiveKitDebug('connect skipped: already connecting', {
        source: 'TeacherRoomView',
        role: 'teacher',
        classId: liveClass.id,
        roomState: roomInstance.state,
      });
      return connectPromiseRef.current;
    }

    if (
      roomInstance.state === ConnectionState.Connecting ||
      roomInstance.state === ConnectionState.Reconnecting ||
      roomInstance.state === ConnectionState.SignalReconnecting
    ) {
      logLiveKitDebug('connect skipped: room state is mid-connection', {
        source: 'TeacherRoomView',
        role: 'teacher',
        classId: liveClass.id,
        roomState: roomInstance.state,
      });
      return waitForPendingRoomConnection();
    }

    const connectPromise = (async () => {
      const attemptNumber = nextLiveKitDebugCounter('teacher_connect_attempt');
      try {
        if (roomInstance.state === ConnectionState.Connected && lastConnectKeyRef.current !== connectKey) {
          logLiveKitDebug('connect reset: connected with a different key', {
            source: 'TeacherRoomView',
            role: 'teacher',
            classId: liveClass.id,
            roomState: roomInstance.state,
          });
          suppressDisconnectEventRef.current = true;
          roomInstance.disconnect();
          window.setTimeout(() => { suppressDisconnectEventRef.current = false; }, 0);
        } else if (roomInstance.state !== ConnectionState.Disconnected) {
          logLiveKitDebug('connect reset: disconnecting non-disconnected room before reconnect', {
            source: 'TeacherRoomView',
            role: 'teacher',
            classId: liveClass.id,
            roomState: roomInstance.state,
          });
          suppressDisconnectEventRef.current = true;
          roomInstance.disconnect();
          window.setTimeout(() => { suppressDisconnectEventRef.current = false; }, 0);
        }
        logLiveKitDebug(`connect attempt #${attemptNumber}`, {
          source: 'TeacherRoomView',
          role: 'teacher',
          classId: liveClass.id,
          roomState: roomInstance.state,
          wsUrlHost: (() => {
            try {
              return new URL(wsUrl).host;
            } catch {
              return wsUrl;
            }
          })(),
        });
        console.info('[TeacherRoomView][LiveKitRoom] connecting manually', {
          classId: liveClass.id,
          wsUrl,
        });
        await roomInstance.connect(wsUrl, token);
        await roomInstance.startAudio().catch(() => {});
        await writeTeacherParticipantState(false).catch(() => undefined);
        lastConnectKeyRef.current = connectKey;
        setLiveKitError(null);
        if (!connectedTelemetryRef.current) {
          connectedTelemetryRef.current = true;
          recordLiveMediaConnected({
            uid: user.uid,
            role: 'teacher',
            classId: liveClass.id,
            tabId: tabIdRef.current,
          }, reason, 'livekit-connecting');
        }
        logLiveKitDebug(`connect success #${attemptNumber}`, {
          source: 'TeacherRoomView',
          role: 'teacher',
          classId: liveClass.id,
          roomState: roomInstance.state,
        });
      } catch (error) {
        console.error('[TeacherRoomView][LiveKitRoom] connect error', error);
        setLiveKitError('Nao foi possivel conectar a sala de audio/video. Tente novamente em alguns segundos.');
        logLiveKitDebug(`connect failed #${attemptNumber}`, {
          source: 'TeacherRoomView',
          role: 'teacher',
          classId: liveClass.id,
          roomState: roomInstance.state,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        connectPromiseRef.current = null;
      }
    })();

    connectPromiseRef.current = connectPromise;
    return connectPromise;
  }, [liveClass.id, roomInstance, token, user.uid, waitForPendingRoomConnection, writeTeacherParticipantState, wsUrl]);

  useEffect(() => {
    const handleConnected = () => {
      setLiveKitError(null);
    };
    const handleDisconnected = () => {
      if (roomInstance.state === ConnectionState.Disconnected) {
        setLiveKitError('A conexao de audio/video caiu. Tente ligar a camera ou o microfone de novo.');
        if (!suppressDisconnectEventRef.current && mediaLeaseRef.current?.isOwner()) {
          disconnectTeacherRoomRef.current('unexpected-disconnect', true);
          mediaLeaseRef.current.release();
        }
      }
    };

    roomInstance.on(RoomEvent.Connected, handleConnected);
    roomInstance.on(RoomEvent.Disconnected, handleDisconnected);

    return () => {
      roomInstance.off(RoomEvent.Connected, handleConnected);
      roomInstance.off(RoomEvent.Disconnected, handleDisconnected);
    };
  }, [roomInstance]);

  useEffect(() => {
    const getCreds = async () => {
      setLoadingCredentials(true);
      try {
        const creds = await requestLiveAudioCredentials({
          classId: liveClass.id,
          userId: user.uid,
          userName: user.displayName || 'Professor',
          role: 'teacher',
          debugSource: 'TeacherRoomView',
        });
        setToken(creds.token);
        setWsUrl(creds.wsUrl);
      } catch (error) {
        console.error('[TeacherRoomView] LiveKit credentials error:', error);
        setLiveKitError('Nao foi possivel carregar o audio/video interno. A live vai abrir sem esse recurso por enquanto.');
      } finally {
        setLoadingCredentials(false);
      }
    };

    void getCreds();
  }, [liveClass.id, user.displayName, user.uid]);

  useEffect(() => {
    const lease = createLiveMediaTabLease(liveClass.id, user.uid, tabIdRef.current, () => {
      disconnectTeacherRoomRef.current('tab-takeover', false, false);
    });
    mediaLeaseRef.current = lease;
    return () => {
      lease.dispose();
      if (mediaLeaseRef.current === lease) mediaLeaseRef.current = null;
    };
  }, [liveClass.id, user.uid]);

  useEffect(() => {
    let lastSignature = '';
    return subscribeLiveMediaParticipants(liveClass.id, (participants) => {
      if (sessionRef.current.mediaTransport === 'meet') return;
      const teacherParticipant = participants.find((participant) => (
        participant.role === 'teacher' && participant.uid === user.uid
      ));
      const persistedTeacherMedia = Boolean(
        sessionRef.current.teacherLiveMicEnabled
        || sessionRef.current.teacherCameraEnabled
        || sessionRef.current.teacherScreenShareEnabled
      );
      if (!teacherParticipant && persistedTeacherMedia) {
        const lease = mediaLeaseRef.current;
        if (!lease || lease.isOwner() || lease.acquire(false)) {
          void handleUpdateSession({
            teacherLiveMicEnabled: false,
            teacherCameraEnabled: false,
            teacherScreenShareEnabled: false,
          });
        }
      }
      const students = participants.filter((participant) => participant.role === 'student');
      const anyStudentActive = students.some(participantHasActiveMedia);
      const anyStudentConnecting = students.some((participant) => participant.connecting);
      const signature = `${anyStudentActive}:${anyStudentConnecting}`;
      if (signature === lastSignature) return;
      lastSignature = signature;

      if (anyStudentActive) {
        void handleUpdateSession({
          anyStudentMediaActive: true,
          mediaTransport: 'livekit-active',
          mediaIdleSince: null,
        });
        void ensureLiveRoomConnected('student-media', false).catch(() => undefined);
      } else {
        if (sessionRef.current.anyStudentMediaActive) {
          void handleUpdateSession({ anyStudentMediaActive: false });
        }
        if (anyStudentConnecting) {
          void handleUpdateSession({ mediaTransport: 'livekit-connecting', mediaIdleSince: null });
          void ensureLiveRoomConnected('student-media', false).catch(() => undefined);
        }
      }
    }, (error) => console.warn('[TeacherRoomView] student media subscription failed', error));
  }, [ensureLiveRoomConnected, handleUpdateSession, liveClass.id, user.uid]);

  useEffect(() => {
    const syncConfirmedTracks = () => {
      if (mediaLeaseRef.current && !mediaLeaseRef.current.isOwner()) return;
      const local = roomInstance.localParticipant;
      const microphone = local.getTrackPublication(Track.Source.Microphone);
      const camera = local.getTrackPublication(Track.Source.Camera);
      const screenShare = local.getTrackPublication(Track.Source.ScreenShare);
      const microphoneActive = Boolean(microphone?.track && microphone.isMuted === false);
      const cameraActive = Boolean(camera?.track && camera.isMuted === false);
      const screenShareActive = Boolean(screenShare?.track && screenShare.isMuted === false);
      void writeTeacherParticipantState(false).catch(() => undefined);
      void handleUpdateSession({
        teacherLiveMicEnabled: microphoneActive,
        teacherCameraEnabled: cameraActive,
        teacherScreenShareEnabled: screenShareActive,
        ...((microphoneActive || cameraActive || screenShareActive) ? {
          mediaTransport: 'livekit-active' as const,
          mediaIdleSince: null,
        } : {}),
      }).catch(() => undefined);
    };
    roomInstance.on(RoomEvent.LocalTrackPublished, syncConfirmedTracks);
    roomInstance.on(RoomEvent.LocalTrackUnpublished, syncConfirmedTracks);
    roomInstance.on(RoomEvent.TrackMuted, syncConfirmedTracks);
    roomInstance.on(RoomEvent.TrackUnmuted, syncConfirmedTracks);
    return () => {
      roomInstance.off(RoomEvent.LocalTrackPublished, syncConfirmedTracks);
      roomInstance.off(RoomEvent.LocalTrackUnpublished, syncConfirmedTracks);
      roomInstance.off(RoomEvent.TrackMuted, syncConfirmedTracks);
      roomInstance.off(RoomEvent.TrackUnmuted, syncConfirmedTracks);
    };
  }, [handleUpdateSession, roomInstance, writeTeacherParticipantState]);

  useEffect(() => {
    const heartbeat = window.setInterval(() => {
      const local = roomInstance.localParticipant;
      const microphone = local.getTrackPublication(Track.Source.Microphone);
      const camera = local.getTrackPublication(Track.Source.Camera);
      const screenShare = local.getTrackPublication(Track.Source.ScreenShare);
      const active = Boolean(microphone?.track && microphone.isMuted === false)
        || Boolean(camera?.track && camera.isMuted === false)
        || Boolean(screenShare?.track && screenShare.isMuted === false);
      if (active) void writeTeacherParticipantState(false).catch(() => undefined);
    }, 5_000);
    return () => window.clearInterval(heartbeat);
  }, [roomInstance, writeTeacherParticipantState]);

  useEffect(() => {
    if (mediaLeaseRef.current && !mediaLeaseRef.current.isOwner()) return;
    if (session.mediaTransport === 'meet') {
      disconnectTeacherRoom('meet-selected', false);
      mediaLeaseRef.current?.release();
      return;
    }
    if (isLiveMediaActive(session)) {
      if (session.mediaTransport !== 'livekit-active' || session.mediaIdleSince) {
        void handleUpdateSession({ mediaTransport: 'livekit-active', mediaIdleSince: null });
      }
      return;
    }
    if (session.mediaTransport !== 'livekit-active' && session.mediaTransport !== 'livekit-connecting') return;

    if (!session.mediaIdleSince) {
      void handleUpdateSession({ mediaIdleSince: new Date().toISOString() });
      return;
    }
    const remaining = Math.max(0, LIVE_MEDIA_GRACE_PERIOD_MS - (Date.now() - Date.parse(session.mediaIdleSince)));
    const timeout = window.setTimeout(() => {
      disconnectTeacherRoom('media-idle-timeout', true);
      mediaLeaseRef.current?.release();
    }, remaining);
    return () => window.clearTimeout(timeout);
  }, [disconnectTeacherRoom, handleUpdateSession, session]);

  const chooseMeet = useCallback(async () => {
    await Promise.allSettled([
      roomInstance.localParticipant.setMicrophoneEnabled(false),
      roomInstance.localParticipant.setCameraEnabled(false),
      roomInstance.localParticipant.setScreenShareEnabled(false),
    ]);
    sessionRef.current = {
      ...sessionRef.current,
      mediaTransport: 'meet',
      teacherLiveMicEnabled: false,
      teacherCameraEnabled: false,
      teacherScreenShareEnabled: false,
      anyStudentMediaActive: false,
      mediaIdleSince: null,
    };
    await handleUpdateSession({
      mediaTransport: 'meet',
      teacherLiveMicEnabled: false,
      teacherCameraEnabled: false,
      teacherScreenShareEnabled: false,
      anyStudentMediaActive: false,
      mediaIdleSince: null,
    });
    disconnectTeacherRoom('meet-selected', false);
    mediaLeaseRef.current?.release();
    const meetLink = getLiveClassMeetLink(liveClass);
    if (meetLink) openExternalLink(meetLink);
  }, [disconnectTeacherRoom, handleUpdateSession, liveClass, roomInstance]);

  useEffect(() => () => {
    const ownsMediaLease = mediaLeaseRef.current?.isOwner() ?? true;
    if (roomInstance.state !== ConnectionState.Disconnected) {
      suppressDisconnectEventRef.current = true;
      roomInstance.disconnect();
    }
    mediaLeaseRef.current?.release();
    if (ownsMediaLease) {
      void updateLiveMediaParticipant(liveClass.id, {
        uid: user.uid,
        role: 'teacher',
        tabId: tabIdRef.current,
        connecting: false,
        microphoneActive: false,
        cameraActive: false,
        screenShareActive: false,
      }).catch(() => undefined);
      void handleUpdateSession({
        mediaTransport: 'none',
        teacherLiveMicEnabled: false,
        teacherCameraEnabled: false,
        teacherScreenShareEnabled: false,
        anyStudentMediaActive: false,
        mediaIdleSince: null,
      }).catch(() => undefined);
    }
  }, [handleUpdateSession, liveClass.id, roomInstance, user.uid]);

  if (!liveClass?.id || !user?.uid) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 px-6 text-center">
        <div className="max-w-lg rounded-3xl border border-slate-800 bg-slate-900/90 px-6 py-5 shadow-2xl">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
            Live Class
          </div>
          <p className="mt-3 text-sm text-slate-200">
            Nao foi possivel identificar o professor ou a sala ao vivo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="lk-room-container relative">
      <RoomContext.Provider value={roomInstance}>
        <RoomAudioRenderer />
        <TeacherStage
          liveClass={liveClass}
          user={user}
          accountRole={accountRole}
          effectiveRole={effectiveRole}
          session={session}
          presence={presence}
          assignedRoster={assignedRoster}
          handleUpdateSession={handleUpdateSession}
          teacherUid={user.uid}
          teacherName={user.displayName || 'Professor'}
          teacherEmail={user.email}
          showExerciseSession={showExerciseSession}
          setShowExerciseSession={setShowExerciseSession}
          onOpenBattleHub={onOpenBattleHub}
          onOpenBattleTemplate={onOpenBattleTemplate}
          onStartTrailBattle={onStartTrailBattle}
          onOpenPreviewTab={onOpenPreviewTab}
          onOpenTrackTab={onOpenTrackTab}
          onExit={() => {
            disconnectTeacherRoom('explicit-exit', true);
            disconnectPersistentTeacherRoom(liveClass.id);
            mediaLeaseRef.current?.release();
            onExit();
          }}
          ensureLiveRoomConnected={ensureLiveRoomConnected}
          onChooseMeet={chooseMeet}
          liveKitError={liveKitError}
        />
      </RoomContext.Provider>
      {(loadingCredentials || statusMessage) ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-[70] flex justify-center px-4">
          <div className="max-w-2xl rounded-2xl border border-slate-700 bg-slate-950/92 px-4 py-3 text-center shadow-2xl backdrop-blur-sm">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
              Live Class
            </div>
            {loadingCredentials ? (
              <p className="mt-1 text-sm text-slate-200">Carregando sala...</p>
            ) : null}
            {statusMessage ? (
              <p className="mt-1 text-sm text-amber-200">{statusMessage}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
