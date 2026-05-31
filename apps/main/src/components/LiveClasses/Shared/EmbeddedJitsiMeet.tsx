import React, { useEffect, useMemo, useRef, useState } from 'react';

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: Record<string, unknown>,
    ) => {
      addListener: (event: string, listener: (...args: any[]) => void) => void;
      removeListener: (event: string, listener: (...args: any[]) => void) => void;
      executeCommand: (command: string, ...args: any[]) => void;
      dispose: () => void;
    };
  }
}

interface EmbeddedJitsiMeetProps {
  roomName: string;
  displayName: string;
  email?: string | null;
  visible: boolean;
  onError?: (message: string | null) => void;
}

const JITSI_DOMAIN = 'meet.jit.si';
const JITSI_EXTERNAL_API_URL = `https://${JITSI_DOMAIN}/external_api.js`;

let jitsiScriptPromise: Promise<void> | null = null;

function ensureJitsiScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window-not-available'));
  }

  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve();
  }

  if (jitsiScriptPromise) {
    return jitsiScriptPromise;
  }

  jitsiScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${JITSI_EXTERNAL_API_URL}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('jitsi-script-load-failed')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = JITSI_EXTERNAL_API_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('jitsi-script-load-failed'));
    document.head.appendChild(script);
  });

  return jitsiScriptPromise;
}

export const EmbeddedJitsiMeet: React.FC<EmbeddedJitsiMeetProps> = ({
  roomName,
  displayName,
  email,
  visible,
  onError,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<{
    addListener: (event: string, listener: (...args: any[]) => void) => void;
    removeListener: (event: string, listener: (...args: any[]) => void) => void;
    executeCommand: (command: string, ...args: any[]) => void;
    dispose: () => void;
  } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const fallbackLink = useMemo(
    () => `https://${JITSI_DOMAIN}/${encodeURIComponent(roomName)}`,
    [roomName],
  );

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        setStatus('loading');
        onError?.(null);
        await ensureJitsiScript();

        if (cancelled || !hostRef.current || !window.JitsiMeetExternalAPI) {
          return;
        }

        hostRef.current.innerHTML = '';

        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: hostRef.current,
          width: '100%',
          height: '100%',
          lang: 'pt',
          userInfo: {
            displayName,
            email: email ?? undefined,
          },
          configOverwrite: {
            prejoinPageEnabled: false,
            startWithAudioMuted: false,
            startWithVideoMuted: true,
            disableDeepLinking: true,
            hideConferenceSubject: true,
            toolbarButtons: [
              'microphone',
              'camera',
              'desktop',
              'participants-pane',
              'chat',
              'settings',
              'tileview',
              'hangup',
            ],
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
            TILE_VIEW_MAX_COLUMNS: 2,
            VIDEO_LAYOUT_FIT: 'nocrop',
          },
        });

        const handleJoined = () => {
          if (cancelled) return;
          setStatus('ready');
          onError?.(null);
          api.executeCommand('setTileView', true);
        };

        const handleReadyToClose = () => {
          if (cancelled) return;
          setStatus('loading');
        };

        api.addListener('videoConferenceJoined', handleJoined);
        api.addListener('readyToClose', handleReadyToClose);
        apiRef.current = api;
      } catch (error) {
        if (cancelled) return;
        console.error('[EmbeddedJitsiMeet] failed to initialize', error);
        setStatus('error');
        onError?.('Nao foi possivel iniciar a sala embutida do Jitsi.');
      }
    };

    void setup();

    return () => {
      cancelled = true;
      const activeApi = apiRef.current;
      apiRef.current = null;
      try {
        activeApi?.dispose();
      } catch (error) {
        console.warn('[EmbeddedJitsiMeet] dispose failed', error);
      }
    };
  }, [displayName, email, onError, roomName]);

  return (
    <div className={`absolute inset-0 ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} transition-opacity`}>
      <div ref={hostRef} className="h-full w-full bg-black" />

      {status !== 'ready' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/90 px-5 py-4 text-center shadow-2xl">
            <div className="text-sm font-black uppercase tracking-[0.18em] text-cyan-300">
              {status === 'error' ? 'Jitsi indisponivel' : 'Conectando Jitsi'}
            </div>
            <p className="mt-2 text-sm text-slate-200">
              {status === 'error'
                ? 'Use o Meet como plano B se a sala embutida nao abrir.'
                : 'Preparando audio ao vivo e compartilhamento de tela.'}
            </p>
            {status === 'error' ? (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-slate-400">{fallbackLink}</p>
                <button
                  type="button"
                  onClick={() => window.open(fallbackLink, '_blank', 'noopener,noreferrer')}
                  className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-cyan-400"
                >
                  Abrir Jitsi em nova aba
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
