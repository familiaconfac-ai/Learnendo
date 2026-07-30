import assert from 'node:assert/strict';

const projectId = process.env.GCLOUD_PROJECT || 'learnendo-6f4d3';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const documentsUrl = `http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents`;

const firebaseValue = (value) => {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firebaseValue) } };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firebaseValue(item)])) } };
  return { stringValue: String(value) };
};
const firestoreDocument = (data) => ({ fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, firebaseValue(value)])) });
const request = async (url, { token, method = 'GET', data } = {}) => {
  const response = await fetch(url, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) }, body: data ? JSON.stringify(firestoreDocument(data)) : undefined });
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
const exerciseId = 'ex_rules-12345678';
const identity = { schemaVersion: 1, exerciseId, origin: 'admin', courseId: 'english', language: 'en', workbookId: 1, lessonId: 'lesson1', dayId: 'day1', type: 'multiple-choice' };
const content = { instruction: 'Choose', displayValue: 'One or two?', audioValue: 'Choose one', speechLanguage: 'en-US', options: ['One', 'Two'], correctValue: 'One', acceptedAnswers: [], translation: '', imageUrl: '', imageAlt: '', feedbackCorrect: 'Correct', feedbackIncorrect: 'Try again', explanation: '' };
const privateMeta = { changeReason: 'Publicação inicial', adminNote: 'private note', relatedReportId: null, duplicatedFromExerciseId: null };
const canonical = { ...identity, status: 'draft', currentVersion: 0, draftRevision: 1, createdAt: now, createdBy: admin.localId, updatedAt: now, updatedBy: admin.localId, ...privateMeta };
const draft = { ...identity, status: 'draft', baseVersion: 0, draftRevision: 1, content, imageValidation: null, updatedAt: now, updatedBy: admin.localId, ...privateMeta };

const canonicalUrl = `${documentsUrl}/adminExercises/${exerciseId}`;
const draftUrl = `${documentsUrl}/adminExerciseDrafts/${exerciseId}`;
assert.equal((await request(canonicalUrl, { method: 'PATCH', token: admin.idToken, data: canonical })).status, 200, 'admin creates canonical');
assert.equal((await request(draftUrl, { method: 'PATCH', token: admin.idToken, data: draft })).status, 200, 'admin creates draft');
assert.notEqual((await request(canonicalUrl, { token: student.idToken })).status, 200, 'student cannot read canonical');
assert.notEqual((await request(draftUrl, { token: student.idToken })).status, 200, 'student cannot read draft');
assert.notEqual((await request(`${documentsUrl}/adminExerciseDrafts/ex_forbidden-12345678`, { method: 'PATCH', token: student.idToken, data: { ...draft, exerciseId: 'ex_forbidden-12345678' } })).status, 200, 'student cannot create draft');
assert.notEqual((await request(`${documentsUrl}/adminExerciseDrafts/ex_teacher-12345678`, { method: 'PATCH', token: teacher.idToken, data: { ...draft, exerciseId: 'ex_teacher-12345678' } })).status, 200, 'teacher cannot create draft');

const version = { ...identity, status: 'published', version: 1, content, ...privateMeta, publishedAt: now, publishedBy: admin.localId };
const versionUrl = `${canonicalUrl}/versions/000001`;
assert.equal((await request(versionUrl, { method: 'PATCH', token: admin.idToken, data: version })).status, 200, 'admin appends immutable version');
assert.notEqual((await request(`${versionUrl}?updateMask.fieldPaths=changeReason`, { method: 'PATCH', token: admin.idToken, data: { changeReason: 'Tentativa de alterar' } })).status, 200, 'history update is forbidden');
assert.notEqual((await request(versionUrl, { method: 'DELETE', token: admin.idToken })).status, 200, 'history delete is forbidden');
assert.notEqual((await request(versionUrl, { token: student.idToken })).status, 200, 'student cannot read private history');

const publicValue = { ...identity, ...content, version: 1, publishedAt: now };
const publicUrl = `${documentsUrl}/publishedExercises/${exerciseId}`;
assert.equal((await request(publicUrl, { method: 'PATCH', token: admin.idToken, data: publicValue })).status, 200, 'admin creates clean public projection');
assert.equal((await request(publicUrl, { token: student.idToken })).status, 200, 'student reads public projection');
assert.notEqual((await request(publicUrl, { method: 'PATCH', token: student.idToken, data: publicValue })).status, 200, 'student cannot publish');
assert.notEqual((await request(`${documentsUrl}/publishedExercises/ex_private-12345678`, { method: 'PATCH', token: admin.idToken, data: { ...publicValue, exerciseId: 'ex_private-12345678', adminNote: 'must not leak' } })).status, 200, 'public projection rejects private metadata');
assert.notEqual((await request(`${documentsUrl}/publishedExercises/ex_options-12345678`, { method: 'PATCH', token: admin.idToken, data: { ...publicValue, exerciseId: 'ex_options-12345678', options: Array.from({ length: 11 }, (_, index) => `Option ${index}`) } })).status, 200, 'public projection rejects more than ten options');
assert.notEqual((await request(`${documentsUrl}/publishedExercises/ex_image-12345678`, { method: 'PATCH', token: admin.idToken, data: { ...publicValue, exerciseId: 'ex_image-12345678', imageUrl: 'http://insecure.test/image.png' } })).status, 200, 'public projection rejects non-HTTPS images');
assert.notEqual((await request(canonicalUrl, { method: 'DELETE', token: admin.idToken })).status, 200, 'canonical hard delete is forbidden');

console.log('Firestore admin exercise permission integration tests passed.');
