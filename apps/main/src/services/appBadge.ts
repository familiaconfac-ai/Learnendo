export interface AppBadgeTarget {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
}

export interface AppBadgeStateStore {
  read: () => Promise<number | null>;
  write: (count: number) => Promise<void>;
}

const BADGE_STATE_CACHE = 'learnendo-app-badge-state-v1';
const BADGE_STATE_PATH = '/__learnendo_app_badge_state__';

export function normalizePedagogicalBadgeCount(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function defaultBadgeTarget(): AppBadgeTarget | null {
  if (typeof navigator === 'undefined') return null;
  return navigator as unknown as Navigator & AppBadgeTarget;
}

function defaultBadgeStateStore(): AppBadgeStateStore | null {
  if (typeof caches === 'undefined' || typeof location === 'undefined') return null;
  const request = new Request(new URL(BADGE_STATE_PATH, location.origin));
  return {
    async read() {
      const cache = await caches.open(BADGE_STATE_CACHE);
      const response = await cache.match(request);
      return response ? normalizePedagogicalBadgeCount(await response.text()) : null;
    },
    async write(count) {
      const cache = await caches.open(BADGE_STATE_CACHE);
      await cache.put(request, new Response(String(count), {
        headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' },
      }));
    },
  };
}

/** Applies the authoritative inactivity-day count without changing notification history. */
export async function applyPedagogicalAppBadge(
  value: unknown,
  target: AppBadgeTarget | null = defaultBadgeTarget(),
  store: AppBadgeStateStore | null = defaultBadgeStateStore(),
): Promise<boolean> {
  const count = normalizePedagogicalBadgeCount(value);
  await store?.write(count).catch(() => undefined);
  if (!target) return false;
  try {
    if (count === 0 && typeof target.clearAppBadge === 'function') {
      await target.clearAppBadge();
      return true;
    }
    if (count > 0 && typeof target.setAppBadge === 'function') {
      await target.setAppBadge(count);
      return true;
    }
  } catch (error) {
    console.warn('[Notifications] App badge update failed:', error);
  }
  return false;
}

/** ADMIN_TEST preserves the last value applied on this device. */
export async function applyNotificationAppBadge(
  type: unknown,
  payloadValue: unknown,
  target: AppBadgeTarget | null = defaultBadgeTarget(),
  store: AppBadgeStateStore | null = defaultBadgeStateStore(),
) {
  const stored = type === 'ADMIN_TEST' ? await store?.read().catch(() => null) : null;
  const count = stored ?? normalizePedagogicalBadgeCount(payloadValue);
  await applyPedagogicalAppBadge(count, target, store);
  return count;
}

/** Reasserts device state after a notification is dismissed/clicked. */
export async function preservePedagogicalAppBadge(
  fallbackValue: unknown,
  target: AppBadgeTarget | null = defaultBadgeTarget(),
  store: AppBadgeStateStore | null = defaultBadgeStateStore(),
) {
  const stored = await store?.read().catch(() => null);
  return applyPedagogicalAppBadge(stored ?? fallbackValue, target, store);
}

export function clearPedagogicalAppBadge(target?: AppBadgeTarget | null, store?: AppBadgeStateStore | null) {
  return applyPedagogicalAppBadge(
    0,
    target === undefined ? defaultBadgeTarget() : target,
    store === undefined ? defaultBadgeStateStore() : store,
  );
}
