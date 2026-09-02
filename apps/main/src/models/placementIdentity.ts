import type { TargetLanguage } from './languageContext.ts';

export const ENGLISH_PLACEMENT_BANK = Object.freeze({
  bankId: 'english-listening-v1', languageCode: 'en', courseId: 'english',
} as const);

export function getPlacementBank(language: unknown) {
  return language === 'en' ? ENGLISH_PLACEMENT_BANK : null;
}

/** Guard used before persistence as well as before exposing a test. */
export function requirePlacementIdentity(language: TargetLanguage) {
  const bank = getPlacementBank(language);
  if (!bank) throw new Error('Placement is not available for this target language.');
  return bank;
}
