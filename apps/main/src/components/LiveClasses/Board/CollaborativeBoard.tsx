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
 *
 * Uses userId-based echo detection and merge-based loading so that
 * concurrent edits from teacher and student(s) are preserved.
 */
const DOCUMENT_RECORD_TYPES = new Set(['shape', 'page', 'binding', 'asset']);

const FirestoreSync: React.FC<{ boardId: string; userId: string; readOnly?: boolean }> = ({ boardId, userId, readOnly }) => {
  const editor = useEditor();
  const isRemoteUpdate = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);
  const pendingChanges = useRef<Set<string>>(new Set());

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
          updatedBy: userId,
        }, { merge: true });
        // After successful save, nothing is pending anymore
        pendingChanges.current.clear();
      } catch (err) {
        console.warn('[CollaborativeBoard] save error:', err);
      }
    }, 300);
  }, [editor, classId, readOnly, userId]);

  // ── Listen to local store changes and push to Firestore ──
  useEffect(() => {
    const cleanup = editor.store.listen((entry) => {
      // Track locally changed record IDs so merge preserves them
      const { added, updated, removed } = entry.changes;
      for (const id of Object.keys(added)) pendingChanges.current.add(id);
      for (const id of Object.keys(updated)) pendingChanges.current.add(id);
      for (const id of Object.keys(removed)) pendingChanges.current.add(id);
      saveToFirestore();
    }, { scope: 'document', source: 'user' });

    return cleanup;
  }, [editor, saveToFirestore]);

  // ── Listen to Firestore changes and merge into store ──
  useEffect(() => {
    if (!db) return;
    const docRef = doc(db, 'liveClasses', classId, 'shared', 'tldrawBoard');

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) {
        // No remote data yet; allow saves to proceed
        isFirstLoad.current = false;
        return;
      }
      const data = docSnap.data();
      if (!data?.snapshot) return;

      // Skip our own writes (reliable echo detection by userId)
      if (data.updatedBy === userId) return;

      try {
        const remoteSnapshot = JSON.parse(data.snapshot);

        if (isFirstLoad.current) {
          // First load: full replacement (no local edits to preserve yet)
          isRemoteUpdate.current = true;
          loadSnapshot(editor.store, remoteSnapshot);
          isFirstLoad.current = false;
          setTimeout(() => { isRemoteUpdate.current = false; }, 100);
        } else {
          // Subsequent updates: merge remote changes, preserve pending local edits
          editor.store.mergeRemoteChanges(() => {
            const allRemote = Object.values(remoteSnapshot.store) as any[];
            const docRecords = allRemote.filter((r: any) => DOCUMENT_RECORD_TYPES.has(r.typeName));

            // Apply only records that aren't locally pending
            const toApply = docRecords.filter((r: any) => !pendingChanges.current.has(r.id));
            if (toApply.length > 0) {
              editor.store.put(toApply);
            }

            // Remove shapes deleted remotely (absent from snapshot, not locally pending)
            const remoteDocIds = new Set(docRecords.map((r: any) => r.id));
            const toRemove = editor.store.allRecords()
              .filter(r => DOCUMENT_RECORD_TYPES.has(r.typeName) && !remoteDocIds.has(r.id) && !pendingChanges.current.has(r.id))
              .map(r => r.id);
            if (toRemove.length > 0) {
              editor.store.remove(toRemove);
            }
          });
        }
      } catch (err) {
        console.warn('[CollaborativeBoard] load error:', err);
        isRemoteUpdate.current = false;
      }
    });

    return () => {
      unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [editor, classId, userId]);

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

/** Error boundary so a tldraw crash doesn't white-screen the whole room. */
class BoardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) {
    console.warn('[CollaborativeBoard] tldraw error caught:', error.message);
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

// Componente de lousa colaborativa usando tldraw + Firestore sync
export const CollaborativeBoard: React.FC<CollaborativeBoardProps> = ({ boardId, userId, userName, readOnly }) => {
  return (
    <div className="w-full h-full min-h-[400px] bg-white rounded-2xl overflow-hidden tldraw-compact">
      <style>{`
        /* ── Main toolbar → far bottom-right, scaled down ── */
        .tldraw-compact .tlui-layout__bottom {
          position: absolute;
          bottom: 0;
          right: 0;
          left: auto !important;
          width: auto;
          z-index: 300;
          pointer-events: none;
        }
        .tldraw-compact .tlui-layout__bottom__main {
          justify-content: flex-end;
          pointer-events: all;
          transform: scale(0.62);
          transform-origin: bottom right;
        }
        /* Hide minimap / navigation in compact mode */
        .tldraw-compact .tlui-navigation-panel {
          display: none;
        }
        /* ── Actions menu → top-left, next to hamburger & Page 1 ── */
        .tldraw-compact .tlui-actions-menu {
          position: fixed;
          top: 44px;
          left: 56px;
          z-index: 300;
        }
        /* Hide the help/license badge so it doesn't fight for space */
        .tldraw-compact .tlui-help-menu {
          display: none;
        }
      `}</style>
      <BoardErrorBoundary>
        <Tldraw
          persistenceKey={boardId}
          inferDarkMode={false}
        >
          <FirestoreSync boardId={boardId} userId={userId} readOnly={readOnly} />
          {readOnly && <ReadOnlyEnforcer />}
        </Tldraw>
      </BoardErrorBoundary>
    </div>
  );
};
