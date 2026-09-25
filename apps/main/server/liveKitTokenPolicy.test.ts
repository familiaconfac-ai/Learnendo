import assert from 'node:assert/strict';
import {
  buildAuthorizedLiveKitIdentity,
  requireLiveKitBearerToken,
  resolveLiveKitRole,
  sanitizeLiveKitTabId,
} from './liveKitTokenPolicy.ts';

const liveClass = {
  createdBy: 'teacher-1',
  teacherUid: 'teacher-1',
  assignedStudentIds: ['student-1', 'student@example.test'],
};

assert.equal(resolveLiveKitRole('teacher-1', undefined, 'teacher', liveClass), 'teacher');
assert.equal(resolveLiveKitRole('admin-1', 'admin@example.test', 'admin', liveClass), 'teacher');
assert.equal(resolveLiveKitRole('student-1', undefined, 'student', liveClass), 'student');
assert.equal(resolveLiveKitRole('other-id', 'STUDENT@example.test', 'student', liveClass), 'student');
assert.equal(resolveLiveKitRole('intruder', 'intruder@example.test', 'student', liveClass), null);
assert.equal(resolveLiveKitRole('teacher-1', undefined, 'teacher', { ...liveClass, deletedAt: 'now' }), null);
assert.equal(sanitizeLiveKitTabId('../../arbitrary room'), 'arbitraryroom');
assert.equal(buildAuthorizedLiveKitIdentity('student', 'student-1'), 'student:student-1');
assert.equal(requireLiveKitBearerToken('Bearer firebase-id-token'), 'firebase-id-token');
assert.throws(
  () => requireLiveKitBearerToken(undefined),
  (error: unknown) => error instanceof Error
    && error.message === 'Authentication required.'
    && (error as Error & { statusCode?: number }).statusCode === 401,
);

console.log('liveKitTokenPolicy tests passed');
