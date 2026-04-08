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
  /** When true, hides all tldraw chrome (menus, page controls, etc.). Shows only the basic toolbar when not readOnly. */
  hideChrome?: boolean;
}

/**
 * Inner component that runs inside <Tldraw> so useEditor() has context.
 * Syncs the tldraw store to/from Firestore in real time via
 * liveClasses/{classId}/shared/tldrawBoard.
 *
 * Uses client-based echo detection so a participant never reloads its own save,
 * but every remote save is applied immediately to the board.
 */
const DOCUMENT_RECORD_TYPES = new Set(['shape', 'page', 'binding', 'asset']);

const FirestoreSync: React.FC<{ boardId: string; userId: string; readOnly?: boolean }> = ({ boardId, userId, readOnly }) => {
  const editor = useEditor();
  const isRemoteUpdate = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHydratedFromFirestore = useRef(false);
  const clientId = useRef(`${userId}:${Math.random().toString(36).slice(2, 10)}`).current;

  // Strip the "class-" prefix to get the actual classId for Firestore path
  const classId = boardId.startsWith('class-') ? boardId.slice(6) : boardId;

  // ── Save local changes to Firestore (debounced) ──
  const saveToFirestore = useCallback(() => {
    if (readOnly) return;
    if (isRemoteUpdate.current) return;
    if (!hasHydratedFromFirestore.current) return;
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
          updatedByUid: userId,
          updatedByClientId: clientId,
        }, { merge: true });
      } catch (err) {
        console.warn('[CollaborativeBoard] save error:', err);
      }
    }, 300);
  }, [clientId, editor, classId, readOnly, userId]);

  // ── Listen to local store changes and push to Firestore ──
  useEffect(() => {
    if (readOnly) {
      return () => {};
    }

    const cleanup = editor.store.listen(() => {
      saveToFirestore();
    }, { scope: 'document', source: 'user' });

    return cleanup;
  }, [editor, readOnly, saveToFirestore]);

  // ── Listen to Firestore changes and merge into store ──
  useEffect(() => {
    if (!db) return;
    const docRef = doc(db, 'liveClasses', classId, 'shared', 'tldrawBoard');

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) {
        // No remote data yet; allow saves from this point on.
        hasHydratedFromFirestore.current = true;
        return;
      }
      const data = docSnap.data();
      if (!data?.snapshot) {
        hasHydratedFromFirestore.current = true;
        return;
      }

      // Skip our own writes by client id so multiple tabs from the same account still sync.
      if (data.updatedByClientId === clientId) {
        hasHydratedFromFirestore.current = true;
        return;
      }

      try {
        const remoteSnapshot = JSON.parse(data.snapshot);
        isRemoteUpdate.current = true;
        editor.store.mergeRemoteChanges(() => {
          loadSnapshot(editor.store, remoteSnapshot);
        });
        hasHydratedFromFirestore.current = true;
        setTimeout(() => { isRemoteUpdate.current = false; }, 100);
      } catch (err) {
        console.warn('[CollaborativeBoard] load error:', err);
        hasHydratedFromFirestore.current = true;
        isRemoteUpdate.current = false;
      }
    });

    return () => {
      unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [clientId, editor, classId, readOnly]);

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
export const CollaborativeBoard: React.FC<CollaborativeBoardProps> = ({ boardId, userId, userName, readOnly, hideChrome }) => {
  const wrapperClass = [
    'w-full h-full min-h-[400px] bg-white rounded-2xl overflow-hidden tldraw-compact',
    hideChrome ? 'tldraw-hide-chrome' : '',
    hideChrome && readOnly ? 'tldraw-view-only' : '',
  ].join(' ');

  return (
    <div className={wrapperClass}>
      <style>{`
        /* ── Teacher / shared compact styles ── */
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
        .tldraw-compact .tlui-navigation-panel {
          display: none;
        }
        .tldraw-compact .tlui-actions-menu {
          position: fixed;
          top: 44px;
          left: 56px;
          z-index: 300;
        }
        .tldraw-compact .tlui-help-menu {
          display: none;
        }

        /* ── Student: always hide top chrome (hamburger, Page 1, etc.) ── */
        .tldraw-hide-chrome .tlui-layout__top {
          display: none !important;
        }
        .tldraw-hide-chrome .tlui-actions-menu {
          display: none !important;
        }

        /* ── Student locked (view-only): hide ALL controls ── */
        .tldraw-view-only .tlui-layout__bottom {
          display: none !important;
        }
      `}</style>
      <BoardErrorBoundary>
        <Tldraw inferDarkMode={false}>
          <FirestoreSync boardId={boardId} userId={userId} readOnly={readOnly} />
          {readOnly && <ReadOnlyEnforcer />}
        </Tldraw>
      </BoardErrorBoundary>
    </div>
  );
};
