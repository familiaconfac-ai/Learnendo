import assert from 'node:assert/strict';
import {
  getAllowedViewModes,
  getEffectiveViewRole,
  getRoleModeMenuVisibility,
} from './roleMode.ts';

assert.deepEqual(getAllowedViewModes('student'), ['student']);
assert.deepEqual(getAllowedViewModes('teacher'), ['student', 'teacher']);
assert.deepEqual(getAllowedViewModes('admin'), ['student', 'teacher', 'admin']);

assert.equal(getEffectiveViewRole('student', 'admin'), 'student');
assert.equal(getEffectiveViewRole('teacher', 'admin'), 'teacher');
assert.equal(getEffectiveViewRole('admin', 'teacher'), 'teacher');

assert.deepEqual(getRoleModeMenuVisibility('student'), {
  teacherDashboard: false, problemReports: false, generalProblemReport: true,
});
assert.deepEqual(getRoleModeMenuVisibility('teacher'), {
  teacherDashboard: true, problemReports: false, generalProblemReport: true,
});
assert.deepEqual(getRoleModeMenuVisibility('admin'), {
  teacherDashboard: false, problemReports: true, generalProblemReport: false,
});

console.log('user role mode tests passed');
