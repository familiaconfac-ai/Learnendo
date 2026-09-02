import { normalizeTranslateLang } from './src/utils/remoteTtsLanguage.ts';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const liveKitDefaultTokenTtlLabel = '6h';
const liveKitDefaultTokenTtlSeconds = 6 * 60 * 60;

function getKeyPrefix(value?: string) {
  if (!value) return '';
  return value.slice(0, 4);
}

function getKeySuffix(value?: string) {
  if (!value) return '';
  return value.slice(-4);
}

function safeParseMetadata(metadata?: string) {
  if (!metadata?.trim()) {
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

/**
 * Dev-only Vite plugin that serves /api/getToken so `npm run dev`
 * works without `vercel dev`.  Reads LIVEKIT_* env vars from `.env`.
 */
function livekitTokenDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'livekit-token-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/getToken' || req.method !== 'POST') {
          return next();
        }

        const wsUrl = env.LIVEKIT_URL?.trim();
        const apiKey = env.LIVEKIT_API_KEY?.trim();
        const apiSecret = env.LIVEKIT_API_SECRET?.trim();

        console.info('[LiveKit][vite-dev][getToken] environment diagnostics', {
          timestamp: new Date().toISOString(),
          deploymentTarget: 'local-vite-dev',
          nodeEnv: process.env.NODE_ENV || 'development',
          vercelEnv: 'local',
          urlHost: (() => {
            try {
              return wsUrl ? new URL(wsUrl).host : '';
            } catch {
              return wsUrl || '';
            }
          })(),
          apiKeyConfigured: Boolean(apiKey),
          apiSecretConfigured: Boolean(apiSecret),
          apiKeyPrefix: getKeyPrefix(apiKey),
          apiKeySuffix: getKeySuffix(apiKey),
        });

        if (!wsUrl || !apiKey || !apiSecret) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({
            error: 'LiveKit server environment is not configured.',
            missingEnv: [
              ...(!wsUrl ? ['LIVEKIT_URL'] : []),
              ...(!apiKey ? ['LIVEKIT_API_KEY'] : []),
              ...(!apiSecret ? ['LIVEKIT_API_SECRET'] : []),
            ],
          }));
          return;
        }

        // Read body
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        let body: Record<string, string> = {};
        try {
          const raw = Buffer.concat(chunks).toString('utf8').trim();
          if (raw) body = JSON.parse(raw);
        } catch {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }

        const room = body.room?.trim();
        const username = body.username?.trim();
        if (!room || !username) {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'room and username are required.' }));
          return;
        }

        const identity = body.participantIdentity?.trim()
          || username.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
          || `guest-${Date.now()}`;
        const metadataDetails = safeParseMetadata(body.metadata);
        const issuedAtMs = Date.now();
        const expectedExpirationIso = getExpectedExpirationIso(issuedAtMs, liveKitDefaultTokenTtlSeconds);

        console.info('[LiveKit][vite-dev][getToken] issuing token', {
          timestamp: new Date(issuedAtMs).toISOString(),
          deploymentTarget: 'local-vite-dev',
          nodeEnv: process.env.NODE_ENV || 'development',
          vercelEnv: 'local',
          room,
          participantIdentity: identity,
          participantName: username,
          role: metadataDetails.role,
          classId: metadataDetails.classId,
          userId: metadataDetails.userId,
          metadataJsonValid: metadataDetails.metadataJsonValid,
          urlHost: (() => {
            try {
              return new URL(wsUrl).host;
            } catch {
              return wsUrl;
            }
          })(),
          apiKeyPrefix: getKeyPrefix(apiKey),
          apiKeySuffix: getKeySuffix(apiKey),
          ttl: liveKitDefaultTokenTtlLabel,
          expiresAt: expectedExpirationIso,
        });

        try {
          const { AccessToken } = await import('livekit-server-sdk');
          const token = new AccessToken(apiKey, apiSecret, {
            identity,
            name: username,
            metadata: body.metadata || '',
            ttl: liveKitDefaultTokenTtlLabel,
          });
          token.addGrant({
            roomJoin: true,
            room,
            canPublish: true,
            canSubscribe: true,
            canPublishData: false,
          });

          const jwt = await token.toJwt();
          console.info('[LiveKit][vite-dev][getToken] token issued successfully', {
            timestamp: new Date().toISOString(),
            deploymentTarget: 'local-vite-dev',
            room,
            participantIdentity: identity,
            role: metadataDetails.role,
            ttl: liveKitDefaultTokenTtlLabel,
            expiresAt: expectedExpirationIso,
            tokenLength: jwt.length,
          });

          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({
            token: jwt,
            url: wsUrl,
            room,
            participantIdentity: identity,
            participantName: username,
          }));
        } catch (err) {
          console.error('[dev /api/getToken]', err);
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Token generation failed' }));
        }
      });
    },
  };
}

/**
 * Dev-only Vite plugin that serves /api/tts so local practice audio does not
 * depend on operating-system voices.
 */
function translateTtsDevPlugin(): Plugin {
  return {
    name: 'translate-tts-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/tts' || req.method !== 'POST') {
          return next();
        }

        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }

        let body: { text?: string; langCode?: string; rate?: number } = {};
        try {
          const raw = Buffer.concat(chunks).toString('utf8').trim();
          if (raw) body = JSON.parse(raw);
        } catch {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }

        const text = body.text?.trim() ?? '';
        const langCode = body.langCode?.trim() || 'en-US';
        const rate = Number(body.rate) || 1;

        if (!text) {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'text is required.' }));
          return;
        }

        try {
          const upstream = await fetch(buildTranslateTtsUrl(text, langCode, rate), {
            headers: {
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36 LearnendoTTS/1.0',
            },
          });

          if (!upstream.ok) {
            const details = await upstream.text().catch(() => '');
            res.statusCode = 502;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({
              error: 'Upstream TTS provider failed.',
              status: upstream.status,
              details: details.slice(0, 200),
            }));
            return;
          }

          const audioBuffer = Buffer.from(await upstream.arrayBuffer());
          res.statusCode = 200;
          res.setHeader('content-type', upstream.headers.get('content-type') || 'audio/mpeg');
          res.setHeader('cache-control', 'no-store');
          res.end(audioBuffer);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({
            error: err instanceof Error ? err.message : 'Unable to synthesize audio',
          }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, __dirname, '');
    return {
      base: '/',
      build: {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
          },
        },
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        // Serve /api/getToken locally in dev so vercel dev is not required
        ...(mode !== 'production' ? [livekitTokenDevPlugin(env)] : []),
        ...(mode !== 'production' ? [translateTtsDevPlugin()] : []),
        ...(mode === 'production' ? [
          VitePWA({
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.ts',
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            includeAssets: [
              'favicon.png',
              'apple-touch-icon.png',
              'pwa-192x192.png',
              'pwa-512x512.png',
              'learnendo-logo.png'
            ],
            manifest: {
              id: '/',
              name: 'Learnendo Practice',
              short_name: 'Learnendo',
              description: 'Learnendo English practice workbook.',
              start_url: '/',
              scope: '/',
              display: 'standalone',
              orientation: 'portrait',
              background_color: '#0f172a',
              theme_color: '#0f172a',
              lang: 'en',
              categories: ['education'],
              icons: [
                {
                  src: '/pwa-192x192.png',
                  sizes: '192x192',
                  type: 'image/png'
                },
                {
                  src: '/pwa-512x512.png',
                  sizes: '512x512',
                  type: 'image/png'
                }
              ]
            },
            injectManifest: {
              globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
              maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
            },
            devOptions: {
              enabled: false
            }
          })
        ] : [])
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        include: ['@excalidraw/excalidraw'],
      },
    };
});
