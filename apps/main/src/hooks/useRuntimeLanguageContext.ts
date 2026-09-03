import { useEffect } from 'react';
import { resolveRuntimeLanguageContext } from '../models/languageContext';
import type { UserAccountProfile } from '../services/userRoles';
import { cacheUserBaseLanguage, personalLanguageStorage, readUserBaseLanguage } from '../utils/userLanguageStorage';
import { BASE_UI_LANGUAGE_STORAGE_KEY, getScopedStorageItem } from '../utils/tabScopedStorage';

export function useRuntimeLanguageContext(uid: string | null, profile: UserAccountProfile | null, courseId: string) {
  const currentProfile = profile?.uid === uid ? profile : null;
  let legacyCandidate: string | null = null;
  try { legacyCandidate = getScopedStorageItem(BASE_UI_LANGUAGE_STORAGE_KEY); } catch { /* optional suggestion */ }
  const context = resolveRuntimeLanguageContext({ uid, profile: currentProfile, courseId,
    cachedBaseLanguage: readUserBaseLanguage(personalLanguageStorage(), uid), legacyBaseLanguage: legacyCandidate });
  // Cache only confirmed profile data. Runtime never retains the previous UID's base in state.
  useEffect(() => {
    if (uid && currentProfile?.baseLanguage) cacheUserBaseLanguage(personalLanguageStorage(), uid, currentProfile.baseLanguage);
  }, [uid, currentProfile?.baseLanguage]);
  return context;
}
