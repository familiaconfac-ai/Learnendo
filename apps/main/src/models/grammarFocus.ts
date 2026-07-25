export const GRAMMAR_FOCUS_LANGUAGES = ['en', 'pt', 'es'] as const;
export type GrammarFocusLanguage = (typeof GRAMMAR_FOCUS_LANGUAGES)[number];

export const GRAMMAR_FOCUS_MAX_TITLE_LENGTH = 160;
export const GRAMMAR_FOCUS_MAX_BODY_LENGTH = 50_000;

export interface GrammarFocusLocaleContent {
  title: string;
  body: string;
}

export type GrammarFocusContent = Record<GrammarFocusLanguage, GrammarFocusLocaleContent>;

export interface GrammarFocusDocument {
  workbookId: number;
  lessonId: string;
  content: GrammarFocusContent;
  schemaVersion: 1;
  updatedAt?: unknown;
  updatedBy: string;
}

export const emptyGrammarFocusContent = (): GrammarFocusContent => ({
  en: { title: '', body: '' },
  pt: { title: '', body: '' },
  es: { title: '', body: '' },
});

export function grammarFocusDocumentId(workbookId: number, lessonId: string): string {
  const normalizedLessonId = lessonId.trim().replace(/[^A-Za-z0-9_-]/g, '_');
  const workbookPrefix = `wb${workbookId}_`;
  return normalizedLessonId.toLowerCase().startsWith(workbookPrefix)
    ? normalizedLessonId
    : `${workbookPrefix}${normalizedLessonId}`;
}

export function normalizeGrammarFocusLanguage(language: string): GrammarFocusLanguage {
  if (language === 'pt' || language === 'es') return language;
  return 'en';
}

export function hasGrammarFocusContent(content: GrammarFocusContent | null | undefined): boolean {
  if (!content) return false;
  return GRAMMAR_FOCUS_LANGUAGES.some((language) => {
    const locale = content[language];
    return Boolean(locale?.title.trim() || locale?.body.trim());
  });
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
      body: typeof locale.body === 'string' ? locale.body : '',
    };
  }
  return normalized;
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
