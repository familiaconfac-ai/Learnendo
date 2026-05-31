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
  room?: string;
  username?: string;
  participantIdentity?: string;
  metadata?: string;
}

const requiredLiveKitEnvKeys = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'] as const;
const defaultTokenTtlSeconds = 6 * 60 * 60;
const defaultTokenTtlLabel = '6h';

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

function toSafeIdentity(username: string) {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `guest-${Date.now()}`;
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

function safeParseMetadata(metadata: string) {
  if (!metadata.trim()) {
    return {
      role: 'unknown',
      classId: '',
      userId: '',
      metadataJsonValid: false,
    };
  }

  try {
    const parsed = JSON.parse(metadata) as {
      role?: string;
      classId?: string;
      userId?: string;
    };

    return {
      role: parsed.role?.trim() || 'unknown',
      classId: parsed.classId?.trim() || '',
      userId: parsed.userId?.trim() || '',
      metadataJsonValid: true,
    };
  } catch {
    return {
      role: 'unknown',
      classId: '',
      userId: '',
      metadataJsonValid: false,
    };
  }
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

  try {
    const rawBody = typeof req.body === 'object' && req.body !== null
      ? (req.body as TokenRequestBody)
      : await readJsonBody(req);

    // Keep the server contract intentionally small so the frontend never needs API keys.
    const room = rawBody.room?.trim() || '';
    const username = rawBody.username?.trim() || '';
    const participantIdentity = rawBody.participantIdentity?.trim() || toSafeIdentity(username);
    const metadata = rawBody.metadata?.trim() || '';
    const metadataDetails = safeParseMetadata(metadata);
    const issuedAtMs = Date.now();
    const expectedExpirationIso = getExpectedExpirationIso(issuedAtMs, defaultTokenTtlSeconds);

    if (!room || !username) {
      sendJson(res, 400, { error: 'room and username are required.' });
      return;
    }

    console.info('[LiveKit][getToken] issuing token', {
      timestamp: new Date(issuedAtMs).toISOString(),
      ...runtimeEnvironment,
      room,
      participantIdentity,
      participantName: username,
      role: metadataDetails.role,
      classId: metadataDetails.classId,
      userId: metadataDetails.userId,
      metadataJsonValid: metadataDetails.metadataJsonValid,
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
      role: metadataDetails.role,
      urlHost: diagnostics.urlHost || urlValidation.host,
      ttl: defaultTokenTtlLabel,
      expiresAt: expectedExpirationIso,
      tokenLength: jwt.length,
    });

    sendJson(res, 200, {
      token: jwt,
      url: wsUrl,
      room,
      participantIdentity,
      participantName: username,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create LiveKit token.';
    console.warn('[LiveKit][getToken] token generation failed', {
      message,
      timestamp: new Date().toISOString(),
      ...runtimeEnvironment,
      diagnostics,
    });
    sendJson(res, 500, { error: message });
  }
}
