import type { IncomingMessage, ServerResponse } from 'node:http';
import { adminDb, requireAdmin } from '../server/firebaseAdmin.js';
import { sendNotificationToUser } from '../server/notifications.js';
import { buildAdminNotificationStatus } from '../server/adminNotificationStatus.js';

type RequestLike = IncomingMessage & { method?: string; body?: unknown };
type ResponseLike = ServerResponse<IncomingMessage> & {
  status?: (code: number) => ResponseLike;
  json?: (body: unknown) => void;
};

function sendJson(response: ResponseLike, status: number, body: unknown) {
  if (response.status && response.json) return response.status(status).json(body);
  response.statusCode = status;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(body));
}

function bodyOf(request: RequestLike) {
  if (typeof request.body === 'string') return JSON.parse(request.body) as Record<string, unknown>;
  return (request.body ?? {}) as Record<string, unknown>;
}

function requestedUids(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .filter((uid): uid is string => typeof uid === 'string')
    .map((uid) => uid.trim())
    .filter((uid) => /^[A-Za-z0-9_-]{1,128}$/.test(uid))))
    .slice(0, 500);
}

async function loadNotificationStatuses(uids: string[], includeLatestDelivery: boolean) {
  const preferenceRefs = uids.map((uid) => adminDb.doc(`users/${uid}/notificationSettings/preferences`));
  const preferenceSnapshots = preferenceRefs.length ? await adminDb.getAll(...preferenceRefs) : [];
  const devicesByUid = new Map<string, Array<Record<string, unknown>>>();
  for (let offset = 0; offset < uids.length; offset += 30) {
    const chunk = uids.slice(offset, offset + 30);
    const snapshot = await adminDb.collectionGroup('notificationDevices').where('uid', 'in', chunk).get();
    snapshot.docs.forEach((device) => {
      const uid = typeof device.data().uid === 'string' ? device.data().uid : '';
      if (!uid || !uids.includes(uid)) return;
      devicesByUid.set(uid, [...(devicesByUid.get(uid) ?? []), device.data()]);
    });
  }

  let latestDelivery: Record<string, unknown> | null = null;
  if (includeLatestDelivery && uids.length === 1) {
    const snapshot = await adminDb.collection('notificationDeliveries')
      .where('uid', '==', uids[0])
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    latestDelivery = snapshot.docs[0]?.data() ?? null;
  }

  return uids.map((uid, index) => {
    const preference = preferenceSnapshots[index];
    return buildAdminNotificationStatus({
      uid,
      preferenceExists: preference?.exists === true,
      preference: preference?.data(),
      devices: devicesByUid.get(uid) ?? [],
      latestDelivery: uids.length === 1 ? latestDelivery : null,
    });
  });
}

export default async function handler(request: RequestLike, response: ResponseLike) {
  response.setHeader('cache-control', 'no-store');
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed.' });
  try {
    const authorization = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const admin = await requireAdmin(authorization);
    const body = bodyOf(request);
    if (body.action === 'status') {
      const uids = requestedUids(body.uids);
      if (uids.length === 0) return sendJson(response, 400, { error: 'At least one valid student uid is required.' });
      const statuses = await loadNotificationStatuses(uids, body.includeLatestDelivery === true);
      return sendJson(response, 200, { statuses });
    }
    if (body.action !== 'test') return sendJson(response, 400, { error: 'Unsupported notification action.' });
    const uid = typeof body.uid === 'string' ? body.uid.trim() : '';
    const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
    if (!uid || !/^[A-Za-z0-9_-]{8,128}$/.test(requestId)) {
      return sendJson(response, 400, { error: 'A student uid and valid requestId are required.' });
    }
    const profile = await adminDb.doc(`users/${uid}`).get();
    if (!profile.exists || profile.data()?.role === 'admin' || profile.data()?.role === 'teacher') {
      return sendJson(response, 404, { error: 'Student not found.' });
    }
    const result = await sendNotificationToUser({
      uid,
      type: 'ADMIN_TEST',
      eventKey: `${admin.uid}:ADMIN_TEST:${uid}:${requestId}`,
    });
    return sendJson(response, 200, { result });
  } catch (error) {
    const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 500;
    const message = error instanceof Error ? error.message : 'Unable to send notification.';
    return sendJson(response, statusCode, { error: message });
  }
}
