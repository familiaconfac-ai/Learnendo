import assert from 'node:assert/strict';
import { initializeApp as adminApp, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, doc, getDoc, setDoc, updateDoc, runTransaction, serverTimestamp, terminate, disableNetwork, enableNetwork } from 'firebase/firestore';
import { auth, db, firebaseRuntimeConfig } from '../src/services/firebase';
import { acquireBoard, boardWriteStamp, commitBoardWorkspace, setBoardStudentAcquisition, publishBoardView, boardControlRef, boardViewRef, registerBoardWriter, subscribeBoardControl } from '../src/services/boardControlService';
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
const [joao, , , ana] = clients; const classId = `open-board-${Date.now()}`;
await adb.doc(`users/${teacher}`).set({ role: 'teacher', name: 'Teacher' });
await adb.doc(`liveClasses/${classId}`).set({ createdBy: teacher, teacherUid: teacher, assignedStudentIds: clients.map(c => c.uid) });
const ref = doc(db, 'liveClasses', classId, 'shared', 'workspace');
const control = () => getDoc(boardControlRef(classId)).then(s => s.data() as BoardControl);
let epoch = await acquireBoard(classId, teacher, 'teacher-client', 'Teacher', true);
const unregister = registerBoardWriter(classId, teacher, () => ({ controlEpoch: epoch, controlClientId: 'teacher-client' }));
const page = { id: 'p1', name: 'Page 1', docContent: '<p>Ub ----- bl</p>', items: [] };
await saveDocContent(classId, page.docContent, teacher, 'Teacher', page.id, [page]);

const stale = boardWriteStamp(classId, teacher); const fresh = boardWriteStamp(classId, teacher);
await commitBoardWorkspace(classId, { ...fresh, updatedBy: teacher, updatedByName: 'Teacher', docContent: '<p><span style="font-size: 18px">Stable</span></p>', docUpdatedBy: teacher });
await commitBoardWorkspace(classId, { ...stale, updatedBy: teacher, updatedByName: 'Teacher', docContent: '<p><span style="font-size: 48px">Stale</span></p>', docUpdatedBy: teacher });
assert.match((await getDoc(ref)).data()!.docContent, /18px/);
const view: BoardView = { surfaceMode: 'document', pageId: 'p1', scrollRatio: 0.9, selection: { target: 'document', itemId: null, fingerprint: 'fixture', range: { startPath: [0, 0], endPath: [0, 0], startOffset: 3, endOffset: 8 } } };
await publishBoardView(classId, teacher, 'teacher-client', epoch, view);
assert.deepEqual((await getDoc(boardViewRef(classId))).data()!.view, view);

const studentClaim = async (student: typeof joao) => runTransaction(student.db, async tx => {
  const r = doc(student.db, 'liveClasses', classId, 'shared', 'boardControl'); const old = (await tx.get(r)).data() as BoardControl;
  const visual = (await tx.get(doc(student.db, 'liveClasses', classId, 'shared', 'boardView'))).data();
  tx.update(r, { acquisitionOpen: false, view: visual?.epoch === old.epoch ? visual.view : old.view, controllerId: student.uid, controllerName: `Student ${student.uid.slice(-4)}`, controllerClientId: student.client, epoch: old.epoch + 1, teacherLeaseAt: null, updatedAt: serverTimestamp() });
  return old.epoch + 1;
});
const writeAs = (student: typeof joao, version: number, html: string) => updateDoc(doc(student.db, 'liveClasses', classId, 'shared', 'workspace'), { docContent: html, docUpdatedBy: student.uid, updatedBy: student.uid, controlEpoch: version, controlClientId: student.client });

for (const follower of clients) {
  await assert.rejects(studentClaim(follower), 'students cannot acquire while T is active');
  await assert.rejects(updateDoc(doc(follower.db, 'liveClasses', classId, 'shared', 'boardControl'), { acquisitionOpen: true }));
  await assert.rejects(writeAs(follower, epoch, 'wrong student'));
}

await setBoardStudentAcquisition(classId, teacher, 'teacher-client', 'Teacher', true);
assert.equal((await control()).acquisitionOpen, true);
const race = await Promise.allSettled(clients.map(student => studentClaim(student)));
assert.equal(race.filter(result => result.status === 'fulfilled').length, 1, 'exactly one first touch wins');
const winnerIndex = race.findIndex(result => result.status === 'fulfilled');
const winner = clients[winnerIndex]; const winnerEpoch = (race[winnerIndex] as PromiseFulfilledResult<number>).value;
assert.equal((await control()).controllerId, winner.uid); assert.equal((await control()).acquisitionOpen, false);
await writeAs(winner, winnerEpoch, '<p>First student owns the Board</p>');
for (const follower of clients.filter(student => student !== winner)) {
  await assert.rejects(studentClaim(follower)); await assert.rejects(writeAs(follower, winnerEpoch, 'hijack'));
}

await setBoardStudentAcquisition(classId, teacher, 'teacher-client', 'Teacher', false);
assert.equal((await control()).controllerId, teacher); assert.equal((await control()).acquisitionOpen, false);
await assert.rejects(writeAs(winner, winnerEpoch, 'late keystroke'));
await setBoardStudentAcquisition(classId, teacher, 'teacher-client', 'Teacher', true);
let joaoEpoch = await studentClaim(joao); await writeAs(joao, joaoEpoch, '<p>Ub João bl</p>');
const refreshedClient = { ...joao, client: 'joao-refreshed-client' };
joaoEpoch = await studentClaim(refreshedClient);
assert.equal((await control()).controllerClientId, refreshedClient.client);
await assert.rejects(writeAs(joao, joaoEpoch - 1, 'stale client'));

const publishAs = (student: typeof joao, version: number, ratio: number) => setDoc(doc(student.db, 'liveClasses', classId, 'shared', 'boardView'), { epoch: version, controllerId: student.uid, controllerClientId: student.client, view: { ...view, scrollRatio: ratio }, updatedAt: serverTimestamp() });
await publishAs(refreshedClient, joaoEpoch, 0.6); await assert.rejects(publishAs(refreshedClient, joaoEpoch, 1.5));
epoch = await acquireBoard(classId, teacher, 'teacher-client', 'Teacher', true);
await assert.rejects(writeAs(refreshedClient, joaoEpoch, 'late write'));
await publishBoardView(classId, teacher, 'teacher-client', epoch, { ...view, scrollRatio: 0.2 });
await saveDocContent(classId, '<p>Ub ----- bl</p>', teacher, 'Teacher', page.id, [page]);
const page2 = { ...page, id: 'p2', name: 'Page 2' };
await savePageSwitch(classId, [page, page2], 'p2', page2.docContent, [], teacher, 'Teacher', 'slides');
await saveWorkspaceItem(classId, { id: 'box', type: 'text', ownerUserId: joao.uid, boxRole: 'student', x: 1, y: 1, w: 20, h: 20, content: 'Owned', updatedAt: Date.now(), updatedBy: teacher, updatedByName: 'Teacher' }, teacher, 'Teacher', 'p2', 'slides');
const stored = (await getDoc(ref)).data()!;
assert.equal(stored.currentPageId, 'p2'); assert.equal(stored.surfaceMode, 'slides'); assert.equal(stored.items[0].ownerUserId, joao.uid);
assert.equal((await getDoc(doc(ana.db, 'liveClasses', classId, 'shared', 'workspace'))).data()!.currentPageId, 'p2');

// A second class with two assigned students has an isolated control generation.
const secondClassId = `${classId}-second`;
await adb.doc(`liveClasses/${secondClassId}`).set({ createdBy: teacher, teacherUid: teacher, assignedStudentIds: clients.slice(0, 2).map(c => c.uid) });
const secondEpoch = await acquireBoard(secondClassId, teacher, 'teacher-second-client', 'Teacher', true);
await setBoardStudentAcquisition(secondClassId, teacher, 'teacher-second-client', 'Teacher', true);
assert.ok(secondEpoch > 0);
assert.equal((await control()).controllerId, teacher, 'switching rooms does not mutate the first class authority');
assert.equal((await getDoc(boardControlRef(secondClassId))).data()!.acquisitionOpen, true);

let online = true; let receivedOffline!: () => void; let receivedOnline!: () => void; let observedOnline = false;
const onlineSnapshot = new Promise<void>(resolve => { receivedOnline = resolve; }); const offlineSnapshot = new Promise<void>(resolve => { receivedOffline = resolve; });
const stopConnectivity = subscribeBoardControl(classId, (_value, connected) => { online = connected; if (connected) { observedOnline = true; receivedOnline(); } else if (observedOnline) receivedOffline(); }, error => { throw error; });
await onlineSnapshot;
const unregisterGuarded = registerBoardWriter(classId, teacher, () => { if (!online) throw new Error('Board connection unavailable'); return { controlEpoch: epoch, controlClientId: 'teacher-client' }; });
await disableNetwork(db); await offlineSnapshot;
await assert.rejects(saveDocContent(classId, 'offline content', teacher, 'Teacher', 'p2', [page, page2], 'slides'));
await enableNetwork(db); assert.notEqual((await getDoc(ref)).data()!.docContent, 'offline content');
stopConnectivity(); unregisterGuarded(); unregister();
console.log('Open Board T/S: first-touch race, teacher revoke, reconnect, stale epochs, view, followers and offline guard passed.');
await terminate(db); await Promise.all(clients.map(async c => { await terminate(c.db); await deleteApp(c.app); })); await deleteAdmin(admin);
