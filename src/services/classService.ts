// Class service — /{institutionId}/classes/{id}.
import {
  child, get, limitToFirst, orderByChild, push, query, ref, remove, runTransaction,
  serverTimestamp, set, startAfter,
} from 'firebase/database';
import { getDb } from '@/firebase/init';
import type { SchoolClass } from '@/types';

function toClass(id: string, value: Record<string, unknown>): SchoolClass {
  return {
    id, name: String(value.name ?? ''), academicYear: String(value.academicYear ?? ''),
    teacherUid: (value.teacherUid as string | null) ?? null,
    studentCount: Number(value.studentCount ?? 0),
    createdAt: Number(value.createdAt ?? 0),
  };
}

export async function createClass(input: {
  institutionId: string; name: string; academicYear: string; teacherUid?: string | null;
}): Promise<string> {
  const id = push(child(ref(getDb()), `${input.institutionId}/classes`)).key;
  if (!id) throw new Error('Could not generate a class id.');
  await set(ref(getDb(), `${input.institutionId}/classes/${id}`), {
    id, name: input.name.trim(), academicYear: input.academicYear.trim(),
    teacherUid: input.teacherUid ?? null, studentCount: 0,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function listClassesPaged(
  institutionId: string,
  cursor: string | null = null,
  pageSize = 20,
): Promise<{ items: SchoolClass[]; nextCursor: string | null }> {
  const base = query(
    ref(getDb(), `${institutionId}/classes`),
    orderByChild('name'), limitToFirst(pageSize + 1),
  );
  const snapshot = await get(cursor ? query(base, startAfter(cursor)) : base);
  if (!snapshot.exists()) return { items: [], nextCursor: null };
  const items: SchoolClass[] = [];
  snapshot.forEach((childSnap) => {
    items.push(toClass(childSnap.key, childSnap.val() as Record<string, unknown>));
  });
  const hasMore = items.length > pageSize;
  return {
    items: hasMore ? items.slice(0, pageSize) : items,
    nextCursor: hasMore ? items[pageSize - 1]?.name ?? null : null,
  };
}

export async function assignClassTeacher(
  institutionId: string, classId: string, teacherUid: string | null,
): Promise<void> {
  await set(ref(getDb(), `${institutionId}/classes/${classId}/teacherUid`), teacherUid);
}

export async function deleteClass(institutionId: string, classId: string): Promise<void> {
  await remove(ref(getDb(), `${institutionId}/classes/${classId}`));
}

export async function getClass(institutionId: string, classId: string): Promise<SchoolClass | null> {
  const snapshot = await get(ref(getDb(), `${institutionId}/classes/${classId}`));
  if (!snapshot.exists()) return null;
  return toClass(classId, snapshot.val() as Record<string, unknown>);
}

/** Increment student count on a class (transaction for safety). */
export async function incrementStudentCount(institutionId: string, classId: string): Promise<void> {
  await runTransaction(ref(getDb(), `${institutionId}/classes/${classId}/studentCount`), (current) => {
    return Number(current ?? 0) + 1;
  });
}

/** Decrement student count on a class. */
export async function decrementStudentCount(institutionId: string, classId: string): Promise<void> {
  await runTransaction(ref(getDb(), `${institutionId}/classes/${classId}/studentCount`), (current) => {
    return Math.max(0, Number(current ?? 0) - 1);
  });
}
