export const ADMIN_TEST_NOTIFICATION_TAG = 'ADMIN_TEST';
export const INACTIVITY_NOTIFICATION_TAG_PREFIX = 'INACTIVITY_';

type PersistentNotificationLike = Pick<Notification, 'tag' | 'close'> & {
  data?: { type?: unknown };
};

export interface PersistentNotificationRegistration {
  getNotifications: () => Promise<PersistentNotificationLike[]>;
}

export function isInactivityNotification(notification: Pick<PersistentNotificationLike, 'tag' | 'data'>) {
  const type = notification.data?.type;
  return notification.tag.startsWith(INACTIVITY_NOTIFICATION_TAG_PREFIX)
    || type === 'DAILY_REMINDER'
    || type === 'INACTIVITY_REMINDER';
}

export function isAdminTestNotification(notification: Pick<PersistentNotificationLike, 'tag' | 'data'>) {
  return notification.tag === ADMIN_TEST_NOTIFICATION_TAG || notification.data?.type === 'ADMIN_TEST';
}

async function currentServiceWorkerRegistration(): Promise<PersistentNotificationRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration('/')) ?? null;
}

/** Closes only obsolete inactivity notifications; admin and future categories remain untouched. */
export async function closeObsoleteInactivityNotifications(
  registration?: PersistentNotificationRegistration | null,
): Promise<number> {
  const resolved = registration === undefined ? await currentServiceWorkerRegistration() : registration;
  if (!resolved) return 0;
  const notifications = await resolved.getNotifications();
  const obsolete = notifications.filter(isInactivityNotification);
  obsolete.forEach((notification) => notification.close());
  return obsolete.length;
}

/** Removes the previous test, including legacy tests that had eventId tags. */
export async function closeSupersededAdminTestNotifications(
  registration: PersistentNotificationRegistration,
): Promise<number> {
  const notifications = await registration.getNotifications();
  const superseded = notifications.filter(isAdminTestNotification);
  superseded.forEach((notification) => notification.close());
  return superseded.length;
}
