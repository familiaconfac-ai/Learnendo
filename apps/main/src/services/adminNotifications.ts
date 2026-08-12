import type { User } from 'firebase/auth';

export interface AdminNotificationResult {
  eventId: string;
  status: 'sent' | 'partial' | 'failed' | 'disabled' | 'no-devices' | 'duplicate';
  deviceCount: number;
  successCount: number;
  failureCount: number;
}

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

async function callAdminNotificationEndpoint<T>(admin: User, body: Record<string, unknown>) {
  const token = await admin.getIdToken();
  const response = await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  let payload: T & { error?: string };
  try { payload = JSON.parse(raw) as typeof payload; }
  catch { throw new Error('The notification endpoint returned an invalid response.'); }
  if (!response.ok) throw new Error(payload.error || 'Unable to access notification information.');
  return payload;
}

export async function getAdminNotificationStatuses(admin: User, uids: string[], includeLatestDelivery = false) {
  const uniqueUids = Array.from(new Set(uids));
  if (uniqueUids.length === 0) return [];
  const statuses: AdminNotificationStatus[] = [];
  for (let offset = 0; offset < uniqueUids.length; offset += 500) {
    const chunk = uniqueUids.slice(offset, offset + 500);
    const payload = await callAdminNotificationEndpoint<{ statuses?: AdminNotificationStatus[] }>(admin, {
      action: 'status',
      uids: chunk,
      includeLatestDelivery: includeLatestDelivery && uniqueUids.length === 1,
    });
    if (!Array.isArray(payload.statuses)) throw new Error('The notification endpoint returned no statuses.');
    statuses.push(...payload.statuses);
  }
  return statuses;
}

export async function sendAdminTestNotification(admin: User, uid: string) {
  const payload = await callAdminNotificationEndpoint<{ result?: AdminNotificationResult }>(admin, {
    action: 'test', uid, requestId: crypto.randomUUID(),
  });
  if (!payload.result) throw new Error('The notification endpoint returned no delivery result.');
  return payload.result;
}

export const ADMIN_NOTIFICATION_STATUS_LABELS: Record<AdminNotificationStatusKind, string> = {
  active: 'Ativas',
  disabled: 'Desativadas',
  'not-authorized': 'Não autorizadas',
  'no-device': 'Sem dispositivo',
};

export function adminNotificationStatusLabel(status: AdminNotificationStatus) {
  return status.kind === 'active'
    ? `Ativas · ${status.activeDeviceCount} dispositivo${status.activeDeviceCount === 1 ? '' : 's'}`
    : ADMIN_NOTIFICATION_STATUS_LABELS[status.kind];
}

export function formatAdminNotificationDate(value: string | null, now = new Date()) {
  if (!value) return 'Nunca';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Indisponível';
  const timezone = 'America/Sao_Paulo';
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const currentDay = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }).format(date);
  if (day === currentDay) return `Hoje, ${time}`;
  return `${new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)}, ${time}`;
}
