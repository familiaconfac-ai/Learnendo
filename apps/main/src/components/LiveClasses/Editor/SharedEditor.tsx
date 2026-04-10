import React, { useRef, useEffect, useCallback } from 'react';
import { subscribeEditorDoc, saveEditorContent } from '../../../services/editorService';

interface SharedEditorProps {
  classId: string;
  userId: string;
  userName: string;
  /** When true the user can only read — no toolbar, no editing. */
  readOnly?: boolean;
}

const Divider = () => <div className="w-px h-5 bg-slate-300 mx-0.5 flex-shrink-0" />;

const ToolbarBtn: React.FC<{
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, title, children }) => (
  <button
    type="button"
    onMouseDown={(e) => {
      // Prevent blur so the selection is kept when toolbar is clicked
      e.preventDefault();
      onClick();
    }}
    title={title}
    className="px-2 py-1 rounded text-sm font-semibold select-none transition-colors text-slate-600 hover:bg-slate-200 hover:text-slate-900 active:bg-slate-300"
  >
    {children}
  </button>
);

/**
 * Collaborative rich-text editor panel backed by Firestore.
 *
 * Sync strategy (last-write-wins, cursor-safe):
 *  - Own writes are debounced 600 ms then saved to Firestore.
 *  - Remote updates are applied only while the editor is NOT focused,
 *    preventing cursor jumps during active typing.
 *  - The very first snapshot is always applied so the editor loads
 *    existing content on mount.
 */
export const SharedEditor: React.FC<SharedEditorProps> = ({
  classId,
  userId,
  userName,
  readOnly = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Firestore subscription ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeEditorDoc(classId, (data) => {
      const el = editorRef.current;
      if (!el) return;

      // First load: always apply content, even if editor is focused
      if (!initialLoadDoneRef.current) {
        initialLoadDoneRef.current = true;
        if (data?.html) el.innerHTML = data.html;
        return;
      }

      // Own write echoed back — skip to avoid cursor reset
      if (data?.updatedBy === userId) return;

      // Someone else's update — only apply when user is not actively typing
      if (isFocusedRef.current) return;

      if (data !== null && data.html !== undefined) {
        el.innerHTML = data.html;
      }
    });
    return unsub;
  }, [classId, userId]);

  // ── Debounced Firestore save ──────────────────────────────────────────────
  const pushUpdate = useCallback(() => {
    if (!editorRef.current || readOnly) return;
    const html = editorRef.current.innerHTML;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveEditorContent(classId, html, userId, userName).catch((err) =>
        console.error('[SharedEditor] save failed:', err),
      );
    }, 600);
  }, [classId, userId, userName, readOnly]);

  // ── Toolbar command helper ────────────────────────────────────────────────
  const exec = useCallback(
    (cmd: string, value?: string) => {
      if (readOnly) return;
      // execCommand is deprecated but still universally supported and is the
      // simplest approach for a basic WYSIWYG without a full editor library.
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      document.execCommand(cmd, false, value);
      editorRef.current?.focus();
      pushUpdate();
    },
    [pushUpdate, readOnly],
  );

  return (
    <div className="flex flex-col w-full h-full bg-white select-auto">
      {/* ── Toolbar ── */}
      {!readOnly && (
        <div className="flex-shrink-0 flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-200">
          {/* Text style */}
          <ToolbarBtn onClick={() => exec('bold')} title="Negrito (Ctrl+B)">
            <strong>B</strong>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec('italic')} title="Itálico (Ctrl+I)">
            <em>I</em>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec('underline')} title="Sublinhado (Ctrl+U)">
            <span className="underline">U</span>
          </ToolbarBtn>

          <Divider />

          {/* Headings */}
          <ToolbarBtn onClick={() => exec('formatBlock', 'h2')} title="Título">
            H2
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec('formatBlock', 'p')} title="Parágrafo">
            ¶
          </ToolbarBtn>

          <Divider />

          {/* Lists */}
          <ToolbarBtn onClick={() => exec('insertUnorderedList')} title="Lista com marcadores">
            • ≡
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec('insertOrderedList')} title="Lista numerada">
            1 ≡
          </ToolbarBtn>

          <Divider />

          {/* Undo / Redo */}
          <ToolbarBtn onClick={() => exec('undo')} title="Desfazer (Ctrl+Z)">
            ↩
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec('redo')} title="Refazer (Ctrl+Shift+Z)">
            ↪
          </ToolbarBtn>

          <Divider />

          {/* Clear formatting */}
          <ToolbarBtn onClick={() => exec('removeFormat')} title="Limpar formatação">
            <span className="line-through opacity-60">T</span>x
          </ToolbarBtn>

          {/* Clear all content */}
          <ToolbarBtn
            onClick={() => {
              if (!editorRef.current) return;
              if (!window.confirm('Limpar todo o conteúdo do editor?')) return;
              editorRef.current.innerHTML = '';
              pushUpdate();
            }}
            title="Limpar tudo"
          >
            🗑
          </ToolbarBtn>
        </div>
      )}

      {/* ── Editable area ── */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={pushUpdate}
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        onBlur={() => {
          isFocusedRef.current = false;
          // Flush any pending debounce on blur
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
          }
          pushUpdate();
        }}
        suppressContentEditableWarning
        spellCheck
        data-placeholder={
          readOnly ? 'Aguardando conteúdo do professor…' : 'Comece a digitar aqui…'
        }
        className={[
          'flex-1 min-h-0 overflow-y-auto',
          'px-4 py-4 sm:px-8 sm:py-6',
          'focus:outline-none',
          'text-base leading-relaxed text-slate-900',
          // List indentation
          '[&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6',
          '[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6',
          // Headings
          '[&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-3 [&>h2]:mb-1',
          '[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1',
          readOnly ? 'cursor-default' : 'cursor-text',
        ].join(' ')}
      />

      {/* Placeholder CSS (cannot be done with Tailwind alone on contenteditable) */}
      <style>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
          display: block;
        }
      `}</style>
    </div>
  );
};
