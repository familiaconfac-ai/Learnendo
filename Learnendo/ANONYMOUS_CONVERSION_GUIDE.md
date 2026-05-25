# Anonymous User Conversion to Registered Accounts

## Overview

The Anonymous Conversion feature allows anonymous users to upgrade their accounts to registered users without losing any data. The system uses Firebase's `linkWithCredential` to preserve the user's UID and all associated data.

**Trigger Points:**
- After placement test completion (optional "Create Account" button)
- Can be triggered programmatically from any component
- Success notification with data preservation guarantee

---

## How It Works

### User Flow

```
Anonymous User
      ↓
Complete Placement Test (or trigger conversion)
      ↓
[ConversionModal appears]
      ↓
User enters email & password
      ↓
convertAnonymousToUser(email, password)
      ↓
linkWithCredential links email/password to existing UID
      ↓
User's UID stays the same ✓
User's data stays the same ✓
User is now a registered user
      ↓
Success notification shown
```

### Technical Mechanism

Uses Firebase Auth's `linkWithCredential`:
- **Before:** User has UID with anonymous authentication
- **Process:** Email credential linked to same UID
- **After:** Same UID, now with email/password + all old data preserved

```typescript
// Core mechanism
const credential = EmailAuthProvider.credential(email, password);
const result = await linkWithCredential(currentUser, credential);
// result.user.uid === currentUser.uid (UID never changes)
```

---

## API Reference

### `convertAnonymousToUser(email, password)`

Converts an anonymous Firebase user to a registered user.

**Location:** `services/firebase.ts`

**Parameters:**
- `email` (string) - Email for the new account
- `password` (string) - Password (min 6 characters)

**Returns:**
```typescript
{
  uid: string;           // Same UID as before
  email: string;         // New registered email
  isAnonymous: false;    // Now registered
  displayName: string | null;
}
```

**Throws Errors:**
- `"No user logged in"` - If auth.currentUser is null
- `"User is not anonymous"` - If already registered
- `"Password must be at least 6 characters"` - If password too short
- `"This email is already registered"` - If email taken
- `"Password is too weak"` - If password weak
- `"This email is associated with a different login method"` - If email conflict

**Example Usage:**
```typescript
try {
  const result = await convertAnonymousToUser('user@example.com', 'securePassword123');
  console.log('Converted:', result.uid, result.email);
} catch (error) {
  console.error('Conversion failed:', error.message);
}
```

---

## UI Components

### ConversionModal

Modal dialog for anonymous user conversion.

**Location:** `components/AnonymousConversion/ConversionModal.tsx`

**Props:**
```typescript
interface ConversionModalProps {
  user: User;                    // Firebase Auth user
  isOpen: boolean;               // Show/hide modal
  onSuccess: () => void;         // Called when conversion succeeds
  onCancel: () => void;          // Called when user cancels
  reason?: string;               // Custom message (default: generic)
}
```

**Features:**
- Email & password input with validation
- Password confirmation
- Loading state during conversion
- Error messages for failed conversions
- Success notification after completion
- Data safety notice

**Example Integration:**
```typescript
<ConversionModal
  user={authUser}
  isOpen={showModal}
  onSuccess={() => {
    console.log('Account created!');
    setShowModal(false);
  }}
  onCancel={() => setShowModal(false)}
  reason="Create an account to save your progress."
/>
```

---

## Integration Points

### 1. After Placement Test

**Location:** `PlacementTest.tsx`

Shows optional "📧 Create Account" button after test completion (only for anonymous users).

```tsx
{auth.currentUser?.isAnonymous && (
  <button
    onClick={() => onTriggerConversion?.('Create an account to save your placement test score.')}
    className="bg-purple-600 text-white..."
  >
    📧 Create Account
  </button>
)}
```

### 2. Programmatic Trigger from App.tsx

**App State:**
```typescript
const [showConversionModal, setShowConversionModal] = useState(false);
const [conversionReason, setConversionReason] = useState<string | undefined>();
const [conversionSuccess, setConversionSuccess] = useState(false);

// Helper function
const triggerConversion = (reason?: string) => {
  setConversionReason(reason);
  setShowConversionModal(true);
};
```

**Usage:**
```typescript
// Trigger conversion from any component
<button onClick={() => triggerConversion('Save your learning progress')}>
  Upgrade Account
</button>
```

### 3. Event Handlers

**On Success:**
```typescript
onSuccess={() => {
  setShowConversionModal(false);
  setConversionSuccess(true);
  setTimeout(() => setConversionSuccess(false), 3000); // Auto-hide after 3s
}}
```

**Success Notification:**
```tsx
{conversionSuccess && (
  <div className="fixed bottom-24 bg-green-500 text-white px-6 py-3 rounded-full">
    ✅ Account created successfully! Your progress is saved.
  </div>
)}
```

---

## Firestore Integration

### User Profile Update

After successful conversion, Firestore profile is updated:

```typescript
// In ConversionModal.tsx
await createOrUpdateUserProfile(user, email);
```

**Updated Firestore Document** (`/users/{uid}`):
```javascript
{
  uid: "user_123",
  name: "John Doe",
  email: "john@example.com",        // ← Now populated
  isAnonymous: false,               // ← Changed to false
  wasAnonymous: true,               // ← Tracks conversion history
  createdAt: Timestamp(...),
  lastLoginAt: Timestamp(...)
}
```

---

## Error Handling

The system handles common conversion errors gracefully:

| Error | Cause | User Message |
|-------|-------|--------------|
| `auth/email-already-in-use` | Email registered | "This email is already registered. Try different." |
| `auth/weak-password` | Password too simple | "Password too weak. Use stronger password." |
| `auth/account-exists-with-different-credential` | Email conflict | "Email associated with different login method." |
| Network error | Connection lost | "Conversion failed. Please try again." |

**Validation Flow:**
```
Email validation ↓
Password length check (6+ chars) ↓
Password match check ↓
Convert process ↓
Update Firestore ↓
Show success
```

---

## Data Preservation Guarantee

### What's Preserved

✅ **User UID** (core identifier, stays the same)
✅ **All Firestore data** under `/users/{uid}/`:
   - Sessions history
   - Placement test scores
   - Progress records
   - Daily access logs
✅ **Local storage data**
✅ **Authentication history**

### What Changes

🔄 `isAnonymous` → `false`
🔄 `email` → User's new email
🔄 `wasAnonymous` → `true` (tracks history)
🔄 Auth method → Email/password (+ Firebase token)

### How to Verify

After conversion, check Firestore:
1. Navigate to Firebase Console
2. Go to Firestore → users collection
3. Find document with user's UID
4. Verify `email` is populated and `isAnonymous: false`

---

## Security Considerations

### Implemented

✅ **Real email validation** - Firebase prevents duplicates
✅ **Strong password enforcement** - Minimum 6 characters
✅ **HTTPS-only** - Firebase always uses secure connections
✅ **UID immutability** - No data loss during conversion
✅ **Firestore rules** - User can only modify own data

### Best Practices

1. **Always call** `createOrUpdateUserProfile()` after conversion
2. **Store original UID** before conversion (preserved automatically)
3. **Show success notification** to confirm completion
4. **Test offline** to ensure graceful failures
5. **Monitor Firestore logs** for conversion attempts

---

## Testing Checklist

- [ ] **Anonymous user flow:** Login anonymously → Complete test → See "Create Account" button
- [ ] **Successful conversion:** Enter email/password → See success message
- [ ] **Data preservation:** Verify UID unchanged, all data intact in Firestore
- [ ] **Email already registered:** Try existing email → See error message
- [ ] **Weak password:** Try short password → See validation error
- [ ] **Password mismatch:** Enter different passwords → See error
- [ ] **Network error:** Disconnect → Try conversion → See error handling
- [ ] **Modal cancel:** Open modal → Click Cancel → Modal closes without changes
- [ ] **Button visibility:** Check button only shows for anonymous users
- [ ] **Both apps:** Test in both apps/main and apps/wbk-5

---

## File Structure

```
apps/main/
├── src/
│   ├── components/
│   │   └── AnonymousConversion/
│   │       └── ConversionModal.tsx          ← Modal UI
│   ├── services/
│   │   ├── firebase.ts                      ← convertAnonymousToUser()
│   │   └── db.ts                            ← createOrUpdateUserProfile()
│   ├── components/PlacementTest/
│   │   └── PlacementTest.tsx                ← Trigger point
│   └── App.tsx                              ← State + modal rendering

apps/wbk-5/
├── src/
│   ├── components/
│   │   └── AnonymousConversion/
│   │       └── ConversionModal.tsx          ← (Synchronized copy)
│   ├── services/
│   │   ├── firebase.ts                      ← (Synchronized copy)
│   │   └── db.ts                            ← (Synchronized copy)
│   ├── components/PlacementTest/
│   │   └── PlacementTest.tsx                ← (Synchronized copy)
│   └── App.tsx                              ← (Synchronized copy)
```

---

## Console Logging

All operations log with clear prefixes for debugging:

```typescript
// In firebase.ts
console.log('[Firebase] Converting anonymous user to registered:', uid);
console.log('[Firebase] ✅ Conversion successful. Email:', email);
console.error('[Firebase] ❌ Conversion Error:', error);

// In ConversionModal.tsx
console.log('[ConversionModal] Starting conversion for:', uid);
console.log('[ConversionModal] ✅ Auth conversion complete');
console.log('[ConversionModal] ✅ Firestore profile updated');
console.error('[ConversionModal] ❌ Conversion failed:', error);

// In App.tsx
console.log('[App] ✅ Firestore tracking complete');
```

Search console for `[Firebase]`, `[ConversionModal]` prefixes for debugging.

---

## Future Enhancements

1. **Magic Link Registration** - Send email with conversion link
2. **Social Login Upgrade** - Convert to Google/GitHub
3. **Phone Number Option** - Support SMS verification
4. **Username Choice** - Let users pick custom username
5. **Email Verification** - Require email confirmation
6. **Profile Completion** - Collect additional info after conversion
7. **Analytics** - Track conversion rates and drop-off points
8. **Incentives** - Offer rewards for account creation

---

## Related Documentation

- Firebase Auth Docs: https://firebase.google.com/docs/auth
- `linkWithCredential` API: https://firebase.google.com/docs/reference/js/auth.md#linkwithcredential
- Firestore User Tracking: See `FIREBASE_PROGRESS_TRACKING.md`
- Security Rules: See security rules section in project docs

---

## Support & Troubleshooting

**Q: User sees "Account created but not working"**
- Check Firestore rules allow user read/write on `/users/{uid}`
- Verify `createOrUpdateUserProfile()` completed successfully
- Check browser console for `[ConversionModal]` errors

**Q: Conversion button doesn't appear**
- Verify user is logged in as anonymous (`auth.currentUser.isAnonymous === true`)
- Check PlacementTest component received `onTriggerConversion` prop
- Verify `showConversionModal` state is being managed in App.tsx

**Q: "Email already registered" error**
- User must choose a different email
- If reusing known email, they should use normal login instead
- No way to recover pre-registered emails

**Q: Data lost after conversion**
- Not possible - UID immutability guarantees this
- Check Firestore console to verify `/users/{uid}/*` collections exist
- Try refreshing page; data should reload from Firebase

