import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WorkspaceTextStyles {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;       // CSS color, e.g. '#ef4444'
  bgColor?: string;     // CSS background color
  fontSize?: number;    // px
}

export type WorkspaceItemType = 'text' | 'image';
export type WorkspaceSurfaceMode = 'document' | 'slides';

/** A single page within a workspace material or live session. */
export interface WorkspacePage {
  id: string;
  name: string;
  backgroundColor?: string;
  /** HTML snapshot as of the last time this page was the active page.
   *  While a page is active, authoritative content lives in WorkspaceDoc.docContent / .items. */
  docContent: string;
  items: WorkspaceItem[];
}

export interface WorkspaceItem {
  id: string;
  type: WorkspaceItemType;
  boxRole?: 'content' | 'student';
  x: number;          // % of workspace width  (0-100)
  y: number;          // % of workspace height (0-100)
  w: number;          // % of workspace width
  h: number;          // % of workspace height
  // text block
  content?: string;   // raw HTML from contenteditable
  styles?: WorkspaceTextStyles;
  label?: string;     // optional human-readable box label / owner name
  ownerUserId?: string;  // actual owner of the box (aluno dono)
  ownerName?: string;    // display name of the owner for the classroom UI
  ownerEmail?: string;   // owner email for display
  classId?: string;
  teacherUserId?: string;
  editingByUserId?: string;
  editingByUserName?: string;
  editingStartedAt?: number;
  // image block
  imageUrl?: string;  // data-URL or hosted URL
  assetUrl?: string;  // hosted URL persisted remotely when local preview uses a temporary data URL
  // metadata
  updatedAt: number;
  updatedBy: string;
  updatedByName: string;
}

export interface WorkspaceSurfaceState {
  pages: WorkspacePage[];
  currentPageId: string;
  docContent: string;
  items: WorkspaceItem[];
}

export interface WorkspaceDoc {
  items: WorkspaceItem[];
  /** Author of the last items write (used for self-echo suppression per section) */
  itemsUpdatedBy?: string;
  /** Main shared document HTML content */
  docContent?: string;
  /** Author of the last docContent write (used for self-echo suppression per section) */
  docUpdatedBy?: string;
  /** Scroll position (0-1) for scroll-sync */
  scrollRatio?: number;
  /** All pages (Fase 2). Active page content is always mirrored in docContent/items for real-time sync. */
  pages?: WorkspacePage[];
  /** ID of the currently active page (Fase 2). */
  currentPageId?: string;
  /** Visual surface mode shared by teacher and students. */
  surfaceMode?: WorkspaceSurfaceMode;
  /** Dedicated state for the board/lousa mode. */
  boardState?: WorkspaceSurfaceState;
  /** Dedicated state for the slide presentation mode. */
  slidesState?: WorkspaceSurfaceState;
  /** Shared fullscreen presentation state for slide mode. */
  presentationMode?: boolean;
  updatedAt: number;
  updatedBy: string;
  updatedByName: string;
}

function upsertWorkspaceItemByFreshness(
  items: WorkspaceItem[],
  incomingItem: WorkspaceItem,
): WorkspaceItem[] {
  const existingIndex = items.findIndex((item) => item.id === incomingItem.id);
  if (existingIndex === -1) {
    return [...items, incomingItem];
  }

  const existingItem = items[existingIndex];
  if ((existingItem.updatedAt ?? 0) > (incomingItem.updatedAt ?? 0)) {
    return items;
  }

  const nextItems = [...items];
  nextItems[existingIndex] = incomingItem;
  return nextItems;
}

function surfaceStateKey(surfaceMode: WorkspaceSurfaceMode): 'boardState' | 'slidesState' {
  return surfaceMode === 'slides' ? 'slidesState' : 'boardState';
}

function buildSurfaceState(
  pages: WorkspacePage[],
  currentPageId: string,
  docContent: string,
  items: WorkspaceItem[],
): WorkspaceSurfaceState {
  return {
    pages,
    currentPageId,
    docContent,
    items,
  };
}

function serializeWorkspaceItemForRemote(item: WorkspaceItem): WorkspaceItem {
  const serialized: WorkspaceItem = { ...item };
  if (serialized.assetUrl) {
    serialized.imageUrl = serialized.assetUrl;
  }
  return serialized;
}

function serializeWorkspacePagesForRemote(pages: WorkspacePage[]): WorkspacePage[] {
  return (pages ?? []).map((page) => ({
    ...page,
    items: (page.items ?? []).map(serializeWorkspaceItemForRemote),
  }));
}

/**
 * Normalize a raw pages array coming from Firestore.
 * Handles pre-Fase-2 data that may be missing the `id` field.
 */
export function normalizeWorkspacePages(
  raw: Partial<WorkspacePage>[],
): WorkspacePage[] {
  return (raw ?? []).map((p, i) => ({
    id: p.id ?? `pg_${i}_${Math.random().toString(36).slice(2, 6)}`,
    name: p.name ?? `Página ${i + 1}`,
    backgroundColor: p.backgroundColor ?? '#ffffff',
    docContent: p.docContent ?? '',
    items: p.items ?? [],
  }));
}

/** Save only the main document content (debounced separately from items) */
export async function saveDocContent(
  classId: string,
  docContent: string,
  uid: string,
  name: string,
  currentPageId?: string,
  pages?: WorkspacePage[],
  surfaceMode: WorkspaceSurfaceMode = 'document',
): Promise<void> {
  if (!db) return;
  console.log(`[WS] saveDocContent by ${name} (${uid.slice(0, 6)})`);
  const { updateDoc, setDoc } = await import('firebase/firestore');
  const syncedPages =
    currentPageId && pages
      ? pages.map((page) => (page.id === currentPageId ? { ...page, docContent } : page))
      : undefined;
  const remotePages = syncedPages ? serializeWorkspacePagesForRemote(syncedPages) : undefined;
  const nextItems =
    currentPageId && remotePages
      ? remotePages.find((page) => page.id === currentPageId)?.items ?? []
      : [];
  const surfaceState =
    currentPageId && remotePages
      ? buildSurfaceState(remotePages, currentPageId, docContent, nextItems)
      : undefined;
  const modeKey = surfaceStateKey(surfaceMode);
  const payload = {
    docContent,
    docUpdatedBy: uid,
    ...(surfaceState ? { [modeKey]: surfaceState } : {}),
    updatedAt: Date.now(),
    updatedBy: uid,
    updatedByName: name,
    ...(remotePages ? { pages: remotePages } : {}),
  };
  try {
    await updateDoc(workspaceRef(classId), payload);
    console.log('[WS] saveDocContent ✅');
  } catch (err) {
    console.warn('[WS] saveDocContent updateDoc failed — falling back to setDoc:', err);
    await setDoc(
      workspaceRef(classId),
      payload,
      { merge: true },
    );
    console.log('[WS] saveDocContent setDoc ✅');
  }
}

/** Persist scroll ratio so students can follow (0-1). */
export async function saveScrollRatio(
  classId: string,
  scrollRatio: number,
): Promise<void> {
  if (!db) return;
  const { updateDoc } = await import('firebase/firestore');
  await updateDoc(workspaceRef(classId), { scrollRatio }).catch(() => {
    // ignore if doc doesn't exist yet
  });
}

/** Persist only the current workspace surface mode (document/slides). */
export async function saveWorkspaceSurfaceMode(
  classId: string,
  surfaceMode: WorkspaceSurfaceMode,
  uid: string,
  name: string,
  state?: WorkspaceSurfaceState,
): Promise<void> {
  if (!db) return;
  const { updateDoc, setDoc } = await import('firebase/firestore');
  const modeKey = surfaceStateKey(surfaceMode);
  const remoteState = state
    ? buildSurfaceState(
        serializeWorkspacePagesForRemote(state.pages),
        state.currentPageId,
        state.docContent,
        (state.items ?? []).map(serializeWorkspaceItemForRemote),
      )
    : undefined;
  const payload = {
    surfaceMode,
    ...(remoteState
      ? {
          [modeKey]: remoteState,
          pages: remoteState.pages,
          currentPageId: remoteState.currentPageId,
          docContent: remoteState.docContent,
          items: remoteState.items,
        }
      : {}),
    updatedAt: Date.now(),
    updatedBy: uid,
    updatedByName: name,
  };
  try {
    await updateDoc(workspaceRef(classId), payload);
    console.log(`[WS] saveWorkspaceSurfaceMode ✅ mode=${surfaceMode}`);
  } catch {
    await setDoc(workspaceRef(classId), payload, { merge: true });
    console.log('[WS] saveWorkspaceSurfaceMode setDoc ✅');
  }
}

/** Persist shared presentation mode for slides so viewers follow the teacher. */
export async function saveWorkspacePresentationMode(
  classId: string,
  presentationMode: boolean,
  uid: string,
  name: string,
): Promise<void> {
  if (!db) return;
  const { updateDoc, setDoc } = await import('firebase/firestore');
  const payload = {
    presentationMode,
    updatedAt: Date.now(),
    updatedBy: uid,
    updatedByName: name,
  };
  try {
    await updateDoc(workspaceRef(classId), payload);
    console.log(`[WS] saveWorkspacePresentationMode ✅ active=${presentationMode}`);
  } catch {
    await setDoc(workspaceRef(classId), payload, { merge: true });
    console.log('[WS] saveWorkspacePresentationMode setDoc ✅');
  }
}

// ── Firestore path ────────────────────────────────────────────────────────────

// liveClasses/{classId}/shared/workspace

function workspaceRef(classId: string) {
  return doc(db!, 'liveClasses', classId, 'shared', 'workspace');
}

// ── Subscription ─────────────────────────────────────────────────────────────

export function subscribeWorkspace(
  classId: string,
  callback: (data: WorkspaceDoc | null) => void,
): () => void {
  if (!db) {
    callback(null);
    return () => {};
  }
  console.log(`[WS] subscribeWorkspace path=liveClasses/${classId}/shared/workspace`);
  return onSnapshot(
    workspaceRef(classId),
    (snap) => {
      console.log(`[WS] snapshot received exists=${snap.exists()} by=${(snap.data() as WorkspaceDoc | undefined)?.updatedByName ?? '?'}`);
      callback(snap.exists() ? (snap.data() as WorkspaceDoc) : null);
    },
    (err) => {
      console.error('[WS] subscribeWorkspace PERMISSION ERROR — student writes will not sync:', err.code, err.message);
    },
  );
}

// ── Write helpers ─────────────────────────────────────────────────────────────

/** Persist the full workspace document (list of items). */
export async function saveWorkspace(
  classId: string,
  items: WorkspaceItem[],
  uid: string,
  name: string,
  currentPageId?: string,
  pages?: WorkspacePage[],
  surfaceMode: WorkspaceSurfaceMode = 'document',
): Promise<void> {
  if (!db) return;
  console.log(`[WS] saveWorkspace by ${name} (${uid.slice(0, 6)}) — ${items.length} items`);
  const { updateDoc, setDoc } = await import('firebase/firestore');
  const syncedPages =
    currentPageId && pages
      ? pages.map((page) => (page.id === currentPageId ? { ...page, items } : page))
      : undefined;
  const remotePages = syncedPages ? serializeWorkspacePagesForRemote(syncedPages) : undefined;
  const remoteItems = items.map(serializeWorkspaceItemForRemote);
  const nextDocContent =
    currentPageId && remotePages
      ? remotePages.find((page) => page.id === currentPageId)?.docContent ?? ''
      : '';
  const surfaceState =
    currentPageId && remotePages
      ? buildSurfaceState(remotePages, currentPageId, nextDocContent, remoteItems)
      : undefined;
  const modeKey = surfaceStateKey(surfaceMode);
  const payload = {
    items: remoteItems,
    itemsUpdatedBy: uid,
    ...(surfaceState ? { [modeKey]: surfaceState } : {}),
    updatedAt: Date.now(),
    updatedBy: uid,
    updatedByName: name,
    ...(remotePages ? { pages: remotePages } : {}),
  };
  try {
    await updateDoc(workspaceRef(classId), payload);
    console.log('[WS] saveWorkspace ✅');
  } catch (err) {
    console.warn('[WS] saveWorkspace updateDoc failed — falling back to setDoc:', err);
    // Doc doesn't exist yet — use merge so we don't wipe docContent/scrollRatio.
    await setDoc(
      workspaceRef(classId),
      payload,
      { merge: true },
    );
    console.log('[WS] saveWorkspace setDoc ✅');
  }
}

/** Persist a single floating item without overwriting sibling boxes edited by other users. */
export async function saveWorkspaceItem(
  classId: string,
  item: WorkspaceItem,
  uid: string,
  name: string,
  currentPageId?: string,
  surfaceMode: WorkspaceSurfaceMode = 'document',
): Promise<void> {
  if (!db) return;
  console.log(`[WS] saveWorkspaceItem by ${name} (${uid.slice(0, 6)}) — ${item.id}`);
  const { runTransaction, setDoc, getDoc } = await import('firebase/firestore');
  const remoteItem = serializeWorkspaceItemForRemote(item);

  try {
    await runTransaction(db, async (transaction) => {
      const ref = workspaceRef(classId);
      const snapshot = await transaction.get(ref);
      const currentData = snapshot.exists() ? (snapshot.data() as WorkspaceDoc) : null;
      const modeKey = surfaceStateKey(surfaceMode);
      const currentSurfaceState = currentData?.[modeKey];
      const currentItems = currentSurfaceState?.items ?? currentData?.items ?? [];
      const currentPages = currentSurfaceState?.pages
        ? normalizeWorkspacePages(currentSurfaceState.pages as Partial<WorkspacePage>[])
        : currentData?.pages
          ? normalizeWorkspacePages(currentData.pages as Partial<WorkspacePage>[])
          : [];
      const nextPages =
        currentPageId && currentPages.length > 0
          ? currentPages.map((page) =>
              page.id === currentPageId
                ? { ...page, items: upsertWorkspaceItemByFreshness(page.items ?? [], remoteItem) }
                : page,
            )
          : currentPages;
      const activePageId = currentSurfaceState?.currentPageId ?? currentData?.currentPageId;
      const nextItems =
        currentPageId && activePageId && activePageId === currentPageId
          ? nextPages.find((page) => page.id === currentPageId)?.items ?? upsertWorkspaceItemByFreshness(currentItems, remoteItem)
          : activePageId
            ? currentPages.find((page) => page.id === activePageId)?.items ?? currentItems
            : upsertWorkspaceItemByFreshness(currentItems, remoteItem);
      const nextDocContent =
        currentPageId && activePageId && activePageId === currentPageId
          ? nextPages.find((page) => page.id === currentPageId)?.docContent ?? currentSurfaceState?.docContent ?? currentData?.docContent ?? ''
          : activePageId
            ? currentPages.find((page) => page.id === activePageId)?.docContent ?? currentSurfaceState?.docContent ?? currentData?.docContent ?? ''
            : currentSurfaceState?.docContent ?? currentData?.docContent ?? '';
      const nextCurrentPageId = activePageId ?? currentPageId ?? currentSurfaceState?.currentPageId ?? currentData?.currentPageId ?? '';
      const nextSurfaceState = buildSurfaceState(nextPages, nextCurrentPageId, nextDocContent, nextItems);

      transaction.set(
        ref,
        {
          items: nextItems,
          itemsUpdatedBy: uid,
          [modeKey]: nextSurfaceState,
          ...(currentData?.surfaceMode === surfaceMode
            ? {
                pages: nextSurfaceState.pages,
                currentPageId: nextSurfaceState.currentPageId,
                docContent: nextSurfaceState.docContent,
              }
            : {}),
          updatedAt: Date.now(),
          updatedBy: uid,
          updatedByName: name,
        },
        { merge: true },
      );
    });
    console.log('[WS] saveWorkspaceItem ✅');
  } catch (err) {
    console.warn('[WS] saveWorkspaceItem transaction failed — falling back to setDoc:', err);
    const currentSnapshot = await getDoc(workspaceRef(classId));
    const currentData = currentSnapshot.exists() ? (currentSnapshot.data() as WorkspaceDoc) : null;
    const modeKey = surfaceStateKey(surfaceMode);
    const currentSurfaceState = currentData?.[modeKey];
    const currentItems = currentSurfaceState?.items ?? currentData?.items ?? [];
    const currentPages = currentSurfaceState?.pages
      ? normalizeWorkspacePages(currentSurfaceState.pages as Partial<WorkspacePage>[])
      : currentData?.pages
        ? normalizeWorkspacePages(currentData.pages as Partial<WorkspacePage>[])
        : [];
    const nextPages =
      currentPageId && currentPages.length > 0
        ? currentPages.map((page) =>
            page.id === currentPageId
              ? { ...page, items: upsertWorkspaceItemByFreshness(page.items ?? [], remoteItem) }
              : page,
        )
        : currentPages;
    const activePageId = currentSurfaceState?.currentPageId ?? currentData?.currentPageId;
    const nextItems =
      currentPageId && activePageId && activePageId === currentPageId
        ? nextPages.find((page) => page.id === currentPageId)?.items ?? upsertWorkspaceItemByFreshness(currentItems, remoteItem)
        : activePageId
          ? currentPages.find((page) => page.id === activePageId)?.items ?? currentItems
          : upsertWorkspaceItemByFreshness(currentItems, remoteItem);
    const nextDocContent =
      currentPageId && activePageId && activePageId === currentPageId
        ? nextPages.find((page) => page.id === currentPageId)?.docContent ?? currentSurfaceState?.docContent ?? currentData?.docContent ?? ''
        : activePageId
          ? currentPages.find((page) => page.id === activePageId)?.docContent ?? currentSurfaceState?.docContent ?? currentData?.docContent ?? ''
          : currentSurfaceState?.docContent ?? currentData?.docContent ?? '';
    const nextCurrentPageId = activePageId ?? currentPageId ?? currentSurfaceState?.currentPageId ?? currentData?.currentPageId ?? '';
    const nextSurfaceState = buildSurfaceState(nextPages, nextCurrentPageId, nextDocContent, nextItems);
    await setDoc(
      workspaceRef(classId),
      {
        items: nextItems,
        itemsUpdatedBy: uid,
        [modeKey]: nextSurfaceState,
        ...(currentData?.surfaceMode === surfaceMode
          ? {
              pages: nextSurfaceState.pages,
              currentPageId: nextSurfaceState.currentPageId,
              docContent: nextSurfaceState.docContent,
            }
          : {}),
        updatedAt: Date.now(),
        updatedBy: uid,
        updatedByName: name,
      },
      { merge: true },
    );
    console.log('[WS] saveWorkspaceItem setDoc ✅');
  }
}

/**
 * Write the full page-aware workspace state in one atomic call.
 * Used when switching pages or changing page structure (add/delete/rename/duplicate).
 * Writes both the pages array AND the active page's docContent/items so that
 * subscribeWorkspace on all clients immediately reflects the new active page.
 */
export async function savePageSwitch(
  classId: string,
  pages: WorkspacePage[],
  currentPageId: string,
  docContent: string,
  items: WorkspaceItem[],
  uid: string,
  name: string,
  surfaceMode: WorkspaceSurfaceMode = 'document',
): Promise<void> {
  if (!db) return;
  const { updateDoc, setDoc } = await import('firebase/firestore');
  const remotePages = serializeWorkspacePagesForRemote(pages);
  const remoteItems = items.map(serializeWorkspaceItemForRemote);
  const nextSurfaceState = buildSurfaceState(remotePages, currentPageId, docContent, remoteItems);
  const modeKey = surfaceStateKey(surfaceMode);
  const payload = {
    pages: remotePages,
    currentPageId,
    surfaceMode,
    [modeKey]: nextSurfaceState,
    docContent,
    docUpdatedBy: uid,
    items: remoteItems,
    itemsUpdatedBy: uid,
    updatedAt: Date.now(),
    updatedBy: uid,
    updatedByName: name,
  };
  try {
    await updateDoc(workspaceRef(classId), payload);
    console.log(`[WS] savePageSwitch ✅ cpid=${currentPageId} pages=${pages.length}`);
  } catch {
    await setDoc(workspaceRef(classId), payload, { merge: true });
    console.log('[WS] savePageSwitch setDoc ✅');
  }
}
