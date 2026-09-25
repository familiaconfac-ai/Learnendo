import assert from 'node:assert/strict';

const projectId = process.env.GCLOUD_PROJECT || 'demo-learnendo-live-media';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const documentsUrl = `http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents`;

const firebaseValue = (value) => {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firebaseValue) } };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  return { stringValue: String(value) };
};
const firestoreDocument = (data) => ({ fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, firebaseValue(value)])) });
const request = async (path, { token, data } = {}) => {
  const response = await fetch(`${documentsUrl}/${path}`, {
    method: data ? 'PATCH' : 'GET',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) },
    body: data ? JSON.stringify(firestoreDocument(data)) : undefined,
  });
  return { status: response.status, body: await response.text() };
};
const signUp = async () => {
  const response = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }),
  });
  assert.equal(response.status, 200);
  return response.json();
};

const teacher = await signUp();
const student = await signUp();
const outsider = await signUp();
for (const [account, role] of [[teacher, 'teacher'], [student, 'student'], [outsider, 'student']]) {
  assert.equal((await request(`users/${account.localId}`, { token: 'owner', data: { role } })).status, 200);
}
const classId = 'live-media-rules-class';
assert.equal((await request(`liveClasses/${classId}`, { token: 'owner', data: {
  title: 'Live media rules', createdBy: teacher.localId, teacherUid: teacher.localId,
  assignedStudentIds: [student.localId], status: 'live',
} })).status, 200);

const participant = {
  uid: student.localId, role: 'student', tabId: 'tab-1', connecting: false,
  microphoneActive: true, cameraActive: false, screenShareActive: false, updatedAt: new Date(),
};
assert.equal((await request(`liveClasses/${classId}/mediaParticipants/${student.localId}`, { token: student.idToken, data: participant })).status, 200);
assert.equal((await request(`liveClasses/${classId}/mediaParticipants/${student.localId}`, { token: outsider.idToken, data: { ...participant, uid: outsider.localId } })).status, 403);
assert.equal((await request(`liveClasses/${classId}/mediaParticipants/${outsider.localId}`, { token: outsider.idToken, data: { ...participant, uid: outsider.localId } })).status, 403);
assert.equal((await request(`liveClasses/${classId}/mediaParticipants/${student.localId}`, { token: student.idToken, data: { ...participant, role: 'teacher' } })).status, 403);
assert.equal((await request(`liveClasses/${classId}/mediaParticipants/${student.localId}`, { token: student.idToken, data: { ...participant, arbitrary: true } })).status, 403);

const telemetry = {
  event: 'connected', uid: student.localId, role: 'student', classId, tabId: 'tab-1',
  connectedAt: new Date().toISOString(), activationReason: 'student-media',
  mediaTransport: 'livekit-active', createdAt: new Date(),
};
assert.equal((await request(`liveClasses/${classId}/mediaTelemetry/event-1`, { token: student.idToken, data: telemetry })).status, 200);
assert.equal((await request(`liveClasses/${classId}/mediaTelemetry/event-2`, { token: outsider.idToken, data: { ...telemetry, uid: outsider.localId } })).status, 403);

console.log('firestore live media rules integration tests passed');
