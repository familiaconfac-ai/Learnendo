import assert from 'node:assert/strict';
import { buildStudentUpdateChanges } from './studentUpdateChanges.ts';

const baseline = { name: 'Old Name', email: 'student@example.com', groupId: 'kids', disabled: false };

assert.deepEqual(
  buildStudentUpdateChanges('student-1', baseline, { name: 'Ryan Miranda', email: 'student@example.com', groupId: 'kids', disabled: false }),
  { uid: 'student-1', name: 'Ryan Miranda' },
  'a name-only save must not send email, class, or active status',
);
assert.deepEqual(
  buildStudentUpdateChanges('student-1', baseline, { name: 'Old Name', email: 'NEW@example.com ', groupId: '', disabled: true }),
  { uid: 'student-1', email: 'new@example.com', groupId: null, disabled: true },
);
assert.deepEqual(
  buildStudentUpdateChanges('student-1', { ...baseline, disabled: null }, { name: 'Old Name', email: 'student@example.com', groupId: 'kids', disabled: true }),
  { uid: 'student-1' },
  'active status must not be sent before Authentication details are known',
);

console.log('student update changes tests passed');
