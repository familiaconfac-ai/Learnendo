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

type AdminStudentPayload = Record<string, unknown> & { action: 'details' | 'create' | 'update' | 'setPassword' };

async function callAdminStudents(user: User, payload: AdminStudentPayload) {
  const token = await user.getIdToken();
  const response = await fetch('/api/admin-students', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({})) as { error?: string; account?: AdminStudentAccount; ok?: boolean };
  if (!response.ok) throw new Error(result.error || 'Administrative operation failed.');
  return result;
}

export async function getAdminStudentDetails(user: User, uid: string) {
  const result = await callAdminStudents(user, { action: 'details', uid });
  if (!result.account) throw new Error('Student account details were not returned.');
  return result.account;
}

export async function createAdminStudent(user: User, input: { name: string; email: string; password: string; disabled: boolean; groupId: string | null }) {
  return callAdminStudents(user, { action: 'create', ...input });
}

export async function updateAdminStudent(user: User, input: { uid: string; name: string; email: string; disabled?: boolean; groupId?: string | null }) {
  return callAdminStudents(user, { action: 'update', ...input });
}

export async function setAdminStudentPassword(user: User, uid: string, password: string) {
  return callAdminStudents(user, { action: 'setPassword', uid, password });
}

export function generateTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
}
