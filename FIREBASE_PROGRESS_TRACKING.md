# Firebase Progress Tracking Implementation Guide

## Overview

A comprehensive Firebase progress tracking system has been implemented for the Learnendo app to track student activity, weekly lesson/day progression, and performance metrics.

## Data Structures

### 1. Weekly Progress (`users/{userId}/weeklyProgress/{weekId}`)

```typescript
{
  weekId: string;
  workbookId: number;
  lessonId: number;
  weekStartDate: string; // ISO date
  days: DailyProgressData[]; // Array of 7 days
  totalDaysCompleted: number;
  fireCount: number;
  iceCount: number;
  diamondsEarned: number;
  starsEarned: number;
  completed: boolean;
  completedAt: timestamp;
}
```

### 2. Daily Progress (within Weekly Progress)

```typescript
{
  dayId: string;
  dayNumber: number;
  scheduledDate: string; // ISO date
  completedDate?: string; // ISO date
  completedOnTime: boolean;
  status: 'pending' | 'completed_on_time' | 'completed_late';
  diamondEarned: boolean;
  fireEarned: boolean;
  iceEarned: boolean;
}
```

### 3. Placement Test (`placementTests/{testId}`)

```typescript
{
  testId: string;
  userId: string;
  fullName: string;
  whatsapp: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  estimatedLevel: string;
  timestamp: timestamp;
  isAnonymous: boolean;
}
```

### 4. User Profile Updates

User documents now track:
- `totalDiamonds`: Total diamonds earned across all weeks
- `totalFire`: Total fire points (on-time completions)
- `totalIce`: Total ice points (late completions)
- `totalStars`: Total stars earned
- `placementScore`: Latest placement test score
- `placementLevel`: Latest placement test level
- `placementCompletedAt`: When placement test was completed

## Progress Logic

### Diamond (💎)
- 1 diamond per completed day
- Maximum 7 per week
- Earned regardless of timing

### Fire (🔥)
- 1 fire point per day completed on the scheduled date
- Represents discipline/punctuality
- Only earned for on-time completions

### Ice (❄️)
- 1 ice point per day completed after the scheduled date
- Represents recovery/catch-up
- Earned for late completions

### Stars (⭐)
- Calculated as: `diamondsEarned + fireCount`
- Maximum 14 per week (7 diamonds + 7 fire)
- Reflects overall week performance

## Firebase Service Functions

### Key Functions in `services/db.ts`

#### `createWeeklyProgress(uid, workbookId, lessonId, weekStartDate)`
- Creates a new weekly progress record
- Initializes 7 days with pending status
- Sets scheduled dates based on week start

#### `getWeeklyProgress(uid, weekId)`
- Retrieves current weekly progress data
- Returns null if week doesn't exist

#### `recordDailyProgress(uid, weekId, dayNumber, completedDate)`
- Records day completion
- Calculates fire/ice/diamond earnings
- Updates weekly totals
- Returns: `{ isDayComplete, fireEarned, iceEarned, isWeekComplete }`

#### `updateUserTotalProgress(uid, increments)`
- Increments total user stats
- Updates created user profile

#### `savePlacementTestResult(...)`
- Saves placement test to `placementTests/{testId}`
- Updates user profile with score and level
- Tracks full name and WhatsApp number

#### `getWeekCompletionResult(uid, weekId)`
- Returns final week stats for popup display
- Includes: diamonds, fire, ice, stars earned

## Higher-Level Engine Functions

### `engine/weeklyProgressEngine.ts`

Simplified API for app integration:

#### `initializeWeekIfNeeded(uid, workbookId, lessonId)`
- Auto-creates week if it doesn't exist
- Returns existing week if already created

#### `completeDayAndGetResult(uid, workbookId, lessonId, dayNumber)`
- Complete a day and get instant feedback
- Returns: `{ fireEarned, iceEarned, fireIconColor, daysCompleted, weekComplete, weekResult }`

#### `getWeekProgressDisplay(uid, workbookId, lessonId)`
- Get display-ready progress data
- Returns: diamonds, fire, ice, stars, and day statuses

#### `saveStudentPlacementTest(...)`
- Wrapper for placement test saving
- Returns: `{ success, testId }`

#### `canAccessDay(uid, workbookId, lessonId, dayNumber)`
- Check if student can access a specific day
- Enforces 1 new day per calendar day rule
- Allows catch-up on previously missed days

## Integration Points

### Current Implementation Strategy

The system is designed to be modular and safe:

1. **No breaking changes** - All new code is additive
2. **Optional integration** - App can use new functions without modifying existing logic
3. **Gradual rollout** - Functions can be integrated incrementally

### Where to Integrate

#### In Day Completion Handler (App.tsx)
When a student finishes a day practice:
```typescript
const result = await completeDayAndGetResult(
  uid,
  currentWorkbook,
  currentLesson,
  currentDay
);

if (result.weekComplete && result.weekResult) {
  showWeekCompletionPopup(result.weekResult);
}
```

#### In Placement Test Completion
After placement test finishes:
```typescript
await saveStudentPlacementTest(
  uid,
  studentName,
  studentWhatsApp,
  percentage,
  correctAnswers,
  totalQuestions,
  estimatedLevel,
  isAnonymous
);
```

#### In Lesson View
To display progress:
```typescript
const weekProgress = await getWeekProgressDisplay(
  uid,
  currentWorkbook,
  currentLesson
);
// Display: weekProgress.diamonds, .fire, .ice, .stars
```

## Week Complete Popup

### `components/WeekCompletionPopup/WeekCompletionPopup.tsx`

Automatically triggered when week is complete.

Displays:
- 💎 Diamonds earned
- 🔥 Fire points earned
- ❄️ Ice points earned
- ⭐ Stars earned
- Motivational message based on star count
- "Continue to Next Week" button

## Firebase Rules

Suggested Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Placement tests are append-only
    match /placementTests/{testId} {
      allow create: if request.auth != null;
      allow read: if request.auth.uid == resource.data.userId;
    }
  }
}
```

## Day Access Rules

The system enforces:

1. **One new day per calendar day** - Student can't skip ahead artificially
2. **Catch-up allowed** - Previously missed days can be completed late (earns ice, not fire)
3. **Week initialization** - First day of new week requires start date calculation
4. **Late day counting** - Completes scheduled day vs. actual completion date

## Monitoring & Analytics

Teachers can query Firebase to see:

- `users/{userId}/weeklyProgress/` - All weekly data
- `placementTests/{testId}` - All placement tests
- `users/{userId}` - Aggregate stats (totalDiamonds, totalFire, totalIce, totalStars)

## Implementation Checklist

- ✅ Firebase data structures defined
- ✅ Service functions implemented (db.ts)
- ✅ Weekly progress engine created (weeklyProgressEngine.ts)
- ✅ Week completion popup component built
- ✅ Placement test integration ready
- ⏳ App.tsx integration (next step)
- ⏳ Lesson view integration (next step)
- ⏳ Day access rule enforcement (next step)

## Next Steps

1. Integrate `completeDayAndGetResult()` in App.tsx day completion handler
2. Show `WeekCompletionPopup` when week is complete
3. Display weekly stats in lesson view
4. Enforce `canAccessDay()` restrictions in UI

## Notes

- All functions gracefully degrade if Firebase is unavailable
- Week IDs are deterministic: `workbook_{id}_lesson_{id}`
- Timestamps use Firebase serverTimestamp for consistency
- System tracks both individual days and cumulative stats
