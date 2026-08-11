import type { User } from 'firebase/auth';

export interface AdminStudentAccount {
  uid: string;
  email: string | null;
  displayName: string | null;
  disabled: boolean;
  emailVerified: boolean;
  creationTime: string;
  lastSignInTime: string | null;
  providerIds: string[];
}

export interface StudentDeletionResult {
  uid: string;
  completed: boolean;
  auth: 'deleted' | 'not-found' | 'failed';
  deletedDocuments: number;
  updatedSharedDocuments: number;
  cleanup: Record<string, number>;
  issues: Array<{ scope: string; message: string }>;
}

export interface AdminStudentDetails {
  account: AdminStudentAccount | null;
  authStatus: 'found' | 'not-found';
}

export interface PersistedAdminStudentProfile {
  uid: string;
  name: string;
  displayName: string;
  email: string;
}

type AdminStudentPayload = Record<string, unknown> & { action: 'details' | 'create' | 'update' | 'setPassword' | 'delete' };

async function callAdminStudents(user: User, payload: AdminStudentPayload, fallbackMessage: string) {
  const token = await user.getIdToken();
  const response = await fetch('/api/admin-students', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const rawResponse = await response.text();
  let result: {
    error?: string;
    account?: AdminStudentAccount | null;
    authStatus?: 'found' | 'not-found';
    deletion?: StudentDeletionResult;
    profile?: PersistedAdminStudentProfile;
    ok?: boolean;
  };
  try {
    result = JSON.parse(rawResponse) as typeof result;
  } catch {
    throw new Error(response.ok
      ? 'The admin endpoint returned an invalid response and did not confirm persistence.'
      : fallbackMessage);
  }
  if (!response.ok) throw new Error(result.error || fallbackMessage);
  return result;
}

export async function getAdminStudentDetails(user: User, uid: string) {
  const result = await callAdminStudents(user, { action: 'details', uid }, 'Failed to load authentication information.');
  return {
    account: result.account ?? null,
    authStatus: result.authStatus ?? (result.account ? 'found' : 'not-found'),
  } satisfies AdminStudentDetails;
}

export async function createAdminStudent(user: User, input: { name: string; email: string; password: string; disabled: boolean; groupId: string | null }) {
  return callAdminStudents(user, { action: 'create', ...input }, 'Failed to create student.');
}

export async function updateAdminStudent(user: User, input: { uid: string; name: string; email: string; disabled?: boolean; groupId?: string | null }) {
  const result = await callAdminStudents(user, { action: 'update', ...input }, 'Failed to update student.');
  if (!result.ok || !result.account || !result.profile) {
    throw new Error('The server did not confirm the persisted student profile.');
  }
  return { account: result.account, profile: result.profile };
}

export async function setAdminStudentPassword(user: User, uid: string, password: string) {
  return callAdminStudents(user, { action: 'setPassword', uid, password }, 'Failed to set password.');
}

export async function deleteAdminStudent(user: User, uid: string) {
  const result = await callAdminStudents(user, { action: 'delete', uid }, 'Failed to delete student.');
  if (!result.deletion) throw new Error('The deletion result was not returned.');
  return result.deletion;
}

export function generateTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
}
