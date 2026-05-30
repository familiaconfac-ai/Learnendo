/**
 * materialsService.ts
 *
 * Manages reusable workspace materials stored independently of live sessions.
 *
 * Firestore structure:
 *   materials/{materialId}
 *     title: string
 *     description?: string
 *     language?: string
 *     level?: string
 *     tags: string[]
 *     pages: WorkspaceMaterialPage[]
 *     createdBy: string   (uid)
 *     createdAt: number   (ms epoch)
 *     updatedAt: number   (ms epoch)
 *
 * Rules:
 * - Materials are completely independent from liveClasses documents.
 * - Loading a material writes to liveClasses/{classId}/shared/workspace (merge),
 *   which triggers the existing subscribeWorkspace subscription on all clients.
 * - Saving a material NEVER touches the live session document.
 */

import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import type {
  WorkspaceItem,
  WorkspacePage,
  WorkspaceSurfaceMode,
  WorkspaceSurfaceState,
} from './workspaceService';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WorkspaceMaterialPage {
  id: string;    // required; pre-Fase-2 docs may lack this — normalizePages() fills it in
  name: string;
  backgroundColor?: string;
  docContent: string;
  items: WorkspaceItem[];
}

export interface WorkspaceMaterial {
  id: string;
  title: string;
  description?: string;
  language?: string;
  level?: string;
  tags: string[];
  pages: WorkspaceMaterialPage[];
  surfaceMode?: WorkspaceSurfaceMode;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface SaveMaterialOptions {
  title: string;
  description?: string;
  language?: string;
  level?: string;
  tags?: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Normalize a pages array from Firestore. Handles pre-Fase-2 pages without id. */
function normalizePages(raw: Partial<WorkspaceMaterialPage>[]): WorkspaceMaterialPage[] {
  return (raw ?? []).map((p, i) => ({
    id: p.id ?? `pg_${i}_${Math.random().toString(36).slice(2, 6)}`,
    name: p.name ?? `Página ${i + 1}`,
    backgroundColor: p.backgroundColor ?? '#ffffff',
    docContent: p.docContent ?? '',
    items: p.items ?? [],
  }));
}

function materialsCollection() {
  return collection(db!, 'materials');
}

function materialDocRef(materialId: string) {
  return doc(db!, 'materials', materialId);
}

// ── FUNCIONALIDADE 1: Salvar material ────────────────────────────────────────

/**
 * Saves all pages of the current workspace as a reusable material.
 * Does NOT alter the live session document.
 *
 * @param pages   All pages to save (active page content must already be flushed into this array)
 * @returns the generated materialId
 */
export async function saveWorkspaceAsMaterial(
  pages: WorkspacePage[],
  options: SaveMaterialOptions,
  ownerUid?: string,
  surfaceMode: WorkspaceSurfaceMode = 'document',
): Promise<string> {
  console.log('[Materials] saveWorkspaceAsMaterial CALLED with pages:', pages.length, 'title:', options.title);
  console.log('[Materials] Auth currentUser:', auth.currentUser?.uid, 'isAnonymous:', auth.currentUser?.isAnonymous);

  if (!db) {
    console.error('[Materials] Firestore not initialized (db is null)');
    throw new Error('Firestore not initialized');
  }

  const uid = ownerUid ?? auth.currentUser?.uid;
  if (!uid) {
    console.error('[Materials] No authenticated user when saving material');
    throw new Error('User must be authenticated to save materials');
  }

  // Log userId comparison for debugging
  console.log('[Materials] Using auth uid:', uid);

  // Strip data-URL imageUrls from every page's items — base64 images can exceed Firestore's 1 MB limit.
  const safePages: WorkspaceMaterialPage[] = pages.map((page, i) => ({
    id: page.id ?? `pg_${i}_${Math.random().toString(36).slice(2, 6)}`,
    name: page.name,
    backgroundColor: page.backgroundColor ?? '#ffffff',
    docContent: page.docContent,
    items: page.items.map((item) => {
      if (item.type === 'image' && item.imageUrl?.startsWith('data:')) {
        console.warn('[Materials] stripping base64 imageUrl from item', item.id, '— upload to Storage first');
        return { ...item, imageUrl: '' };
      }
      return item;
    }),
  }));

  const materialId = randomId();
  const now = Date.now();

  const material: Omit<WorkspaceMaterial, 'id'> = {
    title: options.title,
    description: options.description ?? '',
    language: options.language ?? '',
    level: options.level ?? '',
    tags: options.tags ?? [],
    pages: safePages,
    surfaceMode,
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
  };

  console.log(`[Materials] SAVE START — id=${materialId} title="${options.title}" pages=${safePages.length} createdBy=${uid.slice(0, 8)}`);
  console.log('[Materials] save payload:', material);
  try {
    await setDoc(materialDocRef(materialId), material);
    console.log(`[Materials] SAVE SUCCESS ✅ — materialId=${materialId} in Firestore`);
  } catch (err) {
    console.error('[Materials] SAVE FAILED ❌:', err);
    throw err;
  }
  return materialId;
}

export async function updateWorkspaceMaterial(
  materialId: string,
  pages: WorkspacePage[],
  options?: Partial<SaveMaterialOptions>,
  surfaceMode: WorkspaceSurfaceMode = 'document',
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  if (!materialId) throw new Error('Material id is required');

  const snap = await getDoc(materialDocRef(materialId));
  if (!snap.exists()) {
    throw new Error(`Material ${materialId} not found`);
  }

  const current = snap.data() as Omit<WorkspaceMaterial, 'id'>;
  const safePages: WorkspaceMaterialPage[] = pages.map((page, i) => ({
    id: page.id ?? `pg_${i}_${Math.random().toString(36).slice(2, 6)}`,
    name: page.name,
    backgroundColor: page.backgroundColor ?? '#ffffff',
    docContent: page.docContent,
    items: page.items.map((item) => {
      if (item.type === 'image' && item.imageUrl?.startsWith('data:')) {
        console.warn('[Materials] stripping base64 imageUrl from item during update', item.id, '— upload to Storage first');
        return { ...item, imageUrl: item.assetUrl ?? '' };
      }
      return item;
    }),
  }));

  const payload: Omit<WorkspaceMaterial, 'id'> = {
    ...current,
    title: options?.title?.trim() || current.title,
    description: options?.description ?? current.description ?? '',
    language: options?.language ?? current.language ?? '',
    level: options?.level ?? current.level ?? '',
    tags: options?.tags ?? current.tags ?? [],
    pages: safePages,
    surfaceMode,
    updatedAt: Date.now(),
  };

  await setDoc(materialDocRef(materialId), payload, { merge: true });
  console.log(`[Materials] updateWorkspaceMaterial ✅ — materialId=${materialId} pages=${safePages.length}`);
}

// ── FUNCIONALIDADE 2: Abrir material na lousa ao vivo ────────────────────────

/**
 * Loads a saved material into the live workspace of a class session.
 * Writes ALL pages + currentPageId + first page's docContent/items to Firestore,
 * triggering subscribeWorkspace on all connected clients.
 *
 * Returns the normalized pages and currentPageId so the caller can update local state
 * immediately (without waiting for the self-echo snapshot).
 */
export async function loadMaterialToWorkspace(
  materialId: string,
  classId: string,
  name: string,
): Promise<{ pages: WorkspaceMaterialPage[]; currentPageId: string; surfaceMode: WorkspaceSurfaceMode; title: string }> {
  console.log('[Materials] loadMaterialToWorkspace CALLED with materialId:', materialId, 'classId:', classId);

  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('User not authenticated');
  }

  if (!db) throw new Error('Firestore not initialized');

  console.log(`[Materials] LOAD TO WORKSPACE START — materialId=${materialId} classId=${classId} uid=${uid.slice(0, 8)}`);
  
  const snap = await getDoc(materialDocRef(materialId));
  if (!snap.exists()) {
    console.error(`[Materials] Material not found: ${materialId}`);
    throw new Error(`Material ${materialId} not found`);
  }

  const material = snap.data() as Omit<WorkspaceMaterial, 'id'>;
  const targetSurfaceMode = material.surfaceMode ?? 'document';
  console.log(`[Materials] Material fetched: title="${material.title}" createdBy=${material.createdBy.slice(0, 8)}`);
  
  const pages = normalizePages(material.pages);
  if (pages.length === 0) {
    console.error('[Materials] Material has no pages');
    throw new Error('Material has no pages');
  }

  const firstPage = pages[0];
  const workspaceRef = doc(db, 'liveClasses', classId, 'shared', 'workspace');
  const targetState: WorkspaceSurfaceState = {
    pages,
    currentPageId: firstPage.id,
    docContent: firstPage.docContent,
    items: firstPage.items,
  };
  const surfaceKey = targetSurfaceMode === 'slides' ? 'slidesState' : 'boardState';
  
  console.log(`[Materials] Writing to workspace: pages=${pages.length} currentPageId=${firstPage.id}`);
  await setDoc(
    workspaceRef,
    {
      surfaceMode: targetSurfaceMode,
      [surfaceKey]: targetState,
      pages,
      currentPageId: firstPage.id,
      docContent: firstPage.docContent,
      docUpdatedBy: uid,
      items: firstPage.items,
      itemsUpdatedBy: uid,
      updatedAt: Date.now(),
      updatedBy: uid,
      updatedByName: name,
    },
    { merge: true },
  );
  console.log(`[Materials] LOAD TO WORKSPACE SUCCESS ✅ — materialId=${materialId} written to classId=${classId}`);
  return { pages, currentPageId: firstPage.id, surfaceMode: targetSurfaceMode, title: material.title };
}

// ── FUNCIONALIDADE 3: Duplicar material ─────────────────────────────────────

/**
 * Duplicates an existing material, creating a new document with a new ID.
 * The title gets a " (cópia)" suffix. createdBy is set to the requesting user.
 *
 * @returns the new materialId
 */
export async function duplicateMaterial(
  materialId: string,
  userId: string,
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const snap = await getDoc(materialDocRef(materialId));
  if (!snap.exists()) throw new Error(`Material ${materialId} not found`);

  const source = snap.data() as Omit<WorkspaceMaterial, 'id'>;
  const newId = randomId();
  const now = Date.now();

  await setDoc(materialDocRef(newId), {
    ...source,
    title: `${source.title} (cópia)`,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`[Materials] duplicateMaterial ${materialId} → ${newId}`);
  return newId;
}

// ── FUNCIONALIDADE 4: Listar materiais do usuário ─────────────────────────────

/**
 * Returns all materials created by a user, ordered by updatedAt descending.
 * Firestore rules restrict read access to documents where createdBy == request.auth.uid.
 */
export async function deleteMaterialFromLibrary(materialId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  if (!materialId) return;

  await deleteDoc(materialDocRef(materialId));
  console.log(`[Materials] deleteMaterialFromLibrary âœ… â€” materialId=${materialId}`);
}

export async function getMaterialsByUser(ownerUid?: string): Promise<WorkspaceMaterial[]> {
  console.log('[Materials] getMaterialsByUser CALLED');
  console.log('[Materials] Auth currentUser:', auth.currentUser?.uid, 'isAnonymous:', auth.currentUser?.isAnonymous);

  const uid = ownerUid ?? auth.currentUser?.uid;
  if (!uid) {
    console.error('[Materials] LOAD FAILED ❌ — No authenticated user');
    return [];
  }

  if (!db) {
    console.warn('[Materials] LOAD WARNING — Firestore not initialized, returning empty list');
    return [];
  }

  console.log(`[Materials] LOAD START — querying materials for user=${uid.slice(0, 8)}`);

  try {
    const q = query(
      materialsCollection(),
      where('createdBy', '==', uid),
    );

    const snapshot = await getDocs(q);
    const materials = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as WorkspaceMaterial))
      .sort((left, right) => {
        const leftStamp = typeof left.updatedAt === 'number' ? left.updatedAt : left.createdAt ?? 0;
        const rightStamp = typeof right.updatedAt === 'number' ? right.updatedAt : right.createdAt ?? 0;
        return rightStamp - leftStamp;
      });
    console.log(`[Materials] LOAD SUCCESS ✅ — found ${materials.length} materials for user=${uid.slice(0, 8)}`);
    if (materials.length === 0) {
      console.log('[Materials] No materials found (empty list is OK)');
    }
    return materials;
  } catch (err) {
    console.error('[Materials] LOAD FAILED ❌ — query error:', err);
    console.error(`[Materials] Attempted query: userId=${uid.slice(0, 8)}`);
    return [];
  }
}
