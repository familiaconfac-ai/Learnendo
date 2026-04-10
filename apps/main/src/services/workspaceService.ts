import { doc, onSnapshot, setDoc } from 'firebase/firestore';
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
  updatedAt: number;
  updatedBy: string;
  updatedByName: string;
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
  await setDoc(workspaceRef(classId), {
    items,
    updatedAt: Date.now(),
    updatedBy: uid,
    updatedByName: name,
  });
}
