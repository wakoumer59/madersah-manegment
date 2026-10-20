// Student service — /{institutionId}/students/{uid} plus /users/{uid} linkage.
// Students are created via activation codes (Phase 3 onboarding).
import {
  get, limitToFirst, orderByChild, query, ref, serverTimestamp, set,
  startAfter,
} from 'firebase/database';
import { getDb } from '@/firebase/init';
import type { Student, UserRecord } from '@/types';

function toStudent(uid: string, value: Record<string, unknown>): Student {
  return {
    uid, displayName: String(value.displayName ?? ''), email: String(value.email ?? ''),
    classId: String(value.classId ?? ''), admissionNo: String(value.admissionNo ?? ''),
    status: (value.status as UserRecord['status']) ?? 'active',
    createdAt: Number(value.createdAt ?? 0),
  };
}

export async function createStudent(input: {
  institutionId: string; uid: string; displayName: string; email: string;
  classId: string; admissionNo: string;
}): Promise<void> {
  const instId = input.institutionId;
  await set(ref(getDb(), `${instId}/students/${input.uid}`), {
    uid: input.uid, displayName: input.displayName.trim(),
    email: input.email.trim().toLowerCase(), classId: input.classId,
    admissionNo: input.admissionNo.trim(), status: 'active',
    createdAt: serverTimestamp(),
  });
  await set(ref(getDb(), `users/${input.uid}/classId`), input.classId);
  await set(ref(getDb(), `users/${input.uid}/status`), 'active');
}

export async function listStudentsPaged(
  institutionId: string,
  cursor: string | null = null,
  pageSize = 20,
): Promise<{ items: Student[]; nextCursor: string | null }> {
  const base = query(
    ref(getDb(), `${institutionId}/students`),
    orderByChild('displayName'), limitToFirst(pageSize + 1),
  );
  const snapshot = await get(cursor ? query(base, startAfter(cursor)) : base);
  if (!snapshot.exists()) return { items: [], nextCursor: null };
  const items: Student[] = [];
  snapshot.forEach((childSnap) => {
    items.push(toStudent(childSnap.key, childSnap.val() as Record<string, unknown>));
  });
  const hasMore = items.length > pageSize;
  return { items: hasMore ? items.slice(0, pageSize) : items, nextCursor: hasMore ? items[pageSize - 1]?.uid ?? null : null };
}

export async function setStudentStatus(
  institutionId: string, uid: string, status: UserRecord['status'],
): Promise<void> {
  await set(ref(getDb(), `${institutionId}/students/${uid}/status`), status);
  await set(ref(getDb(), `users/${uid}/status`), status);
}

export async function deleteStudent(institutionId: string, uid: string): Promise<void> {
  await set(ref(getDb(), `${institutionId}/students/${uid}`), null);
  await set(ref(getDb(), `users/${uid}`), null);
}

export async function getStudent(institutionId: string, uid: string): Promise<Student | null> {
  const snapshot = await get(ref(getDb(), `${institutionId}/students/${uid}`));
  if (!snapshot.exists()) return null;
  return toStudent(uid, snapshot.val() as Record<string, unknown>);
}
