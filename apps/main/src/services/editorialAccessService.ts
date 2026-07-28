import { doc, getDoc } from 'firebase/firestore';
import { auth, db, firebaseRuntimeConfig } from './firebase';

type AccessError = Error & { code?: string };

export interface EditorialAdminDiagnostic {
  authUid: string | null;
  authEmail: string | null;
  projectId: string;
  storageBucket: string;
  userDocumentPath: string;
  expectedUidMatchesAuth: boolean;
  userDocumentExists: boolean | null;
  role: unknown;
  roleType: string;
  isExactAdminRole: boolean;
  readErrorCode?: string;
  readErrorMessage?: string;
}

function accessError(code: string, message: string): AccessError {
  const error = new Error(message) as AccessError;
  error.code = code;
  return error;
}

function valueType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

export async function readEditorialAdminDiagnostic(expectedUid?: string): Promise<EditorialAdminDiagnostic> {
  const user = auth.currentUser;
  const authUid = user?.uid ?? null;
  const userDocumentPath = authUid ? `users/${authUid}` : 'users/{sem-uid-autenticado}';
  const base = {
    authUid,
    authEmail: user?.email ?? null,
    projectId: firebaseRuntimeConfig.projectId,
    storageBucket: firebaseRuntimeConfig.storageBucket,
    userDocumentPath,
    expectedUidMatchesAuth: !expectedUid || authUid === expectedUid,
  };

  if (!user) return {
    ...base,
    userDocumentExists: null,
    role: undefined,
    roleType: 'undefined',
    isExactAdminRole: false,
    readErrorCode: 'unauthenticated',
    readErrorMessage: 'Não há usuário autenticado.',
  };

  try {
    const profile = await getDoc(doc(db, 'users', user.uid));
    const role = profile.exists() ? profile.data()?.role : undefined;
    return {
      ...base,
      userDocumentExists: profile.exists(),
      role,
      roleType: valueType(role),
      isExactAdminRole: role === 'admin',
    };
  } catch (cause) {
    const error = cause as { code?: string; message?: string };
    return {
      ...base,
      userDocumentExists: null,
      role: undefined,
      roleType: 'undefined',
      isExactAdminRole: false,
      readErrorCode: error?.code ?? 'unknown',
      readErrorMessage: error?.message ?? String(cause),
    };
  }
}

export async function assertEditorialAdminAccess(expectedUid?: string): Promise<EditorialAdminDiagnostic> {
  const diagnostic = await readEditorialAdminDiagnostic(expectedUid);
  if (!diagnostic.authUid) throw accessError('unauthenticated', 'Não há usuário autenticado.');
  if (!diagnostic.expectedUidMatchesAuth) throw accessError('unauthenticated', 'A sessão administrativa mudou. Entre novamente.');
  if (diagnostic.readErrorCode) {
    throw accessError(diagnostic.readErrorCode, diagnostic.readErrorMessage ?? 'Falha ao consultar o perfil administrativo.');
  }
  if (!diagnostic.userDocumentExists || !diagnostic.isExactAdminRole) {
    throw accessError('permission-denied', 'O perfil autenticado não possui role admin no Firestore.');
  }
  return diagnostic;
}
