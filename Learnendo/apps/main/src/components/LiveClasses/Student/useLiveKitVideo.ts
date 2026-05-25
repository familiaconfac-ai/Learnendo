import { useEffect, useState } from 'react';
import type { Room } from 'livekit-client';
import { Track } from 'livekit-client';

export interface LiveKitVideoTracks {
  localCameraTrack: MediaStreamTrack | null;
  teacherCameraTrack: MediaStreamTrack | null;
  teacherName: string | null;
  connected: boolean;
}

/**
 * Hook para extrair o track local do aluno e o track de vídeo do professor a partir de uma instância Room do LiveKit.
 * roomRef: React ref para Room (LiveKit)
 * userId: UID do usuário local
 */
export function useLiveKitVideo(roomRef: React.RefObject<Room | null>, userId: string) {
  const [tracks, setTracks] = useState<LiveKitVideoTracks>({
    localCameraTrack: null,
    teacherCameraTrack: null,
    teacherName: null,
    connected: false,
  });

  useEffect(() => {
    const room = roomRef.current;
    if (!room) {
      setTracks((t) => ({ ...t, localCameraTrack: null, teacherCameraTrack: null, teacherName: null, connected: false }));
      return;
    }
    // Local camera
    let localCameraTrack: MediaStreamTrack | null = null;
    const local = room.localParticipant;
    for (const pub of local.trackPublications.values()) {
      if (pub.source === Track.Source.Camera && pub.track && !pub.isMuted) {
        localCameraTrack = (pub.track as any).mediaStreamTrack || null;
        break;
      }
    }
    // Find teacher
    let teacherCameraTrack: MediaStreamTrack | null = null;
    let teacherName: string | null = null;
    for (const p of room.remoteParticipants.values()) {
      let role = 'student';
      try {
        const meta = JSON.parse(p.metadata || '{}');
        if (meta.role === 'teacher') role = 'teacher';
      } catch {}
      if (role === 'teacher') {
        teacherName = p.name || p.identity;
        for (const pub of p.trackPublications.values()) {
          if (pub.source === Track.Source.Camera && pub.track && !pub.isMuted) {
            teacherCameraTrack = (pub.track as any).mediaStreamTrack || null;
            break;
          }
        }
        break;
      }
    }
    setTracks({
      localCameraTrack,
      teacherCameraTrack,
      teacherName,
      connected: room.state === 'connected',
    });
  }, [roomRef.current?.state, roomRef.current?.localParticipant, roomRef.current?.remoteParticipants]);

  return tracks;
}
