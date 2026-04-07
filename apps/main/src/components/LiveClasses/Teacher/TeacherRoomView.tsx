import React, { useState, useEffect } from 'react';
import CollaborativeBoard from './CollaborativeBoard';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useParticipants,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { isTrackReference } from '@livekit/components-core';
import { User } from 'firebase/auth';
import { LiveClass, LiveClassSession, LiveClassPresence } from '../../../types';
import { requestLiveAudioCredentials } from '../../../services/liveAudioService';

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
}> = ({ liveClass, session, handleUpdateSession }) => {
  
  const [viewMode, setViewMode] = useState<'camera' | 'board'>(session.mainStageMode || 'camera');
  const isBoardLocked = session.isBoardLocked ?? false;

  useEffect(() => {
    if (session.mainStageMode) setViewMode(session.mainStageMode);
  }, [session.mainStageMode]);

  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const localTrack = tracks.find((t) => t.participant?.isLocal);
  const participants = useParticipants();
  const remoteParticipants = participants.filter((p) => !p.isLocal);

  // Remote participant video tracks
  const allTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);

  const handleModeChange = (newMode: 'camera' | 'board') => {
    setViewMode(newMode);
    handleUpdateSession({ mainStageMode: newMode });
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex">
      {/* CENTRO — palco principal, mesma base do aluno */}
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
                isReadOnly={false}
                isLocked={isBoardLocked}
              />
            </div>
          )}
          {/* BARRA DE FERRAMENTAS — sobreposta na base do palco */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3 bg-black/90 px-4 py-2 rounded-full border border-slate-700 z-[100]">
          <button
            onClick={() => handleModeChange('camera')}
            className={`w-11 h-11 rounded-full border-none cursor-pointer text-xl flex items-center justify-center ${viewMode === 'camera' ? 'bg-blue-500' : 'bg-transparent'}`}
          >
            🎥
          </button>
          <button
            onClick={() => handleModeChange('board')}
            className={`w-11 h-11 rounded-full border-none cursor-pointer text-xl flex items-center justify-center ${viewMode === 'board' ? 'bg-blue-500' : 'bg-transparent'}`}
          >
            ✏️
          </button>
          {viewMode === 'board' && (
            <button
              onClick={() => handleUpdateSession({ isBoardLocked: !isBoardLocked, allowStudentWhiteboardEdit: isBoardLocked })}
              className={`w-11 h-11 rounded-full border-none cursor-pointer text-xl flex items-center justify-center ${isBoardLocked ? 'bg-red-500' : 'bg-emerald-500'}`}
            >
              {isBoardLocked ? '🔒' : '🔓'}
            </button>
          )}
          </div>
        </div>
      </div>

      {/* SIDEBAR DIREITA — alunos conectados */}
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
          classId: liveClass.id, userId: user.uid, userName: user.displayName || 'Professor', role: 'teacher',
        });
        setToken(creds.token);
        setWsUrl(creds.wsUrl);
      } catch (err) { console.error(err); }
    };
    getCreds();
  }, [liveClass.id, user.uid]);

  if (!token || !wsUrl) return <div style={{ background: '#000', height: '100vh' }} />;

  return (
    <LiveKitRoom serverUrl={wsUrl} token={token} connect={true} video={true} audio={true}>
      <TeacherStage liveClass={liveClass} session={session} handleUpdateSession={handleUpdateSession} />
    </LiveKitRoom>
  );
};