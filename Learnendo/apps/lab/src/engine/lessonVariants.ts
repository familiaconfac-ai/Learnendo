/**
 * Generates derived (stub) lesson variants from a base LessonPack.
 *
 * When a PDF is imported in English, we auto-create PT and ES stubs
 * so teachers can fill in translations rather than starting from scratch.
 * No translation API is called — stubs use a per-language placeholder string.
 */
import type { LessonPack, LanguageCode, LessonVariant, MultiVariantLesson } from '../types';

/** Stub text shown in the translation field of auto-generated variants */
const STUB: Record<LanguageCode, string> = {
  en: '[TO TRANSLATE]',
  pt: '[A TRADUZIR]',
  es: '[A TRADUCIR]',
  el: '[ΠΡΟΣ ΜΕΤΑΦΡΑΣΗ]',
  he: '[לתרגום]',
};

/**
 * Create a single derived variant: vocabulary words are preserved,
 * translations become placeholder strings. Items are left empty
 * (the teacher fills them in; status is 'auto_generated').
 */
export function createStubVariant(source: LessonPack, targetLang: LanguageCode): LessonVariant {
  const stub = STUB[targetLang] ?? '[TO TRANSLATE]';
  const stubPack: LessonPack = {
    ...source,
    id: `${source.id}-${targetLang}`,
    language: targetLang,
    title: `${source.title} (${targetLang.toUpperCase()})`,
    description: `Auto-generated draft — derived from "${source.title}"`,
    items: [],
    vocabulary: source.vocabulary?.map((v) => ({ ...v, translation: stub })),
    structures: source.structures,
  };
  return {
    id: `var-${source.id}-${targetLang}`,
    language: targetLang,
    status: 'auto_generated',
    pack: stubPack,
    origin: 'pdf_import',
  };
}

/**
 * Build a MultiVariantLesson from a saved base pack.
 * If sourceLanguage is 'en', PT and ES stubs are auto-created.
 */
export function buildMultiVariantLesson(basePack: LessonPack): MultiVariantLesson {
  const baseVariant: LessonVariant = {
    id: `var-${basePack.id}-${basePack.language}`,
    language: basePack.language,
    status: 'draft',
    pack: basePack,
    origin: 'pdf_import',
  };

  const derived: LessonVariant[] =
    basePack.language === 'en'
      ? (['pt', 'es'] as LanguageCode[]).map((lang) => createStubVariant(basePack, lang))
      : [];

  return {
    id: `mvl-${basePack.id}`,
    baseLessonId: basePack.id,
    sourceLanguage: basePack.language,
    createdAt: Date.now(),
    variants: [baseVariant, ...derived],
  };
}
