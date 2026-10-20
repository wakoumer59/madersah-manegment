// Firebase Authentication service — email + password.
// Passwords are handled exclusively by Firebase Auth; they are never stored,
// logged, or transmitted anywhere else.
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { ref, serverTimestamp, set } from 'firebase/database';
import { getFirebaseAuth, getDb } from '@/firebase/init';

export async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  try {
    await updateProfile(credential.user, { displayName: displayName.trim() });
    // Rules allow this create ONLY with role 'pending' / status 'pending' —
    // users can never grant themselves a role.
    await set(ref(getDb(), `users/${credential.user.uid}`), {
      uid: credential.user.uid,
      email: normalizedEmail,
      displayName: displayName.trim(),
      role: 'pending',
      status: 'pending',
      institutionId: null,
      classId: null,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Roll back the auth account so the email is not left occupied by a
    // half-created account that can never sign in.
    await credential.user.delete().catch(() => undefined);
    throw error;
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebaseAuth(), email.trim().toLowerCase(), password);
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim().toLowerCase());
}

/** Subscribes to auth state changes; returns the unsubscribe function. */
export function watchAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback, (error) => {
    console.error('Auth state error:', error);
    callback(null);
  });
}
