import type { User } from 'firebase/auth';

async function callDeviceEndpoint(user: User, payload: Record<string, unknown>) {
  const idToken = await user.getIdToken();
  const response = await fetch('/api/notification-devices', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
    body: JSON.stringify(payload),
  });
  const raw = await response.text();
  let result: { ok?: boolean; error?: string };
  try { result = JSON.parse(raw) as typeof result; }
  catch { throw new Error('The notification device endpoint returned an invalid response.'); }
  if (!response.ok || result.ok !== true) throw new Error(result.error || 'Unable to update this notification device.');
}

export function registerNotificationDevice(user: User, input: {
  deviceId: string;
  token: string;
  platform: string;
}) {
  return callDeviceEndpoint(user, { action: 'register', ...input });
}

export function signOutNotificationDevice(user: User, deviceId: string) {
  return callDeviceEndpoint(user, { action: 'signOut', deviceId });
}

export function disableNotificationDevice(user: User, deviceId: string) {
  return callDeviceEndpoint(user, { action: 'disable', deviceId });
}
