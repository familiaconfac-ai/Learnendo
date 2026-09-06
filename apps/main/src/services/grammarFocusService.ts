import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getCourseTargetLanguage } from '../models/languageContext';
import {
  canonicalGrammarFocusLessonId,
  emptyGrammarFocusContent,
  grammarFocusDocumentId,
  grammarFocusFamilyCourseId,
  matchesGrammarFocusIdentity,
  mergeGrammarFocusContent,
  normalizeGrammarFocusDocumentContent,
  validateGrammarFocusContent,
  type GrammarFocusContent,
  type GrammarFocusDocument,
} from '../models/grammarFocus';
import {
  legacyGrammarFocusDocumentIds, readLegacyGrammarFocus, legacyGrammarFocusRevision,
  legacyGrammarFocusAssignmentError, type LegacyGrammarFocus,
} from '../models/legacyGrammarFocus';
import { hasGrammarFocusContent } from '../models/grammarFocus';

export const GRAMMAR_FOCUS_COLLECTION = 'grammarFocus';
export const GRAMMAR_FOCUS_ASSIGNMENTS_COLLECTION = 'grammarFocusLegacyAssignments';

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
    if (snapshot.metadata.fromCache && !snapshot.exists()) return;
    if (!snapshot.exists()) {
      onValue(null);
      return;
    }
    const value = snapshot.data();
    if (!matchesGrammarFocusIdentity(value, courseId, workbookId, lessonId)) {
      onError(new Error('Grammar Focus curriculum identity mismatch.'));
      return;
    }
    const familyCourseId = grammarFocusFamilyCourseId(courseId);
    onValue({
      courseId: familyCourseId,
      targetLanguage: getCourseTargetLanguage(familyCourseId)!,
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
  onValue: (documents: LegacyGrammarFocus[]) => void,
  onError: (error: Error) => void,
): () => void {
  const ids = legacyGrammarFocusDocumentIds(workbookId, lessonId);
  const documents = new Map<string, LegacyGrammarFocus>();
  const ready = new Set<string>();
  const assignments = new Map<string, LegacyGrammarFocus['assignment']>();
  let active = true;
  const publish = () => {
    if (active && ready.size === ids.length * 2) onValue(ids.flatMap(id => {
      const source = documents.get(id);
      return source ? [{ ...source, assignment: assignments.get(id) ?? null }] : [];
    }));
  };
  const unsubscribers = ids.flatMap(id => [
    onSnapshot(doc(db, GRAMMAR_FOCUS_COLLECTION, id), { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache && !snapshot.exists()) return;
      if (snapshot.exists()) documents.set(id, readLegacyGrammarFocus(id, snapshot.data()));
      else documents.delete(id);
      ready.add(id); publish();
    }, error => { ready.add(id); onError(error); publish(); }),
    onSnapshot(doc(db, GRAMMAR_FOCUS_ASSIGNMENTS_COLLECTION, id), { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache && !snapshot.exists()) return;
      const value = snapshot.data();
      assignments.set(id, value ? { courseId: value.courseId, destinationId: value.destinationId } : null);
      ready.add(`assignment:${id}`); publish();
    }, error => { ready.add(`assignment:${id}`); onError(error); publish(); }),
  ]);
  return () => { active = false; unsubscribers.forEach(unsubscribe => unsubscribe()); };
}

/** Explicit admin action. Atomic, create-only destination + immutable receipt; source is never written. */
export async function assignLegacyGrammarFocus(input: {
  source: LegacyGrammarFocus; courseId: string; workbookId: number; lessonId: string; updatedBy: string;
}): Promise<string> {
  const destinationId = grammarFocusDocumentId(input.courseId, input.workbookId, input.lessonId);
  if (!input.updatedBy) throw new Error('The administrator could not be identified.');
  const sourceRef = doc(db, GRAMMAR_FOCUS_COLLECTION, input.source.documentId);
  const destinationRef = doc(db, GRAMMAR_FOCUS_COLLECTION, destinationId);
  const assignmentRef = doc(db, GRAMMAR_FOCUS_ASSIGNMENTS_COLLECTION, input.source.documentId);
  return runTransaction(db, async transaction => {
    const sourceSnapshot = await transaction.get(sourceRef);
    const destination = await transaction.get(destinationRef);
    const assignment = await transaction.get(assignmentRef);
    if (!sourceSnapshot.exists()) throw new Error('Legacy source no longer exists.');
    if (assignment.exists()) throw new Error('Legacy document already assigned.');
    if (destination.exists()) throw new Error('Destination already exists. No official content was overwritten.');
    const sourceData = sourceSnapshot.data();
    if (legacyGrammarFocusRevision(sourceData) !== legacyGrammarFocusRevision(input.source.sourceData)) {
      throw new Error('Legacy source changed. Review the refreshed content before confirming again.');
    }
    const source = readLegacyGrammarFocus(input.source.documentId, sourceData);
    const identityError = legacyGrammarFocusAssignmentError(source, input.courseId, input.workbookId, input.lessonId);
    if (identityError) throw new Error(identityError);
    const content = source.content;
    if (!hasGrammarFocusContent(content)) throw new Error('No recognized legacy content. Inspect the original fields before migrating.');
    const validationError = validateGrammarFocusContent(content);
    if (validationError) throw new Error(validationError);
    const familyCourseId = grammarFocusFamilyCourseId(input.courseId);
    const value: GrammarFocusDocument = {
      courseId: familyCourseId, targetLanguage: getCourseTargetLanguage(familyCourseId)!,
      workbookId: input.workbookId, lessonId: canonicalGrammarFocusLessonId(input.lessonId),
      schemaVersion: 2, content, updatedAt: serverTimestamp(), updatedBy: input.updatedBy,
      legacySourceId: source.documentId,
    };
    transaction.set(destinationRef, value);
    transaction.set(assignmentRef, {
      sourceId: source.documentId, destinationId, courseId: familyCourseId,
      sourceData, content, assignedAt: serverTimestamp(), assignedBy: input.updatedBy,
    });
    return destinationId;
  });
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

    const familyCourseId = grammarFocusFamilyCourseId(input.courseId);
    const value: GrammarFocusDocument = {
      courseId: familyCourseId,
      targetLanguage: getCourseTargetLanguage(familyCourseId)!,
      workbookId: input.workbookId,
      lessonId: canonicalLessonId,
      content,
      schemaVersion: 2,
      updatedAt: serverTimestamp(),
      updatedBy: input.updatedBy,
      ...(snapshot.data()?.legacySourceId ? { legacySourceId: snapshot.data()!.legacySourceId } : {}),
    };
    // Scoped writes never overwrite or implicitly adopt an unassigned legacy document.
    transaction.set(ref, value);
    return value;
  });
}
