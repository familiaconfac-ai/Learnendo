import assert from 'node:assert/strict';
import { mapAuthError } from './authErrorMessage.ts';

assert.match(mapAuthError('auth/weak-password', 'register'), /at least 6 characters/);
assert.match(mapAuthError('auth/password-does-not-meet-requirements', 'register'), /security requirements/);
assert.match(mapAuthError('auth/email-already-in-use', 'register'), /already in use/);
assert.equal(mapAuthError('auth/invalid-email', 'register'), 'Invalid email format.');
assert.match(mapAuthError('auth/operation-not-allowed', 'register'), /Account creation is currently unavailable/);
assert.match(mapAuthError('permission-denied', 'register'), /initialize your profile/);
assert.match(mapAuthError('auth/unexpected-configuration', 'register'), /auth\/unexpected-configuration/);
assert.equal(mapAuthError('', 'register'), 'Account creation failed. Please try again.');

for (const code of [
  'auth/weak-password',
  'auth/email-already-in-use',
  'auth/operation-not-allowed',
  'permission-denied',
  '',
]) assert.doesNotMatch(mapAuthError(code, 'register'), /Login failed/);

assert.equal(mapAuthError('auth/invalid-credential', 'login'), 'Invalid email or password.');
assert.equal(mapAuthError('auth/wrong-password', 'login'), 'Invalid email or password.');
assert.equal(mapAuthError('auth/user-not-found', 'login'), 'Invalid email or password.');
assert.equal(mapAuthError('auth/unknown', 'login'), 'Login failed. Please try again.');

console.log('account creation error message tests passed');
