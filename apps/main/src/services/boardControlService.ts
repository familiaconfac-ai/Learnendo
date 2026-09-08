import { doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { canAcquireBoard, ownsBoard, type BoardControl, type BoardView } from '../models/boardControl';
import type { WorkspaceItem, WorkspacePage, WorkspaceSurfaceMode, WorkspaceSurfaceState } from './workspaceService';

function normalizeWorkspacePages(raw: Partial<WorkspacePage>[]): WorkspacePage[] {
  return (raw ?? []).map((page, index) => ({
    ...page,
    id: page.id ?? `pg_${index}`,
    name: page.name ?? `Page ${index + 1}`,
    backgroundColor: page.backgroundColor ?? '#ffffff',
    docContent: page.docContent ?? '',
    items: page.items ?? [],
  }));
}

export const boardControlRef = (classId: string) => doc(db, 'liveClasses', classId, 'shared', 'boardControl');
export const boardViewRef = (classId: string) => doc(db, 'liveClasses', classId, 'shared', 'boardView');
export const boardPresentationRef = (classId: string) => doc(db, 'liveClasses', classId, 'shared', 'boardPresentation');
export interface BoardAcquireTrace {
  phase: 'transaction-read';
  controllerId: string | null;
  controllerClientId: string | null;
  controlEpoch: number | null;
  studentAcquireEnabled: boolean;
  waitingForStudent: boolean;
}
export function subscribeBoardControl(classId: string, receive: (control: BoardControl | null, online: boolean) => void, fail: (error: Error) => void) {
  let control: BoardControl | null = null;
  let view: { epoch: number; view: BoardView; updatedAt?: { toMillis?: () => number }; receivedAtMs?: number } | null = null;
  let controlOnline = false; let viewOnline = false;
  const emit = () => receive(control ? {
    ...control,
    view: view?.epoch === control.epoch ? view.view : control.view,
    viewUpdatedAtMs: view?.epoch === control.epoch ? view.updatedAt?.toMillis?.() ?? null : null,
    viewReceivedAtMs: view?.epoch === control.epoch ? view.receivedAtMs ?? null : null,
  } : null, controlOnline && viewOnline);
  const stopControl = onSnapshot(boardControlRef(classId), { includeMetadataChanges: true }, snapshot => {
    if (snapshot.metadata.hasPendingWrites) return;
    control = snapshot.exists() ? snapshot.data() as BoardControl : null; controlOnline = !snapshot.metadata.fromCache; emit();
  }, fail);
  const stopView = onSnapshot(boardViewRef(classId), { includeMetadataChanges: true }, snapshot => {
    if (snapshot.metadata.hasPendingWrites) return;
    view = snapshot.exists() ? { ...snapshot.data(), receivedAtMs: Date.now() } as typeof view : null; viewOnline = !snapshot.metadata.fromCache; emit();
  }, fail);
  return () => { stopControl(); stopView(); };
}
export async function acquireBoard(classId: string, uid: string, clientId: string, controllerName: string, teacher: boolean, displayedView?: BoardView | null, trace?: (entry: BoardAcquireTrace) => void): Promise<number> {
  return runTransaction(db, async transaction => {
    const ref = boardControlRef(classId);
    const snapshot = await transaction.get(ref);
    const previous = snapshot.exists() ? snapshot.data() as BoardControl : null;
    trace?.({
      phase: 'transaction-read',
      controllerId: previous?.controllerId ?? null,
      controllerClientId: previous?.controllerClientId ?? null,
      controlEpoch: previous?.epoch ?? null,
      studentAcquireEnabled: canAcquireBoard(previous, uid, teacher, Date.now()),
      waitingForStudent: previous?.acquisitionOpen === true,
    });
    if (!canAcquireBoard(previous, uid, teacher, Date.now())) throw new Error('Board control unavailable');
    const epoch = (previous?.epoch ?? 0) + (teacher && ownsBoard(previous, uid, clientId) ? 0 : 1);
    const lastView = teacher ? null : (await transaction.get(boardViewRef(classId))).data();
    transaction.set(ref, {
      acquisitionOpen: false,
      controllerId: uid, controllerName: controllerName.trim() || uid, controllerClientId: clientId, epoch,
      teacherLeaseAt: teacher ? serverTimestamp() : null,
      view: teacher ? displayedView ?? previous?.view ?? null : lastView?.epoch === previous?.epoch ? lastView.view : previous?.view ?? null,
      updatedAt: serverTimestamp(),
    });
    return epoch;
  });
}
export async function setBoardStudentAcquisition(classId: string, uid: string, clientId: string, controllerName: string, open: boolean) {
  await runTransaction(db, async transaction => {
    const ref = boardControlRef(classId);
    const snapshot = await transaction.get(ref);
    const previous = snapshot.data() as BoardControl | undefined;
    const lastView = (await transaction.get(boardViewRef(classId))).data();
    transaction.set(ref, {
      acquisitionOpen: open, controllerId: uid, controllerName: controllerName.trim() || uid, controllerClientId: clientId,
      epoch: (previous?.epoch ?? 0) + 1, teacherLeaseAt: null,
      view: lastView?.epoch === previous?.epoch ? lastView.view : previous?.view ?? null, updatedAt: serverTimestamp(),
    });
  });
}
export async function releaseTeacherBoard(classId: string, uid: string, clientId: string, epoch: number) {
  await runTransaction(db, async transaction => {
    const ref = boardControlRef(classId);
    const snapshot = await transaction.get(ref);
    const current = snapshot.data() as BoardControl;
    if (!ownsBoard(current, uid, clientId) || current.epoch !== epoch || !current.teacherLeaseAt) return;
    const lastView = (await transaction.get(boardViewRef(classId))).data();
    transaction.update(ref, { teacherLeaseAt: null, epoch: epoch + 1, view: lastView?.epoch === epoch ? lastView.view : current.view, updatedAt: serverTimestamp() });
  });
}
export async function publishBoardView(classId: string, uid: string, clientId: string, epoch: number, view: BoardView) {
  await runTransaction(db, async transaction => {
    const ref = boardControlRef(classId);
    const snapshot = await transaction.get(ref);
    const control = snapshot.data() as BoardControl;
    if (!ownsBoard(control, uid, clientId) || control.epoch !== epoch) return;
    transaction.set(boardViewRef(classId), { epoch, controllerId: uid, controllerClientId: clientId, view, updatedAt: serverTimestamp() });
  });
}

// Per-canvas capability. Captured before any async save work; Rules reject stale epochs.
export interface BoardWriteStamp {
  controlEpoch: number;
  controlClientId: string;
  workspaceMutationSeq: number;
}
export type WorkspaceMutationKind = 'document' | 'items' | 'structure';
export function subscribeBoardPresentation(classId: string, receive: (presentationMode: boolean) => void, fail: (error: Error) => void) {
  return onSnapshot(boardPresentationRef(classId), { includeMetadataChanges: true }, snapshot => {
    if (snapshot.metadata.hasPendingWrites) return;
    receive(snapshot.exists() && snapshot.data().presentationMode === true);
  }, fail);
}
export async function setBoardPresentationMode(classId: string, presentationMode: boolean) {
  await setDoc(boardPresentationRef(classId), { presentationMode, updatedAt: serverTimestamp() });
}

const writers = new Map<string, {
  uid: string;
  nextMutationSeq: number;
  stamp: () => { controlEpoch: number; controlClientId: string };
}>();
export function registerBoardWriter(classId: string, uid: string, stamp: () => { controlEpoch: number; controlClientId: string }) {
  const entry = { uid, stamp, nextMutationSeq: 0 }; writers.set(classId, entry);
  return () => { if (writers.get(classId) === entry) writers.delete(classId); };
}
export function boardWriteStamp(classId: string, uid: string): BoardWriteStamp {
  const writer = writers.get(classId);
  if (!writer || writer.uid !== uid) throw new Error('Board writer is not active');
  return { ...writer.stamp(), workspaceMutationSeq: ++writer.nextMutationSeq };
}

/** Revalidate the captured capability at commit; the writer also requires server-confirmed connectivity. */
export async function commitBoardWorkspace(
  classId: string,
  value: Record<string, unknown>,
  mutationKind: WorkspaceMutationKind = 'structure',
) {
  await runTransaction(db, async transaction => {
    const control = (await transaction.get(boardControlRef(classId))).data() as BoardControl | undefined;
    if (!control || control.epoch !== value.controlEpoch || control.controllerId !== value.updatedBy || control.controllerClientId !== value.controlClientId) throw new Error('Board authority changed');
    const workspace = doc(db, 'liveClasses', classId, 'shared', 'workspace');
    const current = (await transaction.get(workspace)).data() as Record<string, unknown> | undefined;
    const sameGeneration = current?.controlEpoch === value.controlEpoch
      && current?.controlClientId === value.controlClientId;
    if (sameGeneration
      && typeof current?.workspaceMutationSeq === 'number'
      && typeof value.workspaceMutationSeq === 'number'
      && current.workspaceMutationSeq >= value.workspaceMutationSeq) return;
    const currentRevision = typeof current?.workspaceRevision === 'number' ? current.workspaceRevision : 0;
    const nextValue: Record<string, unknown> = {
      ...value,
      workspaceRevision: currentRevision + 1,
      updatedAt: serverTimestamp(),
    };
    const incomingPages = value.pages
      ? normalizeWorkspacePages(value.pages as Partial<WorkspacePage>[])
      : [];
    const surfaceMode = (value.surfaceMode ?? current?.surfaceMode ?? 'document') as WorkspaceSurfaceMode;
    const modeKey = surfaceMode === 'slides' ? 'slidesState' : 'boardState';
    const currentSurface = (current?.[modeKey] ?? {}) as Partial<WorkspaceSurfaceState>;
    const incomingSurface = (value[modeKey] ?? {}) as Partial<WorkspaceSurfaceState>;
    const currentPages = current?.pages
      ? normalizeWorkspacePages(current.pages as Partial<WorkspacePage>[])
      : currentSurface.pages
        ? normalizeWorkspacePages(currentSurface.pages as Partial<WorkspacePage>[])
        : [];
    const currentDoc = typeof current?.docContent === 'string' ? current.docContent : '';
    const currentItems = (current?.items ?? []) as WorkspaceItem[];
    const currentPageId = (current?.currentPageId ?? currentSurface.currentPageId ?? '') as string;

    if (mutationKind === 'document' && incomingPages.length > 0) {
      const nextDoc = (value.docContent ?? incomingSurface.docContent ?? '') as string;
      const pages = currentPages.length > 0
        ? currentPages.map((page) => page.id === value.currentPageId ? { ...page, docContent: nextDoc } : page)
        : incomingPages;
      const items = (currentSurface.items ?? currentItems) as WorkspaceItem[];
      nextValue.pages = pages;
      nextValue.items = items;
      nextValue[modeKey] = { ...currentSurface, pages, currentPageId: value.currentPageId ?? currentPageId, docContent: nextDoc, items };
    } else if (mutationKind === 'items' && incomingPages.length > 0) {
      const activePageId = (value.currentPageId ?? incomingSurface.currentPageId ?? currentPageId) as string;
      const incomingActive = incomingPages.find((page) => page.id === activePageId);
      const pages = currentPages.length > 0
        ? currentPages.map((page) => page.id === activePageId && incomingActive ? { ...page, items: incomingActive.items } : page)
        : incomingPages;
      const docContent = (currentSurface.docContent ?? currentDoc) as string;
      const items = (incomingActive?.items ?? value.items ?? currentSurface.items ?? currentItems) as WorkspaceItem[];
      nextValue.pages = pages;
      nextValue.docContent = docContent;
      nextValue[modeKey] = { ...currentSurface, pages, currentPageId: activePageId, docContent, items };
    }
    transaction.set(workspace, nextValue, { merge: true });
  });
}
