import assert from 'node:assert/strict';
import { matchesPersistedStudentProfile } from './studentProfileVerification.ts';

const expected = { name: 'Ryan Miranda', email: 'ryan@example.com' };
const auth = { displayName: expected.name, email: expected.email };
const user = { name: expected.name, displayName: expected.name, email: expected.email };
const progress = { displayName: expected.name, email: expected.email };

assert.equal(matchesPersistedStudentProfile(expected, auth, user, progress), true);
assert.equal(matchesPersistedStudentProfile(expected, { ...auth, displayName: 'ryanmirandar18rs' }, user, progress), false);
assert.equal(matchesPersistedStudentProfile(expected, auth, { ...user, name: 'ryanmirandar18rs' }, progress), false);
assert.equal(matchesPersistedStudentProfile(expected, auth, user, { ...progress, displayName: 'ryanmirandar18rs' }), false);

console.log('student profile verification tests passed');
