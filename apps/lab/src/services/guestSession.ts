const GUEST_KEY = 'lab_guest_name';
const GUEST_ID_KEY = 'lab_guest_id';

// ─── Guest ID ─────────────────────────────────────────────────────────────────

/**
 * Returns a stable anonymous identifier for this device.
 * Generated once and persisted in localStorage.
 * Safe to pass to future analytics / auth APIs without exposing PII.
 */
export function getGuestId(): string {
  const existing = localStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;
  // Simple unique enough ID: timestamp base-36 + random suffix
  const id = `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(GUEST_ID_KEY, id);
  return id;
}

// ─── Guest name ───────────────────────────────────────────────────────────────

export function getGuestName(): string | null {
  return localStorage.getItem(GUEST_KEY) || null;
}

export function setGuestName(name: string): void {
  const trimmed = name.trim();
  if (trimmed) {
    localStorage.setItem(GUEST_KEY, trimmed);
  }
}

export function clearGuestName(): void {
  localStorage.removeItem(GUEST_KEY);
}

/** True once the user has explicitly set or skipped naming themselves */
const PROMPTED_KEY = 'lab_guest_prompted';

export function wasGuestPrompted(): boolean {
  return localStorage.getItem(PROMPTED_KEY) === '1';
}

export function markGuestPrompted(): void {
  localStorage.setItem(PROMPTED_KEY, '1');
}
