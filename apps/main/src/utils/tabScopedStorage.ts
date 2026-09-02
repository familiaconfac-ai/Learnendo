// Legacy selection key stores the TARGET language; it is not a user/base preference.
export const USER_LANGUAGE_STORAGE_KEY = 'learnendo_user_language';
// Legacy local support/UI preference, bootstrapped once and never changed by course selection.
export const BASE_UI_LANGUAGE_STORAGE_KEY = 'learnendo_base_ui_lang';
export const TAB_APP_CONTEXT_STORAGE_KEY = 'learnendo_tab_app_context_v1';

export type TabAppContext = {
  courseId?: string | null;
  workbookId?: number | null;
  lessonId?: string | null;
  section?: string | null;
};

function readStorageItem(storage: Storage | undefined, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageItem(storage: Storage | undefined, key: string, value: string): void {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Best-effort storage only.
  }
}

export function getSessionStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return readStorageItem(window.sessionStorage, key);
}

export function getScopedStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return readStorageItem(window.sessionStorage, key) ?? readStorageItem(window.localStorage, key);
}

export function setScopedStorageItem(key: string, value: string, persistLocal = false): void {
  if (typeof window === 'undefined') return;
  writeStorageItem(window.sessionStorage, key, value);
  if (persistLocal) {
    writeStorageItem(window.localStorage, key, value);
  }
}

export function loadTabAppContext(): TabAppContext {
  const raw = getSessionStorageItem(TAB_APP_CONTEXT_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as TabAppContext;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveTabAppContext(context: TabAppContext): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(TAB_APP_CONTEXT_STORAGE_KEY, JSON.stringify(context));
  } catch {
    // Best-effort storage only.
  }
}
