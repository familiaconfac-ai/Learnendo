import { AccessToken } from 'livekit-server-sdk';
import type { IncomingMessage, ServerResponse } from 'node:http';

type VercelRequestLike = IncomingMessage & {
  method?: string;
  body?: unknown;
};

type VercelResponseLike = ServerResponse<IncomingMessage> & {
  status?: (code: number) => VercelResponseLike;
  json?: (body: unknown) => void;
};

interface TokenRequestBody {
  classId?: string;
  userId?: string;
  userName?: string;
  roomName?: string;
  role?: 'teacher' | 'student';
}

const requiredLiveKitEnvKeys = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'] as const;

async function readJsonBody(req: IncomingMessage): Promise<TokenRequestBody> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as TokenRequestBody;
}

function sendJson(res: VercelResponseLike, statusCode: number, body: unknown) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(statusCode).json(body);
    return;
  }

  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const wsUrl = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  const roomPrefix = process.env.LIVEKIT_ROOM_PREFIX?.trim() || 'learnendo-live';
  const missingEnv = requiredLiveKitEnvKeys.filter((key) => !process.env[key]?.trim());

  if (missingEnv.length > 0 || !wsUrl || !apiKey || !apiSecret) {
    sendJson(res, 500, {
      error: 'LiveKit server environment is not configured.',
      missingEnv,
    });
    return;
  }

  try {
    const rawBody = typeof req.body === 'object' && req.body !== null
      ? (req.body as TokenRequestBody)
      : await readJsonBody(req);

    const classId = rawBody.classId?.trim() || '';
    const userId = rawBody.userId?.trim() || '';
    const userName = rawBody.userName?.trim() || 'Student';
    const role = rawBody.role === 'teacher' ? 'teacher' : 'student';
    const roomName = rawBody.roomName?.trim() || `${roomPrefix}-${classId}`;

    if (!classId || !userId || !roomName) {
      sendJson(res, 400, { error: 'classId, userId, and roomName are required.' });
      return;
    }

    const participantIdentity = `${role}:${userId}`;
    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: userName,
      metadata: JSON.stringify({ classId, userId, role }),
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: false,
    });

    const jwt = await token.toJwt();

    sendJson(res, 200, {
      token: jwt,
      wsUrl,
      roomName,
      participantIdentity,
      participantName: userName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create LiveKit token.';
    sendJson(res, 500, { error: message });
  }
}
