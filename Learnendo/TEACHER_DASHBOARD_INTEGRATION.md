# Teacher Dashboard - Usage Example & Integration

## Quick Start

### 1. Access the Dashboard

**Before accessing, ensure:**
- Firebase user with email: `learnendo@gmail.com`
- Multiple students have logged in (data exists)

**Steps to access:**
1. Open app → Login as `learnendo@gmail.com`
2. Click menu button (☰) in top right
3. Click "📊 Teacher Dashboard" (purple text)

---

## Dashboard Layout

### Top Section: Header
```
📊 Teacher Dashboard
Monitoring N students
```

### Middle Section: Student List Table
```
┌─────────────┬──────────────┬──────────┬──────────────┬──────────┬────────┐
│ Name        │ Email        │ Type     │ Last Active  │ Sessions │ Action │
├─────────────┼──────────────┼──────────┼──────────────┼──────────┼────────┤
│ Maria       │ maria@ex.com │ Email    │ Feb 15, 2026 │    0     │ View   │
│ João        │ -            │ Anonym.  │ Feb 14, 2026 │    0     │ View   │
│ Ana Silva   │ ana@ex.com   │ Email    │ Feb 13, 2026 │    0     │ View   │
└─────────────┴──────────────┴──────────┴──────────────┴──────────┴────────┘
```

### Bottom Section: Quick Stats
```
┌──────────────────┬────────────────┬─────────────────┐
│ Total Students   │ Anonymous Users │ Registered Users │
│        12        │        5        │        7        │
└──────────────────┴────────────────┴─────────────────┘
```

---

## Student Detail View

Click **View** button to see complete student profile:

### Header Card
```
┌─────────────────────────────────────────────┐
│ Maria Santos                    Student ID  │
│ maria@example.com              uid_xyz...  │
│ [Registered User Badge]                    │
└─────────────────────────────────────────────┘
```

### Timeline Cards
```
┌─────────────────────┐  ┌─────────────────────┐
│ Joined              │  │ Last Active         │
│ Feb 1, 2026         │  │ Feb 15, 2026        │
│ 14:30:45            │  │ 16:45:22            │
└─────────────────────┘  └─────────────────────┘
```

### Activity Stats Cards
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Total        │  │ Last Login   │  │ Today's      │
│ Sessions: 42 │  │ Feb 15, 2026 │  │ Access: 3    │
│              │  │ 16:45:22     │  │ 2026-02-15   │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Latest Placement Test
```
┌──────────────────────────────────────┐
│ Latest Placement Test                │
├──────────────┬──────────────────────┤
│ Level:       │ Intermediate         │
│ Score:       │ 78%                  │
│ Date:        │ Feb 10, 2026 10:30AM │
└──────────────┴──────────────────────┘
```

### Test History
```
┌─────────────────────────────────────────────┐
│ Test History                                │
├─────┬──────────────┬──────────┬─────────────┤
│ #1  │ Feb 10, 2026 │Advanced  │ 85%         │
│ #2  │ Feb 05, 2026 │Intermed. │ 78%         │
│ #3  │ Jan 30, 2026 │Beginner  │ 65%         │
└─────┴──────────────┴──────────┴─────────────┘
```

---

## Code Integration Example

### Access from App.tsx

The Teacher Dashboard is already integrated. To verify or modify:

```typescript
// In App.tsx renderSection()
case SectionType.TEACHER_DASHBOARD:
  return user && isAdmin ? (
    <TeacherDashboard user={user} />
  ) : (
    <div>Access denied...</div>
  );

// Menu button (already added)
{isAdmin && (
  <button onClick={() => { 
    setCurrentSection(SectionType.TEACHER_DASHBOARD); 
    setMenuOpen(false); 
  }}>
    📊 Teacher Dashboard
  </button>
)}
```

### Direct Component Usage

```typescript
import { TeacherDashboard } from './components/TeacherDashboard/TeacherDashboard';
import { User } from 'firebase/auth';

interface Props {
  user: User;  // Firebase Auth user
}

export const MyTeacherView: React.FC<Props> = ({ user }) => {
  return <TeacherDashboard user={user} />;
};
```

### Custom Hook for Student Queries

```typescript
import { 
  getAllStudents, 
  getStudentDetail,
  StudentBasicInfo, 
  StudentDetail 
} from '@/services/teacherDashboard';

// Fetch all students
async function loadStudents() {
  const students = await getAllStudents();
  console.log('Found students:', students);
}

// Fetch specific student
async function viewStudent(uid: string) {
  const detail = await getStudentDetail(uid);
  console.log('Student details:', detail);
}
```

---

## Firestore Data Flow

### When Dashboard Loads:

```
1. getAllStudents()
   ↓
   Query: collection(db, 'users').orderBy('lastActive', 'desc')
   ↓
   Returns: [StudentBasicInfo, StudentBasicInfo, ...]
   ↓
   Display in table

2. When user clicks "View":
   ↓
   getStudentDetail(uid)
   ↓
   Parallel queries:
   ├── Get user profile: doc(db, 'users/{uid}')
   ├── Get activity: getStudentActivityStats(uid)
   │   ├── Count sessions: collection(db, 'users/{uid}/sessions')
   │   └── Get daily access: doc(db, 'users/{uid}/dailyAccess/2026-02-15')
   └── Get tests: getStudentPlacementTests(uid)
       └── Query: collection(...).orderBy('createdAt', 'desc').limit(10)
   ↓
   Combine results → Display detail view
```

---

## Real-World Scenario

### Scenario: Monitor Class Progress

**Goal:** Check which students attended today and their activity level

**Steps:**

1. **Open Dashboard**
   - Click ☰ → 📊 Teacher Dashboard

2. **Review Student List**
   - Check "Last Active" column
   - Students active today have recent dates (today's date)
   - Example: "Feb 15, 2026" = today

3. **Identify Active Students**
   - Look for students with today's date
   - Note the count in "Today's Access" column

4. **Check Individual Progress**
   - Click "View" on interesting students
   - Check "Last Login" timestamp
   - View "Today's Access" count
   - Check latest placement test score

5. **Take Action**
   - Note which students haven't accessed today
   - Plan follow-up for inactive students
   - Celebrate high scores on placement tests

---

## Query Examples

### Get All Students Sorted by Activity
```typescript
const teacherDash = require('@/services/teacherDashboard');

async function getAllActiveStudents() {
  const students = await teacherDash.getAllStudents();
  // Already sorted by lastActive (DESC)
  students.forEach(s => {
    console.log(`${s.name}: Last active ${s.lastActive}`);
  });
}
```

### Get Student With Most Sessions
```typescript
async function findMostActiveStudent() {
  const students = await teacherDash.getAllStudents();
  const details = await Promise.all(
    students.map(s => teacherDash.getStudentDetail(s.uid))
  );
  
  const sorted = details.sort(
    (a, b) => b?.activity.totalSessions - a?.activity.totalSessions
  );
  
  console.log('Most active:', sorted[0]?.name, 'Sessions:', sorted[0]?.activity.totalSessions);
}
```

### Get Student's Placement Test Progress
```typescript
async function getTestProgression(uid: string) {
  const tests = await teacherDash.getStudentPlacementTests(uid);
  
  tests.forEach((test, i) => {
    console.log(`Test ${i + 1}: ${test.level} (${test.percentage}%)`);
  });
}
```

---

## Troubleshooting

### Issue: Dashboard Shows Empty
**Cause:** No students have logged in yet
**Solution:** Have students register and log in first

### Issue: "Access Denied" Message
**Cause:** You're not logged as admin (learnendo@gmail.com)
**Solution:** Log out and log back in with admin email

### Issue: Student Details Won't Load
**Cause:** Firestore permissions or network issue
**Solution:** 
- Check Firebase console for errors
- Verify security rules allow admin read access
- Try refreshing the page

### Issue: Session Count Shows "0"
**Cause:** Sessions sub-collection not found or empty
**Solution:** Check if `createSessionForUser()` is being called on login

---

## Performance Tips

### For Large User Bases (1000+ students):

1. **Add Pagination**
```typescript
// Limit to 50 students per page
export async function getAllStudents(pageNumber = 1, pageSize = 50) {
  const offset = (pageNumber - 1) * pageSize;
  // Use startAfter() and limit() for cursor-based pagination
}
```

2. **Add Search Filter**
```typescript
export async function searchStudents(name: string) {
  // Case-insensitive search
  return getAllStudents().then(all => 
    all.filter(s => s.name.toLowerCase().includes(name.toLowerCase()))
  );
}
```

3. **Implement Caching**
```typescript
const studentCache = new Map();

async function getCachedStudent(uid: string) {
  if (studentCache.has(uid)) return studentCache.get(uid);
  
  const detail = await getStudentDetail(uid);
  studentCache.set(uid, detail);
  return detail;
}
```

---

## Security Considerations

### Current Setup
✅ Admin check: `email === 'learnendo@gmail.com'`
✅ Firestore rules: Read access for admin only
✅ No data modification: Teacher dashboard is read-only

### Recommended Enhancements
- [ ] Implement role-based access control (RBAC) database
- [ ] Add audit logging for admin access
- [ ] Implement time-based session limits
- [ ] Add export data logging for compliance

---

## Next Steps

1. **Deploy & Test**
   - Deploy latest code to production
   - Test with admin email
   - Verify student data appears

2. **Monitor**
   - Check browser console for `[TeacherDash]` logs
   - Monitor Firestore usage
   - Track user feedback

3. **Enhance** (Future)
   - Add export to CSV
   - Add search/filter
   - Add messaging to students
   - Add performance charts

