export const NOTIFICATION_DEVICE_ID_PATTERN = /^[a-f0-9]{64}$/;
export const NOTIFICATION_DEVICE_PLATFORMS = ['desktop-web', 'android-web', 'ios-web'] as const;
export type NotificationDevicePlatform = typeof NOTIFICATION_DEVICE_PLATFORMS[number];

export function validNotificationDeviceInput(input: {
  deviceId: unknown;
  token?: unknown;
  platform?: unknown;
}) {
  if (typeof input.deviceId !== 'string' || !NOTIFICATION_DEVICE_ID_PATTERN.test(input.deviceId)) return false;
  if (input.token !== undefined && (typeof input.token !== 'string' || input.token.trim().length < 20 || input.token.length > 4096)) return false;
  if (input.platform !== undefined && !NOTIFICATION_DEVICE_PLATFORMS.includes(input.platform as NotificationDevicePlatform)) return false;
  return true;
}

export function nextDeviceState(existing: Record<string, unknown> | undefined, input: {
  uid: string;
  token: string;
  platform: NotificationDevicePlatform;
}) {
  return {
    uid: input.uid,
    token: input.token,
    provider: 'fcm-token',
    platform: input.platform,
    status: 'active',
    permission: 'granted',
  } as const;
}

export function isInvalidFcmTokenError(code?: string) {
  return code === 'messaging/registration-token-not-registered'
    || code === 'messaging/invalid-registration-token'
    || code === 'messaging/invalid-argument';
}

export function shouldReassignNotificationDevice(previousUid: unknown, nextUid: string) {
  return typeof previousUid === 'string' && previousUid.length > 0 && previousUid !== nextUid;
}
