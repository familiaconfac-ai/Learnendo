import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  grammarFocusDocumentId,
  normalizeGrammarFocusContent,
  validateGrammarFocusContent,
  type GrammarFocusContent,
  type GrammarFocusDocument,
} from '../models/grammarFocus';

export const GRAMMAR_FOCUS_COLLECTION = 'grammarFocus';

export function subscribeGrammarFocus(
  workbookId: number,
  lessonId: string,
  onValue: (value: GrammarFocusDocument | null) => void,
  onError: (error: Error) => void,
): () => void {
  const ref = doc(db, GRAMMAR_FOCUS_COLLECTION, grammarFocusDocumentId(workbookId, lessonId));
  return onSnapshot(ref, (snapshot) => {
    if (!snapshot.exists()) {
      onValue(null);
      return;
    }
    const value = snapshot.data();
    onValue({
      workbookId: Number(value.workbookId),
      lessonId: String(value.lessonId ?? lessonId),
      content: normalizeGrammarFocusContent(value.content),
      schemaVersion: 1,
      updatedAt: value.updatedAt,
      updatedBy: String(value.updatedBy ?? ''),
    });
  }, (error) => onError(error));
}

export async function saveGrammarFocus(input: {
  workbookId: number;
  lessonId: string;
  content: GrammarFocusContent;
  updatedBy: string;
}): Promise<GrammarFocusDocument> {
  const validationError = validateGrammarFocusContent(input.content);
  if (validationError) throw new Error(validationError);
  if (!Number.isInteger(input.workbookId) || input.workbookId < 1 || input.workbookId > 100) {
    throw new Error('Invalid workbook.');
  }
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(input.lessonId)) throw new Error('Invalid lesson.');
  if (!input.updatedBy) throw new Error('The administrator could not be identified.');

  const value: GrammarFocusDocument = {
    workbookId: input.workbookId,
    lessonId: input.lessonId,
    content: input.content,
    schemaVersion: 1,
    updatedAt: serverTimestamp(),
    updatedBy: input.updatedBy,
  };
  const ref = doc(db, GRAMMAR_FOCUS_COLLECTION, grammarFocusDocumentId(input.workbookId, input.lessonId));
  await setDoc(ref, value);
  return value;
}
