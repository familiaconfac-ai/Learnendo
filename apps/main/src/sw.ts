/// <reference lib="webworker" />

import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { firebaseConfig } from './services/firebaseConfig';

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
  await self.registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.data?.eventId || payload.messageId,
    data: { url: safeInternalUrl(payload.data?.url) },
  });
});

export {};
