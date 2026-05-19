
import { collection, addDoc, serverTimestamp, doc, setDoc, updateDoc, getDoc, query, where, getDocs, increment } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebase";
import { AnswerLog, UserProgress } from "../types";
import type { User } from "firebase/auth";

// ==========================================
// PRODUCTION-READY FIRESTORE ARCHITECTURE
// ==========================================

/**
 * STRUCTURE:
 * /users/{uid}
 *   - name: string
 *   - email: string | null
 *   - isAnonymous: boolean
 *   - createdAt: serverTimestamp
 *   - lastLoginAt: serverTimestamp
 *
 * /users/{uid}/sessions/{sessionId}
 *   - loginAt: serverTimestamp
 *   - device: string
 *   - appVersion: string
 *
 * /users/{uid}/placementTests/{testId}
 *   - score: number
 *   - percentage: number
 *   - level: string
 *   - answers: number[]
 *   - createdAt: serverTimestamp
 *
 * /users/{uid}/progress/{lessonId}
 *   - lessonId: string
 *   - completed: boolean
 *   - score: number
 *   - attempts: number
 *   - lastAccessedAt: serverTimestamp
 */

// ===== CORE HELPER FUNCTIONS =====

/**
 * createOrUpdateUserProfile
 * Creates or updates user document at /users/{uid}
 * Requires real Firebase Auth user
 * @param user - Firebase Auth user object
 * @param emailOverride - Optional email to use instead of user.email
 */
export async function createOrUpdateUserProfile(user: User, emailOverride?: string): Promise<void> {
  if (!user?.uid) {
    throw new Error('[DB] createOrUpdateUserProfile: user.uid is required');
  }
  if (!db) {
    console.warn('[DB] Firestore not initialized');
    return;
  }

  try {
    const userDoc = doc(db, 'users', user.uid);
    const existingSnapshot = await getDoc(userDoc);
    const existingData = existingSnapshot.data() || {};
    const emailToUse = existingData.email || emailOverride || user.email || null;
    const nameToUse =
      user.displayName?.trim() ||
      existingData.name ||
      existingData.displayName ||
      (emailToUse ? String(emailToUse).split('@')[0] : 'User');
    
    await setDoc(userDoc, {
      uid: user.uid,
      name: nameToUse,
      displayName: nameToUse,
      email: emailToUse,
      isAnonymous: user.isAnonymous,
      wasAnonymous: user.isAnonymous === false && user.email ? true : false, // Track if converted from anonymous
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    }, { merge: true });

    console.log('[DB] User profile created/updated:', user.uid, { email: emailToUse });
  } catch (error) {
    console.error('[DB] Error creating user profile:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// Admin role management
// ─────────────────────────────────────────────────────────────

/**
 * Emails that should always have role: "admin" in Firestore.
 * Add new admins here — the promotion runs automatically on their next login.
 */
const ADMIN_EMAILS: readonly string[] = [
  'learnendo@gmail.com',
  'jdhufstetler@gmail.com',
];

/**
 * Returns true when the given Firestore user document has role === "admin".
 * Safe to call with null / undefined.
 */
export function isAdmin(userData: Record<string, unknown> | null | undefined): boolean {
  return userData?.role === 'admin';
}

/**
 * If the signed-in user's email is in ADMIN_EMAILS, ensures their Firestore
 * document has { role: "admin" }.  Uses merge so no existing fields are lost
 * and no unnecessary write is issued when the role is already set.
 *
 * This is the ONLY place the role field is written — never call setDoc with
 * role anywhere else to avoid accidentally downgrading users.
 */
export async function promoteAdminIfNeeded(user: User): Promise<void> {
  if (!db || !user?.uid || !user.email) return;
  if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) return;

  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (snap.data()?.role === 'admin') {
      // Already an admin — skip write to avoid unnecessary Firestore ops
      return;
    }
    await setDoc(ref, { role: 'admin' }, { merge: true });
    console.log('[DB] Admin role granted to:', user.email);
  } catch (e) {
    console.error('[DB] promoteAdminIfNeeded error:', e);
  }
}

/**
 * createSession
 * Creates session document at /users/{uid}/sessions/{sessionId}
 * Requires authenticated user
 */
export async function createSessionForUser(
  user: User,
  device?: string,
  appVersion?: string
): Promise<string | null> {
  if (!user?.uid) {
    throw new Error('[DB] createSessionForUser: user.uid is required');
  }
  if (!db) {
    console.warn('[DB] Firestore not initialized');
    return null;
  }

  try {
    const sessionRef = await addDoc(
      collection(db, `users/${user.uid}/sessions`),
      {
        loginAt: serverTimestamp(),
        device: device || navigator.userAgent,
        appVersion: appVersion || '1.0',
      }
    );

    console.log('[DB] Session created:', sessionRef.id, 'for user:', user.uid);
    return sessionRef.id;
  } catch (error) {
    console.error('[DB] Error creating session:', error);
    throw error;
  }
}

/**
 * savePlacementTestResultForUser
 * Saves placement test result at /users/{uid}/placementTests/{testId}
 * Requires authenticated user
 */
export interface PlacementTestData {
  score: number;
  percentage: number;
  level: string;
  answers: number[];
  correctAnswers: number;
  totalQuestions: number;
  whatsapp?: string;
  fullName?: string;
}

export async function savePlacementTestResultForUser(
  user: User,
  testData: PlacementTestData
): Promise<string | null> {
  if (!user?.uid) {
    throw new Error('[DB] savePlacementTestResultForUser: user.uid is required');
  }
  if (!db) {
    console.warn('[DB] Firestore not initialized');
    return null;
  }

  try {
    const testId = `placement_${Date.now()}`;
    const testRef = doc(db, `users/${user.uid}/placementTests/${testId}`);

    await setDoc(testRef, {
      testId,
      score: testData.score,
      percentage: testData.percentage,
      level: testData.level,
      answers: testData.answers,
      correctAnswers: testData.correctAnswers,
      totalQuestions: testData.totalQuestions,
      whatsapp: testData.whatsapp || null,
      fullName: testData.fullName || user.displayName || null,
      createdAt: serverTimestamp(),
    });

    console.log('[DB] Placement test saved:', testId, 'for user:', user.uid);
    return testId;
  } catch (error) {
    console.error('[DB] Error saving placement test:', error);
    throw error;
  }
}

/**
 * updateLessonProgress
 * Updates lesson progress at /users/{uid}/progress/{lessonId}
 * Requires authenticated user
 */
export interface UpdateLessonProgressData {
  lessonId: string;
  completed: boolean;
  score: number;
  attempts: number;
}

export async function updateLessonProgress(
  user: User,
  lessonData: UpdateLessonProgressData
): Promise<void> {
  if (!user?.uid) {
    throw new Error('[DB] updateLessonProgress: user.uid is required');
  }
  if (!db) {
    console.warn('[DB] Firestore not initialized');
    return;
  }

  try {
    const progressRef = doc(db, `users/${user.uid}/progress/${lessonData.lessonId}`);

    await setDoc(progressRef, {
      lessonId: lessonData.lessonId,
      completed: lessonData.completed,
      score: lessonData.score,
      attempts: lessonData.attempts,
      lastAccessedAt: serverTimestamp(),
    }, { merge: true });

    console.log('[DB] Lesson progress updated:', lessonData.lessonId, 'for user:', user.uid);
  } catch (error) {
    console.error('[DB] Error updating lesson progress:', error);
    throw error;
  }
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
    await setDoc(sessionDocRef, {
      logoutTime: serverTimestamp(),
      durationSeconds,
      status: "finished",
    }, { merge: true });
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
    const existingSnapshot = await getDoc(userDocRef);
    const existingData = existingSnapshot.data() || {};
    const resolvedEmail = existingData.email || email || null;
    const resolvedName =
      displayName?.trim() ||
      existingData.name ||
      existingData.displayName ||
      (resolvedEmail ? resolvedEmail.split("@")[0] : 'User');
    await setDoc(userDocRef, {
      uid,
      email: resolvedEmail,
      name: resolvedName,
      displayName: resolvedName,
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
  if (!uid) {
    console.error('[DB] updateLastActive: uid is required');
    throw new Error('uid is required');
  }
  if (!db) {
    console.warn('[DB] Firestore not initialized, skipping lastActive update');
    return;
  }

  try {
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, {
      uid,
      lastActive: serverTimestamp(),
    }, { merge: true });
    console.log('[DB] ✅ Last active updated:', uid);
  } catch (e) {
    console.error('[DB] ❌ Error updating lastActive:', e);
    throw e;  // Re-throw to notify caller
  }
}

export async function recordDailyAccess(uid: string): Promise<void> {
  if (!uid) {
    console.error('[DB] recordDailyAccess: uid is required');
    throw new Error('uid is required');
  }
  if (!db) {
    console.warn('[DB] Firestore not initialized, skipping daily access record');
    return;
  }

  try {
    const dayKey = new Date().toISOString().slice(0, 10);
    const dailyAccessRef = doc(db, `users/${uid}/dailyAccess/${dayKey}`);

    await setDoc(dailyAccessRef, {
      uid,
      date: dayKey,
      lastAccessAt: serverTimestamp(),
      accessCount: increment(1),
    }, { merge: true });

    console.log('[DB] ✅ Daily access recorded:', { uid, date: dayKey });
  } catch (e) {
    console.error('[DB] ❌ Error recording daily access:', e);
    throw e;  // Re-throw to notify caller
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
    const userDocRef = doc(db, "users", uid);
    const userSnap = await getDoc(userDocRef);
    const currentStudyTime = userSnap.data()?.totalStudyTime || 0;

    const statsDocRef = doc(db, `users/${uid}/stats/main`);

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
      totalStudyTime: currentStudyTime,
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
    const statsDocRef = doc(db, `users/${uid}/stats/main`);

    // Update both user doc and stats (setDoc+merge creates doc if missing)
    await setDoc(userDocRef, {
      totalStudyTime: increment(additionalSeconds),
    }, { merge: true });

    await setDoc(statsDocRef, {
      totalStudyTime: increment(additionalSeconds),
      lastUpdated: serverTimestamp(),
    }, { merge: true });

    console.log("✅ Progress write completed: study time updated. Added:", additionalSeconds, "seconds");
    console.log("📊 STATS WRITE SUCCESS");
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

    await setDoc(userDocRef, {
      difficultyLevel: newDifficulty,
      lastUpdated: serverTimestamp(),
    }, { merge: true });

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
    const statsDocRef = doc(db, `users/${uid}/stats/main`);
    const statsSnap = await getDoc(statsDocRef);
    const currentLessonsCompleted = statsSnap.data()?.lessonsCompleted || 0;

    await setDoc(statsDocRef, {
      lessonsCompleted: currentLessonsCompleted + 1,
      lastUpdated: serverTimestamp(),
    }, { merge: true });

    console.log("✅ Progress write completed: lesson completion recorded. Lesson:", lessonId);
    console.log("📊 STATS WRITE SUCCESS");
  } catch (e) {
    console.error("Error recording lesson completion:", e);
  }
}

// ===== SESSION COUNT =====

export async function getSessionCount(uid: string): Promise<number> {
  if (!db) return 0;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'sessions'));
    return snap.size;
  } catch {
    return 0;
  }
}

// ===== SCORING DATA =====

export interface UserActivityData {
  sessionDates: Date[];
  lessonCompletions: { date: Date; score?: number }[];
}

export async function getUserActivityData(uid: string): Promise<UserActivityData> {
  if (!db) return { sessionDates: [], lessonCompletions: [] };
  try {
    const [sessionsSnap, lessonsSnap] = await Promise.all([
      getDocs(collection(db, 'users', uid, 'sessions')),
      getDocs(collection(db, 'users', uid, 'lessonProgress')),
    ]);

    const sessionDates: Date[] = sessionsSnap.docs
      .map(d => d.data().loginAt?.toDate?.() as Date | undefined)
      .filter((d): d is Date => d instanceof Date);

    const lessonCompletions: { date: Date; score?: number }[] = lessonsSnap.docs
      .flatMap(d => {
        const data = d.data();
        const date: Date | undefined = data.completedAt?.toDate?.() ?? data.lastUpdated?.toDate?.();
        if (!(date instanceof Date)) return [];
        const score: number | undefined = data.diamondPercent ?? data.score;
        return [{ date, score }];
      });

    return { sessionDates, lessonCompletions };
  } catch {
    return { sessionDates: [], lessonCompletions: [] };
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

// ===== WEEKLY/DAILY PROGRESS TRACKING =====

export interface DailyProgressData {
  dayId: string;
  dayNumber: number;
  scheduledDate: string; // ISO date
  completedDate?: string; // ISO date
  completedOnTime: boolean;
  status: 'pending' | 'completed_on_time' | 'completed_late';
  diamondEarned: boolean;
  fireEarned: boolean;
  iceEarned: boolean;
  score?: number; // exercise score 0–100 for this day
}

export interface WeeklyProgressData {
  weekId: string;
  workbookId: number;
  lessonId: number;
  weekStartDate: string; // ISO date
  weekEndDate?: string;
  days: DailyProgressData[];
  totalDaysCompleted: number;
  fireCount: number;
  iceCount: number;
  diamondsEarned: number;
  starsEarned: number;
  completed: boolean;
  completedAt?: any;
}

export interface PlacementTestRecord {
  testId: string;
  userId: string;
  fullName: string;
  whatsapp: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  estimatedLevel: string;
  timestamp: any;
  isAnonymous: boolean;
}

export interface WeekCompletionResult {
  diamondsEarned: number;
  fireCount: number;
  iceCount: number;
  starsEarned: number;
  weekNumber: number;
}

/**
 * Generate a week ID from workbook and lesson
 */
function generateWeekId(workbookId: number, lessonId: number): string {
  return `workbook_${workbookId}_lesson_${lessonId}`;
}

/**
 * Get the scheduled date for a day based on week start and day number
 */
function getScheduledDate(weekStartDate: string, dayNumber: number): string {
  const date = new Date(weekStartDate);
  date.setDate(date.getDate() + (dayNumber - 1));
  return date.toISOString().split('T')[0];
}

/**
 * Create a new weekly progress record
 */
export async function createWeeklyProgress(
  uid: string,
  workbookId: number,
  lessonId: number,
  weekStartDate: string
): Promise<WeeklyProgressData | null> {
  if (!db) {
    console.warn("Firestore not initialized, skipping weekly progress creation.");
    return null;
  }

  try {
    const weekId = generateWeekId(workbookId, lessonId);
    
    // Initialize 7 days
    const days: DailyProgressData[] = Array.from({ length: 7 }, (_, i) => ({
      dayId: `day_${i + 1}`,
      dayNumber: i + 1,
      scheduledDate: getScheduledDate(weekStartDate, i + 1),
      completedOnTime: false,
      status: 'pending',
      diamondEarned: false,
      fireEarned: false,
      iceEarned: false,
    }));

    const weekData: WeeklyProgressData = {
      weekId,
      workbookId,
      lessonId,
      weekStartDate,
      days,
      totalDaysCompleted: 0,
      fireCount: 0,
      iceCount: 0,
      diamondsEarned: 0,
      starsEarned: 0,
      completed: false,
    };

    const weekDocRef = doc(db, `users/${uid}/weeklyProgress/${weekId}`);
    await setDoc(weekDocRef, weekData);
    console.log("Weekly progress created. Week:", weekId);
    return weekData;
  } catch (e) {
    console.error("Error creating weekly progress:", e);
    return null;
  }
}

/**
 * Get current weekly progress
 */
export async function getWeeklyProgress(uid: string, weekId: string): Promise<WeeklyProgressData | null> {
  if (!db) return null;

  try {
    const weekDocRef = doc(db, `users/${uid}/weeklyProgress/${weekId}`);
    const weekSnap = await getDoc(weekDocRef);
    return weekSnap.exists() ? (weekSnap.data() as WeeklyProgressData) : null;
  } catch (e) {
    console.error("Error getting weekly progress:", e);
    return null;
  }
}

/**
 * Record daily progress and calculate fire/ice/diamond points
 */
export async function recordDailyProgress(
  uid: string,
  weekId: string,
  dayNumber: number,
  completedDate: string,
  exerciseScore: number = 0
): Promise<{ isDayComplete: boolean; fireEarned: boolean; iceEarned: boolean; isWeekComplete: boolean }> {
  console.log('[SAVE] userId:', uid);
  console.log('[SAVE] weekId:', weekId, '| dayNumber:', dayNumber, '| exerciseScore:', exerciseScore);

  if (!db) {
    console.error('[SAVE] Firestore db is null — cannot save day progress.');
    return { isDayComplete: false, fireEarned: false, iceEarned: false, isWeekComplete: false };
  }

  try {
    const weekData = await getWeeklyProgress(uid, weekId);
    if (!weekData) {
      console.warn("Weekly progress not found:", weekId);
      return { isDayComplete: false, fireEarned: false, iceEarned: false, isWeekComplete: false };
    }

    const dayIndex = dayNumber - 1;
    if (!weekData.days || dayIndex < 0 || dayIndex >= weekData.days.length) {
      console.warn("Invalid week structure or day number:", { weekId, dayNumber, hasDays: !!weekData.days });
      return { isDayComplete: false, fireEarned: false, iceEarned: false, isWeekComplete: false };
    }

    const day = weekData?.days?.[dayIndex] || null;
    if (!day) {
      console.warn("Day not found at index:", dayIndex);
      return { isDayComplete: false, fireEarned: false, iceEarned: false, isWeekComplete: false };
    }
    const scheduledDate = day.scheduledDate;
    const completedDateObj = new Date(completedDate).toISOString().split('T')[0];
    const scheduledDateObj = new Date(scheduledDate).toISOString().split('T')[0];

    // Determine if on time or late
    const isOnTime = completedDateObj === scheduledDateObj;
    const fireEarned = isOnTime;
    const iceEarned = !isOnTime && !day.iceEarned;

    // Update day record — only this day changes, all others are preserved via spread
    const diamondEarned = exerciseScore >= 100;
    const updatedDay: DailyProgressData = {
      ...day,
      completedDate: completedDate,
      completedOnTime: isOnTime,
      status: isOnTime ? 'completed_on_time' : 'completed_late',
      diamondEarned,
      fireEarned: fireEarned,
      iceEarned: iceEarned,
      score: exerciseScore,
    };

    // Build updated days array — only the target index is replaced
    const updatedDays = weekData.days.map((d, idx) =>
      idx === dayIndex ? updatedDay : d
    );

    // Calculate totals from the fully updated days array
    const diamondsEarned = updatedDays.filter(d => d.diamondEarned).length;
    const fireCount = updatedDays.filter(d => d.fireEarned).length;
    const iceCount = updatedDays.filter(d => d.iceEarned).length;

    const starsEarned = diamondsEarned + fireCount;
    const isWeekComplete = diamondsEarned === 7;

    const updatedWeekData: WeeklyProgressData = {
      ...weekData,
      days: updatedDays,
      totalDaysCompleted: diamondsEarned,
      fireCount,
      iceCount,
      diamondsEarned,
      starsEarned,
      completed: isWeekComplete,
      ...(isWeekComplete && { completedAt: serverTimestamp() }),
    };

    const weekDocRef = doc(db, `users/${uid}/weeklyProgress/${weekId}`);
    console.log('[SAVE] updatedWeek:', JSON.stringify({ weekId, dayNumber, exerciseScore, diamondEarned, diamondsEarned, fireCount, iceCount, starsEarned, isWeekComplete }));
    try {
      await setDoc(weekDocRef, updatedWeekData, { merge: true });
      console.log('[SAVE] weeklyProgress persisted to Firestore ✓');
    } catch (err) {
      console.error('[SAVE ERROR] setDoc failed:', err);
      throw err;
    }

    // Update total user stats
    await updateUserTotalProgress(uid, {
      diamondsEarned: diamondEarned ? 1 : 0,
      fireEarned: fireEarned ? 1 : 0,
      iceEarned: iceEarned ? 1 : 0,
    });

    console.log(`[SAVE] Day ${dayNumber} done. fire=${fireEarned} ice=${iceEarned} diamond=${diamondEarned} weekComplete=${isWeekComplete}`);

    return {
      isDayComplete: true,
      fireEarned,
      iceEarned,
      isWeekComplete,
    };
  } catch (e) {
    console.error('[SAVE ERROR] recordDailyProgress failed:', e);
    return { isDayComplete: false, fireEarned: false, iceEarned: false, isWeekComplete: false };
  }
}

/**
 * Update user's total progress stats
 */
export async function updateUserTotalProgress(
  uid: string,
  increment_values: { diamondsEarned?: number; fireEarned?: number; iceEarned?: number }
): Promise<void> {
  if (!db) return;

  try {
    const userDocRef = doc(db, "users", uid);
    const updates: any = { lastUpdated: serverTimestamp() };

    if (increment_values.diamondsEarned) {
      updates.totalDiamonds = increment(increment_values.diamondsEarned);
    }
    if (increment_values.fireEarned) {
      updates.totalFire = increment(increment_values.fireEarned);
    }
    if (increment_values.iceEarned) {
      updates.totalIce = increment(increment_values.iceEarned);
    }

    await setDoc(userDocRef, updates, { merge: true });
    console.log('Saving progress: totalDiamonds/fire/ice incremented for', uid);
  } catch (e) {
    console.error("Error updating user total progress:", e);
  }
}

/**
 * Save placement test result
 */
export async function savePlacementTestResult(
  uid: string,
  fullName: string,
  whatsapp: string,
  score: number,
  correctAnswers: number,
  totalQuestions: number,
  estimatedLevel: string,
  isAnonymous: boolean = true
): Promise<string | null> {
  if (!db) {
    console.warn("Firestore not initialized, skipping placement test save.");
    return null;
  }

  try {
    const testId = `placement_${uid}_${Date.now()}`;
    const record: PlacementTestRecord = {
      testId,
      userId: uid,
      fullName,
      whatsapp,
      score,
      correctAnswers,
      totalQuestions,
      estimatedLevel,
      timestamp: serverTimestamp(),
      isAnonymous,
    };

    const testDocRef = doc(db, `placementTests/${testId}`);
    await setDoc(testDocRef, record);

    // Also update user profile with score
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, {
      placementScore: score,
      placementLevel: estimatedLevel,
      placementCompletedAt: serverTimestamp(),
    }, { merge: true });

    console.log("Placement test saved. ID:", testId, "Level:", estimatedLevel);
    return testId;
  } catch (e) {
    console.error("Error saving placement test:", e);
    return null;
  }
}

/**
 * Get final week completion result
 */
export async function getWeekCompletionResult(uid: string, weekId: string): Promise<WeekCompletionResult | null> {
  if (!db) return null;

  try {
    const weekData = await getWeeklyProgress(uid, weekId);
    if (!weekData) return null;

    return {
      diamondsEarned: weekData.diamondsEarned,
      fireCount: weekData.fireCount,
      iceCount: weekData.iceCount,
      starsEarned: weekData.starsEarned,
      weekNumber: parseInt(weekId.split('_')[3] || '1'),
    };
  } catch (e) {
    console.error("Error getting week completion result:", e);
    return null;
  }
}
