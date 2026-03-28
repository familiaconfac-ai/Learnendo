import { auth } from './firebase';
import { LiveClassRole } from '../types';

export interface LiveAudioCredentials {
  token: string;
  wsUrl: string;
  roomName: string;
  participantIdentity: string;
  participantName: string;
}

interface RequestLiveAudioCredentialsParams {
  classId: string;
  userId: string;
  userName: string;
  role: LiveClassRole;
}

const DEFAULT_TOKEN_ENDPOINT = '/api/livekit-token';

export function getLiveAudioRoomName(classId: string): string {
  return `learnendo-live-${classId}`;
}

export function getLiveAudioTokenEndpoint(): string {
  const configured = import.meta.env.VITE_LIVEKIT_TOKEN_ENDPOINT?.trim();
  return configured || DEFAULT_TOKEN_ENDPOINT;
}

export async function requestLiveAudioCredentials({
  classId,
  userId,
  userName,
  role,
}: RequestLiveAudioCredentialsParams): Promise<LiveAudioCredentials> {
  const endpoint = getLiveAudioTokenEndpoint();
  const idToken = await auth.currentUser?.getIdToken?.().catch(() => '');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(idToken ? { authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({
      classId,
      userId,
      userName,
      role,
      roomName: getLiveAudioRoomName(classId),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to create live audio credentials.');
  }

  const payload = (await response.json()) as Partial<LiveAudioCredentials>;
  if (!payload.token || !payload.wsUrl || !payload.roomName) {
    throw new Error('Live audio credentials response is incomplete.');
  }

  return {
    token: payload.token,
    wsUrl: payload.wsUrl,
    roomName: payload.roomName,
    participantIdentity: payload.participantIdentity ?? userId,
    participantName: payload.participantName ?? userName,
  };
}
