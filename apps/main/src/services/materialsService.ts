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
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import type { WorkspaceItem, WorkspacePage } from './workspaceService';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WorkspaceMaterialPage {
  id: string;    // required; pre-Fase-2 docs may lack this — normalizePages() fills it in
  name: string;
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
  userId: string,
  options: SaveMaterialOptions,
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId) throw new Error('userId is required to save a material');

  // Strip data-URL imageUrls from every page's items — base64 images can exceed Firestore's 1 MB limit.
  const safePages: WorkspaceMaterialPage[] = pages.map((page, i) => ({
    id: page.id ?? `pg_${i}_${Math.random().toString(36).slice(2, 6)}`,
    name: page.name,
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
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  console.log(`[Materials] saveWorkspaceAsMaterial — id=${materialId} title="${options.title}" pages=${safePages.length} userId=${userId.slice(0, 6)}`);
  try {
    await setDoc(materialDocRef(materialId), material);
  } catch (err) {
    console.error('[Materials] saveWorkspaceAsMaterial FAILED:', err);
    throw err;
  }
  console.log(`[Materials] saveWorkspaceAsMaterial ✅ id=${materialId}`);
  return materialId;
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
  uid: string,
  name: string,
): Promise<{ pages: WorkspaceMaterialPage[]; currentPageId: string }> {
  if (!db) throw new Error('Firestore not initialized');

  const snap = await getDoc(materialDocRef(materialId));
  if (!snap.exists()) throw new Error(`Material ${materialId} not found`);

  const material = snap.data() as Omit<WorkspaceMaterial, 'id'>;
  const pages = normalizePages(material.pages);
  if (pages.length === 0) throw new Error('Material has no pages');

  const firstPage = pages[0];
  const workspaceRef = doc(db, 'liveClasses', classId, 'shared', 'workspace');
  await setDoc(
    workspaceRef,
    {
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
  console.log(`[Materials] loadMaterialToWorkspace materialId=${materialId} → classId=${classId} pages=${pages.length}`);
  return { pages, currentPageId: firstPage.id };
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
 */
export async function getMaterialsByUser(userId: string): Promise<WorkspaceMaterial[]> {
  if (!db) return [];

  const q = query(
    materialsCollection(),
    where('createdBy', '==', userId),
    orderBy('updatedAt', 'desc'),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as WorkspaceMaterial));
}
