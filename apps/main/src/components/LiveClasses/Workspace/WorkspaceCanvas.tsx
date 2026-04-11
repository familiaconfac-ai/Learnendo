/**
 * WorkspaceCanvas — collaborative document editor for live classes.
 *
 * Layout:
 *   ┌──────────────────── fixed toolbar ────────────────────┐
 *   │  font | size | B I U | align | color | tools | export │
 *   ├────────────────────────────────────────────────────────┤
 *   │  scrollable area                                       │
 *   │   ┌──── main document (contenteditable) ────────────┐  │
 *   │   │  type directly here                             │  │
 *   │   └─────────────────────────────────────────────────┘  │
 *   │   floating blocks (text boxes / images) overlay doc   │
 *   └────────────────────────────────────────────────────────┘
 */
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  PointerEvent as ReactPointerEvent,
} from 'react';
import {
  subscribeWorkspace,
  saveWorkspace,
  saveDocContent,
  saveScrollRatio,
  savePageSwitch,
  normalizeWorkspacePages,
  WorkspaceItem,
  WorkspaceItemType,
  WorkspacePage,
} from '../../../services/workspaceService';
import {
  saveWorkspaceAsMaterial,
  loadMaterialToWorkspace,
  getMaterialsByUser,
  WorkspaceMaterial,
} from '../../../services/materialsService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ── Config ─────────────────────────────────────────────────────────────────────

const FONT_FAMILIES = [
  { label: 'Arial', v: 'Arial, sans-serif' },
  { label: 'Verdana', v: 'Verdana, sans-serif' },
  { label: 'Georgia', v: 'Georgia, serif' },
  { label: 'Times New Roman', v: "'Times New Roman', serif" },
  { label: 'Courier New', v: "'Courier New', monospace" },
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48];

const TEXT_COLORS = [
  { label: 'Preto', v: '#000000' },
  { label: 'Cinza escuro', v: '#374151' },
  { label: 'Cinza', v: '#6b7280' },
  { label: 'Branco', v: '#ffffff' },
  { label: 'Vermelho', v: '#dc2626' },
  { label: 'Laranja', v: '#ea580c' },
  { label: 'Amarelo escuro', v: '#ca8a04' },
  { label: 'Verde', v: '#16a34a' },
  { label: 'Azul', v: '#2563eb' },
  { label: 'Roxo', v: '#7c3aed' },
];

const BG_COLORS = [
  { label: 'Sem fundo', v: '' },
  { label: 'Branco', v: '#ffffff' },
  { label: 'Preto', v: '#0f172a' },
  { label: 'Azul escuro', v: '#1e3a5f' },
  { label: 'Verde escuro', v: '#14532d' },
  { label: 'Vermelho escuro', v: '#7f1d1d' },
  { label: 'Cinza escuro', v: '#1e293b' },
  { label: 'Amarelo claro', v: '#fef9c3' },
  { label: 'Azul claro', v: '#dbeafe' },
  { label: 'Verde claro', v: '#dcfce7' },
  { label: 'Rosa', v: '#fce7f3' },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface DragState {
  itemId: string;
  mode: 'move' | 'resize';
  startPx: number;
  startPy: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
}

export interface WorkspaceCanvasProps {
  classId: string;
  userId: string;
  userName: string;
  readOnly?: boolean;
}

// ── ColorSwatch popover ───────────────────────────────────────────────────────

const ColorSwatch: React.FC<{
  colors: { label: string; v: string }[];
  current: string;
  onPick: (v: string) => void;
  label: string;
}> = ({ colors, current, onPick, label }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const display = colors.find(c => c.v === current)?.v ?? current;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o); }}
        className="flex items-center gap-0.5 px-1.5 py-1 rounded hover:bg-slate-100 border border-slate-200 text-xs text-slate-600"
        title={label}
      >
        <span
          className="inline-block w-3.5 h-3.5 rounded-sm border border-slate-300 flex-shrink-0"
          style={{
            background: display || 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 8px 8px',
          }}
        />
        <svg className="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z"/></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-2 grid grid-cols-5 gap-1" style={{ width: '9rem' }}>
          {colors.map((c) => (
            <button
              key={c.v + c.label}
              onMouseDown={(e) => { e.preventDefault(); onPick(c.v); setOpen(false); }}
              title={c.label}
              style={{
                background: c.v || 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 8px 8px',
                border: c.v === current ? '2px solid #2563eb' : '1px solid #cbd5e1',
              }}
              className="w-6 h-6 rounded transition hover:scale-110"
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── PageTab ────────────────────────────────────────────────────────────────────

interface PageTabProps {
  page: WorkspacePage;
  isActive: boolean;
  readOnly: boolean;
  canDelete: boolean;
  onActivate: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const PageTab: React.FC<PageTabProps> = ({
  page, isActive, readOnly, canDelete, onActivate, onRename, onDuplicate, onDelete,
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Used to show the ⋯ button on hover for inactive tabs
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startEdit = () => {
    if (readOnly) return;
    // Switch to this tab first so the rename is visible immediately
    if (!isActive) onActivate();
    setEditValue(page.name);
    setEditing(true);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== page.name) onRename(trimmed);
    setEditing(false);
  };

  // Three-dot button is always present for the teacher but:
  //   - active tab: always visible
  //   - inactive tab: only visible on hover (opacity trick)
  const showMenuBtn = !readOnly && (isActive || hovered || menuOpen);

  return (
    <div
      className={`relative flex items-center flex-shrink-0 border-b-2 select-none transition-colors ${
        isActive
          ? 'bg-white border-blue-500'
          : 'bg-slate-50 border-transparent hover:bg-slate-100 cursor-pointer'
      }`}
      onClick={() => { if (!isActive) onActivate(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { if (!menuOpen) setHovered(false); }}
      style={{ minWidth: '5rem', maxWidth: '10rem' }}
    >
      {/* Page name / inline rename input */}
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') setEditing(false);
            e.stopPropagation();
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full mx-1 px-1 py-0 text-xs border border-blue-400 rounded focus:outline-none bg-white text-slate-800"
          autoFocus
        />
      ) : (
        <span
          className={`flex-1 truncate px-2 py-1 text-xs ${isActive ? 'text-blue-700 font-medium' : 'text-slate-500'}`}
          onDoubleClick={(e) => { e.stopPropagation(); startEdit(); }}
          title={page.name}
        >
          {page.name}
        </span>
      )}

      {/* Three-dot context menu — visible on any tab for the teacher */}
      {!readOnly && (
        <div
          ref={menuRef}
          className={`relative flex-shrink-0 transition-opacity ${showMenuBtn ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            className="flex items-center justify-center w-5 h-6 mx-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
            title="Opções da página"
          >
            <svg viewBox="0 0 4 14" className="w-1 h-3.5" fill="currentColor">
              <circle cx="2" cy="2" r="1.5"/><circle cx="2" cy="7" r="1.5"/><circle cx="2" cy="12" r="1.5"/>
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute top-full left-0 mt-0.5 z-50 bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-[8rem]">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); startEdit(); }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><path d="M11 2l3 3-8 8H3v-3l8-8z"/></svg>
                Renomear
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDuplicate(); }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><rect x="5" y="5" width="9" height="9" rx="1"/><path d="M2 11V2h9"/></svg>
                Duplicar
              </button>
              {canDelete && (
                <>
                  <div className="h-px bg-slate-100 my-0.5" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                  >
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M4 4l1 9h6l1-9"/></svg>
                    Excluir
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const WorkspaceCanvas: React.FC<WorkspaceCanvasProps> = ({
  classId,
  userId,
  userName,
  readOnly = false,
}) => {
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [docHtml, setDocHtml] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingImageUpload, setPendingImageUpload] = useState(false);
  const [fontFamily, setFontFamily] = useState<string>(FONT_FAMILIES[0].v);
  const [fontSize, setFontSize] = useState<number>(16);
  const [textColor, setTextColor] = useState<string>('#000000');
  const [bgColor, setBgColor] = useState<string>('');

  // ── Page state (───────────────────────────────────────────────────────────────
  // The ‘pages’ array owns names / IDs and the content snapshots of INACTIVE pages.
  // The ACTIVE page’s live content lives in the existing docHtml / items state.
  // On page switch (or save), we ‘flush’ docRef.current.innerHTML + items into pages first.
  const _initPageId = useRef<string>(uid()).current; // stable across re-renders
  const [pages, setPages] = useState<WorkspacePage[]>([
    { id: _initPageId, name: 'Página 1', docContent: '', items: [] },
  ]);
  const [activePageId, setActivePageId] = useState<string>(_initPageId);
  // Refs are kept in sync manually (no useEffect delay) so closures always see latest.
  const pagesRef = useRef<WorkspacePage[]>([{ id: _initPageId, name: 'Página 1', docContent: '', items: [] }]);
  const activePageIdRef = useRef<string>(_initPageId);

  // ── Materials state ──────────────────────────────────────────────────────
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMaterialTitle, setSaveMaterialTitle] = useState('');
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [materialsList, setMaterialsList] = useState<WorkspaceMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingMaterialId, setLoadingMaterialId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const saveItemsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDocDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Time of last local keypress in the main doc. Remote updates are held off
  // for TYPING_GUARD_MS after the last input so we don't clobber mid-typing.
  // Using a timestamp instead of a focus flag prevents permanent blocking when
  // the user stays focused but stops typing.
  const lastDocInputRef = useRef<number>(0);
  const TYPING_GUARD_MS = 1500;
  // Mirror of lastDocInputRef but for floating items (drag, delete, add, text-in-box).
  // Also checked against dragRef.current so a snapshot never fires mid-drag.
  const lastItemEditRef = useRef<number>(0);
  const ITEM_GUARD_MS = 1500;

  useEffect(() => {
    const unsub = subscribeWorkspace(classId, (data) => {
      // Use SECTION-SPECIFIC authorship instead of a single updatedBy field.
      // Problem: updatedBy is a single field for the whole document.  If the
      // teacher updates items (setting updatedBy = teacherUid) while the student
      // is mid-typing, the next snapshot arrives with updatedBy = teacherUid on
      // the student's side.  isSelfEcho becomes false → no typing guard →
      // snapshot overwrites the student's unsaved text before the 600ms debounce
      // fires.  Using per-section fields (docUpdatedBy / itemsUpdatedBy) ensures
      // each section's echo is identified correctly regardless of who touched
      // the sibling section.
      const isDocSelfEcho = !!data &&
        (data.docUpdatedBy ?? data.updatedBy) === userId;
      const isItemsSelfEcho = !!data &&
        (data.itemsUpdatedBy ?? data.updatedBy) === userId;
      // For page-structure changes (switch/add/delete/rename) we use the top-level updatedBy.
      const isPageSelfEcho = !!data && data.updatedBy === userId;

      // ── Pages / active-page sync (Fase 2) ──────────────────────────────────
      // Only apply remote changes; skip our own echo (local state already updated).
      if (data?.currentPageId && !isPageSelfEcho) {
        const remoteCPID = data.currentPageId;
        const remotePages = data.pages;
        if (remotePages && remotePages.length > 0) {
          const normalized = normalizeWorkspacePages(remotePages);
          if (remoteCPID !== activePageIdRef.current) {
            // Remote page switch → follow it
            pagesRef.current = normalized;
            setPages(normalized);
            activePageIdRef.current = remoteCPID;
            setActivePageId(remoteCPID);
            // docContent/items for the new active page will be applied below by the
            // existing handler (they are the top-level docContent/items in the snapshot).
          } else {
            // Same active page, but pages structure changed (rename/add/delete/duplicate).
            // Update pages metadata; keep active page’s live content.
            const merged = normalized.map((rp) =>
              rp.id === activePageIdRef.current
                ? { ...rp, docContent: pagesRef.current.find((p) => p.id === rp.id)?.docContent ?? rp.docContent, items: pagesRef.current.find((p) => p.id === rp.id)?.items ?? rp.items }
                : rp,
            );
            pagesRef.current = merged;
            setPages(merged);
          }
        } else if (remoteCPID !== activePageIdRef.current) {
          // currentPageId changed but pages array isn’t present (legacy or partial write)
          activePageIdRef.current = remoteCPID;
          setActivePageId(remoteCPID);
        }
      }

      console.log(
        `[WS] snap from "${data?.updatedByName ?? '?'}" docBy=${data?.docUpdatedBy?.slice(0,6) ?? '?'} itemsBy=${data?.itemsUpdatedBy?.slice(0,6) ?? '?'} docSelf=${isDocSelfEcho} itemsSelf=${isItemsSelfEcho}`,
      );

      // Items: block during active drag, or during self-echo window.
      const isLocallyEditingItems =
        dragRef.current !== null ||
        (isItemsSelfEcho && Date.now() - lastItemEditRef.current < ITEM_GUARD_MS);
      if (!isLocallyEditingItems) {
        setItems(data?.items ?? []);
      }

      // Doc: only suppress our own echo while actively typing.
      const nextDoc = data?.docContent ?? '';
      const isLocallyTyping =
        isDocSelfEcho && Date.now() - lastDocInputRef.current < TYPING_GUARD_MS;
      if (!isLocallyTyping) {
        setDocHtml(nextDoc);
        if (docRef.current && docRef.current.innerHTML !== nextDoc) {
          docRef.current.innerHTML = nextDoc;
        }
      }

      if (readOnly && data?.scrollRatio != null && overflowRef.current) {
        const el = overflowRef.current;
        const max = el.scrollHeight - el.clientHeight;
        if (max > 0) el.scrollTop = data.scrollRatio * max;
      }
    });
    return unsub;
  }, [classId, readOnly, userId]);

  const scheduleItemsSave = useCallback(
    (nextItems: WorkspaceItem[]) => {
      if (readOnly) return;
      // Stamp the edit time so the snapshot guard stays active through the debounce.
      lastItemEditRef.current = Date.now();
      if (saveItemsDebounce.current) clearTimeout(saveItemsDebounce.current);
      saveItemsDebounce.current = setTimeout(() => {
        saveWorkspace(classId, nextItems, userId, userName).catch(console.error);
      }, 500);
    },
    [classId, userId, userName, readOnly],
  );

  const scheduleDocSave = useCallback(
    (html: string) => {
      if (readOnly) return;
      if (saveDocDebounce.current) clearTimeout(saveDocDebounce.current);
      saveDocDebounce.current = setTimeout(() => {
        saveDocContent(classId, html, userId, userName).catch(console.error);
      }, 600);
    },
    [classId, userId, userName, readOnly],
  );

  const onDocInput = () => {
    if (!docRef.current) return;
    lastDocInputRef.current = Date.now();
    const html = docRef.current.innerHTML;
    setDocHtml(html);
    scheduleDocSave(html);
  };
  const onDocBlur = () => {
    // On blur, flush any pending doc content immediately
    if (!docRef.current) return;
    const html = docRef.current.innerHTML;
    setDocHtml(html);
    scheduleDocSave(html);
  };

  const onScrollSync = () => {
    if (readOnly || !overflowRef.current) return;
    const el = overflowRef.current;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return;
    const ratio = el.scrollTop / max;
    if (scrollDebounce.current) clearTimeout(scrollDebounce.current);
    scrollDebounce.current = setTimeout(() => {
      saveScrollRatio(classId, ratio).catch(() => {});
    }, 300);
  };

  const execFmt = useCallback((cmd: string, value?: string) => {
    docRef.current?.focus();
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand(cmd, false, value ?? undefined);
    setTimeout(() => {
      if (!docRef.current) return;
      const html = docRef.current.innerHTML;
      setDocHtml(html);
      scheduleDocSave(html);
    }, 50);
  }, [scheduleDocSave]);

  const applyFont = (family: string) => { setFontFamily(family); execFmt('fontName', family); };
  const applySize = (size: number) => {
    setFontSize(size);
    execFmt('fontSize', '7');
    setTimeout(() => {
      docRef.current?.querySelectorAll('font[size="7"]').forEach((el) => {
        (el as HTMLElement).removeAttribute('size');
        (el as HTMLElement).style.fontSize = `${size}px`;
      });
    }, 20);
  };
  const applyTextColor = (color: string) => { setTextColor(color); execFmt('foreColor', color || '#000000'); };
  const applyHighlight = (color: string) => { setBgColor(color); execFmt('hiliteColor', color || 'transparent'); };

  const updateItem = useCallback(
    (id: string, patch: Partial<WorkspaceItem>) => {
      setItems((prev) => {
        const next = prev.map((it) =>
          it.id === id ? { ...it, ...patch, updatedAt: Date.now(), updatedBy: userId, updatedByName: userName } : it,
        );
        scheduleItemsSave(next);
        return next;
      });
    },
    [scheduleItemsSave, userId, userName],
  );

  const deleteItem = useCallback(
    (id: string) => {
      setItems((prev) => { const next = prev.filter((it) => it.id !== id); scheduleItemsSave(next); return next; });
      setSelectedId(null);
    },
    [scheduleItemsSave],
  );

  const addTextBox = () => {
    if (readOnly) return;
    const newItem: WorkspaceItem = {
      id: uid(), type: 'text' as WorkspaceItemType,
      x: 5, y: 5, w: 45, h: 20,
      content: '',
      styles: { color: '#1e293b', fontSize: 16, bgColor: '#ffffff' },
      updatedAt: Date.now(), updatedBy: userId, updatedByName: userName,
    };
    setItems((prev) => { const next = [...prev, newItem]; scheduleItemsSave(next); return next; });
    setSelectedId(newItem.id);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPendingImageUpload(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const newItem: WorkspaceItem = {
        id: uid(), type: 'image' as WorkspaceItemType,
        x: 5, y: 10, w: 40, h: 30,
        imageUrl: dataUrl,
        updatedAt: Date.now(), updatedBy: userId, updatedByName: userName,
      };
      setItems((prev) => { const next = [...prev, newItem]; scheduleItemsSave(next); return next; });
      setSelectedId(newItem.id);
      setPendingImageUpload(false);
    };
    reader.readAsDataURL(file);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>, itemId: string, mode: 'move' | 'resize') => {
    if (readOnly) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    // Mark item editing immediately so the snapshot guard fires during the drag
    // (before scheduleItemsSave is called in onPointerUp).
    lastItemEditRef.current = Date.now();
    dragRef.current = {
      itemId, mode, startPx: e.clientX, startPy: e.clientY,
      origX: items.find((i) => i.id === itemId)?.x ?? 0,
      origY: items.find((i) => i.id === itemId)?.y ?? 0,
      origW: items.find((i) => i.id === itemId)?.w ?? 20,
      origH: items.find((i) => i.id === itemId)?.h ?? 20,
    };
    setSelectedId(itemId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - drag.startPx) / rect.width) * 100;
    const dy = ((e.clientY - drag.startPy) / rect.height) * 100;
    if (drag.mode === 'move') {
      setItems((prev) => prev.map((it) =>
        it.id === drag.itemId ? { ...it, x: clamp(drag.origX + dx, 0, 95), y: clamp(drag.origY + dy, 0, 95) } : it));
    } else {
      setItems((prev) => prev.map((it) =>
        it.id === drag.itemId ? { ...it, w: clamp(drag.origW + dx, 10, 100), h: clamp(drag.origH + dy, 5, 100) } : it));
    }
  };

  const onPointerUp = () => {
    if (!dragRef.current) return;
    const { itemId } = dragRef.current;
    dragRef.current = null;
    setItems((prev) => {
      const next = prev.map((it) =>
        it.id === itemId ? { ...it, updatedAt: Date.now(), updatedBy: userId, updatedByName: userName } : it);
      scheduleItemsSave(next);
      return next;
    });
  };

  const handleExportPdf = () => {
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) { alert('Permita popups para exportar o PDF.'); return; }
    const body = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>Workspace</title>
<style>body{margin:2cm;font-family:Arial,sans-serif;font-size:14pt;line-height:1.5;color:#000}
img{max-width:100%}@media print{@page{margin:1.5cm}}</style>
</head><body><div>${docRef.current?.innerHTML ?? docHtml}</div></body></html>`;
    printWin.document.write(body);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 600);
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t === canvasRef.current || t === overflowRef.current || t === docRef.current) setSelectedId(null);
  };

  // ── Page operations ───────────────────────────────────────────────────────────────

  /**
   * Flush the current active page’s live content (from DOM + items state) into
   * the pages array. Returns the flushed pages array.
   * Must be called before any operation that reads pages content (switch, save material).
   */
  const flushPages = (): WorkspacePage[] => {
    const currentDoc = docRef.current?.innerHTML ?? docHtml;
    const flushed = pagesRef.current.map((p) =>
      p.id === activePageIdRef.current ? { ...p, docContent: currentDoc, items } : p,
    );
    pagesRef.current = flushed;
    setPages(flushed);
    return flushed;
  };

  const switchPage = (pageId: string) => {
    if (pageId === activePageIdRef.current || readOnly) return;
    const flushed = flushPages();
    const newPage = flushed.find((p) => p.id === pageId);
    if (!newPage) return;
    // Cancel debounced saves to avoid stale writes after the switch.
    if (saveItemsDebounce.current) clearTimeout(saveItemsDebounce.current);
    if (saveDocDebounce.current) clearTimeout(saveDocDebounce.current);
    setDocHtml(newPage.docContent);
    if (docRef.current) docRef.current.innerHTML = newPage.docContent;
    setItems(newPage.items);
    setSelectedId(null);
    activePageIdRef.current = pageId;
    setActivePageId(pageId);
    savePageSwitch(classId, flushed, pageId, newPage.docContent, newPage.items, userId, userName).catch(console.error);
  };

  const addPage = () => {
    if (readOnly) return;
    const flushed = flushPages();
    const newId = uid();
    const newPage: WorkspacePage = { id: newId, name: `Página ${flushed.length + 1}`, docContent: '', items: [] };
    const updated = [...flushed, newPage];
    pagesRef.current = updated;
    setPages(updated);
    if (saveItemsDebounce.current) clearTimeout(saveItemsDebounce.current);
    if (saveDocDebounce.current) clearTimeout(saveDocDebounce.current);
    setDocHtml('');
    if (docRef.current) docRef.current.innerHTML = '';
    setItems([]);
    setSelectedId(null);
    activePageIdRef.current = newId;
    setActivePageId(newId);
    savePageSwitch(classId, updated, newId, '', [], userId, userName).catch(console.error);
  };

  const deletePage = (pageId: string) => {
    if (readOnly) return;
    const current = pagesRef.current;
    if (current.length <= 1) return; // never delete the last page
    if (!window.confirm('Excluir esta página?')) return;
    const isActive = pageId === activePageIdRef.current;
    const idx = current.findIndex((p) => p.id === pageId);
    const remaining = current.filter((p) => p.id !== pageId);
    pagesRef.current = remaining;
    setPages(remaining);
    if (isActive) {
      const nextPage = remaining[Math.max(0, idx - 1)];
      if (saveItemsDebounce.current) clearTimeout(saveItemsDebounce.current);
      if (saveDocDebounce.current) clearTimeout(saveDocDebounce.current);
      setDocHtml(nextPage.docContent);
      if (docRef.current) docRef.current.innerHTML = nextPage.docContent;
      setItems(nextPage.items);
      setSelectedId(null);
      activePageIdRef.current = nextPage.id;
      setActivePageId(nextPage.id);
      savePageSwitch(classId, remaining, nextPage.id, nextPage.docContent, nextPage.items, userId, userName).catch(console.error);
    } else {
      const currentDoc = docRef.current?.innerHTML ?? docHtml;
      savePageSwitch(classId, remaining, activePageIdRef.current, currentDoc, items, userId, userName).catch(console.error);
    }
  };

  const renamePage = (pageId: string, newName: string) => {
    if (readOnly) return;
    const updated = pagesRef.current.map((p) => (p.id === pageId ? { ...p, name: newName } : p));
    pagesRef.current = updated;
    setPages(updated);
    const currentDoc = docRef.current?.innerHTML ?? docHtml;
    savePageSwitch(classId, updated, activePageIdRef.current, currentDoc, items, userId, userName).catch(console.error);
  };

  const duplicatePage = (pageId: string) => {
    if (readOnly) return;
    const flushed = flushPages();
    const idx = flushed.findIndex((p) => p.id === pageId);
    if (idx === -1) return;
    const source = flushed[idx];
    const copy: WorkspacePage = {
      id: uid(),
      name: `${source.name} (cópia)`,
      docContent: source.docContent,
      items: source.items.map((it) => ({ ...it, id: uid() })),
    };
    const updated = [...flushed.slice(0, idx + 1), copy, ...flushed.slice(idx + 1)];
    pagesRef.current = updated;
    setPages(updated);
    const currentDoc = docRef.current?.innerHTML ?? docHtml;
    savePageSwitch(classId, updated, activePageIdRef.current, currentDoc, items, userId, userName).catch(console.error);
  };

  const handleSaveMaterial = async () => {
    const title = saveMaterialTitle.trim();
    if (!title) return;
    setSavingMaterial(true);
    try {
      // Flush the active page content into the pages array before saving.
      const allPages = flushPages();
      await saveWorkspaceAsMaterial(allPages, userId, { title });
      setShowSaveModal(false);
      setSaveMaterialTitle('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Materials] save failed:', msg, err);
      alert(`Erro ao salvar material: ${msg}`);
    } finally {
      setSavingMaterial(false);
    }
  };

  const handleOpenMaterialsList = async () => {
    setShowOpenModal(true);
    setLoadingMaterials(true);
    try {
      const list = await getMaterialsByUser(userId);
      setMaterialsList(list);
    } catch (err) {
      console.error('[Materials] list failed', err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleLoadMaterial = async (materialId: string) => {
    setLoadingMaterialId(materialId);
    try {
      const { pages: loadedPages, currentPageId } = await loadMaterialToWorkspace(materialId, classId, userId, userName);
      // Apply loaded material to local state immediately (before self-echo arrives).
      const normalized = normalizeWorkspacePages(loadedPages);
      pagesRef.current = normalized;
      setPages(normalized);
      activePageIdRef.current = currentPageId;
      setActivePageId(currentPageId);
      const activePage = normalized.find((p) => p.id === currentPageId) ?? normalized[0];
      if (activePage) {
        setDocHtml(activePage.docContent);
        if (docRef.current) docRef.current.innerHTML = activePage.docContent;
        setItems(activePage.items);
      }
      setSelectedId(null);
      setShowOpenModal(false);
    } catch (err) {
      console.error('[Materials] load failed', err);
      alert('Erro ao abrir material. Tente novamente.');
    } finally {
      setLoadingMaterialId(null);
    }
  };

  const selected = items.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="flex flex-col w-full h-full bg-slate-100 overflow-hidden" style={{ fontFamily: 'Arial, sans-serif' }}>

      {/* ── Fixed toolbar ─────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex flex-wrap items-center gap-1 px-2 py-1 bg-white border-b border-slate-200"
        style={{ minHeight: '2.5rem', zIndex: 20 }}
        onMouseDown={(e) => {
          const tag = (e.target as HTMLElement).tagName;
          if (tag !== 'SELECT') e.preventDefault();
        }}
      >
        <select
          value={fontFamily}
          onChange={(e) => applyFont(e.target.value)}
          disabled={readOnly}
          className="h-7 text-xs border border-slate-200 rounded px-1 bg-white text-slate-700 focus:outline-none disabled:opacity-50"
          style={{ fontFamily, maxWidth: '8rem' }}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.v} value={f.v} style={{ fontFamily: f.v }}>{f.label}</option>
          ))}
        </select>

        <select
          value={fontSize}
          onChange={(e) => applySize(Number(e.target.value))}
          disabled={readOnly}
          className="h-7 w-14 text-xs border border-slate-200 rounded px-1 bg-white text-slate-700 focus:outline-none disabled:opacity-50"
        >
          {FONT_SIZES.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        <button onMouseDown={(e) => { e.preventDefault(); execFmt('bold'); }} disabled={readOnly} className="w-7 h-7 rounded font-bold text-sm hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition" title="Negrito">B</button>
        <button onMouseDown={(e) => { e.preventDefault(); execFmt('italic'); }} disabled={readOnly} className="w-7 h-7 rounded italic text-sm hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition" title="Itálico">I</button>
        <button onMouseDown={(e) => { e.preventDefault(); execFmt('underline'); }} disabled={readOnly} className="w-7 h-7 rounded underline text-sm hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition" title="Sublinhado">U</button>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        <button onMouseDown={(e) => { e.preventDefault(); execFmt('justifyLeft'); }} disabled={readOnly} className="w-7 h-7 rounded hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition" title="Esquerda">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><line x1="1" y1="4" x2="15" y2="4"/><line x1="1" y1="8" x2="10" y2="8"/><line x1="1" y1="12" x2="13" y2="12"/></svg>
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); execFmt('justifyCenter'); }} disabled={readOnly} className="w-7 h-7 rounded hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition" title="Centralizar">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><line x1="3" y1="4" x2="13" y2="4"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); execFmt('justifyRight'); }} disabled={readOnly} className="w-7 h-7 rounded hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition" title="Direita">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><line x1="1" y1="4" x2="15" y2="4"/><line x1="6" y1="8" x2="15" y2="8"/><line x1="3" y1="12" x2="15" y2="12"/></svg>
        </button>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        <ColorSwatch colors={TEXT_COLORS} current={textColor} onPick={applyTextColor} label="Cor do texto" />
        <ColorSwatch colors={BG_COLORS} current={bgColor} onPick={applyHighlight} label="Cor de fundo / destaque" />

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {!readOnly && (
          <button onClick={addTextBox} className="w-7 h-7 rounded hover:bg-slate-100 text-slate-600 flex items-center justify-center transition border border-slate-200" title="Caixa de texto flutuante">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" rx="2"/><line x1="5" y1="8" x2="15" y2="8"/><line x1="5" y1="11" x2="11" y2="11"/></svg>
          </button>
        )}

        {!readOnly && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={pendingImageUpload}
              className="w-7 h-7 rounded hover:bg-slate-100 text-slate-600 flex items-center justify-center transition border border-slate-200 disabled:opacity-40"
              title="Inserir imagem (PNG com transparência preservada)"
            >
              {pendingImageUpload
                ? <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" rx="2"/><circle cx="7" cy="8.5" r="1.5"/><path d="M2 14l4-4 3 3 3-4 6 5"/></svg>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
          </>
        )}

        {selected && !readOnly && (
          <>
            <div className="w-px h-5 bg-slate-200 mx-0.5" />
            <button onClick={() => deleteItem(selected.id)} className="w-7 h-7 rounded hover:bg-red-50 text-red-500 flex items-center justify-center transition border border-red-200" title="Apagar bloco selecionado">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20"><path d="M3 6h14M8 6V4h4v2M6 6v10a2 2 0 002 2h4a2 2 0 002-2V6"/></svg>
            </button>
          </>
        )}

        {!readOnly && (
          <>
            <div className="w-px h-5 bg-slate-200 mx-0.5" />
            <button
              onClick={() => { setSaveMaterialTitle(''); setShowSaveModal(true); }}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-green-50 text-green-700 text-xs border border-green-200 transition"
              title="Salvar lousa como material reutilizável"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20"><path d="M17 5v11a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1h9l4 4z"/><path d="M13 4v4H7V4"/><path d="M7 12h6"/></svg>
            </button>
            <button
              onClick={handleOpenMaterialsList}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 text-blue-700 text-xs border border-blue-200 transition"
              title="Abrir material salvo na lousa"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20"><path d="M3 7a1 1 0 011-1h4l2 2h6a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V7z"/></svg>
            </button>
          </>
        )}

        <div className="flex-1" />

        <button onClick={handleExportPdf} className="flex items-center px-2 py-1 rounded hover:bg-slate-100 text-slate-600 text-xs border border-slate-200 transition" title="Exportar como PDF">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20"><path d="M5 4h7l4 4v8a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"/><polyline points="12 4 12 9 17 9"/><line x1="10" y1="12" x2="10" y2="17"/><polyline points="7 14 10 17 13 14"/></svg>
        </button>

        {!readOnly && (
          <button
            onClick={() => {
              if (!window.confirm('Limpar o conteúdo desta página?')) return;
              setItems([]); setSelectedId(null);
              if (docRef.current) docRef.current.innerHTML = '';
              setDocHtml('');
              // Flush cleared content into pagesRef and write to Firestore.
              const updated = pagesRef.current.map((p) =>
                p.id === activePageIdRef.current ? { ...p, docContent: '', items: [] } : p,
              );
              pagesRef.current = updated;
              setPages(updated);
              savePageSwitch(classId, updated, activePageIdRef.current, '', [], userId, userName).catch(console.error);
            }}
            className="flex items-center px-2 py-1 rounded hover:bg-red-50 text-red-500 text-xs border border-red-200 transition"
            title="Limpar conteúdo desta página"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20"><path d="M4 7h12M6 7V5a1 1 0 011-1h6a1 1 0 011 1v2M16 7l-1 10a2 2 0 01-2 2H7a2 2 0 01-2-2L4 7"/></svg>
          </button>
        )}
      </div>

      {/* ── Page tab bar ────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-stretch gap-0 bg-slate-50 border-b border-slate-200 overflow-x-auto"
        style={{ minHeight: '2rem', zIndex: 15 }}
      >
        {pages.map((page) => (
          <PageTab
            key={page.id}
            page={page}
            isActive={page.id === activePageId}
            readOnly={readOnly}
            canDelete={pages.length > 1}
            onActivate={() => switchPage(page.id)}
            onRename={(name) => renamePage(page.id, name)}
            onDuplicate={() => duplicatePage(page.id)}
            onDelete={() => deletePage(page.id)}
          />
        ))}
        {!readOnly && (
          <button
            onClick={addPage}
            className="flex-shrink-0 flex items-center justify-center w-8 h-full text-slate-400 hover:text-blue-600 hover:bg-white transition px-2"
            title="Nova página"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 16 16">
              <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Save Material Modal ──────────────────────────────────────────── */}
      {showSaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSaveModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Salvar como material</h2>
            <label className="block text-xs text-slate-500 mb-1">Título do material</label>
            <input
              type="text"
              autoFocus
              value={saveMaterialTitle}
              onChange={(e) => setSaveMaterialTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveMaterial(); if (e.key === 'Escape') setShowSaveModal(false); }}
              placeholder="Ex: Vocabulário — Cores"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-400 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMaterial}
                disabled={savingMaterial || !saveMaterialTitle.trim()}
                className="px-3 py-1.5 rounded-lg text-xs bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition"
              >
                {savingMaterial ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Open Material Modal ───────────────────────────────────────────── */}
      {showOpenModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowOpenModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">Abrir material</h2>
              <button onClick={() => setShowOpenModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20"><path d="M6 6l8 8M14 6l-8 8"/></svg>
              </button>
            </div>
            {loadingMaterials ? (
              <p className="text-sm text-slate-400 text-center py-6">Carregando…</p>
            ) : materialsList.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Nenhum material salvo ainda.</p>
            ) : (
              <ul className="overflow-y-auto flex-1 divide-y divide-slate-100">
                {materialsList.map((m) => (
                  <li key={m.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{m.title}</p>
                      <p className="text-xs text-slate-400">{new Date(m.updatedAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <button
                      onClick={() => handleLoadMaterial(m.id)}
                      disabled={loadingMaterialId === m.id}
                      className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {loadingMaterialId === m.id ? '…' : 'Abrir'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div
        ref={overflowRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-100 p-3 sm:p-4"
        onScroll={onScrollSync}
        onClick={onCanvasClick}
      >
        <div ref={canvasRef} className="relative w-full" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>

          {/* Main shared document */}
          <div className="relative w-full bg-white rounded-xl shadow-sm border border-slate-200 mb-6" style={{ minHeight: '60vh' }}>
            {!docHtml && (
              <div className="absolute top-6 left-6 text-slate-300 text-sm pointer-events-none select-none" style={{ fontFamily }}>
                {readOnly ? 'Aguardando conteúdo do professor…' : 'Clique aqui e comece a digitar…'}
              </div>
            )}
            <div
              ref={docRef}
              contentEditable={!readOnly}
              suppressContentEditableWarning
              spellCheck
              onBlur={onDocBlur}
              onInput={onDocInput}
              className="w-full min-h-[60vh] p-6 focus:outline-none leading-relaxed"
              style={{ fontFamily, fontSize: `${fontSize}px`, color: '#000000', wordBreak: 'break-word' }}
            />
          </div>

          {/* Floating blocks overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
            {items.map((item) => (
              <FloatingBlock
                key={item.id}
                item={item}
                isSelected={item.id === selectedId}
                readOnly={readOnly}
                canvasRef={canvasRef}
                onSelect={() => !readOnly && setSelectedId(item.id)}
                onPointerDownMove={(e) => onPointerDown(e, item.id, 'move')}
                onPointerDownResize={(e) => onPointerDown(e, item.id, 'resize')}
                onContentChange={(html) => updateItem(item.id, { content: html })}
              />
            ))}
          </div>

          {items.length > 0 && <div className="h-40" />}
        </div>
      </div>
    </div>
  );
};

// ── FloatingBlock ──────────────────────────────────────────────────────────────

interface FloatingBlockProps {
  item: WorkspaceItem;
  isSelected: boolean;
  readOnly: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onPointerDownMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerDownResize: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onContentChange: (html: string) => void;
}

const FloatingBlock: React.FC<FloatingBlockProps> = ({
  item, isSelected, readOnly, canvasRef,
  onSelect, onPointerDownMove, onPointerDownResize, onContentChange,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  // Timestamp of last keypress in this text box; remote DOM updates are
  // suppressed for FLOATING_GUARD_MS after the last input.
  const lastTypedAtRef = useRef<number>(0);
  const FLOATING_GUARD_MS = 1500;
  const [blockStyle, setBlockStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const el = contentRef.current;
    if (!el || item.type !== 'text') return;
    const isTyping = Date.now() - lastTypedAtRef.current < FLOATING_GUARD_MS;
    if (isTyping) return;
    if (el.innerHTML !== (item.content ?? '')) el.innerHTML = item.content ?? '';
  }, [item.content, item.type]);

  useEffect(() => {
    const update = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cw = canvas.offsetWidth;
      const ch = Math.max(canvas.scrollHeight, canvas.offsetHeight);
      setBlockStyle({
        position: 'absolute',
        left: `${(item.x / 100) * cw}px`,
        top: `${(item.y / 100) * ch}px`,
        width: `${(item.w / 100) * cw}px`,
        height: `${(item.h / 100) * ch}px`,
        zIndex: isSelected ? 50 : 10,
        pointerEvents: readOnly ? 'none' : 'auto',
        boxSizing: 'border-box',
        border: isSelected ? '2px solid #2563eb' : '1px dashed #94a3b8',
        borderRadius: '6px',
        overflow: 'hidden',
        background: item.type === 'text' ? (item.styles?.bgColor || '#ffffff') : 'transparent',
        cursor: readOnly ? 'default' : 'grab',
        userSelect: 'text',
        touchAction: 'none',
        boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,0.2)' : '0 2px 8px rgba(0,0,0,0.08)',
      });
    };
    update();
    const obs = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (obs && canvasRef.current) obs.observe(canvasRef.current);
    return () => obs?.disconnect();
  }, [item.x, item.y, item.w, item.h, isSelected, readOnly, canvasRef]);

  if (item.type === 'image') {
    return (
      <div style={blockStyle} onClick={onSelect}>
        {!readOnly && <div onPointerDown={onPointerDownMove} className="absolute inset-0 cursor-grab z-10" style={{ background: 'transparent' }} />}
        <img src={item.imageUrl} alt="" className="w-full h-full object-contain select-none pointer-events-none" draggable={false} style={{ background: 'transparent' }} />
        {isSelected && !readOnly && <ResizeHandle onPointerDown={onPointerDownResize} />}
      </div>
    );
  }

  return (
    <div style={blockStyle} onClick={onSelect}>
      {isSelected && !readOnly && (
        <div onPointerDown={onPointerDownMove} className="absolute top-0 left-0 right-0 h-5 cursor-grab z-20 flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.08)' }}>
          <span className="text-[9px] text-blue-400 select-none pointer-events-none">⠿ mover</span>
        </div>
      )}
      <div
        ref={contentRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        spellCheck
        onBlur={(e) => { onContentChange((e.target as HTMLDivElement).innerHTML); }}
        onInput={(e) => { lastTypedAtRef.current = Date.now(); onContentChange((e.target as HTMLDivElement).innerHTML); }}
        className="w-full h-full overflow-auto focus:outline-none p-2 leading-snug"
        style={{
          fontFamily: 'Arial, sans-serif',
          fontSize: `${item.styles?.fontSize ?? 14}px`,
          color: item.styles?.color ?? '#1e293b',
          paddingTop: isSelected && !readOnly ? '1.5rem' : '0.5rem',
          cursor: readOnly ? 'default' : 'text',
          wordBreak: 'break-word',
        }}
      />
      {isSelected && !readOnly && <ResizeHandle onPointerDown={onPointerDownResize} />}
    </div>
  );
};

// ── ResizeHandle ───────────────────────────────────────────────────────────────

const ResizeHandle: React.FC<{ onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void }> = ({ onPointerDown }) => (
  <div onPointerDown={onPointerDown} className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-30 flex items-center justify-center bg-blue-500/20 rounded-tl">
    <svg width="8" height="8" viewBox="0 0 8 8" fill="#2563eb"><path d="M0 8 L8 0 L8 8 Z" /></svg>
  </div>
);
