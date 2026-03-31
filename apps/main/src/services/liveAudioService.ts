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

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const parsed = JSON.parse(errorText) as { error?: string };
      const message = parsed.error?.trim() ?? '';
      if (message === 'LiveKit server environment is not configured.') {
        throw new Error('Live audio is not configured in this deployment yet. Add the LiveKit environment variables before using in-app voice.');
      }
      throw new Error(message || 'Failed to create live audio credentials.');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(errorText || 'Failed to create live audio credentials.');
    }
  }

  const responseText = await response.text();
  if (!responseText.trim()) {
    throw new Error(
      'Live audio token endpoint returned an empty response. Check whether the local or deployed API route is available.',
    );
  }

  if (contentType && !contentType.includes('application/json')) {
    throw new Error(
      'Live audio token endpoint did not return JSON. Check whether the API route and LiveKit server configuration are available in this environment.',
    );
  }

  let payload: Partial<LiveAudioCredentials>;
  try {
    payload = JSON.parse(responseText) as Partial<LiveAudioCredentials>;
  } catch {
    throw new Error('Live audio credentials response was not valid JSON.');
  }

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
