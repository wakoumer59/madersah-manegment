// User record service — /users/{uid} in the Realtime Database.
// Role and status are NEVER writable by the account's owner (enforced by
// Security Rules); this service only performs the allowed operations.
import { get, ref, serverTimestamp, update } from 'firebase/database';
import { getDb } from '@/firebase/init';
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
    mustChangePassword: data.mustChangePassword === true,
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
 * field). Activating a teacher also creates their institution roster record.
 * The account, roster record, and one-time code are updated atomically.
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

  const updates: Record<string, unknown> = {
    [`users/${uid}/role`]: role,
    [`users/${uid}/institutionId`]: institutionId,
    [`users/${uid}/classId`]: classId,
    [`users/${uid}/status`]: 'active',
    [`users/${uid}/activationCode`]: code,
    [`users/${uid}/displayName`]: displayName,
    [`pendingAccounts/${code}/status`]: 'used',
    [`pendingAccounts/${code}/usedBy`]: uid,
    [`pendingAccountsByInstitution/${institutionId}/${code}/status`]: 'used',
    [`pendingAccountsByInstitution/${institutionId}/${code}/usedBy`]: uid,
  };

  if (role === 'teacher') {
    updates[`${institutionId}/teachers/${uid}`] = {
      uid,
      displayName,
      email: normalizedEmail,
      status: 'active',
      createdAt: serverTimestamp(),
      activationCode: code,
    };
  } else if (role === 'student') {
    updates[`${institutionId}/students/${uid}`] = {
      uid,
      displayName,
      email: normalizedEmail,
      classId,
      admissionNo: String(pa.admissionNo ?? ''),
      status: 'active',
      createdAt: serverTimestamp(),
      activationCode: code,
    };
  }

  await update(ref(db), updates);

  return role;
}
