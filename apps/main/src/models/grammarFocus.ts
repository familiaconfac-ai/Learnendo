import { BASE_LANGUAGES, getCourseTargetLanguage, type TargetLanguage } from './languageContext.ts';
export const GRAMMAR_FOCUS_LANGUAGES = BASE_LANGUAGES;
export type GrammarFocusLanguage = (typeof GRAMMAR_FOCUS_LANGUAGES)[number];

export const GRAMMAR_FOCUS_MAX_TITLE_LENGTH = 160;
export const GRAMMAR_FOCUS_MAX_BODY_LENGTH = 50_000;

export interface GrammarFocusLocaleContent {
  title: string;
  body: string;
}

export type GrammarFocusContent = Record<GrammarFocusLanguage, GrammarFocusLocaleContent>;

export interface GrammarFocusDocument {
  courseId: string;
  targetLanguage: TargetLanguage;
  workbookId: number;
  lessonId: string;
  content: GrammarFocusContent;
  schemaVersion: 2;
  updatedAt?: unknown;
  updatedBy: string;
  legacySourceId?: string;
}

export const emptyGrammarFocusContent = (): GrammarFocusContent => ({
  en: { title: '', body: '' },
  pt: { title: '', body: '' },
  es: { title: '', body: '' },
});

export function canonicalGrammarFocusLessonId(lessonId: string): string {
  return lessonId
    .trim()
    .replace(/^(?:en|pt|es|el|he)_/i, '')
    .replace(/[^A-Za-z0-9_-]/g, '_');
}

/** Only for locating unassigned legacy notes; never a curricular write destination. */
export function legacyGrammarFocusDocumentId(workbookId: number, lessonId: string): string {
  const normalizedLessonId = canonicalGrammarFocusLessonId(lessonId);
  const workbookPrefix = `wb${workbookId}_`;
  return normalizedLessonId.toLowerCase().startsWith(workbookPrefix)
    ? normalizedLessonId
    : `${workbookPrefix}${normalizedLessonId}`;
}

/** English/Português/Español ("english", "portuguese_foreigners", "portuguese_native", "spanish")
 * are localized tracks of the same workbook curriculum: the same lesson identity, translated.
 * Grammar Focus already stores every translation on one document (content.en/pt/es), so all of
 * these courses must resolve to the same canonical document — only the active course changes
 * which locale opens first. Greek/Hebrew are unrelated curricula and keep their own family. */
const GRAMMAR_FOCUS_FAMILY_COURSE: Readonly<Record<string, string>> = Object.freeze({
  english: 'english',
  portuguese_foreigners: 'english',
  portuguese_native: 'english',
  spanish: 'english',
});

export function grammarFocusFamilyCourseId(courseId: string): string {
  return GRAMMAR_FOCUS_FAMILY_COURSE[courseId] ?? courseId;
}

export function grammarFocusDocumentId(courseId: string, workbookId: number, lessonId: string): string {
  if (!getCourseTargetLanguage(courseId)) throw new Error('Unknown grammar course.');
  if (!Number.isInteger(workbookId) || workbookId < 1 || workbookId > 100) throw new Error('Invalid workbook.');
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(lessonId)) throw new Error('Invalid lesson.');
  return grammarFocusFamilyCourseId(courseId) + '__' + legacyGrammarFocusDocumentId(workbookId, lessonId);
}

export function matchesGrammarFocusIdentity(value: Record<string, unknown>, courseId: string, workbookId: number, lessonId: string): boolean {
  const familyCourseId = grammarFocusFamilyCourseId(courseId);
  return value.schemaVersion === 2 && value.courseId === familyCourseId
    && value.targetLanguage === getCourseTargetLanguage(familyCourseId)
    && value.workbookId === workbookId && value.lessonId === canonicalGrammarFocusLessonId(lessonId);
}

export function normalizeGrammarFocusLanguage(language?: string): GrammarFocusLanguage {
  const normalized = String(language ?? '').trim().toLowerCase();
  if (normalized.startsWith('pt')) return 'pt';
  if (normalized.startsWith('es')) return 'es';
  return 'en';
}

export function hasGrammarFocusContent(content: GrammarFocusContent | null | undefined): boolean {
  if (!content) return false;
  return GRAMMAR_FOCUS_LANGUAGES.some((language) => {
    const locale = content[language];
    return Boolean(locale?.title.trim() || locale?.body.trim());
  });
}

export function getLocalizedGrammarFocusContent(
  content: GrammarFocusContent | null | undefined,
  language?: string,
): GrammarFocusLocaleContent {
  return content?.[normalizeGrammarFocusLanguage(language)] ?? { title: '', body: '' };
}

export function normalizeGrammarFocusContent(value: unknown): GrammarFocusContent {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const normalized = emptyGrammarFocusContent();
  for (const language of GRAMMAR_FOCUS_LANGUAGES) {
    const locale = source[language] && typeof source[language] === 'object'
      ? source[language] as Record<string, unknown>
      : {};
    normalized[language] = {
      title: typeof locale.title === 'string' ? locale.title : '',
      body: typeof source[language] === 'string' ? source[language] as string : typeof locale.body === 'string'
        ? locale.body
        : typeof locale.content === 'string'
          ? locale.content
          : '',
    };
  }
  return normalized;
}

export function normalizeGrammarFocusDocumentContent(value: unknown): GrammarFocusContent {
  const documentValue = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
  const normalized = mergeGrammarFocusContent(
    normalizeGrammarFocusContent(documentValue.translations),
    normalizeGrammarFocusContent(documentValue.content),
  );
  // Top-level fields historically defaulted to English. Respect an explicit locale when present.
  const language = normalizeGrammarFocusLanguage(typeof documentValue.locale === 'string'
    ? documentValue.locale : typeof documentValue.language === 'string' ? documentValue.language : 'en');

  if (!normalized[language].title && typeof documentValue.title === 'string') {
    normalized[language].title = documentValue.title;
  }
  if (!normalized[language].body) {
    if (typeof documentValue.body === 'string') normalized[language].body = documentValue.body;
    else if (typeof documentValue.content === 'string') normalized[language].body = documentValue.content;
  }
  return normalized;
}

export function mergeGrammarFocusContent(
  existing: GrammarFocusContent,
  incoming: GrammarFocusContent,
): GrammarFocusContent {
  const merged = emptyGrammarFocusContent();
  for (const language of GRAMMAR_FOCUS_LANGUAGES) {
    merged[language] = {
      title: incoming[language].title.trim() ? incoming[language].title : existing[language].title,
      body: incoming[language].body.trim() ? incoming[language].body : existing[language].body,
    };
  }
  return merged;
}

export function validateGrammarFocusContent(content: GrammarFocusContent): string | null {
  for (const language of GRAMMAR_FOCUS_LANGUAGES) {
    const locale = content[language];
    if (locale.title.length > GRAMMAR_FOCUS_MAX_TITLE_LENGTH) {
      return `${language}: title exceeds ${GRAMMAR_FOCUS_MAX_TITLE_LENGTH} characters.`;
    }
    if (locale.body.length > GRAMMAR_FOCUS_MAX_BODY_LENGTH) {
      return `${language}: content exceeds ${GRAMMAR_FOCUS_MAX_BODY_LENGTH} characters.`;
    }
    if (/[<>]/.test(locale.title) || /<\/?[A-Za-z][^>]*>/.test(locale.body)) {
      return `${language}: HTML is not allowed. Use Markdown formatting instead.`;
    }
  }
  return null;
}
