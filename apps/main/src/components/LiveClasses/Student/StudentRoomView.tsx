import React, { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useLocalParticipant,
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
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const { localParticipant } = useLocalParticipant();

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
        {/* Microfone */}
        <button
          onClick={() => {
            const next = !micOn;
            setMicOn(next);
            localParticipant.setMicrophoneEnabled(next);
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg shadow transition ${
            micOn
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }`}
          title={micOn ? 'Desligar microfone' : 'Ligar microfone'}
        >
          {micOn ? (
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
          onClick={() => {
            const next = !camOn;
            setCamOn(next);
            localParticipant.setCameraEnabled(next);
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg shadow transition ${
            camOn
              ? 'bg-sky-500 hover:bg-sky-400 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }`}
          title={camOn ? 'Desligar câmera' : 'Ligar câmera'}
        >
          {camOn ? (
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
          onClick={() => setChatOpen(!chatOpen)}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg shadow transition ${
            chatOpen
              ? 'bg-violet-500 hover:bg-violet-400 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }`}
          title={chatOpen ? 'Fechar chat' : 'Abrir chat'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
          </svg>
        </button>
      </div>

      {/* Chat */}
      <div className={chatOpen ? 'fixed inset-x-0 bottom-16 top-0 z-40 bg-slate-950/95 flex flex-col' : 'hidden'}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
          <span className="text-white font-bold text-sm">Chat</span>
          <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white text-lg">&times;</button>
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