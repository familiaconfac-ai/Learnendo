/// <reference lib="webworker" />

import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { firebaseConfig } from './services/firebaseConfig';
import { applyNotificationAppBadge, normalizePedagogicalBadgeCount, preservePedagogicalAppBadge } from './services/appBadge';
import { closeSupersededAdminTestNotifications } from './services/persistentNotifications';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string }>;
};

const DEFAULT_PATH = '/';

function safeInternalUrl(raw: unknown) {
  try {
    const target = new URL(typeof raw === 'string' ? raw : DEFAULT_PATH, self.location.origin);
    return target.origin === self.location.origin ? target.href : new URL(DEFAULT_PATH, self.location.origin).href;
  } catch {
    return new URL(DEFAULT_PATH, self.location.origin).href;
  }
}

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = safeInternalUrl(event.notification.data?.url);
  event.waitUntil((async () => {
    await preservePedagogicalAppBadge(event.notification.data?.badgeCount);
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      const current = new URL(client.url);
      if (current.origin === self.location.origin) {
        await client.focus();
        if ('navigate' in client) await client.navigate(destination);
        return;
      }
    }
    await self.clients.openWindow(destination);
  })());
});

const messaging = getMessaging(initializeApp(firebaseConfig));
onBackgroundMessage(messaging, async (payload) => {
  const title = payload.data?.title?.trim() || 'Learnendo';
  const body = payload.data?.body?.trim() || 'You have a new notification.';
  const badgeCount = normalizePedagogicalBadgeCount(payload.data?.badgeCount);
  if (payload.data?.type === 'ADMIN_TEST') {
    await closeSupersededAdminTestNotifications(self.registration);
  }
  await self.registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.data?.notificationTag || payload.data?.eventId || payload.messageId,
    data: {
      url: safeInternalUrl(payload.data?.url),
      type: payload.data?.type,
      badgeCount,
    },
  });
  // Android launchers may first count the newly displayed notification. Apply
  // the pedagogical value afterwards so ADMIN_TEST cannot increment that count.
  await applyNotificationAppBadge(payload.data?.type, badgeCount);
});

export {};
