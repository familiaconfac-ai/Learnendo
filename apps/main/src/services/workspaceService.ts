import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WorkspaceTextStyles {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;       // CSS color, e.g. '#ef4444'
  bgColor?: string;     // CSS background color
  fontSize?: number;    // px
}

export type WorkspaceItemType = 'text' | 'image';

export interface WorkspaceItem {
  id: string;
  type: WorkspaceItemType;
  x: number;          // % of workspace width  (0-100)
  y: number;          // % of workspace height (0-100)
  w: number;          // % of workspace width
  h: number;          // % of workspace height
  // text block
  content?: string;   // raw HTML from contenteditable
  styles?: WorkspaceTextStyles;
  // image block
  imageUrl?: string;  // data-URL or hosted URL
  // metadata
  updatedAt: number;
  updatedBy: string;
  updatedByName: string;
}

export interface WorkspaceDoc {
  items: WorkspaceItem[];
  /** Main shared document HTML content */
  docContent?: string;
  /** Scroll position (0-1) for scroll-sync */
  scrollRatio?: number;
  updatedAt: number;
  updatedBy: string;
  updatedByName: string;
}

/** Save only the main document content (debounced separately from items) */
export async function saveDocContent(
  classId: string,
  docContent: string,
  uid: string,
  name: string,
): Promise<void> {
  if (!db) return;
  const { updateDoc, setDoc } = await import('firebase/firestore');
  try {
    await updateDoc(workspaceRef(classId), {
      docContent,
      updatedAt: Date.now(),
      updatedBy: uid,
      updatedByName: name,
    });
  } catch {
    // Doc doesn't exist yet — create it with merge so we don't wipe items.
    await setDoc(
      workspaceRef(classId),
      { docContent, updatedAt: Date.now(), updatedBy: uid, updatedByName: name },
      { merge: true },
    );
  }
}

/** Persist scroll ratio so students can follow (0-1). */
export async function saveScrollRatio(
  classId: string,
  scrollRatio: number,
): Promise<void> {
  if (!db) return;
  const { updateDoc } = await import('firebase/firestore');
  await updateDoc(workspaceRef(classId), { scrollRatio }).catch(() => {
    // ignore if doc doesn't exist yet
  });
}

// ── Firestore path ────────────────────────────────────────────────────────────

// liveClasses/{classId}/shared/workspace

function workspaceRef(classId: string) {
  return doc(db!, 'liveClasses', classId, 'shared', 'workspace');
}

// ── Subscription ─────────────────────────────────────────────────────────────

export function subscribeWorkspace(
  classId: string,
  callback: (data: WorkspaceDoc | null) => void,
): () => void {
  if (!db) {
    callback(null);
    return () => {};
  }
  return onSnapshot(workspaceRef(classId), (snap) => {
    callback(snap.exists() ? (snap.data() as WorkspaceDoc) : null);
  });
}

// ── Write helpers ─────────────────────────────────────────────────────────────

/** Persist the full workspace document (list of items). */
export async function saveWorkspace(
  classId: string,
  items: WorkspaceItem[],
  uid: string,
  name: string,
): Promise<void> {
  if (!db) return;
  const { updateDoc, setDoc } = await import('firebase/firestore');
  // Use updateDoc to preserve docContent/scrollRatio; fall back to setDoc on first write
  try {
    await updateDoc(workspaceRef(classId), {
      items,
      updatedAt: Date.now(),
      updatedBy: uid,
      updatedByName: name,
    });
  } catch {
    // Doc doesn't exist yet — use merge so we don't wipe docContent/scrollRatio.
    await setDoc(
      workspaceRef(classId),
      { items, updatedAt: Date.now(), updatedBy: uid, updatedByName: name },
      { merge: true },
    );
  }
}
