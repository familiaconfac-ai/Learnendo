import {
  collection,
  doc,
  getDocFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  getAllowedViewModes,
  getDefaultViewMode,
  getEffectiveViewRole,
  getRoleModeMenuVisibility,
  normalizeUserViewMode,
  type UserRole,
  type UserViewMode,
} from './roleMode';

export {
  getAllowedViewModes,
  getDefaultViewMode,
  getEffectiveViewRole,
  getRoleModeMenuVisibility,
  normalizeUserViewMode,
};
export type { UserRole, UserViewMode };

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

export interface UserAccountProfileUpdate {
  name: string;
  email: string | null;
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
  // E-mail reservado pode iniciar a promoção que grava o papel no Firestore,
  // mas nunca concede autorização à interface por si só.
  void email;
  return normalizeUserRole(storedRole);
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

export async function updateUserAccountProfileDetails(
  uid: string,
  profile: UserAccountProfileUpdate,
  updatedByUid: string,
): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  if (!uid) return;

  const trimmedName = profile.name.trim();
  const trimmedEmail = profile.email?.trim() ?? '';

  await setDoc(
    doc(db, 'users', uid),
    {
      name: trimmedName || 'User',
      displayName: trimmedName || 'User',
      email: trimmedEmail || null,
      profileUpdatedAt: serverTimestamp(),
      profileUpdatedBy: updatedByUid,
    },
    { merge: true },
  );

  await setDoc(
    doc(db, 'progress', uid),
    {
      displayName: trimmedName || 'User',
      email: trimmedEmail || null,
      lastUpdated: new Date().toISOString(),
    },
    { merge: true },
  );
}

/**
 * Updates only the display name used by the teacher dashboard.
 * The authenticated administrator writes through Firestore security rules, so
 * this operation does not depend on server-side Google service credentials.
 */
export async function updateStudentDisplayName(
  uid: string,
  name: string,
  updatedByUid: string,
): Promise<string> {
  if (!db) throw new Error('Firestore is not initialized');

  const trimmedName = name.trim();
  if (!uid || !trimmedName) throw new Error('Student UID and name are required.');

  const userRef = doc(db, 'users', uid);
  const progressRef = doc(db, 'progress', uid);
  const batch = writeBatch(db);
  batch.set(userRef, {
    name: trimmedName,
    displayName: trimmedName,
    profileUpdatedAt: serverTimestamp(),
    profileUpdatedBy: updatedByUid,
  }, { merge: true });
  batch.set(progressRef, {
    displayName: trimmedName,
    lastUpdated: new Date().toISOString(),
  }, { merge: true });
  await batch.commit();

  const [userSnapshot, progressSnapshot] = await Promise.all([
    getDocFromServer(userRef),
    getDocFromServer(progressRef),
  ]);
  const userData = userSnapshot.data();
  const progressData = progressSnapshot.data();
  if (userData?.name !== trimmedName || userData?.displayName !== trimmedName || progressData?.displayName !== trimmedName) {
    throw new Error('Firestore name write could not be verified.');
  }

  return trimmedName;
}
