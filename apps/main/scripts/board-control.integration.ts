import assert from 'node:assert/strict';
import { initializeApp as adminApp, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, doc, getDoc, setDoc, updateDoc, runTransaction, serverTimestamp, terminate, disableNetwork, enableNetwork } from 'firebase/firestore';
import { auth, db, firebaseRuntimeConfig } from '../src/services/firebase';
import { acquireBoard, designateBoardStudent, releaseTeacherBoard, publishBoardView, boardControlRef, boardViewRef, registerBoardWriter, subscribeBoardControl } from '../src/services/boardControlService';
import { saveDocContent, savePageSwitch, saveWorkspaceItem } from '../src/services/workspaceService';
import type { BoardControl, BoardView } from '../src/models/boardControl';

const projectId = firebaseRuntimeConfig.projectId;
assert.ok(projectId.startsWith('demo-'));
const admin = adminApp({ projectId }); const adb = adminFirestore(admin);
const teacher = (await signInAnonymously(auth)).user.uid;
const clients = [];
for (let i = 0; i < 4; i++) {
  const app = initializeApp({ projectId, apiKey: 'demo-key' }, `student-${i}`);
  const a = getAuth(app); connectAuthEmulator(a, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  const d = getFirestore(app); const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':'); connectFirestoreEmulator(d, host, Number(port));
  clients.push({ app, db: d, uid: (await signInAnonymously(a)).user.uid, client: `student-client-${i}` });
}
const [joao, maria, pedro, ana] = clients; const classId = `directed-board-${Date.now()}`;
await adb.doc(`users/${teacher}`).set({ role: 'teacher', name: 'Teacher' });
await adb.doc(`liveClasses/${classId}`).set({ createdBy: teacher, teacherUid: teacher, assignedStudentIds: clients.map(c => c.uid) });
const ref = doc(db, 'liveClasses', classId, 'shared', 'workspace');
const control = () => getDoc(boardControlRef(classId)).then(s => s.data() as BoardControl);
let epoch = await acquireBoard(classId, teacher, 'teacher-client', true);
const unregister = registerBoardWriter(classId, teacher, () => ({ controlEpoch: epoch, controlClientId: 'teacher-client' }));
const page = { id: 'p1', name: 'Page 1', docContent: '<p>Ub ----- bl</p>', items: [] };
await saveDocContent(classId, page.docContent, teacher, 'Teacher', page.id, [page]);
const view: BoardView = { surfaceMode: 'document', pageId: 'p1', scrollRatio: 0.9,
  selection: { target: 'document', itemId: null, fingerprint: 'fixture', range: { startPath: [0, 0], endPath: [0, 0], startOffset: 3, endOffset: 8 } } };
await publishBoardView(classId, teacher, 'teacher-client', epoch, view);
assert.deepEqual((await getDoc(boardViewRef(classId))).data()!.view, view);
assert.equal((await control()).view, null, 'visual updates never mutate authority');
const studentClaim = async (student: typeof joao) => runTransaction(student.db, async tx => {
  const r = doc(student.db, 'liveClasses', classId, 'shared', 'boardControl'); const old = (await tx.get(r)).data() as BoardControl;
  const visual = (await tx.get(doc(student.db, 'liveClasses', classId, 'shared', 'boardView'))).data();
  tx.update(r, { view: visual?.epoch === old.epoch ? visual.view : old.view, controllerId: student.uid, controllerClientId: student.client, epoch: old.epoch + 1, teacherLeaseAt: null, updatedAt: serverTimestamp() });
  return old.epoch + 1;
});
const writeAs = (student: typeof joao, version: number, html: string) => updateDoc(doc(student.db, 'liveClasses', classId, 'shared', 'workspace'), {
  docContent: html, docUpdatedBy: student.uid, updatedBy: student.uid, controlEpoch: version, controlClientId: student.client,
});
for (const follower of clients) {
  await assert.rejects(studentClaim(follower));
  await assert.rejects(updateDoc(doc(follower.db, 'liveClasses', classId, 'shared', 'boardControl'), { designatedStudentId: follower.uid }));
  await assert.rejects(writeAs(follower, epoch, 'wrong student'));
}
await designateBoardStudent(classId, teacher, 'teacher-client', joao.uid);
const joaoEpoch = await studentClaim(joao);
await writeAs(joao, joaoEpoch, '<p>Ub João bl</p>');
const publishAs = (student: typeof joao, version: number, ratio: number) => setDoc(doc(student.db, 'liveClasses', classId, 'shared', 'boardView'), {
  epoch: version, controllerId: student.uid, controllerClientId: student.client, view: { ...view, scrollRatio: ratio }, updatedAt: serverTimestamp(),
});
await publishAs(joao, joaoEpoch, 0.6);
await assert.rejects(publishAs(joao, joaoEpoch, 1.5));
for (const follower of [maria, pedro, ana]) {
  await assert.rejects(publishAs(follower, joaoEpoch, 0));
  await assert.rejects(writeAs(follower, joaoEpoch, 'hijack'));
  await assert.rejects(studentClaim(follower));
  await assert.rejects(updateDoc(doc(follower.db, 'liveClasses', classId, 'shared', 'boardControl'), { view: { ...view, scrollRatio: 0 }, updatedAt: serverTimestamp() }));
}
// Teacher always preempts, while keeping the designation. Stale/in-flight writes cannot win later.
epoch = await acquireBoard(classId, teacher, 'teacher-client', true);
await assert.rejects(studentClaim(joao));
await assert.rejects(writeAs(joao, joaoEpoch, 'late keystroke'));
await assert.rejects(publishAs(joao, joaoEpoch, 0));
await publishBoardView(classId, teacher, 'teacher-client', epoch, { ...view, scrollRatio: 0.2 });
await saveDocContent(classId, '<p>Ub ----- bl</p>', teacher, 'Teacher', page.id, [page]);
assert.equal((await control()).designatedStudentId, joao.uid);
await releaseTeacherBoard(classId, teacher, 'teacher-client', epoch);
assert.equal((await control()).view?.scrollRatio, 0.2, 'release freezes current visual handoff');
const resumedEpoch = await studentClaim(joao);
assert.equal((await control()).view?.scrollRatio, 0.2);
assert.ok(resumedEpoch > joaoEpoch);
await writeAs(joao, resumedEpoch, '<p>Ub resumed bl</p>');
await assert.rejects(writeAs(joao, joaoEpoch, 'stale before interruption'));
// Page/surface transitions and existing box ownership remain persisted by the same service.
epoch = await acquireBoard(classId, teacher, 'teacher-client', true);
const page2 = { ...page, id: 'p2', name: 'Page 2' };
await savePageSwitch(classId, [page, page2], 'p2', page2.docContent, [], teacher, 'Teacher', 'slides');
await saveWorkspaceItem(classId, { id: 'box', type: 'text', ownerUserId: joao.uid, boxRole: 'student', x: 1, y: 1, w: 20, h: 20, content: 'Owned', updatedAt: Date.now(), updatedBy: teacher, updatedByName: 'Teacher' }, teacher, 'Teacher', 'p2', 'slides');
const stored = (await getDoc(ref)).data()!;
assert.equal(stored.currentPageId, 'p2'); assert.equal(stored.surfaceMode, 'slides'); assert.equal(stored.items[0].ownerUserId, joao.uid);
// A refresh can read designation, authoritative view and persistent pages without acquiring control.
const refreshed = (await getDoc(doc(maria.db, 'liveClasses', classId, 'shared', 'boardControl'))).data()!;
assert.equal(refreshed.designatedStudentId, joao.uid); assert.equal(refreshed.controllerId, teacher);
assert.equal((await getDoc(doc(ana.db, 'liveClasses', classId, 'shared', 'workspace'))).data()!.currentPageId, 'p2');
// Use the same server-confirmed connectivity guard as the mounted Canvas.
let online = true;
let receivedOffline: () => void;
let receivedOnline: () => void;
let observedOnline = false;
const onlineSnapshot = new Promise<void>(resolve => { receivedOnline = resolve; });
const offlineSnapshot = new Promise<void>(resolve => { receivedOffline = resolve; });
const stopConnectivity = subscribeBoardControl(classId, (_value, connected) => {
  online = connected;
  if (connected) { observedOnline = true; receivedOnline(); }
  else if (observedOnline) receivedOffline();
}, error => { throw error; });
await onlineSnapshot;
const unregisterGuarded = registerBoardWriter(classId, teacher, () => {
  if (!online) throw new Error('Board connection unavailable');
  return { controlEpoch: epoch, controlClientId: 'teacher-client' };
});
await disableNetwork(db);
await offlineSnapshot;
await assert.rejects(saveDocContent(classId, 'offline content', teacher, 'Teacher', 'p2', [page, page2], 'slides'));
await enableNetwork(db);
assert.notEqual((await getDoc(ref)).data()!.docContent, 'offline content');
stopConnectivity(); unregisterGuarded();
console.log('Directed Board: teacher, designated pupil + 3 followers, takeover/resume, stale epochs, selection/scroll state, page/slides, ownership and refresh passed.');
unregister(); await terminate(db); await Promise.all(clients.map(async c => { await terminate(c.db); await deleteApp(c.app); })); await deleteAdmin(admin);
