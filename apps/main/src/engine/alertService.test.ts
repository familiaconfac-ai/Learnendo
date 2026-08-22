import assert from 'node:assert/strict';
import { detectAlerts } from './alertService.ts';
import type { UserProgressSummary } from './courseProgressEngine.ts';

const now = new Date('2026-08-14T12:00:00-03:00');
const student = (lastActivity: unknown) => ({
  lastActivity,
  daysCompleted: 1,
  totalAttempts: 1,
  totalErrors: 0,
  avgAccuracy: 100,
} as UserProgressSummary);

assert.equal(detectAlerts(student('2026-08-14T00:01:00-03:00'), now).some((alert) => alert.type === 'inactive'), false,
  'studying today must remove the inactivity alert');
assert.equal(detectAlerts(student('2026-08-13T23:59:00-03:00'), now).some((alert) => alert.type === 'inactive'), false,
  'one calendar day without study remains below the pedagogical alert threshold');
assert.deepEqual(detectAlerts(student('2026-08-12T23:59:00-03:00'), now).find((alert) => alert.type === 'inactive'), {
  type: 'inactive',
  message: '2 days without activity',
});

const historicalErrors = {
  ...student('2026-08-14T09:00:00-03:00'),
  totalAttempts: 50,
  totalErrors: 43,
  lastLessonId: 'workbook1_lesson4',
};
assert.equal(detectAlerts(historicalErrors, now).some((alert) => alert.type === 'high_errors'), false,
  'cumulative historical errors must not create an active alert');
assert.equal(detectAlerts(historicalErrors, now).some((alert) => alert.message.includes('total errors recorded')), false);

const lowAccuracy = {
  ...historicalErrors,
  daysCompleted: 2,
  avgAccuracy: 50,
};
assert.deepEqual(detectAlerts(lowAccuracy, now), [{
  type: 'low_accuracy',
  message: 'Accuracy below 60% (50%)',
}], 'real low-accuracy alerts must remain active independently of historical error totals');

console.log('pedagogical inactivity alert tests passed');
