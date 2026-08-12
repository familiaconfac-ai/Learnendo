import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isAuthorizedCronRequest } from './cronAuth';
import {
  classifyNotificationDevices,
  deriveDaysInactive,
  isDailyReminderEligible,
  resolveNotificationDeliveryStatus,
} from './dailyReminderPolicy';
import { buildAdminNotificationStatus } from './adminNotificationStatus';
import {
  isInvalidFcmTokenError,
  nextDeviceState,
  shouldReassignNotificationDevice,
  validNotificationDeviceInput,
} from './notificationDevicePolicy';
import {
  notificationEventDocumentId,
  safeInternalNotificationUrl,
  saoPauloDayKey,
} from './notificationPolicy';
import { buildNotificationContent } from './notificationTemplates';
import { notificationDeviceIdFromFid } from '../src/services/notificationDeviceIdentity';
import { formatAdminNotificationDate } from '../src/services/adminNotifications';

const fid = 'cX2yR6eT8uI0oP4aS7dF9g';
const deviceId = await notificationDeviceIdFromFid(fid);
assert.match(deviceId, /^[a-f0-9]{64}$/);
assert.equal(deviceId, await notificationDeviceIdFromFid(fid));
assert.notEqual(deviceId, await notificationDeviceIdFromFid(`${fid}-other-browser`));
assert.ok(validNotificationDeviceInput({ deviceId, token: 'valid-registration-token-value', platform: 'desktop-web' }));

const renewed = nextDeviceState({ token: 'old-token-value-that-is-long' }, {
  uid: 'student-a', token: 'new-token-value-that-is-long', platform: 'android-web',
});
assert.equal(renewed.token, 'new-token-value-that-is-long');
assert.equal(renewed.uid, 'student-a');
assert.equal(renewed.status, 'active');
assert.ok(shouldReassignNotificationDevice('student-a', 'student-b'));
assert.ok(!shouldReassignNotificationDevice('student-a', 'student-a'));

const now = new Date('2026-08-12T12:00:00.000Z');
const classified = classifyNotificationDevices([
  { status: 'active', token: 'token-a', lastSeenAt: new Date('2026-08-12T10:00:00Z') },
  { status: 'active', token: 'token-b', lastSeenAt: new Date('2026-08-11T10:00:00Z') },
  { status: 'active', token: 'token-a', lastSeenAt: new Date('2026-08-12T11:00:00Z') },
  { status: 'invalid', token: 'token-invalid', lastSeenAt: now },
  { status: 'active', token: 'token-stale', lastSeenAt: new Date('2026-04-01T10:00:00Z') },
], now);
assert.deepEqual(classified.validIndexes, [0, 1]);
assert.deepEqual(classified.staleIndexes, [4]);
assert.equal(resolveNotificationDeliveryStatus(3, 3), 'sent');
assert.equal(resolveNotificationDeliveryStatus(2, 3), 'partial');
assert.equal(resolveNotificationDeliveryStatus(0, 3), 'failed');
assert.ok(isInvalidFcmTokenError('messaging/registration-token-not-registered'));
assert.ok(!isInvalidFcmTokenError('messaging/internal-error'));

const baseEligibility = {
  notificationsEnabled: true,
  hasValidDevice: true,
  lastPedagogicalActivity: new Date('2026-08-11T12:00:00Z'),
  now,
};
assert.ok(isDailyReminderEligible({ ...baseEligibility, role: 'student' }));
assert.ok(!isDailyReminderEligible({ ...baseEligibility, role: 'admin' }));
assert.ok(!isDailyReminderEligible({ ...baseEligibility, role: 'teacher' }));
assert.ok(!isDailyReminderEligible({ ...baseEligibility, role: 'student', notificationsEnabled: false }));
assert.ok(!isDailyReminderEligible({ ...baseEligibility, role: 'student', hasValidDevice: false }));
assert.ok(isDailyReminderEligible({
  ...baseEligibility,
  role: 'student',
  lastPedagogicalActivity: new Date('2026-08-12T02:30:00Z'), // 2026-08-11 23:30 in São Paulo
}));
assert.ok(!isDailyReminderEligible({
  ...baseEligibility,
  role: 'student',
  lastPedagogicalActivity: new Date('2026-08-12T11:30:00Z'),
}));
assert.equal(deriveDaysInactive(new Date('2026-08-10T12:00:00Z'), now), 2);

assert.equal(saoPauloDayKey(new Date('2026-08-12T01:00:00Z')), '2026-08-11');
assert.equal(safeInternalNotificationUrl('/student/lesson/3', 'https://learnendo.vercel.app'), 'https://learnendo.vercel.app/student/lesson/3');
assert.equal(safeInternalNotificationUrl('https://site-malicioso.com', 'https://learnendo.vercel.app'), 'https://learnendo.vercel.app/');
assert.equal(safeInternalNotificationUrl('javascript:alert(1)', 'https://learnendo.vercel.app'), 'https://learnendo.vercel.app/');
assert.equal(buildNotificationContent('DAILY_REMINDER').title, 'Learnendo');

const dailyKey = 'student-a:DAILY_REMINDER:2026-08-12';
assert.equal(notificationEventDocumentId(dailyKey), notificationEventDocumentId(dailyKey));
assert.notEqual(notificationEventDocumentId(dailyKey), notificationEventDocumentId('student-a:DAILY_REMINDER:2026-08-13'));

const cronSecret = 'a-secure-test-secret-12345';
assert.ok(isAuthorizedCronRequest(`Bearer ${cronSecret}`, cronSecret));
assert.ok(!isAuthorizedCronRequest(undefined, cronSecret));
assert.ok(!isAuthorizedCronRequest('Bearer wrong-secret-value', cronSecret));
assert.ok(!isAuthorizedCronRequest('Bearer short', 'short'));

const activeDevices = (amount: number) => Array.from({ length: amount }, (_, index) => ({
  status: 'active', token: `eligible-token-${index}-long-value`, platform: 'desktop-web', provider: 'fcm-token', lastSeenAt: now,
}));
for (const amount of [0, 1, 2, 3]) {
  const status = buildAdminNotificationStatus({
    uid: `student-${amount}`,
    preferenceExists: true,
    preference: { enabled: true, permission: 'granted' },
    devices: activeDevices(amount),
    now,
  });
  assert.equal(status.activeDeviceCount, amount);
  assert.equal(status.kind, amount === 0 ? 'no-device' : 'active');
}

const mixedStatus = buildAdminNotificationStatus({
  uid: 'student-mixed',
  preferenceExists: true,
  preference: { enabled: true, permission: 'granted' },
  devices: [
    ...activeDevices(2),
    { status: 'active', token: 'stale-token-long-value', lastSeenAt: new Date('2026-01-01T00:00:00Z') },
    { status: 'invalid', token: 'invalid-token-long-value', lastSeenAt: now },
    { status: 'signed-out', token: 'signed-out-token-long-value', lastSeenAt: now },
  ],
  latestDelivery: { status: 'partial', type: 'ADMIN_TEST', deviceCount: 2, successCount: 1, failureCount: 1, completedAt: now },
  now,
});
assert.equal(mixedStatus.activeDeviceCount, 2);
assert.equal(mixedStatus.kind, 'active');
assert.deepEqual(mixedStatus.devices.map((device) => device.status).sort(), ['active', 'active', 'invalid', 'signed-out', 'stale'].sort());
assert.ok(mixedStatus.devices.every((device) => !('token' in device)));
assert.equal(mixedStatus.latestDelivery?.status, 'partial');
assert.equal(mixedStatus.latestLastSeenAt, now.toISOString());
assert.equal(formatAdminNotificationDate('2026-08-12T12:30:00.000Z', now), 'Hoje, 09:30');
assert.equal(formatAdminNotificationDate('2026-08-11T12:30:00.000Z', now), '11/08/2026, 09:30');

assert.equal(buildAdminNotificationStatus({
  uid: 'student-disabled', preferenceExists: true, preference: { enabled: false, permission: 'denied' }, devices: activeDevices(1), now,
}).kind, 'disabled');
assert.equal(buildAdminNotificationStatus({
  uid: 'student-never-requested', preferenceExists: false, devices: [], now,
}).kind, 'not-authorized');
assert.equal(buildAdminNotificationStatus({
  uid: 'student-enabled-without-device', preferenceExists: true, preference: { enabled: true, permission: 'granted' }, devices: [], now,
}).kind, 'no-device');

const vercelConfig = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf8')) as {
  crons?: Array<{ path: string; schedule: string }>;
};
assert.deepEqual(vercelConfig.crons, [{ path: '/api/cron/daily-notifications', schedule: '0 12 * * *' }]);

const firestoreRules = fs.readFileSync(path.resolve('../../firestore.rules'), 'utf8');
assert.match(firestoreRules, /match \/users\/\{uid\}[\s\S]*isOwner\(uid\)/);
assert.match(firestoreRules, /match \/notificationDeliveries\/\{deliveryId\}[\s\S]*allow read, write: if false/);
assert.match(firestoreRules, /match \/notificationDeviceOwners\/\{deviceId\}[\s\S]*allow read, write: if false/);
assert.match(firestoreRules, /match \/users\/\{uid\}[\s\S]*match \/\{document=\*\*\}[\s\S]*isOwner\(uid\) \|\| isAdmin\(\)/);

const notificationApi = fs.readFileSync(path.resolve('api/notifications.ts'), 'utf8');
assert.match(notificationApi, /const admin = await requireAdmin\(authorization\)/);
assert.match(notificationApi, /body\.action === 'status'/);

for (const serverModule of ['server/notifications.ts', 'server/adminNotificationStatus.ts', 'server/dailyReminderPolicy.ts']) {
  const source = fs.readFileSync(path.resolve(serverModule), 'utf8');
  const relativeImports = Array.from(source.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g), (match) => match[1]);
  assert.ok(relativeImports.length > 0, `${serverModule} should keep its server dependency imports explicit.`);
  assert.ok(
    relativeImports.every((specifier) => specifier.endsWith('.js')),
    `${serverModule} contains an extensionless relative import that will fail in the Vercel ESM runtime.`,
  );
}

const dashboardSource = fs.readFileSync(path.resolve('src/components/TeacherDashboard/TeacherDashboard.tsx'), 'utf8');
const studentPanelSource = fs.readFileSync(path.resolve('src/components/TeacherDashboard/StudentAdminPanel.tsx'), 'utf8');
const appSource = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
assert.match(dashboardSource, />Notificações</);
assert.match(dashboardSource, /NotificationStatusBadge/);
assert.match(studentPanelSource, /notificationDetails\?\.kind !== 'active'/);
assert.doesNotMatch(studentPanelSource, /\.token\b/);
assert.match(appSource, /case SectionType\.SETTINGS:[\s\S]*?<NotificationSettings user=\{user\} \/>/);
assert.doesNotMatch(appSource, /This feature is under construction/);

const firestoreIndexes = JSON.parse(fs.readFileSync(path.resolve('../../firestore.indexes.json'), 'utf8')) as {
  fieldOverrides?: Array<{ collectionGroup?: string; fieldPath?: string }>;
};
assert.ok(firestoreIndexes.fieldOverrides?.some((index) => index.collectionGroup === 'notificationDevices' && index.fieldPath === 'uid'));

console.log('notification system tests passed');
