// User record service — /users/{uid} in the Realtime Database.
// Role and status are NEVER writable by the account's owner (enforced by
// Security Rules); this service only performs the allowed operations.
import { get, ref, update } from 'firebase/database';
import { getDb } from '@/firebase/init';
import { redeemPendingAccountCode } from '@/services/pendingAccountService';
import type { UserRecord } from '@/types';

function toUserRecord(uid: string, data: Record<string, unknown>): UserRecord {
  return {
    uid,
    email: String(data.email ?? ''),
    displayName: String(data.displayName ?? ''),
    role: data.role as UserRecord['role'],
    status: data.status as UserRecord['status'],
    institutionId: (data.institutionId as string | null) ?? null,
    classId: (data.classId as string | null) ?? null,
    createdAt: Number(data.createdAt ?? 0),
  };
}

/** Fetches the signed-in user's record. Throws when it does not exist. */
export async function getMyUser(uid: string): Promise<UserRecord | null> {
  const snapshot = await get(ref(getDb(), `users/${uid}`));
  if (!snapshot.exists()) return null;
  return toUserRecord(uid, snapshot.val() as Record<string, unknown>);
}

/**
 * Redeem an activation code and activate a pending user account.
 *
 * Validates the code exists, is unused, and matches the given email, then
 * updates /users/{uid} from role='pending'/'status'='pending' to the real
 * role/institution/class bound to the code (Security Rules enforce every
 * field). Finally marks the code as used (one-time use).
 *
 * Returns the newly activated role so the caller can redirect accordingly.
 */
export async function redeemCodeAndActivate(
  uid: string,
  email: string,
  code: string,
): Promise<UserRecord['role']> {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();

  const codeSnap = await get(ref(db, `pendingAccounts/${code}`));
  if (!codeSnap.exists()) {
    throw new Error('Invalid activation code.');
  }
  const pa = codeSnap.val() as Record<string, unknown>;
  if (String(pa.status) !== 'unused') {
    throw new Error('This activation code has already been used.');
  }
  if (String(pa.email).toLowerCase() !== normalizedEmail) {
    throw new Error('The activation code does not match this email address.');
  }

  const role = String(pa.role) as UserRecord['role'];
  const institutionId = String(pa.institutionId);
  const classId = (pa.classId as string | null) ?? null;
  const displayName = String(pa.displayName ?? '');

  // Security rules enforce: existing role must be 'pending', email must match
  // auth.token.email, code must be unused, and all bound fields must match.
  await update(ref(db, `users/${uid}`), {
    role,
    institutionId,
    classId,
    status: 'active',
    activationCode: code,
    displayName,
  });

  // Mark the code as used (one-time use).
  await redeemPendingAccountCode(code, uid);

  return role;
}
