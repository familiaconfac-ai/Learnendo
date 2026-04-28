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

/** A single page within a workspace material or live session. */
export interface WorkspacePage {
  id: string;
  name: string;
  /** HTML snapshot as of the last time this page was the active page.
   *  While a page is active, authoritative content lives in WorkspaceDoc.docContent / .items. */
  docContent: string;
  items: WorkspaceItem[];
}

export interface WorkspaceItem {
  id: string;
  type: WorkspaceItemType;
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
  // metadata
  updatedAt: number;
  updatedBy: string;
  updatedByName: string;
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
): Promise<void> {
  if (!db) return;
  console.log(`[WS] saveDocContent by ${name} (${uid.slice(0, 6)})`);
  const { updateDoc, setDoc } = await import('firebase/firestore');
  const syncedPages =
    currentPageId && pages
      ? pages.map((page) => (page.id === currentPageId ? { ...page, docContent } : page))
      : undefined;
  const payload = {
    docContent,
    docUpdatedBy: uid,
    updatedAt: Date.now(),
    updatedBy: uid,
    updatedByName: name,
    ...(syncedPages ? { pages: syncedPages } : {}),
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
): Promise<void> {
  if (!db) return;
  console.log(`[WS] saveWorkspace by ${name} (${uid.slice(0, 6)}) — ${items.length} items`);
  const { updateDoc, setDoc } = await import('firebase/firestore');
  const syncedPages =
    currentPageId && pages
      ? pages.map((page) => (page.id === currentPageId ? { ...page, items } : page))
      : undefined;
  const payload = {
    items,
    itemsUpdatedBy: uid,
    updatedAt: Date.now(),
    updatedBy: uid,
    updatedByName: name,
    ...(syncedPages ? { pages: syncedPages } : {}),
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
): Promise<void> {
  if (!db) return;
  console.log(`[WS] saveWorkspaceItem by ${name} (${uid.slice(0, 6)}) — ${item.id}`);
  const { runTransaction, setDoc, getDoc } = await import('firebase/firestore');

  try {
    await runTransaction(db, async (transaction) => {
      const ref = workspaceRef(classId);
      const snapshot = await transaction.get(ref);
      const currentData = snapshot.exists() ? (snapshot.data() as WorkspaceDoc) : null;
      const currentItems = currentData?.items ?? [];
      const nextItems = upsertWorkspaceItemByFreshness(currentItems, item);
      const currentPages = currentData?.pages
        ? normalizeWorkspacePages(currentData.pages as Partial<WorkspacePage>[])
        : [];
      const nextPages =
        currentPageId && currentPages.length > 0
          ? currentPages.map((page) =>
              page.id === currentPageId
                ? { ...page, items: upsertWorkspaceItemByFreshness(page.items ?? [], item) }
                : page,
            )
          : currentPages;

      transaction.set(
        ref,
        {
          items: nextItems,
          itemsUpdatedBy: uid,
          updatedAt: Date.now(),
          updatedBy: uid,
          updatedByName: name,
          ...(nextPages.length > 0 ? { pages: nextPages } : {}),
        },
        { merge: true },
      );
    });
    console.log('[WS] saveWorkspaceItem ✅');
  } catch (err) {
    console.warn('[WS] saveWorkspaceItem transaction failed — falling back to setDoc:', err);
    const currentSnapshot = await getDoc(workspaceRef(classId));
    const currentData = currentSnapshot.exists() ? (currentSnapshot.data() as WorkspaceDoc) : null;
    const currentItems = currentData?.items ?? [];
    const nextItems = upsertWorkspaceItemByFreshness(currentItems, item);
    const currentPages = currentData?.pages
      ? normalizeWorkspacePages(currentData.pages as Partial<WorkspacePage>[])
      : [];
    const nextPages =
      currentPageId && currentPages.length > 0
        ? currentPages.map((page) =>
            page.id === currentPageId
              ? { ...page, items: upsertWorkspaceItemByFreshness(page.items ?? [], item) }
              : page,
          )
        : currentPages;
    await setDoc(
      workspaceRef(classId),
      {
        items: nextItems,
        itemsUpdatedBy: uid,
        updatedAt: Date.now(),
        updatedBy: uid,
        updatedByName: name,
        ...(nextPages.length > 0 ? { pages: nextPages } : {}),
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
): Promise<void> {
  if (!db) return;
  const { updateDoc, setDoc } = await import('firebase/firestore');
  const payload = {
    pages,
    currentPageId,
    docContent,
    docUpdatedBy: uid,
    items,
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
