import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { LiveClassRole, LiveClassSession } from '../types';

export type LiveMediaActivationReason = 'mic' | 'camera' | 'screen-share' | 'student-media' | 'recovery';

interface ConnectionTelemetryContext {
  uid: string;
  role: LiveClassRole;
  classId: string;
  tabId: string;
}

const connectedAt = new Map<string, number>();

function telemetryKey(context: ConnectionTelemetryContext) {
  return `${context.classId}:${context.uid}:${context.tabId}`;
}

async function writeTelemetry(classId: string, payload: Record<string, unknown>) {
  console.info('[LiveMediaTelemetry]', payload);
  await addDoc(collection(db, 'liveClasses', classId, 'mediaTelemetry'), {
    ...payload,
    createdAt: serverTimestamp(),
  }).catch((error) => console.warn('[LiveMediaTelemetry] write failed', error));
}

export function recordLiveMediaConnected(
  context: ConnectionTelemetryContext,
  activationReason: LiveMediaActivationReason,
  mediaTransport: LiveClassSession['mediaTransport'],
) {
  const timestamp = Date.now();
  connectedAt.set(telemetryKey(context), timestamp);
  void writeTelemetry(context.classId, {
    event: 'connected',
    ...context,
    connectedAt: new Date(timestamp).toISOString(),
    activationReason,
    mediaTransport: mediaTransport ?? 'none',
  });
}

export function recordLiveMediaDisconnected(
  context: ConnectionTelemetryContext,
  disconnectReason: string,
  mediaTransport: LiveClassSession['mediaTransport'],
) {
  const key = telemetryKey(context);
  const startedAt = connectedAt.get(key);
  const timestamp = Date.now();
  connectedAt.delete(key);
  void writeTelemetry(context.classId, {
    event: 'disconnected',
    ...context,
    connectedAt: startedAt ? new Date(startedAt).toISOString() : null,
    disconnectedAt: new Date(timestamp).toISOString(),
    disconnectReason,
    mediaTransport: mediaTransport ?? 'none',
    approximateDurationMs: startedAt ? Math.max(0, timestamp - startedAt) : null,
  });
}
