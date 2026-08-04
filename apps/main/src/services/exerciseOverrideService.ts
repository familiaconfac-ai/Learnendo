import {
  collection, deleteDoc, doc, getDoc, getDocs, query, runTransaction,
  serverTimestamp, where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Exercise } from '../types';
import {
  applyExerciseOverride, diffExerciseOverride, getExerciseEditorialStatus, sanitizeExerciseOverride, validateExerciseOverride,
  type ExerciseEditorialDocument, type ExerciseIdentity, type ExerciseOverrideFields,
  type ExerciseEditorialStatus, type PublishedExerciseOverride,
} from '../models/exerciseOverride';
import { assertEditorialAdminAccess } from './editorialAccessService';
import { normalizeExerciseChangeReason, validateExerciseChangeReason } from '../models/exerciseChangeReason';
import { attachEditorialOperationDiagnostic } from './editorialFirebaseError';
import { EXERCISE_REPORT_COLLECTION } from './exerciseReportsService';

export const EXERCISE_OVERRIDE_COLLECTION = 'exerciseOverrides';
export const EXERCISE_DRAFT_COLLECTION = 'exerciseDrafts';
export const PUBLISHED_EXERCISE_OVERRIDE_COLLECTION = 'publishedExerciseOverrides';
const CACHE_TTL_MS = 5 * 60_000;
const memoryCache = new Map<string, { expiresAt: number; values: PublishedExerciseOverride[] }>();

const scopeKey = (workbookId: number, lessonId: string, dayId: string, language: string) =>
  `${language}:w${workbookId}:${lessonId}:${dayId}`;
const cacheStorageKey = (key: string) => `learnendo_exercise_overrides_v1:${key}`;
const identityValue = (identity: ExerciseIdentity): ExerciseIdentity => ({
  exerciseId: identity.exerciseId, workbookId: identity.workbookId, lessonId: identity.lessonId,
  dayId: identity.dayId, language: identity.language, exerciseType: identity.exerciseType,
});

function invalidateDayOverrideCache(identity: Pick<ExerciseIdentity, 'workbookId' | 'lessonId' | 'dayId' | 'language'>): void {
  const key = scopeKey(identity.workbookId, identity.lessonId, identity.dayId, identity.language);
  memoryCache.delete(key);
  try { localStorage.removeItem(cacheStorageKey(key)); } catch { /* non-browser/admin test environment */ }
}

export function readCachedDayOverrides(workbookId: number, lessonId: string, dayId: string, language: string): PublishedExerciseOverride[] {
  const key = scopeKey(workbookId, lessonId, dayId, language);
  const memory = memoryCache.get(key);
  if (memory && memory.expiresAt > Date.now()) return memory.values;
  try {
    const stored = JSON.parse(localStorage.getItem(cacheStorageKey(key)) ?? 'null') as { expiresAt: number; values: PublishedExerciseOverride[] } | null;
    if (stored?.expiresAt > Date.now() && Array.isArray(stored.values)) {
      memoryCache.set(key, stored);
      return stored.values;
    }
  } catch { /* local content remains the fallback */ }
  return [];
}

export async function loadPublishedDayOverrides(workbookId: number, lessonId: string, dayId: string, language: string): Promise<PublishedExerciseOverride[]> {
  const key = scopeKey(workbookId, lessonId, dayId, language);
  try {
    const snapshot = await getDocs(query(
      collection(db, PUBLISHED_EXERCISE_OVERRIDE_COLLECTION),
      where('workbookId', '==', workbookId), where('lessonId', '==', lessonId),
      where('dayId', '==', dayId), where('language', '==', language),
    ));
    const values = snapshot.docs.map((item) => ({ ...item.data(), exerciseId: item.id } as PublishedExerciseOverride));
    const cached = { expiresAt: Date.now() + CACHE_TTL_MS, values };
    memoryCache.set(key, cached);
    try { localStorage.setItem(cacheStorageKey(key), JSON.stringify(cached)); } catch { /* memory cache is sufficient */ }
    return values;
  } catch (error) {
    console.warn('[ExerciseOverrides] Firestore unavailable; using local/cached content.', error);
    return readCachedDayOverrides(workbookId, lessonId, dayId, language);
  }
}

export function resolveDayExercises(exercises: Exercise[], overrides: PublishedExerciseOverride[]): Exercise[] {
  const byId = new Map(overrides.map((item) => [item.exerciseId, item]));
  return exercises.map((exercise) => applyExerciseOverride(exercise, byId.get(exercise.id)));
}

export async function getExerciseEditorialState(exerciseId: string) {
  const [draft, published] = await Promise.all([
    getDoc(doc(db, EXERCISE_DRAFT_COLLECTION, exerciseId)),
    getDoc(doc(db, EXERCISE_OVERRIDE_COLLECTION, exerciseId)),
  ]);
  return {
    draft: draft.exists() ? draft.data() as ExerciseEditorialDocument : null,
    published: published.exists() ? published.data() as ExerciseEditorialDocument : null,
  };
}

export async function getExerciseEditorialStatuses(exerciseIds: string[]): Promise<Record<string, ExerciseEditorialStatus>> {
  const uniqueIds = [...new Set(exerciseIds.filter(Boolean))];
  const entries = await Promise.all(uniqueIds.map(async (exerciseId) => {
    const state = await getExerciseEditorialState(exerciseId);
    return [exerciseId, getExerciseEditorialStatus(state)] as const;
  }));
  return Object.fromEntries(entries);
}

export async function deleteExerciseDraft(exerciseId: string, updatedBy: string): Promise<void> {
  await assertEditorialAdminAccess(updatedBy);
  await deleteDoc(doc(db, EXERCISE_DRAFT_COLLECTION, exerciseId));
}

export async function listExerciseVersions(exerciseId: string): Promise<ExerciseEditorialDocument[]> {
  const snapshot = await getDocs(collection(db, EXERCISE_OVERRIDE_COLLECTION, exerciseId, 'versions'));
  return snapshot.docs.map((item) => item.data() as ExerciseEditorialDocument)
    .sort((left, right) => right.version - left.version);
}

export async function saveExerciseDraft(input: {
  original: Exercise; identity: ExerciseIdentity; fields: ExerciseOverrideFields;
  changeReason: string; adminNote: string; updatedBy: string; baseVersion: number; relatedReportId?: string | null;
  expectedDraftRevision?: number;
}): Promise<number> {
  await assertEditorialAdminAccess(input.updatedBy);
  const override = diffExerciseOverride(input.original, input.fields);
  const errors = validateExerciseOverride(input.original, input.identity, override);
  if (errors.some((error) => error.includes('ID') || error.includes('tipo') || error.includes('Idioma'))) throw new Error(errors.join('\n'));
  const ref = doc(db, EXERCISE_DRAFT_COLLECTION, input.identity.exerciseId);
  const payload = { ...identityValue(input.identity), status: 'draft' as const, version: input.baseVersion, override,
    changeReason: input.changeReason.trim(), adminNote: input.adminNote.trim(), relatedReportId: input.relatedReportId ?? null,
    baseVersion: input.baseVersion, draftRevision: (input.expectedDraftRevision ?? 0) + 1,
    updatedAt: serverTimestamp(), updatedBy: input.updatedBy };
  let operationType: 'create' | 'update' = 'create';
  try {
    const revision = await runTransaction(db, async (transaction) => {
      const current = await transaction.get(ref);
      operationType = current.exists() ? 'update' : 'create';
      if (current.exists() && (Number(current.data().baseVersion ?? 0) !== input.baseVersion
        || Number(current.data().draftRevision ?? 0) !== (input.expectedDraftRevision ?? 0))) {
        throw new Error('Este exercício foi alterado por outro administrador. Recarregue ou compare as versões antes de salvar.');
      }
      transaction.set(ref, payload);
      return payload.draftRevision;
    });
    const persisted = await getDoc(ref);
    if (!persisted.exists() || Number(persisted.data().draftRevision ?? 0) !== revision) {
      throw new Error('O Firestore não devolveu o rascunho recém-salvo. O editor foi mantido aberto para nova tentativa.');
    }
    return revision;
  } catch (cause) {
    throw attachEditorialOperationDiagnostic(cause, {
      action: 'salvar rascunho', collection: EXERCISE_DRAFT_COLLECTION,
      targetPath: `${EXERCISE_DRAFT_COLLECTION}/${input.identity.exerciseId}`, operationType,
      stage: 'gravação isolada do rascunho', confirmationState: 'not-applicable', completedOperations: [],
      payload: { ...payload, updatedAt: '[serverTimestamp]' },
    });
  }
}

export async function publishExerciseOverride(input: {
  original: Exercise; identity: ExerciseIdentity; fields: ExerciseOverrideFields;
  changeReason: string; adminNote: string; updatedBy: string; baseVersion: number; relatedReportId?: string | null;
  status?: 'published' | 'disabled';
  expectedDraftRevision?: number;
  reportToResolve?: {
    reportId: string;
    exerciseId: string;
    status: 'new' | 'reviewing';
    adminNote?: string | null;
  };
}): Promise<number> {
  await assertEditorialAdminAccess(input.updatedBy);
  const override = diffExerciseOverride(input.original, input.fields);
  const errors = validateExerciseOverride(input.original, input.identity, override);
  const changeReason = normalizeExerciseChangeReason(input.changeReason);
  const changeReasonError = validateExerciseChangeReason(changeReason, input.status === 'disabled' ? 'disable' : 'publish');
  if (changeReasonError) errors.push(changeReasonError);
  if (errors.length) throw new Error(errors.join('\n'));
  const canonicalRef = doc(db, EXERCISE_OVERRIDE_COLLECTION, input.identity.exerciseId);
  const publicRef = doc(db, PUBLISHED_EXERCISE_OVERRIDE_COLLECTION, input.identity.exerciseId);
  const draftRef = doc(db, EXERCISE_DRAFT_COLLECTION, input.identity.exerciseId);
  const reportRef = input.reportToResolve
    ? doc(db, EXERCISE_REPORT_COLLECTION, input.reportToResolve.reportId)
    : null;
  let diagnosticPayload: unknown;
  let version: number;
  try {
    version = await runTransaction(db, async (transaction) => {
    const [current, currentDraft, currentReport] = await Promise.all([
      transaction.get(canonicalRef),
      transaction.get(draftRef),
      reportRef ? transaction.get(reportRef) : Promise.resolve(null),
    ]);
    const currentVersion = current.exists() ? Number(current.data().version ?? 0) : 0;
    if (currentVersion !== input.baseVersion) throw new Error('Este exercício foi alterado por outro administrador. Recarregue ou compare as versões antes de publicar.');
    if (currentDraft.exists() && Number(currentDraft.data().draftRevision ?? 0) !== (input.expectedDraftRevision ?? 0)) {
      throw new Error('Este exercício foi alterado por outro administrador. Recarregue ou compare as versões antes de publicar.');
    }
    if (input.reportToResolve) {
      if (!currentReport?.exists()) throw new Error('O relatório relacionado não existe mais. A publicação não foi realizada.');
      const reportData = currentReport.data();
      if (reportData.exerciseId !== input.reportToResolve.exerciseId || reportData.exerciseId !== input.identity.exerciseId) {
        throw new Error('O relatório relacionado pertence a outro exercício. A publicação não foi realizada.');
      }
      if (reportData.status !== 'new' && reportData.status !== 'reviewing') {
        throw new Error('O relatório relacionado já foi encerrado. Recarregue a lista antes de publicar.');
      }
    }
    const version = currentVersion + 1;
    const status = input.status ?? 'published';
    const safeIdentity = identityValue(input.identity);
    const adminValue = { ...safeIdentity, status, version, override, changeReason,
      adminNote: input.adminNote.trim(), relatedReportId: input.relatedReportId ?? null, baseVersion: version,
      updatedAt: serverTimestamp(), updatedBy: input.updatedBy, publishedAt: serverTimestamp(), publishedBy: input.updatedBy };
    const publicValue = { ...safeIdentity, status, version, override: sanitizeExerciseOverride(override), publishedAt: serverTimestamp() };
    diagnosticPayload = {
      canonical: { path: `${EXERCISE_OVERRIDE_COLLECTION}/${input.identity.exerciseId}`, value: { ...adminValue, updatedAt: '[serverTimestamp]', publishedAt: '[serverTimestamp]' } },
      history: { path: `${EXERCISE_OVERRIDE_COLLECTION}/${input.identity.exerciseId}/versions/${String(version).padStart(6, '0')}`, value: { ...adminValue, updatedAt: '[serverTimestamp]', publishedAt: '[serverTimestamp]' } },
      publicProjection: { path: `${PUBLISHED_EXERCISE_OVERRIDE_COLLECTION}/${input.identity.exerciseId}`, value: { ...publicValue, publishedAt: '[serverTimestamp]' } },
      draftDelete: `${EXERCISE_DRAFT_COLLECTION}/${input.identity.exerciseId}`,
      reportResolution: reportRef ? `${EXERCISE_REPORT_COLLECTION}/${input.reportToResolve?.reportId}` : null,
    };
    transaction.set(canonicalRef, adminValue);
    transaction.set(doc(canonicalRef, 'versions', String(version).padStart(6, '0')), adminValue);
    transaction.set(publicRef, publicValue);
    transaction.delete(draftRef);
    if (reportRef && input.reportToResolve) {
      transaction.update(reportRef, {
        status: 'resolved',
        resolutionVersion: version,
        resolutionType: 'editorial',
        adminNote: [input.reportToResolve.adminNote, `Resolvido pela versão editorial ${version}.`].filter(Boolean).join('\n'),
        resolvedAt: serverTimestamp(),
        resolvedByEditorialAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return version;
    });
  } catch (cause) {
    throw attachEditorialOperationDiagnostic(cause, {
      action: 'publicar correção',
      collection: `${EXERCISE_OVERRIDE_COLLECTION}; ${PUBLISHED_EXERCISE_OVERRIDE_COLLECTION}; ${EXERCISE_DRAFT_COLLECTION}${input.reportToResolve ? `; ${EXERCISE_REPORT_COLLECTION}` : ''}`,
      targetPath: `${EXERCISE_OVERRIDE_COLLECTION}/${input.identity.exerciseId}; ${EXERCISE_OVERRIDE_COLLECTION}/${input.identity.exerciseId}/versions/{version}; ${PUBLISHED_EXERCISE_OVERRIDE_COLLECTION}/${input.identity.exerciseId}; ${EXERCISE_DRAFT_COLLECTION}/${input.identity.exerciseId}${input.reportToResolve ? `; ${EXERCISE_REPORT_COLLECTION}/${input.reportToResolve.reportId}` : ''}`,
      operationType: 'transaction', stage: 'transação atômica de publicação',
      confirmationState: 'not-applicable', completedOperations: [], payload: diagnosticPayload,
    });
  }
  invalidateDayOverrideCache(input.identity);
  return version;
}

export async function restoreExerciseVersion(original: Exercise, version: ExerciseEditorialDocument, updatedBy: string): Promise<number> {
  const current = await getExerciseEditorialState(version.exerciseId);
  return publishExerciseOverride({ original, identity: identityValue(version), fields: version.override,
    changeReason: `Restauração da versão ${version.version}: ${version.changeReason}`, adminNote: version.adminNote,
    updatedBy, baseVersion: current.published?.version ?? 0, relatedReportId: version.relatedReportId,
    expectedDraftRevision: current.draft?.draftRevision ?? 0 });
}

export async function removePublishedExerciseOverride(exerciseId: string, updatedBy: string, reason: string): Promise<void> {
  await assertEditorialAdminAccess(updatedBy);
  const changeReason = normalizeExerciseChangeReason(reason);
  const changeReasonError = validateExerciseChangeReason(changeReason);
  if (changeReasonError) throw new Error(changeReasonError);
  const canonicalRef = doc(db, EXERCISE_OVERRIDE_COLLECTION, exerciseId);
  let identity: ExerciseEditorialDocument | null = null;
  await runTransaction(db, async (transaction) => {
    const current = await transaction.get(canonicalRef);
    if (!current.exists()) return;
    const value = current.data() as ExerciseEditorialDocument;
    identity = value;
    const version = Number(value.version) + 1;
    const archived = {
      ...value, status: 'archived', version, changeReason, baseVersion: version,
      updatedAt: serverTimestamp(), updatedBy,
    };
    transaction.set(doc(canonicalRef, 'versions', String(version).padStart(6, '0')), archived);
    transaction.set(canonicalRef, archived);
    transaction.delete(doc(db, PUBLISHED_EXERCISE_OVERRIDE_COLLECTION, exerciseId));
    transaction.delete(doc(db, EXERCISE_DRAFT_COLLECTION, exerciseId));
  });
  if (identity) invalidateDayOverrideCache(identity);
}
