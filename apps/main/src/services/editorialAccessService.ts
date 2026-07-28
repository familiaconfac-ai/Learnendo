import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

type AccessError = Error & { code?: string };

function accessError(code: string, message: string): AccessError {
  const error = new Error(message) as AccessError;
  error.code = code;
  return error;
}

export async function assertEditorialAdminAccess(expectedUid?: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw accessError('unauthenticated', 'Não há usuário autenticado.');
  if (expectedUid && user.uid !== expectedUid) throw accessError('unauthenticated', 'A sessão administrativa mudou. Entre novamente.');

  const profile = await getDoc(doc(db, 'users', user.uid));
  if (!profile.exists() || profile.data()?.role !== 'admin') {
    throw accessError('permission-denied', 'O perfil autenticado não possui role admin no Firestore.');
  }
}
