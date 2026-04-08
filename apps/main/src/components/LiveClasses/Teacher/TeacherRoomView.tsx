import React, { useState, useEffect } from 'react';
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

  const [viewMode, setViewMode] = useState<'camera' | 'board'>(session.mainStageMode || 'camera');
  const room = useRoomContext();

  /** * LOGICA DA LOUSA CORRIGIDA:
   * A trava agora é reativa. Se 'allowStudentWhiteboardEdit' for false, 
   * consideramos a lousa como bloqueada.
   */
  const isBoardLocked = session.allowStudentWhiteboardEdit === false;

  // ── Battle state ───────────────────────────────────────────────────────────
  const [battleSession, setBattleSession] = useState<BattleSession | null>(null);
  const [showBattleSetup, setShowBattleSetup] = useState(false);

  useEffect(() => {
    const unsub = subscribeBattleSession(liveClass.id, setBattleSession);
    return unsub;
  }, [liveClass.id]);

  async function handleLaunchBattle(config: BattleConfig, questions: BattleQuestion[]) {
    setShowBattleSetup(false);
    const now = Date.now();
    const optimisticSession: BattleSession = {
      id: liveClass.id,
      status: 'lobby',
      config,
      questions,
      currentQuestionIndex: 0,
      questionStartedAt: 0,
      scores: {
        [teacherUid]: { uid: teacherUid, name: teacherName, score: 0, streak: 0, lastAnswerCorrect: null },
      },
      currentAnswers: {},
      createdAt: now,
      updatedAt: now,
    };
    setBattleSession(optimisticSession);

    createBattleSession(liveClass.id, config, teacherUid, teacherName, questions).catch((err) => {
      console.error('[Battle] Firestore sync failed:', err);
    });
  }

  async function handleCloseBattle() {
    await deleteBattleSession(liveClass.id);
    setBattleSession(null);
  }

  useEffect(() => {
    if (session.mainStageMode) setViewMode(session.mainStageMode);
  }, [session.mainStageMode]);

  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const localTrack = tracks.find((t) => t.participant?.isLocal);
  const participants = useParticipants();
  const remoteParticipants = participants.filter((p) => !p.isLocal);
  const allTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);

  const handleModeChange = (newMode: 'camera' | 'board') => {
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
    <div className="relative w-screen h-screen bg-black overflow-hidden flex">
      <div className="flex-1 flex flex-col items-center justify-center min-w-0">
        <div className="relative w-full max-w-3xl aspect-[16/9] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/80 shadow-xl">
          
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
            <div className="w-full h-full bg-white">
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
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3 bg-black/90 px-4 py-2 rounded-full border border-slate-700 z-[100]">
            <button
              onClick={() => handleModeChange('camera')}
              className={`w-11 h-11 rounded-full border-none cursor-pointer text-xl flex items-center justify-center transition-all ${viewMode === 'camera' ? 'bg-blue-600 scale-110' : 'bg-transparent hover:bg-slate-800'}`}
            >
              🎥
            </button>
            <button
              onClick={() => handleModeChange('board')}
              className={`w-11 h-11 rounded-full border-none cursor-pointer text-xl flex items-center justify-center transition-all ${viewMode === 'board' ? 'bg-blue-600 scale-110' : 'bg-transparent hover:bg-slate-800'}`}
            >
              ✏️
            </button>
            
            {viewMode === 'board' && (
              <button
                onClick={toggleBoardLock}
                title={isBoardLocked ? "Liberar edição para alunos" : "Bloquear edição dos alunos"}
                className={`w-11 h-11 rounded-full border-none cursor-pointer text-xl flex items-center justify-center transition-colors ${isBoardLocked ? 'bg-red-600' : 'bg-emerald-600'}`}
              >
                {isBoardLocked ? '🔒' : '🔓'}
              </button>
            )}

            <button
              onClick={() => setShowBattleSetup(true)}
              title="Learnendo Battle"
              className="w-11 h-11 rounded-full border-none cursor-pointer text-xl flex items-center justify-center bg-orange-600 hover:bg-orange-500 transition-colors"
            >
              ⚔️
            </button>
          </div>
        </div>
      </div>

      {/* SIDEBAR ALUNOS */}
      <div className="w-28 md:w-36 flex flex-col gap-2 items-center pt-3 pb-3 bg-slate-950/80 border-l border-slate-800 overflow-y-auto">
        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Alunos</span>
        {remoteParticipants.length === 0 && (
          <span className="text-[10px] text-slate-600">Nenhum</span>
        )}
        {remoteParticipants.map((p) => {
          const pTrack = allTracks.find((t) => t.participant?.sid === p.sid && !t.participant?.isLocal);
          return (
            <div key={p.sid} className="w-24 h-16 rounded-xl bg-black border border-slate-700 overflow-hidden flex items-center justify-center relative">
              {pTrack && isTrackReference(pTrack) ? (
                <VideoTrack trackRef={pTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span className="text-[10px] text-slate-500">Sem cam</span>
              )}
              <span className="absolute bottom-0.5 left-1 text-[9px] text-slate-300 bg-slate-800/80 px-1 rounded font-semibold truncate max-w-[90%]">
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
      {battleSession && battleSession.status !== 'idle' && (
        <BattleHostView
          session={battleSession}
          classId={liveClass.id}
          teacherUid={teacherUid}
          onClose={handleCloseBattle}
          onNewBattle={() => { void handleCloseBattle().then(() => setShowBattleSetup(true)); }}
        />
      )}
    </div>
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
