import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/** Shape of liveClasses/{classId}/shared/editor */
export interface EditorDoc {
  html: string;
  updatedAt: number;
  updatedBy: string;
  updatedByName: string;
}

function editorDocRef(classId: string) {
  return doc(db!, 'liveClasses', classId, 'shared', 'editor');
}

/**
 * Subscribe to the shared editor document for a live class.
 * Calls `callback` with null when no document exists yet.
 * Returns an unsubscribe function.
 */
export function subscribeEditorDoc(
  classId: string,
  callback: (data: EditorDoc | null) => void,
): () => void {
  if (!db) {
    callback(null);
    return () => {};
  }
  return onSnapshot(editorDocRef(classId), (snap) => {
    callback(snap.exists() ? (snap.data() as EditorDoc) : null);
  });
}

/**
 * Persist the current editor HTML to Firestore.
 * Uses setDoc (full replace) — safe because the whole doc is just html + metadata.
 */
export async function saveEditorContent(
  classId: string,
  html: string,
  uid: string,
  name: string,
): Promise<void> {
  if (!db) return;
  await setDoc(editorDocRef(classId), {
    html,
    updatedAt: Date.now(),
    updatedBy: uid,
    updatedByName: name,
  });
}
