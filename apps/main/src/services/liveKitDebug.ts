type LiveKitDebugCounters = Record<string, number>;

interface LiveKitDebugStore {
  counters: LiveKitDebugCounters;
}

declare global {
  var __learnendoLiveKitDebug: LiveKitDebugStore | undefined;
}

function getStore(): LiveKitDebugStore {
  if (!globalThis.__learnendoLiveKitDebug) {
    globalThis.__learnendoLiveKitDebug = {
      counters: {},
    };
  }
  return globalThis.__learnendoLiveKitDebug;
}

export function nextLiveKitDebugCounter(name: string) {
  const store = getStore();
  const nextValue = (store.counters[name] ?? 0) + 1;
  store.counters[name] = nextValue;
  return nextValue;
}

export function getLiveKitDebugCounter(name: string) {
  return getStore().counters[name] ?? 0;
}

export function logLiveKitDebug(message: string, payload?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  if (payload && Object.keys(payload).length > 0) {
    console.info(`[LiveKitDebug] ${message}`, { timestamp, ...payload });
    return;
  }
  console.info(`[LiveKitDebug] ${message}`, { timestamp });
}
