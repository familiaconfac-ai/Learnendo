import assert from 'node:assert/strict';

process.env.FIREBASE_PROJECT_ID = 'demo-learnendo-deletion';

const { adminAuth, adminDb } = await import('./firebaseAdmin.js');
const { default: adminStudentsHandler } = await import('../api/admin-students.js');

const adminUid = 'disposable-admin';
const authUid = 'disposable-auth-student';
const orphanUid = 'disposable-firestore-orphan';
const retainedUid = 'retained-student';
const teacherUid = 'protected-teacher';

await adminAuth.createUser({ uid: adminUid, email: 'disposable-admin@example.test' });
await adminDb.doc(`users/${adminUid}`).set({ uid: adminUid, role: 'admin' });
const customToken = await adminAuth.createCustomToken(adminUid);
const signInResponse = await fetch(
  `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  },
);
const signIn = await signInResponse.json() as { idToken?: string };
assert.ok(signIn.idToken, 'admin emulator sign-in must return an ID token');

async function callDeleteEndpoint(uid: string) {
  let responseBody: any = null;
  const response = {
    statusCode: 200,
    setHeader: () => undefined,
    end: (raw: string) => { responseBody = JSON.parse(raw); },
  };
  await adminStudentsHandler({
    method: 'POST',
    headers: { authorization: `Bearer ${signIn.idToken}` },
    body: { action: 'delete', uid },
  } as any, response as any);
  return { status: response.statusCode, body: responseBody };
}

const selfDeletion = await callDeleteEndpoint(adminUid);
assert.equal(selfDeletion.status, 409);
assert.match(selfDeletion.body.error, /cannot delete your own/i);

await adminAuth.createUser({ uid: teacherUid, email: 'protected-teacher@example.test' });
await adminDb.doc(`users/${teacherUid}`).set({ uid: teacherUid, role: 'teacher' });
const teacherDeletion = await callDeleteEndpoint(teacherUid);
assert.equal(teacherDeletion.status, 409);
assert.equal((await adminDb.doc(`users/${teacherUid}`).get()).exists, true);

await adminAuth.createUser({ uid: authUid, email: 'disposable-auth@example.test', displayName: 'Disposable Student' });
await Promise.all([
  adminDb.doc(`users/${authUid}`).set({ uid: authUid, role: 'student', name: 'Disposable Student', email: 'disposable-auth@example.test' }),
  adminDb.doc(`users/${authUid}/courseProgress/main`).set({ currentWorkbook: 1 }),
  adminDb.doc(`progress/${authUid}`).set({ uid: authUid, totalAttempts: 3 }),
  adminDb.doc(`users/${orphanUid}`).set({ uid: orphanUid, role: 'student', name: '' }),
  adminDb.doc(`progress/${orphanUid}`).set({ uid: orphanUid, totalAttempts: 1 }),
  adminDb.doc('liveClassGroups/disposable-group').set({
    name: 'Disposable class',
    assignedStudentIds: [authUid, orphanUid, retainedUid],
    assignedStudentNames: ['Disposable Student', '', 'Retained Student'],
  }),
  adminDb.doc('liveClasses/disposable-class').set({
    title: 'Shared class must survive',
    assignedStudentIds: [authUid, orphanUid, retainedUid],
    assignedStudentNames: ['Disposable Student', '', 'Retained Student'],
  }),
  adminDb.doc(`liveClasses/disposable-class/presence/${authUid}`).set({ uid: authUid }),
  adminDb.doc('liveClasses/disposable-class/responses/auth-response').set({ userId: authUid, answer: 'delete me' }),
  adminDb.doc('liveClasses/disposable-class/responses/retained-response').set({ userId: retainedUid, answer: 'keep me' }),
  adminDb.doc('liveClasses/disposable-class/messages/auth-message').set({ senderUid: authUid, text: 'delete me' }),
  adminDb.doc('liveClasses/disposable-class/exerciseBlocks/shared-block').set({
    prompt: 'Shared exercise must survive',
    responses: { [authUid]: 'delete me', [retainedUid]: 'keep me' },
    responseAttempts: { [authUid]: 2, [retainedUid]: 1 },
  }),
  adminDb.doc('liveClasses/disposable-class/session/battle').set({
    title: 'Shared battle must survive',
    participants: { [authUid]: { name: 'Disposable' }, [retainedUid]: { name: 'Retained' } },
    roundParticipantIds: [authUid, retainedUid],
  }),
]);

const authEndpointResult = await callDeleteEndpoint(authUid);
assert.equal(authEndpointResult.status, 200);
const authResult = authEndpointResult.body.deletion;
assert.equal(authResult.completed, true);
assert.equal(authResult.auth, 'deleted');
await assert.rejects(() => adminAuth.getUser(authUid), (reason: any) => reason?.code === 'auth/user-not-found');
assert.equal((await adminDb.doc(`users/${authUid}`).get()).exists, false);
assert.equal((await adminDb.doc(`progress/${authUid}`).get()).exists, false);
assert.equal((await adminDb.doc('liveClasses/disposable-class').get()).exists, true, 'shared class must survive');
assert.equal((await adminDb.doc('liveClasses/disposable-class/responses/auth-response').get()).exists, false);
assert.equal((await adminDb.doc('liveClasses/disposable-class/responses/retained-response').get()).exists, true);

const groupAfterAuth = (await adminDb.doc('liveClassGroups/disposable-group').get()).data();
assert.deepEqual(groupAfterAuth?.assignedStudentIds, [orphanUid, retainedUid]);
const blockAfterAuth = (await adminDb.doc('liveClasses/disposable-class/exerciseBlocks/shared-block').get()).data();
assert.deepEqual(blockAfterAuth?.responses, { [retainedUid]: 'keep me' });
assert.deepEqual(blockAfterAuth?.responseAttempts, { [retainedUid]: 1 });
const battleAfterAuth = (await adminDb.doc('liveClasses/disposable-class/session/battle').get()).data();
assert.deepEqual(battleAfterAuth?.roundParticipantIds, [retainedUid]);

const orphanEndpointResult = await callDeleteEndpoint(orphanUid);
assert.equal(orphanEndpointResult.status, 200);
const orphanResult = orphanEndpointResult.body.deletion;
assert.equal(orphanResult.completed, true);
assert.equal(orphanResult.auth, 'not-found');
assert.equal((await adminDb.doc(`users/${orphanUid}`).get()).exists, false);
assert.equal((await adminDb.doc(`progress/${orphanUid}`).get()).exists, false);
assert.equal((await adminDb.doc('liveClassGroups/disposable-group').get()).exists, true, 'shared group must survive');
assert.deepEqual((await adminDb.doc('liveClassGroups/disposable-group').get()).data()?.assignedStudentIds, [retainedUid]);
assert.deepEqual((await adminDb.doc('liveClasses/disposable-class').get()).data()?.assignedStudentIds, [retainedUid]);

console.log('student deletion integration tests passed');
