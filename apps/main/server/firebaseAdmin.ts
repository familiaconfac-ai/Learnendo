import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function getCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) {
    if (process.env.VERCEL) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is required for Firebase Admin on Vercel.');
    }
    return applicationDefault();
  }

  let serviceAccount: { project_id: string; client_email: string; private_key: string };
  try {
    serviceAccount = JSON.parse(raw) as typeof serviceAccount;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY must contain valid service-account JSON.');
  }
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is missing project_id, client_email, or private_key.');
  }
  return cert({
    projectId: serviceAccount.project_id,
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
  });
}

const adminApp = getApps()[0] ?? initializeApp({
  credential: getCredential(),
  projectId: process.env.FIREBASE_PROJECT_ID?.trim() || 'learnendo-6f4d3',
});

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminMessaging = getMessaging(adminApp);

export async function requireAdmin(authorization?: string) {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error('Authentication required.'), { statusCode: 401 });

  const decoded = await adminAuth.verifyIdToken(match[1]);
  const profile = await adminDb.doc(`users/${decoded.uid}`).get();
  if (!profile.exists || profile.data()?.role !== 'admin') {
    throw Object.assign(new Error('Administrator access required.'), { statusCode: 403 });
  }
  return decoded;
}
