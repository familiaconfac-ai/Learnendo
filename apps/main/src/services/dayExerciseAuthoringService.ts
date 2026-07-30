import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { assertEditorialAdminAccess } from './editorialAccessService';
import { applyExerciseOverride, type PublishedExerciseOverride } from '../models/exerciseOverride';
import { daySequenceScopeId } from '../models/editorialSequenceLoading';
import type { Exercise } from '../types';
import { validatePublishedExerciseTypes } from '../models/exerciseAuthoring';

export { daySequenceScopeId } from '../models/editorialSequenceLoading';

export const DAY_SEQUENCE_COLLECTION = 'dayExerciseSequences';
export const DAY_SEQUENCE_DRAFT_COLLECTION = 'dayExerciseSequenceDrafts';
export const PUBLISHED_DAY_SEQUENCE_COLLECTION = 'publishedDayExerciseSequences';
export const DAY_SEQUENCE_LIMIT = 100;

export interface DaySequenceIdentity {
  schemaVersion: 1;
  scopeId: string;
  courseId: string;
  language: string;
  workbookId: number;
  lessonId: string;
  dayId: string;
}

export interface DaySequenceDraft extends DaySequenceIdentity {
  status: 'draft';
  baseVersion: number;
  draftRevision: number;
  exercises: Exercise[];
  operation: 'edit' | 'reconstruct' | 'append' | 'insert_at' | 'replace_day' | 'replace_positions' | 'reorder';
  changeReason: string;
  relatedReportId: string | null;
  updatedAt?: unknown;
  updatedBy: string;
}

export interface PublishedDaySequence extends DaySequenceIdentity {
  version: number;
  exercises: Exercise[];
  publishedAt?: unknown;
}

export interface DaySequenceState {
  version: number;
  draftRevision: number;
  draft: DaySequenceDraft | null;
  published: PublishedDaySequence | null;
}

export function validateDaySequence(exercises: Exercise[]): string[] {
  const errors: string[] = [];
  if (!Array.isArray(exercises) || exercises.length === 0) errors.push('O dia deve conter ao menos um exercício.');
  if (exercises.length > DAY_SEQUENCE_LIMIT) errors.push(`O dia excede o limite de ${DAY_SEQUENCE_LIMIT} exercícios.`);
  const ids = exercises.map((item) => item.id);
  if (ids.some((id) => !id || id.length > 180)) errors.push('Todos os exercícios precisam de um identificador válido.');
  if (new Set(ids).size !== ids.length) errors.push('Existem identificadores duplicados no dia.');
  const unsupported = exercises.filter((item) => !['speaking', 'multiple-choice', 'writing', 'identification'].includes(item.type));
  if (unsupported.length) errors.push(`Tipos sem fluxo completo para autoria: ${[...new Set(unsupported.map((item) => item.type))].join(', ')}.`);
  return errors;
}

function cleanExercise(exercise: Exercise): Exercise {
  return JSON.parse(JSON.stringify(exercise)) as Exercise;
}

export async function getDaySequenceState(identity: Omit<DaySequenceIdentity, 'schemaVersion' | 'scopeId'>): Promise<DaySequenceState> {
  const scopeId = daySequenceScopeId(identity);
  const [canonical, draft, published] = await Promise.all([
    getDoc(doc(db, DAY_SEQUENCE_COLLECTION, scopeId)),
    getDoc(doc(db, DAY_SEQUENCE_DRAFT_COLLECTION, scopeId)),
    getDoc(doc(db, PUBLISHED_DAY_SEQUENCE_COLLECTION, scopeId)),
  ]);
  return {
    version: canonical.exists() ? Number(canonical.data().currentVersion ?? 0) : 0,
    draftRevision: draft.exists() ? Number(draft.data().draftRevision ?? 0) : 0,
    draft: draft.exists() ? draft.data() as DaySequenceDraft : null,
    published: published.exists() ? published.data() as PublishedDaySequence : null,
  };
}

export async function saveDaySequenceDraft(input: {
  identity: Omit<DaySequenceIdentity, 'schemaVersion' | 'scopeId'>;
  exercises: Exercise[];
  operation: DaySequenceDraft['operation'];
  changeReason: string;
  relatedReportId?: string | null;
  updatedBy: string;
  expectedVersion: number;
  expectedDraftRevision: number;
}): Promise<number> {
  await assertEditorialAdminAccess(input.updatedBy);
  const errors = validateDaySequence(input.exercises);
  if (errors.length) throw new Error(errors.join('\n'));
  const scopeId = daySequenceScopeId(input.identity);
  const identity: DaySequenceIdentity = { schemaVersion: 1, scopeId, ...input.identity };
  const canonicalRef = doc(db, DAY_SEQUENCE_COLLECTION, scopeId);
  const draftRef = doc(db, DAY_SEQUENCE_DRAFT_COLLECTION, scopeId);
  const publicRef = doc(db, PUBLISHED_DAY_SEQUENCE_COLLECTION, scopeId);
  return runTransaction(db, async (transaction) => {
    const [canonicalSnap, draftSnap, publicSnap] = await Promise.all([transaction.get(canonicalRef), transaction.get(draftRef), transaction.get(publicRef)]);
    const currentVersion = canonicalSnap.exists() ? Number(canonicalSnap.data().currentVersion ?? 0) : 0;
    const currentDraftRevision = draftSnap.exists() ? Number(draftSnap.data().draftRevision ?? 0) : 0;
    if (publicSnap.exists()) {
      const typeErrors = validatePublishedExerciseTypes((publicSnap.data() as PublishedDaySequence).exercises, input.exercises);
      if (typeErrors.length) throw new Error(typeErrors[0]);
    }
    if (currentVersion !== input.expectedVersion || currentDraftRevision !== input.expectedDraftRevision) throw new Error('Este dia foi alterado em outra sessão. Recarregue antes de salvar.');
    const draftRevision = currentDraftRevision + 1;
    transaction.set(canonicalRef, { ...identity, currentVersion, draftRevision, updatedAt: serverTimestamp(), updatedBy: input.updatedBy }, { merge: true });
    transaction.set(draftRef, { ...identity, status: 'draft', baseVersion: currentVersion, draftRevision,
      exercises: input.exercises.map(cleanExercise), operation: input.operation, changeReason: input.changeReason.trim(),
      relatedReportId: input.relatedReportId ?? null, updatedAt: serverTimestamp(), updatedBy: input.updatedBy } satisfies DaySequenceDraft);
    return draftRevision;
  });
}

export async function publishDaySequence(input: {
  identity: Omit<DaySequenceIdentity, 'schemaVersion' | 'scopeId'>;
  updatedBy: string;
  expectedVersion: number;
  expectedDraftRevision: number;
}): Promise<number> {
  await assertEditorialAdminAccess(input.updatedBy);
  const scopeId = daySequenceScopeId(input.identity);
  const canonicalRef = doc(db, DAY_SEQUENCE_COLLECTION, scopeId);
  const draftRef = doc(db, DAY_SEQUENCE_DRAFT_COLLECTION, scopeId);
  const publicRef = doc(db, PUBLISHED_DAY_SEQUENCE_COLLECTION, scopeId);
  return runTransaction(db, async (transaction) => {
    const [canonicalSnap, draftSnap, publicSnap] = await Promise.all([transaction.get(canonicalRef), transaction.get(draftRef), transaction.get(publicRef)]);
    if (!canonicalSnap.exists() || !draftSnap.exists()) throw new Error('Salve o rascunho antes de publicar.');
    const currentVersion = Number(canonicalSnap.data().currentVersion ?? 0);
    const draft = draftSnap.data() as DaySequenceDraft;
    if (currentVersion !== input.expectedVersion || draft.draftRevision !== input.expectedDraftRevision || draft.baseVersion !== currentVersion) throw new Error('O rascunho está desatualizado. Recarregue antes de publicar.');
    const errors = validateDaySequence(draft.exercises);
    if (errors.length) throw new Error(errors.join('\n'));
    if (publicSnap.exists()) {
      const typeErrors = validatePublishedExerciseTypes((publicSnap.data() as PublishedDaySequence).exercises, draft.exercises);
      if (typeErrors.length) throw new Error(typeErrors[0]);
    }
    if (draft.changeReason.trim().length < 5) throw new Error('Informe um motivo de publicação com pelo menos 5 caracteres.');
    const version = currentVersion + 1;
    const published: PublishedDaySequence = { schemaVersion: 1, scopeId, courseId: draft.courseId, language: draft.language,
      workbookId: draft.workbookId, lessonId: draft.lessonId, dayId: draft.dayId, version,
      exercises: draft.exercises.map(cleanExercise), publishedAt: serverTimestamp() };
    transaction.set(doc(canonicalRef, 'versions', String(version).padStart(6, '0')), { ...draft, version, publishedAt: serverTimestamp(), publishedBy: input.updatedBy });
    transaction.set(publicRef, published);
    transaction.update(canonicalRef, { currentVersion: version, draftRevision: 0, updatedAt: serverTimestamp(), updatedBy: input.updatedBy });
    transaction.delete(draftRef);
    return version;
  });
}

const publicCache = new Map<string, PublishedDaySequence | null>();
export async function loadPublishedDaySequence(identity: Omit<DaySequenceIdentity, 'schemaVersion' | 'scopeId'>): Promise<PublishedDaySequence | null> {
  const scopeId = daySequenceScopeId(identity);
  const snapshot = await getDoc(doc(db, PUBLISHED_DAY_SEQUENCE_COLLECTION, scopeId));
  const value = snapshot.exists() ? snapshot.data() as PublishedDaySequence : null;
  publicCache.set(scopeId, value);
  return value;
}

export function readCachedDaySequence(identity: Omit<DaySequenceIdentity, 'schemaVersion' | 'scopeId'>): PublishedDaySequence | null {
  return publicCache.get(daySequenceScopeId(identity)) ?? null;
}

export function resolveAuthoredDayExercises(local: Exercise[], overrides: PublishedExerciseOverride[], sequence: PublishedDaySequence | null): Exercise[] {
  if (!sequence) return local.map((exercise) => {
    const override = overrides.find((item) => item.exerciseId === exercise.id);
    return override ? applyExerciseOverride(exercise, override) : exercise;
  });
  const originalById = new Map(local.map((exercise) => [exercise.id, exercise]));
  return sequence.exercises.map((stored) => {
    const original = originalById.get(stored.id);
    const merged = original ? { ...original, ...stored, id: original.id } : stored;
    const override = overrides.find((item) => item.exerciseId === merged.id);
    return override ? applyExerciseOverride(merged, override) : merged;
  });
}
