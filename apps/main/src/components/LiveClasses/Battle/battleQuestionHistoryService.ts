import { arrayUnion, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import type { BattleConfig } from './battleTypes';

type BattleHistoryContext = Pick<BattleConfig, 'courseId' | 'workbookId' | 'lessonId' | 'trailIds'> & {
  classId?: string | null;
  teacherId?: string | null;
};

function sanitizeTrailIds(trailIds?: string[] | null): string[] {
  return Array.from(new Set((trailIds ?? []).map((trailId) => trailId?.trim()).filter(Boolean)));
}

function sanitizeQuestionIds(questionIds: string[]): string[] {
  return Array.from(new Set(questionIds.map((questionId) => questionId?.trim()).filter(Boolean)));
}

function sanitizeDocIdPart(value: string | number | null | undefined, fallback: string): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) return fallback;
  return normalized.replace(/[\/\\?#\[\]]/g, '_');
}

function buildLocalHistoryStorageKey(config: Pick<BattleConfig, 'courseId' | 'workbookId' | 'lessonId' | 'trailIds'>): string {
  const trailKey = sanitizeTrailIds(config.trailIds).join('|') || 'all-trails';
  return `learnendo_battle_history:${config.courseId ?? 'course'}:${config.workbookId ?? 'book'}:${config.lessonId ?? 'lesson'}:${trailKey}`;
}

function buildSharedHistoryDocId(context: BattleHistoryContext): string {
  const trailKey = sanitizeTrailIds(context.trailIds).join('__') || 'all-trails';
  return [
    sanitizeDocIdPart(context.teacherId, 'teacher'),
    sanitizeDocIdPart(context.workbookId, 'book'),
    sanitizeDocIdPart(context.lessonId, 'lesson'),
    trailKey,
  ].join('__');
}

function getSharedHistoryDocRef(context: Required<Pick<BattleHistoryContext, 'classId' | 'teacherId'>>) {
  return doc(
    db,
    'liveClasses',
    context.classId,
    'battleQuestionHistory',
    buildSharedHistoryDocId(context),
  );
}

export function readLocalBattleQuestionIds(
  config: Pick<BattleConfig, 'courseId' | 'workbookId' | 'lessonId' | 'trailIds'>,
): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(buildLocalHistoryStorageKey(config));
    return raw ? sanitizeQuestionIds(JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function recordLocalBattleQuestionIds(
  config: Pick<BattleConfig, 'courseId' | 'workbookId' | 'lessonId' | 'trailIds'>,
  questionIds: string[],
): void {
  if (typeof window === 'undefined') return;

  try {
    const nextIds = sanitizeQuestionIds([
      ...readLocalBattleQuestionIds(config),
      ...questionIds,
    ]);
    window.localStorage.setItem(buildLocalHistoryStorageKey(config), JSON.stringify(nextIds));
  } catch {
    // Ignore storage quota and privacy mode failures.
  }
}

export async function readSharedBattleQuestionIds(context: BattleHistoryContext): Promise<string[]> {
  if (!db || !context.classId || !context.teacherId) return [];

  try {
    const snapshot = await getDoc(getSharedHistoryDocRef({
      classId: context.classId,
      teacherId: context.teacherId,
      courseId: context.courseId,
      workbookId: context.workbookId,
      lessonId: context.lessonId,
      trailIds: context.trailIds,
    }));
    const usedQuestionIds = snapshot.data()?.usedQuestionIds;
    return Array.isArray(usedQuestionIds) ? sanitizeQuestionIds(usedQuestionIds as string[]) : [];
  } catch (error) {
    console.warn('[battleQuestionHistory] failed to load shared history:', error);
    return [];
  }
}

export async function recordUsedBattleQuestionIds(
  context: BattleHistoryContext,
  questionIds: string[],
): Promise<void> {
  const normalizedQuestionIds = sanitizeQuestionIds(questionIds);
  if (!normalizedQuestionIds.length) return;

  recordLocalBattleQuestionIds(context, normalizedQuestionIds);

  if (!db || !context.classId || !context.teacherId) return;

  const docRef = getSharedHistoryDocRef({
    classId: context.classId,
    teacherId: context.teacherId,
    courseId: context.courseId,
    workbookId: context.workbookId,
    lessonId: context.lessonId,
    trailIds: context.trailIds,
  });
  const existingSnapshot = await getDoc(docRef);

  await setDoc(
    docRef,
    {
      classId: context.classId,
      teacherId: context.teacherId,
      courseId: context.courseId ?? null,
      workbookId: context.workbookId ?? null,
      lessonId: context.lessonId ?? null,
      trailIds: sanitizeTrailIds(context.trailIds),
      usedQuestionIds: arrayUnion(...normalizedQuestionIds),
      ...(existingSnapshot.exists() ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
      lastUsedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
