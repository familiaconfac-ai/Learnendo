import assert from 'node:assert/strict';
import {
  ADMIN_TEST_NOTIFICATION_TAG,
  closeObsoleteInactivityNotifications,
  closeSupersededAdminTestNotifications,
  INACTIVITY_NOTIFICATION_TAG_PREFIX,
  type PersistentNotificationRegistration,
} from './persistentNotifications';

const closed: string[] = [];
const notification = (tag: string, type?: string) => ({
  tag,
  data: type ? { type } : undefined,
  close() { closed.push(tag); },
});
const registration: PersistentNotificationRegistration = {
  async getNotifications() {
    return [
      notification(ADMIN_TEST_NOTIFICATION_TAG, 'ADMIN_TEST'),
      notification(`${INACTIVITY_NOTIFICATION_TAG_PREFIX}DAILY_REMINDER`, 'DAILY_REMINDER'),
      notification('legacy-event-id', 'DAILY_REMINDER'),
      notification('ACHIEVEMENT_123', 'ACHIEVEMENT'),
    ];
  },
};

assert.equal(await closeObsoleteInactivityNotifications(registration), 2);
assert.deepEqual(closed.sort(), [`${INACTIVITY_NOTIFICATION_TAG_PREFIX}DAILY_REMINDER`, 'legacy-event-id'].sort());
assert.ok(!closed.includes(ADMIN_TEST_NOTIFICATION_TAG));
assert.ok(!closed.includes('ACHIEVEMENT_123'));

closed.length = 0;
assert.equal(await closeSupersededAdminTestNotifications(registration), 1);
assert.deepEqual(closed, [ADMIN_TEST_NOTIFICATION_TAG]);

console.log('persistent notification tests passed');
