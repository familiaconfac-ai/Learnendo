import React, { useState, useEffect, useRef } from 'react';
import CollaborativeBoard from './CollaborativeBoard';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useParticipants,
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
import { buildInitialBattleScores, buildSavedBattleTemplate, sanitizeBattleQuestions } from '../Battle/battleUtils';
import { appendLiveClassBattleTemplate } from '../../../services/liveClassesService';
import { getDefaultMainStageMode, isActiveBattleStatus, sanitizeMainStageMode, type MainStageMode } from '../../../services/liveClassStage';

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
  handleUpdateSession: (patch: Partial<LiveClassSession>) => Promise<void>;
  teacherUid: string;
  teacherName: string;
}> = ({ liveClass, session, handleUpdateSession, teacherUid, teacherName }) => {

  const [viewMode, setViewMode] = useState<MainStageMode>(getDefaultMainStageMode());
  const room = useRoomContext();
  const hasAppliedInitialStageRef = useRef(false);
  const battleWasActivatedRef = useRef(false);

  /** * LOGICA DA LOUSA CORRIGIDA:
   * A trava agora é reativa. Se 'allowStudentWhiteboardEdit' for false, 
   * consideramos a lousa como bloqueada.
   */
  const isBoardLocked = session.allowStudentWhiteboardEdit === false;

  // ── Battle state ───────────────────────────────────────────────────────────
  const [battleSession, setBattleSession] = useState<BattleSession | null>(null);
  const [showBattleSetup, setShowBattleSetup] = useState(false);

  useEffect(() => {
    const unsub = subscribeBattleSession(liveClass.id, (nextSession) => {
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

  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const localTrack = tracks.find((t) => t.participant?.isLocal);
  const participants = useParticipants();
  const remoteParticipants = participants.filter((p) => !p.isLocal);
  const allTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);

  const handleModeChange = (newMode: MainStageMode) => {
    setViewMode(newMode);
    handleUpdateSession({ mainStageMode: newMode });
  };

  /**
   * FUNÇÃO DE TRAVA CORRIGIDA:
   * Atualiza as duas variáveis simultaneamente para evitar conflitos de estado.
   */
  const toggleBoardLock = () => {
    const nextLockedState = !isBoardLocked;
    handleUpdateSession({ 
      isBoardLocked: nextLockedState,
      allowStudentWhiteboardEdit: !nextLockedState 
    });
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
    <div className="teacher-stage-root relative w-screen h-screen bg-black overflow-hidden flex flex-col sm:flex-row">
      <div className="flex-1 flex flex-col items-center justify-center min-w-0 min-h-0">
        <div className="relative w-full flex-1 sm:flex-none sm:max-w-3xl sm:aspect-[16/9] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/80 shadow-xl">
          
          {/* CAMERA */}
          {viewMode === 'camera' && (
            <div className="w-full h-full flex items-center justify-center bg-black">
              {localTrack && isTrackReference(localTrack) ? (
                <VideoTrack trackRef={localTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                  <span className="text-base font-medium">Câmera Desligada</span>
                </div>
              )}
            </div>
          )}

          {/* LOUSA */}
          {viewMode === 'board' && (
            <div className="w-full h-full bg-white pb-12 sm:pb-0">
              <CollaborativeBoard
                roomId={liveClass.id}
                userId={teacherUid}
                userName={teacherName}
                isReadOnly={false} // Professor sempre tem acesso total
                isLocked={isBoardLocked}
              />
            </div>
          )}

          {/* BARRA DE FERRAMENTAS */}
          <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-3 bg-black/90 px-2.5 sm:px-4 py-1 sm:py-2 rounded-full border border-slate-700 z-[100]">
            <button
              onClick={() => handleModeChange('camera')}
              className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full border-none cursor-pointer text-sm sm:text-xl flex items-center justify-center transition-all ${viewMode === 'camera' ? 'bg-blue-600 scale-110' : 'bg-transparent hover:bg-slate-800'}`}
            >
              🎥
            </button>
            <button
              onClick={() => handleModeChange('board')}
              className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full border-none cursor-pointer text-sm sm:text-xl flex items-center justify-center transition-all ${viewMode === 'board' ? 'bg-blue-600 scale-110' : 'bg-transparent hover:bg-slate-800'}`}
            >
              ✏️
            </button>

            {viewMode === 'board' && (
              <button
                onClick={toggleBoardLock}
                title={isBoardLocked ? "Liberar edição para alunos" : "Bloquear edição dos alunos"}
                className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full border-none cursor-pointer text-sm sm:text-xl flex items-center justify-center transition-colors ${isBoardLocked ? 'bg-red-600' : 'bg-emerald-600'}`}
              >
                {isBoardLocked ? '🔒' : '🔓'}
              </button>
            )}

            <button
              onClick={() => setShowBattleSetup(true)}
              title="Learnendo Battle"
              className="w-8 h-8 sm:w-11 sm:h-11 rounded-full border-none cursor-pointer text-sm sm:text-xl flex items-center justify-center bg-orange-600 hover:bg-orange-500 transition-colors"
            >
              ⚔️
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
          onClose={handleCloseBattle}
          onNewBattle={() => { void handleCloseBattle().then(() => setShowBattleSetup(true)); }}
        />
      )}
    </div>
    </>
  );
};

export const TeacherRoomView: React.FC<TeacherRoomViewProps> = (props) => {
  const { liveClass, user, session, handleUpdateSession } = props;
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
        handleUpdateSession={handleUpdateSession}
        teacherUid={user.uid}
        teacherName={user.displayName || 'Professor'}
      />
    </LiveKitRoom>
  );
};
