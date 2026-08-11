import assert from 'node:assert/strict';
import { deriveDashboardAnswerMetrics, getUniqueCompletedActivityCount } from './dashboardMetrics.ts';

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

console.log('dashboard metrics tests passed');
