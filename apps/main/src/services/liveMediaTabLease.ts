const CHANNEL_NAME = 'learnendo-live-media-lease';
const LEASE_PREFIX = 'learnendo_live_media_lease:';
const LEASE_TTL_MS = 8_000;
const LEASE_HEARTBEAT_MS = 3_000;

interface LeaseRecord {
  classId: string;
  userId: string;
  tabId: string;
  expiresAt: number;
}

type LeaseMessage = { type: 'takeover'; classId: string; userId: string; tabId: string };

function leaseKey(classId: string, userId: string) {
  return `${LEASE_PREFIX}${classId}:${userId}`;
}

function readLease(classId: string, userId: string): LeaseRecord | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(leaseKey(classId, userId)) || 'null') as LeaseRecord | null;
    if (!parsed || parsed.expiresAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLease(record: LeaseRecord): boolean {
  try {
    localStorage.setItem(leaseKey(record.classId, record.userId), JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export interface LiveMediaTabLease {
  acquire: (takeover?: boolean) => boolean;
  isOwner: () => boolean;
  release: () => void;
  dispose: () => void;
}

export function createLiveMediaTabLease(
  classId: string,
  userId: string,
  tabId: string,
  onTakenOver: () => void,
): LiveMediaTabLease {
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
  let heartbeat: number | null = null;

  const isOwner = () => readLease(classId, userId)?.tabId === tabId;

  const refresh = () => {
    if (!isOwner()) {
      if (heartbeat !== null) window.clearInterval(heartbeat);
      heartbeat = null;
      return;
    }
    writeLease({ classId, userId, tabId, expiresAt: Date.now() + LEASE_TTL_MS });
  };

  const acquire = (takeover = false) => {
    const current = readLease(classId, userId);
    if (current && current.tabId !== tabId && !takeover) return false;
    if (!writeLease({ classId, userId, tabId, expiresAt: Date.now() + LEASE_TTL_MS })) return false;
    if (takeover) channel?.postMessage({ type: 'takeover', classId, userId, tabId } satisfies LeaseMessage);
    if (heartbeat === null) heartbeat = window.setInterval(refresh, LEASE_HEARTBEAT_MS);
    return true;
  };

  const release = () => {
    try {
      if (isOwner()) localStorage.removeItem(leaseKey(classId, userId));
    } catch {
      // Browser storage can be unavailable in privacy-restricted contexts.
    }
    if (heartbeat !== null) window.clearInterval(heartbeat);
    heartbeat = null;
  };

  const handleMessage = (event: MessageEvent<LeaseMessage>) => {
    const message = event.data;
    if (message?.type !== 'takeover' || message.classId !== classId || message.userId !== userId) return;
    if (message.tabId === tabId) return;
    if (heartbeat !== null) window.clearInterval(heartbeat);
    heartbeat = null;
    void onTakenOver();
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== leaseKey(classId, userId) || !event.newValue) return;
    try {
      const next = JSON.parse(event.newValue) as LeaseRecord;
      if (next.tabId === tabId) return;
      if (heartbeat !== null) window.clearInterval(heartbeat);
      heartbeat = null;
      void onTakenOver();
    } catch {
      // Ignore malformed storage events; the expiring lease remains authoritative.
    }
  };
  channel?.addEventListener('message', handleMessage);
  window.addEventListener('storage', handleStorage);

  return {
    acquire,
    isOwner,
    release,
    dispose: () => {
      release();
      channel?.removeEventListener('message', handleMessage);
      channel?.close();
      window.removeEventListener('storage', handleStorage);
    },
  };
}

export function confirmLiveMediaTakeover(): boolean {
  return window.confirm('Áudio/vídeo já está ativo em outra aba. Deseja usar nesta aba?');
}
