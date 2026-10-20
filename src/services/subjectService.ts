// Subject service — /{institutionId}/subjects/{id}.
import {
  child, get, limitToFirst, orderByChild, push, query, ref, remove,
  serverTimestamp, set, startAfter,
} from 'firebase/database';
import { getDb } from '@/firebase/init';
import type { Subject } from '@/types';

function toSubject(id: string, value: Record<string, unknown>): Subject {
  return {
    id, name: String(value.name ?? ''), classId: String(value.classId ?? ''),
    teacherUid: (value.teacherUid as string | null) ?? null,
    createdAt: Number(value.createdAt ?? 0),
  };
}

export async function createSubject(input: {
  institutionId: string; name: string; classId: string; teacherUid?: string | null;
}): Promise<string> {
  const id = push(child(ref(getDb()), `${input.institutionId}/subjects`)).key;
  if (!id) throw new Error('Could not generate a subject id.');
  await set(ref(getDb(), `${input.institutionId}/subjects/${id}`), {
    id, name: input.name.trim(), classId: input.classId,
    teacherUid: input.teacherUid ?? null, createdAt: serverTimestamp(),
  });
  return id;
}

export async function listSubjectsPaged(
  institutionId: string,
  cursor: string | null = null,
  pageSize = 20,
): Promise<{ items: Subject[]; nextCursor: string | null }> {
  const base = query(
    ref(getDb(), `${institutionId}/subjects`),
    orderByChild('name'), limitToFirst(pageSize + 1),
  );
  const snapshot = await get(cursor ? query(base, startAfter(cursor)) : base);
  if (!snapshot.exists()) return { items: [], nextCursor: null };
  const items: Subject[] = [];
  snapshot.forEach((childSnap) => {
    items.push(toSubject(childSnap.key, childSnap.val() as Record<string, unknown>));
  });
  const hasMore = items.length > pageSize;
  return {
    items: hasMore ? items.slice(0, pageSize) : items,
    nextCursor: hasMore ? items[pageSize - 1]?.name ?? null : null,
  };
}

export async function assignSubjectTeacher(
  institutionId: string, subjectId: string, teacherUid: string | null,
): Promise<void> {
  await set(ref(getDb(), `${institutionId}/subjects/${subjectId}/teacherUid`), teacherUid);
}

export async function deleteSubject(institutionId: string, subjectId: string): Promise<void> {
  await remove(ref(getDb(), `${institutionId}/subjects/${subjectId}`));
}

export async function getSubject(
  institutionId: string, subjectId: string,
): Promise<Subject | null> {
  const snapshot = await get(ref(getDb(), `${institutionId}/subjects/${subjectId}`));
  if (!snapshot.exists()) return null;
  return toSubject(subjectId, snapshot.val() as Record<string, unknown>);
}
