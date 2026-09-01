export type UserRole = 'student' | 'teacher' | 'admin';
export type UserViewMode = 'student' | 'teacher' | 'admin';

export function getAllowedViewModes(role: UserRole): UserViewMode[] {
  if (role === 'admin') return ['student', 'teacher', 'admin'];
  if (role === 'teacher') return ['student', 'teacher'];
  return ['student'];
}

export function getDefaultViewMode(role: UserRole): UserViewMode {
  if (role === 'admin') return 'admin';
  if (role === 'teacher') return 'teacher';
  return 'student';
}

export function normalizeUserViewMode(role: UserRole, requested?: string | null): UserViewMode {
  const allowed = getAllowedViewModes(role);
  if (requested && allowed.includes(requested as UserViewMode)) return requested as UserViewMode;
  return getDefaultViewMode(role);
}

export function getEffectiveViewRole(actualRole: UserRole, requested?: string | null): UserRole {
  return normalizeUserViewMode(actualRole, requested);
}

export function getRoleModeMenuVisibility(effectiveRole: UserRole) {
  return {
    teacherDashboard: effectiveRole === 'teacher',
    problemReports: effectiveRole === 'admin',
    generalProblemReport: effectiveRole !== 'admin',
  };
}
