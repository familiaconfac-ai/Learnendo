export type AppMode = 'public' | 'lab';

const MODE_KEY = 'lab_app_mode';

/**
 * Reads the current app mode, with URL param taking priority.
 *
 * URL rules:
 *   ?lab or ?mode=lab  → activate lab mode (stored + URL cleaned)
 *   ?mode=public       → force public mode (stored + URL cleaned)
 */
export function getAppMode(): AppMode {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    let changed = false;

    if (params.has('lab') || params.get('mode') === 'lab') {
      localStorage.setItem(MODE_KEY, 'lab');
      params.delete('lab');
      params.delete('mode');
      changed = true;
    } else if (params.get('mode') === 'public') {
      localStorage.setItem(MODE_KEY, 'public');
      params.delete('mode');
      changed = true;
    }

    if (changed) {
      const url = new URL(window.location.href);
      url.search = params.toString();
      window.history.replaceState({}, '', url.toString());
    }
  }

  return (localStorage.getItem(MODE_KEY) as AppMode | null) ?? 'public';
}

export function setAppMode(mode: AppMode): void {
  localStorage.setItem(MODE_KEY, mode);
}

export function isLabMode(): boolean {
  return getAppMode() === 'lab';
}

export function isPublicMode(): boolean {
  return getAppMode() === 'public';
}
