import type { User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getId, getInstallations } from 'firebase/installations';
import { getMessaging, getToken, isSupported, onMessage, type Unsubscribe } from 'firebase/messaging';
import { app, db } from './firebase';
import { notificationDeviceIdFromFid } from './notificationDeviceIdentity';
import { disableNotificationDevice, registerNotificationDevice, signOutNotificationDevice } from './notificationDeviceApi';

export type NotificationPermissionState =
  | 'not-requested'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'error';

export interface NotificationPreference {
  enabled: boolean;
  permission: NotificationPermissionState;
}

const DEFAULT_PREFERENCE: NotificationPreference = { enabled: false, permission: 'not-requested' };

function getVapidKey() {
  return (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined)?.trim() ?? '';
}

function permissionState(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'not-requested';
}

function platformLabel() {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios-web';
  if (/android/.test(userAgent)) return 'android-web';
  return 'desktop-web';
}

async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) throw new Error('Service workers are not supported by this browser.');
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

async function obtainAndSaveDevice(user: User) {
  const vapidKey = getVapidKey();
  if (!vapidKey) throw new Error('As notificações ainda não foram configuradas pelo Learnendo. Tente novamente mais tarde.');
  const registration = await getServiceWorkerRegistration();
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error('Firebase did not return a registration token for this device.');
  const fid = await getId(getInstallations(app));
  const deviceId = await notificationDeviceIdFromFid(fid);
  await registerNotificationDevice(user, { deviceId, token, platform: platformLabel() });
}

export async function readNotificationPreference(user: User): Promise<NotificationPreference> {
  if (!await isSupported()) return { enabled: false, permission: 'unsupported' };
  const snapshot = await getDoc(doc(db, 'users', user.uid, 'notificationSettings', 'preferences'));
  const stored = snapshot.data();
  const permission = permissionState();
  return {
    enabled: stored?.enabled === true && permission === 'granted',
    permission: permission === 'not-requested' && stored?.permission === 'error' ? 'error' : permission,
  };
}

export async function enableNotifications(user: User): Promise<NotificationPreference> {
  if (!await isSupported()) return { enabled: false, permission: 'unsupported' };
  let permission = permissionState();
  if (permission === 'not-requested') {
    const requested = await Notification.requestPermission();
    permission = requested === 'default' ? 'not-requested' : requested;
  }
  const enabled = permission === 'granted';
  const reference = doc(db, 'users', user.uid, 'notificationSettings', 'preferences');
  try {
    if (enabled) await obtainAndSaveDevice(user);
    await setDoc(reference, { enabled, permission, updatedAt: serverTimestamp() }, { merge: true });
    return { enabled, permission };
  } catch (error) {
    await setDoc(reference, { enabled: false, permission: 'error', updatedAt: serverTimestamp() }, { merge: true });
    throw error;
  }
}

export async function disableNotifications(user: User): Promise<NotificationPreference> {
  await setDoc(doc(db, 'users', user.uid, 'notificationSettings', 'preferences'), {
    enabled: false,
    permission: permissionState(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  if (await isSupported()) {
    const fid = await getId(getInstallations(app));
    const deviceId = await notificationDeviceIdFromFid(fid);
    await disableNotificationDevice(user, deviceId).catch(() => undefined);
  }
  return { enabled: false, permission: permissionState() };
}

export async function markNotificationDeviceSignedOut(user: User) {
  if (!await isSupported()) return;
  const preference = await readNotificationPreference(user);
  if (!preference.enabled) return;
  const fid = await getId(getInstallations(app));
  const deviceId = await notificationDeviceIdFromFid(fid);
  await signOutNotificationDevice(user, deviceId);
}

export async function refreshGrantedNotificationDevice(user: User) {
  if (!await isSupported() || Notification.permission !== 'granted') return;
  const preference = await readNotificationPreference(user);
  if (preference.enabled) await obtainAndSaveDevice(user);
}

function safeForegroundPath(raw: unknown) {
  if (typeof raw !== 'string') return '/';
  try {
    const target = new URL(raw, window.location.origin);
    return target.origin === window.location.origin ? `${target.pathname}${target.search}${target.hash}` : '/';
  } catch {
    return '/';
  }
}

export async function listenForForegroundNotifications(): Promise<Unsubscribe | null> {
  if (!await isSupported()) return null;
  return onMessage(getMessaging(app), (payload) => {
    if (Notification.permission !== 'granted') return;
    const notification = new Notification(payload.data?.title?.trim() || 'Learnendo', {
      body: payload.data?.body?.trim() || 'You have a new notification.',
      icon: '/pwa-192x192.png',
      tag: payload.data?.eventId || payload.messageId,
    });
    notification.onclick = () => {
      window.focus();
      window.location.assign(safeForegroundPath(payload.data?.url));
      notification.close();
    };
  });
}

export { DEFAULT_PREFERENCE };
