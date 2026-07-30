import assert from 'node:assert/strict';

const projectId = process.env.GCLOUD_PROJECT || 'learnendo-6f4d3';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const documentsUrl = `http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents`;
const firebaseValue = (value) => value === null ? { nullValue: null }
  : Array.isArray(value) ? { arrayValue: { values: value.map(firebaseValue) } }
    : typeof value === 'number' ? { integerValue: String(value) }
      : value instanceof Date ? { timestampValue: value.toISOString() }
        : typeof value === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firebaseValue(item)])) } }
          : { stringValue: String(value) };
const documentBody = (data) => ({ fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, firebaseValue(value)])) });
const request = async (url, { token, method = 'GET', data } = {}) => {
  const response = await fetch(url, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) }, body: data ? JSON.stringify(documentBody(data)) : undefined });
  return { status: response.status, body: await response.text() };
};
const signUp = async () => {
  const response = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
  const body = await response.text();
  assert.equal(response.status, 200, body);
  return JSON.parse(body);
};

const admin = await signUp();
const student = await signUp();
const teacher = await signUp();
for (const [account, role] of [[admin, 'admin'], [student, 'student'], [teacher, 'teacher']]) {
  const seeded = await request(`${documentsUrl}/users/${account.localId}`, { method: 'PATCH', token: 'owner', data: { role } });
  assert.equal(seeded.status, 200, seeded.body);
}

const now = new Date();
const scopeId = 'english__en__w1__lesson1__day1';
const identity = { schemaVersion: 1, scopeId, courseId: 'english', language: 'en', workbookId: 1, lessonId: 'lesson1', dayId: 'day1' };
const exercise = { id: 'test-exercise-1', type: 'multiple-choice', instruction: 'Choose', audioValue: 'Choose', correctValue: 'A', options: ['A', 'B'] };
const canonical = { ...identity, currentVersion: 0, draftRevision: 1, updatedAt: now, updatedBy: admin.localId };
const draft = { ...identity, status: 'draft', baseVersion: 0, draftRevision: 1, exercises: [exercise], operation: 'append', changeReason: '', relatedReportId: null, updatedAt: now, updatedBy: admin.localId };
const canonicalUrl = `${documentsUrl}/dayExerciseSequences/${scopeId}`;
const draftUrl = `${documentsUrl}/dayExerciseSequenceDrafts/${scopeId}`;
const publicUrl = `${documentsUrl}/publishedDayExerciseSequences/${scopeId}`;

assert.equal((await request(canonicalUrl, { method: 'PATCH', token: admin.idToken, data: canonical })).status, 200, 'admin creates canonical');
assert.equal((await request(draftUrl, { method: 'PATCH', token: admin.idToken, data: draft })).status, 200, 'admin creates draft');
assert.notEqual((await request(draftUrl, { token: student.idToken })).status, 200, 'student cannot read draft');
assert.notEqual((await request(canonicalUrl, { token: student.idToken })).status, 200, 'student cannot read canonical');
assert.notEqual((await request(`${documentsUrl}/dayExerciseSequenceDrafts/student-test`, { method: 'PATCH', token: student.idToken, data: { ...draft, scopeId: 'student-test' } })).status, 200, 'student cannot create draft');
assert.notEqual((await request(`${documentsUrl}/dayExerciseSequenceDrafts/teacher-test`, { method: 'PATCH', token: teacher.idToken, data: { ...draft, scopeId: 'teacher-test' } })).status, 200, 'teacher cannot create draft');
assert.notEqual((await request(`${documentsUrl}/dayExerciseSequenceDrafts/${scopeId}-oversize`, { method: 'PATCH', token: admin.idToken, data: { ...draft, scopeId: `${scopeId}-oversize`, exercises: Array.from({ length: 101 }, (_, index) => ({ ...exercise, id: `oversize-${index}` })) } })).status, 200, 'draft rejects more than 100 exercises');
assert.notEqual((await request(`${documentsUrl}/dayExerciseSequenceDrafts/${scopeId}-empty`, { method: 'PATCH', token: admin.idToken, data: { ...draft, scopeId: `${scopeId}-empty`, exercises: [] } })).status, 200, 'draft rejects empty sequence');

const version = { ...draft, changeReason: 'Controlled test publication', version: 1, publishedAt: now, publishedBy: admin.localId };
const versionUrl = `${canonicalUrl}/versions/000001`;
assert.equal((await request(versionUrl, { method: 'PATCH', token: admin.idToken, data: version })).status, 200, 'admin creates immutable history');
assert.notEqual((await request(`${versionUrl}?updateMask.fieldPaths=changeReason`, { method: 'PATCH', token: admin.idToken, data: { changeReason: 'tampered' } })).status, 200, 'history cannot be changed');
assert.notEqual((await request(versionUrl, { token: student.idToken })).status, 200, 'student cannot read private history');

const published = { ...identity, version: 1, exercises: [exercise], publishedAt: now };
assert.equal((await request(publicUrl, { method: 'PATCH', token: admin.idToken, data: published })).status, 200, 'admin publishes compatible projection');
assert.equal((await request(publicUrl, { token: student.idToken })).status, 200, 'student reads published sequence');
assert.notEqual((await request(publicUrl, { method: 'PATCH', token: student.idToken, data: published })).status, 200, 'student cannot publish');
assert.notEqual((await request(`${documentsUrl}/publishedDayExerciseSequences/${scopeId}-private`, { method: 'PATCH', token: admin.idToken, data: { ...published, scopeId: `${scopeId}-private`, adminNote: 'must not leak' } })).status, 200, 'public projection rejects private metadata');
assert.notEqual((await request(`${documentsUrl}/publishedDayExerciseSequences/${scopeId}-oversize`, { method: 'PATCH', token: admin.idToken, data: { ...published, scopeId: `${scopeId}-oversize`, exercises: Array.from({ length: 101 }, (_, index) => ({ ...exercise, id: `oversize-${index}` })) } })).status, 200, 'public projection rejects more than 100 exercises');

console.log('Firestore day sequence permission integration tests passed.');
