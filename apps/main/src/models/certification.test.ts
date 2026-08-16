import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canStartFinalCertificationTest, evaluateFinalCertificationAttempt, formatCertificateDate,
  isEligibleForCertificate, issueCertificateRecord, type FinalCertificationQuestionResult,
} from './certification.ts';

const results = (correct: number, total = 10): FinalCertificationQuestionResult[] => Array.from({ length: total }, (_, index) => ({
  questionId: `q${index + 1}`,
  correct: index < correct,
  skill: index % 2 ? 'listening' : 'grammar',
  lessonId: index % 2 ? 'wb1_l3' : 'wb1_l5',
  content: index % 2 ? 'short and long vowel contrasts' : 'personal information',
  objective: index % 2 ? 'distinguish heard sounds' : 'answer with personal information',
}));

test('70 percent passes and fixes certificateDate to passedAt', () => {
  const attempt = evaluateFinalCertificationAttempt({ attemptId: 'a1', studentId: 's1', completedAt: '2026-08-16T12:00:00.000Z', questionResults: results(7) });
  assert.equal(attempt.status, 'passed');
  assert.equal(attempt.passedAt, attempt.completedAt);
  assert.equal(isEligibleForCertificate({ courseCompleted: true, passedAttempt: attempt }), true);
  const certificate = issueCertificateRecord({ certificateId: 'LND-2026-000123', studentId: 's1', studentDisplayName: 'Ana Silva', courseCompleted: true, attempt });
  assert.equal(certificate.certificateDate, '2026-08-16T12:00:00.000Z');
  assert.equal(formatCertificateDate(certificate.certificateDate), 'August 16, 2026');
});

test('69 percent fails with actionable lesson and skill remediation', () => {
  const attempt = evaluateFinalCertificationAttempt({ attemptId: 'a1', studentId: 's1', completedAt: '2026-08-16T12:00:00.000Z', questionResults: results(69, 100) });
  assert.equal(attempt.status, 'not-passed');
  assert.equal(attempt.remediation.length, 2);
  assert.ok(attempt.remediation.every((requirement) => requirement.lessonIds.length > 0 && requirement.objectives.length > 0));
  assert.equal(canStartFinalCertificationTest(true, [attempt]), false);
  assert.equal(canStartFinalCertificationTest(true, [{ ...attempt, remediation: attempt.remediation.map((item) => ({ ...item, status: 'completed' as const })) }]), true);
});

test('course completion alone never issues a certificate and a pass locks retakes', () => {
  const passed = evaluateFinalCertificationAttempt({ attemptId: 'a1', studentId: 's1', completedAt: '2026-08-16T12:00:00.000Z', questionResults: results(10) });
  assert.equal(isEligibleForCertificate({ courseCompleted: true, passedAttempt: null }), false);
  assert.equal(canStartFinalCertificationTest(true, [passed]), false);
  assert.throws(() => evaluateFinalCertificationAttempt({ attemptId: 'a2', studentId: 's1', completedAt: '2026-08-17T12:00:00.000Z', questionResults: results(10), previousAttempts: [passed] }), /locked/);
});

test('certificate rejects email, technical names and unverified IDs', () => {
  const attempt = evaluateFinalCertificationAttempt({ attemptId: 'a1', studentId: 's1', completedAt: '2026-08-16T12:00:00.000Z', questionResults: results(10) });
  for (const name of ['', 'student@example.com', 'Player_abc123', 'Professor']) {
    assert.throws(() => issueCertificateRecord({ certificateId: 'LND-2026-000123', studentId: 's1', studentDisplayName: name, courseCompleted: true, attempt }), /display name/);
  }
});
