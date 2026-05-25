# Learnendo Login & Lesson Unlock System - Audit Report

**Date:** March 10, 2026  
**Status:** ❌ CRITICAL ISSUES FOUND

---

## ISSUE #1: Authentication Not Persisting (Firebase Login)

### Problem
Email/password logins are accepted in the UI but don't persist as authenticated users in Firebase.

### Root Cause
**`App.tsx` lines 236-253**: After successful login/registration, the code calls `startLesson()` which:
1. Sets `student.name` in local React state
2. Changes section to `SectionType.PATH`
3. **Does NOT check if user is actually authenticated**

The authentication action is treated identically to the guest login. Both flow directly to `setSection(SectionType.PATH)`.

### Code Evidence
```tsx
const startLesson = (name: string) => {
  setStudent({ name: name?.trim() || '' });
  setSection(SectionType.PATH);
};

// Called from InfoSection callback (lines 236-253):
onAuthAction={async (email, pass, isLogin, fullName) => {
  if (!isLogin) {
    const user = await registerWithEmail(email, pass, fullName);  // ✅ Correctly calls FirebaseAuth
  } else {
    const user = await loginWithEmail(email, pass);              // ✅ Correctly calls FirebaseAuth
  }
  setStudent({ name: fullName?.trim() || email });
  setSection(SectionType.PATH);
  // ⚠️ No persistence of auth context or user state
}}
```

### Impact
- `firebase.ts` functions are correct (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`)
- Login happens in Firebase, but the **app ignores the auth context**
- No `currentUser` check after login
- Guest login and authenticated login are indistinguishable

### Fix Required
1. **Store authenticated user state in app context**
2. **Check `auth.currentUser` on app load** to restore session
3. **Distinguish between guest and authenticated users**
4. **Persist `uid` to localStorage** for session recovery

---

## ISSUE #2: Lesson Unlock Logic Broken - Only "Martins" Works

### Problem
Students can only unlock Lesson 2+ if they log in with name "Martins" (the bypass key).

### Root Cause #1: isLessonLocked() Requires Previous Lesson Completed on DIFFERENT Day

**`App.tsx` lines 504-515**:
```tsx
const isLessonLocked = (id: number) => {
  if (isAdmin) return false;                    // ✅ Martins = admin
  if (id === 1) return false;                  // ✅ Lesson 1 always unlocked
  
  const prevLessonId = id - 1;
  const prevConfig = LESSON_CONFIGS.find(l => l.id === prevLessonId);
  const lastModule = prevConfig?.modules?.slice(-1)[0];

  const prevCompletedDay = lastModule ? progress.lessonData?.[prevLessonId]?.islandCompletionDates?.[lastModule] : undefined;

  if (!prevCompletedDay) return true;          // ⚠️ Locked if previous never completed
  if (prevCompletedDay === getTodayKey()) return true;  // ⚠️ Locked if completed TODAY
  
  return false;  // ✅ Only unlocks NEXT day
};
```

**This enforces "1 lesson per calendar day"**, not "progressive unlock".

### Root Cause #2: Lesson State Assignment Flawed

**`App.tsx` lines 420-450**:
```tsx
let state: 'active' | 'available_tomorrow' | 'locked_content' | 'completed' = 'locked_content';

if (isAdmin) {
  state = 'active';
} else {
  if (diamond === 100) {
    state = 'completed';
  } else if (lesson.id < progress.currentLesson) {
    state = 'completed';  // ✅ Past lessons are completed
  } else if (lesson.id === progress.currentLesson) {
    state = isLessonLocked(lesson.id) ? 'available_tomorrow' : 'active';  // ⚠️ Only current lesson shown
  } else if (lesson.id === progress.currentLesson + 1) {
    state = isLessonLocked(lesson.id) ? 'available_tomorrow' : 'active';  // ⚠️ Only NEXT lesson visible
  }
  // ❌ lesson.id > progress.currentLesson + 1 → stays 'locked_content' (gray/grayscale)
}
```

**Problems:**
1. **Only `progress.currentLesson` and `progress.currentLesson + 1` are shown as interactive**
2. **All other lessons stay gray/locked (visual state wrong)**
3. **UI never allows clicking on lesson 3+ until progress.currentLesson is 3**
4. **Logic conflates "current lesson" with "unlocked lessons"**

### Impact Summary
- New users start with lesson 1 only
- Lesson 2 appears gray (locked) until:
  - Lesson 1's last island is completed
  - AND calendar day changes (midnight)
  - AND `progress.currentLesson` is manually incremented (the code never does this!)
- **Progress.currentLesson is never updated** when lesson is completed

### Missing Logic
The app never advances `progress.currentLesson` after a lesson is 100% complete. Lesson state logic depends on this value being updated.

---

## ISSUE #3: All Lessons Show Green - Incorrect Color Scheme

### Problem
Lessons display in green even before completion (should be blue=unlocked, gray=locked, yellow=completed).

### Root Cause
The state determination has only 4 states but no "unlocked but not started" state:

**Actual states assigned:**
- `'locked_content'` → gray/grayscale (opacity-40)
- `'available_tomorrow'` → gray (opacity-50)
- `'active'` → **GREEN** (bg-green-100)
- `'completed'` → yellow (bg-yellow-100)

**Missing state:**
- `'blue'` for "unlocked and available now" should display differently from green

**CSS Evidence** (`App.tsx` line 451):
```tsx
const className = `p-4 rounded-lg border flex items-center justify-between ${
  state === 'active' ? 'bg-green-100 cursor-pointer hover:bg-blue-50' :  // ❌ Currently GREEN
  state === 'available_tomorrow' ? 'bg-gray-100 opacity-50' :
  state === 'locked_content' ? 'bg-gray-200 opacity-40 grayscale' :
  'bg-yellow-100'
}`;
```

### Why Lessons Appear Green
1. New users: all lessons 1-6 have `diamond: 0` → not completed
2. None are locked because `isAdmin = false` but bypass is never triggered
3. State logic treats everything as `'active'` (green)
4. No visual distinction between "just unlocked" and "already in progress"

---

## Summary Table

| Issue | Component | Lines | Severity | Root Cause |
|-------|-----------|-------|----------|-----------|
| **#1: No Auth Persistence** | `App.tsx` | 236-253 | 🔴 CRITICAL | App ignores `auth.currentUser` after login |
| **#2: Wrong Unlock Logic** | `App.tsx` | 420-450, 504-515 | 🔴 CRITICAL | `isLessonLocked()` checks wrong condition; `progress.currentLesson` never updated |
| **#3: Wrong Color States** | `App.tsx` | 451-457 | 🟠 HIGH | State logic is incomplete; needs separate "unlocked" state |

---

## Recommended Fixes (Priority Order)

### Priority 1: Fix Lesson Unlock Logic
1. **Change `isLessonLocked()` logic:**
   - Only check if previous lesson diamond = 100
   - Remove the "different day" requirement OR move it to a separate dailyLimitExceeded() check
   - Allow multiple lessons to unlock as prerequisites are met

2. **Update progress.currentLesson on lesson completion:**
   - In `finalizeIsland()` when a lesson reaches 100% diamond, increment `progress.currentLesson`

3. **Fix lesson state assignment:**
   ```tsx
   if (diamond === 100) state = 'completed';
   else if (lesson.id <= progress.currentLesson && isLessonLocked(lesson.id) === false) state = 'active';
   else if (isLessonLocked(lesson.id)) state = 'locked_content';
   else state = 'available'; // Or 'blue'
   ```

### Priority 2: Add Auth Persistence
1. Store `auth.currentUser?.uid` in localStorage on successful login
2. On app load, check `auth.currentUser` and set student context
3. Add separate `isAuthenticated` flag to distinguish guest vs registered users

### Priority 3: Fix Visual States
1. Add 4th color state for "unlocked but not started"
2. Update CSS to map:
   - Gray → locked
   - Blue → unlocked, available
   - Yellow → completed
   - Remove green or use for "in progress"

---

## Files to Modify
- `App.tsx` - lesson logic, auth persistence, progress updates
- `firebase.ts` - potentially add auth persistence helpers
- `constants.tsx` - LESSON_CONFIGS may need review
- `UI.tsx` - color/state mapping (if visual scheme changes)

