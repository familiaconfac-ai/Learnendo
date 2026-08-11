import assert from 'node:assert/strict';
import { deriveDashboardAnswerMetrics, getLastPedagogicalActivity, getLatestResponseActivityByStudent, getUniqueCompletedActivityCount } from './dashboardMetrics.ts';

assert.equal(getUniqueCompletedActivityCount({
  daysCompleted: 99,
  lessons: {
    first: { completed: true },
    second: { completed: true },
    pending: { completed: false },
  },
}), 2, 'repeating an activity must not inflate the unique completion count');
assert.equal(getUniqueCompletedActivityCount({ daysCompleted: 4 }), 4, 'legacy records must keep their real aggregate fallback');

assert.deepEqual(deriveDashboardAnswerMetrics({ totalAttempts: 10, totalCorrect: 7 }), {
  totalAttempts: 10,
  totalErrors: 3,
  avgAccuracy: 70,
});
assert.deepEqual(deriveDashboardAnswerMetrics({ totalAttempts: 10, totalErrors: 2, avgAccuracy: 81 }), {
  totalAttempts: 10,
  totalErrors: 2,
  avgAccuracy: 81,
});

assert.equal(getLastPedagogicalActivity({
  lastActivity: '2026-08-11T12:00:00Z',
  lastUpdated: '2026-08-11T12:00:00Z',
}), null, 'login/admin timestamps must not count as learning activity');

assert.equal(getLastPedagogicalActivity({
  lastActivity: '2026-08-11T12:00:00Z',
  lastActive: '2026-08-08T10:00:00Z',
  lessons: {
    old: { completed: true, completedAt: '2026-08-07T10:00:00Z' },
    ignored: { completed: false, completedAt: '2026-08-10T10:00:00Z' },
  },
  courses: { english: { lastActivityAt: '2026-08-09T10:00:00Z' } },
}), '2026-08-09T10:00:00Z', 'latest pedagogical marker must win');

const responseActivity = getLatestResponseActivityByStudent([
  { userId: 'ryan', answer: 'first answer', createdAt: '2026-08-04T20:00:00Z' },
  { userId: 'ryan', answer: 'recent answer', createdAt: '2026-08-05T22:42:00Z' },
  { userId: 'aquilles', answer: 'answer', createdAt: '2026-08-06T21:10:00Z' },
  { userId: 'ignored-empty', answer: ' ', createdAt: '2026-08-10T20:00:00Z' },
  { userId: 'ignored-no-time', answer: 'answer' },
]);
assert.equal(responseActivity.get('ryan'), '2026-08-05T22:42:00Z');
assert.equal(responseActivity.get('aquilles'), '2026-08-06T21:10:00Z');
assert.equal(responseActivity.has('ignored-empty'), false);
assert.equal(getLastPedagogicalActivity(
  { lastActive: '2026-07-14T10:00:00Z' },
  [responseActivity.get('ryan')],
), '2026-08-05T22:42:00Z', 'a durable answer event must supersede an older completion');

console.log('dashboard metrics tests passed');
