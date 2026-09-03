import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardContentFingerprint, canAcquireBoard, ownsBoard, teacherLeaseActive, TEACHER_IDLE_MS, TEACHER_LEASE_MS, type BoardControl } from './boardControl.ts';

const control: BoardControl = { designatedStudentId: 'joao', controllerId: 'teacher', controllerClientId: 'desktop', epoch: 10, teacherLeaseAt: { toMillis: () => 1000 }, view: null, updatedAt: null };
test('designation never grants followers authority and teacher can always preempt', () => {
  for (const uid of ['maria', 'pedro', 'ana']) {
    assert.equal(canAcquireBoard(control, uid, false, 20000), false);
  }
  assert.equal(canAcquireBoard(control, 'teacher', true, 1001), true);
  assert.equal(canAcquireBoard(null, 'joao', false, 1001), false);
});
test('designated student waits for teacher release/expiry; expiry does not clear designation', () => {
  assert.equal(canAcquireBoard(control, 'joao', false, 5999), false);
  assert.equal(teacherLeaseActive(control, 6000), false);
  assert.equal(canAcquireBoard(control, 'joao', false, 6000), true);
  assert.equal(canAcquireBoard({ ...control, teacherLeaseAt: null }, 'joao', false, 1001), true);
  assert.equal(control.designatedStudentId, 'joao');
  assert.ok(TEACHER_IDLE_MS < TEACHER_LEASE_MS);
});
test('refresh/same UID in another client cannot reuse writer ownership', () => {
  assert.equal(ownsBoard(control, 'teacher', 'desktop'), true);
  assert.equal(ownsBoard(control, 'teacher', 'new-tab'), false);
  assert.equal(ownsBoard(control, 'joao', 'desktop'), false);
});
test('native ranges are only restored on matching document markup', () => {
  const source = '<p>Ub ----- bl</p>';
  assert.equal(boardContentFingerprint(source), boardContentFingerprint(source));
  assert.notEqual(boardContentFingerprint(source), boardContentFingerprint('<p>Ub João bl</p>'));
  assert.notEqual(boardContentFingerprint(source), boardContentFingerprint('<p>Ub <b>-----</b> bl</p>'));
});
