import assert from 'node:assert/strict';
import {
  canDeleteOwnedBattleTemplate,
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
