export const BASE_LANGUAGES = ['en', 'pt', 'es'] as const;
export const TARGET_LANGUAGES = ['en', 'pt', 'es', 'el', 'he'] as const;
export type BaseLanguage = typeof BASE_LANGUAGES[number];
export type InstructionLanguage = BaseLanguage;
export type UiLanguage = BaseLanguage;
export type TargetLanguage = typeof TARGET_LANGUAGES[number];

/** Curriculum identity, never the user's base language or interface preference. */
export const COURSE_TARGET_LANGUAGE = Object.freeze({
  english: 'en', portuguese_foreigners: 'pt', portuguese_native: 'pt',
  spanish: 'es', greek_koine: 'el', hebrew_biblical: 'he',
} satisfies Record<string, TargetLanguage>);
export type LanguageCourseId = keyof typeof COURSE_TARGET_LANGUAGE;

export const PRIMARY_COURSE_FOR_TARGET: Readonly<Record<TargetLanguage, LanguageCourseId>> = Object.freeze({
  en: 'english', pt: 'portuguese_foreigners', es: 'spanish', el: 'greek_koine', he: 'hebrew_biblical',
});

export function isBaseLanguage(value: unknown): value is BaseLanguage {
  return BASE_LANGUAGES.some((language) => language === value);
}
export function isTargetLanguage(value: unknown): value is TargetLanguage {
  return TARGET_LANGUAGES.some((language) => language === value);
}
export function getCourseTargetLanguage(courseId: unknown): TargetLanguage | null {
  return typeof courseId === 'string' && Object.hasOwn(COURSE_TARGET_LANGUAGE, courseId)
    ? COURSE_TARGET_LANGUAGE[courseId as LanguageCourseId] : null;
}

export interface LanguageContext {
  targetLanguage: TargetLanguage;
  baseLanguage: BaseLanguage;
  instructionLanguage: InstructionLanguage;
  uiLanguage: UiLanguage;
}

/** No TTS locale here: each spoken text keeps its own language and provenance. */
export function createLanguageContext(input: {
  targetLanguage: TargetLanguage;
  baseLanguage: BaseLanguage;
  instructionLanguage?: InstructionLanguage;
  uiLanguage?: UiLanguage;
}): LanguageContext {
  if (!isTargetLanguage(input.targetLanguage) || !isBaseLanguage(input.baseLanguage)
    || (input.uiLanguage !== undefined && !isBaseLanguage(input.uiLanguage))
    || (input.instructionLanguage !== undefined && !isBaseLanguage(input.instructionLanguage))) {
    throw new Error('Invalid language context.');
  }
  return { ...input, instructionLanguage: input.instructionLanguage ?? input.baseLanguage,
    uiLanguage: input.uiLanguage ?? input.baseLanguage };
}

/** One-time compatibility bootstrap. Course changes must never call this again. */
export function resolveLegacyBaseLanguage(storedBase: unknown, storedSelection: unknown): BaseLanguage {
  return isBaseLanguage(storedBase) ? storedBase : isBaseLanguage(storedSelection) ? storedSelection : 'en';
}
