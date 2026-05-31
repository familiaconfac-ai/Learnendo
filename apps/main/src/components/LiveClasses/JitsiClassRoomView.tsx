import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { WorkspaceCanvas } from './Workspace/WorkspaceCanvas';
import { LiveClassRoomShell } from './Shared/LiveClassRoomShell';
import { EmbeddedJitsiMeet } from './Shared/EmbeddedJitsiMeet';
import { BattlePlayerView } from './Battle/BattlePlayerView';
import { subscribeBattleSession } from './Battle/battleService';
import type { BattleSession, SavedBattleTemplate } from './Battle/battleTypes';
import { LiveBattleSimple, USE_SIMPLE_LIVE_BATTLE } from '../BattleHub/LiveBattleSimple';
import { BottomNavigationBattleButton } from '../BottomNavigation/BottomNavigation';
import { getLiveClassMeetLink } from '../../services/liveClassesService';
import {
  BATTLE_STALE_THRESHOLD_MS,
  isActiveBattleStatus,
  sanitizeMainStageMode,
} from '../../services/liveClassStage';
import { BASE_UI_LANGUAGE_STORAGE_KEY, getScopedStorageItem } from '../../utils/tabScopedStorage';
import type { LiveClass, LiveClassSession } from '../../types';

interface JitsiClassRoomViewProps {
  liveClass: LiveClass;
  user: User;
  session: LiveClassSession;
  assignedRoster: Array<{ uid: string; label: string; isOnline: boolean }>;
  handleUpdateSession: (patch: Partial<LiveClassSession>) => Promise<void>;
  onOpenBattleHub: () => void;
  onOpenBattleTemplate?: (template: SavedBattleTemplate) => void;
  onOpenPreviewTab?: (role: 'teacher' | 'student') => void;
  onOpenTrackTab?: () => void;
  onExit: () => void;
  isTeacher: boolean;
}

function openExternalLink(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) return;
  const target = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  window.open(target, '_blank', 'noopener,noreferrer');
}

export const JitsiClassRoomView: React.FC<JitsiClassRoomViewProps> = ({
  liveClass,
  user,
  session,
  assignedRoster,
  handleUpdateSession,
  onOpenBattleHub,
  onOpenBattleTemplate,
  onOpenPreviewTab,
  onOpenTrackTab,
  onExit,
  isTeacher,
}) => {
  const stageMode = sanitizeMainStageMode(session.mainStageMode);
  const conferenceActive = stageMode === 'camera';
  const jitsiRoomName = useMemo(() => `learnendo-live-${liveClass.id}`, [liveClass.id]);
  const jitsiRoomLink = useMemo(
    () => `https://meet.jit.si/${encodeURIComponent(jitsiRoomName)}`,
    [jitsiRoomName],
  );
  const meetBackupLink = useMemo(() => getLiveClassMeetLink(liveClass), [liveClass]);
  const [studentEditingEnabled, setStudentEditingEnabled] = useState(
    session.studentEditingEnabled ?? true,
  );
  const [workspacePresentationActive, setWorkspacePresentationActive] = useState(false);
  const [jitsiError, setJitsiError] = useState<string | null>(null);
  const [battleSession, setBattleSession] = useState<BattleSession | null>(null);

  useEffect(() => {
    setStudentEditingEnabled(session.studentEditingEnabled ?? true);
  }, [session.studentEditingEnabled]);

  useEffect(() => {
    if (isTeacher || USE_SIMPLE_LIVE_BATTLE) {
      setBattleSession(null);
      return undefined;
    }

    return subscribeBattleSession(
      liveClass.id,
      (nextSession) => {
        if (!nextSession) {
          setBattleSession(null);
          return;
        }

        const sessionUpdatedAt =
          typeof nextSession.updatedAt === 'number'
            ? nextSession.updatedAt
            : typeof nextSession.createdAt === 'number'
              ? nextSession.createdAt
              : null;
        const sessionAgeMs = sessionUpdatedAt != null ? Date.now() - sessionUpdatedAt : null;
        const isStaleWaitingSession =
          nextSession.status === 'WAITING' &&
          sessionAgeMs != null &&
          sessionAgeMs > BATTLE_STALE_THRESHOLD_MS;

        if (nextSession.status === 'FINISHED') {
          setBattleSession(nextSession);
          return;
        }

        if (isStaleWaitingSession) {
          setBattleSession(null);
          return;
        }

        if (
          nextSession.status === 'WAITING' ||
          isActiveBattleStatus(nextSession.status)
        ) {
          setBattleSession(nextSession);
          return;
        }

        setBattleSession(null);
      },
      (error) => {
        console.error('[JitsiClassRoomView] battle subscription failed', error);
      },
    );
  }, [isTeacher, liveClass.id]);

  const uiLang: 'en' | 'pt' | 'es' = (() => {
    try {
      return (getScopedStorageItem(BASE_UI_LANGUAGE_STORAGE_KEY) as 'en' | 'pt' | 'es') ?? 'pt';
    } catch {
      return 'pt';
    }
  })();

  const labels = {
    exit: uiLang === 'en' ? 'Log out' : uiLang === 'es' ? 'Salir' : 'Sair',
    workspace: uiLang === 'en' ? 'Workspace' : uiLang === 'es' ? 'Pizarra' : 'Lousa',
    conference: uiLang === 'en' ? 'Live audio' : uiLang === 'es' ? 'Audio en vivo' : 'Audio ao vivo',
    meet: uiLang === 'en' ? 'Open Meet' : uiLang === 'es' ? 'Abrir Meet' : 'Abrir Meet',
    jitsiTab:
      uiLang === 'en'
        ? 'Open Jitsi in browser'
        : uiLang === 'es'
          ? 'Abrir Jitsi en el navegador'
          : 'Abrir Jitsi no navegador',
    previewStudent:
      uiLang === 'en' ? 'Open student preview' : uiLang === 'es' ? 'Abrir preview alumno' : 'Abrir preview aluno',
    trackTab:
      uiLang === 'en' ? 'Open track/workbook tab' : uiLang === 'es' ? 'Abrir pestana de pista/cuaderno' : 'Abrir aba da trilha/caderno',
    students: uiLang === 'en' ? 'Students' : uiLang === 'es' ? 'Alumnos' : 'Alunos',
    activeMode:
      uiLang === 'en' ? 'Current stage' : uiLang === 'es' ? 'Escenario actual' : 'Palco atual',
    useJitsi:
      uiLang === 'en'
        ? 'Use the Jitsi toolbar for microphone, screen sharing, and camera.'
        : uiLang === 'es'
          ? 'Usa la barra del Jitsi para microfono, pantalla y camara.'
          : 'Use a barra do Jitsi para microfone, compartilhamento de tela e camera.',
    useBattle:
      uiLang === 'en'
        ? 'When the teacher starts a battle, the student overlay will open automatically.'
        : uiLang === 'es'
          ? 'Cuando el profesor inicie una batalla, la capa del alumno se abrira automaticamente.'
          : 'Quando o professor iniciar uma batalha, a camada do aluno abre automaticamente.',
    backupMeet:
      uiLang === 'en'
        ? 'Meet stays available as a backup room.'
        : uiLang === 'es'
          ? 'Meet sigue disponible como sala de respaldo.'
          : 'O Meet continua disponivel como sala de backup.',
    directJitsi:
      uiLang === 'en'
        ? 'If the embedded room fails, open the same Jitsi room in a new tab.'
        : uiLang === 'es'
          ? 'Si la sala embebida falla, abre la misma sala Jitsi en una nueva pestana.'
          : 'Se a sala embutida falhar, abra a mesma sala do Jitsi em uma nova aba.',
  };

  const modeLabel =
    stageMode === 'camera'
      ? labels.conference
      : stageMode === 'battle'
        ? 'Battle'
        : labels.workspace;

  const teacherUid = liveClass.teacherUid ?? user.uid;
  const teacherName = liveClass.teacherName || user.displayName || user.email || 'Professor';

  const workspaceToolbar = isTeacher ? (
    <>
      <button
        type="button"
        onClick={() => {
          void handleUpdateSession({ mainStageMode: 'workspace' });
        }}
        className={`flex h-7 w-7 items-center justify-center rounded border text-sm transition ${
          !conferenceActive
            ? 'border-blue-600 bg-blue-600 text-white'
            : 'border-slate-200 text-slate-600 hover:bg-slate-100'
        }`}
        title={labels.workspace}
        aria-label={labels.workspace}
      >
        &#x270F;&#xFE0F;
      </button>
      <button
        type="button"
        onClick={() => {
          void handleUpdateSession({ mainStageMode: 'camera' });
        }}
        className={`flex h-7 w-7 items-center justify-center rounded border text-sm transition ${
          conferenceActive
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : 'border-slate-200 text-slate-600 hover:bg-slate-100'
        }`}
        title={labels.conference}
        aria-label={labels.conference}
      >
        &#x1F50A;
      </button>
      {onOpenPreviewTab ? (
        <button
          type="button"
          onClick={() => onOpenPreviewTab('student')}
          className="flex h-7 min-w-7 items-center justify-center rounded border border-slate-200 px-1.5 text-[10px] font-black text-slate-700 transition hover:bg-slate-100"
          title={labels.previewStudent}
          aria-label={labels.previewStudent}
        >
          S
        </button>
      ) : null}
      {onOpenTrackTab ? (
        <button
          type="button"
          onClick={onOpenTrackTab}
          className="flex h-7 min-w-7 items-center justify-center rounded border border-slate-200 px-1.5 text-[10px] font-black text-slate-700 transition hover:bg-slate-100"
          title={labels.trackTab}
          aria-label={labels.trackTab}
        >
          T
        </button>
      ) : null}
      {meetBackupLink ? (
        <button
          type="button"
          onClick={() => openExternalLink(meetBackupLink)}
          className="flex h-7 min-w-7 items-center justify-center rounded border border-slate-200 px-1.5 text-[10px] font-black text-slate-700 transition hover:bg-slate-100"
          title={labels.meet}
          aria-label={labels.meet}
        >
          M
        </button>
      ) : null}
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
    </>
  ) : (
    <>
      {meetBackupLink ? (
        <button
          type="button"
          onClick={() => openExternalLink(meetBackupLink)}
          className="flex h-7 min-w-7 items-center justify-center rounded border border-slate-200 px-1.5 text-[10px] font-black text-slate-700 transition hover:bg-slate-100"
          title={labels.meet}
          aria-label={labels.meet}
        >
          M
        </button>
      ) : null}
    </>
  );

  return (
    <LiveClassRoomShell
      title={liveClass.title}
      exitLabel={labels.exit}
      onExit={onExit}
      immersiveMode={workspacePresentationActive}
      mainContent={
        <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
          <div className="relative flex-1 min-h-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
            <EmbeddedJitsiMeet
              roomName={jitsiRoomName}
              displayName={user.displayName || user.email || (isTeacher ? 'Professor' : 'Aluno')}
              email={user.email}
              visible={conferenceActive}
              onError={setJitsiError}
            />

            <div
              className={`absolute inset-0 z-20 overflow-hidden transition-opacity ${
                conferenceActive ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
              }`}
            >
              <WorkspaceCanvas
                classId={liveClass.id}
                userId={user.uid}
                userName={user.displayName || user.email || (isTeacher ? 'Professor' : 'Aluno')}
                userEmail={user.email}
                readOnly={false}
                toolbarLeading={workspaceToolbar}
                isTeacher={isTeacher}
                studentEditingEnabled={studentEditingEnabled}
                classTeacherUserId={teacherUid}
                assignedRoster={assignedRoster}
                onOpenBattleTemplate={onOpenBattleTemplate}
                onPresentationModeChange={setWorkspacePresentationActive}
              />
            </div>

            {jitsiError ? (
              <div className="pointer-events-none absolute inset-x-3 top-3 z-40 flex justify-center">
                <div className="rounded-2xl border border-rose-500/40 bg-rose-950/90 px-4 py-3 text-center shadow-2xl">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">
                    Jitsi
                  </div>
                  <p className="mt-1 text-sm text-rose-100">{jitsiError}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      }
      desktopSidebar={
        <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-y-auto px-3 py-4 text-sm text-slate-200">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">
              {labels.activeMode}
            </div>
            <div className="mt-2 text-sm font-semibold text-white">{modeLabel}</div>
            <p className="mt-2 text-xs text-slate-400">{labels.useJitsi}</p>
            {!isTeacher ? <p className="mt-2 text-xs text-slate-500">{labels.useBattle}</p> : null}
          </div>

          <button
            type="button"
            onClick={() => openExternalLink(jitsiRoomLink)}
            className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-3 text-left transition hover:bg-cyan-500/20"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">
              Jitsi
            </div>
            <div className="mt-2 text-sm font-semibold text-white">{labels.jitsiTab}</div>
            <p className="mt-1 text-xs text-slate-300">{labels.directJitsi}</p>
          </button>

          {meetBackupLink ? (
            <button
              type="button"
              onClick={() => openExternalLink(meetBackupLink)}
              className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-left transition hover:bg-emerald-500/20"
            >
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">
                Meet
              </div>
              <div className="mt-2 text-sm font-semibold text-white">{labels.meet}</div>
              <p className="mt-1 text-xs text-slate-300">{labels.backupMeet}</p>
            </button>
          ) : null}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              {labels.students}
            </div>
            <div className="mt-3 space-y-2">
              {assignedRoster.length > 0 ? assignedRoster.map((student) => (
                <div
                  key={student.uid}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                    student.isOnline
                      ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                      : 'border-slate-700 bg-slate-800 text-slate-300'
                  }`}
                >
                  {student.label}
                </div>
              )) : (
                <p className="text-xs text-slate-400">Nenhum aluno atribuido.</p>
              )}
            </div>
          </div>
        </div>
      }
      overlay={
        !isTeacher && stageMode === 'battle'
          ? (
              USE_SIMPLE_LIVE_BATTLE ? (
                <div className="fixed inset-0 z-[8900] overflow-auto bg-slate-950/95 px-4 py-8">
                  <div className="mx-auto w-full max-w-4xl">
                    <LiveBattleSimple
                      liveClassId={liveClass.id}
                      userId={user.uid}
                      userName={user.displayName || user.email || 'Aluno'}
                      role="student"
                    />
                  </div>
                </div>
              ) : battleSession ? (
                <BattlePlayerView
                  session={battleSession}
                  classId={liveClass.id}
                  uid={user.uid}
                  name={user.displayName || user.email || 'Aluno'}
                  uiLanguage={uiLang}
                />
              ) : (
                <div className="fixed inset-0 z-[8900] flex items-center justify-center bg-slate-950/95 px-6 text-center">
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/95 px-6 py-5 shadow-2xl">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">
                      Battle
                    </div>
                    <p className="mt-3 text-sm text-slate-200">
                      Aguardando a battle sincronizar para este aluno.
                    </p>
                  </div>
                </div>
              )
            )
          : undefined
      }
      bottomBar={
        <div className="fixed bottom-0 left-0 z-50 flex w-full justify-center gap-3 border-t border-slate-800 bg-slate-950/90 py-2 backdrop-blur-sm sm:py-3">
          {isTeacher ? (
            <>
              <button
                type="button"
                onClick={() => {
                  void handleUpdateSession({ mainStageMode: 'workspace' });
                }}
                className={`flex h-12 min-w-12 items-center justify-center rounded-full px-3 text-sm font-black shadow transition ${
                  !conferenceActive
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                title={labels.workspace}
              >
                W
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleUpdateSession({ mainStageMode: 'camera' });
                }}
                className={`flex h-12 min-w-12 items-center justify-center rounded-full px-3 text-sm font-black shadow transition ${
                  conferenceActive
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                title={labels.conference}
              >
                A
              </button>

              <BottomNavigationBattleButton
                isActive={stageMode === 'battle'}
                onClick={onOpenBattleHub}
                uiLanguage={uiLang}
              />

              {meetBackupLink ? (
                <button
                  type="button"
                  onClick={() => openExternalLink(meetBackupLink)}
                  className="flex h-12 min-w-12 items-center justify-center rounded-full bg-green-700 px-3 text-sm font-black text-white shadow transition hover:bg-green-600"
                  title={labels.meet}
                >
                  M
                </button>
              ) : null}
            </>
          ) : (
            <>
              <div className="flex h-12 items-center justify-center rounded-full bg-slate-700 px-4 text-xs font-black uppercase tracking-[0.18em] text-slate-200 shadow">
                {modeLabel}
              </div>
              {meetBackupLink ? (
                <button
                  type="button"
                  onClick={() => openExternalLink(meetBackupLink)}
                  className="flex h-12 min-w-12 items-center justify-center rounded-full bg-green-700 px-3 text-sm font-black text-white shadow transition hover:bg-green-600"
                  title={labels.meet}
                >
                  M
                </button>
              ) : null}
            </>
          )}
        </div>
      }
    />
  );
};
