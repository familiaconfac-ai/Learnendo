import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getCourseTargetLanguage } from '../models/languageContext';
import {
  canonicalGrammarFocusLessonId,
  emptyGrammarFocusContent,
  grammarFocusDocumentId,
  legacyGrammarFocusDocumentId,
  matchesGrammarFocusIdentity,
  mergeGrammarFocusContent,
  normalizeGrammarFocusDocumentContent,
  validateGrammarFocusContent,
  type GrammarFocusContent,
  type GrammarFocusDocument,
} from '../models/grammarFocus';

export const GRAMMAR_FOCUS_COLLECTION = 'grammarFocus';

export function subscribeGrammarFocus(
  courseId: string,
  workbookId: number,
  lessonId: string,
  onValue: (value: GrammarFocusDocument | null) => void,
  onError: (error: Error) => void,
): () => void {
  const ref = doc(db, GRAMMAR_FOCUS_COLLECTION, grammarFocusDocumentId(courseId, workbookId, lessonId));
  return onSnapshot(ref, { includeMetadataChanges: true }, (snapshot) => {
    // A cached miss is not evidence that curriculum content is absent on the server.
    if (!snapshot.exists() && snapshot.metadata.fromCache) return;
    if (!snapshot.exists()) {
      onValue(null);
      return;
    }
    const value = snapshot.data();
    if (!matchesGrammarFocusIdentity(value, courseId, workbookId, lessonId)) {
      onError(new Error('Grammar Focus curriculum identity mismatch.'));
      return;
    }
    onValue({
      courseId,
      targetLanguage: getCourseTargetLanguage(courseId)!,
      workbookId: Number(value.workbookId),
      lessonId: String(value.lessonId ?? lessonId),
      content: normalizeGrammarFocusDocumentContent(value),
      schemaVersion: 2,
      updatedAt: value.updatedAt,
      updatedBy: String(value.updatedBy ?? ''),
    });
  }, (error) => onError(error));
}

/** Preserved historical content, explicitly NOT assigned to any curriculum. */
export function subscribeLegacyGrammarFocus(
  workbookId: number, lessonId: string,
  onValue: (content: GrammarFocusContent | null) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(doc(db, GRAMMAR_FOCUS_COLLECTION, legacyGrammarFocusDocumentId(workbookId, lessonId)),
    { includeMetadataChanges: true }, (snapshot) => {
      if (!snapshot.exists() && snapshot.metadata.fromCache) return;
      onValue(snapshot.exists() ? normalizeGrammarFocusDocumentContent(snapshot.data()) : null);
    }, onError);
}

export async function saveGrammarFocus(input: {
  courseId: string;
  workbookId: number;
  lessonId: string;
  content: GrammarFocusContent;
  updatedBy: string;
}): Promise<GrammarFocusDocument> {
  if (!Number.isInteger(input.workbookId) || input.workbookId < 1 || input.workbookId > 100) {
    throw new Error('Invalid workbook.');
  }
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(input.lessonId)) throw new Error('Invalid lesson.');
  if (!input.updatedBy) throw new Error('The administrator could not be identified.');

  const canonicalLessonId = canonicalGrammarFocusLessonId(input.lessonId);
  const ref = doc(db, GRAMMAR_FOCUS_COLLECTION, grammarFocusDocumentId(input.courseId, input.workbookId, input.lessonId));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists() && !matchesGrammarFocusIdentity(snapshot.data(), input.courseId, input.workbookId, input.lessonId)) {
      throw new Error('Grammar Focus curriculum identity mismatch.');
    }
    const existingContent = snapshot.exists()
      ? normalizeGrammarFocusDocumentContent(snapshot.data())
      : emptyGrammarFocusContent();
    const content = mergeGrammarFocusContent(existingContent, input.content);
    const validationError = validateGrammarFocusContent(content);
    if (validationError) throw new Error(validationError);

    const value: GrammarFocusDocument = {
      courseId: input.courseId,
      targetLanguage: getCourseTargetLanguage(input.courseId)!,
      workbookId: input.workbookId,
      lessonId: canonicalLessonId,
      content,
      schemaVersion: 2,
      updatedAt: serverTimestamp(),
      updatedBy: input.updatedBy,
    };
    // Scoped writes never overwrite or implicitly adopt an unassigned legacy document.
    transaction.set(ref, value);
    return value;
  });
}
