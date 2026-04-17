/**
 * WorkspaceCanvas � collaborative document editor for live classes.
 *
 * Layout:
 *   +-------------------- fixed toolbar --------------------+
 *   �  font | size | B I U | align | color | tools | export �
 *   +--------------------------------------------------------�
 *   �  scrollable area                                       �
 *   �   +---- main document (contenteditable) ------------+  �
 *   �   �  type directly here                             �  �
 *   �   +-------------------------------------------------+  �
 *   �   floating blocks (text boxes / images) overlay doc   �
 *   +--------------------------------------------------------+
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
import { speak } from '../../../services/ttsService';
import { translateText, saveVocabularyEntry } from '../../../services/vocabularyService';
import { subscribeUserAccounts, type UserAccountProfile } from '../../../services/userRoles';
import { MyVocabularyPage } from '../../MyVocabularyPage';

// -- Helpers -------------------------------------------------------------------

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// -- Config ---------------------------------------------------------------------

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

// -- Workspace UI labels --------------------------------------------------------

interface WsLabels {
  textSection: string;
  bgSection: string;
  colorBtn: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  alignJustify: string;
  alignLabel: (v: string) => string;
  bold: string;
  italic: string;
  underline: string;
  textBox: string;
  image: string;
  deleteBlock: string;
  saveAll: string;
  openMaterial: string;
  exportPdf: string;
  clearPage: string;
  newPage: string;
  placeholder: string;
  readonlyPh: string;
  pageMenu: string;
  duplicate: string;
  savePage: string;
  deletePage: string;
  confirmClear: string;
  confirmDelete: string;
  saveModalTitle: string;
  savePageModalTitle: string;
  openModalTitle: string;
  materialTitleLabel: string;
  materialPlaceholder: string;
  cancel: string;
  save: string;
  saving: string;
  noMaterials: string;
  loading: string;
  open: string;
  exportPopupError: string;
  pageName: (n: number) => string;
  pageNameTip: (name: string) => string;
  errorSave: (msg: string) => string;
  errorOpen: string;
  vocab: string;
}

const WS_LABELS: Record<'en' | 'pt' | 'es', WsLabels> = {
  pt: {
    textSection: 'Texto', bgSection: 'Fundo', colorBtn: 'Cor do texto e fundo',
    alignLeft: 'Esquerda', alignCenter: 'Centralizar', alignRight: 'Direita', alignJustify: 'Justificar',
    alignLabel: (v) => `Alinhar: ${v}`,
    bold: 'Negrito', italic: 'It�lico', underline: 'Sublinhado',
    textBox: 'Caixa de texto flutuante',
    image: 'Inserir imagem (PNG com transpar�ncia preservada)',
    deleteBlock: 'Apagar bloco selecionado',
    saveAll: 'Salvar lousa como material reutiliz�vel',
    openMaterial: 'Abrir material salvo na lousa',
    exportPdf: 'Exportar como PDF',
    clearPage: 'Limpar conte�do desta p�gina',
    newPage: 'Nova p�gina',
    placeholder: 'Clique aqui e comece a digitar�',
    readonlyPh: 'Aguardando conte�do do professor�',
    pageMenu: 'Op��es da p�gina', duplicate: 'Duplicar p�gina',
    savePage: 'Salvar esta p�gina', deletePage: 'Excluir p�gina',
    confirmClear: 'Limpar o conte�do desta p�gina?',
    confirmDelete: 'Excluir esta p�gina?',
    saveModalTitle: 'Salvar como material',
    savePageModalTitle: 'Salvar p�gina como material',
    openModalTitle: 'Abrir material',
    materialTitleLabel: 'T�tulo do material',
    materialPlaceholder: 'Ex: Vocabul�rio � Cores',
    cancel: 'Cancelar', save: 'Salvar', saving: 'Salvando�',
    noMaterials: 'Nenhum material salvo ainda.',
    loading: 'Carregando�', open: 'Abrir',
    exportPopupError: 'Permita popups para exportar o PDF.',
    pageName: (n) => `P�gina ${n}`,
    pageNameTip: (name) => `${name} � duplo clique para renomear`,
    errorSave: (msg) => `Erro ao salvar material: ${msg}`,
    errorOpen: 'Erro ao abrir material. Tente novamente.',
    vocab: 'Vocabul�rio',
  },
  en: {
    textSection: 'Text', bgSection: 'Background', colorBtn: 'Text and background color',
    alignLeft: 'Left', alignCenter: 'Center', alignRight: 'Right', alignJustify: 'Justify',
    alignLabel: (v) => `Align: ${v}`,
    bold: 'Bold', italic: 'Italic', underline: 'Underline',
    textBox: 'Floating text box',
    image: 'Insert image (PNG transparency preserved)',
    deleteBlock: 'Delete selected block',
    saveAll: 'Save whiteboard as reusable material',
    openMaterial: 'Open saved material',
    exportPdf: 'Export as PDF',
    clearPage: 'Clear this page content',
    newPage: 'New page',
    placeholder: 'Click here and start typing�',
    readonlyPh: "Waiting for teacher's content�",
    pageMenu: 'Page options', duplicate: 'Duplicate page',
    savePage: 'Save this page', deletePage: 'Delete page',
    confirmClear: 'Clear this page content?',
    confirmDelete: 'Delete this page?',
    saveModalTitle: 'Save as material',
    savePageModalTitle: 'Save page as material',
    openModalTitle: 'Open material',
    materialTitleLabel: 'Material title',
    materialPlaceholder: 'E.g.: Vocabulary � Colors',
    cancel: 'Cancel', save: 'Save', saving: 'Saving�',
    noMaterials: 'No saved materials yet.',
    loading: 'Loading�', open: 'Open',
    exportPopupError: 'Allow popups to export the PDF.',
    pageName: (n) => `Page ${n}`,
    pageNameTip: (name) => `${name} � double-click to rename`,
    errorSave: (msg) => `Error saving material: ${msg}`,
    errorOpen: 'Error opening material. Please try again.',
    vocab: 'Vocabulary',
  },
  es: {
    textSection: 'Texto', bgSection: 'Fondo', colorBtn: 'Color de texto y fondo',
    alignLeft: 'Izquierda', alignCenter: 'Centrar', alignRight: 'Derecha', alignJustify: 'Justificar',
    alignLabel: (v) => `Alinear: ${v}`,
    bold: 'Negrita', italic: 'Cursiva', underline: 'Subrayado',
    textBox: 'Cuadro de texto flotante',
    image: 'Insertar imagen (PNG con transparencia)',
    deleteBlock: 'Eliminar bloque seleccionado',
    saveAll: 'Guardar pizarra como material',
    openMaterial: 'Abrir material guardado',
    exportPdf: 'Exportar como PDF',
    clearPage: 'Limpiar esta p�gina',
    newPage: 'Nueva p�gina',
    placeholder: 'Haz clic aqu� y comienza a escribir�',
    readonlyPh: 'Esperando el contenido del profesor�',
    pageMenu: 'Opciones de p�gina', duplicate: 'Duplicar p�gina',
    savePage: 'Guardar esta p�gina', deletePage: 'Eliminar p�gina',
    confirmClear: '�Limpiar el contenido de esta p�gina?',
    confirmDelete: '�Eliminar esta p�gina?',
    saveModalTitle: 'Guardar como material',
    savePageModalTitle: 'Guardar p�gina como material',
    openModalTitle: 'Abrir material',
    materialTitleLabel: 'T�tulo del material',
    materialPlaceholder: 'Ej: Vocabulario � Colores',
    cancel: 'Cancelar', save: 'Guardar', saving: 'Guardando�',
    noMaterials: 'No hay materiales guardados.',
    loading: 'Cargando�', open: 'Abrir',
    exportPopupError: 'Permite las ventanas emergentes para exportar el PDF.',
    pageName: (n) => `P�gina ${n}`,
    pageNameTip: (name) => `${name} � doble clic para renombrar`,
    errorSave: (msg) => `Error al guardar material: ${msg}`,
    errorOpen: 'Error al abrir material. Int�ntalo de nuevo.',
    vocab: 'Vocabulario',
  },
};

const getWsl = (): WsLabels => {
  try {
    const lang = localStorage.getItem('learnendo_base_ui_lang') as 'en' | 'pt' | 'es' | null;
    return WS_LABELS[lang ?? 'pt'] ?? WS_LABELS.pt;
  } catch {
    return WS_LABELS.pt;
  }
};

const getWorkspaceBoxFlowLabels = () => {
  try {
    const lang = localStorage.getItem('learnendo_base_ui_lang') as 'en' | 'pt' | 'es' | null;
    if (lang === 'en') {
      return {
        move: 'Move',
        unassigned: 'Unassigned',
        none: 'None',
        boxLabel: 'Box label',
        selectStudent: 'Select a student',
      };
    }
    if (lang === 'es') {
      return {
        move: 'Mover',
        unassigned: 'Sin asignar',
        none: 'Ninguno',
        boxLabel: 'Nombre de la caja',
        selectStudent: 'Selecciona un alumno',
      };
    }
  } catch {
    // fall through to pt defaults
  }

  return {
    move: 'Mover',
    unassigned: 'Sem dono',
    none: 'Nenhum',
    boxLabel: 'Nome da caixa',
    selectStudent: 'Selecione um aluno',
  };
};

// -- Types ---------------------------------------------------------------------

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

interface WorkspaceViewerContext {
  classId: string;
  userId: string;
  userEmail?: string | null;
  classTeacherUserId?: string | null;
  isTeacherView: boolean;
}

interface AssignableStudentOption {
  uid: string;
  label: string;
  email: string | null;
  isOnline: boolean;
}

const WORKSPACE_ADMIN_EMAIL = 'learnendo@gmail.com';

function normalizeEmail(email?: string | null): string {
  return (email ?? '').trim().toLowerCase();
}

function isAdmin(viewer: WorkspaceViewerContext): boolean {
  return normalizeEmail(viewer.userEmail) === WORKSPACE_ADMIN_EMAIL;
}

function isTeacher(viewer: WorkspaceViewerContext): boolean {
  if (isAdmin(viewer)) return false;
  if (viewer.isTeacherView) return true;
  return Boolean(viewer.classTeacherUserId && viewer.userId === viewer.classTeacherUserId);
}

function isStudent(viewer: WorkspaceViewerContext): boolean {
  return !isAdmin(viewer) && !isTeacher(viewer);
}

function isBoxOwner(viewer: WorkspaceViewerContext, item: WorkspaceItem): boolean {
  return Boolean(item.ownerUserId && item.ownerUserId === viewer.userId);
}

function canManageBox(viewer: WorkspaceViewerContext, item: WorkspaceItem): boolean {
  if (isAdmin(viewer)) return true;
  if (!isTeacher(viewer)) return false;
  if (item.classId && item.classId !== viewer.classId) return false;
  return true;
}

function canEditBoxContent(viewer: WorkspaceViewerContext, item: WorkspaceItem): boolean {
  return canManageBox(viewer, item) || isBoxOwner(viewer, item);
}

function canRenameBox(viewer: WorkspaceViewerContext, item: WorkspaceItem): boolean {
  return canManageBox(viewer, item);
}

function canAssignBoxOwner(viewer: WorkspaceViewerContext, item: WorkspaceItem): boolean {
  return canManageBox(viewer, item);
}

function canMoveBox(viewer: WorkspaceViewerContext, item: WorkspaceItem): boolean {
  return canManageBox(viewer, item) || isBoxOwner(viewer, item);
}

function canResizeBox(viewer: WorkspaceViewerContext, item: WorkspaceItem): boolean {
  return canManageBox(viewer, item);
}

export interface WorkspaceCanvasProps {
  classId: string;
  userId: string;
  userName: string;
  userEmail?: string | null;
  readOnly?: boolean;
  isTeacher?: boolean;
  studentEditingEnabled?: boolean;
  classTeacherUserId?: string | null;
  assignedRoster?: Array<{ uid: string; label: string; isOnline: boolean }>;
  toolbarLeading?: React.ReactNode;
}

// -- UnifiedColorSwatch --------------------------------------------------------

const UnifiedColorSwatch: React.FC<{
  textColor: string;
  bgColor: string;
  onPickText: (v: string) => void;
  onPickBg: (v: string) => void;
}> = ({ textColor, bgColor, onPickText, onPickBg }) => {
  const wsl = getWsl();
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

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o); }}
        className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100 border border-slate-200 transition"
        title={wsl.colorBtn}
        aria-label={wsl.colorBtn}
      >
        <span className="relative w-4 h-4">
          <span className="absolute inset-0 rounded-sm border border-slate-300" style={{ background: textColor || '#000000' }} />
          <span className="absolute right-0 bottom-0 w-2.5 h-2.5 rounded-sm border border-white" style={{ background: bgColor || 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 6px 6px' }} />
        </span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-2" style={{ minWidth: '11rem' }}>
          <p className="text-[10px] font-medium text-slate-400 mb-1.5">{wsl.textSection}</p>
          <div className="grid grid-cols-5 gap-1 mb-2.5">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.v}
                onMouseDown={(e) => { e.preventDefault(); onPickText(c.v); setOpen(false); }}
                title={c.label}
                className="w-6 h-6 rounded transition hover:scale-110"
                style={{ background: c.v, border: c.v === textColor ? '2px solid #2563eb' : '1px solid #cbd5e1' }}
              />
            ))}
          </div>
          <p className="text-[10px] font-medium text-slate-400 mb-1.5">{wsl.bgSection}</p>
          <div className="grid grid-cols-5 gap-1">
            {BG_COLORS.map((c) => (
              <button
                key={c.v + c.label}
                onMouseDown={(e) => { e.preventDefault(); onPickBg(c.v); setOpen(false); }}
                title={c.label}
                className="w-6 h-6 rounded transition hover:scale-110"
                style={{ background: c.v || 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 8px 8px', border: c.v === bgColor ? '2px solid #2563eb' : '1px solid #cbd5e1' }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// -- AlignDropdown -------------------------------------------------------------

type AlignValue = 'left' | 'center' | 'right' | 'justify';

const AlignDropdown: React.FC<{
  current: AlignValue;
  disabled: boolean;
  onPick: (cmd: string, value: AlignValue) => void;
}> = ({ current, disabled, onPick }) => {
  const wsl = getWsl();
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

  const icons: Record<AlignValue, React.ReactElement> = {
    left:    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><line x1="1" y1="4" x2="15" y2="4"/><line x1="1" y1="8" x2="10" y2="8"/><line x1="1" y1="12" x2="13" y2="12"/></svg>,
    center:  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><line x1="3" y1="4" x2="13" y2="4"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>,
    right:   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><line x1="1" y1="4" x2="15" y2="4"/><line x1="6" y1="8" x2="15" y2="8"/><line x1="3" y1="12" x2="15" y2="12"/></svg>,
    justify: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><line x1="1" y1="4" x2="15" y2="4"/><line x1="1" y1="8" x2="15" y2="8"/><line x1="1" y1="12" x2="15" y2="12"/></svg>,
  };
  const labels: Record<AlignValue, string> = {
    left: wsl.alignLeft, center: wsl.alignCenter, right: wsl.alignRight, justify: wsl.alignJustify,
  };
  const cmds: Record<AlignValue, string> = {
    left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight', justify: 'justifyFull',
  };

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onMouseDown={(e) => { e.preventDefault(); if (!disabled) setOpen((o) => !o); }}
        disabled={disabled}
        className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100 border border-slate-200 disabled:opacity-40 transition"
        title={wsl.alignLabel(labels[current])}
        aria-label={wsl.alignLabel(labels[current])}
      >
        {icons[current]}
      </button>
      {open && !disabled && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-xl py-1" style={{ minWidth: '9rem' }}>
          {(['left', 'center', 'right', 'justify'] as AlignValue[]).map((v) => (
            <button
              key={v}
              onMouseDown={(e) => { e.preventDefault(); onPick(cmds[v], v); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 transition ${v === current ? 'text-blue-600 font-medium' : 'text-slate-700'}`}
            >
              {icons[v]}
              {labels[v]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// -- PageTab --------------------------------------------------------------------

interface PageTabProps {
  page: WorkspacePage;
  isActive: boolean;
  readOnly: boolean;
  canDelete: boolean;
  onActivate: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onSavePage: () => void;
  onDelete: () => void;
}

const PageTab: React.FC<PageTabProps> = ({
  page, isActive, readOnly, canDelete, onActivate, onRename, onDuplicate, onSavePage, onDelete,
}) => {
  const wsl = getWsl();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      if (
        menuBtnRef.current?.contains(e.target as Node) ||
        menuDropdownRef.current?.contains(e.target as Node)
      ) return;
      setMenuOpen(false);
      setHovered(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startEdit = () => {
    if (readOnly) return;
    if (!isActive) onActivate();
    setEditValue(page.name);
    setEditing(true);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== page.name) onRename(trimmed);
    setEditing(false);
  };

  const handleMenuOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menuBtnRef.current) return;
    const r = menuBtnRef.current.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 2, left: r.left });
    setMenuOpen((o) => !o);
  };

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
          title={wsl.pageNameTip(page.name)}
        >
          {page.name}
        </span>
      )}

      {!readOnly && (
        <div className={`flex-shrink-0 transition-opacity ${showMenuBtn ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button
            ref={menuBtnRef}
            onClick={handleMenuOpen}
            className="flex items-center justify-center w-5 h-6 mx-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
            title={wsl.pageMenu}
          >
            <svg viewBox="0 0 4 14" className="w-1 h-3.5" fill="currentColor">
              <circle cx="2" cy="2" r="1.5"/><circle cx="2" cy="7" r="1.5"/><circle cx="2" cy="12" r="1.5"/>
            </svg>
          </button>
          {menuOpen && (
            <div
              ref={menuDropdownRef}
              style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
              className="bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-[11rem]"
            >
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDuplicate(); }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><rect x="5" y="5" width="9" height="9" rx="1"/><path d="M2 11V2h9"/></svg>
                {wsl.duplicate}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onSavePage(); }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 16 16"><path d="M13 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1h7l3 3z"/><path d="M10 2v3H7V2"/><path d="M5 9h5"/></svg>
                {wsl.savePage}
              </button>
              {canDelete && (
                <>
                  <div className="h-px bg-slate-100 my-0.5" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                  >
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M4 4l1 9h6l1-9"/></svg>
                    {wsl.deletePage}
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

// -- VocabPopup -----------------------------------------------------------------

/** Map UI language codes to BCP-47 for TTS source (content is always in English). */
const CONTENT_LANG = 'en'; // the whiteboard content is in English

/** Map UI language  ? MyMemory target language code */
const LANG_MM: Record<string, string> = {
  en: 'en',
  pt: 'pt',
  es: 'es',
  el: 'el',
  he: 'he',
};

interface VocabState {
  text: string;
  /** Viewport-relative rect of the selection, used to position the popup. */
  rect: { top: number; left: number; bottom: number; right: number };
}

interface VocabPopupProps {
  vocab: VocabState;
  userId: string;
  onClose: () => void;
}

const VocabPopup: React.FC<VocabPopupProps> = ({ vocab, userId, onClose }) => {
  const [translation, setTranslation] = useState<string | null>(null);
  const [loadingT, setLoadingT] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Read UI language once
  const uiLang = (() => {
    try { return (localStorage.getItem('learnendo_base_ui_lang') as string) ?? 'pt'; } catch { return 'pt'; }
  })();
  const targetLang = LANG_MM[uiLang] ?? 'pt';

  // Translate on mount
  useEffect(() => {
    if (targetLang === CONTENT_LANG) {
      setTranslation(null); // same language � no translation needed
      return;
    }
    setLoadingT(true);
    translateText(vocab.text, CONTENT_LANG, targetLang)
      .then((t) => setTranslation(t))
      .finally(() => setLoadingT(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocab.text]);

  // Dismiss on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    // Use capture so the click on the canvas (which re-selects text) doesn't
    // also close the popup we just opened.
    document.addEventListener('mousedown', h, true);
    return () => document.removeEventListener('mousedown', h, true);
  }, [onClose]);

  // Position: prefer above the selection, fall back to below
  const POPUP_H = 108; // rough px height
  const POPUP_W = 220;
  const viewH = window.innerHeight;
  const viewW = window.innerWidth;
  const spaceAbove = vocab.rect.top;
  const top = spaceAbove >= POPUP_H + 8
    ? vocab.rect.top - POPUP_H - 6
    : vocab.rect.bottom + 6;
  const left = Math.min(Math.max(vocab.rect.left, 8), viewW - POPUP_W - 8);
  const clampedTop = Math.max(8, Math.min(top, viewH - POPUP_H - 8));

  const handleSpeak = () => speak(vocab.text, CONTENT_LANG);

  const handleSave = async () => {
    if (saving || saved) return;
    setSaving(true);
    const id = await saveVocabularyEntry(userId, {
      text: vocab.text,
      translation: translation ?? '',
      sourceLang: CONTENT_LANG,
      targetLang,
    });
    setSaving(false);
    if (id) setSaved(true);
  };

  const wsl = getWsl();

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: clampedTop,
        left,
        width: POPUP_W,
        zIndex: 10000,
      }}
      className="bg-white border border-slate-200 rounded-xl shadow-2xl p-3 flex flex-col gap-2"
      // Prevent the mousedown-outside handler from seeing clicks inside the popup
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Word / phrase */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800 leading-snug break-words flex-1">
          {vocab.text}
        </span>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-slate-400 hover:text-slate-600 mt-0.5"
          aria-label="Close"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 12 12">
            <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>
      </div>

      {/* Translation */}
      {targetLang !== CONTENT_LANG && (
        <div className="text-xs text-slate-500 min-h-[1.2rem]">
          {loadingT
            ? <span className="italic">{wsl.loading}</span>
            : translation
              ? <span>{translation}</span>
              : <span className="italic text-slate-400">�</span>}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 mt-0.5">
        <button
          onClick={handleSpeak}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition"
          title="Play audio"
        >
          ??
        </button>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`flex-1 px-2 py-1 rounded-lg text-xs font-medium transition ${
            saved
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
          }`}
        >
          {saved ? '? Saved' : saving ? '�' : 'Save'}
        </button>
      </div>
    </div>
  );
};

// -- Main component ------------------------------------------------------------

export const WorkspaceCanvas: React.FC<WorkspaceCanvasProps> = ({
  classId,
  userId,
  userName,
  userEmail,
  readOnly = false,
  isTeacher: isTeacherView = false,
  studentEditingEnabled = true,
  classTeacherUserId,
  assignedRoster = [],
  toolbarLeading,
}) => {
  console.log('[WorkspaceCanvas] INITIALIZED with userId:', userId, 'classId:', classId, 'userName:', userName);

  const viewerContext: WorkspaceViewerContext = {
    classId,
    userId,
    userEmail,
    classTeacherUserId,
    isTeacherView,
  };
  const viewerIsAdmin = isAdmin(viewerContext);
  const viewerIsTeacher = isTeacher(viewerContext);
  const viewerIsStudent = isStudent(viewerContext);
  const viewerCanManageWorkspace = viewerIsAdmin || viewerIsTeacher;
  const effectiveReadOnly = readOnly || (viewerIsStudent && !studentEditingEnabled);

  if (!userId) {
    console.error('[WorkspaceCanvas] userId is null/undefined! This will break save/load functionality');
    alert('Erro: userId n�o fornecido. A funcionalidade de salvar/carregar materiais n�o funcionar�.');
  }

  const wsl = getWsl();
  const boxFlowLabels = getWorkspaceBoxFlowLabels();
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [docHtml, setDocHtml] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingImageUpload, setPendingImageUpload] = useState(false);
  const [fontFamily, setFontFamily] = useState<string>(FONT_FAMILIES[0].v);
  const [fontSize, setFontSize] = useState<number>(16);
  const [textColor, setTextColor] = useState<string>('#000000');
  const [bgColor, setBgColor] = useState<string>('');
  const [textAlign, setTextAlign] = useState<AlignValue>('left');

  // -- Page state (---------------------------------------------------------------
  // The �pages� array owns names / IDs and the content snapshots of INACTIVE pages.
  // The ACTIVE page�s live content lives in the existing docHtml / items state.
  // On page switch (or save), we �flush� docRef.current.innerHTML + items into pages first.
  const _initPageId = useRef<string>(uid()).current; // stable across re-renders
  const [pages, setPages] = useState<WorkspacePage[]>([
    { id: _initPageId, name: wsl.pageName(1), docContent: '', items: [] },
  ]);
  const [activePageId, setActivePageId] = useState<string>(_initPageId);
  // Refs are kept in sync manually (no useEffect delay) so closures always see latest.
  const pagesRef = useRef<WorkspacePage[]>([{ id: _initPageId, name: wsl.pageName(1), docContent: '', items: [] }]);
  const activePageIdRef = useRef<string>(_initPageId);

  // -- Materials state ------------------------------------------------------
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMaterialTitle, setSaveMaterialTitle] = useState('');
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [materialsList, setMaterialsList] = useState<WorkspaceMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingMaterialId, setLoadingMaterialId] = useState<string | null>(null);
  const [saveSinglePageId, setSaveSinglePageId] = useState<string | null>(null);

  // -- Vocabulary popup state --------------------------------------------------
  const [vocabPopup, setVocabPopup] = useState<VocabState | null>(null);
  const [showVocabModal, setShowVocabModal] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const saveItemsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDocDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks which floating block's contentEditable is currently focused so the
  // toolbar can route formatting commands to the right target.
  const activeFloatingIdRef = useRef<string | null>(null);
  const activeFloatingElRef = useRef<HTMLElement | null>(null);
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
  const [userAccounts, setUserAccounts] = useState<UserAccountProfile[]>([]);

  const normalizeItemScope = useCallback(
    (item: WorkspaceItem): WorkspaceItem => ({
      ...item,
      classId: item.classId ?? classId,
      teacherUserId: item.teacherUserId ?? classTeacherUserId ?? undefined,
    }),
    [classId, classTeacherUserId],
  );

  useEffect(() => {
    if (assignedRoster.length === 0) {
      setUserAccounts([]);
      return () => {};
    }

    const unsubscribe = subscribeUserAccounts(
      (accounts) => setUserAccounts(accounts),
      (error) => console.warn('[WorkspaceCanvas] failed to load roster accounts:', error),
    );
    return unsubscribe;
  }, [assignedRoster]);

  const assignableStudents: AssignableStudentOption[] = assignedRoster
    .map((rosterStudent) => {
      const account = userAccounts.find((candidate) => candidate.uid === rosterStudent.uid);
      if (account && account.role !== 'student') return null;
      return {
        uid: rosterStudent.uid,
        label: account?.name || rosterStudent.label || rosterStudent.uid,
        email: account?.email ?? null,
        isOnline: rosterStudent.isOnline,
      };
    })
    .filter((option): option is AssignableStudentOption => Boolean(option));

  useEffect(() => {
    const unsub = subscribeWorkspace(classId, (data) => {
      // Use SECTION-SPECIFIC authorship instead of a single updatedBy field.
      // Problem: updatedBy is a single field for the whole document.  If the
      // teacher updates items (setting updatedBy = teacherUid) while the student
      // is mid-typing, the next snapshot arrives with updatedBy = teacherUid on
      // the student's side.  isSelfEcho becomes false ? no typing guard ?
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

      // -- Pages / active-page sync (Fase 2) ----------------------------------
      // Only apply remote changes; skip our own echo (local state already updated).
      if (data?.currentPageId && !isPageSelfEcho) {
        const remoteCPID = data.currentPageId;
        const remotePages = data.pages;
        if (remotePages && remotePages.length > 0) {
          const normalized = normalizeWorkspacePages(remotePages);
          if (remoteCPID !== activePageIdRef.current) {
            // Remote page switch ? follow it
            pagesRef.current = normalized;
            setPages(normalized);
            activePageIdRef.current = remoteCPID;
            setActivePageId(remoteCPID);
            // docContent/items for the new active page will be applied below by the
            // existing handler (they are the top-level docContent/items in the snapshot).
          } else {
            // Same active page, but pages structure changed (rename/add/delete/duplicate).
            // Update pages metadata; keep active page�s live content.
            const merged = normalized.map((rp) =>
              rp.id === activePageIdRef.current
                ? { ...rp, docContent: pagesRef.current.find((p) => p.id === rp.id)?.docContent ?? rp.docContent, items: pagesRef.current.find((p) => p.id === rp.id)?.items ?? rp.items }
                : rp,
            );
            pagesRef.current = merged;
            setPages(merged);
          }
        } else if (remoteCPID !== activePageIdRef.current) {
          // currentPageId changed but pages array isn�t present (legacy or partial write)
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
        setItems((data?.items ?? []).map(normalizeItemScope));
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
  }, [classId, normalizeItemScope, readOnly, userId]);

  const scheduleItemsSave = useCallback(
    (nextItems: WorkspaceItem[]) => {
      if (readOnly) return;
      // Stamp the edit time so the snapshot guard stays active through the debounce.
      lastItemEditRef.current = Date.now();
      const scopedItems = nextItems.map(normalizeItemScope);
      if (saveItemsDebounce.current) clearTimeout(saveItemsDebounce.current);
      saveItemsDebounce.current = setTimeout(() => {
        saveWorkspace(classId, scopedItems, userId, userName).catch(console.error);
      }, 500);
    },
    [classId, normalizeItemScope, userId, userName, readOnly],
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
    if (activeFloatingIdRef.current && activeFloatingElRef.current) {
      // -- Floating block is the active editor -------------------------------
      // e.preventDefault() on toolbar buttons already prevented the button from
      // stealing focus, so the contentEditable still owns the selection.
      // Re-focus it (no-op if already focused) to be safe, then apply the command.
      const floatingEl = activeFloatingElRef.current;
      const floatingId = activeFloatingIdRef.current;
      floatingEl.focus();
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      document.execCommand(cmd, false, value ?? undefined);
      // execCommand may or may not fire an `input` event; save explicitly.
      const html = floatingEl.innerHTML;
      lastItemEditRef.current = Date.now();
      setItems((prev) => {
        const next = prev.map((it) =>
          it.id === floatingId
            ? { ...it, content: html, updatedAt: Date.now(), updatedBy: userId, updatedByName: userName }
            : it,
        );
        scheduleItemsSave(next);
        return next;
      });
    } else {
      // -- Main document editor ----------------------------------------------
      docRef.current?.focus();
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      document.execCommand(cmd, false, value ?? undefined);
      setTimeout(() => {
        if (!docRef.current) return;
        const html = docRef.current.innerHTML;
        setDocHtml(html);
        scheduleDocSave(html);
      }, 50);
    }
  }, [scheduleDocSave, scheduleItemsSave, userId, userName]);

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
  const applyHighlight = (color: string) => {
    setBgColor(color);
    if (activeFloatingIdRef.current) {
      // Cursor is inside a floating block ? apply as inline text highlight
      execFmt('hiliteColor', color || 'transparent');
      return;
    }
    if (selectedId) {
      // Block selected but not being edited ? change the box background color
      const item = items.find((i) => i.id === selectedId);
      if (item) {
        updateItem(selectedId, { styles: { ...(item.styles ?? {}), bgColor: color || '' } });
        return;
      }
    }
    execFmt('hiliteColor', color || 'transparent');
  };

  const updateItem = useCallback(
    (id: string, patch: Partial<WorkspaceItem>) => {
      setItems((prev) => {
        const next = prev.map((it) =>
          it.id === id
            ? normalizeItemScope({
                ...it,
                ...patch,
                updatedAt: Date.now(),
                updatedBy: userId,
                updatedByName: userName,
              })
            : it,
        );
        scheduleItemsSave(next);
        return next;
      });
    },
    [normalizeItemScope, scheduleItemsSave, userId, userName],
  );

  const deleteItem = useCallback(
    (id: string) => {
      setItems((prev) => { const next = prev.filter((it) => it.id !== id); scheduleItemsSave(next); return next; });
      setSelectedId(null);
    },
    [scheduleItemsSave],
  );

  const LOCK_TIMEOUT_MS = 60_000;

  const isItemLockedByOther = (item: WorkspaceItem) => {
    if (!item.editingByUserId || item.editingByUserId === userId) return false;
    const age = Date.now() - (item.editingStartedAt ?? 0);
    return age < LOCK_TIMEOUT_MS;
  };

  const clearItemLock = (item: WorkspaceItem) => {
    if (item.editingByUserId !== userId) return;
    updateItem(item.id, {
      editingByUserId: '',
      editingByUserName: '',
      editingStartedAt: 0,
    });
  };

  const acquireItemLock = (item: WorkspaceItem) => {
    const canEditThisItem = canEditBoxContent(viewerContext, item);
    if (!canEditThisItem) return false;
    if (effectiveReadOnly && !canEditThisItem) return false;
    if (isItemLockedByOther(item)) return false;
    updateItem(item.id, {
      editingByUserId: userId,
      editingByUserName: userName,
      editingStartedAt: Date.now(),
    });
    return true;
  };

  const releaseItemLock = (itemId: string) => {
    const item = items.find((it) => it.id === itemId);
    if (!item) return;
    clearItemLock(item);
  };

  const requestItemEdit = (itemId: string, el: HTMLElement) => {
    const item = items.find((it) => it.id === itemId);
    if (!item || item.type !== 'text') return;
    const canEditThisItem = canEditBoxContent(viewerContext, item);
    if (!canEditThisItem || (effectiveReadOnly && !canEditThisItem) || isItemLockedByOther(item)) {
      el.blur();
      return;
    }
    if (!acquireItemLock(item)) {
      el.blur();
      return;
    }
    activeFloatingIdRef.current = itemId;
    activeFloatingElRef.current = el;
  };

  const handleFloatingBlur = (itemId: string) => {
    activeFloatingIdRef.current = null;
    activeFloatingElRef.current = null;
    releaseItemLock(itemId);
  };

  const addTextBox = () => {
    if (effectiveReadOnly || readOnly) return;
    const newItem = normalizeItemScope({
      id: uid(), type: 'text' as WorkspaceItemType,
      x: 5, y: 5, w: 45, h: 20,
      content: '',
      label: '',
      ownerUserId: viewerIsStudent ? userId : undefined,
      ownerEmail: viewerIsStudent ? userEmail ?? undefined : undefined,
      styles: { color: '#1e293b', fontSize: 16, bgColor: '#ffffff' },
      updatedAt: Date.now(), updatedBy: userId, updatedByName: userName,
    });
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
      if (effectiveReadOnly || readOnly) {
        setPendingImageUpload(false);
        return;
      }
      const newItem = normalizeItemScope({
        id: uid(), type: 'image' as WorkspaceItemType,
        x: 5, y: 10, w: 40, h: 30,
        imageUrl: dataUrl,
        updatedAt: Date.now(), updatedBy: userId, updatedByName: userName,
      });
      setItems((prev) => { const next = [...prev, newItem]; scheduleItemsSave(next); return next; });
      setSelectedId(newItem.id);
      setPendingImageUpload(false);
    };
    reader.readAsDataURL(file);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>, itemId: string, mode: 'move' | 'resize') => {
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const hasPermission = mode === 'move'
      ? canMoveBox(viewerContext, item) && (!effectiveReadOnly || canManageBox(viewerContext, item))
      : canResizeBox(viewerContext, item);
    if (!hasPermission) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    // Mark item editing immediately so the snapshot guard fires during the drag
    // (before scheduleItemsSave is called in onPointerUp).
    lastItemEditRef.current = Date.now();
    dragRef.current = {
      itemId, mode, startPx: e.clientX, startPy: e.clientY,
      origX: item.x,
      origY: item.y,
      origW: item.w,
      origH: item.h,
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
    if (!printWin) { alert(wsl.exportPopupError); return; }
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
    if (t === canvasRef.current || t === overflowRef.current || t === docRef.current) {
      if (selectedId) releaseItemLock(selectedId);
      setSelectedId(null);
    }
  };

  // -- Page operations ---------------------------------------------------------------

  /**
   * Flush the current active page�s live content (from DOM + items state) into
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
      setItems(newPage.items.map(normalizeItemScope));
    setSelectedId(null);
    activePageIdRef.current = pageId;
    setActivePageId(pageId);
    savePageSwitch(classId, flushed, pageId, newPage.docContent, newPage.items, userId, userName).catch(console.error);
  };

  const addPage = () => {
    if (readOnly) return;
    const flushed = flushPages();
    const newId = uid();
    const newPage: WorkspacePage = { id: newId, name: wsl.pageName(flushed.length + 1), docContent: '', items: [] };
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
    if (!window.confirm(wsl.confirmDelete)) return;
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
    setItems(nextPage.items.map(normalizeItemScope));
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
      name: `${source.name} (c�pia)`,
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
    console.log('[WorkspaceCanvas] Save Material clicked � title:', title);
    setSavingMaterial(true);
    try {
      const allPages = flushPages();
      console.log('[WorkspaceCanvas] Flushed pages count:', allPages.length);
      if (saveSinglePageId) {
        const targetPage = allPages.find((p) => p.id === saveSinglePageId);
        if (targetPage) {
          console.log('[WorkspaceCanvas] Saving single page:', targetPage.name);
          await saveWorkspaceAsMaterial([targetPage], { title });
        }
      } else {
        console.log('[WorkspaceCanvas] Saving all pages');
        await saveWorkspaceAsMaterial(allPages, { title });
      }
      console.log('[WorkspaceCanvas] Save completed successfully, closing modal');
      // Refresh the materials list if the open modal is currently shown
      if (showOpenModal) {
        const list = await getMaterialsByUser();
        setMaterialsList(list);
      }
      setShowSaveModal(false);
      setSaveMaterialTitle('');
      setSaveSinglePageId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[WorkspaceCanvas] save failed:', msg, err);
      alert(wsl.errorSave(msg));
    } finally {
      setSavingMaterial(false);
    }
  };

  const handleOpenMaterialsList = async () => {
    console.log('[WorkspaceCanvas] Open Materials clicked');
    setShowOpenModal(true);
    setLoadingMaterials(true);
    try {
      console.log('[WorkspaceCanvas] Calling getMaterialsByUser');
      const list = await getMaterialsByUser();
      console.log('[WorkspaceCanvas] getMaterialsByUser returned:', list.length, 'materials');
      setMaterialsList(list);
    } catch (err) {
      console.error('[WorkspaceCanvas] list failed', err);
      setMaterialsList([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleLoadMaterial = async (materialId: string) => {
    console.log('[WorkspaceCanvas] Load Material clicked � materialId:', materialId, 'userId:', userId);
    setLoadingMaterialId(materialId);
    try {
      console.log('[WorkspaceCanvas] Calling loadMaterialToWorkspace');
      const { pages: loadedPages, currentPageId } = await loadMaterialToWorkspace(materialId, classId, userName);
      console.log('[WorkspaceCanvas] Material loaded successfully � pages:', loadedPages.length);
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
        setItems(activePage.items.map(normalizeItemScope));
      }
      setSelectedId(null);
      setShowOpenModal(false);
    } catch (err) {
      console.error('[WorkspaceCanvas] load failed:', err);
      alert(wsl.errorOpen);
    } finally {
      setLoadingMaterialId(null);
    }
  };

  // -- Vocabulary selection detection -----------------------------------------
  /**
   * Called on mouseup anywhere in the canvas scrollable area.
   * Opens the vocab popup when the user has a non-trivial text selection that
   * is NOT inside the toolbar (so bold/italic clicks don't trigger it).
   */
  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    // Ignore clicks that originated on toolbar buttons
    if (toolbarRef.current?.contains(e.target as Node)) return;

    // Small delay so browser has time to settle the selection after a click
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const text = sel.toString().trim();
      // Ignore empty, whitespace-only, or excessively long selections
      if (!text || text.length > 60) return;
      // Ignore selections that include newlines (multi-paragraph grabs)
      if (/[\r\n]/.test(text)) return;

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      // rect is zero when the selection is in a non-rendered node � ignore
      if (rect.width === 0 && rect.height === 0) return;

      setVocabPopup({
        text,
        rect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right },
      });
    }, 80);
  }, []);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  // -- ResizeHandle ---------------------------------------------------------------

  const ResizeHandle: React.FC<{ onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void }> = ({ onPointerDown }) => (
    <div onPointerDown={onPointerDown} className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-30 flex items-center justify-center bg-blue-500/20 rounded-tl">
      <svg width="8" height="8" viewBox="0 0 8 8" fill="#2563eb"><path d="M0 8 L8 0 L8 8 Z" /></svg>
    </div>
  );

  // -- FloatingBlock --------------------------------------------------------------

  interface FloatingBlockProps {
    item: WorkspaceItem;
    isSelected: boolean;
    readOnly: boolean;
    currentUserId: string;
    canvasRef: React.RefObject<HTMLDivElement | null>;
    onSelect: () => void;
    onPointerDownMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerDownResize: (e: ReactPointerEvent<HTMLDivElement>) => void;
    onContentChange: (html: string) => void;
    onEditorTyping?: () => void;
    /** Called when the block's contentEditable receives focus. */
    onEditorFocus: (id: string, el: HTMLElement) => void;
    /** Called when the block's contentEditable loses focus. */
    onEditorBlur: () => void;
  }

  const FloatingBlock: React.FC<FloatingBlockProps> = ({
    item, isSelected, readOnly, currentUserId, canvasRef,
    onSelect, onPointerDownMove, onPointerDownResize, onContentChange,
    onEditorTyping, onEditorFocus, onEditorBlur,
  }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    // Timestamp of last keypress in this text box; remote DOM updates are
    // suppressed for FLOATING_GUARD_MS after the last input.
    const lastTypedAtRef = useRef<number>(0);
    const FLOATING_GUARD_MS = 1500;
    const LOCK_TIMEOUT_MS = 60_000;
    const isLockedByOther = Boolean(
      item.editingByUserId && item.editingByUserId !== currentUserId &&
      Date.now() - (item.editingStartedAt ?? 0) < LOCK_TIMEOUT_MS,
    );
    const lockOwnerName = item.editingByUserName || item.editingByUserId;
    const [blockStyle, setBlockStyle] = useState<React.CSSProperties>({});

    const canManageThisBox = canManageBox(viewerContext, item);
    const canEditThisContent = canEditBoxContent(viewerContext, item) && (!readOnly || canManageThisBox);
    const canRenameThisBox = canRenameBox(viewerContext, item);
    const canAssignThisBox = canAssignBoxOwner(viewerContext, item);
    const canMoveThisBox = canMoveBox(viewerContext, item) && (!readOnly || canManageThisBox);
    const canResizeThisBox = canResizeBox(viewerContext, item);
    const isOwnedByOther = Boolean(item.ownerUserId && item.ownerUserId !== currentUserId && !canManageThisBox);

    const [editingLabel, setEditingLabel] = useState(false);
    const [labelValue, setLabelValue] = useState(item.label || '');
    const [assigningOwner, setAssigningOwner] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
      setLabelValue(item.label || '');
    }, [item.label]);

    useEffect(() => {
      if (editingLabel) inputRef.current?.focus();
    }, [editingLabel]);

    useEffect(() => {
      if (editingLabel && !canRenameThisBox) {
        setEditingLabel(false);
      }
      if (assigningOwner && !canAssignThisBox) {
        setAssigningOwner(false);
      }

      if (canEditThisContent && !isLockedByOther) return;

      if (contentRef.current && document.activeElement === contentRef.current) {
        contentRef.current.blur();
      }

      if (item.editingByUserId === currentUserId) {
        onEditorBlur();
      }
    }, [
      assigningOwner,
      canAssignThisBox,
      canEditThisContent,
      canRenameThisBox,
      currentUserId,
      editingLabel,
      isLockedByOther,
      item.editingByUserId,
      onEditorBlur,
    ]);

    useEffect(() => {
      if (!viewerIsStudent) return;
      console.log('[WorkspaceCanvas] student box permission', {
        boxId: item.id,
        currentUserId,
        ownerUserId: item.ownerUserId ?? null,
        ownerEmail: item.ownerEmail ?? null,
        canEdit: canEditThisContent,
      });
    }, [
      canEditThisContent,
      currentUserId,
      item.id,
      item.ownerEmail,
      item.ownerUserId,
    ]);

    const saveLabel = () => {
      if (!canRenameThisBox) {
        setEditingLabel(false);
        return;
      }
      const newLabel = labelValue.trim();
      updateItem(item.id, { label: newLabel || undefined });
      setEditingLabel(false);
    };

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
          cursor: canMoveThisBox ? 'grab' : 'default',
          userSelect: 'text',
          touchAction: 'none',
          boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,0.2)' : '0 2px 8px rgba(0,0,0,0.08)',
        });
      };
      update();
      const obs = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
      if (obs && canvasRef.current) obs.observe(canvasRef.current);
      return () => obs?.disconnect();
    }, [item.x, item.y, item.w, item.h, item.styles?.bgColor, item.type, isSelected, readOnly, canvasRef]);

    if (item.type === 'image') {
      return (
        <div style={blockStyle} onClick={onSelect}>
          {canMoveThisBox && (
            <div onPointerDown={onPointerDownMove} className="absolute inset-0 cursor-grab z-10" style={{ background: 'transparent' }} />
          )}
          <img src={item.imageUrl} alt="" className="w-full h-full object-contain select-none pointer-events-none" draggable={false} style={{ background: 'transparent' }} />
          {isSelected && canResizeThisBox && <ResizeHandle onPointerDown={onPointerDownResize} />}
        </div>
      );
    }

    return (
      <div style={blockStyle} onClick={onSelect}>
        {isSelected && canMoveThisBox && (
          <div onPointerDown={onPointerDownMove} className="absolute top-0 left-0 right-0 h-5 cursor-grab z-20 flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.08)' }}>
            <span className="text-[9px] text-blue-400 select-none pointer-events-none">{boxFlowLabels.move}</span>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 z-20 px-2 py-1 bg-white/90 border-b border-slate-200 text-[11px] font-semibold text-slate-700">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {!editingLabel ? (
                <span onClick={canRenameThisBox ? () => setEditingLabel(true) : undefined} className={canRenameThisBox ? 'cursor-pointer' : ''}>
                  {item.label?.trim() ? item.label : boxFlowLabels.boxLabel}
                </span>
              ) : (
                <input ref={inputRef} value={labelValue} placeholder={boxFlowLabels.boxLabel} title={boxFlowLabels.boxLabel} onChange={(e) => setLabelValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(); }} onBlur={saveLabel} className="bg-white border border-slate-300 rounded px-1 py-0 text-[11px] font-semibold text-slate-700 flex-1" />
              )}
              <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {item.ownerUserId ? (item.ownerEmail || item.ownerUserId.slice(0, 6)) : boxFlowLabels.unassigned}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {canAssignThisBox && isSelected && (
                <button onClick={() => setAssigningOwner(!assigningOwner)} className="text-[9px] px-1.5 py-0.5 rounded hover:bg-slate-200 transition">
                  👤
                </button>
              )}
              {isLockedByOther && (
                <span className="text-[9px] text-slate-500 font-normal">Editing by {lockOwnerName}</span>
              )}
            </div>
          </div>
          {assigningOwner && canAssignThisBox && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[10px] text-slate-500 whitespace-nowrap">{boxFlowLabels.selectStudent}</span>
              <select
                value={item.ownerUserId ?? ''}
                className="text-[10px] px-1 py-0.5 border border-slate-300 rounded flex-1 bg-white"
                onChange={(e) => {
                  const nextOwnerId = e.target.value;
                  if (!nextOwnerId) {
                    console.log('[WorkspaceCanvas] box owner updated', {
                      boxId: item.id,
                      ownerUserId: undefined,
                      ownerEmail: undefined,
                      label: item.label ?? '',
                    });
                    updateItem(item.id, {
                      ownerUserId: undefined,
                      ownerEmail: undefined,
                    });
                    setAssigningOwner(false);
                    return;
                  }

                  const selectedStudent = assignableStudents.find((student) => student.uid === nextOwnerId);
                  if (!selectedStudent) return;

                  console.log('[WorkspaceCanvas] box owner updated', {
                    boxId: item.id,
                    ownerUserId: selectedStudent.uid,
                    ownerEmail: selectedStudent.email ?? undefined,
                    label: item.label?.trim() ? item.label : selectedStudent.label,
                  });
                  updateItem(item.id, {
                    ownerUserId: selectedStudent.uid,
                    ownerEmail: selectedStudent.email ?? undefined,
                    label: item.label?.trim() ? item.label : selectedStudent.label,
                  });
                  setAssigningOwner(false);
                }}
                autoFocus
              >
                <option value="">{boxFlowLabels.none}</option>
                {assignableStudents.map((student) => (
                  <option key={student.uid} value={student.uid}>
                    {student.label}{student.isOnline ? ' • online' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div
          ref={contentRef}
          contentEditable={canEditThisContent && !isLockedByOther}
          suppressContentEditableWarning
          spellCheck
          onFocus={(e) => { onEditorFocus(item.id, e.currentTarget); }}
          onBlur={(e) => {
            onEditorBlur();
            if (!canEditThisContent || isLockedByOther) return;
            onContentChange((e.target as HTMLDivElement).innerHTML);
          }}
          onInput={(e) => {
            if (!canEditThisContent || isLockedByOther) {
              e.currentTarget.blur();
              return;
            }
            lastTypedAtRef.current = Date.now();
            onContentChange((e.target as HTMLDivElement).innerHTML);
            onEditorTyping?.();
          }}
          className="w-full h-full overflow-auto focus:outline-none p-2 leading-snug"
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: `${item.styles?.fontSize ?? 14}px`,
            color: item.styles?.color ?? '#1e293b',
            paddingTop: isSelected && !readOnly ? '2.1rem' : '0.5rem',
            cursor: !canEditThisContent || isLockedByOther ? 'not-allowed' : 'text',
            wordBreak: 'break-word',
            opacity: isOwnedByOther ? 0.65 : isLockedByOther ? 0.85 : 1,
          }}
        />
        {isSelected && canResizeThisBox && <ResizeHandle onPointerDown={onPointerDownResize} />}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-full bg-slate-100 overflow-hidden" style={{ fontFamily: 'Arial, sans-serif' }}>

      {/* -- Fixed toolbar --------------------------------------------------- */}
      <div
        ref={toolbarRef}
        className="flex-shrink-0 flex flex-wrap items-center gap-0.5 px-1.5 py-1 bg-white border-b border-slate-200"
        style={{ minHeight: '2.5rem', zIndex: 20 }}
        onMouseDown={(e) => {
          const tag = (e.target as HTMLElement).tagName;
          if (tag !== 'SELECT') e.preventDefault();
        }}
      >
        {toolbarLeading && (
          <>
            {toolbarLeading}
            <div className="w-px h-5 bg-slate-200 mx-0.5" />
          </>
        )}
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

        <div className="flex items-center">
          <button onMouseDown={(e) => { e.preventDefault(); execFmt('bold'); }} disabled={readOnly} className="w-7 h-7 rounded font-bold text-sm hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition" title={wsl.bold}>B</button>
          <button onMouseDown={(e) => { e.preventDefault(); execFmt('italic'); }} disabled={readOnly} className="w-7 h-7 rounded italic text-sm hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition" title={wsl.italic}>I</button>
          <button onMouseDown={(e) => { e.preventDefault(); execFmt('underline'); }} disabled={readOnly} className="w-7 h-7 rounded underline text-sm hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition" title={wsl.underline}>U</button>
        </div>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        <AlignDropdown current={textAlign} disabled={readOnly} onPick={(cmd, value) => { setTextAlign(value); execFmt(cmd); }} />

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        <UnifiedColorSwatch textColor={textColor} bgColor={bgColor} onPickText={applyTextColor} onPickBg={applyHighlight} />

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {!effectiveReadOnly && !readOnly && (
          <button onClick={addTextBox} className="w-7 h-7 rounded hover:bg-slate-100 text-slate-600 flex items-center justify-center transition border border-slate-200" title={wsl.textBox}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" rx="2"/><line x1="5" y1="8" x2="15" y2="8"/><line x1="5" y1="11" x2="11" y2="11"/></svg>
          </button>
        )}

        {!effectiveReadOnly && !readOnly && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={pendingImageUpload}
              className="w-7 h-7 rounded hover:bg-slate-100 text-slate-600 flex items-center justify-center transition border border-slate-200 disabled:opacity-40"
              title={wsl.image}
            >
              {pendingImageUpload
                ? <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" rx="2"/><circle cx="7" cy="8.5" r="1.5"/><path d="M2 14l4-4 3 3 3-4 6 5"/></svg>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
          </>
        )}

        {selected && canManageBox(viewerContext, selected) && (
          <>
            <div className="w-px h-5 bg-slate-200 mx-0.5" />
            <button onClick={() => deleteItem(selected.id)} className="w-7 h-7 rounded hover:bg-red-50 text-red-500 flex items-center justify-center transition border border-red-200" title={wsl.deleteBlock}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20"><path d="M3 6h14M8 6V4h4v2M6 6v10a2 2 0 002 2h4a2 2 0 002-2V6"/></svg>
            </button>
          </>
        )}

        {!readOnly && viewerCanManageWorkspace && (
          <>
            <div className="w-px h-5 bg-slate-200 mx-0.5" />
            <button
              onClick={() => { setSaveMaterialTitle(''); setShowSaveModal(true); }}
              className="w-7 h-7 rounded flex items-center justify-center hover:bg-green-50 text-green-700 border border-green-200 transition"
              title={wsl.saveAll}
              aria-label={wsl.saveAll}
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20"><path d="M17 5v11a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1h9l4 4z"/><path d="M13 4v4H7V4"/><path d="M7 12h6"/></svg>
            </button>
            <button
              onClick={handleOpenMaterialsList}
              className="w-7 h-7 rounded flex items-center justify-center hover:bg-blue-50 text-blue-700 border border-blue-200 transition"
              title={wsl.openMaterial}
              aria-label={wsl.openMaterial}
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20"><path d="M3 7a1 1 0 011-1h4l2 2h6a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V7z"/></svg>
            </button>
          </>
        )}

        <div className="flex-1" />

        <button
          onClick={() => setShowVocabModal(true)}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-indigo-50 text-indigo-600 border border-indigo-200 transition"
          title={wsl.vocab}
          aria-label={wsl.vocab}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20">
            <rect x="3" y="2" width="10" height="14" rx="1.5"/>
            <rect x="7" y="4" width="10" height="14" rx="1.5" opacity="0.4"/>
            <line x1="6" y1="7" x2="10" y2="7"/>
            <line x1="6" y1="10" x2="10" y2="10"/>
          </svg>
        </button>

        {!readOnly && (
          <button onClick={handleExportPdf} className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100 text-slate-600 border border-slate-200 transition" title={wsl.exportPdf} aria-label={wsl.exportPdf}>
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20"><path d="M5 4h7l4 4v8a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"/><polyline points="12 4 12 9 17 9"/><line x1="10" y1="12" x2="10" y2="17"/><polyline points="7 14 10 17 13 14"/></svg>
          </button>
        )}

        {!effectiveReadOnly && (
          <button
            onClick={() => {
              if (!window.confirm(wsl.confirmClear)) return;
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
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-red-50 text-red-500 border border-red-200 transition"
            title={wsl.clearPage}
            aria-label={wsl.clearPage}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20"><path d="M4 7h12M6 7V5a1 1 0 011-1h6a1 1 0 011 1v2M16 7l-1 10a2 2 0 01-2 2H7a2 2 0 01-2-2L4 7"/></svg>
          </button>
        )}
      </div>

      {/* -- Page tab bar ---------------------------------------------- */}
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
            onSavePage={() => { setSaveSinglePageId(page.id); setSaveMaterialTitle(''); setShowSaveModal(true); }}
            onDelete={() => deletePage(page.id)}
          />
        ))}
        {!readOnly && (
          <button
            onClick={addPage}
            className="flex-shrink-0 flex items-center justify-center w-8 h-full text-slate-400 hover:text-blue-600 hover:bg-white transition px-2"
            title={wsl.newPage}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 16 16">
              <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
            </svg>
          </button>
        )}
      </div>

      {/* -- Save Material Modal -------------------------------------------- */}
      {showSaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowSaveModal(false); setSaveSinglePageId(null); } }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold text-slate-800 mb-4">{saveSinglePageId ? wsl.savePageModalTitle : wsl.saveModalTitle}</h2>
            <label className="block text-xs text-slate-500 mb-1">{wsl.materialTitleLabel}</label>
            <input
              type="text"
              autoFocus
              value={saveMaterialTitle}
              onChange={(e) => setSaveMaterialTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveMaterial(); if (e.key === 'Escape') setShowSaveModal(false); }}
              placeholder={wsl.materialPlaceholder}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-400 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowSaveModal(false); setSaveSinglePageId(null); }}
                className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                {wsl.cancel}
              </button>
              <button
                onClick={handleSaveMaterial}
                disabled={savingMaterial || !saveMaterialTitle.trim()}
                className="px-3 py-1.5 rounded-lg text-xs bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition"
              >
                {savingMaterial ? wsl.saving : wsl.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Open Material Modal --------------------------------------------- */}
      {showOpenModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowOpenModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">{wsl.openModalTitle}</h2>
              <button onClick={() => setShowOpenModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20"><path d="M6 6l8 8M14 6l-8 8"/></svg>
              </button>
            </div>
            {loadingMaterials ? (
              <p className="text-sm text-slate-400 text-center py-6">{wsl.loading}</p>
            ) : materialsList.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">{wsl.noMaterials}</p>
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
                      {loadingMaterialId === m.id ? '�' : wsl.open}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* -- Scrollable content ----------------------------------------------- */}
      <div
        ref={overflowRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-100 p-3 sm:p-4"
        onScroll={onScrollSync}
        onClick={onCanvasClick}
        onMouseUp={handleCanvasMouseUp}
      >
        <div ref={canvasRef} className="relative w-full" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>

          {/* Main shared document */}
          <div className="relative w-full bg-white rounded-xl shadow-sm border border-slate-200 mb-6" style={{ minHeight: '60vh' }}>
            {!docHtml && (
              <div className="absolute top-6 left-6 text-slate-300 text-sm pointer-events-none select-none" style={{ fontFamily }}>
                {readOnly ? wsl.readonlyPh : wsl.placeholder}
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
                readOnly={effectiveReadOnly}
                currentUserId={userId}
                canvasRef={canvasRef}
                onSelect={() => setSelectedId(item.id)}
                onPointerDownMove={(e) => onPointerDown(e, item.id, 'move')}
                onPointerDownResize={(e) => onPointerDown(e, item.id, 'resize')}
                onContentChange={(html) => updateItem(item.id, { content: html })}
                onEditorTyping={() => updateItem(item.id, { editingStartedAt: Date.now() })}
                onEditorFocus={requestItemEdit}
                onEditorBlur={() => {
                  activeFloatingIdRef.current = null;
                  activeFloatingElRef.current = null;
                  handleFloatingBlur(item.id);
                }}
              />
            ))}
          </div>

          {items.length > 0 && <div className="h-40" />}
        </div>
      </div>

      {/* -- Vocabulary popup ----------------------------------------------- */}
      {vocabPopup && (
        <VocabPopup
          vocab={vocabPopup}
          userId={userId}
          onClose={() => setVocabPopup(null)}
        />
      )}

      {/* -- My Vocabulary modal -------------------------------------------- */}
      {showVocabModal && (
        <div className="fixed inset-0 z-[10001] bg-black/40 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <MyVocabularyPage
              userId={userId}
              uiLanguage={(() => { try { return (localStorage.getItem('learnendo_base_ui_lang') as 'en' | 'pt' | 'es') ?? 'pt'; } catch { return 'pt'; } })()}
              onBack={() => setShowVocabModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

