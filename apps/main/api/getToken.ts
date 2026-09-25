import { AccessToken } from 'livekit-server-sdk';
import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { adminAuth, adminDb } from '../server/firebaseAdmin.js';
import {
  buildAuthorizedLiveKitIdentity,
  requireLiveKitBearerToken,
  resolveLiveKitRole,
  sanitizeLiveKitTabId,
} from '../server/liveKitTokenPolicy.js';

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
  tabId?: string;
}

const requiredLiveKitEnvKeys = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'] as const;
const defaultTokenTtlSeconds = 6 * 60 * 60;
const defaultTokenTtlLabel = '6h';
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_PER_USER_AND_CLASS = 12;

interface LiveKitDiagnostics {
  apiKeyConfigured: boolean;
  apiSecretConfigured: boolean;
  apiKeyPrefix: string;
  apiKeySuffix: string;
  url: string;
  urlHost: string;
}

async function readJsonBody(req: IncomingMessage): Promise<TokenRequestBody> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) return {};

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody) as TokenRequestBody;
  } catch {
    throw new Error('Request body was not valid JSON.');
  }
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

async function enforceRateLimit(key: string) {
  const now = Date.now();
  const bucketId = createHash('sha256').update(key).digest('hex');
  const bucketRef = adminDb.doc(`liveKitRateLimits/${bucketId}`);
  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(bucketRef);
    const data = snapshot.data() as { windowStartedAtMs?: number; count?: number } | undefined;
    const withinWindow = typeof data?.windowStartedAtMs === 'number' && now - data.windowStartedAtMs < RATE_WINDOW_MS;
    const count = withinWindow && typeof data?.count === 'number' ? data.count : 0;
    if (count >= RATE_LIMIT_PER_USER_AND_CLASS) {
      throw Object.assign(new Error('Too many LiveKit token requests. Try again shortly.'), { statusCode: 429 });
    }
    transaction.set(bucketRef, {
      windowStartedAtMs: withinWindow ? data?.windowStartedAtMs : now,
      count: count + 1,
      expiresAtMs: now + RATE_WINDOW_MS,
    });
  });
}

function getKeySuffix(value?: string) {
  if (!value) return '';
  return value.slice(-4);
}

function getKeyPrefix(value?: string) {
  if (!value) return '';
  return value.slice(0, 4);
}

function buildDiagnostics(wsUrl?: string, apiKey?: string, apiSecret?: string): LiveKitDiagnostics {
  let url = '';
  let urlHost = '';

  if (wsUrl) {
    try {
      const parsedUrl = new URL(wsUrl);
      url = parsedUrl.toString();
      urlHost = parsedUrl.host;
    } catch {
      url = wsUrl;
    }
  }

  return {
    apiKeyConfigured: Boolean(apiKey),
    apiSecretConfigured: Boolean(apiSecret),
    apiKeyPrefix: getKeyPrefix(apiKey),
    apiKeySuffix: getKeySuffix(apiKey),
    url,
    urlHost,
  };
}

function resolveRuntimeEnvironment() {
  return {
    deploymentTarget: process.env.VERCEL ? 'vercel' : 'local',
    nodeEnv: process.env.NODE_ENV || 'unknown',
    vercelEnv: process.env.VERCEL_ENV || 'local',
  };
}

function getExpectedExpirationIso(nowMs: number, ttlSeconds: number) {
  return new Date(nowMs + ttlSeconds * 1000).toISOString();
}

function validateLiveKitUrl(wsUrl: string): { ok: true; host: string } | { ok: false; reason: string } {
  try {
    const parsedUrl = new URL(wsUrl);
    if (parsedUrl.protocol !== 'wss:') {
      return { ok: false, reason: 'LIVEKIT_URL must start with wss:// for LiveKit Cloud.' };
    }
    if (!parsedUrl.host) {
      return { ok: false, reason: 'LIVEKIT_URL must include a valid host.' };
    }
    return { ok: true, host: parsedUrl.host };
  } catch {
    return { ok: false, reason: 'LIVEKIT_URL is not a valid URL.' };
  }
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const wsUrl = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  const missingEnv = requiredLiveKitEnvKeys.filter((key) => !process.env[key]?.trim());
  const diagnostics = buildDiagnostics(wsUrl, apiKey, apiSecret);
  const runtimeEnvironment = resolveRuntimeEnvironment();

  console.info('[LiveKit][getToken] environment diagnostics', {
    timestamp: new Date().toISOString(),
    ...runtimeEnvironment,
    ...diagnostics,
  });

  try {
    const decoded = await adminAuth.verifyIdToken(requireLiveKitBearerToken(req.headers.authorization));
    if (missingEnv.length > 0 || !wsUrl || !apiKey || !apiSecret) {
      sendJson(res, 500, {
        error: 'LiveKit server environment is not configured.',
        missingEnv,
        diagnostics,
      });
      return;
    }

    const urlValidation = validateLiveKitUrl(wsUrl);
    if ('reason' in urlValidation) {
      sendJson(res, 500, {
        error: urlValidation.reason,
        diagnostics,
      });
      return;
    }

    const rawBody = typeof req.body === 'object' && req.body !== null
      ? (req.body as TokenRequestBody)
      : await readJsonBody(req);
    const classId = rawBody.classId?.trim() || '';
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(classId)) {
      sendJson(res, 400, { error: 'A valid classId is required.' });
      return;
    }

    await enforceRateLimit(`${decoded.uid}:${classId}`);
    const [classSnapshot, profileSnapshot] = await Promise.all([
      adminDb.doc(`liveClasses/${classId}`).get(),
      adminDb.doc(`users/${decoded.uid}`).get(),
    ]);
    if (!classSnapshot.exists) {
      sendJson(res, 404, { error: 'Live class not found.' });
      return;
    }
    const role = resolveLiveKitRole(
      decoded.uid,
      decoded.email,
      profileSnapshot.data()?.role,
      classSnapshot.data() ?? {},
    );
    if (!role) {
      sendJson(res, 403, { error: 'You do not have access to this live class.' });
      return;
    }

    const room = `learnendo-live-${classId}`;
    const tabId = sanitizeLiveKitTabId(rawBody.tabId);
    const participantIdentity = buildAuthorizedLiveKitIdentity(role, decoded.uid);
    const username = decoded.name || profileSnapshot.data()?.name || decoded.email || (role === 'teacher' ? 'Professor' : 'Aluno');
    const metadata = JSON.stringify({ classId, userId: decoded.uid, role, tabId });
    const issuedAtMs = Date.now();
    const expectedExpirationIso = getExpectedExpirationIso(issuedAtMs, defaultTokenTtlSeconds);

    console.info('[LiveKit][getToken] issuing token', {
      timestamp: new Date(issuedAtMs).toISOString(),
      ...runtimeEnvironment,
      room,
      participantIdentity,
      participantName: username,
      role,
      classId,
      userId: decoded.uid,
      urlHost: diagnostics.urlHost || urlValidation.host,
      apiKeyPrefix: diagnostics.apiKeyPrefix,
      apiKeySuffix: diagnostics.apiKeySuffix,
      ttl: defaultTokenTtlLabel,
      expiresAt: expectedExpirationIso,
    });

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: username,
      metadata,
      ttl: defaultTokenTtlLabel,
    });

    token.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: false,
    });

    const jwt = await token.toJwt();
    console.info('[LiveKit][getToken] token issued successfully', {
      timestamp: new Date().toISOString(),
      ...runtimeEnvironment,
      room,
      participantIdentity,
      role,
      urlHost: diagnostics.urlHost || urlValidation.host,
      ttl: defaultTokenTtlLabel,
      expiresAt: expectedExpirationIso,
      tokenLength: jwt.length,
    });

    sendJson(res, 200, {
      token: jwt,
      url: wsUrl,
      room,
      roomName: room,
      wsUrl,
      participantIdentity,
      participantName: username,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create LiveKit token.';
    const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
      ? Number((error as { statusCode?: number }).statusCode) || 500
      : (typeof error === 'object' && error !== null && 'code' in error && String((error as { code?: string }).code).startsWith('auth/') ? 401 : 500);
    console.warn('[LiveKit][getToken] token generation failed', {
      message,
      timestamp: new Date().toISOString(),
      ...runtimeEnvironment,
      diagnostics,
    });
    sendJson(res, statusCode, { error: message });
  }
}
