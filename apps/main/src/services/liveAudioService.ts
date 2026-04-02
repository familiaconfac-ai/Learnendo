import { auth } from './firebase';
import { LiveClassRole } from '../types';

export interface LiveAudioCredentials {
  token: string;
  wsUrl: string;
  roomName: string;
  participantIdentity: string;
  participantName: string;
}

interface LiveAudioErrorPayload {
  error?: string;
  missingEnv?: string[];
  diagnostics?: {
    apiKeyConfigured?: boolean;
    apiSecretConfigured?: boolean;
    apiKeySuffix?: string;
    url?: string;
    urlHost?: string;
  };
}

interface RequestLiveAudioCredentialsParams {
  classId: string;
  userId: string;
  userName: string;
  role: LiveClassRole;
}

const DEFAULT_TOKEN_ENDPOINT = '/api/getToken';

export function getLiveAudioRoomName(classId: string): string {
  return `learnendo-live-${classId}`;
}

export function getLiveAudioTokenEndpoint(): string {
  const configured = import.meta.env.VITE_LIVEKIT_TOKEN_ENDPOINT?.trim();
  return configured || DEFAULT_TOKEN_ENDPOINT;
}

function isHtmlResponse(contentType: string, responseText: string) {
  return contentType.includes('text/html') || /^\s*</.test(responseText);
}

function validateReturnedLiveKitUrl(wsUrl: string) {
  try {
    const parsedUrl = new URL(wsUrl);
    if (parsedUrl.protocol !== 'wss:') {
      throw new Error('Live audio token endpoint returned an invalid LiveKit URL. Expected a wss:// URL.');
    }
    if (!parsedUrl.host) {
      throw new Error('Live audio token endpoint returned a LiveKit URL without a host.');
    }
    return parsedUrl.host;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Live audio token endpoint returned an invalid LiveKit URL.');
  }
}

export async function requestLiveAudioCredentials({
  classId,
  userId,
  userName,
  role,
}: RequestLiveAudioCredentialsParams): Promise<LiveAudioCredentials> {
  const endpoint = getLiveAudioTokenEndpoint();
  const idToken = await auth.currentUser?.getIdToken?.().catch(() => '');
  const roomName = getLiveAudioRoomName(classId);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(idToken ? { authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({
      room: roomName,
      username: userName,
      participantIdentity: `${role}:${userId}`,
      metadata: JSON.stringify({ classId, userId, role }),
    }),
  });

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 404) {
      throw new Error(
        'Live audio token endpoint was not found at /api/getToken. In production, confirm the Vercel project Root Directory is apps/main. In development, run the app with `vercel dev` so API routes are available.',
      );
    }
    try {
      const parsed = JSON.parse(errorText) as LiveAudioErrorPayload;
      const message = parsed.error?.trim() ?? '';
      const diagnosticsHint = parsed.diagnostics?.urlHost
        ? ` Host: ${parsed.diagnostics.urlHost}.`
        : '';
      if (message === 'LiveKit server environment is not configured.') {
        const missingEnv = parsed.missingEnv?.filter(Boolean) ?? [];
        const envHint = missingEnv.length > 0
          ? missingEnv.join(', ')
          : 'LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET';
        throw new Error(`Live audio is not configured in this deployment yet. Add ${envHint} before using in-app voice.${diagnosticsHint}`);
      }
      throw new Error(`${message || 'Failed to create live audio credentials.'}${diagnosticsHint}`);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      if (isHtmlResponse(contentType, errorText)) {
        throw new Error(
          'Live audio token endpoint returned HTML instead of JSON. Check whether the /api/getToken route is being rewritten to the SPA or is missing from the deployed Vercel root directory.',
        );
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
    if (isHtmlResponse(contentType, responseText)) {
      throw new Error(
        'Live audio token endpoint returned HTML instead of JSON. Check whether the /api/getToken route is being rewritten to index.html or is unavailable in this environment.',
      );
    }
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

  const wsUrl = payload.wsUrl ?? (payload as Partial<{ url: string }>).url;
  const resolvedRoomName = payload.roomName ?? (payload as Partial<{ room: string }>).room ?? roomName;

  if (!payload.token || !wsUrl || !resolvedRoomName) {
    throw new Error('Live audio credentials response is incomplete.');
  }

  validateReturnedLiveKitUrl(wsUrl);

  return {
    token: payload.token,
    wsUrl,
    roomName: resolvedRoomName,
    participantIdentity: payload.participantIdentity ?? `${role}:${userId}`,
    participantName: payload.participantName ?? userName,
  };
}
