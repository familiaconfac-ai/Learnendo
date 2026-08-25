export type AuthenticationAction = 'login' | 'register';

export function mapAuthError(code: string, action: AuthenticationAction = 'login'): string {
  if (action === 'register') {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'This email is already in use. Please log in or use a different email.';
      case 'auth/weak-password':
      case 'auth/password-does-not-meet-requirements':
        return 'Password must be at least 6 characters and meet the account security requirements.';
      case 'auth/invalid-email':
        return 'Invalid email format.';
      case 'auth/operation-not-allowed':
        return 'Account creation is currently unavailable. Please contact support.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection.';
      case 'permission-denied':
      case 'firestore/permission-denied':
        return 'Account creation could not initialize your profile. Please contact support.';
      default:
        return code
          ? `Account creation failed (${code}). Please try again.`
          : 'Account creation failed. Please try again.';
    }
  }

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password.';
    case 'auth/invalid-email':
      return 'Invalid email format.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      return 'Login failed. Please try again.';
  }
}
