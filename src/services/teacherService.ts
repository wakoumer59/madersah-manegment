// Teacher service — /{institutionId}/teachers/{uid} plus /users/{uid} linkage.
import {
  get, limitToFirst, orderByChild, query, ref, serverTimestamp,
  set, startAfter,
} from 'firebase/database';
import { getDb } from '@/firebase/init';
import type { Teacher, UserRecord } from '@/types';

function toTeacher(uid: string, value: Record<string, unknown>): Teacher {
  return {
    uid, displayName: String(value.displayName ?? ''), email: String(value.email ?? ''),
    status: (value.status as UserRecord['status']) ?? 'active',
    createdAt: Number(value.createdAt ?? 0),
  };
}

export async function createTeacher(input: {
  institutionId: string; uid: string; displayName: string; email: string;
}): Promise<void> {
  const instId = input.institutionId;
  await set(ref(getDb(), `${instId}/teachers/${input.uid}`), {
    uid: input.uid, displayName: input.displayName.trim(),
    email: input.email.trim().toLowerCase(), status: 'active',
    createdAt: serverTimestamp(),
  });
  await set(ref(getDb(), `users/${input.uid}/status`), 'active');
}

export async function listTeachersPaged(
  institutionId: string,
  cursor: string | null = null,
  pageSize = 20,
): Promise<{ items: Teacher[]; nextCursor: string | null }> {
  const base = query(
    ref(getDb(), `${institutionId}/teachers`),
    orderByChild('displayName'), limitToFirst(pageSize + 1),
  );
  const snapshot = await get(cursor ? query(base, startAfter(cursor)) : base);
  if (!snapshot.exists()) return { items: [], nextCursor: null };
  const items: Teacher[] = [];
  snapshot.forEach((childSnap) => {
    items.push(toTeacher(childSnap.key, childSnap.val() as Record<string, unknown>));
  });
  const hasMore = items.length > pageSize;
  return {
    items: hasMore ? items.slice(0, pageSize) : items,
    nextCursor: hasMore ? items[pageSize - 1]?.uid ?? null : null,
  };
}

export async function setTeacherStatus(
  institutionId: string, uid: string, status: UserRecord['status'],
): Promise<void> {
  await set(ref(getDb(), `${institutionId}/teachers/${uid}/status`), status);
  await set(ref(getDb(), `users/${uid}/status`), status);
}

export async function deleteTeacher(institutionId: string, uid: string): Promise<void> {
  await set(ref(getDb(), `${institutionId}/teachers/${uid}`), null);
  await set(ref(getDb(), `users/${uid}`), null);
}

export async function getTeacher(institutionId: string, uid: string): Promise<Teacher | null> {
  const snapshot = await get(ref(getDb(), `${institutionId}/teachers/${uid}`));
  if (!snapshot.exists()) return null;
  return toTeacher(uid, snapshot.val() as Record<string, unknown>);
}
