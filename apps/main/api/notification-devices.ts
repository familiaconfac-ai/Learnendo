import type { IncomingMessage, ServerResponse } from 'node:http';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '../server/firebaseAdmin.js';
import {
  nextDeviceState,
  shouldReassignNotificationDevice,
  validNotificationDeviceInput,
  type NotificationDevicePlatform,
} from '../server/notificationDevicePolicy.js';

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

function requestBody(request: RequestLike) {
  if (typeof request.body === 'string') return JSON.parse(request.body) as Record<string, unknown>;
  return (request.body ?? {}) as Record<string, unknown>;
}

async function authenticatedUid(request: RequestLike) {
  const raw = Array.isArray(request.headers.authorization) ? request.headers.authorization[0] : request.headers.authorization;
  const match = raw?.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error('Authentication required.'), { statusCode: 401 });
  return (await adminAuth.verifyIdToken(match[1])).uid;
}

export default async function handler(request: RequestLike, response: ResponseLike) {
  response.setHeader('cache-control', 'no-store');
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed.' });
  try {
    const uid = await authenticatedUid(request);
    const body = requestBody(request);
    const action = body.action;
    if (action !== 'register' && action !== 'disable' && action !== 'signOut') {
      return sendJson(response, 400, { error: 'Unsupported notification device action.' });
    }
    if (!validNotificationDeviceInput({
      deviceId: body.deviceId,
      token: action === 'register' ? body.token : undefined,
      platform: action === 'register' ? body.platform : undefined,
    })) return sendJson(response, 400, { error: 'Invalid notification device data.' });

    const deviceId = body.deviceId as string;
    const ownerRef = adminDb.doc(`notificationDeviceOwners/${deviceId}`);
    const deviceRef = adminDb.doc(`users/${uid}/notificationDevices/${deviceId}`);

    await adminDb.runTransaction(async (transaction) => {
      const [ownerSnapshot, deviceSnapshot] = await Promise.all([
        transaction.get(ownerRef),
        transaction.get(deviceRef),
      ]);
      const previousUid = typeof ownerSnapshot.data()?.uid === 'string' ? ownerSnapshot.data()?.uid : null;

      if (action === 'register') {
        if (shouldReassignNotificationDevice(previousUid, uid)) {
          transaction.set(adminDb.doc(`users/${previousUid}/notificationDevices/${deviceId}`), {
            status: 'reassigned',
            reassignedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        }
        const state = nextDeviceState(deviceSnapshot.data(), {
          uid,
          token: (body.token as string).trim(),
          platform: body.platform as NotificationDevicePlatform,
        });
        transaction.set(deviceRef, {
          ...state,
          invalidatedAt: FieldValue.delete(),
          staleAt: FieldValue.delete(),
          signedOutAt: FieldValue.delete(),
          disabledAt: FieldValue.delete(),
          lastSeenAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          ...(deviceSnapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        }, { merge: true });
        transaction.set(ownerRef, { uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        return;
      }

      if ((previousUid && previousUid !== uid) || !deviceSnapshot.exists) return;
      const status = action === 'disable' ? 'disabled' : 'signed-out';
      transaction.set(deviceRef, {
        status,
        ...(action === 'disable'
          ? { disabledAt: FieldValue.serverTimestamp() }
          : { signedOutAt: FieldValue.serverTimestamp() }),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      if (ownerSnapshot.exists && previousUid === uid) transaction.delete(ownerRef);
    });

    return sendJson(response, 200, { ok: true });
  } catch (error) {
    const status = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 500;
    return sendJson(response, status, { error: status >= 500 ? 'Unable to update notification device.' : (error as Error).message });
  }
}
