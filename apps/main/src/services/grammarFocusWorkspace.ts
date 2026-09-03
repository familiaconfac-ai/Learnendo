import { boardControlRef } from './boardControlService';
import type { BoardControl } from '../models/boardControl';
import { grammarFocusDocumentId } from '../models/grammarFocus';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { parseControlledMarkdown } from '../utils/controlledMarkdown';
import type { WorkspaceDoc, WorkspacePage, WorkspaceSurfaceMode, WorkspaceSurfaceState } from './workspaceService';
import { db } from './firebase';

function surfaceStateKey(mode: WorkspaceSurfaceMode): 'boardState' | 'slidesState' {
  return mode === 'slides' ? 'slidesState' : 'boardState';
}

/** Materialize the active top-level workspace before switching a legacy document to another surface. */
export function resolveLegacyWorkspaceSurfaceState(
  workspace: Partial<WorkspaceDoc>,
  mode: WorkspaceSurfaceMode,
): WorkspaceSurfaceState | null {
  const key = surfaceStateKey(mode);
  if (workspace[key] || (workspace.surfaceMode ?? 'document') !== mode || !workspace.pages?.length) return null;
  const currentPageId = workspace.currentPageId ?? workspace.pages[0]?.id;
  if (!currentPageId) return null;
  const activePage = workspace.pages.find((page) => page.id === currentPageId);
  return {
    pages: workspace.pages,
    currentPageId,
    docContent: workspace.docContent ?? activePage?.docContent ?? '',
    items: workspace.items ?? activePage?.items ?? [],
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character] ?? character));
}

function formatInlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

export function renderGrammarFocusWorkspaceHtml(title: string, markdown: string): string {
  const heading = title.trim() ? `<h1>${formatInlineMarkdown(title.trim())}</h1>` : '';
  const blocks = parseControlledMarkdown(markdown).map((block) => {
    if (block.type === 'heading') {
      const level = Math.min(3, block.level + 1);
      return `<h${level}>${formatInlineMarkdown(block.text)}</h${level}>`;
    }
    if (block.type === 'unordered-list' || block.type === 'ordered-list') {
      const tag = block.type === 'unordered-list' ? 'ul' : 'ol';
      return `<${tag}>${block.items.map((item) => `<li>${formatInlineMarkdown(item)}</li>`).join('')}</${tag}>`;
    }
    if (block.type === 'example') return `<blockquote>${formatInlineMarkdown(block.text)}</blockquote>`;
    return `<p>${formatInlineMarkdown(block.text)}</p>`;
  });
  return [heading, ...blocks].filter(Boolean).join('');
}

/** A Grammar Focus export starts a fresh slide deck, while Board keeps its existing pages. */
export function buildGrammarFocusSurfaceState(
  workspace: Partial<WorkspaceDoc>,
  mode: WorkspaceSurfaceMode,
  page: WorkspacePage,
): WorkspaceSurfaceState {
  const current = workspace[surfaceStateKey(mode)];
  const existingPages = mode === 'slides'
    ? []
    : current?.pages ?? (workspace.surfaceMode === mode ? workspace.pages ?? [] : []);
  return {
    pages: [...existingPages, page],
    currentPageId: page.id,
    docContent: page.docContent,
    items: page.items,
  };
}

export async function appendGrammarFocusWorkspacePage(input: {
  courseId: string;
  workbookId: number;
  lessonId: string;
  grammarDocumentId: string;
  classId: string;
  mode: WorkspaceSurfaceMode;
  title: string;
  markdown: string;
  lessonNumber: number;
  userId: string;
  userName: string;
}): Promise<string> {
  if (!db || !input.classId || !input.userId) throw new Error('An active live class is required.');
  if (input.grammarDocumentId !== grammarFocusDocumentId(input.courseId, input.workbookId, input.lessonId)) throw new Error('Grammar source identity mismatch.');
  const reference = doc(db, 'liveClasses', input.classId, 'shared', 'workspace');
  const pageId = `grammar_${input.lessonNumber}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const html = renderGrammarFocusWorkspaceHtml(input.title, input.markdown);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const controlReference = boardControlRef(input.classId);
    const previousControl = (await transaction.get(controlReference)).data() as BoardControl | undefined;
    const epoch = (previousControl?.epoch ?? 0) + 1;
    const controllerClientId = `grammar-${pageId}`;
    const workspace = (snapshot.data() ?? {}) as Partial<WorkspaceDoc>;
    const key = surfaceStateKey(input.mode);
    const activeMode = workspace.surfaceMode ?? 'document';
    const legacyActiveState = activeMode !== input.mode
      ? resolveLegacyWorkspaceSurfaceState(workspace, activeMode)
      : null;
    const page: WorkspacePage = {
      id: pageId,
      grammarSource: { courseId: input.courseId, workbookId: input.workbookId, lessonId: input.lessonId, documentId: input.grammarDocumentId },
      name: input.title.trim() || `Lesson ${input.lessonNumber} Grammar Focus`,
      backgroundColor: '#ffffff',
      docContent: html,
      items: [],
    };
    const state = buildGrammarFocusSurfaceState(workspace, input.mode, page);
    const pages = state.pages;
    transaction.set(controlReference, {
      designatedStudentId: previousControl?.designatedStudentId ?? null,
      controllerId: input.userId, controllerClientId, epoch, teacherLeaseAt: serverTimestamp(),
      view: null, updatedAt: serverTimestamp(),
    });
    transaction.set(reference, {
      controlEpoch: epoch, controlClientId: controllerClientId,
      ...(legacyActiveState ? { [surfaceStateKey(activeMode)]: legacyActiveState } : {}),
      surfaceMode: input.mode,
      presentationMode: false,
      [key]: state,
      pages,
      currentPageId: page.id,
      docContent: html,
      docUpdatedBy: input.userId,
      items: [],
      itemsUpdatedBy: input.userId,
      updatedAt: Date.now(),
      updatedBy: input.userId,
      updatedByName: input.userName,
    }, { merge: true });
  });
  return pageId;
}
