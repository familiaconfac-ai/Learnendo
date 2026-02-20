import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Analytics conditionally
let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, db, analytics, googleProvider };

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
}

/**
 * Ensures the user is authenticated anonymously.
 */
export async function ensureAnonAuth(): Promise<{ uid: string; isAnonymous: boolean }> {
  if (auth.currentUser) {
    return { uid: auth.currentUser.uid, isAnonymous: auth.currentUser.isAnonymous };
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        resolve({ uid: user.uid, isAnonymous: user.isAnonymous });
      } else {
        try {
          const cred = await signInAnonymously(auth);
          resolve({ uid: cred.user.uid, isAnonymous: true });
        } catch (err: any) {
          console.error("Firebase Auth Error:", err);
          reject(err);
        }
      }
    });
  });
}