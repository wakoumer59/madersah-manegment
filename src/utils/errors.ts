// Maps Firebase Auth error codes to friendly, non-technical messages.
// Never display raw Firebase error messages to end users.
import { strings } from '@/strings';

export function mapAuthError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return strings.errors.invalidCredentials;
    case 'auth/email-already-in-use':
      return strings.errors.emailInUse;
    case 'auth/weak-password':
      return strings.errors.weakPassword;
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/network-request-failed':
      return strings.errors.noConnection;
    case 'auth/too-many-requests':
      return strings.errors.tooManyRequests;
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact your administrator.';
    default:
      return strings.errors.generic;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return strings.errors.generic;
}
