
// Fix: Use separate imports for types and values to help TS resolve modular SDK exports correctly
import { initializeApp, getApps, getApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { AnswerLog } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyDrZAa3AWzNRM-feVFpI1uSQEyZFY7Br0Q",
  authDomain: "learnendo-6f4d3.firebaseapp.com",
  projectId: "learnendo-6f4d3",
  storageBucket: "learnendo-6f4d3.firebasestorage.app",
  messagingSenderId: "374116570894",
  appId: "1:374116570894:web:58b9901cbc0efc9a43295f",
  measurementId: "G-VLJ3SNHD67"
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  // Fix: Standard initialization pattern for Firebase v9+ to prevent duplicate app errors
  const currentApps = getApps();
  app = currentApps.length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export interface AssessmentRecord {
  studentName: string;
  studentEmail: string;
  lesson: string;
  score: number;
  durationSeconds: number;
  allAnswers: AnswerLog[];
  timestamp?: any;
}

/**
 * Saves the assessment result to Firestore.
 */
export async function saveAssessmentResult(record: Omit<AssessmentRecord, 'timestamp'>) {
  if (!db) {
    console.warn("Firestore not initialized, skipping save.");
    return null;
  }

  try {
    const docRef = await addDoc(collection(db, "assessments"), {
      ...record,
      timestamp: serverTimestamp(),
    });
    console.log("Assessment saved. ID:", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Error saving assessment result:", e);
    return null;
  }
}

export { db, auth };
