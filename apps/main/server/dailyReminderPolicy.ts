import { getDaysWithoutActivity } from '../src/engine/dashboardMetrics.js';

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
  const daysWithoutActivity = getDaysWithoutActivity(input.lastPedagogicalActivity, input.now);
  return daysWithoutActivity !== null && daysWithoutActivity > 0;
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
