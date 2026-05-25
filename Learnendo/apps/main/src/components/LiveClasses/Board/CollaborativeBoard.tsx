/**
 * CollaborativeBoard — Excalidraw OSS edition
 *
 * Drop-in replacement for the previous tldraw-based component.
 * Public props interface is unchanged so TeacherRoomView and StudentRoomView
 * require no edits.
 *
 * Persistence is delegated to whiteboardAdapter (Firestore) using the same
 * document path as before.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { saveScene, subscribeToScene } from './whiteboardAdapter';

export interface CollaborativeBoardProps {
  boardId: string;
  userId: string;
  userName: string;
  readOnly?: boolean;
  /**
   * When true, hides the Excalidraw main-menu and footer controls.
   * Used for the student view so the board feels like a plain canvas.
   */
  hideChrome?: boolean;
}

/** Error boundary so an Excalidraw crash doesn't white-screen the whole room. */
class BoardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) {
    console.warn('[CollaborativeBoard] Excalidraw error caught:', error.message);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 rounded-2xl gap-2">
          <span className="text-slate-500 text-sm">Erro ao carregar a lousa.</span>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-sm text-blue-500 underline"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * CollaborativeBoard — Excalidraw + Firestore real-time sync.
 *
 * Sync strategy (mirrors the previous tldraw approach):
 *  1. On mount, subscribe to the Firestore document via whiteboardAdapter.
 *  2. When the first snapshot arrives (or the doc is missing) mark isHydrated.
 *  3. If the Excalidraw API is already available, apply remote elements via
 *     updateScene(); otherwise queue them in pendingScene and apply in the
 *     excalidrawAPI callback — removing the API-vs-snapshot race condition.
 *  4. On every user-driven onChange, debounce a Firestore write (300 ms).
 *     Remote updates set isRemoteUpdate while active to prevent echo saves.
 */
export const CollaborativeBoard: React.FC<CollaborativeBoardProps> = ({
  boardId,
  userId,
  readOnly,
  hideChrome,
}) => {
  // ── Refs ──────────────────────────────────────────────────────────────────
  const excalidrawAPI = useRef<ExcalidrawImperativeAPI | null>(null);
  const isHydrated = useRef(false);
  const pendingScene = useRef<ExcalidrawElement[] | null>(null);
  const isRemoteUpdate = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Each mount gets a unique clientId so that a participant's own Firestore
   * write is not replayed back to them (even across multiple browser tabs of
   * the same account).
   */
  const clientId = useRef(
    `${userId}:${Math.random().toString(36).slice(2, 10)}`,
  ).current;

  // ── Firestore subscription ────────────────────────────────────────────────
  useEffect(() => {
    const adapterOptions = { boardId, userId, clientId };

    const unsubscribe = subscribeToScene(
      adapterOptions,
      // onScene — called for every remote delta from a different client
      (elements) => {
        if (excalidrawAPI.current && isHydrated.current) {
          isRemoteUpdate.current = true;
          excalidrawAPI.current.updateScene({ elements });
          setTimeout(() => { isRemoteUpdate.current = false; }, 100);
        } else {
          // API not ready yet; buffer and apply once it is
          pendingScene.current = elements;
        }
      },
      // onHydrated — called after the first snapshot (even if empty)
      () => {
        isHydrated.current = true;
        if (pendingScene.current === null) {
          // Nothing queued — API may or may not be ready; that's fine,
          // subsequent saves will start flowing after the first user edit.
        }
      },
    );

    return () => {
      unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [boardId, userId, clientId]);

  // ── Excalidraw API callback ───────────────────────────────────────────────
  const handleAPI = useCallback((api: ExcalidrawImperativeAPI) => {
    excalidrawAPI.current = api;
    // Apply any scene that arrived from Firestore before the API was ready
    if (pendingScene.current !== null) {
      const elements = pendingScene.current;
      pendingScene.current = null;
      isRemoteUpdate.current = true;
      api.updateScene({ elements });
      isHydrated.current = true;
      setTimeout(() => { isRemoteUpdate.current = false; }, 100);
    } else {
      // No pending scene; mark hydrated if subscribeToScene hasn't already
      isHydrated.current = true;
    }
  }, []);

  // ── onChange — debounced save to Firestore ────────────────────────────────
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], _appState: AppState, _files: BinaryFiles) => {
      if (readOnly || isRemoteUpdate.current || !isHydrated.current) return;

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        saveScene({ boardId, userId, clientId }, elements).catch((err) => {
          console.warn('[CollaborativeBoard] save error:', err);
        });
      }, 300);
    },
    [boardId, readOnly, userId, clientId],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  const wrapperClass = [
    'w-full h-full min-h-[400px] bg-white rounded-2xl overflow-hidden excalidraw-board',
    hideChrome ? 'excalidraw-hide-chrome' : '',
  ].join(' ');

  return (
    <div className={wrapperClass}>
      {/* Scoped styles — hide Excalidraw chrome for the student view */}
      <style>{`
        /* Student: hide main menu button and footer */
        .excalidraw-hide-chrome .main-menu-trigger {
          display: none !important;
        }
        .excalidraw-hide-chrome footer,
        .excalidraw-hide-chrome .App-footer {
          display: none !important;
        }
        /* Compact: scale down the toolbar in embedded contexts */
        .excalidraw-board .App-toolbar {
          transform: scale(0.85);
          transform-origin: bottom center;
        }
      `}</style>
      <BoardErrorBoundary>
        <Excalidraw
          excalidrawAPI={handleAPI}
          onChange={handleChange}
          viewModeEnabled={readOnly}
          theme="light"
          UIOptions={{
            canvasActions: {
              export: false,
              saveToActiveFile: false,
              loadScene: false,
              toggleTheme: false,
            },
          }}
        />
      </BoardErrorBoundary>
    </div>
  );
};
