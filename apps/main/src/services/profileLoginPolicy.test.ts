import assert from 'node:assert/strict';
import { resolveLoginProfileFields } from './profileLoginPolicy.ts';

assert.deepEqual(
  resolveLoginProfileFields(
    { name: 'Official Name', displayName: 'Official Name', email: 'official@example.com' },
    'Old Auth Name',
    'old-auth@example.com',
  ),
  { name: 'Official Name', email: 'official@example.com' },
  'an existing Firestore profile must win over stale Firebase Auth data',
);

assert.deepEqual(
  resolveLoginProfileFields({ name: 'Admin Name', email: null }, 'Auth Name', 'auth@example.com'),
  { name: 'Admin Name', email: null },
  'an administratively cleared email must not be restored from Firebase Auth',
);

assert.deepEqual(
  resolveLoginProfileFields({}, 'First Login', 'first@example.com'),
  { name: 'First Login', email: 'first@example.com' },
  'Firebase Auth should initialize a profile when Firestore has no official data',
);

assert.deepEqual(
  resolveLoginProfileFields({ name: 'Player_ABC123' }, 'Converted User', 'converted@example.com'),
  { name: 'Player_ABC123', email: 'converted@example.com' },
  'even an existing guest alias must not be silently replaced during login',
);

console.log('profile login policy tests passed');
