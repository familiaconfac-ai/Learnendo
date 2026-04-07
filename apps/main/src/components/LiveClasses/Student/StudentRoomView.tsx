import React, { useRef, useState, useEffect } from 'react';
import { Room } from 'livekit-client';
import { useLiveKitVideo } from './useLiveKitVideo';
import { CollaborativeBoard } from '../Board/CollaborativeBoard';
import { User } from 'firebase/auth';
import { LiveClass, LiveClassSession, LiveClassPresence } from '../../../types';

// Importações para componentes de vídeo e controles mínimos
import { VirtualWhiteboard } from '../VirtualWhiteboard';
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

export const StudentRoomView: React.FC<StudentRoomViewProps> = ({
  liveClass,
  user,
  session,
  presence,
  assignedRoster,
  showWhiteboard,
  setShowWhiteboard,
  showExerciseSession,
  setShowExerciseSession,
  handleUpdateSession,
}) => {
  // Referência para a sala LiveKit (compartilhada com LiveMicPanel)
  const roomRef = useRef<Room | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [teacherParticipant, setTeacherParticipant] = useState<any>(null);
  const mainStageMode = session.mainStageMode || 'board';

  // Atualiza participantes ao conectar
  useEffect(() => {
    const room = roomRef.current;
    if (!room) return;
    const all = [room.localParticipant, ...Array.from(room.remoteParticipants.values())];
    setParticipants(all);
    // Identifica professor
    let teacher = null;
    for (const p of all) {
      let role = 'student';
      try {
        const meta = JSON.parse(p.metadata || '{}');
        if (meta.role === 'teacher') role = 'teacher';
      } catch {}
      if (role === 'teacher') {
        teacher = p;
        break;
      }
    }
    setTeacherParticipant(teacher);
  }, [roomRef.current?.state, roomRef.current?.localParticipant, roomRef.current?.remoteParticipants]);

  // Helper para renderizar vídeo
  function VideoTile({ participant, large }: { participant: any, large?: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
      if (!participant) return;
      const pub = Array.from(participant.trackPublications.values()).find(
        (pub: any) => pub.source === 'camera' && pub.track && !pub.isMuted
      );
      if (pub && videoRef.current) {
        const track = pub.track;
        const stream = (track as any).mediaStreamTrack
          ? new MediaStream([(track as any).mediaStreamTrack])
          : null;
        if (stream) videoRef.current.srcObject = stream;
      }
    }, [participant]);
    const cameraEnabled = Array.from(participant.trackPublications.values()).some(
      (pub: any) => pub.source === 'camera' && pub.track && !pub.isMuted
    );
    const micEnabled = Array.from(participant.trackPublications.values()).some(
      (pub: any) => pub.source === 'microphone' && pub.track && !pub.isMuted
    );
    return (
      <div className={`relative ${large ? 'w-full h-full' : 'w-24 h-16'} rounded-xl bg-black border-2 border-slate-700 flex items-center justify-center overflow-hidden`}>
        {cameraEnabled ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={participant.isLocal}
            className={`object-cover ${large ? 'w-full h-full' : 'w-full h-full'}`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center mb-1">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6h16M4 6v12a2 2 0 002 2h8a2 2 0 002-2V6M4 6l4 4m0 0l4-4m-4 4v12" /></svg>
            </div>
            <span className="text-slate-400 text-xs font-medium">Câmera desligada</span>
          </div>
        )}
        {/* Status icons */}
        <div className="absolute top-1 left-1 flex gap-1 z-10">
          {!micEnabled && (
            <span title="Microfone mutado" className="inline-block bg-rose-700 rounded-full p-1">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-12.728 12.728M15 10v2a3 3 0 01-6 0v-2m6 0V7a3 3 0 00-6 0v3m6 0h.01" /></svg>
            </span>
          )}
          {!cameraEnabled && (
            <span title="Câmera desligada" className="inline-block bg-slate-700 rounded-full p-1">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6h16M4 6v12a2 2 0 002 2h8a2 2 0 002-2V6M4 6l4 4m0 0l4-4m-4 4v12" /></svg>
            </span>
          )}
        </div>
        {/* Nome */}
        <span className="absolute bottom-1 left-2 text-[10px] md:text-xs text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded font-semibold shadow">
          {participant.name || participant.identity}
          {participant.isLocal ? ' (Você)' : ''}
        </span>
      </div>
    );
  }

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

      {/* PALCO PRINCIPAL ÚNICO */}
      <div className="relative w-full max-w-3xl flex flex-col items-center">
        {mainStageMode === 'board' ? (
          <div className="w-full aspect-[16/9] rounded-2xl shadow-xl border border-slate-800 bg-slate-900/80 flex items-center justify-center mb-3 overflow-hidden transition-all p-2 md:p-4">
            <CollaborativeBoard
              boardId={`class-${liveClass.id}`}
              userId={user.uid}
              userName={user.displayName || user.email || 'Aluno'}
              readOnly={session.isBoardLocked !== false}
            />
            {/* Miniaturas das câmeras no topo */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {participants.map((p) => (
                <VideoTile key={p.identity} participant={p} />
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full aspect-[16/9] bg-black rounded-2xl shadow-xl border border-slate-800 flex items-center justify-center mb-3 overflow-hidden transition-all">
            {teacherParticipant ? (
              <VideoTile participant={teacherParticipant} large />
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-2">
                  <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6h16M4 6v12a2 2 0 002 2h8a2 2 0 002-2V6M4 6l4 4m0 0l4-4m-4 4v12" /></svg>
                </div>
                <span className="text-slate-400 text-base font-medium">Aguardando câmera do professor…</span>
              </div>
            )}
            {/* Sidebar de alunos */}
            <div className="absolute right-0 top-0 h-full flex flex-col gap-2 w-28 items-center pt-2 bg-slate-900/60 rounded-l-2xl">
              {participants.filter((p) => {
                let role = 'student';
                try {
                  const meta = JSON.parse(p.metadata || '{}');
                  if (meta.role === 'teacher') role = 'teacher';
                } catch {}
                return role !== 'teacher';
              }).map((p) => (
                <VideoTile key={p.identity} participant={p} />
              ))}
            </div>
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

      {/* Chat privado (mantido, mas pode ser toggle) */}
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