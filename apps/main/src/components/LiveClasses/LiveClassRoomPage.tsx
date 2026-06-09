import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { LiveClass, LiveClassPresence, LiveClassSession, SectionType } from '../../types';
import {
  isLivePresenceActive,
  markLivePresenceOffline,
  subscribeLivePresence,
  subscribeLiveSession,
  updateLiveSession,
  upsertLivePresence,
} from '../../services/liveSessionService';
import { getDefaultMainStageMode } from '../../services/liveClassStage';
import { learnendoLogo } from '../../assets/branding';
import { BattleHubPage } from '../BattleHub/BattleHubPage';
import type { SavedBattleTemplate } from './Battle/battleTypes';
import { deleteBattleSession } from './Battle/battleService';
import { LiveClassRoomShell } from './Shared/LiveClassRoomShell';
import { WorkspaceCanvas } from './Workspace/WorkspaceCanvas';
import { StudentRoomView } from './Student/StudentRoomView';
import { TeacherRoomView } from './Teacher/TeacherRoomView';
import { resolveAssignedStudentRoster } from '../../services/liveClassesService';
import {
  BASE_UI_LANGUAGE_STORAGE_KEY,
  TAB_APP_CONTEXT_STORAGE_KEY,
  getScopedStorageItem,
} from '../../utils/tabScopedStorage';

interface LiveClassRoomPageProps {
  liveClass: LiveClass;
  user: User;
  isTeacher: boolean;
  uiLanguage?: 'en' | 'pt' | 'es';
  onOpenClassContent: (liveClass: LiveClass) => void;
  onEditClass: (liveClass: LiveClass) => void;
  onOpenBattleHub: () => void;
  onExit: () => void;
}

type LiveClassPreviewRole = 'teacher' | 'student';

interface LiveRoomErrorBoundaryProps {
  children: React.ReactNode;
}

interface LiveRoomErrorBoundaryState {
  hasError: boolean;
  message: string | null;
}

class LiveRoomErrorBoundary extends React.Component<LiveRoomErrorBoundaryProps, LiveRoomErrorBoundaryState> {
  state: LiveRoomErrorBoundaryState = {
    hasError: false,
    message: null,
  };

  static getDerivedStateFromError(error: unknown): LiveRoomErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Erro inesperado ao abrir a live.',
    };
  }

  componentDidCatch(error: unknown) {
    console.error('[LIVE_DEBUG] live room render failed', error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 px-6 text-center">
        <div className="max-w-lg rounded-3xl border border-rose-500/40 bg-slate-900/95 px-6 py-5 shadow-2xl">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">
            Live Class
          </div>
          <p className="mt-3 text-sm text-slate-200">
            Ocorreu um erro ao renderizar a sala ao vivo.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {this.state.message || 'Erro inesperado ao abrir a live.'}
          </p>
        </div>
      </div>
    );
  }
}

function getPreviewRoleFromSearch(): LiveClassPreviewRole | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const preview = params.get('preview');
  return preview === 'teacher' || preview === 'student' ? preview : null;
}

const PREVIEW_COPY: Record<'en' | 'pt' | 'es', {
  title: string;
  exit: string;
  readOnly: string;
  stage: string;
  online: string;
  note: string;
  workspace: string;
  battle: string;
  camera: string;
  student: string;
  teacher: string;
  previewStudent: string;
  previewTeacher: string;
}> = {
  en: {
    title: 'Preview',
    exit: 'Close preview',
    readOnly: 'Read-only preview',
    stage: 'Current stage',
    online: 'Online now',
    note: 'This tab does not control the live class, does not join presence, and is safe for screen sharing.',
    workspace: 'Workspace',
    battle: 'Battle in progress',
    camera: 'Camera or screen sharing in progress',
    student: 'Student view',
    teacher: 'Teacher view',
    previewStudent: 'Open student preview',
    previewTeacher: 'Open teacher preview',
  },
  pt: {
    title: 'Preview',
    exit: 'Fechar preview',
    readOnly: 'Preview somente leitura',
    stage: 'Palco atual',
    online: 'Online agora',
    note: 'Esta aba nao controla a live, nao entra na presenca e fica segura para compartilhamento de tela.',
    workspace: 'Lousa',
    battle: 'Batalha em andamento',
    camera: 'Camera ou compartilhamento em andamento',
    student: 'Visao de aluno',
    teacher: 'Visao de professor',
    previewStudent: 'Abrir preview aluno',
    previewTeacher: 'Abrir preview professor',
  },
  es: {
    title: 'Preview',
    exit: 'Cerrar preview',
    readOnly: 'Preview de solo lectura',
    stage: 'Escenario actual',
    online: 'En linea ahora',
    note: 'Esta pestana no controla la clase, no entra en presencia y es segura para compartir pantalla.',
    workspace: 'Pizarra',
    battle: 'Batalla en curso',
    camera: 'Camara o pantalla compartida en curso',
    student: 'Vista de alumno',
    teacher: 'Vista de profesor',
    previewStudent: 'Abrir preview alumno',
    previewTeacher: 'Abrir preview profesor',
  },
};

const LiveClassPreviewView: React.FC<{
  liveClass: LiveClass;
  user: User;
  uiLanguage: 'en' | 'pt' | 'es';
  previewRole: LiveClassPreviewRole;
  assignedRoster: Array<{ uid: string; label: string; isOnline: boolean }>;
  session: LiveClassSession;
  onlineCount: number;
  onExit: () => void;
}> = ({
  liveClass,
  user,
  uiLanguage,
  previewRole,
  assignedRoster,
  session,
  onlineCount,
  onExit,
}) => {
  const copy = PREVIEW_COPY[uiLanguage] ?? PREVIEW_COPY.en;
  const stageLabel =
    session.mainStageMode === 'battle'
      ? copy.battle
      : session.mainStageMode === 'camera'
        ? copy.camera
        : copy.workspace;

  return (
    <LiveClassRoomShell
      title={`${liveClass.title} · ${copy.title} · ${previewRole === 'teacher' ? copy.teacher : copy.student}`}
      exitLabel={copy.exit}
      onExit={onExit}
      mainContent={
        <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
          <div className="absolute left-3 top-3 z-20 rounded-full bg-amber-500/95 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-950 shadow-lg">
            {copy.readOnly}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
            <WorkspaceCanvas
              classId={liveClass.id}
              userId={user.uid}
              userName={user.displayName || user.email || 'Preview'}
              userEmail={user.email}
              readOnly={true}
              isTeacher={previewRole === 'teacher'}
              studentEditingEnabled={false}
              classTeacherUserId={liveClass.teacherUid ?? null}
              assignedRoster={assignedRoster}
            />
          </div>
        </div>
      }
      desktopSidebar={
        <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-y-auto px-3 py-4 text-sm text-slate-200">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">
              {previewRole === 'teacher' ? copy.teacher : copy.student}
            </div>
            <div className="mt-2 text-xs text-slate-300">{copy.note}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              {copy.stage}
            </div>
            <div className="mt-2 text-sm font-semibold text-white">{stageLabel}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              {copy.online}
            </div>
            <div className="mt-2 text-2xl font-black text-white">{onlineCount}</div>
          </div>
        </div>
      }
      bottomBar={
        <div className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-center gap-3 border-t border-slate-800 bg-slate-950/90 px-4 py-3 text-xs font-semibold text-slate-200 backdrop-blur-sm">
          <span className="rounded-full border border-slate-700 px-3 py-1">{stageLabel}</span>
          <span className="rounded-full border border-slate-700 px-3 py-1">{copy.readOnly}</span>
        </div>
      }
    />
  );
};

function buildInitialSession(liveClass: LiveClass): LiveClassSession {
  return {
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
  };
}

export const LiveClassRoomPage: React.FC<LiveClassRoomPageProps> = ({
  liveClass,
  user,
  isTeacher,
  uiLanguage = (() => {
    try {
      const stored = getScopedStorageItem(BASE_UI_LANGUAGE_STORAGE_KEY);
      return stored === 'pt' || stored === 'es' ? stored : 'en';
    } catch {
      return 'en';
    }
  })(),
  onOpenBattleHub,
  onExit,
}) => {
  const previewRole = getPreviewRoleFromSearch();
  const isPreview = previewRole !== null;
  const [presence, setPresence] = useState<LiveClassPresence[]>([]);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showExerciseSession, setShowExerciseSession] = useState(false);
  const [pendingBattleTemplate, setPendingBattleTemplate] = useState<SavedBattleTemplate | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);
  const [session, setSession] = useState<LiveClassSession>(() => buildInitialSession(liveClass));

  const role = previewRole ?? (isTeacher ? 'teacher' : 'student');
  const isBattleStage = session.mainStageMode === 'battle';
  const battleUiLanguage = uiLanguage;

  useEffect(() => {
    if (isPreview) return undefined;
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
  }, [isPreview, liveClass.id, role, user.displayName, user.email, user.uid]);

  useEffect(() => {
    const unsubscribe = subscribeLivePresence(
      liveClass.id,
      (next) => setPresence(next),
      (error) => console.warn('[LiveClass] Presence error:', error),
    );

    return unsubscribe;
  }, [liveClass.id]);

  useEffect(() => {
    setSessionLoaded(false);
    setSessionLoadError(null);
    setSession(buildInitialSession(liveClass));
    setPendingBattleTemplate(null);
    setShowWhiteboard(false);
    setShowExerciseSession(false);
  }, [liveClass.id, liveClass.lessonId, liveClass.workbookId]);

  useEffect(() => {
    const unsubscribe = subscribeLiveSession(
      liveClass.id,
      (next) => {
        console.info('[LIVE_DEBUG] shared session loaded', {
          classId: liveClass.id,
          role,
          sessionStatus: next.sessionStatus ?? 'unknown',
          activeTrailIds: next.activeTrailIds ?? [],
          activeExerciseId: next.activeExerciseId ?? null,
        });
        setSession({
          ...next,
          activeWorkbookId: next.activeWorkbookId ?? liveClass.workbookId ?? null,
        });
        setSessionLoadError(null);
        setSessionLoaded(true);
      },
      (error) => {
        console.warn('[LiveClass] Session error:', error);
        setSessionLoadError('Nao foi possivel carregar o estado compartilhado da live. A sala abriu em modo seguro.');
        setSessionLoaded(true);
      },
    );

    return unsubscribe;
  }, [liveClass.id, liveClass.workbookId]);

  useEffect(() => {
    const hasActiveTrailSession =
      session.sessionStatus === 'active' &&
      ((session.activeTrailIds?.length ?? 0) > 0 || Boolean(session.activeExerciseId));

    setShowExerciseSession(hasActiveTrailSession);
  }, [session.activeExerciseId, session.activeTrailIds, session.sessionStatus]);

  const handleUpdateSession = useCallback(
    async (patch: Partial<LiveClassSession>) => {
      if (isPreview) return;
      await updateLiveSession(liveClass.id, patch, user.uid);
    },
    [isPreview, liveClass.id, user.uid],
  );

  useEffect(() => {
    console.info('[LIVE_DEBUG] loading room', {
      classId: liveClass?.id ?? null,
      userId: user?.uid ?? null,
      role,
      sessionLoaded,
      sessionLoadError,
      showExerciseSession,
    });
  }, [liveClass?.id, role, sessionLoadError, sessionLoaded, showExerciseSession, user?.uid]);

  const onlinePresence = useMemo(
    () => presence.filter((item) => isLivePresenceActive(item)),
    [presence],
  );

  const assignedRoster = useMemo(() => {
    return resolveAssignedStudentRoster(
      liveClass,
      onlinePresence.map((participant) => ({
        uid: participant.uid,
        name: participant.name,
      })),
    ).map((student) => ({
      uid: student.uid,
      label: student.label,
      isOnline: onlinePresence.some((item) => item.uid === student.uid),
    }));
  }, [liveClass, onlinePresence]);

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
    if (isPreview) return;
    setPendingBattleTemplate(null);
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
  }, [handleUpdateSession, isPreview, liveClass?.id, onlinePresence, user?.uid]);

  const handleOpenSavedBattleTemplate = useCallback((template: SavedBattleTemplate) => {
    if (isPreview) return;
    setPendingBattleTemplate(template);
    void deleteBattleSession(liveClass.id)
      .catch((error) => {
        console.warn('[LiveClass] failed to clear previous battle session before opening saved template:', error);
      })
      .finally(() => {
        void handleUpdateSession({ mainStageMode: 'battle' });
      });
  }, [handleUpdateSession, isPreview, liveClass.id]);

  const handleReturnToWorkspace = useCallback(() => {
    if (isPreview) return;
    void handleUpdateSession({ mainStageMode: 'workspace' });
  }, [handleUpdateSession, isPreview]);

  const handleOpenPreviewTab = useCallback((nextRole: LiveClassPreviewRole) => {
    if (typeof window === 'undefined') return;
    const previewUrl = new URL(window.location.href);
    previewUrl.searchParams.delete('tabViewMode');
    previewUrl.searchParams.set('preview', nextRole);
    window.open(previewUrl.toString(), '_blank', 'noopener,noreferrer');
  }, []);

  const handleOpenTrackTab = useCallback(() => {
    if (typeof window === 'undefined') return;
    const nextWorkbookId = session.activeWorkbookId ?? liveClass.workbookId ?? null;
    const nextLessonId = session.activeLessonId?.toString() ?? liveClass.lessonId?.toString() ?? null;
    const nextCourseId = liveClass.courseId ?? null;
    const nextSection = nextLessonId ? SectionType.LESSON : SectionType.WORKBOOK;
    const targetUrl = new URL(window.location.origin + '/');
    const opened = window.open('about:blank', '_blank');
    if (!opened) return;

    try {
      opened.sessionStorage.setItem(
        TAB_APP_CONTEXT_STORAGE_KEY,
        JSON.stringify({
          courseId: nextCourseId,
          workbookId: nextWorkbookId,
          lessonId: nextLessonId,
          section: nextSection,
        }),
      );
      opened.sessionStorage.setItem(BASE_UI_LANGUAGE_STORAGE_KEY, uiLanguage);
    } catch {
      // Best-effort context handoff only.
    }

    opened.location.replace(targetUrl.toString());
  }, [liveClass.courseId, liveClass.lessonId, liveClass.workbookId, session.activeLessonId, session.activeWorkbookId, uiLanguage]);

  if (!liveClass?.id || !user?.uid) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 px-6 text-center">
        <div className="max-w-lg rounded-3xl border border-slate-800 bg-slate-900/90 px-6 py-5 shadow-2xl">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
            Live Class
          </div>
          <p className="mt-3 text-sm text-slate-200">
            Nao foi possivel identificar esta sala ou o usuario atual. Volte e entre novamente.
          </p>
        </div>
      </div>
    );
  }

  if (!sessionLoaded) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950">
        <img src={learnendoLogo} alt="Learnendo" className="mb-4 h-auto w-48 animate-pulse" />
        <div className="text-sm uppercase tracking-widest text-blue-500">Carregando Sala...</div>
      </div>
    );
  }

  if (isPreview && previewRole) {
    return (
      <LiveRoomErrorBoundary>
        <LiveClassPreviewView
          liveClass={liveClass}
          user={user}
          uiLanguage={uiLanguage}
          previewRole={previewRole}
          assignedRoster={assignedRoster}
          session={session}
          onlineCount={onlinePresence.length}
          onExit={onExit}
        />
      </LiveRoomErrorBoundary>
    );
  }

  if (role === 'teacher') {
    return (
      <LiveRoomErrorBoundary>
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
            onOpenBattleTemplate={handleOpenSavedBattleTemplate}
            onOpenPreviewTab={handleOpenPreviewTab}
            onOpenTrackTab={handleOpenTrackTab}
            onExit={onExit}
            statusMessage={sessionLoadError}
          />
          {isBattleStage ? (
            <BattleHubPage
              uid={user.uid}
              name={user.displayName || user.email || 'Professor'}
              courseId={liveClass.courseId ?? null}
              workbookId={session.activeWorkbookId ?? liveClass.workbookId ?? null}
              lessonId={session.activeLessonId?.toString() ?? liveClass.lessonId?.toString() ?? null}
              activeLiveClass={liveClass}
              uiLanguage={battleUiLanguage}
              fire={0}
              ice={0}
              diamonds={0}
              stars={0}
              onlineParticipants={battleOnlineParticipants}
              onOpenLiveClasses={handleReturnToWorkspace}
              onDismiss={handleReturnToWorkspace}
              initialSetupTemplate={pendingBattleTemplate}
            />
          ) : null}
        </>
      </LiveRoomErrorBoundary>
    );
  }

  return (
    <LiveRoomErrorBoundary>
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
        statusMessage={sessionLoadError}
      />
    </LiveRoomErrorBoundary>
  );
};
