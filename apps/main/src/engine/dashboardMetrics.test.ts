import assert from 'node:assert/strict';
import { deriveDashboardAnswerMetrics, getLastPedagogicalActivity, getUniqueCompletedActivityCount } from './dashboardMetrics.ts';

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

console.log('dashboard metrics tests passed');
