import React, { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { isTrackReference } from '@livekit/components-core';
import { CollaborativeBoard } from '../Board/CollaborativeBoard';
import { User } from 'firebase/auth';
import { LiveClass, LiveClassSession, LiveClassPresence } from '../../../types';
import { requestLiveAudioCredentials } from '../../../services/liveAudioService';
import { LiveClassChat } from '../LiveClassChat';

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
}

/** Inner component — runs inside <LiveKitRoom> so LiveKit hooks have context. */
const StudentStage: React.FC<{
  liveClass: LiveClass;
  user: User;
  session: LiveClassSession;
}> = ({ liveClass, user, session }) => {
  const mainStageMode = session.mainStageMode || 'board';

  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);

  // Find teacher's video track by metadata role
  const teacherTrack = tracks.find((t) => {
    if (!t.participant || t.participant.isLocal) return false;
    try {
      const meta = JSON.parse(t.participant.metadata || '{}');
      return meta.role === 'teacher';
    } catch { return false; }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 px-2 pb-24 pt-4 flex flex-col items-center w-full">
      {/* Título da sala */}
      <div className="w-full max-w-3xl mb-3 flex items-center justify-between px-2">
        <h1 className="text-lg md:text-xl font-black text-white truncate drop-shadow">{liveClass.title}</h1>
        <button
          type="button"
          className="text-xs md:text-sm font-bold text-rose-400 hover:bg-rose-900/20 rounded-lg px-3 py-1 transition"
          onClick={() => window.history.back()}
        >
          Sair
        </button>
      </div>

      {/* PALCO PRINCIPAL */}
      <div className="relative w-full max-w-3xl flex flex-col items-center">
        {mainStageMode === 'board' ? (
          <div className="w-full aspect-[16/9] rounded-2xl shadow-xl border border-slate-800 bg-slate-900/80 flex items-center justify-center mb-3 overflow-hidden transition-all p-2 md:p-4">
            <CollaborativeBoard
              boardId={`class-${liveClass.id}`}
              userId={user.uid}
              userName={user.displayName || user.email || 'Aluno'}
              readOnly={!session.allowStudentWhiteboardEdit}
              hideChrome
            />
          </div>
        ) : (
          <div className="w-full aspect-[16/9] bg-black rounded-2xl shadow-xl border border-slate-800 flex items-center justify-center mb-3 overflow-hidden transition-all">
            {teacherTrack && isTrackReference(teacherTrack) ? (
              <VideoTrack trackRef={teacherTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-2">
                  <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6h16M4 6v12a2 2 0 002 2h8a2 2 0 002-2V6M4 6l4 4m0 0l4-4m-4 4v12" /></svg>
                </div>
                <span className="text-slate-400 text-base font-medium">Aguardando câmera do professor…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barra de controles mínimos */}
      <div className="fixed bottom-0 left-0 w-full flex justify-center gap-3 bg-slate-950/90 py-3 border-t border-slate-800 z-50 backdrop-blur-sm">
        <button className="rounded-full bg-emerald-500/90 hover:bg-emerald-400 text-slate-900 font-bold px-5 py-2 text-sm shadow transition flex items-center justify-center" title="Microfone">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 1v22m0 0l-7-7m7 7l7-7" /></svg>
        </button>
        <button className="rounded-full bg-sky-500/90 hover:bg-sky-400 text-white font-bold px-5 py-2 text-sm shadow transition flex items-center justify-center" title="Câmera">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" /></svg>
        </button>
        <button className="rounded-full bg-violet-500/90 hover:bg-violet-400 text-white font-bold px-5 py-2 text-sm shadow transition flex items-center justify-center" title="Chat privado">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v8z" /></svg>
        </button>
      </div>

      {/* Chat privado */}
      <div className="hidden">
        <LiveClassChat
          classId={liveClass.id}
          user={user}
          role="student"
          allowAudioNotes={session.audioNotesEnabled !== false}
        />
      </div>
    </div>
  );
};

/** Outer component — fetches LiveKit token, then mounts LiveKitRoom + stage. */
export const StudentRoomView: React.FC<StudentRoomViewProps> = (props) => {
  const { liveClass, user, session } = props;
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
    <LiveKitRoom serverUrl={wsUrl} token={token} connect={true} video={false} audio={false}>
      <StudentStage liveClass={liveClass} user={user} session={session} />
    </LiveKitRoom>
  );
};