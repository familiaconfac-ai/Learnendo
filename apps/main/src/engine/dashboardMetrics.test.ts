import assert from 'node:assert/strict';
import { deriveDashboardAnswerMetrics, deriveDashboardRewardMetrics, formatLastPedagogicalActivityLabel, getDaysWithoutActivity, getLastPedagogicalActivity, getLatestResponseActivityByStudent, getUniqueCompletedActivityCount, LAST_PEDAGOGICAL_ACTIVITY_FIELD, resolveDashboardLanguageCode } from './dashboardMetrics.ts';

assert.equal(resolveDashboardLanguageCode('english', 'es'), 'en', 'active English course must beat a stale Spanish language code');
assert.equal(resolveDashboardLanguageCode('spanish', 'en'), 'es');
assert.equal(resolveDashboardLanguageCode('unknown', 'pt'), 'pt');

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
const saoPauloNow = new Date('2026-08-14T12:00:00-03:00');
assert.equal(getDaysWithoutActivity('2026-08-14T00:01:00-03:00', saoPauloNow), 0);
assert.equal(formatLastPedagogicalActivityLabel('2026-08-14T00:01:00-03:00', saoPauloNow), 'Today');
assert.equal(getDaysWithoutActivity('2026-08-13T23:59:00-03:00', saoPauloNow), 1);
assert.equal(formatLastPedagogicalActivityLabel('2026-08-13T23:59:00-03:00', saoPauloNow), '1 day without activity');
assert.equal(getDaysWithoutActivity('2026-08-12T23:59:00-03:00', saoPauloNow), 2);
assert.equal(formatLastPedagogicalActivityLabel('2026-08-12T23:59:00-03:00', saoPauloNow), '2 days without activity');
assert.equal(getDaysWithoutActivity('2026-08-13T23:59:59-03:00', new Date('2026-08-14T00:00:01-03:00')), 1,
  'crossing midnight in Sao Paulo starts a new inactivity day even when only seconds elapsed');
assert.equal(getDaysWithoutActivity('2026-08-31T23:59:59-03:00', new Date('2026-09-01T00:00:01-03:00')), 1,
  'calendar-day inactivity must remain correct across month boundaries');
assert.equal(getDaysWithoutActivity('2026-09-01T01:30:00Z', new Date('2026-09-01T04:30:00Z')), 1,
  'UTC timestamps must be compared as Sao Paulo calendar days');
assert.equal(getDaysWithoutActivity('2026-08-10T12:00:00-03:00', saoPauloNow), 4);
assert.equal(formatLastPedagogicalActivityLabel(null, saoPauloNow), '—');
assert.equal(getDaysWithoutActivity({ toMillis: () => Date.parse('2026-08-14T10:00:00-03:00') }, saoPauloNow), 0);
assert.equal(getDaysWithoutActivity({ toDate: () => new Date('2026-08-13T10:00:00-03:00') }, saoPauloNow), 1);
assert.equal(getDaysWithoutActivity(Date.parse('2026-08-12T10:00:00-03:00'), saoPauloNow), 2);

// Production regression: a normal completion must replace a three-day-old
// durable marker, and a fresh snapshot after reload must keep showing Today.
const normalCompletionNow = new Date('2026-08-14T12:00:00-03:00');
let persistedNormalCompletionProgress: Record<string, unknown> = {
  [LAST_PEDAGOGICAL_ACTIVITY_FIELD]: '2026-08-11T12:00:00-03:00',
};
assert.equal(getDaysWithoutActivity(
  getLastPedagogicalActivity(persistedNormalCompletionProgress),
  normalCompletionNow,
), 3);
persistedNormalCompletionProgress = {
  ...persistedNormalCompletionProgress,
  [LAST_PEDAGOGICAL_ACTIVITY_FIELD]: normalCompletionNow.toISOString(),
};
assert.equal(getLastPedagogicalActivity(persistedNormalCompletionProgress), normalCompletionNow.toISOString(),
  'normal completion must durably replace the canonical activity marker');
assert.equal(formatLastPedagogicalActivityLabel(
  getLastPedagogicalActivity(persistedNormalCompletionProgress),
  normalCompletionNow,
), 'Today');
const refreshedNormalCompletionProgress = JSON.parse(JSON.stringify(persistedNormalCompletionProgress));
assert.equal(formatLastPedagogicalActivityLabel(
  getLastPedagogicalActivity(refreshedNormalCompletionProgress),
  normalCompletionNow,
), 'Today', 'a fresh Dashboard snapshot after reload must keep the normal completion as Today');

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
  lastLoginAt: '2026-08-11T12:00:00Z',
  lastNotificationAt: '2026-08-11T12:00:00Z',
  notificationDeliveries: { latest: '2026-08-11T12:00:00Z' },
}), null, 'login/admin timestamps must not count as learning activity');

assert.equal(getLastPedagogicalActivity({
  lastPedagogicalActivityAt: '2026-08-14T14:00:00Z',
  lastActivity: '2026-08-15T14:00:00Z',
  lastNotificationAt: '2026-08-16T14:00:00Z',
}), '2026-08-14T14:00:00Z', 'technical and push timestamps must not supersede the canonical pedagogical marker');

assert.equal(getLastPedagogicalActivity({
  lastActivity: '2026-08-11T12:00:00Z',
  lastActive: '2026-08-08T10:00:00Z',
  lessons: {
    old: { completed: true, completedAt: '2026-08-07T10:00:00Z' },
    ignored: { completed: false, completedAt: '2026-08-10T10:00:00Z' },
  },
  courses: { english: { lastActivityAt: '2026-08-09T10:00:00Z' } },
}), '2026-08-09T10:00:00Z', 'latest pedagogical marker must win');

const replayCompletedToday = getLastPedagogicalActivity({
  lastActive: '2026-08-14T23:20:25Z',
  courseId: 'english',
  languageCode: 'en',
  courses: { english: { lastActivityAt: '2026-08-14T23:20:25Z' } },
});
assert.equal(getDaysWithoutActivity(replayCompletedToday, new Date('2026-08-14T23:40:00Z')), 0,
  'a completed replay must clear the inactivity alert on the same Sao Paulo calendar day');

const reviewActivity = getLastPedagogicalActivity({
  lessons: {
    review: {
      completed: true,
      completedAt: '2026-08-10T12:00:00Z',
      lastActivityAt: '2026-08-14T12:00:00Z',
    },
  },
});
assert.equal(reviewActivity, '2026-08-14T12:00:00Z',
  'a valid review/replay must use its latest activity timestamp, not the first completion timestamp');
assert.equal(getDaysWithoutActivity(reviewActivity, saoPauloNow), 0);

assert.equal(getLastPedagogicalActivity({
  'lessons.legacy-review': {
    completed: true,
    completedAt: '2026-08-10T12:00:00Z',
    lastActivityAt: '2026-08-13T12:00:00Z',
  },
}), '2026-08-13T12:00:00Z', 'legacy literal lesson maps must preserve replay activity');

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
