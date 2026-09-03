import { isBaseLanguage, isTargetLanguage, type BaseLanguage, type TargetLanguage } from './languageContext.ts';

export interface UserLanguagePreferences {
  baseLanguage?: BaseLanguage;
  learningLanguages?: TargetLanguage[];
  languagePreferencesVersion?: 1;
  languagePreferencesUpdatedAt?: unknown;
  languagePreferencesUpdatedBy?: string;
}

export function validLearningLanguages(value: unknown): value is TargetLanguage[] {
  return Array.isArray(value) && value.length <= 5 && value.every(isTargetLanguage)
    && new Set(value).size === value.length;
}

/** Missing/invalid fields remain missing. Reading a legacy profile never manufactures preferences. */
export function mapUserLanguagePreferences(data: Record<string, unknown> = {}): UserLanguagePreferences {
  return {
    ...(isBaseLanguage(data.baseLanguage) ? { baseLanguage: data.baseLanguage } : {}),
    ...(validLearningLanguages(data.learningLanguages) ? { learningLanguages: [...data.learningLanguages] } : {}),
    ...(data.languagePreferencesVersion === 1 ? { languagePreferencesVersion: 1 as const } : {}),
    ...(data.languagePreferencesUpdatedAt !== undefined ? { languagePreferencesUpdatedAt: data.languagePreferencesUpdatedAt } : {}),
    ...(typeof data.languagePreferencesUpdatedBy === 'string' ? { languagePreferencesUpdatedBy: data.languagePreferencesUpdatedBy } : {}),
  };
}

export function validateUserLanguagePreferences(input: Pick<UserLanguagePreferences, 'baseLanguage' | 'learningLanguages'>): void {
  if (!isBaseLanguage(input.baseLanguage)) throw new Error('Choose English, Português or Español for explanations.');
  if (input.learningLanguages !== undefined && !validLearningLanguages(input.learningLanguages)) {
    throw new Error('Study languages must be unique and belong to en, pt, es, el or he.');
  }
}
