import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { canAcquireBoard, ownsBoard, type BoardControl, type BoardView } from '../models/boardControl';

export const boardControlRef = (classId: string) => doc(db, 'liveClasses', classId, 'shared', 'boardControl');
export const boardViewRef = (classId: string) => doc(db, 'liveClasses', classId, 'shared', 'boardView');
export function subscribeBoardControl(classId: string, receive: (control: BoardControl | null, online: boolean) => void, fail: (error: Error) => void) {
  let control: BoardControl | null = null;
  let view: { epoch: number; view: BoardView } | null = null;
  let controlOnline = false; let viewOnline = false;
  const emit = () => receive(control ? { ...control, view: view?.epoch === control.epoch ? view.view : control.view } : null, controlOnline && viewOnline);
  const stopControl = onSnapshot(boardControlRef(classId), { includeMetadataChanges: true }, snapshot => {
    if (snapshot.metadata.hasPendingWrites) return;
    control = snapshot.exists() ? snapshot.data() as BoardControl : null; controlOnline = !snapshot.metadata.fromCache; emit();
  }, fail);
  const stopView = onSnapshot(boardViewRef(classId), { includeMetadataChanges: true }, snapshot => {
    if (snapshot.metadata.hasPendingWrites) return;
    view = snapshot.exists() ? snapshot.data() as typeof view : null; viewOnline = !snapshot.metadata.fromCache; emit();
  }, fail);
  return () => { stopControl(); stopView(); };
}
export async function acquireBoard(classId: string, uid: string, clientId: string, teacher: boolean, displayedView?: BoardView | null): Promise<number> {
  return runTransaction(db, async transaction => {
    const ref = boardControlRef(classId);
    const snapshot = await transaction.get(ref);
    const previous = snapshot.exists() ? snapshot.data() as BoardControl : null;
    if (!canAcquireBoard(previous, uid, teacher, Date.now())) throw new Error('Board control unavailable');
    const epoch = (previous?.epoch ?? 0) + (teacher && ownsBoard(previous, uid, clientId) ? 0 : 1);
    const lastView = teacher ? null : (await transaction.get(boardViewRef(classId))).data();
    transaction.set(ref, {
      designatedStudentId: previous?.designatedStudentId ?? null,
      controllerId: uid, controllerClientId: clientId, epoch,
      teacherLeaseAt: teacher ? serverTimestamp() : null,
      view: teacher ? displayedView ?? previous?.view ?? null : lastView?.epoch === previous?.epoch ? lastView.view : previous?.view ?? null,
      updatedAt: serverTimestamp(),
    });
    return epoch;
  });
}
export async function designateBoardStudent(classId: string, uid: string, clientId: string, studentId: string | null) {
  await runTransaction(db, async transaction => {
    const ref = boardControlRef(classId);
    const snapshot = await transaction.get(ref);
    const previous = snapshot.data() as BoardControl | undefined;
    const lastView = (await transaction.get(boardViewRef(classId))).data();
    transaction.set(ref, {
      designatedStudentId: studentId, controllerId: uid, controllerClientId: clientId,
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
const writers = new Map<string, { uid: string; stamp: () => { controlEpoch: number; controlClientId: string } }>();
export function registerBoardWriter(classId: string, uid: string, stamp: () => { controlEpoch: number; controlClientId: string }) {
  const entry = { uid, stamp }; writers.set(classId, entry);
  return () => { if (writers.get(classId) === entry) writers.delete(classId); };
}
export function boardWriteStamp(classId: string, uid: string) {
  const writer = writers.get(classId);
  if (!writer || writer.uid !== uid) throw new Error('Board writer is not active');
  return writer.stamp();
}

/** Revalidate the captured capability at commit; the writer also requires server-confirmed connectivity. */
export async function commitBoardWorkspace(classId: string, value: Record<string, unknown>) {
  await runTransaction(db, async transaction => {
    const control = (await transaction.get(boardControlRef(classId))).data() as BoardControl | undefined;
    if (!control || control.epoch !== value.controlEpoch || control.controllerId !== value.updatedBy || control.controllerClientId !== value.controlClientId) throw new Error('Board authority changed');
    transaction.set(doc(db, 'liveClasses', classId, 'shared', 'workspace'), value, { merge: true });
  });
}
