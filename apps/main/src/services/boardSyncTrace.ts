// Opt-in, local-only diagnostics. Enable with ?boardSyncDebug=1.
export function boardSyncTraceEnabled() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('boardSyncDebug') === '1';
}
export function boardSyncTrace(phase: string, details: Record<string, unknown> = {}) {
  if (!boardSyncTraceEnabled()) return;
  const entry = { phase, atMs: Date.now(), at: new Date().toISOString(), ...details };
  console.info('[BOARD_SYNC_TRACE]', JSON.stringify(entry));
}
