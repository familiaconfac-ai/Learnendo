import assert from 'node:assert/strict';
import test from 'node:test';
import { exactExerciseReportProblemKey, isActiveExerciseReport, isExactExerciseReportDuplicate, isVisibleExerciseReport } from './exerciseReportStatus.ts';

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

test('closed reports remain queryable through explicit filters', () => {
  assert.equal(isVisibleExerciseReport({ status: 'new' }), true);
  assert.equal(isVisibleExerciseReport({ status: 'reviewing' }), true);
  assert.equal(isVisibleExerciseReport({ status: 'dismissed' }), true);
  assert.equal(isVisibleExerciseReport({ status: 'resolved' }), true);
  assert.equal(isVisibleExerciseReport({ status: 'invalid' }), false);
});

test('only an exact active duplicate of the same problem is selected', () => {
  const origin = {
    reportId: 'origin', status: 'new', exerciseId: 'exercise-1', userId: 'student-1',
    problemCategory: 'Áudio incorreto', studentComment: '  Same   problem ', instruction: 'Listen.',
    displayedText: 'Choose.', audioText: 'Wrong audio', options: ['A', 'B'], expectedAnswer: 'A', acceptedAnswers: [],
  };
  assert.equal(isExactExerciseReportDuplicate(origin, { ...origin, reportId: 'duplicate', status: 'reviewing', studentComment: 'same problem' }), true);
  assert.equal(isExactExerciseReportDuplicate(origin, { ...origin, reportId: 'different-problem', status: 'new', problemCategory: 'Erro de texto ou ortografia' }), false);
  assert.equal(isExactExerciseReportDuplicate(origin, { ...origin, reportId: 'closed', status: 'resolved' }), false);
  assert.equal(isExactExerciseReportDuplicate(origin, { ...origin, reportId: 'other-user', status: 'new', userId: 'student-2' }), false);
  assert.equal(exactExerciseReportProblemKey(origin), exactExerciseReportProblemKey({ ...origin, studentComment: 'same problem' }));
});
