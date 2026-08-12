import { FieldValue } from 'firebase-admin/firestore';
import type { BatchResponse } from 'firebase-admin/messaging';
import { adminDb, adminMessaging } from './firebaseAdmin';
import { buildNotificationContent, type NotificationType } from './notificationTemplates';
import { getLastPedagogicalActivity } from '../src/engine/dashboardMetrics';
import { notificationEventDocumentId, NOTIFICATION_TIMEZONE, safeInternalNotificationUrl, saoPauloDayKey } from './notificationPolicy';
import { classifyNotificationDevices, isDailyReminderEligible, resolveNotificationDeliveryStatus } from './dailyReminderPolicy';
import { isInvalidFcmTokenError } from './notificationDevicePolicy';

type DeliveryStatus = 'sending' | 'sent' | 'partial' | 'failed' | 'disabled' | 'no-devices' | 'duplicate';

export interface NotificationSendResult {
  eventId: string;
  status: DeliveryStatus;
  deviceCount: number;
  successCount: number;
  failureCount: number;
}

async function finishDelivery(
  eventId: string,
  status: Exclude<DeliveryStatus, 'sending' | 'duplicate'>,
  counts: { deviceCount: number; successCount: number; failureCount: number },
  errorCodes: string[] = [],
) {
  await adminDb.doc(`notificationDeliveries/${eventId}`).set({
    status,
    ...counts,
    errorCodes: Array.from(new Set(errorCodes)).slice(0, 10),
    completedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { eventId, status, ...counts };
}

async function claimEvent(uid: string, type: NotificationType, eventKey: string) {
  const eventId = notificationEventDocumentId(eventKey);
  const reference = adminDb.doc(`notificationDeliveries/${eventId}`);
  const existing = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (snapshot.exists) return snapshot.data();
    transaction.create(reference, {
      uid,
      type,
      status: 'sending',
      eventKeyHash: eventId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return null;
  });
  return { eventId, existing };
}

export async function sendNotificationToUser(input: {
  uid: string;
  type: NotificationType;
  eventKey: string;
}): Promise<NotificationSendResult> {
  const { eventId, existing } = await claimEvent(input.uid, input.type, input.eventKey);
  if (existing) {
    return {
      eventId,
      status: 'duplicate',
      deviceCount: Number(existing.deviceCount) || 0,
      successCount: Number(existing.successCount) || 0,
      failureCount: Number(existing.failureCount) || 0,
    };
  }

  const preference = await adminDb.doc(`users/${input.uid}/notificationSettings/preferences`).get();
  if (preference.data()?.enabled !== true) {
    return finishDelivery(eventId, 'disabled', { deviceCount: 0, successCount: 0, failureCount: 0 });
  }

  const devices = await adminDb.collection(`users/${input.uid}/notificationDevices`)
    .where('status', '==', 'active')
    .get();
  const classification = classifyNotificationDevices(devices.docs.map((device) => device.data()));
  const staleDevices = classification.staleIndexes.map((index) => devices.docs[index]);
  await Promise.all(staleDevices.map((device) => device.ref.update({
    status: 'stale', staleAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  })));
  const validDevices = classification.validIndexes.map((index) => devices.docs[index]);
  if (validDevices.length === 0) {
    return finishDelivery(eventId, 'no-devices', { deviceCount: 0, successCount: 0, failureCount: 0 });
  }

  const content = buildNotificationContent(input.type);
  const destination = safeInternalNotificationUrl(content.path, process.env.APP_ORIGIN);
  let successCount = 0;
  let failureCount = 0;
  const errorCodes: string[] = [];

  for (let offset = 0; offset < validDevices.length; offset += 500) {
    const chunk = validDevices.slice(offset, offset + 500);
    let response: BatchResponse;
    try {
      response = await adminMessaging.sendEachForMulticast({
        tokens: chunk.map((device) => device.data().token.trim()),
        data: {
          title: content.title,
          body: content.body,
          url: destination,
          type: input.type,
          eventId,
        },
        webpush: {
          headers: { Urgency: 'normal' },
          fcmOptions: { link: destination },
        },
      });
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'messaging/send-failed';
      errorCodes.push(code);
      failureCount += chunk.length;
      continue;
    }

    successCount += response.successCount;
    failureCount += response.failureCount;
    await Promise.all(response.responses.map(async (result, index) => {
      if (result.success) {
        await chunk[index].ref.update({ lastSuccessfulSendAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        return;
      }
      const code = result.error?.code || 'messaging/unknown';
      errorCodes.push(code);
      if (isInvalidFcmTokenError(code)) {
        await chunk[index].ref.update({ status: 'invalid', invalidatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      }
    }));
  }

  const status = resolveNotificationDeliveryStatus(successCount, validDevices.length);
  return finishDelivery(eventId, status, {
    deviceCount: validDevices.length,
    successCount,
    failureCount,
  }, errorCodes);
}

export async function runPreparedDailyReminderJob(now = new Date()) {
  const dayKey = saoPauloDayKey(now);
  const users = await adminDb.collection('users').get();
  const results: NotificationSendResult[] = [];
  for (const user of users.docs) {
    const role = user.data().role;
    const [preference, devices, progress] = await Promise.all([
      adminDb.doc(`users/${user.id}/notificationSettings/preferences`).get(),
      adminDb.collection(`users/${user.id}/notificationDevices`).where('status', '==', 'active').get(),
      adminDb.doc(`progress/${user.id}`).get(),
    ]);
    const deviceClassification = classifyNotificationDevices(devices.docs.map((device) => device.data()), now);
    await Promise.all(deviceClassification.staleIndexes.map((index) => devices.docs[index].ref.update({
      status: 'stale',
      staleAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })));
    const lastActivity = getLastPedagogicalActivity(progress.data());
    if (!isDailyReminderEligible({
      role,
      notificationsEnabled: preference.data()?.enabled === true,
      hasValidDevice: deviceClassification.validIndexes.length > 0,
      lastPedagogicalActivity: lastActivity,
      now,
    })) continue;
    results.push(await sendNotificationToUser({
      uid: user.id,
      type: 'DAILY_REMINDER',
      eventKey: `${user.id}:DAILY_REMINDER:${dayKey}`,
    }));
  }
  return { dayKey, timezone: NOTIFICATION_TIMEZONE, results };
}
