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
  useMemo,
  useRef,
  useCallback,
  PointerEvent as ReactPointerEvent,
} from 'react';
import {
  subscribeWorkspace,
  saveWorkspace,
  saveWorkspaceItem,
  saveDocContent,
  saveScrollRatio,
  savePageSwitch,
  saveWorkspaceSurfaceMode,
  normalizeWorkspacePages,
  WorkspaceItem,
  WorkspaceItemType,
  WorkspacePage,
  type WorkspaceSurfaceState,
  type WorkspaceSurfaceMode,
} from '../../../services/workspaceService';
import {
  saveWorkspaceAsMaterial,
  loadMaterialToWorkspace,
  getMaterialsByUser,
  deleteMaterialFromLibrary,
  WorkspaceMaterial,
} from '../../../services/materialsService';
import {
  deleteBattleTemplateFromLibrary,
  listBattleTemplatesByOwner,
  type StoredBattleTemplate,
} from '../../../services/battleTemplateLibraryService';
import { getSavedBattleTemplateLanguage } from '../Battle/battleUtils';
import type { BattleTemplateLanguage, SavedBattleTemplate } from '../Battle/battleTypes';
import { speak } from '../../../services/ttsService';
import { translateText, saveVocabularyEntry } from '../../../services/vocabularyService';
import { subscribeUserAccounts, type UserAccountProfile } from '../../../services/userRoles';
import { MyVocabularyPage } from '../../MyVocabularyPage';
import { BASE_UI_LANGUAGE_STORAGE_KEY, getScopedStorageItem } from '../../../utils/tabScopedStorage';

// -- Helpers -------------------------------------------------------------------

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

const WORKSPACE_ITEMS_SYNC_DEBOUNCE_MS = 150;
const WORKSPACE_DOC_SYNC_DEBOUNCE_MS = 150;

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
  noBattles: string;
  noSavedFiles: string;
  loading: string;
  open: string;
  openBattle: string;
  materialsSection: string;
  battlesSection: string;
  exportPopupError: string;
  pageName: (n: number) => string;
  pageNameTip: (name: string) => string;
  errorSave: (msg: string) => string;
  errorOpen: string;
  vocab: string;
}

interface SurfaceModeLabels {
  document: string;
  slides: string;
  switchToDocument: string;
  switchToSlides: string;
  currentCanvas: string;
  pageName: (n: number) => string;
  pageNameTip: (name: string) => string;
  currentLabel: string;
  pageMenu: string;
  savePage: string;
  deletePage: string;
  newPage: string;
  clearPage: string;
  confirmClear: string;
  confirmDelete: string;
}

const BATTLE_LIBRARY_LANGUAGE_TABS: Array<{ value: BattleTemplateLanguage; label: string; dir?: 'ltr' | 'rtl' }> = [
  { value: 'pt', label: 'português', dir: 'ltr' },
  { value: 'es', label: 'español', dir: 'ltr' },
  { value: 'en', label: 'English', dir: 'ltr' },
  { value: 'el', label: 'Αποθηκευμένες μάχες', dir: 'ltr' },
  { value: 'he', label: 'קרבות שמורים', dir: 'rtl' },
];

function getBattleLibraryFolderLabel(language: BattleTemplateLanguage): string {
  switch (language) {
    case 'pt':
      return 'Portugu\u00eas';
    case 'es':
      return 'Espa\u00f1ol';
    case 'en':
      return 'English';
    case 'el':
      return '\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac';
    case 'he':
      return '\u05e2\u05d1\u05e8\u05d9\u05ea';
    default:
      return language;
  }
}

function getBattleLibrarySectionTitle(language: BattleTemplateLanguage): string {
  switch (language) {
    case 'pt':
      return 'Batalhas em Português';
    case 'es':
      return 'Batallas en Español';
    case 'en':
      return 'English Battles';
    case 'el':
      return 'Μάχες στα Ελληνικά';
    case 'he':
      return 'קרבות בעברית';
    default:
      return language;
  }
}

function getSurfaceModeLabels(
  uiLang: 'en' | 'pt' | 'es',
  surfaceMode: WorkspaceSurfaceMode,
  wsl: WsLabels,
): SurfaceModeLabels {
  const isSlides = surfaceMode === 'slides';
  if (uiLang === 'en') {
    return {
      document: 'Board',
      slides: 'Slides',
      switchToDocument: 'Switch to board mode',
      switchToSlides: 'Switch to slides mode',
      currentCanvas: isSlides ? 'Slides canvas' : 'Board canvas',
      pageName: (n) => (isSlides ? `Slide ${n}` : wsl.pageName(n)),
      pageNameTip: (name) => (isSlides ? `${name} - double-click to rename` : wsl.pageNameTip(name)),
      currentLabel: isSlides ? 'Slide' : 'Page',
      pageMenu: isSlides ? 'Slide options' : wsl.pageMenu,
      savePage: isSlides ? 'Save this slide' : wsl.savePage,
      deletePage: isSlides ? 'Delete slide' : wsl.deletePage,
      newPage: isSlides ? 'New slide' : wsl.newPage,
      clearPage: isSlides ? 'Clear this slide content' : wsl.clearPage,
      confirmClear: isSlides ? 'Clear this slide content?' : wsl.confirmClear,
      confirmDelete: isSlides ? 'Delete this slide?' : wsl.confirmDelete,
    };
  }
  if (uiLang === 'es') {
    return {
      document: 'Pizarra',
      slides: 'Diapositivas',
      switchToDocument: 'Cambiar al modo pizarra',
      switchToSlides: 'Cambiar al modo diapositivas',
      currentCanvas: isSlides ? 'Lienzo de diapositivas' : 'Lienzo de pizarra',
      pageName: (n) => (isSlides ? `Diapositiva ${n}` : wsl.pageName(n)),
      pageNameTip: (name) => (isSlides ? `${name} - doble clic para renombrar` : wsl.pageNameTip(name)),
      currentLabel: isSlides ? 'Diapositiva' : 'Página',
      pageMenu: isSlides ? 'Opciones de diapositiva' : wsl.pageMenu,
      savePage: isSlides ? 'Guardar esta diapositiva' : wsl.savePage,
      deletePage: isSlides ? 'Eliminar diapositiva' : wsl.deletePage,
      newPage: isSlides ? 'Nueva diapositiva' : wsl.newPage,
      clearPage: isSlides ? 'Limpiar esta diapositiva' : wsl.clearPage,
      confirmClear: isSlides ? '¿Limpiar esta diapositiva?' : wsl.confirmClear,
      confirmDelete: isSlides ? '¿Eliminar esta diapositiva?' : wsl.confirmDelete,
    };
  }
  return {
    document: 'Lousa',
    slides: 'Slides',
    switchToDocument: 'Trocar para modo lousa',
    switchToSlides: 'Trocar para modo slides',
    currentCanvas: isSlides ? 'Tela de slides' : 'Tela da lousa',
    pageName: (n) => (isSlides ? `Slide ${n}` : wsl.pageName(n)),
    pageNameTip: (name) => (isSlides ? `${name} - duplo clique para renomear` : wsl.pageNameTip(name)),
    currentLabel: isSlides ? 'Slide' : 'Página',
    pageMenu: isSlides ? 'Opções do slide' : wsl.pageMenu,
    savePage: isSlides ? 'Salvar este slide' : wsl.savePage,
    deletePage: isSlides ? 'Excluir slide' : wsl.deletePage,
    newPage: isSlides ? 'Novo slide' : wsl.newPage,
    clearPage: isSlides ? 'Limpar conteúdo deste slide' : wsl.clearPage,
    confirmClear: isSlides ? 'Limpar o conteúdo deste slide?' : wsl.confirmClear,
    confirmDelete: isSlides ? 'Excluir este slide?' : wsl.confirmDelete,
  };
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
    openModalTitle: 'Aulas e Materiais de Apoio',
    materialTitleLabel: 'T�tulo do material',
    materialPlaceholder: 'Ex: Vocabul�rio � Cores',
    cancel: 'Cancelar', save: 'Salvar', saving: 'Salvando�',
    noMaterials: 'Nenhum material salvo ainda.',
    noBattles: 'Nenhum battle salvo ainda.',
    noSavedFiles: 'Nenhum arquivo salvo ainda.',
    loading: 'Carregando�', open: 'Abrir',
    openBattle: 'Abrir',
    materialsSection: 'Conteúdo',
    battlesSection: 'Battles salvos',
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
    openModalTitle: 'Lessons and Support Materials',
    materialTitleLabel: 'Material title',
    materialPlaceholder: 'E.g.: Vocabulary � Colors',
    cancel: 'Cancel', save: 'Save', saving: 'Saving�',
    noMaterials: 'No saved materials yet.',
    noBattles: 'No saved battles yet.',
    noSavedFiles: 'No saved files yet.',
    loading: 'Loading�', open: 'Open',
    openBattle: 'Open',
    materialsSection: 'Content',
    battlesSection: 'Saved battles',
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
    openModalTitle: 'Clases y Materiales de Apoyo',
    materialTitleLabel: 'T�tulo del material',
    materialPlaceholder: 'Ej: Vocabulario � Colores',
    cancel: 'Cancelar', save: 'Guardar', saving: 'Guardando�',
    noMaterials: 'No hay materiales guardados.',
    noBattles: 'No hay battles guardados.',
    noSavedFiles: 'No hay archivos guardados.',
    loading: 'Cargando�', open: 'Abrir',
    openBattle: 'Abrir',
    materialsSection: 'Contenido',
    battlesSection: 'Battles guardados',
    exportPopupError: 'Permite las ventanas emergentes para exportar el PDF.',
    pageName: (n) => `P�gina ${n}`,
    pageNameTip: (name) => `${name} � doble clic para renombrar`,
    errorSave: (msg) => `Error al guardar material: ${msg}`,
    errorOpen: 'Error al abrir material. Int�ntalo de nuevo.',
    vocab: 'Vocabulario',
  },
};

const getScopedUiLanguage = (): 'en' | 'pt' | 'es' => {
  try {
    const stored = getScopedStorageItem(BASE_UI_LANGUAGE_STORAGE_KEY);
    return stored === 'en' || stored === 'es' ? stored : 'pt';
  } catch {
    return 'pt';
  }
};

const getWsl = (): WsLabels => {
  try {
    const lang = getScopedStorageItem(BASE_UI_LANGUAGE_STORAGE_KEY) as 'en' | 'pt' | 'es' | null;
    return WS_LABELS[lang ?? 'pt'] ?? WS_LABELS.pt;
  } catch {
    return WS_LABELS.pt;
  }
};

const getWorkspaceBoxFlowLabels = () => {
  try {
    const lang = getScopedStorageItem(BASE_UI_LANGUAGE_STORAGE_KEY) as 'en' | 'pt' | 'es' | null;
    if (lang === 'en') {
      return {
        move: 'Move',
        unassigned: 'Unassigned',
        none: 'None',
        boxLabel: 'Box label',
        contentBox: 'Slide text box',
        studentBox: 'Student box',
        contentBadge: 'Slide',
        studentBadge: 'Student',
        selectStudent: 'Select a student',
        searchStudent: 'Search by name or email',
        clearOwner: 'Remove owner',
      };
    }
    if (lang === 'es') {
      return {
        move: 'Mover',
        unassigned: 'Sin asignar',
        none: 'Ninguno',
        boxLabel: 'Nombre de la caja',
        contentBox: 'Caja del slide',
        studentBox: 'Caja del alumno',
        contentBadge: 'Slide',
        studentBadge: 'Alumno',
        selectStudent: 'Selecciona un alumno',
        searchStudent: 'Buscar por nombre o correo',
        clearOwner: 'Quitar alumno',
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
    contentBox: 'Caixa do slide',
    studentBox: 'Caixa do aluno',
    contentBadge: 'Slide',
    studentBadge: 'Aluno',
    selectStudent: 'Selecione um aluno',
    searchStudent: 'Buscar por nome ou e-mail',
    clearOwner: 'Remover dono',
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
  forceSave: boolean;
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

function getEmailLocalPart(email?: string | null): string {
  const normalized = normalizeEmail(email);
  if (!normalized) return '';
  return normalized.includes('@') ? normalized.split('@')[0] : normalized;
}

function normalizeLooseText(value?: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function resolveAssignableOwner(
  item: WorkspaceItem,
  assignableStudents: AssignableStudentOption[],
): AssignableStudentOption | null {
  if (item.ownerUserId) {
    return assignableStudents.find((student) => student.uid === item.ownerUserId) ?? null;
  }

  if (item.boxRole !== 'student') return null;

  const labelKey = normalizeLooseText(item.label);
  if (!labelKey) return null;

  return (
    assignableStudents.find((student) => {
      const labelMatch = normalizeLooseText(student.label) === labelKey;
      const emailMatch = normalizeLooseText(getEmailLocalPart(student.email)) === labelKey;
      return labelMatch || emailMatch;
    }) ?? null
  );
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
  if (item.ownerUserId && item.ownerUserId === viewer.userId) return true;
  if (item.ownerEmail && viewer.userEmail) {
    return normalizeEmail(item.ownerEmail) === normalizeEmail(viewer.userEmail);
  }
  if (item.ownerUserId && viewer.userEmail) {
    // Backward compatibility for older boxes that stored the email local part
    // instead of the real Firebase UID in ownerUserId.
    return item.ownerUserId.trim().toLowerCase() === getEmailLocalPart(viewer.userEmail);
  }
  return false;
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
  return item.boxRole === 'student' && canManageBox(viewer, item);
}

function canMoveBox(viewer: WorkspaceViewerContext, item: WorkspaceItem): boolean {
  return canManageBox(viewer, item) || isBoxOwner(viewer, item);
}

function canResizeBox(viewer: WorkspaceViewerContext, item: WorkspaceItem): boolean {
  return canManageBox(viewer, item) || isBoxOwner(viewer, item);
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
  onOpenBattleTemplate?: (template: SavedBattleTemplate) => void;
  onPresentationModeChange?: (active: boolean) => void;
}

// -- UnifiedColorSwatch --------------------------------------------------------

const UnifiedColorSwatch: React.FC<{
  textColor: string;
  bgColor: string;
  disabled?: boolean;
  onPickText: (v: string) => void;
  onPickBg: (v: string) => void;
}> = ({ textColor, bgColor, disabled = false, onPickText, onPickBg }) => {
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
        onMouseDown={(e) => {
          e.preventDefault();
          if (!disabled) setOpen((o) => !o);
        }}
        disabled={disabled}
        className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100 border border-slate-200 transition disabled:opacity-40"
        title={wsl.colorBtn}
        aria-label={wsl.colorBtn}
      >
        <span className="relative w-4 h-4">
          <span className="absolute inset-0 rounded-sm border border-slate-300" style={{ background: textColor || '#000000' }} />
          <span className="absolute right-0 bottom-0 w-2.5 h-2.5 rounded-sm border border-white" style={{ background: bgColor || 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 6px 6px' }} />
        </span>
      </button>
      {open && !disabled && (
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
  canActivate: boolean;
  canDelete: boolean;
  labels: Pick<SurfaceModeLabels, 'pageNameTip' | 'pageMenu' | 'savePage' | 'deletePage'>;
  onActivate: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onSavePage: () => void;
  onDelete: () => void;
}

const PageTab: React.FC<PageTabProps> = ({
  page, isActive, readOnly, canActivate, canDelete, labels, onActivate, onRename, onDuplicate, onSavePage, onDelete,
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
          : canActivate
            ? 'bg-slate-50 border-transparent hover:bg-slate-100 cursor-pointer'
            : 'bg-slate-50 border-transparent'
      }`}
      onClick={() => { if (!isActive && canActivate) onActivate(); }}
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
          title={labels.pageNameTip(page.name)}
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
            title={labels.pageMenu}
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
                {labels.savePage}
              </button>
              {canDelete && (
                <>
                  <div className="h-px bg-slate-100 my-0.5" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                  >
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M4 4l1 9h6l1-9"/></svg>
                    {labels.deletePage}
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
    try { return getScopedStorageItem(BASE_UI_LANGUAGE_STORAGE_KEY) ?? 'pt'; } catch { return 'pt'; }
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

interface StableResizeHandleProps {
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
}

const StableResizeHandle: React.FC<StableResizeHandleProps> = ({ onPointerDown }) => (
  <div
    onPointerDown={onPointerDown}
    className="absolute bottom-0 right-0 z-30 flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded-tl bg-blue-500/20"
  >
    <svg width="8" height="8" viewBox="0 0 8 8" fill="#2563eb"><path d="M0 8 L8 0 L8 8 Z" /></svg>
  </div>
);

interface StableFloatingBlockProps {
  item: WorkspaceItem;
  isSelected: boolean;
  readOnly: boolean;
  isSlidesMode: boolean;
  currentUserId: string;
  currentUserEmail?: string | null;
  viewerContext: WorkspaceViewerContext;
  viewerIsStudent: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  assignableStudents: AssignableStudentOption[];
  boxFlowLabels: ReturnType<typeof getWorkspaceBoxFlowLabels>;
  getCanvasMetrics: () => { width: number; height: number };
  onSelect: () => void;
  onPointerDownMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerDownResize: (e: ReactPointerEvent<HTMLElement>) => void;
  onContentChange: (html: string) => void;
  onUpdateItem: (id: string, patch: Partial<WorkspaceItem>, options?: { forceSave?: boolean }) => void;
  onEditorTyping?: () => void;
  onEditorFocus: (id: string, el: HTMLElement) => void;
  onEditorBlur: () => void;
}

const StableFloatingBlock: React.FC<StableFloatingBlockProps> = React.memo(({
  item,
  isSelected,
  readOnly,
  isSlidesMode,
  currentUserId,
  currentUserEmail,
  viewerContext,
  viewerIsStudent,
  canvasRef,
  assignableStudents,
  boxFlowLabels,
  getCanvasMetrics,
  onSelect,
  onPointerDownMove,
  onPointerDownResize,
  onContentChange,
  onUpdateItem,
  onEditorTyping,
  onEditorFocus,
  onEditorBlur,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const lastTypedAtRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const ownerMenuRef = useRef<HTMLDivElement>(null);
  const FLOATING_GUARD_MS = 1500;
  const LOCK_TIMEOUT_MS = 60_000;

  const isLockedByOther = Boolean(
    item.editingByUserId &&
      item.editingByUserId !== currentUserId &&
      Date.now() - (item.editingStartedAt ?? 0) < LOCK_TIMEOUT_MS,
  );
  const lockOwnerName = item.editingByUserName || item.editingByUserId;
  const resolvedOwner = resolveAssignableOwner(item, assignableStudents);
  const resolvedOwnerUid = resolvedOwner?.uid ?? item.ownerUserId ?? null;
  const resolvedOwnerEmail = resolvedOwner?.email ?? item.ownerEmail ?? null;
  const canManageThisBox = canManageBox(viewerContext, item);
  const isOwner =
    isBoxOwner(viewerContext, item) ||
    Boolean(
      resolvedOwnerUid && resolvedOwnerUid === viewerContext.userId
    ) ||
    Boolean(
      resolvedOwnerEmail &&
      viewerContext.userEmail &&
      normalizeEmail(resolvedOwnerEmail) === normalizeEmail(viewerContext.userEmail)
    ) ||
    Boolean(
      resolvedOwnerEmail &&
      viewerContext.userEmail &&
      getEmailLocalPart(resolvedOwnerEmail) === getEmailLocalPart(viewerContext.userEmail)
    );
  const canBypassReadonlyForBox = canManageThisBox || isOwner;
  const canEditThisContent = (canManageThisBox || isOwner) && (!readOnly || canBypassReadonlyForBox);
  const canRenameThisBox = canRenameBox(viewerContext, item);
  const canAssignThisBox = canAssignBoxOwner(viewerContext, item);
  const canMoveThisBox = canMoveBox(viewerContext, item) && (!readOnly || canBypassReadonlyForBox);
  const canResizeThisBox = canResizeBox(viewerContext, item) && (!readOnly || canBypassReadonlyForBox);
  const isOwnedByOther = Boolean(
    !canManageThisBox &&
      (
        (item.ownerUserId && item.ownerUserId !== currentUserId) ||
        (!item.ownerUserId && resolvedOwnerEmail && currentUserEmail && normalizeEmail(resolvedOwnerEmail) !== normalizeEmail(currentUserEmail))
      ),
  );

  const [blockStyle, setBlockStyle] = useState<React.CSSProperties>({});
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(item.label || '');
  const [assigningOwner, setAssigningOwner] = useState(false);
  const [ownerQuery, setOwnerQuery] = useState('');

  const ownerBadgeLabel =
    item.ownerName?.trim() ||
    resolvedOwner?.label?.trim() ||
    resolvedOwnerEmail?.trim() ||
    (resolvedOwnerUid ? resolvedOwnerUid.slice(0, 6) : '');
  const boxRoleBadgeLabel =
    item.boxRole === 'student'
      ? boxFlowLabels.studentBadge
      : item.boxRole === 'content'
        ? boxFlowLabels.contentBadge
        : null;
  const filteredAssignableStudents = assignableStudents.filter((student) => {
    const query = ownerQuery.trim().toLowerCase();
    if (!query) return true;
    return student.label.toLowerCase().includes(query) || (student.email ?? '').toLowerCase().includes(query);
  });
  const isSlideContentBox = isSlidesMode && item.boxRole === 'content';
  const autoResizeStudentBox = useCallback(() => {
    if (item.type !== 'text' || item.boxRole !== 'student') return;
    const el = contentRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      const { height: canvasHeight } = getCanvasMetrics();
      if (!canvasHeight || canvasHeight <= 1) return;

      const desiredHeightPx = Math.max(el.scrollHeight + 6, el.clientHeight);
      const nextHeightPercent = clamp(
        (desiredHeightPx / canvasHeight) * 100,
        10,
        Math.max(10, 100 - item.y),
      );

      if (Math.abs(nextHeightPercent - item.h) < 0.5) return;
      onUpdateItem(item.id, { h: nextHeightPercent }, { forceSave: canEditThisContent || canManageThisBox });
    });
  }, [
    canEditThisContent,
    canManageThisBox,
    getCanvasMetrics,
    item.boxRole,
    item.h,
    item.id,
    item.type,
    item.y,
    onUpdateItem,
  ]);

  const handleHeaderPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!canMoveThisBox) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-box-no-drag="true"]')) return;
    onPointerDownMove(e);
  };

  useEffect(() => {
    setLabelValue(item.label || '');
  }, [item.label]);

  useEffect(() => {
    if (editingLabel) inputRef.current?.focus();
  }, [editingLabel]);

  useEffect(() => {
    if (!assigningOwner) {
      setOwnerQuery('');
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (ownerMenuRef.current && !ownerMenuRef.current.contains(event.target as Node)) {
        setAssigningOwner(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [assigningOwner]);

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
      currentUserEmail,
      ownerUserId: item.ownerUserId ?? null,
      ownerEmail: item.ownerEmail ?? null,
      canEdit: canEditThisContent,
    });
  }, [
    canEditThisContent,
    currentUserEmail,
    currentUserId,
    item.id,
    item.ownerEmail,
    item.ownerUserId,
    viewerIsStudent,
  ]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el || item.type !== 'text') return;
    const isTyping = Date.now() - lastTypedAtRef.current < FLOATING_GUARD_MS;
    const isFocusedLocally = document.activeElement === el && canEditThisContent && !isLockedByOther;
    if (isFocusedLocally) return;
    if (isTyping) return;
    if (el.innerHTML !== (item.content ?? '')) el.innerHTML = item.content ?? '';
    autoResizeStudentBox();
  }, [autoResizeStudentBox, canEditThisContent, isLockedByOther, item.content, item.type]);

  useEffect(() => {
    const update = () => {
      const { width, height } = getCanvasMetrics();
      setBlockStyle({
        position: 'absolute',
        left: `${(item.x / 100) * width}px`,
        top: `${(item.y / 100) * height}px`,
        width: `${(item.w / 100) * width}px`,
        height: `${(item.h / 100) * height}px`,
        zIndex: isSelected ? 50 : 10,
        pointerEvents: readOnly && !canBypassReadonlyForBox ? 'none' : 'auto',
        boxSizing: 'border-box',
        border: isSelected ? '2px solid #2563eb' : '1px dashed #94a3b8',
        borderRadius: '6px',
        overflow: 'hidden',
        background: item.type === 'text' ? (item.styles?.bgColor || '#ffffff') : 'transparent',
        cursor: 'default',
        userSelect: 'text',
        touchAction: 'none',
        boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,0.2)' : '0 2px 8px rgba(0,0,0,0.08)',
      });
    };
    update();
    const obs = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (obs && canvasRef.current) obs.observe(canvasRef.current);
    return () => obs?.disconnect();
  }, [canvasRef, canBypassReadonlyForBox, canMoveThisBox, getCanvasMetrics, isSelected, item, readOnly]);

  const saveLabel = () => {
    if (!canRenameThisBox) {
      setEditingLabel(false);
      return;
    }
    const newLabel = labelValue.trim();
    const matchedStudent =
      item.boxRole === 'student'
        ? assignableStudents.find((student) => {
            const labelMatch = normalizeLooseText(student.label) === normalizeLooseText(newLabel);
            const emailMatch = normalizeLooseText(getEmailLocalPart(student.email)) === normalizeLooseText(newLabel);
            return labelMatch || emailMatch;
          }) ?? null
        : null;

    onUpdateItem(item.id, {
      label: newLabel || undefined,
      ...(matchedStudent
        ? {
            ownerUserId: matchedStudent.uid,
            ownerName: matchedStudent.label,
            ownerEmail: matchedStudent.email ?? undefined,
          }
        : {}),
    });
    setEditingLabel(false);
  };

  if (item.type === 'image') {
    return (
      <div
        style={blockStyle}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {canMoveThisBox && (
          <div onPointerDown={onPointerDownMove} className="absolute inset-0 z-10 cursor-grab" style={{ background: 'transparent' }} />
        )}
        <img src={item.imageUrl} alt="" className="pointer-events-none h-full w-full select-none object-contain" draggable={false} style={{ background: 'transparent' }} />
        {isSelected && canResizeThisBox && <StableResizeHandle onPointerDown={onPointerDownResize} />}
      </div>
    );
  }

  return (
    <div
      style={blockStyle}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {isSlideContentBox && isSelected && canMoveThisBox ? (
        <button
          type="button"
          data-box-no-drag="true"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onPointerDownMove(event);
          }}
          className="pointer-events-auto absolute left-2 top-2 z-30 flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-900/65 px-2 text-[10px] font-bold text-white shadow-lg transition hover:bg-slate-900"
          title={boxFlowLabels.move}
        >
          ⋮⋮
        </button>
      ) : null}
      {!isSlideContentBox ? (
      <div
        className={`pointer-events-auto absolute inset-x-0 top-0 z-30 border-b border-slate-200 bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 ${canMoveThisBox ? 'cursor-grab' : ''}`}
        onPointerDown={handleHeaderPointerDown}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {!editingLabel ? (
              <span
                data-box-no-drag="true"
                onClick={canRenameThisBox ? () => setEditingLabel(true) : undefined}
                className={canRenameThisBox ? 'cursor-pointer' : ''}
              >
                {item.label?.trim() ? item.label : boxFlowLabels.boxLabel}
              </span>
            ) : (
              <input
                data-box-no-drag="true"
                ref={inputRef}
                value={labelValue}
                placeholder={boxFlowLabels.boxLabel}
                title={boxFlowLabels.boxLabel}
                onChange={(e) => setLabelValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(); }}
                onBlur={saveLabel}
                className="flex-1 rounded border border-slate-300 bg-white px-1 py-0 text-[11px] font-semibold text-slate-700"
              />
            )}
            {boxRoleBadgeLabel ? (
              <span className={`rounded px-1.5 py-0.5 text-[9px] ${item.boxRole === 'student' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'}`}>
                {boxRoleBadgeLabel}
              </span>
            ) : null}
            {(resolvedOwnerUid || item.ownerUserId) && ownerBadgeLabel ? (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">
                {ownerBadgeLabel}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            {canAssignThisBox && isSelected ? (
              <button
                data-box-no-drag="true"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAssigningOwner((prev) => !prev);
                }}
                className="rounded px-1.5 py-0.5 text-[9px] transition hover:bg-slate-200"
                type="button"
              >
                👤
              </button>
            ) : null}
            {isLockedByOther ? (
              <span className="text-[9px] font-normal text-slate-500">Editing by {lockOwnerName}</span>
            ) : null}
          </div>
        </div>
        {assigningOwner && canAssignThisBox ? (
          <div
            ref={ownerMenuRef}
            data-box-no-drag="true"
            className="mt-2 rounded-lg border border-slate-200 bg-white shadow-lg"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-2 py-1.5">
              <div className="mb-1 text-[10px] font-semibold text-slate-600">{boxFlowLabels.selectStudent}</div>
               <input
                 data-box-no-drag="true"
                 type="text"
                 value={ownerQuery}
                onChange={(e) => setOwnerQuery(e.target.value)}
                placeholder={boxFlowLabels.searchStudent}
                className="w-full rounded border border-slate-300 px-2 py-1 text-[10px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                autoFocus
              />
            </div>
            <div className="max-h-40 overflow-y-auto py-1">
               <button
                 data-box-no-drag="true"
                 type="button"
                className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-[10px] text-slate-600 transition hover:bg-slate-50"
                  onClick={() => {
                    onUpdateItem(item.id, {
                      ownerUserId: undefined,
                      ownerName: undefined,
                      ownerEmail: undefined,
                      ...(item.boxRole === 'student' ? { label: undefined } : {}),
                    });
                    setAssigningOwner(false);
                  }}
              >
                <span>{boxFlowLabels.clearOwner}</span>
              </button>
              {filteredAssignableStudents.map((student) => (
                <button
                  data-box-no-drag="true"
                  key={student.uid}
                  type="button"
                  className={`flex w-full items-start justify-between gap-2 px-2 py-1.5 text-left transition hover:bg-slate-50 ${item.ownerUserId === student.uid ? 'bg-blue-50' : ''}`}
                  onClick={() => {
                    onUpdateItem(item.id, {
                      ownerUserId: student.uid,
                      ownerName: student.label,
                      ownerEmail: student.email ?? undefined,
                      label: item.label?.trim() ? item.label : student.label,
                    });
                    setAssigningOwner(false);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[10px] font-medium text-slate-700">{student.label}</span>
                    <span className="block truncate text-[9px] text-slate-500">{student.email ?? student.uid}</span>
                  </span>
                  {student.isOnline ? <span className="text-[9px] text-emerald-600">online</span> : null}
                </button>
              ))}
              {filteredAssignableStudents.length === 0 ? (
                <div className="px-2 py-2 text-[10px] text-slate-400">{boxFlowLabels.none}</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      ) : null}
      <div
        ref={contentRef}
        contentEditable={canEditThisContent && !isLockedByOther}
        suppressContentEditableWarning
        spellCheck
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => {
          onSelect();
          onEditorFocus(item.id, e.currentTarget);
        }}
        onBlur={(e) => {
          onEditorBlur();
          if (!canEditThisContent || isLockedByOther) return;
          onContentChange((e.target as HTMLDivElement).innerHTML);
          autoResizeStudentBox();
        }}
        onInput={(e) => {
          if (!canEditThisContent || isLockedByOther) {
            e.currentTarget.blur();
            return;
          }
          lastTypedAtRef.current = Date.now();
          onContentChange((e.target as HTMLDivElement).innerHTML);
          autoResizeStudentBox();
          onEditorTyping?.();
        }}
        className="h-full w-full overflow-auto p-2 leading-snug focus:outline-none"
        style={{
          fontFamily: 'Arial, sans-serif',
          fontSize: `${item.styles?.fontSize ?? 14}px`,
          color: item.styles?.color ?? '#1e293b',
          paddingTop: isSlideContentBox ? '0.75rem' : isSelected ? '2.1rem' : '0.5rem',
          cursor: !canEditThisContent || isLockedByOther ? 'not-allowed' : 'text',
          wordBreak: 'break-word',
          opacity: isOwnedByOther ? 0.65 : isLockedByOther ? 0.85 : 1,
        }}
      />
      {isSelected && canResizeThisBox ? <StableResizeHandle onPointerDown={onPointerDownResize} /> : null}
    </div>
  );
});

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
  onOpenBattleTemplate,
  onPresentationModeChange,
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
  const viewerCanEditSharedDocument = viewerCanManageWorkspace && !readOnly;
  const viewerCanManagePages = viewerCanManageWorkspace && !readOnly;
  const effectiveReadOnly = readOnly || (viewerIsStudent && !studentEditingEnabled);
  const toolbarDisabled = effectiveReadOnly;

  if (!userId) {
    console.error('[WorkspaceCanvas] userId is null/undefined! This will break save/load functionality');
    alert('Erro: userId n�o fornecido. A funcionalidade de salvar/carregar materiais n�o funcionar�.');
  }

  const uiLang: 'en' | 'pt' | 'es' = getScopedUiLanguage();
  const wsl = getWsl();
  const [surfaceMode, setSurfaceMode] = useState<WorkspaceSurfaceMode>('document');
  const surfaceModeRef = useRef<WorkspaceSurfaceMode>('document');
  const surfaceLabels = useMemo(
    () => getSurfaceModeLabels(uiLang, surfaceMode, wsl),
    [surfaceMode, uiLang, wsl],
  );
  const isSlidesMode = surfaceMode === 'slides';
  const boardLabels = useMemo(
    () => getSurfaceModeLabels(uiLang, 'document', wsl),
    [uiLang, wsl],
  );
  const slideLabels = useMemo(
    () => getSurfaceModeLabels(uiLang, 'slides', wsl),
    [uiLang, wsl],
  );
  const boxFlowLabels = getWorkspaceBoxFlowLabels();
  const createDefaultSurfaceState = useCallback(
    (mode: WorkspaceSurfaceMode, pageId: string): WorkspaceSurfaceState => {
      const labels = mode === 'slides' ? slideLabels : boardLabels;
      return {
        pages: [{ id: pageId, name: labels.pageName(1), backgroundColor: '#ffffff', docContent: '', items: [] }],
        currentPageId: pageId,
        docContent: '',
        items: [],
      };
    },
    [boardLabels, slideLabels],
  );
  const initialBoardPageId = useRef<string>(uid()).current;
  const initialSlidePageId = useRef<string>(uid()).current;
  const boardInitialStateRef = useRef<WorkspaceSurfaceState | null>(null);
  const slidesInitialStateRef = useRef<WorkspaceSurfaceState | null>(null);
  if (!boardInitialStateRef.current) {
    boardInitialStateRef.current = createDefaultSurfaceState('document', initialBoardPageId);
  }
  if (!slidesInitialStateRef.current) {
    slidesInitialStateRef.current = createDefaultSurfaceState('slides', initialSlidePageId);
  }
  const surfaceStatesRef = useRef<Record<WorkspaceSurfaceMode, WorkspaceSurfaceState>>({
    document: boardInitialStateRef.current,
    slides: slidesInitialStateRef.current,
  });
  const [items, setItems] = useState<WorkspaceItem[]>(surfaceStatesRef.current.document.items);
  const [docHtml, setDocHtml] = useState<string>(surfaceStatesRef.current.document.docContent);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingImageUpload, setPendingImageUpload] = useState(false);
  const [fontFamily, setFontFamily] = useState<string>(FONT_FAMILIES[0].v);
  const [fontSize, setFontSize] = useState<number>(16);
  const [textColor, setTextColor] = useState<string>('#000000');
  const [bgColor, setBgColor] = useState<string>('');
  const [textAlign, setTextAlign] = useState<AlignValue>('left');
  const [presentationMode, setPresentationMode] = useState(false);
  const [slidePanelVisible, setSlidePanelVisible] = useState(true);
  const [slidePanelPosition, setSlidePanelPosition] = useState<{ x: number; y: number } | null>(null);
  const [slidePanelSize, setSlidePanelSize] = useState<{ width: number; height: number }>({ width: 224, height: 520 });
  const slidePanelDragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const slidePanelResizeOriginRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const getDefaultSlidePanelPosition = useCallback(() => {
    if (typeof window === 'undefined') {
      return { x: 24, y: 112 };
    }

    const panelWidth = slidePanelSize.width;
    return {
      x: Math.max(24, window.innerWidth - panelWidth - 24),
      y: 112,
    };
  }, [slidePanelSize.width]);
  const normalizeItemScope = useCallback(
    (item: WorkspaceItem): WorkspaceItem => ({
      ...item,
      classId: item.classId ?? classId,
      teacherUserId: item.teacherUserId ?? classTeacherUserId ?? undefined,
    }),
    [classId, classTeacherUserId],
  );

  // -- Page state (---------------------------------------------------------------
  // The �pages� array owns names / IDs and the content snapshots of INACTIVE pages.
  // The ACTIVE page�s live content lives in the existing docHtml / items state.
  // On page switch (or save), we �flush� docRef.current.innerHTML + items into pages first.
  const [pages, setPages] = useState<WorkspacePage[]>(surfaceStatesRef.current.document.pages);
  const [activePageId, setActivePageId] = useState<string>(surfaceStatesRef.current.document.currentPageId);
  // Refs are kept in sync manually (no useEffect delay) so closures always see latest.
  const pagesRef = useRef<WorkspacePage[]>(surfaceStatesRef.current.document.pages);
  const activePageIdRef = useRef<string>(surfaceStatesRef.current.document.currentPageId);
  const updateSurfaceStateRef = useCallback(
    (
      mode: WorkspaceSurfaceMode,
      updater: (current: WorkspaceSurfaceState) => WorkspaceSurfaceState,
    ) => {
      const currentState =
        surfaceStatesRef.current[mode] ??
        createDefaultSurfaceState(mode, uid());
      surfaceStatesRef.current[mode] = updater(currentState);
    },
    [createDefaultSurfaceState],
  );
  const applySurfaceState = useCallback((mode: WorkspaceSurfaceMode, nextState: WorkspaceSurfaceState) => {
    const normalizedPages = normalizeWorkspacePages(nextState.pages as Partial<WorkspacePage>[]);
    const fallbackState = createDefaultSurfaceState(mode, uid());
    const resolvedPages = normalizedPages.length > 0 ? normalizedPages : fallbackState.pages;
    const resolvedCurrentPageId =
      resolvedPages.find((page) => page.id === nextState.currentPageId)?.id ??
      resolvedPages[0]?.id ??
      fallbackState.currentPageId;
    const activePage =
      resolvedPages.find((page) => page.id === resolvedCurrentPageId) ??
      resolvedPages[0] ??
      fallbackState.pages[0];
    const resolvedState: WorkspaceSurfaceState = {
      pages: resolvedPages,
      currentPageId: resolvedCurrentPageId,
      docContent: activePage.docContent ?? nextState.docContent ?? '',
      items: activePage.items ?? nextState.items ?? [],
    };

    surfaceStatesRef.current[mode] = resolvedState;
    pagesRef.current = resolvedState.pages;
    activePageIdRef.current = resolvedState.currentPageId;
    setPages(resolvedState.pages);
    setActivePageId(resolvedState.currentPageId);
    setDocHtml(resolvedState.docContent);
    if (docRef.current) docRef.current.innerHTML = resolvedState.docContent;
    setItems(resolvedState.items.map(normalizeItemScope));
    setSelectedId(null);
  }, [createDefaultSurfaceState, normalizeItemScope]);
  const syncActivePageDocRef = useCallback((html: string) => {
    const nextPages = pagesRef.current.map((page) =>
      page.id === activePageIdRef.current ? { ...page, docContent: html } : page,
    );
    pagesRef.current = nextPages;
    updateSurfaceStateRef(surfaceModeRef.current, (current) => ({
      ...current,
      pages: nextPages,
      currentPageId: activePageIdRef.current,
      docContent: html,
      items: itemsRef.current,
    }));
    return nextPages;
  }, [updateSurfaceStateRef]);
  const syncActivePageItemsRef = useCallback((nextItems: WorkspaceItem[], shouldUpdateState = false) => {
    const nextPages = pagesRef.current.map((page) =>
      page.id === activePageIdRef.current ? { ...page, items: nextItems } : page,
    );
    pagesRef.current = nextPages;
    updateSurfaceStateRef(surfaceModeRef.current, (current) => ({
      ...current,
      pages: nextPages,
      currentPageId: activePageIdRef.current,
      docContent: docRef.current?.innerHTML ?? docHtml,
      items: nextItems,
    }));
    if (shouldUpdateState) {
      setPages(nextPages);
    }
    return nextPages;
  }, [docHtml, updateSurfaceStateRef]);


  // -- Materials state ------------------------------------------------------
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMaterialTitle, setSaveMaterialTitle] = useState('');
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [materialsList, setMaterialsList] = useState<WorkspaceMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingMaterialId, setLoadingMaterialId] = useState<string | null>(null);
  const [deletingMaterialId, setDeletingMaterialId] = useState<string | null>(null);
  const [battleTemplatesList, setBattleTemplatesList] = useState<StoredBattleTemplate[]>([]);
  const [loadingBattleTemplates, setLoadingBattleTemplates] = useState(false);
  const [deletingBattleTemplateId, setDeletingBattleTemplateId] = useState<string | null>(null);
  const [saveSinglePageId, setSaveSinglePageId] = useState<string | null>(null);
  const [openLibraryTab, setOpenLibraryTab] = useState<'materials' | BattleTemplateLanguage>('materials');
  const battleTemplatesByLanguage = useMemo(() => {
    return BATTLE_LIBRARY_LANGUAGE_TABS.reduce<Record<BattleTemplateLanguage, StoredBattleTemplate[]>>(
      (accumulator, languageTab) => {
        accumulator[languageTab.value] = battleTemplatesList.filter(
          (template) => getSavedBattleTemplateLanguage(template) === languageTab.value,
        );
        return accumulator;
      },
      {
        pt: [],
        es: [],
        en: [],
        el: [],
        he: [],
      },
    );
  }, [battleTemplatesList]);

  useEffect(() => {
    if (!isSlidesMode && presentationMode) {
      setPresentationMode(false);
    }
  }, [isSlidesMode, presentationMode]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (!presentationMode) {
      delete document.body.dataset.workspacePresentation;
      return undefined;
    }

    document.body.dataset.workspacePresentation = 'true';
    return () => {
      delete document.body.dataset.workspacePresentation;
    };
  }, [presentationMode]);

  useEffect(() => {
    onPresentationModeChange?.(presentationMode);
  }, [onPresentationModeChange, presentationMode]);

  useEffect(() => {
    if (!isSlidesMode) {
      setSlidePanelPosition(null);
      return;
    }
    if (slidePanelPosition) return;
    setSlidePanelPosition(getDefaultSlidePanelPosition());
  }, [getDefaultSlidePanelPosition, isSlidesMode, slidePanelPosition]);

  useEffect(() => {
    if (!isSlidesMode) {
      setSlidePanelVisible(true);
      setSlidePanelPosition(null);
    }
  }, [isSlidesMode]);

  const navigateSlides = useCallback((direction: 'previous' | 'next') => {
    if (!isSlidesMode) return;
    const activeIndex = pages.findIndex((page) => page.id === activePageIdRef.current);
    const targetIndex = direction === 'previous' ? activeIndex - 1 : activeIndex + 1;
    const targetPage = pages[targetIndex];
    if (!targetPage) return;
    switchPage(targetPage.id);
  }, [isSlidesMode, pages]);

  useEffect(() => {
    if (!presentationMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPresentationMode(false);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateSlides('next');
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateSlides('previous');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateSlides, presentationMode]);

  const handleSlidePanelPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (presentationMode) return;
    event.preventDefault();
    event.stopPropagation();

    const basePosition = slidePanelPosition ?? getDefaultSlidePanelPosition();
    slidePanelDragOffsetRef.current = {
      x: event.clientX - basePosition.x,
      y: event.clientY - basePosition.y,
    };

    const handleMove = (moveEvent: PointerEvent) => {
      const panel = document.getElementById('workspace-slide-panel');
      const offset = slidePanelDragOffsetRef.current;
      if (!panel || !offset) return;

      const maxX = Math.max(24, window.innerWidth - panel.offsetWidth - 24);
      const maxY = Math.max(24, window.innerHeight - panel.offsetHeight - 24);
      const nextX = Math.min(Math.max(24, moveEvent.clientX - offset.x), maxX);
      const nextY = Math.min(Math.max(24, moveEvent.clientY - offset.y), maxY);
      setSlidePanelPosition({ x: nextX, y: nextY });
    };

    const handleUp = () => {
      slidePanelDragOffsetRef.current = null;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [getDefaultSlidePanelPosition, presentationMode, slidePanelPosition]);

  const handleSlidePanelResizePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (presentationMode) return;
    event.preventDefault();
    event.stopPropagation();

    slidePanelResizeOriginRef.current = {
      x: event.clientX,
      y: event.clientY,
      width: slidePanelSize.width,
      height: slidePanelSize.height,
    };

    const handleMove = (moveEvent: PointerEvent) => {
      const origin = slidePanelResizeOriginRef.current;
      const position = slidePanelPosition ?? getDefaultSlidePanelPosition();
      if (!origin) return;

      const maxWidth = Math.max(220, window.innerWidth - position.x - 24);
      const maxHeight = Math.max(240, window.innerHeight - position.y - 24);
      const nextWidth = clamp(origin.width + (moveEvent.clientX - origin.x), 220, Math.min(420, maxWidth));
      const nextHeight = clamp(origin.height + (moveEvent.clientY - origin.y), 240, Math.min(720, maxHeight));
      setSlidePanelSize({ width: nextWidth, height: nextHeight });
    };

    const handleUp = () => {
      slidePanelResizeOriginRef.current = null;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [getDefaultSlidePanelPosition, presentationMode, slidePanelPosition, slidePanelSize.height, slidePanelSize.width]);

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
  const saveSingleItemDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDocDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingItemsSaveRef = useRef<{
    items: WorkspaceItem[];
    pages: WorkspacePage[];
    currentPageId: string;
  } | null>(null);
  const pendingSingleItemSaveRef = useRef<Record<string, {
    item: WorkspaceItem;
    currentPageId: string;
    forceSave?: boolean;
  }>>({});
  const pendingDocSaveRef = useRef<{
    html: string;
    pages: WorkspacePage[];
    currentPageId: string;
  } | null>(null);
  const itemsRef = useRef<WorkspaceItem[]>([]);
  const lastItemsSaveAtRef = useRef<number>(0);
  const lastSingleItemSaveAtRef = useRef<number>(0);
  const lastDocSaveAtRef = useRef<number>(0);
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
  const dirtyItemTimestampsRef = useRef<Record<string, number>>({});
  const deletedItemTimestampsRef = useRef<Record<string, number>>({});
  const [userAccounts, setUserAccounts] = useState<UserAccountProfile[]>([]);

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

  const assignableStudents: AssignableStudentOption[] = useMemo(
    () =>
      assignedRoster
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
        .filter((option): option is AssignableStudentOption => Boolean(option)),
    [assignedRoster, userAccounts],
  );

  const canEditResolvedBoxContent = useCallback(
    (item: WorkspaceItem) => {
      if (canManageBox(viewerContext, item)) return true;
      const resolvedOwner = resolveAssignableOwner(item, assignableStudents);
      if (resolvedOwner?.uid && resolvedOwner.uid === userId) return true;
      if (resolvedOwner?.email && userEmail && normalizeEmail(resolvedOwner.email) === normalizeEmail(userEmail)) return true;
      if (resolvedOwner?.email && userEmail && getEmailLocalPart(resolvedOwner.email) === getEmailLocalPart(userEmail)) return true;
      return isBoxOwner(viewerContext, item);
    },
    [assignableStudents, userEmail, userId, viewerContext],
  );

  const getCanvasMetrics = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { width: 1, height: 1 };
    }

    return {
      width: Math.max(canvas.offsetWidth, 1),
      height: Math.max(canvas.scrollHeight, canvas.offsetHeight, 1),
    };
  }, []);

  const pruneItemSyncGuards = useCallback((now = Date.now()) => {
    const maxAgeMs = ITEM_GUARD_MS * 4;

    Object.entries(dirtyItemTimestampsRef.current).forEach(([itemId, timestamp]) => {
      if (now - timestamp > maxAgeMs) {
        delete dirtyItemTimestampsRef.current[itemId];
      }
    });

    Object.entries(deletedItemTimestampsRef.current).forEach(([itemId, timestamp]) => {
      if (now - timestamp > maxAgeMs) {
        delete deletedItemTimestampsRef.current[itemId];
      }
    });
  }, [ITEM_GUARD_MS]);

  const markItemDirty = useCallback((itemId: string, timestamp = Date.now()) => {
    dirtyItemTimestampsRef.current[itemId] = timestamp;
    delete deletedItemTimestampsRef.current[itemId];
    lastItemEditRef.current = timestamp;
    pruneItemSyncGuards(timestamp);
  }, [pruneItemSyncGuards]);

  const markItemsDirty = useCallback((itemIds: string[], timestamp = Date.now()) => {
    itemIds.forEach((itemId) => {
      dirtyItemTimestampsRef.current[itemId] = timestamp;
      delete deletedItemTimestampsRef.current[itemId];
    });
    lastItemEditRef.current = timestamp;
    pruneItemSyncGuards(timestamp);
  }, [pruneItemSyncGuards]);

  const markItemDeleted = useCallback((itemId: string, timestamp = Date.now()) => {
    deletedItemTimestampsRef.current[itemId] = timestamp;
    delete dirtyItemTimestampsRef.current[itemId];
    lastItemEditRef.current = timestamp;
    pruneItemSyncGuards(timestamp);
  }, [pruneItemSyncGuards]);

  const mergeRemoteItemsWithLocal = useCallback((remoteItems: WorkspaceItem[]) => {
    const now = Date.now();
    pruneItemSyncGuards(now);

    const localItems = itemsRef.current;
    const localById = new Map(localItems.map((item) => [item.id, item]));
    const remoteById = new Map(remoteItems.map((item) => [item.id, item]));
    const mergedItems: WorkspaceItem[] = [];

    remoteItems.forEach((remoteItem) => {
      const localItem = localById.get(remoteItem.id);
      const localDirtyAt = dirtyItemTimestampsRef.current[remoteItem.id] ?? 0;
      const deletedAt = deletedItemTimestampsRef.current[remoteItem.id] ?? 0;
      const isLocallyDirty = now - localDirtyAt < ITEM_GUARD_MS;
      const wasDeletedLocally = now - deletedAt < ITEM_GUARD_MS;

      if (wasDeletedLocally && (!localItem || (localItem.updatedAt ?? 0) <= deletedAt)) {
        return;
      }

      if (localItem && isLocallyDirty && (localItem.updatedAt ?? 0) >= (remoteItem.updatedAt ?? 0)) {
        mergedItems.push(localItem);
        return;
      }

      if (localItem && (localItem.updatedAt ?? 0) > (remoteItem.updatedAt ?? 0)) {
        mergedItems.push(localItem);
        return;
      }

      mergedItems.push(remoteItem);
    });

    localItems.forEach((localItem) => {
      if (remoteById.has(localItem.id)) return;
      const localDirtyAt = dirtyItemTimestampsRef.current[localItem.id] ?? 0;
      const deletedAt = deletedItemTimestampsRef.current[localItem.id] ?? 0;
      const isLocallyDirty = now - localDirtyAt < ITEM_GUARD_MS;
      const wasDeletedLocally = now - deletedAt < ITEM_GUARD_MS;

      if (isLocallyDirty && !wasDeletedLocally) {
        mergedItems.push(localItem);
      }
    });

    return mergedItems;
  }, [ITEM_GUARD_MS, pruneItemSyncGuards]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const unsub = subscribeWorkspace(classId, (data) => {
      const remoteSurfaceMode = data?.surfaceMode ?? 'document';
      const remoteBoardState: WorkspaceSurfaceState = (() => {
        if (data?.boardState?.pages?.length) {
          return {
            pages: normalizeWorkspacePages(data.boardState.pages as Partial<WorkspacePage>[]),
            currentPageId: data.boardState.currentPageId,
            docContent: data.boardState.docContent ?? '',
            items: data.boardState.items ?? [],
          };
        }
        if (remoteSurfaceMode === 'document' && data?.pages?.length) {
          return {
            pages: normalizeWorkspacePages(data.pages as Partial<WorkspacePage>[]),
            currentPageId: data.currentPageId ?? surfaceStatesRef.current.document.currentPageId,
            docContent: data.docContent ?? '',
            items: data.items ?? [],
          };
        }
        return surfaceStatesRef.current.document;
      })();
      const remoteSlidesState: WorkspaceSurfaceState = (() => {
        if (data?.slidesState?.pages?.length) {
          return {
            pages: normalizeWorkspacePages(data.slidesState.pages as Partial<WorkspacePage>[]),
            currentPageId: data.slidesState.currentPageId,
            docContent: data.slidesState.docContent ?? '',
            items: data.slidesState.items ?? [],
          };
        }
        if (remoteSurfaceMode === 'slides' && data?.pages?.length) {
          return {
            pages: normalizeWorkspacePages(data.pages as Partial<WorkspacePage>[]),
            currentPageId: data.currentPageId ?? surfaceStatesRef.current.slides.currentPageId,
            docContent: data.docContent ?? '',
            items: data.items ?? [],
          };
        }
        return surfaceStatesRef.current.slides;
      })();
      surfaceStatesRef.current.document = remoteBoardState;
      surfaceStatesRef.current.slides = remoteSlidesState;
      const remoteState = remoteSurfaceMode === 'slides' ? remoteSlidesState : remoteBoardState;
      const remotePages = remoteState.pages;
      const remoteCurrentPageId = remoteState.currentPageId ?? activePageIdRef.current;
      const remoteActivePage = remotePages?.find((page) => page.id === remoteCurrentPageId) ?? null;
      const normalizedItems = (remoteActivePage?.items ?? remoteState.items ?? []).map(normalizeItemScope);
      const mergedItems = mergeRemoteItemsWithLocal(normalizedItems);
      const nextDocContent = remoteActivePage?.docContent ?? remoteState.docContent ?? '';
      console.log('[LIVECLASS WORKSPACE] snapshot', {
        role: viewerIsTeacher ? 'teacher' : viewerIsStudent ? 'student' : 'viewer',
        liveClassId: classId,
        workspacePath: `liveClasses/${classId}/shared/workspace`,
        battlePath: `liveClasses/${classId}/session/battle`,
        userId,
        currentPageId: remoteCurrentPageId ?? null,
        surfaceMode: remoteSurfaceMode,
        itemCount: normalizedItems.length,
        docLength: nextDocContent.length,
        updatedBy: data?.updatedBy ?? null,
        updatedByName: data?.updatedByName ?? null,
      });
      if (remoteSurfaceMode !== surfaceModeRef.current) {
        surfaceModeRef.current = remoteSurfaceMode;
        setSurfaceMode(remoteSurfaceMode);
        applySurfaceState(remoteSurfaceMode, {
          pages: remotePages,
          currentPageId: remoteCurrentPageId,
          docContent: nextDocContent,
          items: mergedItems,
        });
      }
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
      if (remoteCurrentPageId && !isPageSelfEcho) {
        const remoteCPID = remoteCurrentPageId;
        if (remotePages && remotePages.length > 0) {
          const normalized = remotePages;
          if (remoteCPID !== activePageIdRef.current) {
            applySurfaceState(remoteSurfaceMode, {
              pages: normalized,
              currentPageId: remoteCPID,
              docContent: nextDocContent,
              items: mergedItems,
            });
          } else {
            // Same active page, but pages structure changed (rename/add/delete/duplicate).
            // Update pages metadata; keep active page�s live content.
            const merged = normalized.map((rp) =>
              rp.id === activePageIdRef.current
                ? { ...rp, docContent: nextDocContent, items: mergedItems }
                : rp,
            );
            pagesRef.current = merged;
            setPages(merged);
            updateSurfaceStateRef(remoteSurfaceMode, (current) => ({
              ...current,
              pages: merged,
              currentPageId: remoteCPID,
              docContent: nextDocContent,
              items: mergedItems,
            }));
          }
        } else if (remoteCPID !== activePageIdRef.current) {
          // currentPageId changed but pages array isn�t present (legacy or partial write)
          activePageIdRef.current = remoteCPID;
          setActivePageId(remoteCPID);
          updateSurfaceStateRef(remoteSurfaceMode, (current) => ({
            ...current,
            currentPageId: remoteCPID,
          }));
        }
      }

      console.log(
        `[WS] snap from "${data?.updatedByName ?? '?'}" docBy=${data?.docUpdatedBy?.slice(0,6) ?? '?'} itemsBy=${data?.itemsUpdatedBy?.slice(0,6) ?? '?'} docSelf=${isDocSelfEcho} itemsSelf=${isItemsSelfEcho}`,
      );

      const isLocallyEditingFloating = Boolean(
        activeFloatingIdRef.current &&
          activeFloatingElRef.current &&
          document.activeElement === activeFloatingElRef.current &&
          Date.now() - lastItemEditRef.current < ITEM_GUARD_MS,
      );

      // Items: merge per item so a remote save never clobbers a newer local
      // edit. While a floating box is actively being typed locally, hold off on
      // remote item application for a brief guard window so another student's
      // keystrokes do not keep re-rendering this editor mid-input.
      if (dragRef.current === null && !isLocallyEditingFloating) {
        itemsRef.current = mergedItems;
        setItems(mergedItems);
        syncActivePageItemsRef(mergedItems, true);
      }

      // Doc: suppress remote DOM writes while there is active local typing.
      const isLocallyTyping = Date.now() - lastDocInputRef.current < TYPING_GUARD_MS;
      if (!isLocallyTyping) {
        setDocHtml(nextDocContent);
        if (docRef.current && docRef.current.innerHTML !== nextDocContent) {
          docRef.current.innerHTML = nextDocContent;
        }
        syncActivePageDocRef(nextDocContent);
      }

      if (readOnly && data?.scrollRatio != null && overflowRef.current) {
        const el = overflowRef.current;
        const max = el.scrollHeight - el.clientHeight;
        if (max > 0) el.scrollTop = data.scrollRatio * max;
      }
    });
    return unsub;
  }, [
    applySurfaceState,
    classId,
    normalizeItemScope,
    readOnly,
    syncActivePageDocRef,
    syncActivePageItemsRef,
    updateSurfaceStateRef,
    userId,
    viewerIsStudent,
    viewerIsTeacher,
    mergeRemoteItemsWithLocal,
  ]);

  useEffect(() => () => {
    if (saveItemsDebounce.current) clearTimeout(saveItemsDebounce.current);
    if (saveSingleItemDebounce.current) clearTimeout(saveSingleItemDebounce.current);
    if (saveDocDebounce.current) clearTimeout(saveDocDebounce.current);
    if (scrollDebounce.current) clearTimeout(scrollDebounce.current);
    pendingItemsSaveRef.current = null;
    pendingSingleItemSaveRef.current = {};
    pendingDocSaveRef.current = null;
  }, []);

  const flushPendingItemsSave = useCallback(() => {
    const pending = pendingItemsSaveRef.current;
    if (!pending) return;
    pendingItemsSaveRef.current = null;
    lastItemsSaveAtRef.current = Date.now();
    saveWorkspace(
      classId,
      pending.items,
      userId,
      userName,
      pending.currentPageId,
      pending.pages,
      surfaceModeRef.current,
    ).catch(console.error);
  }, [classId, userId, userName]);

  const flushPendingSingleItemSaves = useCallback(() => {
    const pendingEntries = Object.values(pendingSingleItemSaveRef.current);
    if (pendingEntries.length === 0) return;
    pendingSingleItemSaveRef.current = {};
    lastSingleItemSaveAtRef.current = Date.now();
    pendingEntries.forEach(({ item, currentPageId }) => {
      saveWorkspaceItem(
        classId,
        item,
        userId,
        userName,
        currentPageId,
        surfaceModeRef.current,
      ).catch(console.error);
    });
  }, [classId, userId, userName]);

  const flushFloatingEditorBeforePageMutation = useCallback(() => {
    if (activeFloatingElRef.current && document.activeElement === activeFloatingElRef.current) {
      activeFloatingElRef.current.blur();
    }
    if (saveSingleItemDebounce.current) {
      clearTimeout(saveSingleItemDebounce.current);
      saveSingleItemDebounce.current = null;
    }
    flushPendingSingleItemSaves();
  }, [flushPendingSingleItemSaves]);

  const flushPendingDocSave = useCallback(() => {
    const pending = pendingDocSaveRef.current;
    if (!pending) return;
    pendingDocSaveRef.current = null;
    lastDocSaveAtRef.current = Date.now();
    saveDocContent(
      classId,
      pending.html,
      userId,
      userName,
      pending.currentPageId,
      pending.pages,
      surfaceModeRef.current,
    ).catch(console.error);
  }, [classId, userId, userName]);

  const scheduleItemsSave = useCallback(
    (
      nextItems: WorkspaceItem[],
      options?: { forceSave?: boolean; dirtyItemIds?: string[]; deletedItemIds?: string[] }
    ) => {
      if (effectiveReadOnly && !options?.forceSave) return;
      const editTimestamp = Date.now();
      if (options?.dirtyItemIds?.length) {
        markItemsDirty(options.dirtyItemIds, editTimestamp);
      } else if (nextItems.length > 0) {
        lastItemEditRef.current = editTimestamp;
      }
      options?.deletedItemIds?.forEach((itemId) => markItemDeleted(itemId, editTimestamp));
      const scopedItems = nextItems.map(normalizeItemScope);
      const syncedPages = syncActivePageItemsRef(scopedItems);
      pendingItemsSaveRef.current = {
        items: scopedItems,
        pages: syncedPages,
        currentPageId: activePageIdRef.current,
      };

      if (saveItemsDebounce.current) return;

      const elapsedMs = Date.now() - lastItemsSaveAtRef.current;
      if (elapsedMs >= WORKSPACE_ITEMS_SYNC_DEBOUNCE_MS) {
        flushPendingItemsSave();
        return;
      }

      saveItemsDebounce.current = setTimeout(() => {
        saveItemsDebounce.current = null;
        flushPendingItemsSave();
      }, WORKSPACE_ITEMS_SYNC_DEBOUNCE_MS - elapsedMs);
    },
    [
      effectiveReadOnly,
      flushPendingItemsSave,
      markItemDeleted,
      markItemsDirty,
      normalizeItemScope,
      syncActivePageItemsRef,
    ],
  );

  const scheduleSingleItemSave = useCallback(
    (item: WorkspaceItem, options?: { forceSave?: boolean }) => {
      if (effectiveReadOnly && !options?.forceSave) return;
      markItemDirty(item.id);
      const scopedItem = normalizeItemScope(item);
      pendingSingleItemSaveRef.current[scopedItem.id] = {
        item: scopedItem,
        currentPageId: activePageIdRef.current,
        forceSave: options?.forceSave,
      };

      if (saveSingleItemDebounce.current) return;

      const elapsedMs = Date.now() - lastSingleItemSaveAtRef.current;
      if (elapsedMs >= WORKSPACE_ITEMS_SYNC_DEBOUNCE_MS) {
        flushPendingSingleItemSaves();
        return;
      }

      saveSingleItemDebounce.current = setTimeout(() => {
        saveSingleItemDebounce.current = null;
        flushPendingSingleItemSaves();
      }, WORKSPACE_ITEMS_SYNC_DEBOUNCE_MS - elapsedMs);
    },
    [
      effectiveReadOnly,
      flushPendingSingleItemSaves,
      markItemDirty,
      normalizeItemScope,
    ],
  );

  const scheduleDocSave = useCallback(
    (html: string) => {
      if (effectiveReadOnly) return;
      const syncedPages = syncActivePageDocRef(html);
      pendingDocSaveRef.current = {
        html,
        pages: syncedPages,
        currentPageId: activePageIdRef.current,
      };

      if (saveDocDebounce.current) return;

      const elapsedMs = Date.now() - lastDocSaveAtRef.current;
      if (elapsedMs >= WORKSPACE_DOC_SYNC_DEBOUNCE_MS) {
        flushPendingDocSave();
        return;
      }

      saveDocDebounce.current = setTimeout(() => {
        saveDocDebounce.current = null;
        flushPendingDocSave();
      }, WORKSPACE_DOC_SYNC_DEBOUNCE_MS - elapsedMs);
    },
    [effectiveReadOnly, flushPendingDocSave, syncActivePageDocRef],
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
    if (saveDocDebounce.current) {
      clearTimeout(saveDocDebounce.current);
      saveDocDebounce.current = null;
    }
    flushPendingDocSave();
  };

  const onScrollSync = () => {
    if (effectiveReadOnly || !overflowRef.current) return;
    const el = overflowRef.current;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return;
    const ratio = el.scrollTop / max;
    if (scrollDebounce.current) clearTimeout(scrollDebounce.current);
    scrollDebounce.current = setTimeout(() => {
      saveScrollRatio(classId, ratio).catch(() => {});
    }, 300);
  };

  const normalizeExecCommandFontSize = useCallback((root: HTMLElement | null, size: number) => {
    root?.querySelectorAll('font[size="7"]').forEach((el) => {
      (el as HTMLElement).removeAttribute('size');
      (el as HTMLElement).style.fontSize = `${size}px`;
    });
  }, []);

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
        scheduleItemsSave(next, { dirtyItemIds: [floatingId] });
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
      if (activeFloatingIdRef.current && activeFloatingElRef.current) {
        const floatingId = activeFloatingIdRef.current;
        const floatingEl = activeFloatingElRef.current;
        normalizeExecCommandFontSize(floatingEl, size);
        const html = floatingEl.innerHTML;
        setItems((prev) => {
          const next = prev.map((it) =>
            it.id === floatingId
              ? { ...it, content: html, updatedAt: Date.now(), updatedBy: userId, updatedByName: userName }
              : it,
          );
          scheduleItemsSave(next, { dirtyItemIds: [floatingId] });
          return next;
        });
        return;
      }

      normalizeExecCommandFontSize(docRef.current, size);
      if (!docRef.current) return;
      const html = docRef.current.innerHTML;
      setDocHtml(html);
      scheduleDocSave(html);
    }, 20);
  };
  const applyTextColor = (color: string) => {
    setTextColor(color);
    const hasTextSelection = Boolean(window.getSelection()?.toString().trim());
    if (activeFloatingIdRef.current && !hasTextSelection && selectedId) {
      const item = items.find((i) => i.id === selectedId);
      if (item) {
        updateItem(selectedId, { styles: { ...(item.styles ?? {}), color: color || '#000000' } });
        return;
      }
    }
    execFmt('foreColor', color || '#000000');
  };
  const applyHighlight = (color: string) => {
    setBgColor(color);
    const hasTextSelection = Boolean(window.getSelection()?.toString().trim());
    if (activeFloatingIdRef.current && !hasTextSelection && selectedId) {
      const item = items.find((i) => i.id === selectedId);
      if (item) {
        updateItem(selectedId, { styles: { ...(item.styles ?? {}), bgColor: color || '' } });
        return;
      }
    }
    if (activeFloatingIdRef.current) {
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
    (id: string, patch: Partial<WorkspaceItem>, options?: { forceSave?: boolean }) => {
      setItems((prev) => {
        let updatedItem: WorkspaceItem | null = null;
        const next = prev.map((it) => {
          if (it.id !== id) return it;
          updatedItem = normalizeItemScope({
            ...it,
            ...patch,
            updatedAt: Date.now(),
            updatedBy: userId,
            updatedByName: userName,
          });
          return updatedItem;
        });
        syncActivePageItemsRef(next);
        if (updatedItem) {
          scheduleSingleItemSave(updatedItem, options);
        }
        return next;
      });
    },
    [normalizeItemScope, scheduleSingleItemSave, syncActivePageItemsRef, userId, userName],
  );

  const deleteItem = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.filter((it) => it.id !== id);
        scheduleItemsSave(next, { deletedItemIds: [id] });
        return next;
      });
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
    }, { forceSave: canEditResolvedBoxContent(item) });
  };

  const acquireItemLock = (item: WorkspaceItem) => {
    const canEditThisItem = canEditResolvedBoxContent(item);
    if (!canEditThisItem) return false;
    if (effectiveReadOnly && !canEditThisItem) return false;
    if (isItemLockedByOther(item)) return false;
    updateItem(item.id, {
      editingByUserId: userId,
      editingByUserName: userName,
      editingStartedAt: Date.now(),
    }, { forceSave: canEditThisItem });
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
    const canEditThisItem = canEditResolvedBoxContent(item);
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
    if (saveSingleItemDebounce.current) {
      clearTimeout(saveSingleItemDebounce.current);
      saveSingleItemDebounce.current = null;
    }
    flushPendingSingleItemSaves();
  };

  const addBox = (boxRole: 'content' | 'student' = 'content') => {
    if (effectiveReadOnly || readOnly) return;
    const newItem = normalizeItemScope({
      id: uid(), type: 'text' as WorkspaceItemType,
      boxRole,
      x: boxRole === 'student' ? 4 : 8,
      y: boxRole === 'student' ? 8 : 8,
      w: boxRole === 'student' ? 42 : (isSlidesMode ? 52 : 45),
      h: boxRole === 'student' ? 24 : (isSlidesMode ? 26 : 20),
      content: '',
      label: boxRole === 'student' ? boxFlowLabels.studentBox : '',
      ownerUserId: boxRole === 'student' && viewerIsStudent ? userId : undefined,
      ownerName: boxRole === 'student' && viewerIsStudent ? userName : undefined,
      ownerEmail: boxRole === 'student' && viewerIsStudent ? userEmail ?? undefined : undefined,
      styles: {
        color: '#1e293b',
        fontSize: boxRole === 'student' ? 16 : (isSlidesMode ? 26 : 16),
        bgColor: boxRole === 'student' ? '#f8fafc' : '#ffffff',
      },
      updatedAt: Date.now(), updatedBy: userId, updatedByName: userName,
    });
    setItems((prev) => {
      const next = [...prev, newItem];
      scheduleItemsSave(next, { dirtyItemIds: [newItem.id] });
      return next;
    });
    setSelectedId(newItem.id);
  };

  const addTextBox = () => addBox('content');
  const addStudentBox = () => addBox('student');

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
      setItems((prev) => {
        const next = [...prev, newItem];
        scheduleItemsSave(next, { dirtyItemIds: [newItem.id] });
        return next;
      });
      setSelectedId(newItem.id);
      setPendingImageUpload(false);
    };
    reader.readAsDataURL(file);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>, itemId: string, mode: 'move' | 'resize') => {
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const canBypassReadonlyForBox = canManageBox(viewerContext, item) || isBoxOwner(viewerContext, item);
    const hasPermission = mode === 'move'
      ? canMoveBox(viewerContext, item) && (!effectiveReadOnly || canBypassReadonlyForBox)
      : canResizeBox(viewerContext, item) && (!effectiveReadOnly || canBypassReadonlyForBox);
    if (!hasPermission) return;
    e.preventDefault();
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
      forceSave: effectiveReadOnly && canBypassReadonlyForBox,
    };
    setSelectedId(itemId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !canvasRef.current) return;
    const { width, height } = getCanvasMetrics();
    const dx = ((e.clientX - drag.startPx) / width) * 100;
    const dy = ((e.clientY - drag.startPy) / height) * 100;
    lastItemEditRef.current = Date.now();
    if (drag.mode === 'move') {
      setItems((prev) => prev.map((it) =>
        it.id === drag.itemId
          ? {
              ...it,
              x: clamp(drag.origX + dx, 0, Math.max(0, 100 - it.w)),
              y: clamp(drag.origY + dy, 0, Math.max(0, 100 - it.h)),
            }
          : it));
    } else {
      setItems((prev) => prev.map((it) =>
        it.id === drag.itemId
          ? {
              ...it,
              w: clamp(drag.origW + dx, 10, Math.max(10, 100 - it.x)),
              h: clamp(drag.origH + dy, 5, Math.max(5, 100 - it.y)),
            }
          : it));
    }
  };

  const onPointerUp = () => {
    if (!dragRef.current) return;
    const { itemId, forceSave } = dragRef.current;
    dragRef.current = null;
    setItems((prev) => {
      const next = prev.map((it) =>
        it.id === itemId ? { ...it, updatedAt: Date.now(), updatedBy: userId, updatedByName: userName } : it);
      scheduleItemsSave(next, { forceSave, dirtyItemIds: [itemId] });
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
    updateSurfaceStateRef(surfaceModeRef.current, (current) => ({
      ...current,
      pages: flushed,
      currentPageId: activePageIdRef.current,
      docContent: currentDoc,
      items,
    }));
    return flushed;
  };

  const switchPage = (pageId: string) => {
    if (pageId === activePageIdRef.current || !viewerCanManagePages) return;
    flushFloatingEditorBeforePageMutation();
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
    updateSurfaceStateRef(surfaceModeRef.current, (current) => ({
      ...current,
      pages: flushed,
      currentPageId: pageId,
      docContent: newPage.docContent,
      items: newPage.items,
    }));
    savePageSwitch(classId, flushed, pageId, newPage.docContent, newPage.items, userId, userName, surfaceModeRef.current).catch(console.error);
  };

  const addPage = () => {
    if (!viewerCanManagePages) return;
    flushFloatingEditorBeforePageMutation();
    const flushed = flushPages();
    const newId = uid();
    const newPage: WorkspacePage = { id: newId, name: surfaceLabels.pageName(flushed.length + 1), backgroundColor: '#ffffff', docContent: '', items: [] };
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
    updateSurfaceStateRef(surfaceModeRef.current, () => ({
      pages: updated,
      currentPageId: newId,
      docContent: '',
      items: [],
    }));
    savePageSwitch(classId, updated, newId, '', [], userId, userName, surfaceModeRef.current).catch(console.error);
  };

  const deletePage = (pageId: string) => {
    if (!viewerCanManagePages) return;
    flushFloatingEditorBeforePageMutation();
    const current = pagesRef.current;
    if (current.length <= 1) return; // never delete the last page
    if (!window.confirm(surfaceLabels.confirmDelete)) return;
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
      updateSurfaceStateRef(surfaceModeRef.current, () => ({
        pages: remaining,
        currentPageId: nextPage.id,
        docContent: nextPage.docContent,
        items: nextPage.items,
      }));
      savePageSwitch(classId, remaining, nextPage.id, nextPage.docContent, nextPage.items, userId, userName, surfaceModeRef.current).catch(console.error);
    } else {
      const currentDoc = docRef.current?.innerHTML ?? docHtml;
      updateSurfaceStateRef(surfaceModeRef.current, (currentState) => ({
        ...currentState,
        pages: remaining,
        currentPageId: activePageIdRef.current,
        docContent: currentDoc,
        items,
      }));
      savePageSwitch(classId, remaining, activePageIdRef.current, currentDoc, items, userId, userName, surfaceModeRef.current).catch(console.error);
    }
  };

  const renamePage = (pageId: string, newName: string) => {
    if (!viewerCanManagePages) return;
    const updated = pagesRef.current.map((p) => (p.id === pageId ? { ...p, name: newName } : p));
    pagesRef.current = updated;
    setPages(updated);
    const currentDoc = docRef.current?.innerHTML ?? docHtml;
    updateSurfaceStateRef(surfaceModeRef.current, (current) => ({
      ...current,
      pages: updated,
      currentPageId: activePageIdRef.current,
      docContent: currentDoc,
      items,
    }));
    savePageSwitch(classId, updated, activePageIdRef.current, currentDoc, items, userId, userName, surfaceModeRef.current).catch(console.error);
  };

  const duplicatePage = (pageId: string) => {
    if (!viewerCanManagePages) return;
    flushFloatingEditorBeforePageMutation();
    const flushed = flushPages();
    const idx = flushed.findIndex((p) => p.id === pageId);
    if (idx === -1) return;
    const source = flushed[idx];
    const copy: WorkspacePage = {
      id: uid(),
      name: `${source.name} (c�pia)`,
      backgroundColor: source.backgroundColor ?? '#ffffff',
      docContent: source.docContent,
      items: source.items.map((it) => ({ ...it, id: uid() })),
    };
    const updated = [...flushed.slice(0, idx + 1), copy, ...flushed.slice(idx + 1)];
    pagesRef.current = updated;
    setPages(updated);
    const currentDoc = docRef.current?.innerHTML ?? docHtml;
    updateSurfaceStateRef(surfaceModeRef.current, (current) => ({
      ...current,
      pages: updated,
      currentPageId: activePageIdRef.current,
      docContent: currentDoc,
      items,
    }));
    savePageSwitch(classId, updated, activePageIdRef.current, currentDoc, items, userId, userName, surfaceModeRef.current).catch(console.error);
  };

  const updateActiveSlideBackground = (backgroundColor: string) => {
    if (!viewerCanManagePages || !isSlidesMode) return;
    const updated = pagesRef.current.map((page) =>
      page.id === activePageIdRef.current ? { ...page, backgroundColor } : page,
    );
    pagesRef.current = updated;
    setPages(updated);
    const currentDoc = docRef.current?.innerHTML ?? docHtml;
    updateSurfaceStateRef(surfaceModeRef.current, (current) => ({
      ...current,
      pages: updated,
      currentPageId: activePageIdRef.current,
      docContent: currentDoc,
      items,
    }));
    savePageSwitch(classId, updated, activePageIdRef.current, currentDoc, items, userId, userName, surfaceModeRef.current).catch(console.error);
  };

  const toggleSurfaceMode = useCallback(() => {
    if (!viewerCanManageWorkspace || readOnly) return;
    flushFloatingEditorBeforePageMutation();
    const flushed = flushPages();
    const currentDoc = docRef.current?.innerHTML ?? docHtml;
    updateSurfaceStateRef(surfaceModeRef.current, () => ({
      pages: flushed,
      currentPageId: activePageIdRef.current,
      docContent: currentDoc,
      items,
    }));
    savePageSwitch(
      classId,
      flushed,
      activePageIdRef.current,
      currentDoc,
      items,
      userId,
      userName,
      surfaceModeRef.current,
    ).catch(console.error);
    const nextMode: WorkspaceSurfaceMode = surfaceModeRef.current === 'slides' ? 'document' : 'slides';
    surfaceModeRef.current = nextMode;
    setSurfaceMode(nextMode);
    const targetState = surfaceStatesRef.current[nextMode] ?? createDefaultSurfaceState(nextMode, uid());
    applySurfaceState(nextMode, targetState);
    saveWorkspaceSurfaceMode(classId, nextMode, userId, userName, targetState).catch(console.error);
  }, [
    applySurfaceState,
    classId,
    createDefaultSurfaceState,
    docHtml,
    flushFloatingEditorBeforePageMutation,
    items,
    readOnly,
    userId,
    userName,
    updateSurfaceStateRef,
    viewerCanManageWorkspace,
  ]);

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
        if (!targetPage) {
          throw new Error('Pï¿½gina selecionada nï¿½o foi encontrada para salvar.');
        }
        console.log('[WorkspaceCanvas] Saving single page:', targetPage.name);
        await saveWorkspaceAsMaterial([targetPage], { title }, userId, surfaceModeRef.current);
      } else {
        console.log('[WorkspaceCanvas] Saving all pages');
        await saveWorkspaceAsMaterial(allPages, { title }, userId, surfaceModeRef.current);
      }
      console.log('[WorkspaceCanvas] Save completed successfully, closing modal');
      // Refresh the materials list if the open modal is currently shown
      if (showOpenModal) {
        const list = await getMaterialsByUser(userId);
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

  const reloadSavedLibraries = async () => {
    const [materials, battles] = await Promise.all([
      getMaterialsByUser(userId),
      listBattleTemplatesByOwner(userId),
    ]);
    setMaterialsList(materials);
    setBattleTemplatesList(battles);
  };

  const handleOpenMaterialsList = async () => {
    console.log('[WorkspaceCanvas] Open Materials clicked');
    setOpenLibraryTab('materials');
    setShowOpenModal(true);
    setLoadingMaterials(true);
    setLoadingBattleTemplates(true);
    try {
      console.log('[WorkspaceCanvas] Calling getMaterialsByUser and listBattleTemplatesByOwner');
      await reloadSavedLibraries();
    } catch (err) {
      console.error('[WorkspaceCanvas] list failed', err);
      setMaterialsList([]);
      setBattleTemplatesList([]);
    } finally {
      setLoadingMaterials(false);
      setLoadingBattleTemplates(false);
    }
  };

  const handleLoadMaterial = async (materialId: string) => {
    console.log('[WorkspaceCanvas] Load Material clicked � materialId:', materialId, 'userId:', userId);
    setLoadingMaterialId(materialId);
    try {
      console.log('[WorkspaceCanvas] Calling loadMaterialToWorkspace');
      const { pages: loadedPages, currentPageId, surfaceMode: loadedSurfaceMode } = await loadMaterialToWorkspace(materialId, classId, userName);
      console.log('[WorkspaceCanvas] Material loaded successfully � pages:', loadedPages.length);
      // Apply loaded material to local state immediately (before self-echo arrives).
      const normalized = normalizeWorkspacePages(loadedPages);
      const activePage = normalized.find((p) => p.id === currentPageId) ?? normalized[0];
      if (activePage) {
        surfaceModeRef.current = loadedSurfaceMode;
        setSurfaceMode(loadedSurfaceMode);
        applySurfaceState(loadedSurfaceMode, {
          pages: normalized,
          currentPageId,
          docContent: activePage.docContent,
          items: activePage.items,
        });
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

  const handleLoadBattleTemplate = (template: StoredBattleTemplate) => {
    if (!onOpenBattleTemplate) {
      alert('Abertura de battle indisponivel nesta sala.');
      return;
    }

    setShowOpenModal(false);
    onOpenBattleTemplate(template);
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!window.confirm('Delete this saved material?')) return;

    setDeletingMaterialId(materialId);
    try {
      await deleteMaterialFromLibrary(materialId);
      await reloadSavedLibraries();
    } catch (err) {
      console.error('[WorkspaceCanvas] delete material failed:', err);
      alert('Failed to delete saved material.');
    } finally {
      setDeletingMaterialId(null);
    }
  };

  const handleDeleteBattleTemplate = async (templateId: string) => {
    if (!window.confirm('Delete this saved battle?')) return;

    setDeletingBattleTemplateId(templateId);
    try {
      await deleteBattleTemplateFromLibrary(templateId);
      await reloadSavedLibraries();
    } catch (err) {
      console.error('[WorkspaceCanvas] delete battle failed:', err);
      alert('Failed to delete saved battle.');
    } finally {
      setDeletingBattleTemplateId(null);
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

  const visibleItems = useMemo(() => {
    if (isSlidesMode) {
      return items.filter((item) => item.boxRole !== 'student');
    }
    if (!viewerIsStudent) return items;
    return items.filter((item) => {
      if (item.boxRole !== 'student') return true;
      const resolvedOwner = resolveAssignableOwner(item, assignableStudents);
      if (resolvedOwner?.uid && resolvedOwner.uid === userId) return true;
      if (resolvedOwner?.email && userEmail && normalizeEmail(resolvedOwner.email) === normalizeEmail(userEmail)) return true;
      if (resolvedOwner?.email && userEmail && getEmailLocalPart(resolvedOwner.email) === getEmailLocalPart(userEmail)) return true;
      return isBoxOwner(viewerContext, item);
    });
  }, [assignableStudents, isSlidesMode, items, userEmail, userId, viewerContext, viewerIsStudent]);

  useEffect(() => {
    if (!selectedId) return;
    if (visibleItems.some((item) => item.id === selectedId)) return;
    setSelectedId(null);
  }, [selectedId, visibleItems]);

  const selected = visibleItems.find((i) => i.id === selectedId) ?? null;
  const activePage = useMemo(
    () => pages.find((page) => page.id === activePageId) ?? null,
    [activePageId, pages],
  );
  const activeSlideBackgroundColor = activePage?.backgroundColor ?? '#ffffff';
  const getMaterialSurfaceLabel = useCallback((mode?: WorkspaceSurfaceMode) => {
    const resolvedMode = mode === 'slides' ? 'slides' : 'document';
    return resolvedMode === 'slides' ? surfaceLabels.slides : surfaceLabels.document;
  }, [surfaceLabels.document, surfaceLabels.slides]);
  const getSaveActionLabel = useCallback(() => {
    if (saveSinglePageId) {
      return isSlidesMode ? 'Save this slide' : wsl.save;
    }
    if (isSlidesMode) return 'Save all slides';
    return 'Save all pages';
  }, [isSlidesMode, saveSinglePageId, wsl.save]);
  const currentSlideIndex = useMemo(
    () => Math.max(0, pages.findIndex((page) => page.id === activePageId)),
    [activePageId, pages],
  );
  const hasPreviousSlide = currentSlideIndex > 0;
  const hasNextSlide = currentSlideIndex >= 0 && currentSlideIndex < pages.length - 1;
  const getSlidePreviewText = useCallback((page: WorkspacePage) => {
    const docText = (page.docContent ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const boxText = (page.items ?? [])
      .filter((item) => item.boxRole !== 'student')
      .map((item) => (item.content ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      .find(Boolean);
    return (docText || boxText || page.name || surfaceLabels.currentLabel).slice(0, 96);
  }, [surfaceLabels.currentLabel]);

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
    const [ownerQuery, setOwnerQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const ownerMenuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      setLabelValue(item.label || '');
    }, [item.label]);

    const ownerBadgeLabel =
      item.ownerName?.trim() ||
      item.ownerEmail?.trim() ||
      (item.ownerUserId ? item.ownerUserId.slice(0, 6) : '');
    const boxRoleBadgeLabel =
      item.boxRole === 'student'
        ? boxFlowLabels.studentBadge
        : item.boxRole === 'content'
          ? boxFlowLabels.contentBadge
          : null;
    const filteredAssignableStudents = assignableStudents.filter((student) => {
      const query = ownerQuery.trim().toLowerCase();
      if (!query) return true;
      return student.label.toLowerCase().includes(query) || (student.email ?? '').toLowerCase().includes(query);
    });

    useEffect(() => {
      if (editingLabel) inputRef.current?.focus();
    }, [editingLabel]);

    useEffect(() => {
      if (!assigningOwner) {
        setOwnerQuery('');
        return;
      }

      const handlePointerDown = (event: MouseEvent) => {
        if (ownerMenuRef.current && !ownerMenuRef.current.contains(event.target as Node)) {
          setAssigningOwner(false);
        }
      };

      document.addEventListener('mousedown', handlePointerDown);
      return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [assigningOwner]);

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
        const { width, height } = getCanvasMetrics();
        setBlockStyle({
          position: 'absolute',
          left: `${(item.x / 100) * width}px`,
          top: `${(item.y / 100) * height}px`,
          width: `${(item.w / 100) * width}px`,
          height: `${(item.h / 100) * height}px`,
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
    }, [canMoveThisBox, canvasRef, getCanvasMetrics, isSelected, item.h, item.styles?.bgColor, item.type, item.w, item.x, item.y, readOnly]);

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
      <div
        style={blockStyle}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {isSelected && canMoveThisBox && (
          <div onPointerDown={onPointerDownMove} className="absolute top-0 left-0 right-0 h-5 cursor-grab z-20 flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.08)' }}>
            <span className="text-[9px] text-blue-400 select-none pointer-events-none">{boxFlowLabels.move}</span>
          </div>
        )}
        <div
          className="pointer-events-auto absolute inset-x-0 top-0 z-30 px-2 py-1 bg-white/90 border-b border-slate-200 text-[11px] font-semibold text-slate-700"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {!editingLabel ? (
                <span onClick={canRenameThisBox ? () => setEditingLabel(true) : undefined} className={canRenameThisBox ? 'cursor-pointer' : ''}>
                  {item.label?.trim() ? item.label : boxFlowLabels.boxLabel}
                </span>
              ) : (
                <input ref={inputRef} value={labelValue} placeholder={boxFlowLabels.boxLabel} title={boxFlowLabels.boxLabel} onChange={(e) => setLabelValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(); }} onBlur={saveLabel} className="bg-white border border-slate-300 rounded px-1 py-0 text-[11px] font-semibold text-slate-700 flex-1" />
              )}
              {boxRoleBadgeLabel ? (
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${item.boxRole === 'student' ? 'text-emerald-700 bg-emerald-100' : 'text-violet-700 bg-violet-100'}`}>
                  {boxRoleBadgeLabel}
                </span>
              ) : null}
              {item.boxRole === 'student' && item.ownerUserId && ownerBadgeLabel ? (
                <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {ownerBadgeLabel}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              {canAssignThisBox && isSelected && (
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setAssigningOwner((prev) => !prev);
                  }}
                  className="text-[9px] px-1.5 py-0.5 rounded hover:bg-slate-200 transition"
                >
                  👤
                </button>
              )}
              {isLockedByOther && (
                <span className="text-[9px] text-slate-500 font-normal">Editing by {lockOwnerName}</span>
              )}
            </div>
          </div>
          {assigningOwner && canAssignThisBox && (
            <div
              ref={ownerMenuRef}
              className="mt-2 rounded-lg border border-slate-200 bg-white shadow-lg"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1.5 border-b border-slate-100">
                <div className="mb-1 text-[10px] font-semibold text-slate-600">{boxFlowLabels.selectStudent}</div>
                <input
                  type="text"
                  value={ownerQuery}
                  onChange={(e) => setOwnerQuery(e.target.value)}
                  placeholder={boxFlowLabels.searchStudent}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-[10px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  autoFocus
                />
              </div>
              <div className="max-h-40 overflow-y-auto py-1">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-[10px] text-slate-600 transition hover:bg-slate-50"
                  onClick={() => {
                    console.log('[WorkspaceCanvas] box owner updated', {
                      boxId: item.id,
                      ownerUserId: undefined,
                      ownerName: undefined,
                      ownerEmail: undefined,
                      label: item.label ?? '',
                    });
                    updateItem(item.id, {
                      ownerUserId: undefined,
                      ownerName: undefined,
                      ownerEmail: undefined,
                    });
                    setAssigningOwner(false);
                  }}
                >
                  <span>{boxFlowLabels.clearOwner}</span>
                </button>
                {filteredAssignableStudents.map((student) => (
                  <button
                    key={student.uid}
                    type="button"
                    className={`flex w-full items-start justify-between gap-2 px-2 py-1.5 text-left transition hover:bg-slate-50 ${item.ownerUserId === student.uid ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      console.log('[WorkspaceCanvas] box owner updated', {
                        boxId: item.id,
                        ownerUserId: student.uid,
                        ownerName: student.label,
                        ownerEmail: student.email ?? undefined,
                        label: item.label?.trim() ? item.label : student.label,
                      });
                      updateItem(item.id, {
                        ownerUserId: student.uid,
                        ownerName: student.label,
                        ownerEmail: student.email ?? undefined,
                        label: item.label?.trim() ? item.label : student.label,
                      });
                      setAssigningOwner(false);
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-medium text-slate-700">{student.label}</span>
                      <span className="block truncate text-[9px] text-slate-500">{student.email ?? student.uid}</span>
                    </span>
                    {student.isOnline && <span className="text-[9px] text-emerald-600">online</span>}
                  </button>
                ))}
                {filteredAssignableStudents.length === 0 && (
                  <div className="px-2 py-2 text-[10px] text-slate-400">{boxFlowLabels.none}</div>
                )}
              </div>
            </div>
          )}
          {false && assigningOwner && canAssignThisBox && (
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
    <div
      className={`group flex h-full w-full flex-col overflow-hidden ${presentationMode ? 'fixed inset-0 z-[12000] bg-slate-950' : 'bg-slate-100'}`}
      style={{ fontFamily: 'Arial, sans-serif' }}
    >

      {/* -- Fixed toolbar --------------------------------------------------- */}
      {!presentationMode && (
      <div
        ref={toolbarRef}
        className="flex-shrink-0 flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b bg-white border-slate-200"
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
        {viewerCanManageWorkspace && !readOnly && (
          <>
            <button
              onClick={toggleSurfaceMode}
              className={`h-7 rounded-md border px-2.5 text-[11px] font-semibold transition ${
                isSlidesMode
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
              title={isSlidesMode ? surfaceLabels.switchToDocument : surfaceLabels.switchToSlides}
            >
              {isSlidesMode ? surfaceLabels.slides : surfaceLabels.document}
            </button>
            {isSlidesMode && (
              <>
                <button
                  onClick={() => setPresentationMode((prev) => !prev)}
                  className={`h-7 rounded-md border px-2.5 text-[11px] font-semibold transition ${
                    presentationMode
                      ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                  title={presentationMode ? 'Exit presentation mode' : 'Presentation mode'}
                >
                  {presentationMode ? 'Exit' : 'Presentation'}
                </button>
                <button
                  onClick={() => setSlidePanelVisible((prev) => !prev)}
                  className={`h-7 rounded-md border px-2.5 text-[11px] font-semibold transition ${
                    slidePanelVisible
                      ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                  title={slidePanelVisible ? 'Hide slides panel' : 'Show slides panel'}
                >
                  {slidePanelVisible ? 'Hide Slides' : 'Show Slides'}
                </button>
                <select
                  value={activeSlideBackgroundColor}
                  onChange={(event) => updateActiveSlideBackground(event.target.value)}
                  className="h-7 max-w-[8.5rem] rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 focus:outline-none"
                  title="Slide background"
                >
                  {BG_COLORS.filter((color) => color.v).map((color) => (
                    <option key={`slide-bg-${color.v}`} value={color.v}>
                      {color.label}
                    </option>
                  ))}
                </select>
              </>
            )}
            <div className="w-px h-5 bg-slate-200 mx-0.5" />
          </>
        )}
        <select
          value={fontFamily}
          onChange={(e) => applyFont(e.target.value)}
          disabled={toolbarDisabled}
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
          disabled={toolbarDisabled}
          className="h-7 w-14 text-xs border border-slate-200 rounded px-1 bg-white text-slate-700 focus:outline-none disabled:opacity-50"
        >
          {FONT_SIZES.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        <div className="flex items-center">
          <button onMouseDown={(e) => { e.preventDefault(); execFmt('bold'); }} disabled={toolbarDisabled} className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40" title={wsl.bold}>B</button>
          <button onMouseDown={(e) => { e.preventDefault(); execFmt('italic'); }} disabled={toolbarDisabled} className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-sm italic text-slate-700 transition hover:bg-slate-100 disabled:opacity-40" title={wsl.italic}>I</button>
          <button onMouseDown={(e) => { e.preventDefault(); execFmt('underline'); }} disabled={toolbarDisabled} className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-sm text-slate-700 underline transition hover:bg-slate-100 disabled:opacity-40" title={wsl.underline}>U</button>
        </div>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        <AlignDropdown current={textAlign} disabled={toolbarDisabled} onPick={(cmd, value) => { setTextAlign(value); execFmt(cmd); }} />

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        <UnifiedColorSwatch textColor={textColor} bgColor={bgColor} disabled={toolbarDisabled} onPickText={applyTextColor} onPickBg={applyHighlight} />

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {viewerCanManageWorkspace && !readOnly && (
          <>
            <button
              onClick={addTextBox}
              className={`w-7 h-7 rounded flex items-center justify-center transition border ${isSlidesMode ? 'border-violet-200 text-violet-700 hover:bg-violet-50' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              title={isSlidesMode ? boxFlowLabels.contentBox : wsl.textBox}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" rx="2"/><line x1="5" y1="8" x2="15" y2="8"/><line x1="5" y1="11" x2="11" y2="11"/></svg>
            </button>
            {!isSlidesMode && (
              <button
                onClick={addStudentBox}
                className="w-7 h-7 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition"
                title={boxFlowLabels.studentBox}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20"><circle cx="10" cy="6" r="3"/><path d="M4.5 16c.8-2.7 3.1-4 5.5-4s4.7 1.3 5.5 4"/><rect x="1.5" y="3" width="17" height="14" rx="2"/></svg>
              </button>
            )}
          </>
        )}

        {viewerCanManageWorkspace && !readOnly && (
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

        {!effectiveReadOnly && viewerCanManageWorkspace && (
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

        {viewerCanManageWorkspace && !readOnly && (
          <button onClick={handleExportPdf} className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100 text-slate-600 border border-slate-200 transition" title={wsl.exportPdf} aria-label={wsl.exportPdf}>
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20"><path d="M5 4h7l4 4v8a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"/><polyline points="12 4 12 9 17 9"/><line x1="10" y1="12" x2="10" y2="17"/><polyline points="7 14 10 17 13 14"/></svg>
          </button>
        )}

        {viewerCanManageWorkspace && !readOnly && (
          <button
            onClick={() => {
              if (!window.confirm(wsl.confirmClear)) return;
              flushFloatingEditorBeforePageMutation();
              setItems([]); setSelectedId(null);
              if (docRef.current) docRef.current.innerHTML = '';
              setDocHtml('');
              // Flush cleared content into pagesRef and write to Firestore.
              const updated = pagesRef.current.map((p) =>
                p.id === activePageIdRef.current ? { ...p, docContent: '', items: [] } : p,
              );
              pagesRef.current = updated;
              setPages(updated);
              updateSurfaceStateRef(surfaceModeRef.current, () => ({
                pages: updated,
                currentPageId: activePageIdRef.current,
                docContent: '',
                items: [],
              }));
              savePageSwitch(classId, updated, activePageIdRef.current, '', [], userId, userName, surfaceModeRef.current).catch(console.error);
            }}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-red-50 text-red-500 border border-red-200 transition"
            title={surfaceLabels.clearPage}
            aria-label={surfaceLabels.clearPage}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20"><path d="M4 7h12M6 7V5a1 1 0 011-1h6a1 1 0 011 1v2M16 7l-1 10a2 2 0 01-2 2H7a2 2 0 01-2-2L4 7"/></svg>
          </button>
        )}
      </div>
      )}

      {/* -- Page tab bar ---------------------------------------------- */}
      {!presentationMode && !isSlidesMode && (
      <div
        className="flex-shrink-0 flex items-stretch gap-0 overflow-x-auto border-b bg-slate-50 border-slate-200"
        style={{ minHeight: '2rem', zIndex: 15 }}
      >
        <div className="flex flex-shrink-0 items-center px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          {surfaceLabels.currentLabel}
        </div>
        {pages.map((page) => (
          <PageTab
            key={page.id}
            page={page}
            isActive={page.id === activePageId}
            readOnly={!viewerCanManagePages}
            canActivate={viewerCanManagePages}
            canDelete={pages.length > 1}
            labels={surfaceLabels}
            onActivate={() => switchPage(page.id)}
            onRename={(name) => renamePage(page.id, name)}
            onDuplicate={() => duplicatePage(page.id)}
            onSavePage={() => { setSaveSinglePageId(page.id); setSaveMaterialTitle(''); setShowSaveModal(true); }}
            onDelete={() => deletePage(page.id)}
          />
        ))}
        {viewerCanManagePages && (
          <button
            onClick={addPage}
            className="flex-shrink-0 flex items-center justify-center w-8 h-full text-slate-400 hover:text-blue-600 hover:bg-white transition px-2"
            title={surfaceLabels.newPage}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 16 16">
              <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
            </svg>
          </button>
        )}
      </div>
      )}

      {/* -- Save Material Modal -------------------------------------------- */}
      {showSaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowSaveModal(false); setSaveSinglePageId(null); } }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold text-slate-800 mb-4">{saveSinglePageId ? wsl.savePageModalTitle : wsl.saveModalTitle}</h2>
            <div className="mb-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {getMaterialSurfaceLabel(surfaceMode)}
            </div>
            <p className="mb-3 text-xs text-slate-500">
              {saveSinglePageId
                ? (isSlidesMode ? 'You are saving only the current slide.' : 'You are saving only the current page.')
                : (isSlidesMode ? 'You are saving the full slide deck.' : 'You are saving the full board material.')}
            </p>
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
                {savingMaterial ? wsl.saving : getSaveActionLabel()}
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
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => setOpenLibraryTab('materials')}
                className={`min-h-10 min-w-[140px] flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  openLibraryTab === 'materials'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {wsl.materialsSection}
              </button>
              {BATTLE_LIBRARY_LANGUAGE_TABS.map((languageTab) => (
                <button
                  key={languageTab.value}
                  onClick={() => setOpenLibraryTab(languageTab.value)}
                  dir={languageTab.dir}
                  className={`min-h-10 min-w-[104px] flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    openLibraryTab === languageTab.value
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {getBattleLibraryFolderLabel(languageTab.value)}
                </button>
              ))}
            </div>
            {loadingMaterials || loadingBattleTemplates ? (
              <p className="text-sm text-slate-400 text-center py-6">{wsl.loading}</p>
            ) : materialsList.length === 0 && battleTemplatesList.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">{wsl.noSavedFiles}</p>
            ) : (
              <div className="overflow-y-auto flex-1 space-y-5">
                <section className={openLibraryTab === 'materials' ? '' : 'hidden'}>
                  <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">{wsl.materialsSection}</h3>
                  {materialsList.length === 0 ? (
                    <p className="py-2 text-sm text-slate-400">{wsl.noMaterials}</p>
                  ) : null}
                  <ul className="overflow-y-auto flex-1 divide-y divide-slate-100">
                    {materialsList.map((m) => (
                      <li key={m.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{m.title}</p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.surfaceMode === 'slides' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                              {getMaterialSurfaceLabel(m.surfaceMode)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{new Date(m.updatedAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <button
                            onClick={() => handleDeleteMaterial(m.id)}
                            disabled={deletingMaterialId === m.id}
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingMaterialId === m.id ? '...' : 'Delete'}
                          </button>
                          <button
                            onClick={() => handleLoadMaterial(m.id)}
                            disabled={loadingMaterialId === m.id}
                            className="px-2.5 py-1 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
                          >
                            {loadingMaterialId === m.id ? '...' : `${wsl.open} ${getMaterialSurfaceLabel(m.surfaceMode)}`}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
                {BATTLE_LIBRARY_LANGUAGE_TABS.map((languageTab) => {
                  const templates = battleTemplatesByLanguage[languageTab.value];

                  return (
                    <section key={languageTab.value} className={openLibraryTab === languageTab.value ? '' : 'hidden'}>
                      <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-emerald-600" dir={languageTab.dir}>
                        {getBattleLibrarySectionTitle(languageTab.value)}
                      </h3>
                      {templates.length === 0 ? (
                        <p className="py-2 text-sm text-slate-400">{wsl.noBattles}</p>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {templates.map((template) => (
                            <li key={template.id} className="py-2.5 flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{template.title}</p>
                                <p className="text-xs text-slate-400">
                                  {template.questions.length} perguntas - {new Date(template.updatedAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <div className="flex flex-shrink-0 items-center gap-2">
                                <button
                                  onClick={() => handleDeleteBattleTemplate(template.id)}
                                  disabled={deletingBattleTemplateId === template.id}
                                  className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                >
                                  {deletingBattleTemplateId === template.id ? '...' : 'Delete'}
                                </button>
                                <button
                                  onClick={() => handleLoadBattleTemplate(template)}
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs text-white transition hover:bg-emerald-700"
                                >
                                  {wsl.openBattle}
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- Scrollable content ----------------------------------------------- */}
      <div
        ref={overflowRef}
        className={`flex-1 overflow-x-hidden ${presentationMode ? 'overflow-hidden p-0' : 'overflow-y-auto p-3 sm:p-4'} ${isSlidesMode ? 'bg-slate-900' : 'bg-slate-100'}`}
        onScroll={onScrollSync}
        onClick={onCanvasClick}
        onMouseUp={handleCanvasMouseUp}
      >
        <div className={`${presentationMode ? 'h-full w-full' : 'mx-auto max-w-none'}`}>
        <div
          ref={canvasRef}
          className={`relative w-full ${presentationMode ? 'h-full' : ''} ${isSlidesMode ? (presentationMode ? 'mx-0 max-w-none' : 'mx-auto max-w-6xl') : ''}`}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {presentationMode && (
            <>
            <div className="pointer-events-none fixed inset-x-0 top-0 z-[12040] flex justify-center">
              <div className="group/exit pointer-events-auto mt-2 flex h-16 min-w-[180px] items-start justify-center rounded-full">
                <button
                  type="button"
                  onClick={() => setPresentationMode(false)}
                  className="mt-2 rounded-full bg-black/20 px-3 py-1 text-sm font-bold text-white opacity-0 transition group-hover/exit:opacity-100 group-focus-within/exit:opacity-100 hover:bg-black/70 focus:bg-black/70 focus:opacity-100"
                  aria-label="Exit presentation mode"
                  title="Exit presentation mode"
                >
                  ×
                </button>
              </div>
            </div>
            {pages.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => navigateSlides('previous')}
                  disabled={!hasPreviousSlide}
                  className="absolute left-4 top-1/2 z-40 -translate-y-1/2 rounded-full bg-black/10 px-3 py-5 text-lg font-black text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-0"
                  aria-label="Previous slide"
                  title="Previous slide"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => navigateSlides('next')}
                  disabled={!hasNextSlide}
                  className="absolute right-4 top-1/2 z-40 -translate-y-1/2 rounded-full bg-black/10 px-3 py-5 text-lg font-black text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-0"
                  aria-label="Next slide"
                  title="Next slide"
                >
                  ›
                </button>
              </>
            ) : null}
            </>
          )}

          {/* Main shared document */}
          <div
            className={`relative w-full border mb-6 ${
              isSlidesMode
                ? presentationMode
                  ? 'overflow-hidden rounded-none border-slate-700 bg-white shadow-none'
                  : 'overflow-hidden rounded-[28px] border-slate-700 bg-white shadow-[0_25px_70px_rgba(15,23,42,0.45)]'
                : 'rounded-xl border-slate-200 bg-white shadow-sm'
            }`}
            style={{
              minHeight: presentationMode ? '100vh' : isSlidesMode ? 'min(72vh, 48rem)' : '60vh',
              aspectRatio: isSlidesMode ? '16 / 9' : undefined,
              backgroundColor: isSlidesMode ? activeSlideBackgroundColor : '#ffffff',
            }}
          >
            {!docHtml && (
              <div
                className={`absolute text-sm text-slate-300 pointer-events-none select-none ${isSlidesMode ? 'left-8 top-8' : 'left-6 top-6'}`}
                style={{ fontFamily }}
              >
                {viewerCanEditSharedDocument ? wsl.placeholder : wsl.readonlyPh}
              </div>
            )}
            <div
              ref={docRef}
              contentEditable={viewerCanEditSharedDocument}
              suppressContentEditableWarning
              spellCheck
              onBlur={onDocBlur}
              onInput={onDocInput}
              className={`w-full focus:outline-none leading-relaxed ${isSlidesMode ? `min-h-full ${presentationMode ? 'overflow-hidden' : 'overflow-auto'} px-8 py-8 sm:px-12 sm:py-10 md:px-16 md:py-12` : 'min-h-[60vh] p-6'}`}
              style={{ fontFamily, fontSize: `${fontSize}px`, color: '#000000', wordBreak: 'break-word', backgroundColor: isSlidesMode ? activeSlideBackgroundColor : '#ffffff' }}
            />
          </div>

          {/* Floating blocks overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
            {visibleItems.map((item) => (
              <StableFloatingBlock
                key={item.id}
                item={item}
                isSelected={item.id === selectedId}
                readOnly={effectiveReadOnly}
                isSlidesMode={isSlidesMode}
                currentUserId={userId}
                currentUserEmail={userEmail}
                viewerContext={viewerContext}
                viewerIsStudent={viewerIsStudent}
                canvasRef={canvasRef}
                assignableStudents={assignableStudents}
                boxFlowLabels={boxFlowLabels}
                getCanvasMetrics={getCanvasMetrics}
                onSelect={() => setSelectedId(item.id)}
                onPointerDownMove={(e) => onPointerDown(e, item.id, 'move')}
                onPointerDownResize={(e) => onPointerDown(e, item.id, 'resize')}
                onContentChange={(html) => updateItem(
                  item.id,
                  {
                    content: html,
                    editingByUserId: userId,
                    editingByUserName: userName,
                    editingStartedAt: Date.now(),
                  },
                  { forceSave: canEditResolvedBoxContent(item) },
                )}
                onUpdateItem={updateItem}
                onEditorFocus={requestItemEdit}
                onEditorBlur={() => {
                  activeFloatingIdRef.current = null;
                  activeFloatingElRef.current = null;
                  handleFloatingBlur(item.id);
                }}
              />
            ))}
          </div>

          {visibleItems.length > 0 && !isSlidesMode && <div className="h-40" />}
        </div>
        {isSlidesMode && !presentationMode && viewerCanManagePages && slidePanelVisible && (
          <aside
            id="workspace-slide-panel"
            className="fixed z-[12010] hidden w-56 rounded-2xl border border-slate-800 bg-slate-950/92 p-3 shadow-2xl lg:block"
            style={{
              left: `${(slidePanelPosition ?? getDefaultSlidePanelPosition()).x}px`,
              top: `${(slidePanelPosition ?? getDefaultSlidePanelPosition()).y}px`,
              width: `${slidePanelSize.width}px`,
              height: `${slidePanelSize.height}px`,
            }}
          >
            <div
              className="mb-3 flex cursor-move items-center justify-between gap-2"
              onPointerDown={handleSlidePanelPointerDown}
            >
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {surfaceLabels.slides}
              </span>
              <div className="flex items-center gap-1">
                {viewerCanManagePages && (
                  <button
                    type="button"
                    onClick={addPage}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-blue-500 hover:bg-slate-800 hover:text-white"
                    title={surfaceLabels.newPage}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.25" viewBox="0 0 16 16">
                      <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSlidePanelVisible(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-rose-500 hover:bg-slate-800 hover:text-white"
                  title="Close slides panel"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex h-[calc(100%-3.5rem)] flex-col gap-3 overflow-y-auto pr-1">
              {pages.map((page) => {
                const isActive = page.id === activePageId;
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => switchPage(page.id)}
                    className={`group w-full rounded-2xl border p-2 text-left transition ${
                      isActive
                        ? 'border-blue-500 bg-slate-800 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]'
                        : 'border-slate-800 bg-slate-900 hover:border-slate-600 hover:bg-slate-800/80'
                    }`}
                    title={surfaceLabels.pageNameTip(page.name)}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-white">{page.name}</span>
                      <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {pages.findIndex((entry) => entry.id === page.id) + 1}
                      </span>
                    </div>
                    <div
                      className="aspect-video overflow-hidden rounded-xl border border-slate-700 p-3"
                      style={{ backgroundColor: page.backgroundColor ?? '#ffffff' }}
                    >
                      <p className="line-clamp-5 text-[11px] leading-4 text-slate-500">
                        {getSlidePreviewText(page)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          duplicatePage(page.id);
                        }}
                        className="rounded-md border border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-300 transition hover:border-blue-500 hover:text-white"
                        title={wsl.duplicate}
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSaveSinglePageId(page.id);
                          setSaveMaterialTitle('');
                          setShowSaveModal(true);
                        }}
                        className="rounded-md border border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-300 transition hover:border-emerald-500 hover:text-white"
                        title={surfaceLabels.savePage}
                      >
                        Save
                      </button>
                      {pages.length > 1 && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            deletePage(page.id);
                          }}
                          className="rounded-md border border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-300 transition hover:border-rose-500 hover:text-white"
                          title={surfaceLabels.deletePage}
                        >
                          Del
                        </button>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onPointerDown={handleSlidePanelResizePointerDown}
              className="absolute bottom-1 right-1 flex h-5 w-5 cursor-se-resize items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="Resize slides panel"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20">
                <path d="M7 13l6-6M10 16l6-6M13 19l6-6" />
              </svg>
            </button>
          </aside>
        )}
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
              uiLanguage={getScopedUiLanguage()}
              onBack={() => setShowVocabModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

