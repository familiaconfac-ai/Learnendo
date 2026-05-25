# Anonymous Conversion - Quick Reference

## File Locations

### Core Implementation (Both apps identical)

**apps/main/src/services/firebase.ts**
- Function: `convertAnonymousToUser(email: string, password: string)`
- Lines: ~105-147
- Purpose: Firebase Auth linkWithCredential wrapper

**apps/main/src/services/db.ts**
- Function: `createOrUpdateUserProfile(user: User, emailOverride?: string)`
- Purpose: Update Firestore user document after conversion
- Key change: Added optional `emailOverride` parameter

**apps/main/src/components/AnonymousConversion/ConversionModal.tsx** (NEW)
- 185 lines
- Complete modal UI for email/password form
- Validation, loading, error display

**apps/main/src/App.tsx**
- Added state: `showConversionModal`, `conversionReason`, `conversionSuccess`
- Added function: `triggerConversion(reason?: string)`
- Updated routing: PlacementTest now receives `onTriggerConversion` callback
- Renders: ConversionModal + success notification

**apps/main/src/components/PlacementTest/PlacementTest.tsx**
- Updated interface: Added `onTriggerConversion?: (reason?: string) => void`
- Added button: "📧 Create Account" (purple) conditional for anonymous users

**apps/wbk-5/src/** 
- Identical copies of all above files

---

## API Reference

### `convertAnonymousToUser(email, password)`

```typescript
async function convertAnonymousToUser(email: string, password: string): Promise<{
  uid: string;
  email: string;
  isAnonymous: false;
  displayName: string | null;
}>
```

**Usage:**
```typescript
try {
  const result = await convertAnonymousToUser('user@example.com', 'password123');
  console.log('Converted! UID:', result.uid);
} catch (error: any) {
  console.error('Conversion failed:', error.message);
}
```

**Throws:**
- `auth/email-already-in-use` — Email already registered
- `auth/weak-password` — Password < 6 chars
- `auth/account-exists-with-different-credential` — Email conflict
- `Error: No user logged in` — User not authenticated
- `Error: User is not anonymous` — Already registered

**Side effects:**
- Updates Firebase Auth: User now has email/password
- Updates Firestore: User document email field populated
- UID unchanged (data preserved)

---

### `createOrUpdateUserProfile(user, emailOverride?)`

```typescript
async function createOrUpdateUserProfile(
  user: User,
  emailOverride?: string
): Promise<void>
```

**Usage in conversion flow:**
```typescript
const result = await convertAnonymousToUser(email, password);
await createOrUpdateUserProfile(result, email); // emailOverride = user's new email
```

**What it does:**
- Creates or updates `/users/{uid}` in Firestore
- Sets `wasAnonymous: true` if converting
- Sets `email` to emailOverride if provided
- Uses `merge: true` so existing data preserved
- Sets `lastLoginAt` timestamp

**Side effects:**
- Updates Firestore document
- Logs operation to console

---

## Component Props

### ConversionModal

```typescript
interface ConversionModalProps {
  user: User;                    // Firebase Auth user object
  isOpen: boolean;               // Should modal be visible?
  onSuccess: () => void;         // Called after successful conversion
  onCancel: () => void;          // Called when user clicks cancel
  reason?: string;               // Optional message (e.g., "Save your score")
}
```

**Example:**
```tsx
<ConversionModal
  user={currentUser}
  isOpen={showModal}
  onSuccess={() => {
    console.log('All done!');
    setShowModal(false);
  }}
  onCancel={() => setShowModal(false)}
  reason="Create account to save your placement test score"
/>
```

---

### PlacementTest

**New prop:**
```typescript
interface PlacementTestProps {
  onComplete: (score: number) => void;
  onTriggerConversion?: (reason?: string) => void;  // NEW
}
```

**Usage:**
```tsx
<PlacementTest
  onComplete={handlePlacementComplete}
  onTriggerConversion={(reason) => {
    setConversionReason(reason);
    setShowConversionModal(true);
  }}
/>
```

---

## State Management in App.tsx

```typescript
// Show/hide modal
const [showConversionModal, setShowConversionModal] = useState(false);

// Optional context message for modal
const [conversionReason, setConversionReason] = useState<string | undefined>();

// Show success notification for 3 seconds
const [conversionSuccess, setConversionSuccess] = useState(false);

// Helper to trigger conversion flow
const triggerConversion = (reason?: string) => {
  setConversionReason(reason);
  setShowConversionModal(true);
};
```

---

## Calling from Other Components

Any component can trigger the conversion flow by:

1. Receiving `onTriggerConversion` as a prop
2. Calling it with optional reason:
   ```typescript
   onTriggerConversion?.('Context about why converting');
   ```

Current usage:
- PlacementTest → After completing test
- Can be extended to: restricted features, save data, etc.

---

## Firestore Document Structure

### Before Conversion

```javascript
users/{uid} = {
  uid: "abc123",
  name: "Guest User",
  email: null,  // ← Not set
  isAnonymous: true,
  createdAt: Timestamp(...),
  lastLoginAt: Timestamp(...),
  // ... other fields
}
```

### After Conversion

```javascript
users/{uid} = {
  uid: "abc123",         // ← SAME!
  name: "Guest User",    // ← Unchanged
  email: "user@example.com",  // ← NOW SET
  isAnonymous: false,    // ← Changed
  wasAnonymous: true,    // ← NEW tracking flag
  createdAt: Timestamp(...),
  lastLoginAt: Timestamp(updated),
  // ... other fields preserved
}
```

---

## Validation Rules

### Email
- [ ] Not empty
- [ ] Contains '@'
- [ ] Not already registered in Firebase
- [ ] Max 254 characters (RFC 5321)

### Password
- [ ] Minimum 6 characters
- [ ] Matches confirmation field
- [ ] Not empty

### Form Submission
- [ ] All validations pass
- [ ] No network request in progress
- [ ] User not null

---

## Error Messages

| Validation | Error Message | User Action |
|-----------|---------------|-------------|
| Empty email | "Please enter your email" | Type email |
| Invalid email | "Please enter a valid email (e.g., you@example.com)" | Fix format |
| Short password | "Password must be at least 6 characters" | Use longer password |
| Password mismatch | "Passwords don't match" | Retype password |
| Email in use | "This email is already registered. Please use another email or sign in." | Try different email |
| Weak password | "Password doesn't meet security requirements" | Strengthen password |
| Account exists | "This email is linked to another account type" | Use different email |
| Network error | "Connection failed. Please try again." | Retry or check internet |

---

## Testing Checklist

### Setup
- [ ] Run `npm install` in apps/main and apps/wbk-5
- [ ] Set GEMINI_API_KEY environment variable
- [ ] Run `npm run dev`

### Anonymous User Flow
- [ ] Open app incognito/private window
- [ ] Verify "Guest User" in header
- [ ] Complete placement test
- [ ] See "Create Account" button

### Conversion Modal
- [ ] Click "Create Account" button
- [ ] Modal appears with reason message
- [ ] Email field: Placeholder text visible
- [ ] Password field: Dots displayed
- [ ] Confirm field: Dots displayed

### Form Validation
- [ ] Click Create with empty email → Error message
- [ ] Enter invalid email → Error message
- [ ] Short password → Error message
- [ ] Password mismatch → Error message
- [ ] Valid form → Button enabled

### Successful Conversion
- [ ] Enter valid email + password
- [ ] Click Create → Spinner shows
- [ ] Buttons disabled during conversion
- [ ] Success notification appears (green pill)
- [ ] Modal closes automatically
- [ ] Notification auto-hides after 3s

### Data Verification
1. Firebase Console:
   - [ ] Open Firestore
   - [ ] Navigate to `/users/{uid}`
   - [ ] Verify `email` field populated
   - [ ] Verify `isAnonymous: false`
   - [ ] Verify `wasAnonymous: true`

2. In-App Verification:
   - [ ] Refresh page
   - [ ] User still logged in
   - [ ] Email visible in profile/header
   - [ ] "Create Account" button gone

### Error Cases
- [ ] Try duplicate email → Error message
- [ ] Try weak password → Error message
- [ ] Disconnect internet mid-conversion → Error message
- [ ] Cancel modal → Returns to results screen
- [ ] Can try again after error

---

## Common Code Patterns

### Trigger from Your Component

```typescript
// In your component props
interface YourComponentProps {
  onTriggerConversion?: (reason?: string) => void;
}

// In your JSX
<button 
  onClick={() => onTriggerConversion?.('Your custom reason')}
>
  Create Account
</button>
```

### Check if Anonymous

```typescript
if (auth.currentUser?.isAnonymous) {
  // Show conversion button
}
```

### After Successful Conversion

```typescript
// onSuccess callback in ConversionModal
onSuccess={() => {
  // User is now registered
  // UID preserved, all data intact
  // Can do: refresh UI, show welcome message, redirect, etc.
}}
```

### Handle Conversion Error

```typescript
// Inside ConversionModal or custom handler
try {
  await convertAnonymousToUser(email, password);
} catch (error: any) {
  // error.code = 'auth/email-already-in-use' etc.
  // error.message = user-friendly message
  setError(error.message);
}
```

---

## Debugging Tips

### Console Logs to Watch

```
[Firebase] Checking if user is anonymous...
[Firebase] Creating email credential...
[Firebase] Linking credential to account...
[Firebase] ✅ Conversion successful
[ConversionModal] ✅ Converting account...
[ConversionModal] ✅ Firestore profile updated
```

### Verify User State

```javascript
// In browser console:
firebase.auth().currentUser // Check current user
firebase.auth().currentUser.email // Should be populated after conversion
firebase.auth().currentUser.isAnonymous // Should be false after conversion
```

### Check Firestore

```javascript
// In browser console:
db.collection('users').doc(uid).get().then(doc => console.log(doc.data()))
// Should show: email, isAnonymous: false, wasAnonymous: true
```

---

## Performance Notes

- Modal renders immediately
- Form validation instant (< 5ms)
- Firebase Auth operation: 500-1500ms (network dependent)
- Firestore update: 500-1500ms (network dependent)
- Total flow: 1-3 seconds typical

No database migrations, no cleanup jobs needed.

---

## Security Considerations

✅ linkWithCredential used (preserves UID)
✅ Passwords never sent in plain text (Firebase HTTPS)
✅ Passwords never logged (Firebase automatic)
✅ Email validation by Firebase (no duplicates)
✅ UID immutability (data loss impossible)
✅ Firestore security rules enforce user isolation

⚠️ Do NOT:
- Implement custom password validation
- Store passwords anywhere
- Persist bypass state
- Expose API keys
- Trust client-side auth checks only

---

## Related Files

- `TEACHER_DASHBOARD_GUIDE.md` — Teacher dashboard feature
- `ANONYMOUS_CONVERSION_GUIDE.md` — User-facing guide
- `ANONYMOUS_CONVERSION_TECHNICAL.md` — Detailed technical overview
- Copilot instructions: `.github/copilot-instructions.md`

