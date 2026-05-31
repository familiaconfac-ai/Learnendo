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
import { logLiveKitDebug, nextLiveKitDebugCounter } from '../../services/liveKitDebug';

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

const studentCameraModeLabelMap: Record<NonNullable<LiveClassSession['studentCameraMode']>, string> = {
  off: 'Off',
  'follow-mic': 'Follows mic',
  required: 'Required',
};

const nextStudentCameraModeMap: Record<NonNullable<LiveClassSession['studentCameraMode']>, NonNullable<LiveClassSession['studentCameraMode']>> = {
  off: 'follow-mic',
  'follow-mic': 'required',
  required: 'off',
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

function getMicrophonePublication(participant: Participant) {
  return Array.from(participant.trackPublications.values()).find(
    (publication) => publication.source === Track.Source.Microphone,
  );
}

function getCameraPublication(participant: Participant) {
  return Array.from(participant.trackPublications.values()).find(
    (publication) => publication.source === Track.Source.Camera,
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

async function ensureMicrophonePermission() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser does not support microphone access for live audio.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => track.stop());
}

async function ensureCameraPermission() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser does not support camera access for live video.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  stream.getTracks().forEach((track) => track.stop());
}

function getCameraErrorMessage(error: unknown, localParticipant: Participant) {
  const fallback = error instanceof Error ? error.message : 'Camera access failed. Check browser permissions and your selected camera device.';
  const liveKitCameraError = 'lastCameraError' in localParticipant
    ? (localParticipant as Participant & { lastCameraError?: Error }).lastCameraError?.message
    : '';
  return liveKitCameraError || fallback;
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
  const isTeacherRef = useRef(isTeacher);
  const onUpdateSessionRef = useRef(onUpdateSession);

  useEffect(() => {
    isTeacherRef.current = isTeacher;
  }, [isTeacher]);

  useEffect(() => {
    onUpdateSessionRef.current = onUpdateSession;
  }, [onUpdateSession]);

  const roomTransportLabel = roomTransportLabelMap[session.liveAudioTransport ?? 'not-configured'];
  const localConnectionLabel = localConnectionLabelMap[connectionState];
  const studentCameraMode = session.studentCameraMode ?? 'off';
  const studentCameraPolicyLabel = studentCameraModeLabelMap[studentCameraMode];
  const studentMicDisabled = !isTeacher && !session.allowStudentLiveMic;
  const studentCameraDisabled = !isTeacher && studentCameraMode === 'off';
  const studentCameraFollowMic = !isTeacher && studentCameraMode === 'follow-mic';
  const studentCameraRequired = !isTeacher && studentCameraMode === 'required';
  const canAutoEnableMic = isTeacher;
  const displayedCameraParticipants = isTeacher
    ? participantSummaries
    : participantSummaries.filter((participant) => !participant.isLocal);

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
    element.muted = false;
    element.dataset.trackSid = track.sid;
    element.dataset.participantIdentity = participant.identity;
    element.className = 'hidden';
    audioHostRef.current.appendChild(element);
    void element.play().catch((error) => {
      console.warn('[LiveMicPanel] remote audio autoplay failed:', error);
    });
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
      // Audio is attached through dedicated audio tags, so keeping video muted avoids
      // mobile autoplay blocks while still allowing the participant to be heard.
      element.muted = true;
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

  const updateTeacherRoomState = useCallback(async (activeRoom: Room) => {
    if (!isTeacherRef.current || !onUpdateSessionRef.current) return;

    await onUpdateSessionRef.current({
      teacherLiveMicEnabled: isParticipantMicEnabled(activeRoom.localParticipant),
      teacherCameraEnabled: isParticipantCameraEnabled(activeRoom.localParticipant),
      liveAudioTransport: activeRoom.state === ConnectionState.Connected ? 'connected' : 'connecting',
    }).catch((error) => {
      console.warn('[LiveMicPanel] teacher room state sync failed:', error);
    });
  }, []);

  const setLocalCameraState = useCallback(async (activeRoom: Room, enabled: boolean) => {
    const localParticipant = activeRoom.localParticipant;

    if (enabled) {
      await ensureCameraPermission();
    }

    const publication = await localParticipant.setCameraEnabled(
      enabled,
      enabled ? { facingMode: 'user' } : undefined,
    );

    const resolvedPublication = enabled ? (publication ?? getCameraPublication(localParticipant)) : undefined;
    console.info('[LiveMicPanel] camera toggle complete', {
      participantIdentity: localParticipant.identity,
      enabled,
      hasPublication: Boolean(resolvedPublication),
      trackSid: resolvedPublication?.trackSid ?? '',
    });

    if (enabled && !resolvedPublication) {
      throw new Error(getCameraErrorMessage(localParticipant.lastCameraError, localParticipant));
    }

    syncParticipants(activeRoom);
    syncVideoTiles(activeRoom);
    setTransportError('');
    return Boolean(resolvedPublication);
  }, [syncParticipants, syncVideoTiles]);

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

    if (source === 'teacher' && onUpdateSessionRef.current) {
      await onUpdateSessionRef.current({ teacherLiveMicEnabled: false, teacherCameraEnabled: false }).catch((error) => {
        console.warn('[LiveMicPanel] teacher disconnect state sync failed:', error);
      });
    }
  }, [clearVideoHost]);

  const joinAudio = useCallback(async (): Promise<Room> => {
    if (roomRef.current && roomRef.current.state !== ConnectionState.Disconnected) {
      return roomRef.current;
    }

    setJoining(true);
    setTransportError('');
    setConnectionState(ConnectionState.Connecting);
    let requestedWsUrl = '';

    try {
      const credentials = await requestLiveAudioCredentials({
        classId,
        userId,
        userName,
        role,
        debugSource: 'LiveMicPanel',
      });
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
      const roomInstanceNumber = nextLiveKitDebugCounter('live_mic_panel_room_instance');
      const nextRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      logLiveKitDebug(`Room instance created #${roomInstanceNumber}`, {
        source: 'LiveMicPanel',
        role,
        classId,
        roomState: nextRoom.state,
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
        const microphonePublication = getMicrophonePublication(nextRoom.localParticipant);
        const cameraPublication = getCameraPublication(nextRoom.localParticipant);
        if (microphonePublication) {
          console.info('[LiveMicPanel] local microphone track published', {
            participantIdentity: nextRoom.localParticipant.identity,
            trackSid: microphonePublication.trackSid,
            isMuted: microphonePublication.isMuted,
          });
        }
        if (cameraPublication) {
          console.info('[LiveMicPanel] local camera track published', {
            participantIdentity: nextRoom.localParticipant.identity,
            trackSid: cameraPublication.trackSid,
            isMuted: cameraPublication.isMuted,
          });
        }
        syncParticipants(nextRoom);
        syncVideoTiles(nextRoom);
        void updateTeacherRoomState(nextRoom);
      });
      nextRoom.on(RoomEvent.LocalTrackUnpublished, () => {
        syncParticipants(nextRoom);
        syncVideoTiles(nextRoom);
        void updateTeacherRoomState(nextRoom);
      });
      nextRoom.on(RoomEvent.TrackMuted, () => {
        syncParticipants(nextRoom);
        syncVideoTiles(nextRoom);
        void updateTeacherRoomState(nextRoom);
      });
      nextRoom.on(RoomEvent.TrackUnmuted, () => {
        syncParticipants(nextRoom);
        syncVideoTiles(nextRoom);
        void updateTeacherRoomState(nextRoom);
      });
      nextRoom.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          console.info('[LiveMicPanel] remote audio track subscribed', {
            participantIdentity: participant.identity,
            trackSid: track.sid,
          });
          attachAudioTrack(track as RemoteTrack, participant);
        }
        if (track.kind === Track.Kind.Video) {
          console.info('[LiveMicPanel] remote video track subscribed', {
            participantIdentity: participant.identity,
            trackSid: track.sid,
          });
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

      const connectAttemptNumber = nextLiveKitDebugCounter('live_mic_panel_connect_attempt');
      logLiveKitDebug(`connect attempt #${connectAttemptNumber}`, {
        source: 'LiveMicPanel',
        role,
        classId,
        roomState: nextRoom.state,
        wsUrlHost: (() => {
          try {
            return new URL(credentials.wsUrl).host;
          } catch {
            return credentials.wsUrl;
          }
        })(),
      });
      await nextRoom.connect(credentials.wsUrl, credentials.token);
      await nextRoom.startAudio();

      if (canAutoEnableMic) {
        try {
          await ensureMicrophonePermission();
          await nextRoom.localParticipant.setMicrophoneEnabled(true);
          const publication = getMicrophonePublication(nextRoom.localParticipant);
          console.info('[LiveMicPanel] microphone enabled', {
            participantIdentity: nextRoom.localParticipant.identity,
            hasPublication: Boolean(publication),
            trackSid: publication?.trackSid ?? '',
          });
          if (!publication) {
            setTransportError('Connected to the room, but the microphone track was not published. Check browser microphone permission and try joining again.');
          }
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

      await updateTeacherRoomState(nextRoom);

      return nextRoom;
    } catch (error) {
      const message = getLiveKitConnectionErrorMessage(error, requestedWsUrl);
      setTransportError(message);
      setConnectionState(ConnectionState.Disconnected);
      throw error;
    } finally {
      setJoining(false);
    }
  }, [attachAudioTrack, canAutoEnableMic, classId, clearVideoHost, detachTrackElement, role, syncParticipants, syncVideoTiles, updateTeacherRoomState, userId, userName]);

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

  const handleTeacherStudentCameraModeToggle = async () => {
    if (!isTeacher || !onUpdateSession) return;
    setTransportError('');
    const nextMode = nextStudentCameraModeMap[studentCameraMode];
    await onUpdateSession({ studentCameraMode: nextMode }).catch((error) => {
      console.warn('[LiveMicPanel] student camera mode update failed:', error);
      setTransportError('Unable to update student camera permissions right now.');
    });
  };

  const handleToggleLocalMic = async () => {
    if (!isTeacher && studentMicDisabled) return;

    try {
      const activeRoom = await joinAudio();
      const nextMicEnabled = !isParticipantMicEnabled(activeRoom.localParticipant);
      if (nextMicEnabled) {
        await ensureMicrophonePermission();
      }
      await activeRoom.localParticipant.setMicrophoneEnabled(nextMicEnabled);
      const publication = getMicrophonePublication(activeRoom.localParticipant);
      console.info('[LiveMicPanel] microphone toggle complete', {
        participantIdentity: activeRoom.localParticipant.identity,
        enabled: nextMicEnabled,
        hasPublication: Boolean(publication),
        trackSid: publication?.trackSid ?? '',
      });
      if (nextMicEnabled && !publication) {
        setTransportError('Microphone access was requested, but no audio track was published to the room. Check browser microphone permission and try again.');
      } else {
        setTransportError('');
      }

      if (!isTeacher) {
        if (studentCameraFollowMic && nextMicEnabled) {
          await setLocalCameraState(activeRoom, true);
        }

        if (studentCameraFollowMic && !nextMicEnabled && isParticipantCameraEnabled(activeRoom.localParticipant)) {
          await setLocalCameraState(activeRoom, false);
        }
      }

      syncParticipants(activeRoom);

      if (isTeacher) {
        await updateTeacherRoomState(activeRoom);
      }
    } catch (error) {
      console.warn('[LiveMicPanel] toggle local mic failed:', error);
    }
  };

  const handleToggleLocalCamera = async () => {
    if (!isTeacher) {
      if (studentCameraDisabled) {
        setTransportError('Only the teacher can turn student cameras on in this room.');
        return;
      }

      if (studentCameraFollowMic) {
        setTransportError('Student camera follows the microphone in this room. Open your mic to appear on camera.');
        return;
      }

      if (studentCameraRequired && localCameraEnabled) {
        setTransportError('The teacher requires student camera to stay on right now.');
        return;
      }
    }

    try {
      const activeRoom = await joinAudio();
      const nextCameraEnabled = !isParticipantCameraEnabled(activeRoom.localParticipant);
      await setLocalCameraState(activeRoom, nextCameraEnabled);

      if (isTeacher) {
        await updateTeacherRoomState(activeRoom);
      }
    } catch (error) {
      console.warn('[LiveMicPanel] toggle local camera failed:', error);
      const localParticipant = roomRef.current?.localParticipant;
      setTransportError(
        localParticipant
          ? getCameraErrorMessage(error, localParticipant)
          : (error instanceof Error ? error.message : 'Camera access failed. Check browser permissions and your selected camera device.'),
      );
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
    if (isTeacher || !roomRef.current || connectionState !== ConnectionState.Connected) {
      return;
    }

    const activeRoom = roomRef.current;
    const shouldEnableCamera = studentCameraRequired || (studentCameraFollowMic && localMicEnabled);
    const shouldDisableCamera = studentCameraDisabled || (studentCameraFollowMic && !localMicEnabled);

    if (shouldEnableCamera && !localCameraEnabled) {
      void setLocalCameraState(activeRoom, true).catch((error) => {
        console.warn('[LiveMicPanel] student camera policy enable failed:', error);
        setTransportError(getCameraErrorMessage(error, activeRoom.localParticipant));
      });
      return;
    }

    if (shouldDisableCamera && localCameraEnabled) {
      void setLocalCameraState(activeRoom, false).catch((error) => {
        console.warn('[LiveMicPanel] student camera policy disable failed:', error);
      });
    }
  }, [
    connectionState,
    isTeacher,
    localCameraEnabled,
    localMicEnabled,
    setLocalCameraState,
    studentCameraDisabled,
    studentCameraFollowMic,
    studentCameraRequired,
  ]);

  useEffect(() => {
    return () => {
      void disconnectRoom(roomRef.current, isTeacherRef.current ? 'teacher' : 'local');
    };
  }, [disconnectRoom]);

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
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Student Mic / Camera</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {session.allowStudentLiveMic ? 'Students may unmute' : 'Students muted by teacher'}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Camera: {studentCameraPolicyLabel}
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

      {/* ...botões removidos, controles agora centralizados no topo da interface principal... */}

      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-black uppercase tracking-wide text-slate-300">Live Camera</h3>
          <span className="text-[11px] font-semibold text-slate-500">
            {displayedCameraParticipants.filter((participant) => participant.cameraEnabled).length} camera live
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {displayedCameraParticipants.length === 0 ? (
            <p className="text-xs text-slate-400">
              {isTeacher
                ? 'Nobody has joined the live room yet.'
                : 'Your own camera preview stays hidden here. When the teacher camera is live, it will appear in this area.'}
            </p>
          ) : (
            displayedCameraParticipants.map((participant) => (
              <div key={participant.identity} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                <div className="aspect-video bg-slate-950">
                  <div
                    ref={(node) => setVideoTileRef(participant.identity, node)}
                    className="relative h-full w-full bg-slate-950"
                  >
                    {!participant.cameraEnabled ? (
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Camera off
                      </div>
                    ) : null}
                  </div>
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
                    <p className={participant.cameraEnabled ? 'text-sky-300' : 'text-slate-500'}>
                      {participant.cameraEnabled ? 'Camera live' : 'Camera off'}
                    </p>
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
            ? 'You can join the room to listen now. Your microphone stays muted until the teacher enables student mic access, and camera behavior follows the teacher setting.'
            : studentCameraFollowMic
              ? 'Open your microphone when you need to speak. Your camera will open together with the mic while the teacher keeps this mode active.'
              : studentCameraRequired
                ? 'The teacher requires student camera to stay on in this room.'
                : 'You can join the room to listen and unmute when the teacher allows it.'}
      </p>
    </div>
  );
};
