import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildLoginProfilePatch, resolveLoginProfileFields } from './profileLoginPolicy.ts';

assert.deepEqual(
  resolveLoginProfileFields(
    { name: 'Official Name', displayName: 'Official Name', email: 'official@example.com' },
    'Old Auth Name',
    'old-auth@example.com',
  ),
  { name: 'Official Name', email: 'official@example.com' },
  'an existing Firestore profile must win over stale Firebase Auth data',
);

assert.deepEqual(
  resolveLoginProfileFields({ name: 'Admin Name', email: null }, 'Auth Name', 'auth@example.com'),
  { name: 'Admin Name', email: null },
  'an administratively cleared email must not be restored from Firebase Auth',
);

assert.deepEqual(
  resolveLoginProfileFields({}, 'First Login', 'first@example.com'),
  { name: 'First Login', email: 'first@example.com' },
  'Firebase Auth should initialize a profile when Firestore has no official data',
);

assert.deepEqual(
  resolveLoginProfileFields({ name: 'Player_ABC123' }, 'Converted User', 'converted@example.com'),
  { name: 'Player_ABC123', email: 'converted@example.com' },
  'even an existing guest alias must not be silently replaced during login',
);

const authProfile = { displayName: 'Nome Antigo', email: 'old-auth@example.com' };
let usersDocument: Record<string, unknown> = {
  name: 'Nome Novo',
  displayName: 'Nome Novo',
  email: 'official@example.com',
  role: 'student',
  status: 'active',
  group: 'Turma A',
  baseLanguage: 'es',
  learningLanguages: ['en', 'he'],
  assignedTeacherUid: 'teacher-1',
};
let progressDocument: Record<string, unknown> = {
  displayName: 'Nome Novo',
  email: 'official@example.com',
};

for (const event of ['bootstrap', 'refresh', 'logout/login', 'second refresh']) {
  const resolved = resolveLoginProfileFields(
    usersDocument,
    authProfile.displayName,
    authProfile.email,
  );
  const patch = buildLoginProfilePatch(usersDocument, { uid: 'A', ...authProfile, isAnonymous: false }, 123);
  assert.deepEqual(Object.keys(patch).sort(), ['isAnonymous', 'lastLoginAt', 'wasAnonymous']);
  usersDocument = { ...usersDocument, ...patch };
  progressDocument = { ...progressDocument, displayName: resolved.name, email: resolved.email };
  const pedagogicalProgressWrite = { totalAttempts: 12, totalErrors: 2 };
  progressDocument = { ...progressDocument, ...pedagogicalProgressWrite };

  assert.equal(usersDocument.displayName, 'Nome Novo', `${event}: users name must remain official`);
  assert.equal(progressDocument.displayName, 'Nome Novo', `${event}: progress name must remain official`);
  assert.equal(usersDocument.role, 'student', `${event}: role must remain untouched`);
  assert.equal(usersDocument.status, 'active', `${event}: status must remain untouched`);
  assert.equal(usersDocument.group, 'Turma A', `${event}: group must remain untouched`);
  assert.equal(usersDocument.baseLanguage, 'es');
  assert.deepEqual(usersDocument.learningLanguages, ['en', 'he']);
  assert.equal(usersDocument.assignedTeacherUid, 'teacher-1');
}

const separateNames = { name: 'Official Name', displayName: 'Separate Display', email: null, baseLanguage: 'pt' };
const afterLogin = { ...separateNames, ...buildLoginProfilePatch(separateNames, { uid: 'A', displayName: 'Old auth', email: 'old@example.test', isAnonymous: false }, 124) };
assert.equal(afterLogin.displayName, 'Separate Display');
assert.equal(afterLogin.email, null);
assert.equal(afterLogin.baseLanguage, 'pt');

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const flatProgressPayload = appSource.match(/const flatProgressPayload = \{([\s\S]*?)\n\s+\};/)?.[1] ?? '';
assert.ok(flatProgressPayload, 'lesson completion progress payload must exist');
assert.doesNotMatch(flatProgressPayload, /\bdisplayName\s*:/,
  'lesson completion must not copy stale Firebase Auth displayName into progress');
assert.doesNotMatch(flatProgressPayload, /\bemail\s*:/,
  'lesson completion must not overwrite the administrative email');

console.log('profile login policy tests passed');
