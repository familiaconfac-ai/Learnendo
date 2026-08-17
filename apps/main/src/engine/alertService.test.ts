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

console.log('pedagogical inactivity alert tests passed');
