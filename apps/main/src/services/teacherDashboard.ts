import { collection, query, getDocs, doc, getDoc, limit, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { getEffectiveUserRole, type UserRole } from './userRoles';

// ===== FIRESTORE QUERIES FOR TEACHER DASHBOARD =====

export interface StudentBasicInfo {
  uid: string;
  name: string;
  email: string | null;
  role?: UserRole;
  assignedTeacherUid?: string | null;
  assignedTeacherName?: string | null;
  isAnonymous: boolean;
  createdAt: any;
  lastActive: any;
}

export interface StudentActivityStats {
  totalSessions: number;
  lastLogin: any;
  dailyAccessCount: number;
  lastAccessDate: string | null;
}

export interface StudentPlacementTest {
  testId: string;
  score: number;
  percentage: number;
  level: string;
  createdAt: any;
}

export interface StudentDetail extends StudentBasicInfo {
  activity: StudentActivityStats;
  latestPlacementTest: StudentPlacementTest | null;
  allPlacementTests: StudentPlacementTest[];
}

/**
 * getAllStudents
 * Fetches all user profiles from /users collection
 * @returns List of all registered students
 */
export async function getAllStudents(): Promise<StudentBasicInfo[]> {
  if (!db) {
    console.error('[TeacherDash] Firestore not initialized');
    return [];
  }

  try {
    console.log('[TeacherDash] Fetching all students...');
    const studentsQuery = query(
      collection(db, 'users'),
      orderBy('lastActive', 'desc')
    );
    const snapshot = await getDocs(studentsQuery);
    
    const students: StudentBasicInfo[] = snapshot.docs
      .map(doc => ({
        uid: doc.id,
        name: doc.data().name || doc.data().displayName || 'Unknown',
        email: doc.data().email || null,
        isAnonymous: doc.data().isAnonymous || false,
        createdAt: doc.data().createdAt,
        lastActive: doc.data().lastActive,
        assignedTeacherUid: doc.data().assignedTeacherUid || null,
        assignedTeacherName: doc.data().assignedTeacherName || null,
        role: getEffectiveUserRole(doc.data().email || null, doc.data().role || null),
      }))
      .filter((student) => student.role === 'student')
      .map(({ role: _role, ...student }) => student);

    console.log('[TeacherDash] ✅ Fetched', students.length, 'students');
    return students;
  } catch (error) {
    console.error('[TeacherDash] ❌ Error fetching students:', error);
    throw error;
  }
}

/**
 * getStudentActivityStats
 * Fetches session and access data for a specific student
 * @param uid - Student UID
 * @returns Activity statistics
 */
export async function getStudentActivityStats(uid: string): Promise<StudentActivityStats> {
  if (!db) {
    console.error('[TeacherDash] Firestore not initialized');
    return { totalSessions: 0, lastLogin: null, dailyAccessCount: 0, lastAccessDate: null };
  }

  try {
    // Get total sessions
    const sessionsQuery = query(collection(db, `users/${uid}/sessions`));
    const sessionsSnapshot = await getDocs(sessionsQuery);
    const totalSessions = sessionsSnapshot.size;

    let lastLogin = null;
    if (sessionsSnapshot.docs.length > 0) {
      const sorted = sessionsSnapshot.docs.sort((a, b) => {
        const aTime = a.data().loginAt?.toMillis?.() || 0;
        const bTime = b.data().loginAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      lastLogin = sorted[0].data().loginAt;
    }

    // Get daily access count (for today)
    const todayKey = new Date().toISOString().slice(0, 10);
    const dailyAccessRef = doc(db, `users/${uid}/dailyAccess/${todayKey}`);
    const dailyAccessDoc = await getDoc(dailyAccessRef);
    const dailyAccessCount = dailyAccessDoc.exists() ? dailyAccessDoc.data().accessCount || 0 : 0;

    return {
      totalSessions,
      lastLogin,
      dailyAccessCount,
      lastAccessDate: todayKey,
    };
  } catch (error) {
    console.error('[TeacherDash] ❌ Error fetching activity stats for', uid, ':', error);
    return { totalSessions: 0, lastLogin: null, dailyAccessCount: 0, lastAccessDate: null };
  }
}

/**
 * getLiveClassAssignableUsers
 * Fetches all registered non-anonymous accounts for live class assignment.
 */
export async function getLiveClassAssignableUsers(): Promise<StudentBasicInfo[]> {
  if (!db) {
    console.error('[TeacherDash] Firestore not initialized');
    return [];
  }

  try {
    console.log('[TeacherDash] Fetching live-class assignable users...');
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('lastActive', 'desc')
    );
    const snapshot = await getDocs(usersQuery);

    const users: StudentBasicInfo[] = snapshot.docs
      .map(doc => ({
        uid: doc.id,
        name: doc.data().name || doc.data().displayName || 'Unknown',
        email: doc.data().email || null,
        isAnonymous: doc.data().isAnonymous || false,
        createdAt: doc.data().createdAt,
        lastActive: doc.data().lastActive,
        assignedTeacherUid: doc.data().assignedTeacherUid || null,
        assignedTeacherName: doc.data().assignedTeacherName || null,
        role: getEffectiveUserRole(doc.data().email || null, doc.data().role || null),
      }))
      .filter((user) => !user.isAnonymous);

    console.log('[TeacherDash] Fetched', users.length, 'assignable users');
    return users;
  } catch (error) {
    console.error('[TeacherDash] Error fetching assignable users:', error);
    throw error;
  }
}

/**
 * getStudentPlacementTests
 * Fetches all placement tests for a student
 * @param uid - Student UID
 * @returns Array of placement tests (sorted by date, newest first)
 */
export async function getStudentPlacementTests(uid: string): Promise<StudentPlacementTest[]> {
  if (!db) {
    console.error('[TeacherDash] Firestore not initialized');
    return [];
  }

  try {
    const testsQuery = query(
      collection(db, `users/${uid}/placementTests`),
      orderBy('createdAt', 'desc'),
      limit(10)  // Get last 10 tests
    );
    const snapshot = await getDocs(testsQuery);

    const tests: StudentPlacementTest[] = snapshot.docs.map(doc => ({
      testId: doc.id,
      score: doc.data().score || 0,
      percentage: doc.data().percentage || 0,
      level: doc.data().level || 'Unknown',
      createdAt: doc.data().createdAt,
    }));

    return tests;
  } catch (error) {
    console.error('[TeacherDash] ❌ Error fetching placement tests for', uid, ':', error);
    return [];
  }
}

/**
 * getStudentDetail
 * Fetches complete student profile including activity and placement tests
 * @param uid - Student UID
 * @returns Detailed student information
 */
export async function getStudentDetail(uid: string): Promise<StudentDetail | null> {
  if (!db) {
    console.error('[TeacherDash] Firestore not initialized');
    return null;
  }

  try {
    // Get basic profile
    const userDoc = doc(db, 'users', uid);
    const userSnapshot = await getDoc(userDoc);

    if (!userSnapshot.exists()) {
      console.warn('[TeacherDash] Student not found:', uid);
      return null;
    }

    const basicInfo: StudentBasicInfo = {
      uid,
      name: userSnapshot.data().name || 'Unknown',
      email: userSnapshot.data().email || null,
      isAnonymous: userSnapshot.data().isAnonymous || false,
      createdAt: userSnapshot.data().createdAt,
      lastActive: userSnapshot.data().lastActive,
      assignedTeacherUid: userSnapshot.data().assignedTeacherUid || null,
      assignedTeacherName: userSnapshot.data().assignedTeacherName || null,
    };

    // Get activity stats
    const activity = await getStudentActivityStats(uid);

    // Get placement tests
    const allPlacementTests = await getStudentPlacementTests(uid);
    const latestPlacementTest = allPlacementTests.length > 0 ? allPlacementTests[0] : null;

    return {
      ...basicInfo,
      activity,
      latestPlacementTest,
      allPlacementTests,
    };
  } catch (error) {
    console.error('[TeacherDash] ❌ Error fetching student detail for', uid, ':', error);
    return null;
  }
}

/**
 * formatTimestamp
 * Converts Firestore timestamp to readable date
 */
export function formatTimestamp(timestamp: any): string {
  if (!timestamp) return 'Never';
  try {
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  } catch {
    return 'Invalid date';
  }
}

/**
 * formatDate
 * Converts Firestore timestamp to date only
 */
export function formatDate(timestamp: any): string {
  if (!timestamp) return 'Never';
  try {
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString();
  } catch {
    return 'Invalid date';
  }
}
