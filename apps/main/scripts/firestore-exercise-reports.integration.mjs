import assert from 'node:assert/strict';

const projectId = process.env.GCLOUD_PROJECT || 'learnendo-6f4d3';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const documentsUrl = `http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents`;

const firebaseValue = (value) => {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firebaseValue) } };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value)
    ? { integerValue: String(value) }
    : { doubleValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firebaseValue(item)])) } };
  return { stringValue: String(value) };
};

const firestoreDocument = (data) => ({
  fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, firebaseValue(value)])),
});

const request = async (url, { token, method = 'GET', data } = {}) => {
  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(data ? { 'Content-Type': 'application/json' } : {}),
    },
    body: data ? JSON.stringify(firestoreDocument(data)) : undefined,
  });
  const body = await response.text();
  return { status: response.status, body };
};

const signUp = async () => {
  const response = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  if (response.status !== 200) {
    throw new Error(`Auth emulator signup failed: ${await response.text()}`);
  }
  return response.json();
};

const student = await signUp();
const admin = await signUp();
const otherStudent = await signUp();

for (const [account, role] of [[student, 'student'], [admin, 'admin'], [otherStudent, 'student']]) {
  const seeded = await request(`${documentsUrl}/users/${account.localId}`, {
    method: 'PATCH', token: 'owner', data: { role },
  });
  assert.equal(seeded.status, 200, `Could not seed ${role} profile: ${seeded.body}`);
}

const reportId = 'er_rules_integration_1';
const now = new Date();
const validReport = {
  reportId,
  createdAt: now,
  updatedAt: now,
  status: 'new',
  priority: 'normal',
  source: 'exercise-practice',
  userId: student.localId,
  userName: 'Student Test',
  userEmail: null,
  language: 'en',
  workbookId: 1,
  workbookTitle: 'Workbook 1',
  lessonId: 'lesson1',
  lessonTitle: 'Lesson 1',
  dayId: 'day1',
  dayNumber: 1,
  exerciseId: 'exercise-1',
  exerciseType: 'writing',
  exerciseMode: null,
  sessionPhase: 'initial',
  currentExerciseIndex: 0,
  instruction: 'Write the answer',
  displayedText: 'Hello',
  audioText: 'Hello',
  audioSource: 'text-to-speech',
  options: [],
  expectedAnswer: 'hello',
  acceptedAnswers: ['hello'],
  studentAnswer: 'helo',
  attemptCount: 1,
  problemCategory: 'Resposta correta não aceita',
  studentComment: 'Test report',
  route: '/practice',
  appVersion: 'test',
  browser: 'test',
  operatingSystem: 'test',
  deviceType: 'desktop',
  screenSize: '1280x720',
  adminNote: '',
  reviewedBy: null,
  reviewedAt: null,
  resolvedAt: null,
  dismissedAt: null,
  emailNotificationStatus: 'not_requested',
};

const createUrl = `${documentsUrl}/exerciseReports/${reportId}`;
const create = await request(createUrl, { method: 'PATCH', token: student.idToken, data: validReport });
assert.equal(create.status, 200, `Student should create a valid report: ${create.body}`);

const duplicate = await request(createUrl, { method: 'PATCH', token: student.idToken, data: validReport });
assert.notEqual(duplicate.status, 200, 'A repeated deterministic document write must not create/update a duplicate');

const generalReportId = 'er_rules_general_report';
const generalReport = await request(`${documentsUrl}/exerciseReports/${generalReportId}`, {
  method: 'PATCH',
  token: student.idToken,
  data: {
    ...validReport,
    reportId: generalReportId,
    source: 'hamburger-menu',
    exerciseId: 'not-informed',
    exerciseType: 'general-report',
    sessionPhase: 'outside-exercise',
    currentExerciseIndex: -1,
  },
});
assert.equal(generalReport.status, 200, `Student should create a general menu report: ${generalReport.body}`);

for (const [label, patch] of [
  ['foreign userId', { userId: otherStudent.localId }],
  ['non-new status', { status: 'reviewing' }],
  ['non-normal priority', { priority: 'high' }],
  ['unknown source', { source: 'unknown-entry-point' }],
]) {
  const id = `invalid_${label.replace(/\W+/g, '_')}`;
  const result = await request(`${documentsUrl}/exerciseReports/${id}`, {
    method: 'PATCH', token: student.idToken, data: { ...validReport, ...patch, reportId: id },
  });
  assert.notEqual(result.status, 200, `Student create must reject ${label}`);
}

const unauthenticatedCreate = await request(`${documentsUrl}/exerciseReports/unauthenticated`, {
  method: 'PATCH', data: { ...validReport, reportId: 'unauthenticated' },
});
assert.notEqual(unauthenticatedCreate.status, 200, 'Unauthenticated create must fail');

const studentGet = await request(createUrl, { token: student.idToken });
assert.notEqual(studentGet.status, 200, 'Student get must fail');
const otherStudentGet = await request(createUrl, { token: otherStudent.idToken });
assert.notEqual(otherStudentGet.status, 200, 'Other student get must fail');
const studentList = await request(`${documentsUrl}/exerciseReports?pageSize=10`, { token: student.idToken });
assert.notEqual(studentList.status, 200, 'Student list must fail');
const unauthenticatedGet = await request(createUrl);
assert.notEqual(unauthenticatedGet.status, 200, 'Unauthenticated get must fail');

const studentStatusUpdate = await request(`${createUrl}?updateMask.fieldPaths=status`, {
  method: 'PATCH', token: student.idToken, data: { status: 'reviewing' },
});
assert.notEqual(studentStatusUpdate.status, 200, 'Student status update must fail');
const studentNoteUpdate = await request(`${createUrl}?updateMask.fieldPaths=adminNote`, {
  method: 'PATCH', token: student.idToken, data: { adminNote: 'forbidden' },
});
assert.notEqual(studentNoteUpdate.status, 200, 'Student adminNote update must fail');
const studentDelete = await request(createUrl, { method: 'DELETE', token: student.idToken });
assert.notEqual(studentDelete.status, 200, 'Student delete must fail');

const adminGet = await request(createUrl, { token: admin.idToken });
assert.equal(adminGet.status, 200, `Admin get should succeed: ${adminGet.body}`);
const adminList = await request(`${documentsUrl}/exerciseReports?pageSize=10`, { token: admin.idToken });
assert.equal(adminList.status, 200, `Admin list should succeed: ${adminList.body}`);

for (const [field, value] of [['status', 'reviewing'], ['priority', 'high'], ['adminNote', 'Investigating']]) {
  const update = await request(`${createUrl}?updateMask.fieldPaths=${field}`, {
    method: 'PATCH', token: admin.idToken, data: { [field]: value },
  });
  assert.equal(update.status, 200, `Admin should update ${field}: ${update.body}`);
}

const adminOriginalContentUpdate = await request(`${createUrl}?updateMask.fieldPaths=displayedText`, {
  method: 'PATCH', token: admin.idToken, data: { displayedText: 'tampered' },
});
assert.notEqual(adminOriginalContentUpdate.status, 200, 'Admin must not alter original student content');
const adminDelete = await request(createUrl, { method: 'DELETE', token: admin.idToken });
assert.notEqual(adminDelete.status, 200, 'Admin delete must fail');

for (const status of ['dismissed', 'reviewing', 'resolved']) {
  const transition = await request(`${createUrl}?updateMask.fieldPaths=status`, {
    method: 'PATCH', token: admin.idToken, data: { status },
  });
  assert.equal(transition.status, 200, `Admin should transition a report to ${status}: ${transition.body}`);
}

const editorialIdentity = {
  exerciseId: 'exercise-options-rules', workbookId: 1, lessonId: 'lesson1', dayId: 'day1',
  language: 'en', exerciseType: 'multiple-choice', version: 0, changeReason: '', adminNote: '',
  relatedReportId: reportId, baseVersion: 0, draftRevision: 1, updatedAt: now, updatedBy: admin.localId,
};
const draftUrl = `${documentsUrl}/exerciseDrafts/${editorialIdentity.exerciseId}`;
const fourOptions = ['One', 'Two', 'Three', 'Four'];
const draftFour = await request(draftUrl, {
  method: 'PATCH', token: admin.idToken,
  data: { ...editorialIdentity, status: 'draft', override: { options: fourOptions, correctValue: 'Four' } },
});
assert.equal(draftFour.status, 200, `Admin draft should accept four alternatives: ${draftFour.body}`);

const draftOne = await request(draftUrl, {
  method: 'PATCH', token: admin.idToken,
  data: { ...editorialIdentity, draftRevision: 2, status: 'draft', override: { options: ['Incomplete'] } },
});
assert.equal(draftOne.status, 200, `Incomplete drafts may retain one alternative: ${draftOne.body}`);

const draftEleven = await request(draftUrl, {
  method: 'PATCH', token: admin.idToken,
  data: { ...editorialIdentity, draftRevision: 3, status: 'draft', override: { options: Array.from({ length: 11 }, (_, index) => `Option ${index + 1}`) } },
});
assert.notEqual(draftEleven.status, 200, 'Draft must reject more than ten alternatives');

const publicUrl = `${documentsUrl}/publishedExerciseOverrides/${editorialIdentity.exerciseId}`;
const publicBase = {
  exerciseId: editorialIdentity.exerciseId, workbookId: 1, lessonId: 'lesson1', dayId: 'day1',
  language: 'en', exerciseType: 'multiple-choice', status: 'published', version: 1, publishedAt: now,
};
const publishFour = await request(publicUrl, {
  method: 'PATCH', token: admin.idToken,
  data: { ...publicBase, override: { options: fourOptions, correctValue: 'Four' } },
});
assert.equal(publishFour.status, 200, `Published override should accept four alternatives: ${publishFour.body}`);

const publishOne = await request(publicUrl, {
  method: 'PATCH', token: admin.idToken,
  data: { ...publicBase, version: 2, override: { options: ['Incomplete'], correctValue: 'Incomplete' } },
});
assert.notEqual(publishOne.status, 200, 'Published override must require at least two alternatives');

const speakingId = 'wb1_l6_d4_e10';
const speakingDraftUrl = `${documentsUrl}/exerciseDrafts/${speakingId}`;
const speakingOverride = { displayValue: 'A: How are you today?\nB: ______', acceptedAnswers: ['I am very well.'], audioValue: 'How are you today?' };
const speakingDraft = await request(speakingDraftUrl, { method: 'PATCH', token: admin.idToken, data: {
  exerciseId: speakingId, workbookId: 1, lessonId: 'wb1_l6', dayId: 'wb1_l6_d4', language: 'en', exerciseType: 'speaking',
  status: 'draft', version: 0, override: speakingOverride, changeReason: '', adminNote: '', relatedReportId: reportId,
  baseVersion: 0, draftRevision: 1, updatedAt: now, updatedBy: admin.localId,
} });
assert.equal(speakingDraft.status, 200, `Speaking draft stores displayed dialogue: ${speakingDraft.body}`);
const speakingDraftReload = await request(speakingDraftUrl, { token: admin.idToken });
assert.equal(speakingDraftReload.status, 200, speakingDraftReload.body);
for (const text of ['A: How are you today?', 'I am very well.', 'How are you today?']) assert.match(speakingDraftReload.body, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
const speakingPublicUrl = `${documentsUrl}/publishedExerciseOverrides/${speakingId}`;
const speakingPublish = await request(speakingPublicUrl, { method: 'PATCH', token: admin.idToken, data: {
  exerciseId: speakingId, workbookId: 1, lessonId: 'wb1_l6', dayId: 'wb1_l6_d4', language: 'en', exerciseType: 'speaking',
  status: 'published', version: 1, override: speakingOverride, publishedAt: now,
} });
assert.equal(speakingPublish.status, 200, `Speaking correction publishes without recreating ID: ${speakingPublish.body}`);
const speakingStudentReload = await request(speakingPublicUrl, { token: student.idToken });
assert.equal(speakingStudentReload.status, 200, speakingStudentReload.body);
assert.match(speakingStudentReload.body, /A: How are you today\?/);
const failedStudentDraft = await request(`${documentsUrl}/exerciseDrafts/student-forbidden`, { method: 'PATCH', token: student.idToken, data: { ...editorialIdentity, exerciseId: 'student-forbidden', status: 'draft', override: speakingOverride } });
assert.notEqual(failedStudentDraft.status, 200, 'failed Firestore write must not create a draft or report saved state');

console.log('Firestore exerciseReports and editorial option permission integration tests passed.');
