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
  WorkspaceItem,
  WorkspaceItemType,
} from '../../../services/workspaceService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

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

interface WorkspaceCanvasProps {
  classId: string;
  userId: string;
  userName: string;
  readOnly?: boolean;
}

// ── Colour palette ────────────────────────────────────────────────────────────

const TEXT_COLORS = [
  { label: 'Preto',    v: '#1e293b' },
  { label: 'Cinza',    v: '#64748b' },
  { label: 'Branco',   v: '#ffffff' },
  { label: 'Vermelho', v: '#ef4444' },
  { label: 'Laranja',  v: '#f97316' },
  { label: 'Amarelo',  v: '#eab308' },
  { label: 'Verde',    v: '#22c55e' },
  { label: 'Azul',     v: '#3b82f6' },
  { label: 'Roxo',     v: '#a855f7' },
];

const BG_COLORS = [
  { label: 'Sem cor',   v: 'transparent' },
  { label: 'Branco',    v: '#ffffff' },
  { label: 'Amarelo',   v: '#fef9c3' },
  { label: 'Verde claro', v: '#dcfce7' },
  { label: 'Azul claro',  v: '#dbeafe' },
  { label: 'Rosa',        v: '#fce7f3' },
  { label: 'Cinza claro', v: '#f1f5f9' },
];

// ── Main component ────────────────────────────────────────────────────────────

export const WorkspaceCanvas: React.FC<WorkspaceCanvasProps> = ({
  classId,
  userId,
  userName,
  readOnly = false,
}) => {
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingImageUpload, setPendingImageUpload] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteItemsRef = useRef<WorkspaceItem[]>([]); // last value from Firestore

  // ── Firestore subscribe ────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeWorkspace(classId, (data) => {
      const next = data?.items ?? [];
      remoteItemsRef.current = next;
      setItems(next);
    });
    return unsub;
  }, [classId]);

  // ── Debounced save ─────────────────────────────────────────────────────────
  const scheduleSave = useCallback(
    (nextItems: WorkspaceItem[]) => {
      if (readOnly) return;
      if (saveDebounce.current) clearTimeout(saveDebounce.current);
      saveDebounce.current = setTimeout(() => {
        saveWorkspace(classId, nextItems, userId, userName).catch((err) =>
          console.error('[Workspace] save error:', err),
        );
      }, 500);
    },
    [classId, userId, userName, readOnly],
  );

  // ── Item helpers ───────────────────────────────────────────────────────────
  const updateItem = useCallback(
    (id: string, patch: Partial<WorkspaceItem>) => {
      setItems((prev) => {
        const next = prev.map((it) =>
          it.id === id
            ? { ...it, ...patch, updatedAt: Date.now(), updatedBy: userId, updatedByName: userName }
            : it,
        );
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave, userId, userName],
  );

  const deleteItem = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.filter((it) => it.id !== id);
        scheduleSave(next);
        return next;
      });
      setSelectedId(null);
    },
    [scheduleSave],
  );

  // ── Add text block ─────────────────────────────────────────────────────────
  const addTextBlock = () => {
    if (readOnly) return;
    const newItem: WorkspaceItem = {
      id: uid(),
      type: 'text' as WorkspaceItemType,
      x: 10,
      y: 10,
      w: 40,
      h: 20,
      content: '',
      styles: { color: '#1e293b', fontSize: 16, bgColor: '#ffffff' },
      updatedAt: Date.now(),
      updatedBy: userId,
      updatedByName: userName,
    };
    setItems((prev) => {
      const next = [...prev, newItem];
      scheduleSave(next);
      return next;
    });
    setSelectedId(newItem.id);
  };

  // ── Add image block ────────────────────────────────────────────────────────
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPendingImageUpload(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const newItem: WorkspaceItem = {
        id: uid(),
        type: 'image' as WorkspaceItemType,
        x: 10,
        y: 10,
        w: 40,
        h: 35,
        imageUrl: dataUrl,
        updatedAt: Date.now(),
        updatedBy: userId,
        updatedByName: userName,
      };
      setItems((prev) => {
        const next = [...prev, newItem];
        scheduleSave(next);
        return next;
      });
      setSelectedId(newItem.id);
      setPendingImageUpload(false);
    };
    reader.readAsDataURL(file);
  };

  // ── Pointer drag (move + resize) ───────────────────────────────────────────
  const onPointerDown = (
    e: ReactPointerEvent<HTMLDivElement>,
    itemId: string,
    mode: 'move' | 'resize',
  ) => {
    if (readOnly) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      itemId,
      mode,
      startPx: e.clientX,
      startPy: e.clientY,
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
      const newX = clamp(drag.origX + dx, 0, 100);
      const newY = clamp(drag.origY + dy, 0, 100);
      setItems((prev) =>
        prev.map((it) => (it.id === drag.itemId ? { ...it, x: newX, y: newY } : it)),
      );
    } else {
      const newW = clamp(drag.origW + dx, 10, 100);
      const newH = clamp(drag.origH + dy, 8, 100);
      setItems((prev) =>
        prev.map((it) => (it.id === drag.itemId ? { ...it, w: newW, h: newH } : it)),
      );
    }
  };

  const onPointerUp = () => {
    if (!dragRef.current) return;
    const { itemId } = dragRef.current;
    dragRef.current = null;
    // Flush final position to Firestore
    setItems((prev) => {
      const next = prev.map((it) =>
        it.id === itemId
          ? { ...it, updatedAt: Date.now(), updatedBy: userId, updatedByName: userName }
          : it,
      );
      scheduleSave(next);
      return next;
    });
  };

  // ── Selected item ──────────────────────────────────────────────────────────
  const selected = items.find((i) => i.id === selectedId) ?? null;

  // ── Toolbar actions on selected item ──────────────────────────────────────
  const execFormat = (cmd: string, value?: string) => {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand(cmd, false, value);
  };

  const setStyleOnSelected = (patch: Partial<WorkspaceItem['styles']>) => {
    if (!selectedId) return;
    updateItem(selectedId, { styles: { ...selected?.styles, ...patch } });
  };

  // ── Dismiss selection on canvas click ─────────────────────────────────────
  const onCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) setSelectedId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full h-full bg-slate-100 select-none overflow-hidden">
      {/* ── Top toolbar ── */}
      {!readOnly && (
        <div className="flex-shrink-0 flex flex-wrap items-center gap-1 px-2 py-1.5 bg-white border-b border-slate-200 z-10">
          {/* Add blocks */}
          <button
            onClick={addTextBlock}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
          >
            + Texto
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            disabled={pendingImageUpload}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-50"
          >
            {pendingImageUpload ? '⏳' : '🖼 Imagem'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFile}
          />

          {/* Text formatting — only when a text block is selected */}
          {selected?.type === 'text' && (
            <>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <button
                onMouseDown={(e) => { e.preventDefault(); execFormat('bold'); }}
                className="w-7 h-7 rounded font-bold text-sm hover:bg-slate-100 transition flex items-center justify-center"
                title="Negrito"
              >B</button>
              <button
                onMouseDown={(e) => { e.preventDefault(); execFormat('italic'); }}
                className="w-7 h-7 rounded italic text-sm hover:bg-slate-100 transition flex items-center justify-center"
                title="Itálico"
              >I</button>
              <button
                onMouseDown={(e) => { e.preventDefault(); execFormat('underline'); }}
                className="w-7 h-7 rounded underline text-sm hover:bg-slate-100 transition flex items-center justify-center"
                title="Sublinhado"
              >U</button>

              <div className="w-px h-5 bg-slate-200 mx-1" />

              {/* Text colour swatches */}
              <span className="text-[10px] text-slate-500 leading-none">Cor:</span>
              {TEXT_COLORS.slice(0, 6).map((c) => (
                <button
                  key={c.v}
                  onClick={() => setStyleOnSelected({ color: c.v })}
                  title={c.label}
                  style={{ background: c.v, border: c.v === (selected.styles?.color ?? '#1e293b') ? '2px solid #2563eb' : '1px solid #cbd5e1' }}
                  className="w-4 h-4 rounded-full flex-shrink-0 transition"
                />
              ))}

              <div className="w-px h-5 bg-slate-200 mx-1" />

              {/* Background colour */}
              <span className="text-[10px] text-slate-500 leading-none">Fundo:</span>
              {BG_COLORS.slice(0, 5).map((c) => (
                <button
                  key={c.v}
                  onClick={() => setStyleOnSelected({ bgColor: c.v })}
                  title={c.label}
                  style={{
                    background: c.v === 'transparent' ? undefined : c.v,
                    border: c.v === (selected.styles?.bgColor ?? 'transparent')
                      ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  }}
                  className={`w-4 h-4 rounded-full flex-shrink-0 transition ${c.v === 'transparent' ? 'bg-[repeating-conic-gradient(#ccc_0%_25%,#fff_0%_50%)] bg-[length:6px_6px]' : ''}`}
                />
              ))}

              <div className="w-px h-5 bg-slate-200 mx-1" />

              {/* Delete selected */}
              <button
                onClick={() => deleteItem(selectedId!)}
                className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition"
                title="Apagar bloco"
              >🗑</button>
            </>
          )}

          {/* Delete selected image */}
          {selected?.type === 'image' && (
            <>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <button
                onClick={() => deleteItem(selectedId!)}
                className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition"
                title="Apagar imagem"
              >🗑 Imagem</button>
            </>
          )}

          {/* Clear all */}
          <div className="ml-auto">
            <button
              onClick={() => {
                if (!window.confirm('Limpar todo o conteúdo do Workspace?')) return;
                setItems([]);
                setSelectedId(null);
                saveWorkspace(classId, [], userId, userName).catch(console.error);
              }}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs transition"
              title="Limpar tudo"
            >
              Limpar tudo
            </button>
          </div>
        </div>
      )}

      {/* ── Canvas area ── */}
      <div className="flex-1 min-h-0 overflow-hidden p-2 sm:p-3 flex items-center justify-center">
        {/* Fixed-aspect bounded workspace */}
        <div
          ref={canvasRef}
          onClick={onCanvasClick}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className="relative w-full bg-white rounded-xl shadow-inner overflow-hidden"
          style={{
            // Maintain a fixed aspect ratio (slide-like 16:10) that scales with the container
            aspectRatio: '16/10',
            maxHeight: '100%',
          }}
        >
          {items.length === 0 && !readOnly && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-slate-300 text-sm select-none">
                Clique em "+ Texto" ou "🖼 Imagem" para adicionar ao espaço de trabalho
              </span>
            </div>
          )}
          {items.length === 0 && readOnly && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-slate-300 text-sm select-none">
                Aguardando conteúdo do professor…
              </span>
            </div>
          )}

          {items.map((item) => (
            <WorkspaceBlock
              key={item.id}
              item={item}
              isSelected={item.id === selectedId}
              readOnly={readOnly}
              onSelect={() => !readOnly && setSelectedId(item.id)}
              onPointerDownMove={(e) => onPointerDown(e, item.id, 'move')}
              onPointerDownResize={(e) => onPointerDown(e, item.id, 'resize')}
              onContentChange={(html) => updateItem(item.id, { content: html })}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ── WorkspaceBlock ─────────────────────────────────────────────────────────────

interface WorkspaceBlockProps {
  item: WorkspaceItem;
  isSelected: boolean;
  readOnly: boolean;
  onSelect: () => void;
  onPointerDownMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerDownResize: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onContentChange: (html: string) => void;
}

const WorkspaceBlock: React.FC<WorkspaceBlockProps> = ({
  item,
  isSelected,
  readOnly,
  onSelect,
  onPointerDownMove,
  onPointerDownResize,
  onContentChange,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const isEditingRef = useRef(false);

  // When remote content changes and user is not actively editing, apply it
  useEffect(() => {
    const el = contentRef.current;
    if (!el || isEditingRef.current) return;
    if (item.type === 'text' && el.innerHTML !== (item.content ?? '')) {
      el.innerHTML = item.content ?? '';
    }
  }, [item.content, item.type]);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${item.x}%`,
    top: `${item.y}%`,
    width: `${item.w}%`,
    height: `${item.h}%`,
    boxSizing: 'border-box',
    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
    borderRadius: '6px',
    overflow: 'hidden',
    background: item.type === 'text' ? (item.styles?.bgColor ?? '#ffffff') : '#000',
    cursor: readOnly ? 'default' : 'grab',
    userSelect: 'text',
    touchAction: 'none',
  };

  if (item.type === 'image') {
    return (
      <div style={style} onClick={onSelect}>
        {!readOnly && (
          <div
            onPointerDown={onPointerDownMove}
            className="absolute inset-0 cursor-grab z-10"
            style={{ background: 'transparent' }}
          />
        )}
        <img
          src={item.imageUrl}
          alt=""
          className="w-full h-full object-contain select-none pointer-events-none"
          draggable={false}
        />
        {isSelected && !readOnly && (
          <ResizeHandle onPointerDown={onPointerDownResize} />
        )}
      </div>
    );
  }

  // text block
  return (
    <div style={style} onClick={onSelect}>
      {/* Drag handle — only visible when selected, sits above content */}
      {isSelected && !readOnly && (
        <div
          onPointerDown={onPointerDownMove}
          className="absolute top-0 left-0 right-0 h-5 cursor-grab z-20 flex items-center justify-center"
          style={{ background: 'rgba(37,99,235,0.1)' }}
        >
          <span className="text-[10px] text-blue-500 select-none pointer-events-none">⠿ arrastar</span>
        </div>
      )}

      <div
        ref={contentRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        spellCheck
        onFocus={() => { isEditingRef.current = true; }}
        onBlur={(e) => {
          isEditingRef.current = false;
          onContentChange((e.target as HTMLDivElement).innerHTML);
        }}
        onInput={(e) => onContentChange((e.target as HTMLDivElement).innerHTML)}
        className="w-full h-full overflow-auto focus:outline-none p-1.5 leading-snug"
        style={{
          fontSize: `${item.styles?.fontSize ?? 16}px`,
          color: item.styles?.color ?? '#1e293b',
          paddingTop: isSelected && !readOnly ? '1.5rem' : '0.375rem',
          cursor: readOnly ? 'default' : 'text',
        }}
      />

      {isSelected && !readOnly && (
        <ResizeHandle onPointerDown={onPointerDownResize} />
      )}
    </div>
  );
};

// ── Resize handle ─────────────────────────────────────────────────────────────

const ResizeHandle: React.FC<{ onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void }> = ({
  onPointerDown,
}) => (
  <div
    onPointerDown={onPointerDown}
    className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30 flex items-center justify-center"
    style={{ background: 'rgba(37,99,235,0.15)' }}
  >
    <svg width="8" height="8" viewBox="0 0 8 8" fill="#2563eb">
      <path d="M0 8 L8 0 L8 8 Z" />
    </svg>
  </div>
);
