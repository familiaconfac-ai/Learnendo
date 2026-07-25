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

export function canonicalGrammarFocusLessonId(lessonId: string): string {
  return lessonId
    .trim()
    .replace(/^(?:en|pt|es|el|he)_/i, '')
    .replace(/[^A-Za-z0-9_-]/g, '_');
}

export function grammarFocusDocumentId(workbookId: number, lessonId: string): string {
  const normalizedLessonId = canonicalGrammarFocusLessonId(lessonId);
  const workbookPrefix = `wb${workbookId}_`;
  return normalizedLessonId.toLowerCase().startsWith(workbookPrefix)
    ? normalizedLessonId
    : `${workbookPrefix}${normalizedLessonId}`;
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
      body: typeof locale.body === 'string'
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
  const localizedSource = documentValue.content && typeof documentValue.content === 'object'
    ? documentValue.content
    : documentValue.translations;
  const normalized = normalizeGrammarFocusContent(localizedSource);

  if (!normalized.en.title && typeof documentValue.title === 'string') {
    normalized.en.title = documentValue.title;
  }
  if (!normalized.en.body) {
    if (typeof documentValue.body === 'string') normalized.en.body = documentValue.body;
    else if (typeof documentValue.content === 'string') normalized.en.body = documentValue.content;
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
