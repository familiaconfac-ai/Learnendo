import assert from 'node:assert/strict';
import test from 'node:test';
import { isActiveExerciseReport } from './exerciseReportStatus.ts';

test('only new and reviewing exercise reports are active', () => {
  assert.equal(isActiveExerciseReport({ status: 'new' }), true);
  assert.equal(isActiveExerciseReport({ status: 'reviewing' }), true);
  assert.equal(isActiveExerciseReport({ status: 'resolved' }), false);
  assert.equal(isActiveExerciseReport({ status: 'dismissed' }), false);
  assert.equal(isActiveExerciseReport({ status: 'discarded' }), false);
});

test('closing a report removes it from an active local list', () => {
  const reports = [
    { reportId: 'one', status: 'new' },
    { reportId: 'two', status: 'reviewing' },
  ];
  const closed = reports.map((report) => report.reportId === 'one' ? { ...report, status: 'resolved' } : report);
  assert.deepEqual(closed.filter(isActiveExerciseReport).map((report) => report.reportId), ['two']);
});
