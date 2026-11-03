// Pending account (activation code) service — /pendingAccounts.
// One-time codes created by institution admins to onboard students & teachers
// without paid SMS. The code is bound to one email and one auth uid.
import {
  get, ref, serverTimestamp, update,
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
    admissionNo: (value.admissionNo as string | null) ?? null,
    status: (value.status as PendingAccount['status']) ?? 'unused',
    createdBy: String(value.createdBy ?? ''),
    createdAt: Number(value.createdAt ?? 0),
    usedBy: (value.usedBy as string | null) ?? null,
  };
}

/** Create a new activation code. Returns the generated code. */
export async function createPendingAccountCode(input: {
  email: string; displayName: string; role: PendingAccount['role'];
  institutionId: string; classId?: string | null; admissionNo?: string | null; createdBy: string;
}): Promise<string> {
  const code = `MDR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const account = {
    code, email: input.email.trim().toLowerCase(), displayName: input.displayName.trim(),
    role: input.role, institutionId: input.institutionId,
    classId: input.classId ?? null, admissionNo: input.admissionNo ?? null,
    status: 'unused', usedBy: null,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  };
  await update(ref(getDb()), {
    [`pendingAccounts/${code}`]: account,
    [`pendingAccountsByInstitution/${input.institutionId}/${code}`]: account,
  });
  return code;
}

/** List activation codes for the current institution (newest first). */
export async function listPendingAccountCodes(
  institutionId: string,
): Promise<PendingAccount[]> {
  const snapshot = await get(ref(getDb(), `pendingAccountsByInstitution/${institutionId}`));
  if (!snapshot.exists()) return [];
  const codes: PendingAccount[] = [];
  snapshot.forEach((childSnap) => {
    codes.push(toPendingAccount(childSnap.key, childSnap.val() as Record<string, unknown>));
  });
  return codes.sort((a, b) => b.createdAt - a.createdAt);
}

/** Delete an activation code (institution admin only). */
export async function deletePendingAccountCode(institutionId: string, code: string): Promise<void> {
  await update(ref(getDb()), {
    [`pendingAccounts/${code}`]: null,
    [`pendingAccountsByInstitution/${institutionId}/${code}`]: null,
  });
}
