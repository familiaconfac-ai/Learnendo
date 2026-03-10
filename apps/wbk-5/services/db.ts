
import { collection, addDoc, serverTimestamp, doc, setDoc, updateDoc, getDoc, query, where, getDocs, increment } from "firebase/firestore";
import { db } from "./firebase";
import { AnswerLog, UserProgress } from "../types";

export interface AssessmentRecord {
  studentName: string;
  studentEmail: string;
  lesson: string;
  score: number;
  durationSeconds: number;
  allAnswers: AnswerLog[];
  timestamp?: any;
}

// ===== SESSION TRACKING =====

export interface SessionData {
  uid: string;
  loginTime: any;
  logoutTime?: any;
  durationSeconds?: number;
  status: "active" | "finished";
  lessonStarted?: number;
  device?: string;
}

export async function createSession(uid: string, lessonStarted?: number, device?: string): Promise<string | null> {
  if (!db) {
    console.warn("Firestore not initialized, skipping session creation.");
    return null;
  }

  try {
    const sessionRef = await addDoc(collection(db, `users/${uid}/sessions`), {
      loginTime: serverTimestamp(),
      lessonStarted: lessonStarted || null,
      device: device || null,
      status: "active",
    });
    console.log("Session created. ID:", sessionRef.id);
    return sessionRef.id;
  } catch (e) {
    console.error("Error creating session:", e);
    return null;
  }
}

export async function finishSession(uid: string, sessionId: string, durationSeconds: number): Promise<void> {
  if (!db || !sessionId) {
    console.warn("Firestore not initialized or invalid sessionId, skipping.");
    return;
  }

  try {
    const sessionDocRef = doc(db, `users/${uid}/sessions/${sessionId}`);
    await updateDoc(sessionDocRef, {
      logoutTime: serverTimestamp(),
      durationSeconds,
      status: "finished",
    });
    console.log("Session finished. Duration:", durationSeconds, "seconds");
  } catch (e) {
    console.error("Error finishing session:", e);
  }
}

// ===== STUDENT PROFILE =====

export interface StudentProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: any;
  lastActive: any;
  difficultyLevel: "easy" | "normal" | "hard";
  totalStudyTime: number;
}

export async function createStudentProfile(uid: string, email: string, displayName?: string): Promise<void> {
  if (!db) {
    console.warn("Firestore not initialized, skipping profile creation.");
    return;
  }

  try {
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, {
      uid,
      email,
      displayName: displayName || email.split("@")[0],
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      difficultyLevel: "normal",
      totalStudyTime: 0,
    }, { merge: true });
    console.log("Student profile created/updated for:", uid);
  } catch (e) {
    console.error("Error creating student profile:", e);
  }
}

export async function updateLastActive(uid: string): Promise<void> {
  if (!db) return;

  try {
    const userDocRef = doc(db, "users", uid);
    await updateDoc(userDocRef, {
      lastActive: serverTimestamp(),
    });
  } catch (e) {
    console.error("Error updating lastActive:", e);
  }
}

// ===== LESSON PROGRESS TRACKING =====

export interface LessonProgressData {
  lessonId: number;
  completedIslands: string[];
  completed: boolean;
  completionDate?: any;
  timeSpentSeconds: number;
  accuracyRate: number;
  diamondPercent: number;
}

export async function trackLessonProgress(
  uid: string,
  lessonId: number,
  completedIslands: string[],
  timeSpentSeconds: number,
  accuracyRate: number,
  diamondPercent: number
): Promise<void> {
  if (!db) {
    console.warn("Firestore not initialized, skipping lesson progress.");
    return;
  }

  try {
    const lessonProgressRef = doc(db, `users/${uid}/lessonProgress/${lessonId}`);
    const allCompleted = completedIslands.length >= 8; // Lesson 3 has 8 islands, others have 7

    await setDoc(lessonProgressRef, {
      lessonId,
      completedIslands,
      completed: allCompleted,
      completionDate: allCompleted ? serverTimestamp() : null,
      timeSpentSeconds,
      accuracyRate: Math.round(accuracyRate * 100) / 100,
      diamondPercent,
    }, { merge: true });

    console.log("Lesson progress tracked. Lesson:", lessonId, "Islands:", completedIslands.length);
  } catch (e) {
    console.error("Error tracking lesson progress:", e);
  }
}

// ===== ANSWER TRACKING =====

export interface AnswerTrackingData {
  lessonId: number;
  islandId: string;
  questionId: string;
  correct: boolean;
  studentAnswer: string;
  correctAnswer: string;
  responseTime: number; // milliseconds
  timestamp: any;
}

export async function trackAnswer(
  uid: string,
  lessonId: number,
  islandId: string,
  questionId: string,
  studentAnswer: string,
  correctAnswer: string,
  responseTime: number
): Promise<void> {
  if (!db) {
    console.warn("Firestore not initialized, skipping answer tracking.");
    return;
  }

  try {
    const answersRef = collection(db, `users/${uid}/answers`);
    await addDoc(answersRef, {
      lessonId,
      islandId,
      questionId,
      correct: studentAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim(),
      studentAnswer,
      correctAnswer,
      responseTime,
      timestamp: serverTimestamp(),
    });

    // Also update performance summary
    await updatePerformanceSummary(uid, studentAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim());
  } catch (e) {
    console.error("Error tracking answer:", e);
  }
}

// ===== PERFORMANCE SUMMARY =====

export interface PerformanceSummary {
  uid: string;
  totalCorrect: number;
  totalWrong: number;
  accuracyRate: number; // 0-100
  totalStudyTime: number;
  lessonsCompleted: number;
  currentStreakDays: number;
  lastUpdated: any;
}

export async function updatePerformanceSummary(uid: string, isCorrect: boolean): Promise<void> {
  if (!db) {
    console.warn("Firestore not initialized, skipping stats update.");
    return;
  }

  try {
    const statsDocRef = doc(db, `users/${uid}/stats`);

    // Get current stats to recalculate accuracy
    const statsSnap = await getDoc(statsDocRef);
    const currentStats = statsSnap.data() || { totalCorrect: 0, totalWrong: 0 };

    const newTotalCorrect = currentStats.totalCorrect + (isCorrect ? 1 : 0);
    const newTotalWrong = currentStats.totalWrong + (isCorrect ? 0 : 1);
    const newAccuracy = newTotalCorrect + newTotalWrong > 0 
      ? Math.round((newTotalCorrect / (newTotalCorrect + newTotalWrong)) * 100 * 100) / 100 
      : 0;

    await setDoc(statsDocRef, {
      uid,
      totalCorrect: newTotalCorrect,
      totalWrong: newTotalWrong,
      accuracyRate: newAccuracy,
      lastUpdated: serverTimestamp(),
    }, { merge: true });

    // Update difficulty if accuracy suggests a change
    await updateAdaptiveDifficulty(uid, newAccuracy);
  } catch (e) {
    console.error("Error updating performance summary:", e);
  }
}

export async function updateStudyTime(uid: string, additionalSeconds: number): Promise<void> {
  if (!db) {
    console.warn("Firestore not initialized, skipping study time update.");
    return;
  }

  try {
    const userDocRef = doc(db, "users", uid);
    const statsDocRef = doc(db, `users/${uid}/stats`);

    // Update both user doc and stats
    await updateDoc(userDocRef, {
      totalStudyTime: increment(additionalSeconds),
    });

    await updateDoc(statsDocRef, {
      totalStudyTime: increment(additionalSeconds),
      lastUpdated: serverTimestamp(),
    });

    console.log("Study time updated. Added:", additionalSeconds, "seconds");
  } catch (e) {
    console.error("Error updating study time:", e);
  }
}

// ===== ADAPTIVE DIFFICULTY =====

export async function updateAdaptiveDifficulty(uid: string, accuracyRate: number): Promise<void> {
  if (!db) {
    console.warn("Firestore not initialized, skipping difficulty update.");
    return;
  }

  try {
    const userDocRef = doc(db, "users", uid);
    let newDifficulty: "easy" | "normal" | "hard" = "normal";

    // Simple adaptive rules
    if (accuracyRate > 90) {
      newDifficulty = "hard";
    } else if (accuracyRate < 60) {
      newDifficulty = "easy";
    } else {
      newDifficulty = "normal";
    }

    await updateDoc(userDocRef, {
      difficultyLevel: newDifficulty,
      lastUpdated: serverTimestamp(),
    });

    console.log("Difficulty level updated to:", newDifficulty, "based on accuracy:", accuracyRate);
  } catch (e) {
    console.error("Error updating adaptive difficulty:", e);
  }
}

// ===== LESSON COMPLETION =====

export async function recordLessonCompletion(
  uid: string,
  lessonId: number,
  completionData: {
    completedIslands: string[];
    diamondPercent: number;
    timeSpentSeconds: number;
    totalCorrect: number;
    totalAnswers: number;
  }
): Promise<void> {
  if (!db) {
    console.warn("Firestore not initialized, skipping lesson completion.");
    return;
  }

  try {
    const accuracyRate = completionData.totalAnswers > 0 
      ? (completionData.totalCorrect / completionData.totalAnswers) * 100 
      : 0;

    // Track lesson progress
    await trackLessonProgress(
      uid,
      lessonId,
      completionData.completedIslands,
      completionData.timeSpentSeconds,
      accuracyRate,
      completionData.diamondPercent
    );

    // Update study time
    await updateStudyTime(uid, completionData.timeSpentSeconds);

    // Update stats with completion count
    const statsDocRef = doc(db, `users/${uid}/stats`);
    const statsSnap = await getDoc(statsDocRef);
    const currentLessonsCompleted = statsSnap.data()?.lessonsCompleted || 0;

    await updateDoc(statsDocRef, {
      lessonsCompleted: currentLessonsCompleted + 1,
      lastUpdated: serverTimestamp(),
    });

    console.log("Lesson completion recorded. Lesson:", lessonId);
  } catch (e) {
    console.error("Error recording lesson completion:", e);
  }
}

// ===== LEGACY ASSESSMENT SAVE =====

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
