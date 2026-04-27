import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, setPersistence, browserLocalPersistence, linkWithCredential, EmailAuthProvider, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDrZAa3AWzNRM-feVFpI1uSQEyZFY7Br0Q",
  authDomain: "learnendo-6f4d3.firebaseapp.com",
  projectId: "learnendo-6f4d3",
  storageBucket: "learnendo-6f4d3.firebasestorage.app",
  messagingSenderId: "374116570894",
  appId: "1:374116570894:web:58b9901cbc0efc9a43295f",
  measurementId: "G-VLJ3SNHD67"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = (() => {
  try {
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      experimentalForceLongPolling: true,
    });
  } catch (error) {
    console.warn('[Firebase] Falling back to existing Firestore instance:', error);
    return getFirestore(app);
  }
})();

// Enable LOCAL persistence — users stay logged in across page reloads
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('[Firebase] Could not set persistence:', error);
});

// Initialize Analytics conditionally
let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, db, analytics };

export async function loginWithEmail(email: string, pass: string) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error("Error signing in with email", error);
    throw error;
  }
}

export async function registerWithEmail(email: string, pass: string, fullName: string) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(result.user, { displayName: fullName });
    return result.user;
  } catch (error) {
    console.error("Error registering with email", error);
    throw error;
  }
}

/**
 * Ensures the user is authenticated anonymously.
 * ALWAYS returns a real Firebase Auth user or throws an error.
 * Eliminates any fallback that creates fake/mock users.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function ensureAnonAuth(): Promise<{ uid: string; isAnonymous: boolean }> {
  // If already authenticated, return immediately
  if (auth.currentUser) {
    console.log('[Firebase] User already authenticated:', auth.currentUser.uid);
    return { uid: auth.currentUser.uid, isAnonymous: auth.currentUser.isAnonymous };
  }

  // Wait for auth state to settle
  console.log('[Firebase] Waiting for auth state to settle...');
  await new Promise<void>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      unsubscribe();
      resolve();
    });
  });

  // If user exists after settling, return it
  if (auth.currentUser) {
    console.log('[Firebase] Auth state settled, user found:', auth.currentUser.uid);
    return { uid: auth.currentUser.uid, isAnonymous: auth.currentUser.isAnonymous };
  }

  // Otherwise, attempt anonymous sign-in
  console.log('[Firebase] No user found, attempting anonymous sign-in...');
  try {
    const cred = await signInAnonymously(auth);
    console.log('[Firebase] Anonymous sign-in successful:', cred.user.uid);
    return { uid: cred.user.uid, isAnonymous: true };
  } catch (err: any) {
    if (err.code === 'auth/admin-restricted-operation') {
      const msg = 'Anonymous Auth is disabled in Firebase Console. Please enable it in Authentication > Sign-in method.';
      console.error('[Firebase]', msg);
      throw new Error(msg);
    } else {
      console.error('[Firebase] Auth Error:', err);
      throw err;
    }
  }
}

/**
 * convertAnonymousToUser
 * Converts an anonymous Firebase user to a registered user with email/password.
 * 
 * IMPORTANT:
 * - User MUST be currently logged in as anonymous
 * - The UID stays the same (no data loss)
 * - Email must not be already registered in Firebase
 * - After conversion, update Firestore profile with email
 * 
 * @param email - Email address for the new account
 * @param password - Password for the new account (min 6 chars)
 * @returns The updated user with new email
 */
export async function convertAnonymousToUser(email: string, password: string) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('[Firebase] No user logged in. Cannot convert.');
  }

  if (!currentUser.isAnonymous) {
    throw new Error('[Firebase] User is not anonymous. Conversion not needed.');
  }

  if (password.length < 6) {
    throw new Error('[Firebase] Password must be at least 6 characters.');
  }

  try {
    console.log('[Firebase] Converting anonymous user to registered:', currentUser.uid);

    // Create email credential
    const credential = EmailAuthProvider.credential(email, password);

    // Link the credential to the current anonymous account
    // This preserves the UID and all associated data
    const result = await linkWithCredential(currentUser, credential);

    console.log('[Firebase] ✅ Conversion successful. Email:', email, 'UID:', result.user.uid);

    return {
      uid: result.user.uid,
      email: result.user.email,
      isAnonymous: result.user.isAnonymous,
      displayName: result.user.displayName,
    };
  } catch (error: any) {
    // Handle common conversion errors
    if (error.code === 'auth/email-already-in-use') {
      const msg = 'This email is already registered. Please use a different email.';
      console.error('[Firebase]', msg);
      throw new Error(msg);
    } else if (error.code === 'auth/weak-password') {
      const msg = 'Password is too weak. Please use a stronger password.';
      console.error('[Firebase]', msg);
      throw new Error(msg);
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      const msg = 'This email is associated with a different login method.';
      console.error('[Firebase]', msg);
      throw new Error(msg);
    } else {
      console.error('[Firebase] Conversion Error:', error);
      throw error;
    }
  }
}
