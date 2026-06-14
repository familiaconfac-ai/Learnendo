import type { IncomingMessage, ServerResponse } from 'node:http';

type VercelRequestLike = IncomingMessage & {
  method?: string;
  body?: unknown;
};

type VercelResponseLike = ServerResponse<IncomingMessage> & {
  status?: (code: number) => VercelResponseLike;
  json?: (body: unknown) => void;
};

interface TtsRequestBody {
  text?: string;
  langCode?: string;
  rate?: number;
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

async function readJsonBody(req: IncomingMessage): Promise<TtsRequestBody> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) return {};

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody) as TtsRequestBody;
  } catch {
    throw new Error('Request body was not valid JSON.');
  }
}

function normalizeTranslateLang(langCode?: string) {
  const value = (langCode || 'en-US').trim();
  if (!value) return 'en';

  const lower = value.toLowerCase();
  if (lower.startsWith('en')) return 'en';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('pt-br')) return 'pt-BR';
  if (lower.startsWith('pt')) return 'pt';
  if (lower.startsWith('el')) return 'el';
  if (lower.startsWith('he')) return 'he';
  return value;
}

function buildTranslateTtsUrl(text: string, langCode: string, rate?: number) {
  const url = new URL('https://translate.google.com/translate_tts');
  url.searchParams.set('ie', 'UTF-8');
  url.searchParams.set('client', 'tw-ob');
  url.searchParams.set('tl', normalizeTranslateLang(langCode));
  url.searchParams.set('q', text);
  if ((rate ?? 1) < 0.75) {
    url.searchParams.set('ttsspeed', '0.24');
  }
  return url.toString();
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const rawBody = typeof req.body === 'object' && req.body !== null
      ? (req.body as TtsRequestBody)
      : await readJsonBody(req);

    const text = rawBody.text?.trim() ?? '';
    const langCode = rawBody.langCode?.trim() || 'en-US';
    const rate = Number(rawBody.rate) || 1;

    if (!text) {
      sendJson(res, 400, { error: 'text is required.' });
      return;
    }

    const upstream = await fetch(buildTranslateTtsUrl(text, langCode, rate), {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36 LearnendoTTS/1.0',
      },
    });

    if (!upstream.ok) {
      const details = await upstream.text().catch(() => '');
      sendJson(res, 502, {
        error: 'Upstream TTS provider failed.',
        status: upstream.status,
        details: details.slice(0, 200),
      });
      return;
    }

    const audioBuffer = Buffer.from(await upstream.arrayBuffer());
    res.statusCode = 200;
    res.setHeader('content-type', upstream.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('cache-control', 'no-store');
    res.end(audioBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to synthesize audio.';
    sendJson(res, 500, { error: message });
  }
}
