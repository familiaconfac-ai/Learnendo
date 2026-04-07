import React, { useCallback, useEffect, useRef } from 'react';
import { Tldraw, useEditor, getSnapshot, loadSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';
import { db } from '../../../services/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

interface CollaborativeBoardProps {
  boardId: string;
  userId: string;
  userName: string;
  readOnly?: boolean;
}

/**
 * Inner component that runs inside <Tldraw> so useEditor() has context.
 * Syncs the tldraw store to/from Firestore in real time via
 * liveClasses/{classId}/shared/tldrawBoard.
 */
const FirestoreSync: React.FC<{ boardId: string; readOnly?: boolean }> = ({ boardId, readOnly }) => {
  const editor = useEditor();
  const isRemoteUpdate = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Strip the "class-" prefix to get the actual classId for Firestore path
  const classId = boardId.startsWith('class-') ? boardId.slice(6) : boardId;

  // ── Save local changes to Firestore (debounced) ──
  const saveToFirestore = useCallback(() => {
    if (readOnly) return;
    if (isRemoteUpdate.current) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        if (!db) return;
        const snapshot = getSnapshot(editor.store);
        const docRef = doc(db, 'liveClasses', classId, 'shared', 'tldrawBoard');
        await setDoc(docRef, {
          snapshot: JSON.stringify(snapshot),
          updatedAt: Date.now(),
        }, { merge: true });
      } catch (err) {
        console.warn('[CollaborativeBoard] save error:', err);
      }
    }, 300);
  }, [editor, classId, readOnly]);

  // ── Listen to local store changes and push to Firestore ──
  useEffect(() => {
    const cleanup = editor.store.listen(() => {
      saveToFirestore();
    }, { scope: 'document', source: 'user' });

    return cleanup;
  }, [editor, saveToFirestore]);

  // ── Listen to Firestore changes and load into store ──
  useEffect(() => {
    if (!db) return;
    const docRef = doc(db, 'liveClasses', classId, 'shared', 'tldrawBoard');

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      if (!data?.snapshot) return;

      try {
        const remoteSnapshot = JSON.parse(data.snapshot);
        // Avoid echo: mark as remote update so saveToFirestore is skipped
        isRemoteUpdate.current = true;
        loadSnapshot(editor.store, remoteSnapshot);
        // Small delay before re-enabling local saves to avoid feedback loop
        setTimeout(() => { isRemoteUpdate.current = false; }, 100);
      } catch (err) {
        console.warn('[CollaborativeBoard] load error:', err);
        isRemoteUpdate.current = false;
      }
    });

    return unsubscribe;
  }, [editor, classId]);

  return null;
};

/**
 * Enforces readonly mode on the tldraw editor when the board is locked.
 * Must be rendered inside <Tldraw>.
 */
const ReadOnlyEnforcer: React.FC = () => {
  const editor = useEditor();
  useEffect(() => {
    editor.updateInstanceState({ isReadonly: true });
    return () => {
      editor.updateInstanceState({ isReadonly: false });
    };
  }, [editor]);
  return null;
};

// Componente de lousa colaborativa usando tldraw + Firestore sync
export const CollaborativeBoard: React.FC<CollaborativeBoardProps> = ({ boardId, userId, userName, readOnly }) => {
  return (
    <div className="w-full h-full min-h-[400px] bg-white rounded-2xl overflow-hidden">
      <Tldraw
        persistenceKey={boardId}
        inferDarkMode={false}
      >
        <FirestoreSync boardId={boardId} readOnly={readOnly} />
        {readOnly && <ReadOnlyEnforcer />}
      </Tldraw>
    </div>
  );
};
