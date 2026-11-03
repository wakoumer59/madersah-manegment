// Student service — /{institutionId}/students/{uid} plus /users/{uid} linkage.
// Students are created via activation codes (Phase 3 onboarding).
import {
  get, limitToFirst, orderByChild, query, ref, update,
  startAfter,
} from 'firebase/database';
import { getDb } from '@/firebase/init';
import { deleteManagedAccount } from '@/services/adminAccountService';
import { createPendingAccountCode } from '@/services/pendingAccountService';
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
  institutionId: string; displayName: string; email: string;
  classId: string; admissionNo: string; createdBy: string;
}): Promise<string> {
  return createPendingAccountCode({
    institutionId: input.institutionId,
    displayName: input.displayName,
    email: input.email,
    role: 'student',
    classId: input.classId,
    admissionNo: input.admissionNo,
    createdBy: input.createdBy,
  });
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
  await update(ref(getDb()), {
    [`${institutionId}/students/${uid}/status`]: status,
    [`users/${uid}/status`]: status,
  });
}

export async function updateStudent(input: {
  institutionId: string;
  student: Student;
  displayName: string;
  classId: string;
  admissionNo: string;
}): Promise<void> {
  const displayName = input.displayName.trim();
  const admissionNo = input.admissionNo.trim();
  await update(ref(getDb()), {
    [`${input.institutionId}/students/${input.student.uid}/displayName`]: displayName,
    [`${input.institutionId}/students/${input.student.uid}/classId`]: input.classId,
    [`${input.institutionId}/students/${input.student.uid}/admissionNo`]: admissionNo,
    [`users/${input.student.uid}/displayName`]: displayName,
    [`users/${input.student.uid}/classId`]: input.classId,
  });
}

export async function deleteStudent(uid: string, idToken: string): Promise<void> {
  await deleteManagedAccount({
    idToken,
    uid,
    role: 'student',
  });
}

export async function getStudent(institutionId: string, uid: string): Promise<Student | null> {
  const snapshot = await get(ref(getDb(), `${institutionId}/students/${uid}`));
  if (!snapshot.exists()) return null;
  return toStudent(uid, snapshot.val() as Record<string, unknown>);
}
