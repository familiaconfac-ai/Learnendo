import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

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

        try {
          const { AccessToken } = await import('livekit-server-sdk');
          const token = new AccessToken(apiKey, apiSecret, {
            identity,
            name: username,
            metadata: body.metadata || '',
          });
          token.addGrant({
            roomJoin: true,
            room,
            canPublish: true,
            canSubscribe: true,
          });

          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({
            token: await token.toJwt(),
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

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, __dirname, '');
    return {
      base: '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        // Serve /api/getToken locally in dev so vercel dev is not required
        ...(mode !== 'production' ? [livekitTokenDevPlugin(env)] : []),
        ...(mode === 'production' ? [
          VitePWA({
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
            workbox: {
              cleanupOutdatedCaches: true,
              globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
              maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
            },
            devOptions: {
              enabled: false
            }
          })
        ] : [])
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
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
