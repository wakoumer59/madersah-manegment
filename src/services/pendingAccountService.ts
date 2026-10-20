// Pending account (activation code) service — /pendingAccounts.
// One-time codes created by institution admins to onboard students & teachers
// without paid SMS. The code is bound to one email and one auth uid.
import {
  get, ref, remove, serverTimestamp, set, update,
} from 'firebase/database';
import { getDb } from '@/firebase/init';
import type { PendingAccount } from '@/types';

function toPendingAccount(_id: string, value: Record<string, unknown>): PendingAccount {
  return {
    code: String(value.code ?? ''),
    email: String(value.email ?? ''),
    displayName: String(value.displayName ?? ''),
    role: (value.role as PendingAccount['role']) ?? 'student',
    institutionId: String(value.institutionId ?? ''),
    classId: (value.classId as string | null) ?? null,
    status: (value.status as PendingAccount['status']) ?? 'unused',
    createdBy: String(value.createdBy ?? ''),
    createdAt: Number(value.createdAt ?? 0),
    usedBy: (value.usedBy as string | null) ?? null,
  };
}

/** Create a new activation code. Returns the generated code. */
export async function createPendingAccountCode(input: {
  email: string; displayName: string; role: PendingAccount['role'];
  institutionId: string; classId?: string | null; createdBy: string;
}): Promise<string> {
  const code = `MDR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  await set(ref(getDb(), `pendingAccounts/${code}`), {
    code, email: input.email.trim().toLowerCase(), displayName: input.displayName.trim(),
    role: input.role, institutionId: input.institutionId,
    classId: input.classId ?? null, status: 'unused', usedBy: null,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  });
  return code;
}

/** List activation codes for the current institution (newest first). */
export async function listPendingAccountCodes(
  institutionId: string,
): Promise<PendingAccount[]> {
  // Note: RTDB can't filter by institutionId efficiently without an index.
  // We fetch all codes for the institution by scanning — acceptable for small
  // institutions; add an index keyed by institutionId if this grows.
  const snapshot = await get(ref(getDb(), 'pendingAccounts'));
  if (!snapshot.exists()) return [];
  const codes: PendingAccount[] = [];
  snapshot.forEach((childSnap) => {
    const pa = toPendingAccount(childSnap.key, childSnap.val() as Record<string, unknown>);
    if (pa.institutionId === institutionId) codes.push(pa);
  });
  return codes.sort((a, b) => b.createdAt - a.createdAt);
}

/** Delete an activation code (institution admin only). */
export async function deletePendingAccountCode(code: string): Promise<void> {
  await remove(ref(getDb(), `pendingAccounts/${code}`));
}

/**
 * Redeem an activation code: mark it used and link it to the signing-up auth uid.
 * Called from the Activate page after Firebase Auth signup. The Security Rules
 * enforce email match, unused status, and one-time use.
 */
export async function redeemPendingAccountCode(code: string, uid: string): Promise<void> {
  await update(ref(getDb(), `pendingAccounts/${code}`), { status: 'used', usedBy: uid });
}
