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

export type AdminStudentUpdateField = 'name' | 'email' | 'disabled' | 'class';
export interface AdminStudentUpdateIssue {
  field: AdminStudentUpdateField;
  stage: string;
  code: string;
  message: string;
}
export interface AdminStudentUpdateResult {
  ok: boolean;
  partial: boolean;
  fields: Record<AdminStudentUpdateField, 'not-requested' | 'saved' | 'unchanged' | 'failed'>;
  errors: AdminStudentUpdateIssue[];
  warnings: AdminStudentUpdateIssue[];
  account: AdminStudentAccount | null;
  profile: PersistedAdminStudentProfile;
}

export class AdminStudentApiError extends Error {
  constructor(message: string, readonly code?: string | null, readonly technical?: { code?: string; message?: string }) {
    super(message);
    this.name = 'AdminStudentApiError';
  }
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
    partial?: boolean;
    fields?: AdminStudentUpdateResult['fields'];
    errors?: AdminStudentUpdateIssue[];
    warnings?: AdminStudentUpdateIssue[];
    code?: string | null;
    technical?: { code?: string; message?: string };
  };
  try {
    result = JSON.parse(rawResponse) as typeof result;
  } catch {
    throw new Error(response.ok
      ? 'The admin endpoint returned an invalid response and did not confirm persistence.'
      : fallbackMessage);
  }
  if (!response.ok) {
    const diagnostic = result.technical?.message
      ? `${result.error || fallbackMessage} (${result.technical.code ?? result.code ?? 'unknown'}: ${result.technical.message})`
      : result.error || fallbackMessage;
    throw new AdminStudentApiError(diagnostic, result.code, result.technical);
  }
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

export async function updateAdminStudent(user: User, input: { uid: string; name?: string; email?: string; disabled?: boolean; groupId?: string | null }) {
  const result = await callAdminStudents(user, { action: 'update', ...input }, 'Failed to update student.');
  if (!result.fields || !result.profile) {
    throw new Error('The server did not return field-level persistence confirmation.');
  }
  return {
    ok: result.ok === true,
    partial: result.partial === true,
    fields: result.fields,
    errors: result.errors ?? [],
    warnings: result.warnings ?? [],
    account: result.account ?? null,
    profile: result.profile,
  } satisfies AdminStudentUpdateResult;
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
