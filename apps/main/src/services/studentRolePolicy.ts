export type AccountRole = 'student' | 'teacher' | 'admin';

/**
 * Legacy student profiles may not have a role yet. Only accounts positively
 * identified by the users/{uid}.role source of truth as teacher/admin are
 * excluded from student datasets.
 */
export function isStudentAccountRole(role: unknown): boolean {
  return role !== 'teacher' && role !== 'admin';
}

export function partitionStudentAccounts<T extends { role?: AccountRole }>(accounts: T[]) {
  const students: T[] = [];
  const administrative: T[] = [];
  accounts.forEach((account) => {
    (isStudentAccountRole(account.role) ? students : administrative).push(account);
  });
  return { students, administrative };
}
