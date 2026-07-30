import {
  collection, doc, getDoc, getDocs, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { assertEditorialAdminAccess } from './editorialAccessService';
import {
  ADMIN_EXERCISE_COLLECTION, ADMIN_EXERCISE_DRAFT_COLLECTION,
  ADMIN_EXERCISE_SCHEMA_VERSION, PUBLISHED_EXERCISE_COLLECTION,
  generateAdminExerciseId, normalizeAdminExerciseContent,
  assertAdminExerciseRevision, validateAdminExerciseForPublication, versionDocumentId,
  type AdminExerciseCanonical, type AdminExerciseContent, type AdminExerciseDraft,
  type AdminExerciseIdentity, type AdminExerciseState, type AdminExerciseVersion,
  type PublishedAdminExercise,
} from '../models/adminExercise';

export interface AdminExerciseDraftInput {
  courseId: string;
  language: string;
  workbookId: number;
  lessonId: string;
  dayId: string;
  content: AdminExerciseContent;
  changeReason: string;
  adminNote: string;
  relatedReportId?: string | null;
  imageValidation?: AdminExerciseDraft['imageValidation'];
}

export interface AdminExerciseListItem extends AdminExerciseCanonical {
  hasDraft: boolean;
}

const identityFromInput = (exerciseId: string, input: AdminExerciseDraftInput): AdminExerciseIdentity => ({
  schemaVersion: ADMIN_EXERCISE_SCHEMA_VERSION,
  exerciseId,
  origin: 'admin',
  courseId: input.courseId,
  language: input.language,
  workbookId: Number(input.workbookId),
  lessonId: input.lessonId,
  dayId: input.dayId,
  type: 'multiple-choice',
});

const contentFromPublished = (value: PublishedAdminExercise): AdminExerciseContent => normalizeAdminExerciseContent(value);

const publicProjection = (
  identity: AdminExerciseIdentity,
  content: AdminExerciseContent,
  version: number,
): PublishedAdminExercise => ({
  ...identity,
  ...normalizeAdminExerciseContent(content),
  version,
  publishedAt: serverTimestamp(),
});

function publicationErrors(identity: AdminExerciseIdentity, draft: AdminExerciseDraft): string[] {
  const imageUrl = draft.content.imageUrl.trim();
  return validateAdminExerciseForPublication({
    identity,
    content: draft.content,
    changeReason: draft.changeReason,
    imageValidated: !imageUrl || draft.imageValidation?.validatedUrl === imageUrl,
  });
}

export async function getAdminExerciseState(exerciseId: string): Promise<AdminExerciseState | null> {
  const [canonical, draft, published] = await Promise.all([
    getDoc(doc(db, ADMIN_EXERCISE_COLLECTION, exerciseId)),
    getDoc(doc(db, ADMIN_EXERCISE_DRAFT_COLLECTION, exerciseId)),
    getDoc(doc(db, PUBLISHED_EXERCISE_COLLECTION, exerciseId)),
  ]);
  if (!canonical.exists()) return null;
  return {
    canonical: canonical.data() as AdminExerciseCanonical,
    draft: draft.exists() ? draft.data() as AdminExerciseDraft : null,
    published: published.exists() ? published.data() as PublishedAdminExercise : null,
  };
}

export async function listAdminExercises(): Promise<AdminExerciseListItem[]> {
  const [canonical, drafts] = await Promise.all([
    getDocs(collection(db, ADMIN_EXERCISE_COLLECTION)),
    getDocs(collection(db, ADMIN_EXERCISE_DRAFT_COLLECTION)),
  ]);
  const draftIds = new Set(drafts.docs.map((item) => item.id));
  return canonical.docs.map((item) => ({
    ...(item.data() as AdminExerciseCanonical), exerciseId: item.id, hasDraft: draftIds.has(item.id),
  })).sort((left, right) => left.exerciseId.localeCompare(right.exerciseId));
}

export async function listAdminExerciseVersions(exerciseId: string): Promise<AdminExerciseVersion[]> {
  const snapshot = await getDocs(collection(db, ADMIN_EXERCISE_COLLECTION, exerciseId, 'versions'));
  return snapshot.docs.map((item) => item.data() as AdminExerciseVersion)
    .sort((left, right) => right.version - left.version);
}

export async function createAdminExerciseDraft(
  input: AdminExerciseDraftInput & { updatedBy: string; duplicatedFromExerciseId?: string | null },
): Promise<string> {
  await assertEditorialAdminAccess(input.updatedBy);
  const exerciseId = generateAdminExerciseId();
  const identity = identityFromInput(exerciseId, input);
  const canonicalRef = doc(db, ADMIN_EXERCISE_COLLECTION, exerciseId);
  const draftRef = doc(db, ADMIN_EXERCISE_DRAFT_COLLECTION, exerciseId);
  await runTransaction(db, async (transaction) => {
    if ((await transaction.get(canonicalRef)).exists()) throw new Error('O identificador gerado já existe. Tente novamente.');
    const shared = {
      changeReason: input.changeReason.trim(), adminNote: input.adminNote.trim(),
      relatedReportId: input.relatedReportId ?? null,
      duplicatedFromExerciseId: input.duplicatedFromExerciseId ?? null,
    };
    transaction.set(canonicalRef, {
      ...identity, status: 'draft', currentVersion: 0, draftRevision: 1,
      ...shared, createdAt: serverTimestamp(), createdBy: input.updatedBy,
      updatedAt: serverTimestamp(), updatedBy: input.updatedBy,
    } satisfies AdminExerciseCanonical);
    transaction.set(draftRef, {
      ...identity, status: 'draft', baseVersion: 0, draftRevision: 1,
      content: normalizeAdminExerciseContent(input.content),
      imageValidation: input.imageValidation ?? null, ...shared,
      updatedAt: serverTimestamp(), updatedBy: input.updatedBy,
    } satisfies AdminExerciseDraft);
  });
  return exerciseId;
}

export async function saveAdminExerciseDraft(input: AdminExerciseDraftInput & {
  exerciseId: string; updatedBy: string; baseVersion: number; expectedDraftRevision: number;
}): Promise<number> {
  await assertEditorialAdminAccess(input.updatedBy);
  const canonicalRef = doc(db, ADMIN_EXERCISE_COLLECTION, input.exerciseId);
  const draftRef = doc(db, ADMIN_EXERCISE_DRAFT_COLLECTION, input.exerciseId);
  return runTransaction(db, async (transaction) => {
    const [canonicalSnapshot, draftSnapshot] = await Promise.all([
      transaction.get(canonicalRef), transaction.get(draftRef),
    ]);
    if (!canonicalSnapshot.exists()) throw new Error('Exercício administrativo não encontrado.');
    const canonical = canonicalSnapshot.data() as AdminExerciseCanonical;
    const currentDraftRevision = draftSnapshot.exists()
      ? Number(draftSnapshot.data().draftRevision ?? 0)
      : Number(canonical.draftRevision ?? 0);
    assertAdminExerciseRevision({ currentVersion: canonical.currentVersion, expectedVersion: input.baseVersion,
      currentDraftRevision, expectedDraftRevision: input.expectedDraftRevision });
    const draftRevision = currentDraftRevision + 1;
    const identity = identityFromInput(input.exerciseId, input);
    const shared = {
      changeReason: input.changeReason.trim(), adminNote: input.adminNote.trim(),
      relatedReportId: input.relatedReportId ?? null,
      duplicatedFromExerciseId: canonical.duplicatedFromExerciseId ?? null,
    };
    transaction.set(draftRef, {
      ...identity, status: 'draft', baseVersion: canonical.currentVersion, draftRevision,
      content: normalizeAdminExerciseContent(input.content), imageValidation: input.imageValidation ?? null,
      ...shared, updatedAt: serverTimestamp(), updatedBy: input.updatedBy,
    } satisfies AdminExerciseDraft);
    transaction.update(canonicalRef, {
      ...identity, status: canonical.status === 'draft' ? 'draft' : canonical.status,
      draftRevision, ...shared, updatedAt: serverTimestamp(), updatedBy: input.updatedBy,
    });
    return draftRevision;
  });
}

export async function publishAdminExercise(input: {
  exerciseId: string; updatedBy: string; baseVersion: number; expectedDraftRevision: number;
}): Promise<number> {
  await assertEditorialAdminAccess(input.updatedBy);
  const canonicalRef = doc(db, ADMIN_EXERCISE_COLLECTION, input.exerciseId);
  const draftRef = doc(db, ADMIN_EXERCISE_DRAFT_COLLECTION, input.exerciseId);
  const publicRef = doc(db, PUBLISHED_EXERCISE_COLLECTION, input.exerciseId);
  return runTransaction(db, async (transaction) => {
    const [canonicalSnapshot, draftSnapshot] = await Promise.all([
      transaction.get(canonicalRef), transaction.get(draftRef),
    ]);
    if (!canonicalSnapshot.exists() || !draftSnapshot.exists()) throw new Error('Salve um rascunho antes de publicar.');
    const canonical = canonicalSnapshot.data() as AdminExerciseCanonical;
    const draft = draftSnapshot.data() as AdminExerciseDraft;
    assertAdminExerciseRevision({ currentVersion: canonical.currentVersion, expectedVersion: input.baseVersion,
      currentDraftRevision: draft.draftRevision, expectedDraftRevision: input.expectedDraftRevision });
    if (draft.baseVersion !== input.baseVersion) throw new Error('O rascunho foi criado sobre outra versão. Recarregue a tela.');
    const errors = publicationErrors(draft, draft);
    if (errors.length) throw new Error(errors.join('\n'));
    const version = canonical.currentVersion + 1;
    const versionValue: AdminExerciseVersion = {
      schemaVersion: draft.schemaVersion, exerciseId: draft.exerciseId, origin: draft.origin,
      courseId: draft.courseId, language: draft.language, workbookId: draft.workbookId,
      lessonId: draft.lessonId, dayId: draft.dayId, type: draft.type,
      status: 'published', version, content: normalizeAdminExerciseContent(draft.content),
      changeReason: draft.changeReason, adminNote: draft.adminNote,
      relatedReportId: draft.relatedReportId,
      duplicatedFromExerciseId: draft.duplicatedFromExerciseId,
      publishedAt: serverTimestamp(), publishedBy: input.updatedBy,
    };
    transaction.set(doc(canonicalRef, 'versions', versionDocumentId(version)), versionValue);
    transaction.set(publicRef, publicProjection(draft, draft.content, version));
    transaction.update(canonicalRef, {
      ...draft, status: 'published', currentVersion: version, draftRevision: 0,
      changeReason: draft.changeReason, adminNote: draft.adminNote,
      updatedAt: serverTimestamp(), updatedBy: input.updatedBy,
      publishedAt: serverTimestamp(), publishedBy: input.updatedBy,
      content: undefined, baseVersion: undefined, imageValidation: undefined,
    });
    transaction.delete(draftRef);
    return version;
  });
}

async function latestVersion(exerciseId: string): Promise<AdminExerciseVersion> {
  const versions = await listAdminExerciseVersions(exerciseId);
  if (!versions[0]) throw new Error('Nenhuma versão publicada foi encontrada.');
  return versions[0];
}

export async function disableAdminExercise(input: {
  exerciseId: string; updatedBy: string; reason: string; expectedVersion: number;
}): Promise<number> {
  await assertEditorialAdminAccess(input.updatedBy);
  if (input.reason.trim().length < 5) throw new Error('Informe um motivo com pelo menos 5 caracteres.');
  const canonicalRef = doc(db, ADMIN_EXERCISE_COLLECTION, input.exerciseId);
  const publicRef = doc(db, PUBLISHED_EXERCISE_COLLECTION, input.exerciseId);
  return runTransaction(db, async (transaction) => {
    const [canonicalSnapshot, publicSnapshot] = await Promise.all([
      transaction.get(canonicalRef), transaction.get(publicRef),
    ]);
    if (!canonicalSnapshot.exists() || !publicSnapshot.exists()) throw new Error('Exercício publicado não encontrado.');
    const canonical = canonicalSnapshot.data() as AdminExerciseCanonical;
    assertAdminExerciseRevision({ currentVersion: canonical.currentVersion, expectedVersion: input.expectedVersion });
    if (canonical.status !== 'published') throw new Error('O exercício não está publicado.');
    const published = publicSnapshot.data() as PublishedAdminExercise;
    const version = canonical.currentVersion + 1;
    const history: AdminExerciseVersion = {
      ...canonical, status: 'disabled', version, content: contentFromPublished(published),
      changeReason: input.reason.trim(), publishedAt: serverTimestamp(), publishedBy: input.updatedBy,
    };
    delete (history as Partial<AdminExerciseCanonical>).currentVersion;
    delete (history as Partial<AdminExerciseCanonical>).draftRevision;
    delete (history as Partial<AdminExerciseCanonical>).createdAt;
    delete (history as Partial<AdminExerciseCanonical>).createdBy;
    delete (history as Partial<AdminExerciseCanonical>).updatedAt;
    delete (history as Partial<AdminExerciseCanonical>).updatedBy;
    transaction.set(doc(canonicalRef, 'versions', versionDocumentId(version)), history);
    transaction.update(canonicalRef, {
      status: 'disabled', currentVersion: version, changeReason: input.reason.trim(),
      updatedAt: serverTimestamp(), updatedBy: input.updatedBy,
    });
    transaction.delete(publicRef);
    return version;
  });
}

export async function reactivateAdminExercise(input: {
  exerciseId: string; updatedBy: string; reason: string; expectedVersion: number;
}): Promise<number> {
  await assertEditorialAdminAccess(input.updatedBy);
  if (input.reason.trim().length < 5) throw new Error('Informe um motivo com pelo menos 5 caracteres.');
  const source = await latestVersion(input.exerciseId);
  const canonicalRef = doc(db, ADMIN_EXERCISE_COLLECTION, input.exerciseId);
  return runTransaction(db, async (transaction) => {
    const canonicalSnapshot = await transaction.get(canonicalRef);
    if (!canonicalSnapshot.exists()) throw new Error('Exercício administrativo não encontrado.');
    const canonical = canonicalSnapshot.data() as AdminExerciseCanonical;
    assertAdminExerciseRevision({ currentVersion: canonical.currentVersion, expectedVersion: input.expectedVersion });
    if (canonical.status !== 'disabled') throw new Error('O exercício não está desativado.');
    const version = canonical.currentVersion + 1;
    const history: AdminExerciseVersion = {
      ...source, status: 'published', version, changeReason: input.reason.trim(),
      publishedAt: serverTimestamp(), publishedBy: input.updatedBy,
    };
    transaction.set(doc(canonicalRef, 'versions', versionDocumentId(version)), history);
    transaction.set(doc(db, PUBLISHED_EXERCISE_COLLECTION, input.exerciseId), publicProjection(source, source.content, version));
    transaction.update(canonicalRef, {
      status: 'published', currentVersion: version, changeReason: input.reason.trim(),
      updatedAt: serverTimestamp(), updatedBy: input.updatedBy,
      publishedAt: serverTimestamp(), publishedBy: input.updatedBy,
    });
    return version;
  });
}

export async function restoreAdminExerciseVersion(input: {
  exerciseId: string; sourceVersion: number; updatedBy: string; reason: string; expectedVersion: number;
}): Promise<number> {
  await assertEditorialAdminAccess(input.updatedBy);
  if (input.reason.trim().length < 5) throw new Error('Informe um motivo com pelo menos 5 caracteres.');
  const canonicalRef = doc(db, ADMIN_EXERCISE_COLLECTION, input.exerciseId);
  const sourceRef = doc(canonicalRef, 'versions', versionDocumentId(input.sourceVersion));
  const draftRef = doc(db, ADMIN_EXERCISE_DRAFT_COLLECTION, input.exerciseId);
  return runTransaction(db, async (transaction) => {
    const [canonicalSnapshot, sourceSnapshot] = await Promise.all([
      transaction.get(canonicalRef), transaction.get(sourceRef),
    ]);
    if (!canonicalSnapshot.exists() || !sourceSnapshot.exists()) throw new Error('Versão não encontrada.');
    const canonical = canonicalSnapshot.data() as AdminExerciseCanonical;
    const source = sourceSnapshot.data() as AdminExerciseVersion;
    assertAdminExerciseRevision({ currentVersion: canonical.currentVersion, expectedVersion: input.expectedVersion });
    const version = canonical.currentVersion + 1;
    const history: AdminExerciseVersion = {
      ...source, status: 'published', version, changeReason: input.reason.trim(),
      publishedAt: serverTimestamp(), publishedBy: input.updatedBy,
    };
    transaction.set(doc(canonicalRef, 'versions', versionDocumentId(version)), history);
    transaction.set(doc(db, PUBLISHED_EXERCISE_COLLECTION, input.exerciseId), publicProjection(source, source.content, version));
    transaction.update(canonicalRef, {
      ...source, status: 'published', currentVersion: version, draftRevision: 0,
      changeReason: input.reason.trim(), updatedAt: serverTimestamp(), updatedBy: input.updatedBy,
      publishedAt: serverTimestamp(), publishedBy: input.updatedBy,
      content: undefined, version: undefined,
    });
    transaction.delete(draftRef);
    return version;
  });
}

export async function duplicateAdminExercise(exerciseId: string, updatedBy: string): Promise<string> {
  await assertEditorialAdminAccess(updatedBy);
  const state = await getAdminExerciseState(exerciseId);
  if (!state) throw new Error('Exercício administrativo não encontrado.');
  const source = state.draft ?? state.published ?? await latestVersion(exerciseId);
  const content = 'content' in source ? source.content : contentFromPublished(source);
  return createAdminExerciseDraft({
    courseId: source.courseId, language: source.language, workbookId: source.workbookId,
    lessonId: source.lessonId, dayId: source.dayId, content,
    changeReason: `Duplicado de ${exerciseId}`, adminNote: '', relatedReportId: null,
    imageValidation: null, duplicatedFromExerciseId: exerciseId, updatedBy,
  });
}
