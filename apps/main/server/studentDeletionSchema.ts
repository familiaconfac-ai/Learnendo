export const USER_OWNED_SUBCOLLECTIONS = [
  'profile',
  'payments',
  'sessions',
  'placementTests',
  'progress',
  'dailyAccess',
  'lessonProgress',
  'answers',
  'stats',
  'weeklyProgress',
  'courseProgress',
  'meta',
  'vocabulary',
] as const;

export type DeletionTargetRole = 'student' | 'teacher' | 'admin' | undefined;

export function getStudentDeletionBlockReason(
  requesterUid: string,
  targetUid: string,
  targetRole: DeletionTargetRole,
): string | null {
  if (!targetUid) return 'Student UID is required.';
  if (targetUid === requesterUid) return 'You cannot delete your own administrator account.';
  if (targetRole === 'admin' || targetRole === 'teacher') {
    const article = targetRole === 'admin' ? 'an' : 'a';
    return `This account is ${article} ${targetRole}, not a student, and was not deleted.`;
  }
  return null;
}

export function removeUidFromRecord(value: unknown, uid: string): { value: Record<string, unknown>; changed: boolean } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { value: {}, changed: false };
  const source = value as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(source, uid)) return { value: source, changed: false };
  const next = { ...source };
  delete next[uid];
  return { value: next, changed: true };
}

export function removeStudentFromRoster(
  data: { assignedStudentIds?: unknown; assignedStudentNames?: unknown },
  uid: string,
) {
  const ids = Array.isArray(data.assignedStudentIds)
    ? data.assignedStudentIds.filter((item: unknown): item is string => typeof item === 'string')
    : [];
  const names = Array.isArray(data.assignedStudentNames)
    ? data.assignedStudentNames.filter((item: unknown): item is string => typeof item === 'string')
    : [];
  const pairs = ids.map((id, index) => ({ id, name: names[index] ?? id }));
  const remaining = pairs.filter((item) => item.id !== uid);
  return {
    changed: remaining.length !== pairs.length,
    assignedStudentIds: remaining.map((item) => item.id),
    assignedStudentNames: remaining.map((item) => item.name),
  };
}

export function canDeleteOwnedBattleTemplate(data: { visibility?: unknown }): boolean {
  return data.visibility !== 'teachers';
}
