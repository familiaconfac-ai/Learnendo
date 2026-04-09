import type { UserRole, UserProfile, LanguagePermissions } from '../types';

const SESSION_KEY = 'lab_user_role';

const ALL_PERMISSIONS: LanguagePermissions = {
  canEditEnglish: true,
  canEditPortuguese: true,
  canEditSpanish: true,
  canEditGreek: true,
  canEditHebrew: true,
  canEditBible: true,
};

const ROLE_PERMISSIONS: Record<UserRole, LanguagePermissions> = {
  admin: ALL_PERMISSIONS,
  verified_editor: ALL_PERMISSIONS,
  teacher: {
    canEditEnglish: false,
    canEditPortuguese: false,
    canEditSpanish: false,
    canEditGreek: false,
    canEditHebrew: false,
    canEditBible: false,
  },
  viewer: {
    canEditEnglish: false,
    canEditPortuguese: false,
    canEditSpanish: false,
    canEditGreek: false,
    canEditHebrew: false,
    canEditBible: false,
  },
};

export function getSession(): UserProfile {
  const stored = localStorage.getItem(SESSION_KEY) as UserRole | null;
  const role: UserRole = stored ?? 'admin'; // default to admin in lab
  return {
    id: 'lab-user',
    name: 'Lab User',
    role,
    permissions: ROLE_PERMISSIONS[role],
  };
}

export function setRole(role: UserRole): void {
  localStorage.setItem(SESSION_KEY, role);
}

export function isAdminOrEditor(): boolean {
  const { role } = getSession();
  return role === 'admin' || role === 'verified_editor';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  viewer: 'Viewer',
  teacher: 'Teacher',
  verified_editor: 'Verified Editor',
  admin: 'Admin',
};

// ─── Navigation hook for Review section ──────────────────────────────────────

let _navigateToReview: (() => void) | null = null;

export function registerReviewNavigation(fn: () => void): void {
  _navigateToReview = fn;
}

export function requestReviewNavigation(): void {
  _navigateToReview?.();
}
