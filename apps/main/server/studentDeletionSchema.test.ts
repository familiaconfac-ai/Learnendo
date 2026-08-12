import assert from 'node:assert/strict';
import {
  canDeleteOwnedBattleTemplate,
  getStudentDeletionBlockReason,
  removeStudentFromRoster,
  removeUidFromRecord,
  USER_OWNED_SUBCOLLECTIONS,
} from './studentDeletionSchema.ts';

const ownedCollections = new Set<string>(USER_OWNED_SUBCOLLECTIONS);
assert.equal(ownedCollections.has('profile'), true);
assert.equal(ownedCollections.has('courseProgress'), true);
assert.equal(ownedCollections.has('vocabulary'), true);
assert.equal(ownedCollections.has('lessons'), false, 'shared lessons must never be treated as student-owned');
assert.equal(ownedCollections.has('exercises'), false, 'shared exercises must never be treated as student-owned');
assert.equal(ownedCollections.has('books'), false, 'shared books must never be treated as student-owned');
assert.equal(canDeleteOwnedBattleTemplate({ visibility: 'private' }), true);
assert.equal(canDeleteOwnedBattleTemplate({ visibility: 'teachers' }), false, 'teacher-visible templates must be preserved as shared content');
assert.equal(getStudentDeletionBlockReason('admin-1', '', 'student'), 'Student UID is required.');
assert.equal(getStudentDeletionBlockReason('admin-1', 'admin-1', 'admin'), 'You cannot delete your own administrator account.');
assert.equal(getStudentDeletionBlockReason('admin-1', 'teacher-1', 'teacher'), 'This account is a teacher, not a student, and was not deleted.');
assert.equal(getStudentDeletionBlockReason('admin-1', 'admin-2', 'admin'), 'This account is an admin, not a student, and was not deleted.');
assert.equal(getStudentDeletionBlockReason('admin-1', 'orphan-without-email', undefined), null, 'UID-only orphan deletion must be allowed');

const enrolled = removeStudentFromRoster({
  assignedStudentIds: ['student-a', 'student-b'],
  assignedStudentNames: ['Student A', 'Student B'],
}, 'student-a');
assert.deepEqual(enrolled, {
  changed: true,
  assignedStudentIds: ['student-b'],
  assignedStudentNames: ['Student B'],
});

const notEnrolled = removeStudentFromRoster({
  assignedStudentIds: ['student-b'],
  assignedStudentNames: ['Student B'],
}, 'student-a');
assert.equal(notEnrolled.changed, false, 'a student without a class must not alter a shared roster');

const emptyOrIncompleteRoster = removeStudentFromRoster({}, 'orphan-without-email');
assert.deepEqual(emptyOrIncompleteRoster, { changed: false, assignedStudentIds: [], assignedStudentNames: [] });

const responseMap = removeUidFromRecord({ 'student-a': 'answer', 'student-b': 'keep me' }, 'student-a');
assert.equal(responseMap.changed, true);
assert.deepEqual(responseMap.value, { 'student-b': 'keep me' });

const unrelatedMap = removeUidFromRecord({ 'student-b': 10 }, 'student-a');
assert.equal(unrelatedMap.changed, false);
assert.deepEqual(unrelatedMap.value, { 'student-b': 10 });

console.log('student deletion schema tests passed');
