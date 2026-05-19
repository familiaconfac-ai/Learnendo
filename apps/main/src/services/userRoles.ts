import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export type UserRole = 'student' | 'teacher' | 'admin';
export type UserViewMode = 'student' | 'teacher' | 'admin';

export interface UserAccountProfile {
  uid: string;
  name: string;
  email: string | null;
  role: UserRole;
  assignedTeacherUid?: string | null;
  assignedTeacherName?: string | null;
  roleSource: 'firestore' | 'reserved-admin' | 'default-student';
  isAnonymous: boolean;
  createdAt?: unknown;
  lastActive?: unknown;
  lastLoginAt?: unknown;
}

const RESERVED_ADMIN_EMAILS = new Set([
  'learnendo@gmail.com',
  'jdhufstetler@gmail.com',
]);

export const PENDING_VIEW_MODE_STORAGE_KEY = 'learnendo_pending_view_mode';

export function isReservedAdminEmail(email?: string | null): boolean {
  return RESERVED_ADMIN_EMAILS.has((email ?? '').trim().toLowerCase());
}

export function normalizeUserRole(role?: string | null): UserRole {
  if (role === 'admin') return 'admin';
  if (role === 'teacher') return 'teacher';
  return 'student';
}

export function getEffectiveUserRole(email?: string | null, storedRole?: string | null): UserRole {
  if (isReservedAdminEmail(email)) return 'admin';
  return normalizeUserRole(storedRole);
}

export function getAllowedViewModes(role: UserRole): UserViewMode[] {
  if (role === 'admin') return ['student', 'teacher', 'admin'];
  if (role === 'teacher') return ['student', 'teacher'];
  return ['student', 'teacher'];
}

export function getDefaultViewMode(role: UserRole): UserViewMode {
  if (role === 'admin') return 'admin';
  if (role === 'teacher') return 'teacher';
  return 'student';
}

export function normalizeUserViewMode(role: UserRole, requested?: string | null): UserViewMode {
  const allowed = getAllowedViewModes(role);
  if (requested && allowed.includes(requested as UserViewMode)) {
    return requested as UserViewMode;
  }
  return getDefaultViewMode(role);
}

export function getUserViewModeStorageKey(uid: string): string {
  return `learnendo_user_view_mode_${uid}`;
}

function mapUserAccountProfile(
  uid: string,
  data: Record<string, any> | undefined,
  emailFallback?: string | null,
): UserAccountProfile {
  const email = (data?.email ?? emailFallback ?? null) as string | null;
  const roleSource = isReservedAdminEmail(email)
    ? 'reserved-admin'
    : data?.role
      ? 'firestore'
      : 'default-student';

  return {
    uid,
    name: data?.name ?? data?.displayName ?? email?.split('@')[0] ?? 'User',
    email,
    role: getEffectiveUserRole(email, data?.role ?? null),
    assignedTeacherUid: (data?.assignedTeacherUid ?? null) as string | null,
    assignedTeacherName: (data?.assignedTeacherName ?? null) as string | null,
    roleSource,
    isAnonymous: Boolean(data?.isAnonymous),
    createdAt: data?.createdAt,
    lastActive: data?.lastActive,
    lastLoginAt: data?.lastLoginAt,
  };
}

export function subscribeUserAccountProfile(
  uid: string,
  emailFallback: string | null | undefined,
  onData: (profile: UserAccountProfile) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!db || !uid) {
    onData(mapUserAccountProfile(uid, undefined, emailFallback));
    return () => {};
  }

  const userRef = doc(db, 'users', uid);
  return onSnapshot(
    userRef,
    (snapshot) => {
      onData(mapUserAccountProfile(uid, snapshot.data() as Record<string, any> | undefined, emailFallback));
    },
    (error) => {
      if (onError) onError(error);
    },
  );
}

export function subscribeUserAccounts(
  onData: (accounts: UserAccountProfile[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!db) {
    onData([]);
    return () => {};
  }

  const usersQuery = query(collection(db, 'users'));
  return onSnapshot(
    usersQuery,
    (snapshot) => {
      const accounts = snapshot.docs
        .map((item) => mapUserAccountProfile(item.id, item.data() as Record<string, any> | undefined))
        .sort((left, right) => {
          const roleWeight = { admin: 0, teacher: 1, student: 2 } as const;
          if (roleWeight[left.role] !== roleWeight[right.role]) {
            return roleWeight[left.role] - roleWeight[right.role];
          }

          const leftName = (left.name || left.email || left.uid).toLowerCase();
          const rightName = (right.name || right.email || right.uid).toLowerCase();
          return leftName.localeCompare(rightName);
        });

      onData(accounts);
    },
    (error) => {
      if (onError) onError(error);
    },
  );
}

export async function updateUserAccountRole(
  uid: string,
  role: UserRole,
  updatedByUid: string,
): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  if (!uid) return;

  await setDoc(
    doc(db, 'users', uid),
    {
      role,
      roleUpdatedAt: serverTimestamp(),
      roleUpdatedBy: updatedByUid,
    },
    { merge: true },
  );
}

export async function updateUserAssignedTeacher(
  uid: string,
  teacherUid: string | null,
  teacherName: string | null,
  updatedByUid: string,
): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  if (!uid) return;

  await setDoc(
    doc(db, 'users', uid),
    {
      assignedTeacherUid: teacherUid,
      assignedTeacherName: teacherName,
      assignedTeacherUpdatedAt: serverTimestamp(),
      assignedTeacherUpdatedBy: updatedByUid,
    },
    { merge: true },
  );
}
