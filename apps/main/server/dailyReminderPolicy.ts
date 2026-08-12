import { saoPauloDayKey } from './notificationPolicy';

export const DEVICE_STALE_AFTER_DAYS = 90;

function millis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'object' && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    const result = (value as { toMillis: () => number }).toMillis();
    return Number.isFinite(result) ? result : null;
  }
  const result = new Date(value as string | number | Date).getTime();
  return Number.isFinite(result) ? result : null;
}

export function isDailyReminderEligible(input: {
  role: unknown;
  notificationsEnabled: boolean;
  hasValidDevice: boolean;
  lastPedagogicalActivity: unknown;
  now: Date;
}) {
  if (input.role === 'admin' || input.role === 'teacher') return false;
  if (!input.notificationsEnabled || !input.hasValidDevice) return false;
  const activityMillis = millis(input.lastPedagogicalActivity);
  return activityMillis === null
    || saoPauloDayKey(new Date(activityMillis)) !== saoPauloDayKey(input.now);
}

export function deriveDaysInactive(lastPedagogicalActivity: unknown, now = new Date()) {
  const activityMillis = millis(lastPedagogicalActivity);
  if (activityMillis === null) return null;
  const currentDay = Date.parse(`${saoPauloDayKey(now)}T12:00:00Z`);
  const activityDay = Date.parse(`${saoPauloDayKey(new Date(activityMillis))}T12:00:00Z`);
  return Math.max(0, Math.floor((currentDay - activityDay) / 86_400_000));
}

export function classifyNotificationDevices(
  devices: Array<{ status?: unknown; token?: unknown; lastSeenAt?: unknown }>,
  now = new Date(),
) {
  const staleBefore = now.getTime() - DEVICE_STALE_AFTER_DAYS * 86_400_000;
  const tokens = new Set<string>();
  const validIndexes: number[] = [];
  const staleIndexes: number[] = [];
  devices.forEach((device, index) => {
    if (device.status !== 'active') return;
    const lastSeenMillis = millis(device.lastSeenAt);
    if (lastSeenMillis !== null && lastSeenMillis < staleBefore) {
      staleIndexes.push(index);
      return;
    }
    const token = typeof device.token === 'string' ? device.token.trim() : '';
    if (!token || tokens.has(token)) return;
    tokens.add(token);
    validIndexes.push(index);
  });
  return { validIndexes, staleIndexes };
}

export function resolveNotificationDeliveryStatus(successCount: number, deviceCount: number): 'sent' | 'partial' | 'failed' {
  return successCount === deviceCount ? 'sent' : successCount > 0 ? 'partial' : 'failed';
}
