import {
  canonicalGrammarFocusLessonId, legacyGrammarFocusDocumentId,
  GRAMMAR_FOCUS_LANGUAGES, normalizeGrammarFocusDocumentContent,
  normalizeGrammarFocusLanguage, type GrammarFocusContent, type GrammarFocusLanguage,
} from './grammarFocus.ts';
import { getCourseTargetLanguage } from './languageContext.ts';

export interface LegacyGrammarFocus {
  documentId: string;
  sourceData: Record<string, unknown>;
  content: GrammarFocusContent;
  assignment: { courseId: string; destinationId: string } | null;
}

/** Both persisted key algorithms: 392a105 kept prefixes; 216dae6 stripped them. */
export function legacyGrammarFocusDocumentIds(workbookId: number, lessonId: string): string[] {
  const canonical = canonicalGrammarFocusLessonId(lessonId);
  const historicalId = (id: string) => {
    const normalized = id.trim().replace(/[^A-Za-z0-9_-]/g, '_');
    return normalized.toLowerCase().startsWith(`wb${workbookId}_`) ? normalized : `wb${workbookId}_${normalized}`;
  };
  return [...new Set([
    legacyGrammarFocusDocumentId(workbookId, lessonId), historicalId(lessonId),
    ...['en', 'es', 'pt', 'el', 'he'].map(prefix => historicalId(`${prefix}_${canonical}`)),
  ])];
}

export function availableGrammarFocusLanguages(content?: GrammarFocusContent | null): GrammarFocusLanguage[] {
  return GRAMMAR_FOCUS_LANGUAGES.filter(language => content?.[language].title.trim() || content?.[language].body.trim());
}

/** The selected locale is always shown by the caller; never infer curriculum from it. */
export function visibleGrammarFocusLanguage(content: GrammarFocusContent | null | undefined, preferred: string): GrammarFocusLanguage {
  const languages = availableGrammarFocusLanguages(content);
  const requested = normalizeGrammarFocusLanguage(preferred);
  return languages.includes(requested) ? requested : languages[0] ?? requested;
}

/** Stable across Firestore map key order; includes metadata, not just displayed text. */
export function legacyGrammarFocusRevision(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(legacyGrammarFocusRevision).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => JSON.stringify(key) + ':' + legacyGrammarFocusRevision(entry)).join(',') + '}';
  }
  return JSON.stringify(value) ?? 'null';
}

export function readLegacyGrammarFocus(documentId: string, sourceData: Record<string, unknown>): LegacyGrammarFocus {
  return { documentId, sourceData, content: normalizeGrammarFocusDocumentContent(sourceData), assignment: null };
}

export function legacyGrammarFocusAssignmentError(source: LegacyGrammarFocus, courseId: string, workbookId: number, lessonId: string): string | null {
  const data = source.sourceData;
  if (source.assignment) return 'Legacy document already assigned. Open its recorded destination.';
  if (source.documentId.includes('__') || data.schemaVersion === 2) return 'This is not an unassigned legacy document.';
  if (!legacyGrammarFocusDocumentIds(workbookId, lessonId).includes(source.documentId)) return 'Legacy lesson identity mismatch.';
  if (data.workbookId !== undefined && data.workbookId !== workbookId) return 'Legacy workbook metadata conflicts with this destination.';
  if (data.lessonId !== undefined && (typeof data.lessonId !== 'string'
    || canonicalGrammarFocusLessonId(data.lessonId) !== canonicalGrammarFocusLessonId(lessonId))) return 'Legacy lesson metadata conflicts with this destination.';
  // Explicit provenance is binding. An unprefixed key or content locale is NOT provenance.
  if (data.courseId !== undefined && data.courseId !== courseId) return 'Legacy course metadata conflicts with this destination.';
  if (data.targetLanguage !== undefined && data.targetLanguage !== getCourseTargetLanguage(courseId)) return 'Legacy target language conflicts with this destination.';
  const prefix = source.documentId.match(/^wb\d+_(en|es|pt|el|he)_/)?.[1];
  if (prefix && prefix !== getCourseTargetLanguage(courseId)) return 'Historical lesson prefix conflicts with this destination.';
  const lessonPrefix = typeof data.lessonId === 'string' ? data.lessonId.match(/^(en|es|pt|el|he)_/)?.[1] : null;
  if (lessonPrefix && lessonPrefix !== getCourseTargetLanguage(courseId)) return 'Legacy lesson metadata conflicts with this destination.';
  return null;
}
