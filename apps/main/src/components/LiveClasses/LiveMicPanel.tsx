import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConnectionState,
  Participant,
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
} from 'livekit-client';
import { LiveClassRole, LiveClassSession } from '../../types';
import { requestLiveAudioCredentials } from '../../services/liveAudioService';

interface LiveMicPanelProps {
  classId: string;
  userId: string;
  role: LiveClassRole;
  session: LiveClassSession;
  isTeacher: boolean;
  userName: string;
  onUpdateSession?: (patch: Partial<LiveClassSession>) => Promise<void>;
}

interface ParticipantSummary {
  identity: string;
  name: string;
  role: LiveClassRole;
  isLocal: boolean;
  isSpeaking: boolean;
  micEnabled: boolean;
  cameraEnabled: boolean;
}

const roomTransportLabelMap: Record<NonNullable<LiveClassSession['liveAudioTransport']>, string> = {
  'not-configured': 'Room transport pending',
  connecting: 'Room transport connecting',
  connected: 'Room transport connected',
};

const localConnectionLabelMap: Record<ConnectionState, string> = {
  connected: 'Joined audio',
  connecting: 'Joining audio',
  disconnected: 'Not in audio',
  reconnecting: 'Reconnecting audio',
  signalReconnecting: 'Reconnecting signal',
};

function getParticipantRole(participant: Participant, fallback: LiveClassRole): LiveClassRole {
  try {
    const parsed = JSON.parse(participant.metadata || '{}') as { role?: LiveClassRole };
    return parsed.role === 'teacher' ? 'teacher' : parsed.role === 'student' ? 'student' : fallback;
  } catch {
    return fallback;
  }
}

function getParticipantName(participant: Participant): string {
  return participant.name || participant.identity || 'Participant';
}

function isParticipantMicEnabled(participant: Participant): boolean {
  return Array.from(participant.trackPublications.values()).some(
    (publication) => publication.source === Track.Source.Microphone && !publication.isMuted,
  );
}

function sortParticipants(a: ParticipantSummary, b: ParticipantSummary): number {
  if (a.role !== b.role) return a.role === 'teacher' ? -1 : 1;
  if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function isParticipantCameraEnabled(participant: Participant): boolean {
  return Array.from(participant.trackPublications.values()).some(
    (publication) => publication.source === Track.Source.Camera && !publication.isMuted,
  );
}

function getLiveKitConnectionErrorMessage(error: unknown, wsUrl?: string) {
  const fallback = error instanceof Error ? error.message : 'Unable to join live audio.';
  const normalized = fallback.toLowerCase();

  let hostHint = '';
  if (wsUrl) {
    try {
      hostHint = new URL(wsUrl).host;
    } catch {
      hostHint = '';
    }
  }

  if (normalized.includes('invalid api key for domain')) {
    return `LiveKit rejected the credentials for ${hostHint || 'this room host'}. Check whether LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET all belong to the same LiveKit Cloud project.`;
  }

  if (normalized.includes('could not establish signal connection')) {
    return `LiveKit could not establish the signal connection${hostHint ? ` for ${hostHint}` : ''}. Check the /api/getToken logs and confirm the deployed credentials match the configured LiveKit Cloud domain.`;
  }

  return fallback;
}

export const LiveMicPanel: React.FC<LiveMicPanelProps> = ({
  classId,
  userId,
  role,
  session,
  isTeacher,
  userName,
  onUpdateSession,
}) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [participantSummaries, setParticipantSummaries] = useState<ParticipantSummary[]>([]);
  const [localMicEnabled, setLocalMicEnabled] = useState(false);
  const [localCameraEnabled, setLocalCameraEnabled] = useState(false);
  const [joining, setJoining] = useState(false);
  const [transportError, setTransportError] = useState('');
  const audioHostRef = useRef<HTMLDivElement | null>(null);
  const videoTileRefs = useRef(new Map<string, HTMLDivElement>());
  const roomRef = useRef<Room | null>(null);

  const roomTransportLabel = roomTransportLabelMap[session.liveAudioTransport ?? 'not-configured'];
  const localConnectionLabel = localConnectionLabelMap[connectionState];
  const studentMicDisabled = !isTeacher && !session.allowStudentLiveMic;
  const canAutoEnableMic = isTeacher || session.allowStudentLiveMic;

  const syncParticipants = useCallback((activeRoom: Room) => {
    const nextParticipants: ParticipantSummary[] = [
      {
        identity: activeRoom.localParticipant.identity,
        name: getParticipantName(activeRoom.localParticipant),
        role,
        isLocal: true,
        isSpeaking: activeRoom.localParticipant.isSpeaking,
        micEnabled: isParticipantMicEnabled(activeRoom.localParticipant),
        cameraEnabled: isParticipantCameraEnabled(activeRoom.localParticipant),
      },
      ...Array.from(activeRoom.remoteParticipants.values()).map((participant) => ({
        identity: participant.identity,
        name: getParticipantName(participant),
        role: getParticipantRole(participant, 'student'),
        isLocal: false,
        isSpeaking: participant.isSpeaking,
        micEnabled: isParticipantMicEnabled(participant),
        cameraEnabled: isParticipantCameraEnabled(participant),
      })),
    ].sort(sortParticipants);

    setParticipantSummaries(nextParticipants);
    setLocalMicEnabled(isParticipantMicEnabled(activeRoom.localParticipant));
    setLocalCameraEnabled(isParticipantCameraEnabled(activeRoom.localParticipant));
  }, [role]);

  const detachTrackElement = useCallback((trackSid: string) => {
    const host = audioHostRef.current;
    if (!host) return;
    const existing = host.querySelector<HTMLAudioElement>(`audio[data-track-sid="${trackSid}"]`);
    if (existing) {
      existing.remove();
    }
  }, []);

  const attachAudioTrack = useCallback((track: RemoteTrack, participant: Participant) => {
    if (track.kind !== Track.Kind.Audio || !audioHostRef.current) return;
    detachTrackElement(track.sid);
    const element = track.attach() as HTMLAudioElement;
    element.autoplay = true;
    element.dataset.trackSid = track.sid;
    element.dataset.participantIdentity = participant.identity;
    element.className = 'hidden';
    audioHostRef.current.appendChild(element);
  }, [detachTrackElement]);

  const clearVideoHost = useCallback((host: HTMLDivElement | null) => {
    if (!host) return;
    host.querySelectorAll('video').forEach((element) => {
      const video = element as HTMLVideoElement;
      video.pause();
      video.srcObject = null;
      video.remove();
    });
  }, []);

  const syncVideoTiles = useCallback((activeRoom: Room) => {
    const videoRefs = videoTileRefs.current;
    const participants: Participant[] = [
      activeRoom.localParticipant,
      ...Array.from(activeRoom.remoteParticipants.values()),
    ];

    participants.forEach((participant) => {
      const host = videoRefs.get(participant.identity);
      if (!host) return;

      clearVideoHost(host);

      const publication = Array.from(participant.trackPublications.values()).find(
        (item) => item.source === Track.Source.Camera && item.track && !item.isMuted,
      );
      const track = publication?.track;
      if (!track || track.kind !== Track.Kind.Video) return;

      const element = track.attach() as HTMLVideoElement;
      element.autoplay = true;
      element.muted = participant.identity === activeRoom.localParticipant.identity;
      element.playsInline = true;
      element.className = 'h-full w-full object-cover';
      host.appendChild(element);
    });

    videoRefs.forEach((host, identity) => {
      if (!participants.some((participant) => participant.identity === identity)) {
        clearVideoHost(host);
      }
    });
  }, [clearVideoHost]);

  const setVideoTileRef = useCallback((identity: string, node: HTMLDivElement | null) => {
    const refs = videoTileRefs.current;
    if (node) {
      refs.set(identity, node);
      if (roomRef.current) {
        syncVideoTiles(roomRef.current);
      }
      return;
    }

    const existing = refs.get(identity);
    if (existing) {
      clearVideoHost(existing);
    }
    refs.delete(identity);
  }, [clearVideoHost, syncVideoTiles]);

  const disconnectRoom = useCallback(async (activeRoom: Room | null, source: 'teacher' | 'local') => {
    if (!activeRoom) return;

    try {
      await activeRoom.localParticipant.setMicrophoneEnabled(false);
    } catch {
      // Ignore microphone cleanup failures during disconnect.
    }

    try {
      await activeRoom.localParticipant.setCameraEnabled(false);
    } catch {
      // Ignore camera cleanup failures during disconnect.
    }

    activeRoom.disconnect();
    roomRef.current = null;
    setConnectionState(ConnectionState.Disconnected);
    setParticipantSummaries([]);
    setLocalMicEnabled(false);
    setLocalCameraEnabled(false);

    if (audioHostRef.current) {
      audioHostRef.current.innerHTML = '';
    }
    videoTileRefs.current.forEach((host) => clearVideoHost(host));

    if (source === 'teacher' && onUpdateSession) {
      await onUpdateSession({ teacherLiveMicEnabled: false, teacherCameraEnabled: false }).catch((error) => {
        console.warn('[LiveMicPanel] teacher disconnect state sync failed:', error);
      });
    }
  }, [clearVideoHost, onUpdateSession]);

  const joinAudio = useCallback(async (): Promise<Room> => {
    if (roomRef.current && roomRef.current.state !== ConnectionState.Disconnected) {
      return roomRef.current;
    }

    setJoining(true);
    setTransportError('');
    setConnectionState(ConnectionState.Connecting);
    let requestedWsUrl = '';

    try {
      const credentials = await requestLiveAudioCredentials({ classId, userId, userName, role });
      requestedWsUrl = credentials.wsUrl;
      console.info('[LiveMicPanel] joining live audio room', {
        classId,
        roomName: credentials.roomName,
        wsHost: (() => {
          try {
            return new URL(credentials.wsUrl).host;
          } catch {
            return credentials.wsUrl;
          }
        })(),
      });
      const nextRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      nextRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
        setConnectionState(state);
        syncParticipants(nextRoom);
        syncVideoTiles(nextRoom);
      });
      nextRoom.on(RoomEvent.ParticipantConnected, () => {
        syncParticipants(nextRoom);
        syncVideoTiles(nextRoom);
      });
      nextRoom.on(RoomEvent.ParticipantDisconnected, () => {
        syncParticipants(nextRoom);
        syncVideoTiles(nextRoom);
      });
      nextRoom.on(RoomEvent.ActiveSpeakersChanged, () => syncParticipants(nextRoom));
      nextRoom.on(RoomEvent.LocalTrackPublished, () => {
        syncParticipants(nextRoom);
        syncVideoTiles(nextRoom);
      });
      nextRoom.on(RoomEvent.LocalTrackUnpublished, () => {
        syncParticipants(nextRoom);
        syncVideoTiles(nextRoom);
      });
      nextRoom.on(RoomEvent.TrackMuted, () => {
        syncParticipants(nextRoom);
        syncVideoTiles(nextRoom);
      });
      nextRoom.on(RoomEvent.TrackUnmuted, () => {
        syncParticipants(nextRoom);
        syncVideoTiles(nextRoom);
      });
      nextRoom.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          attachAudioTrack(track as RemoteTrack, participant);
        }
        syncParticipants(nextRoom);
        syncVideoTiles(nextRoom);
      });
      nextRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          detachTrackElement(track.sid);
        }
        syncParticipants(nextRoom);
        syncVideoTiles(nextRoom);
      });
      nextRoom.on(RoomEvent.Disconnected, () => {
        roomRef.current = null;
        setConnectionState(ConnectionState.Disconnected);
        setParticipantSummaries([]);
        setLocalMicEnabled(false);
        setLocalCameraEnabled(false);
        if (audioHostRef.current) {
          audioHostRef.current.innerHTML = '';
        }
        videoTileRefs.current.forEach((host) => clearVideoHost(host));
      });
      nextRoom.on(RoomEvent.MediaDevicesError, (error) => {
        console.warn('[LiveMicPanel] media device error:', error);
        setTransportError('Microphone or camera access failed. Check browser permission and device settings.');
      });

      await nextRoom.connect(credentials.wsUrl, credentials.token);
      await nextRoom.startAudio();

      if (canAutoEnableMic) {
        try {
          await nextRoom.localParticipant.setMicrophoneEnabled(true);
        } catch (error) {
          console.warn('[LiveMicPanel] automatic microphone start failed:', error);
          setTransportError('Connected to the room, but the microphone could not start automatically. Check browser permissions and try again.');
        }
      }

      Array.from(nextRoom.remoteParticipants.values()).forEach((participant) => {
        Array.from(participant.trackPublications.values()).forEach((publication) => {
          if (publication.track && publication.track.kind === Track.Kind.Audio) {
            attachAudioTrack(publication.track as RemoteTrack, participant);
          }
        });
      });

      roomRef.current = nextRoom;
      syncParticipants(nextRoom);
      syncVideoTiles(nextRoom);

      if (isTeacher && onUpdateSession) {
        await onUpdateSession({
          teacherLiveMicEnabled: canAutoEnableMic ? isParticipantMicEnabled(nextRoom.localParticipant) : false,
          liveAudioTransport: 'connected',
        }).catch((error) => {
          console.warn('[LiveMicPanel] teacher live mic auto-start sync failed:', error);
        });
      }

      return nextRoom;
    } catch (error) {
      const message = getLiveKitConnectionErrorMessage(error, requestedWsUrl);
      setTransportError(message);
      setConnectionState(ConnectionState.Disconnected);
      throw error;
    } finally {
      setJoining(false);
    }
  }, [attachAudioTrack, canAutoEnableMic, classId, clearVideoHost, detachTrackElement, isTeacher, onUpdateSession, role, syncParticipants, syncVideoTiles, userId, userName]);

  const handleLeaveAudio = async () => {
    await disconnectRoom(roomRef.current, isTeacher ? 'teacher' : 'local');
  };

  const handleTeacherStudentPolicyToggle = async () => {
    if (!isTeacher || !onUpdateSession) return;
    setTransportError('');
    await onUpdateSession({ allowStudentLiveMic: !session.allowStudentLiveMic }).catch((error) => {
      console.warn('[LiveMicPanel] student live mic policy update failed:', error);
      setTransportError('Unable to update student microphone permissions right now.');
    });
  };

  const handleToggleLocalMic = async () => {
    if (!isTeacher && studentMicDisabled) return;

    try {
      const activeRoom = await joinAudio();
      const nextMicEnabled = !isParticipantMicEnabled(activeRoom.localParticipant);
      await activeRoom.localParticipant.setMicrophoneEnabled(nextMicEnabled);
      syncParticipants(activeRoom);

      if (isTeacher && onUpdateSession) {
        await onUpdateSession({
          teacherLiveMicEnabled: nextMicEnabled,
          liveAudioTransport: 'connected',
        }).catch((error) => {
          console.warn('[LiveMicPanel] teacher live mic state sync failed:', error);
        });
      }
    } catch (error) {
      console.warn('[LiveMicPanel] toggle local mic failed:', error);
    }
  };

  const handleToggleLocalCamera = async () => {
    try {
      const activeRoom = await joinAudio();
      const nextCameraEnabled = !isParticipantCameraEnabled(activeRoom.localParticipant);
      await activeRoom.localParticipant.setCameraEnabled(nextCameraEnabled);
      syncParticipants(activeRoom);
      syncVideoTiles(activeRoom);

      if (isTeacher && onUpdateSession) {
        await onUpdateSession({
          teacherCameraEnabled: nextCameraEnabled,
          liveAudioTransport: 'connected',
        }).catch((error) => {
          console.warn('[LiveMicPanel] teacher camera state sync failed:', error);
        });
      }
    } catch (error) {
      console.warn('[LiveMicPanel] toggle local camera failed:', error);
    }
  };

  useEffect(() => {
    if (!session.allowStudentLiveMic && !isTeacher && roomRef.current && localMicEnabled) {
      void roomRef.current.localParticipant.setMicrophoneEnabled(false)
        .then(() => {
          if (roomRef.current) {
            syncParticipants(roomRef.current);
          }
        })
        .catch((error) => {
          console.warn('[LiveMicPanel] forced student mute failed:', error);
        });
    }
  }, [isTeacher, localMicEnabled, session.allowStudentLiveMic, syncParticipants]);

  useEffect(() => {
    return () => {
      void disconnectRoom(roomRef.current, isTeacher ? 'teacher' : 'local');
    };
  }, [disconnectRoom, isTeacher]);

  const connected = connectionState === ConnectionState.Connected;

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-slate-900 p-4">
      <div ref={audioHostRef} aria-hidden="true" className="hidden" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-emerald-300">Live Audio & Camera</h2>
          <p className="mt-1 text-sm text-slate-200">
            Real-time classroom audio and optional camera are running through LiveKit. Live speech does not create chat audio files.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-200">
            {localConnectionLabel}
          </div>
          <div className="rounded-full bg-slate-800 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-300">
            {roomTransportLabel}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Teacher Live Mic</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {session.teacherLiveMicEnabled ? 'Live in room' : 'Muted in room'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Teacher Camera</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {session.teacherCameraEnabled ? 'Camera live' : 'Camera off'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Student Live Mic</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {session.allowStudentLiveMic ? 'Students may unmute' : 'Students muted by teacher'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Your Mic / Camera</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {localMicEnabled || localCameraEnabled
              ? `${localMicEnabled ? 'Mic live' : 'Mic muted'} | ${localCameraEnabled ? 'Camera on' : 'Camera off'}`
              : connected
                ? 'Connected and muted'
                : 'Not connected'}
          </p>
        </div>
      </div>

      {transportError ? (
        <p className="mt-3 rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-200">
          {transportError}
        </p>
      ) : null}

      <p className="mt-3 text-xs text-slate-400">
        Avoid using the in-app live mic and Google Meet audio at the same time. If both are open together, echo and feedback can happen.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void joinAudio()}
          disabled={joining || connected}
          className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-black text-white shadow-[0_3px_0_0_#1d4ed8] disabled:opacity-60"
        >
          {joining ? 'Joining Audio...' : connected ? 'Audio Joined' : 'Join Audio'}
        </button>

        <button
          type="button"
          onClick={() => void handleLeaveAudio()}
          disabled={!connected}
          className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-slate-200 disabled:opacity-60"
        >
          Leave Audio
        </button>

        <button
          type="button"
          onClick={() => void handleToggleLocalMic()}
          disabled={joining || (!isTeacher && studentMicDisabled)}
          className={`rounded-xl px-4 py-2 text-sm font-black ${
            localMicEnabled
              ? 'bg-rose-500 text-white shadow-[0_3px_0_0_#be123c]'
              : 'bg-emerald-500 text-slate-900 shadow-[0_3px_0_0_#059669]'
          } disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none`}
        >
          {localMicEnabled
            ? isTeacher ? 'Mute Teacher Mic' : 'Mute My Live Mic'
            : isTeacher ? 'Go Live' : 'Unmute My Live Mic'}
        </button>

        <button
          type="button"
          onClick={() => void handleToggleLocalCamera()}
          disabled={joining}
          className={`rounded-xl px-4 py-2 text-sm font-black ${
            localCameraEnabled
              ? 'bg-fuchsia-500 text-white shadow-[0_3px_0_0_#a21caf]'
              : 'bg-sky-500 text-slate-950 shadow-[0_3px_0_0_#0284c7]'
          } disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none`}
        >
          {localCameraEnabled ? 'Turn Camera Off' : 'Turn Camera On'}
        </button>

        {isTeacher ? (
          <button
            type="button"
            onClick={() => void handleTeacherStudentPolicyToggle()}
            className={`rounded-xl px-4 py-2 text-sm font-black ${
              session.allowStudentLiveMic
                ? 'bg-amber-400 text-slate-900 shadow-[0_3px_0_0_#d97706]'
                : 'bg-slate-100 text-slate-900 shadow-[0_3px_0_0_#94a3b8]'
            }`}
          >
            {session.allowStudentLiveMic ? 'Mute Students' : 'Allow Student Mics'}
          </button>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-black uppercase tracking-wide text-slate-300">Live Camera</h3>
          <span className="text-[11px] font-semibold text-slate-500">
            {participantSummaries.filter((participant) => participant.cameraEnabled).length} camera live
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {participantSummaries.filter((participant) => participant.cameraEnabled).length === 0 ? (
            <p className="text-xs text-slate-400">Nobody has enabled camera in this room yet.</p>
          ) : (
            participantSummaries
              .filter((participant) => participant.cameraEnabled)
              .map((participant) => (
                <div key={participant.identity} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                  <div className="aspect-video bg-slate-950">
                    <div
                      ref={(node) => setVideoTileRef(participant.identity, node)}
                      className="h-full w-full bg-slate-950"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-700 px-3 py-2 text-sm text-slate-100">
                    <div>
                      <p className="font-semibold">
                        {participant.name}
                        {participant.isLocal ? ' (You)' : ''}
                      </p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">{participant.role}</p>
                    </div>
                    <div className="text-right text-[11px] font-semibold uppercase tracking-wide">
                      <p className="text-sky-300">Camera live</p>
                      <p className={participant.isSpeaking ? 'text-amber-300' : 'text-slate-500'}>
                        {participant.isSpeaking ? 'Speaking' : 'Silent'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-black uppercase tracking-wide text-slate-300">Live Audio Participants</h3>
          <span className="text-[11px] font-semibold text-slate-500">{participantSummaries.length} connected to audio</span>
        </div>

        <div className="mt-3 space-y-2">
          {participantSummaries.length === 0 ? (
            <p className="text-xs text-slate-400">Nobody has joined the live audio room yet.</p>
          ) : (
            participantSummaries.map((participant) => (
              <div key={participant.identity} className="flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-sm text-slate-100">
                <div>
                  <p className="font-semibold">
                    {participant.name}
                    {participant.isLocal ? ' (You)' : ''}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">{participant.role}</p>
                </div>
                <div className="text-right text-[11px] font-semibold uppercase tracking-wide">
                  <p className={participant.micEnabled ? 'text-emerald-300' : 'text-slate-500'}>
                    {participant.micEnabled ? 'Mic live' : 'Mic muted'}
                  </p>
                  <p className={participant.cameraEnabled ? 'text-sky-300' : 'text-slate-500'}>
                    {participant.cameraEnabled ? 'Camera live' : 'Camera off'}
                  </p>
                  <p className={participant.isSpeaking ? 'text-amber-300' : 'text-slate-500'}>
                    {participant.isSpeaking ? 'Speaking' : 'Silent'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        {isTeacher
          ? `${userName} can publish live audio and optional camera here, and students who joined the room see and hear it immediately.`
          : studentMicDisabled
            ? 'You can join the room to listen now and turn your camera on if needed. Your live microphone stays muted until the teacher enables student mic access.'
            : 'You can join the room to listen, use your camera, and unmute your own live microphone when the teacher allows it.'}
      </p>
    </div>
  );
};
