import assert from 'node:assert/strict';
import { deriveDashboardAnswerMetrics, deriveDashboardRewardMetrics, getDaysWithoutActivity, getLastPedagogicalActivity, getLatestResponseActivityByStudent, getUniqueCompletedActivityCount } from './dashboardMetrics.ts';

assert.equal(getUniqueCompletedActivityCount({
  daysCompleted: 99,
  lessons: {
    first: { completed: true },
    second: { completed: true },
    pending: { completed: false },
  },
}), 2, 'repeating an activity must not inflate the unique completion count');
assert.equal(getUniqueCompletedActivityCount({ daysCompleted: 4 }), 4, 'legacy records must keep their real aggregate fallback');

const rianLegacyProgress = {
  daysCompleted: 0,
  totalAttempts: 0,
  totalDiamonds: 0,
  totalStars: 0,
  'lessons.wb1_l3_d3': {
    completed: true, completedAt: '2026-07-14T17:18:46Z', score: 100,
    totalQuestions: 15, correctAnswers: 15, accuracy: 1,
  },
  'lessons.wb1_l3_d4': {
    completed: true, completedAt: '2026-08-14T15:34:33Z', score: 100,
    totalQuestions: 10, correctAnswers: 10, accuracy: 1,
  },
};
assert.equal(getUniqueCompletedActivityCount(rianLegacyProgress), 2,
  'literal lesson fields from the production schema must remain readable');
assert.deepEqual(deriveDashboardAnswerMetrics(rianLegacyProgress), {
  totalAttempts: 25, totalErrors: 0, avgAccuracy: 100,
});
assert.deepEqual(deriveDashboardRewardMetrics(rianLegacyProgress), {
  totalFire: 0, totalDiamonds: 2, totalStars: 2,
});
assert.equal(getLastPedagogicalActivity(rianLegacyProgress), '2026-08-14T15:34:33Z');
assert.equal(getDaysWithoutActivity('2026-08-11T23:59:00-03:00', new Date('2026-08-14T00:01:00-03:00')), 3,
  'activity age must use São Paulo calendar days consistently across table, alerts and report');
assert.equal(getUniqueCompletedActivityCount({
  daysCompleted: 7,
  'lessons.wb1_l1_d1': { completed: true },
}), 7, 'partial legacy event maps must not erase a larger persisted historical aggregate');
assert.deepEqual(deriveDashboardAnswerMetrics({
  totalAttempts: 520, totalErrors: 0, avgAccuracy: 100,
  'lessons.wb1_l1_d1': { completed: true, totalQuestions: 10, correctAnswers: 10, accuracy: 1 },
}), { totalAttempts: 520, totalErrors: 0, avgAccuracy: 100 },
'partial legacy event maps must not replace a populated historical aggregate');

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
