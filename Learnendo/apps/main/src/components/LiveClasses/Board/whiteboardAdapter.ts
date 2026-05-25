/**
 * WhiteboardAdapter
 *
 * Abstraction layer between the collaborative whiteboard UI (Excalidraw) and
 * the underlying persistence / sync mechanism (Firestore).
 *
 * Responsibilities:
 *  - saveScene   – persist the current Excalidraw elements to Firestore
 *  - subscribeToScene – listen for remote scene changes (returns unsubscribe fn)
 *  - clearScene  – wipe the remote scene
 *
 * The Firestore document path is kept identical to the previous tldraw
 * implementation (`liveClasses/{classId}/shared/tldrawBoard`) so that any
 * existing session data is not orphaned. New records written by this adapter
 * use the `excalidrawElements` field; old `snapshot` fields are simply ignored.
 */

import { db } from '../../../services/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

// ── Firestore document path (unchanged from tldraw era) ─────────────────────
const BOARD_COLLECTION = 'tldrawBoard' as const;

/** Strip the 'class-' prefix that callers pass in boardId. */
export function getClassId(boardId: string): string {
  return boardId.startsWith('class-') ? boardId.slice(6) : boardId;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface WhiteboardAdapterOptions {
  boardId: string;
  userId: string;
  /** Opaque per-session string used for echo prevention. */
  clientId: string;
}

/**
 * Save the current scene elements to Firestore (fire-and-forget, caller should
 * debounce).
 */
export async function saveScene(
  options: WhiteboardAdapterOptions,
  elements: readonly ExcalidrawElement[],
): Promise<void> {
  if (!db) return;
  const classId = getClassId(options.boardId);
  const docRef = doc(db, 'liveClasses', classId, 'shared', BOARD_COLLECTION);
  await setDoc(
    docRef,
    {
      excalidrawElements: JSON.stringify(elements),
      version: 2,
      updatedAt: Date.now(),
      updatedBy: options.userId,
      updatedByClientId: options.clientId,
    },
    { merge: true },
  );
}

/**
 * Subscribe to remote scene changes.
 * The `onScene` callback is invoked for every remote write by a *different*
 * client; own writes are filtered out via `clientId`.
 * Returns an unsubscribe function.
 */
export function subscribeToScene(
  options: WhiteboardAdapterOptions,
  onScene: (elements: ExcalidrawElement[]) => void,
  onHydrated: () => void,
): () => void {
  if (!db) {
    // Offline / db unavailable — mark hydrated immediately
    onHydrated();
    return () => {};
  }

  const classId = getClassId(options.boardId);
  const docRef = doc(db, 'liveClasses', classId, 'shared', BOARD_COLLECTION);

  const unsubscribe = onSnapshot(docRef, (snap) => {
    if (!snap.exists()) {
      onHydrated();
      return;
    }

    const data = snap.data();

    // Skip own writes (echo prevention)
    if (data?.updatedByClientId === options.clientId) {
      onHydrated();
      return;
    }

    // Parse Excalidraw scene
    if (data?.excalidrawElements) {
      try {
        const elements = JSON.parse(data.excalidrawElements) as ExcalidrawElement[];
        onScene(elements);
        onHydrated();
      } catch (err) {
        console.warn('[WhiteboardAdapter] parse error:', err);
        onHydrated();
      }
    } else {
      // Doc exists but has no Excalidraw data (legacy tldraw-only doc)
      onHydrated();
    }
  });

  return unsubscribe;
}

/**
 * Wipe the remote scene (writes an empty elements array).
 */
export async function clearScene(boardId: string, userId: string): Promise<void> {
  if (!db) return;
  const classId = getClassId(boardId);
  const docRef = doc(db, 'liveClasses', classId, 'shared', BOARD_COLLECTION);
  await setDoc(
    docRef,
    {
      excalidrawElements: JSON.stringify([]),
      version: 2,
      updatedAt: Date.now(),
      updatedBy: userId,
      clearedAt: Date.now(),
    },
    { merge: true },
  );
}
