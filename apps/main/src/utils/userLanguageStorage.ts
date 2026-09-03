import { isBaseLanguage, type BaseLanguage } from '../models/languageContext.ts';

export const userBaseLanguageStorageKey = (uid: string) => `learnendo_base_language_${uid}`;

export function readUserBaseLanguage(storage: Pick<Storage, 'getItem'> | undefined, uid: string | null): BaseLanguage | null {
  if (!storage || !uid) return null;
  try {
    const value = storage.getItem(userBaseLanguageStorageKey(uid));
    return isBaseLanguage(value) ? value : null;
  } catch { return null; }
}

/** Only call for a confirmed preference, never a runtime fallback or legacy suggestion. */
export function cacheUserBaseLanguage(storage: Pick<Storage, 'setItem'> | undefined, uid: string, value: BaseLanguage): void {
  if (!storage || !uid || !isBaseLanguage(value)) return;
  try { storage.setItem(userBaseLanguageStorageKey(uid), value); } catch { /* optional offline cache */ }
}

export function personalLanguageStorage(): Storage | undefined {
  try { return typeof window === 'undefined' ? undefined : window.localStorage; } catch { return undefined; }
}
