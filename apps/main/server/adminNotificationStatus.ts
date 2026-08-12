import { classifyNotificationDevices } from './dailyReminderPolicy';

export type AdminNotificationStatusKind = 'active' | 'disabled' | 'not-authorized' | 'no-device';

export interface AdminNotificationDeviceSummary {
  platform: string | null;
  provider: string | null;
  status: string;
  eligible: boolean;
  lastSeenAt: string | null;
}

export interface AdminNotificationDeliverySummary {
  status: string;
  type: string | null;
  deviceCount: number;
  successCount: number;
  failureCount: number;
  completedAt: string | null;
}

export interface AdminNotificationStatus {
  uid: string;
  kind: AdminNotificationStatusKind;
  enabled: boolean;
  permission: string;
  activeDeviceCount: number;
  latestLastSeenAt: string | null;
  devices: AdminNotificationDeviceSummary[];
  latestDelivery: AdminNotificationDeliverySummary | null;
}

function millis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'object' && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    const result = (value as { toMillis: () => number }).toMillis();
    return Number.isFinite(result) ? result : null;
  }
  const result = new Date(value as string | number | Date).getTime();
  return Number.isFinite(result) ? result : null;
}

function iso(value: unknown): string | null {
  const valueMillis = millis(value);
  return valueMillis === null ? null : new Date(valueMillis).toISOString();
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function count(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

export function buildAdminNotificationStatus(input: {
  uid: string;
  preferenceExists: boolean;
  preference?: Record<string, unknown>;
  devices: Array<Record<string, unknown>>;
  latestDelivery?: Record<string, unknown> | null;
  now?: Date;
}): AdminNotificationStatus {
  const now = input.now ?? new Date();
  const classification = classifyNotificationDevices(input.devices, now);
  const eligibleIndexes = new Set(classification.validIndexes);
  const staleIndexes = new Set(classification.staleIndexes);
  const enabled = input.preference?.enabled === true;
  const permission = text(input.preference?.permission) ?? 'not-requested';
  const activeDeviceCount = classification.validIndexes.length;
  const kind: AdminNotificationStatusKind = enabled
    ? (activeDeviceCount > 0 ? 'active' : 'no-device')
    : (input.preferenceExists || input.devices.length > 0 ? 'disabled' : 'not-authorized');

  const devices = input.devices.map((device, index): AdminNotificationDeviceSummary => ({
    platform: text(device.platform),
    provider: text(device.provider),
    status: staleIndexes.has(index) ? 'stale' : (text(device.status) ?? 'unknown'),
    eligible: eligibleIndexes.has(index),
    lastSeenAt: iso(device.lastSeenAt),
  })).sort((left, right) => (right.lastSeenAt ?? '').localeCompare(left.lastSeenAt ?? ''));

  const latestLastSeenAt = devices.reduce<string | null>(
    (latest, device) => !latest || (device.lastSeenAt && device.lastSeenAt > latest) ? device.lastSeenAt : latest,
    null,
  );
  const delivery = input.latestDelivery;
  const latestDelivery = delivery ? {
    status: text(delivery.status) ?? 'unknown',
    type: text(delivery.type),
    deviceCount: count(delivery.deviceCount),
    successCount: count(delivery.successCount),
    failureCount: count(delivery.failureCount),
    completedAt: iso(delivery.completedAt) ?? iso(delivery.createdAt),
  } : null;

  return {
    uid: input.uid,
    kind,
    enabled,
    permission,
    activeDeviceCount,
    latestLastSeenAt,
    devices,
    latestDelivery,
  };
}
