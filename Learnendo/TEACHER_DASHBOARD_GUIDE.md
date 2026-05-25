# Teacher Dashboard - Complete Guide

## Overview

The Teacher Dashboard allows educators to monitor student activity, track progress, and view detailed analytics for placement tests and engagement metrics.

**Location:** Menu → 📊 Teacher Dashboard (available only when logged as `learnendo@gmail.com`)

---

## Features

### 1. Student List
- **Displays:** All registered and anonymous students
- **Columns:**
  - Name
  - Email (if available)
  - User Type (Anonymous/Registered)
  - Last Active Date
  - Session Count
  - Actions (View Details)

- **Sorting:** Students ordered by last active time (newest first)

```typescript
// Example data structure
interface StudentBasicInfo {
  uid: string;                    // Firebase UID
  name: string;                   // User display name
  email: string | null;           // Email (null for anonymous)
  isAnonymous: boolean;           // True for anonymous users
  createdAt: Timestamp;           // Account creation date
  lastActive: Timestamp;          // Last login date
}
```

### 2. Activity Tracking
- **Total Sessions:** Count of all login sessions
- **Last Login:** Most recent session timestamp
- **Daily Access:** Number of times student accessed today
- **Last Access Date:** Today's date (updates daily)

```typescript
interface StudentActivityStats {
  totalSessions: number;          // Total count of sessions
  lastLogin: Timestamp | null;    // Date of last session
  dailyAccessCount: number;       // Access count for today
  lastAccessDate: string | null;  // ISO date string (YYYY-MM-DD)
}
```

### 3. Placement Test Results
- **Latest Test:** Most recent placement test info
  - Level achieved
  - Percentage score
  - Test date
- **Test History:** Last 10 tests with:
  - Test number
  - Date taken
  - Final level
  - Score percentage

```typescript
interface StudentPlacementTest {
  testId: string;                 // Firestore doc ID
  score: number;                  // Raw score
  percentage: number;             // Percentage (0-100)
  level: string;                  // Level name (e.g., "Beginner")
  createdAt: Timestamp;           // Test completion time
}
```

### 4. Student Detail View
Click **View** on any student to see:
- Student profile (name, email, ID)
- Registration date and time
- Last active date and time
- All activity statistics
- Latest placement test details
- Complete test history

---

## File Structure

```
apps/main/
├── src/
│   ├── components/
│   │   └── TeacherDashboard/
│   │       ├── TeacherDashboard.tsx      # Main dashboard component
│   │       └── StudentDetailView.tsx     # Detail view for student
│   └── services/
│       └── teacherDashboard.ts            # Firestore query functions
│
apps/wbk-5/
├── src/
│   ├── components/
│   │   └── TeacherDashboard/             # (Synchronized copy)
│   └── services/
│       └── teacherDashboard.ts            # (Synchronized copy)
```

---

## Query Functions (services/teacherDashboard.ts)

### `getAllStudents(): Promise<StudentBasicInfo[]>`
Fetches all users sorted by last active date (newest first).

```typescript
// Usage in TeacherDashboard component
const students = await getAllStudents();
```

**Firestore Query:**
```javascript
collection(db, 'users')
  .orderBy('lastActive', 'desc')
```

### `getStudentActivityStats(uid): Promise<StudentActivityStats>`
Fetches session count, last login, and daily access for a student.

```typescript
// Usage
const stats = await getStudentActivityStats(studentUid);
```

**Firestore Queries:**
- Sessions: `collection(db, 'users/{uid}/sessions')`
- Daily Access: `doc(db, 'users/{uid}/dailyAccess/{todayKey}')`

### `getStudentPlacementTests(uid): Promise<StudentPlacementTest[]>`
Fetches up to 10 most recent placement tests.

```typescript
// Usage
const tests = await getStudentPlacementTests(studentUid);
```

**Firestore Query:**
```javascript
collection(db, `users/${uid}/placementTests`)
  .orderBy('createdAt', 'desc')
  .limit(10)
```

### `getStudentDetail(uid): Promise<StudentDetail | null>`
Comprehensive student profile combining all above queries.

```typescript
// Usage
const studentDetail = await getStudentDetail(studentUid);
```

---

## Component Integration

### TeacherDashboard.tsx
Main component handling:
- Loading all students
- Managing UI state (loading, error, selected student)
- Rendering student list
- Delegating to StudentDetailView when needed

```typescript
interface TeacherDashboardProps {
  user: User;  // Firebase Auth user (must be admin)
}
```

### StudentDetailView.tsx
Displays comprehensive student information:
- Header with name, email, UID
- Registration and last active dates
- Activity statistics cards
- Latest placement test
- Complete test history

---

## Access Control

The Teacher Dashboard is **only accessible** to:
- Users with email: `learnendo@gmail.com`
- Configured in: `App.tsx` (line ~64)

```typescript
const isAdmin = user?.email?.toLowerCase() === 'learnendo@gmail.com';
```

**Menu Button:**
- Only visible when `isAdmin` is true
- Accessible via the menu (☰) in header

**Access Denied:**
If non-admin tries to access directly, shows:
> "Access denied. Teacher dashboard is for authorized users only."

---

## Firestore Structure

The dashboard queries the following Firestore hierarchy:

```
/users/{uid}
├── name                    (User display name)
├── email                   (User email or null)
├── isAnonymous             (Boolean)
├── createdAt               (Timestamp)
├── lastActive              (Timestamp)
│
├── /sessions/{sessionId}   (Sub-collection)
│   └── loginAt             (Timestamp)
│
├── /placementTests/{testId} (Sub-collection)
│   ├── score               (Number)
│   ├── percentage          (Number)
│   ├── level               (String)
│   └── createdAt           (Timestamp)
│
└── /dailyAccess/{dayKey}   (Sub-collection, key = YYYY-MM-DD)
    └── accessCount         (Number)
```

---

## Configuration for Security Rules

Ensure Firestore Security Rules allow the admin user to read all student data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin can read all users' data
    match /users/{userId} {
      allow read: if request.auth.token.email == 'learnendo@gmail.com';
      allow write: if request.auth.uid == userId;  // Users write own data
      
      match /{allDescendants=**} {
        allow read: if request.auth.token.email == 'learnendo@gmail.com';
        allow write: if request.auth.uid == userId;
      }
    }
  }
}
```

---

## Styling

Built with **Tailwind CSS**:
- Blue gradient background: `bg-gradient-to-b from-blue-100 to-blue-50`
- Cards: `rounded-2xl shadow-lg p-8`
- Buttons: `bg-blue-600 hover:bg-blue-700`
- Admin button (menu): Purple accent `hover:bg-purple-50 text-purple-600`

---

## Error Handling

The component gracefully handles:

1. **Firestore Not Initialized**
   - Returns empty state with message
   - Does not crash the app

2. **Fetch Errors**
   - Displays error banner with "Retry" button
   - User can trigger reload

3. **No Students**
   - Shows "No students found yet" message
   - Suggests students will appear after registration

4. **Missing Student Details**
   - Shows "Could not load student details" error
   - Allows user to try again

---

## Console Logging

All operations log with `[TeacherDash]` prefix for debugging:

```typescript
console.log('[TeacherDash] Fetching all students...');
console.log('[TeacherDash] ✅ Fetched 5 students');
console.error('[TeacherDash] ❌ Error fetching students:', error);
```

---

## Performance Notes

- **Student List:** Sorted by `lastActive` index
- **Placement Tests:** Limited to last 10 with `limit(10)` to reduce data transfer
- **Daily Access:** Fetches only today's document (efficient)
- **Session Count:** Aggregated at query time (scales with large data)

### Optimization Tips for Large User Bases:
1. Add pagination to student list
2. Add search/filter by name or email
3. Cache student data with `useCallback`
4. Consider Firestore indexes on `lastActive` for sorting

---

## Deployment Checklist

- ✅ Components created in both `apps/main` and `apps/wbk-5`
- ✅ Query functions implemented
- ✅ TypeScript validation passing (zero errors)
- ✅ Menu integration complete
- ✅ Access control configured
- ✅ Error handling in place
- ✅ Firestore rules updated (recommended)

---

## Future Enhancements

1. **Export Data:** CSV export of student list and activity
2. **Messaging:** Send messages to individual students
3. **Progress Insights:** Track lesson completion rates
4. **Analytics:** Charts showing activity trends over time
5. **Bulk Actions:** Unlock lessons for multiple students
6. **Search/Filter:** Find students by name, email, or level
7. **Notifications:** Alert on student milestones or inactivity
8. **Assessment Grading:** Review and grade student submissions

---

## Testing

To test the Teacher Dashboard:

1. **Login as admin:**
   - Email: `learnendo@gmail.com`
   - Any password

2. **Access dashboard:**
   - Click menu (☰)
   - Click "📊 Teacher Dashboard"

3. **Verify features:**
   - Student list loads
   - Can click "View" to see details
   - Activity stats display correctly
   - Placement tests show history

4. **Test error cases:**
   - Disconnect internet to test error handling
   - Try accessing as non-admin user
   - Verify access denied message

---

## Related Documentation

- Firebase user tracking: See `FIREBASE_PROGRESS_TRACKING.md`
- Production architecture: See previous architecture docs
- Firestore security: See security rules section above

