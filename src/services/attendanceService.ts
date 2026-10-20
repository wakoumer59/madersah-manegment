// Attendance service — /{institutionId}/attendance/{classId}/{date}/{studentUid}
// plus /{institutionId}/attendance/{classId}/{date}/_meta day rollups.
// Path-keyed by (class, date, student) → naturally duplicate-proof.
import {
  get,
  orderByChild,
  query,
  ref,
  serverTimestamp,
  set,
  startAt,
  endAt,
  limitToFirst,
  update,
} from 'firebase/database';
import { getDb } from '@/firebase/init';
import type {
  AttendanceDayMeta,
  AttendanceEntry,
  AttendanceStatus,
} from '@/types';

/** Read one class day: returns all student entries plus the day _meta. */
export async function getDayAttendance(
  institutionId: string,
  classId: string,
  date: string, // YYYY-MM-DD
): Promise<{
  entries: Record<string, AttendanceEntry>;
  meta: AttendanceDayMeta | null;
}> {
  const dayRef = ref(
    getDb(),
    `${institutionId}/attendance/${classId}/${date}`,
  );
  const snapshot = await get(dayRef);
  if (!snapshot.exists()) {
    return { entries: {}, meta: null };
  }
  const entries: Record<string, AttendanceEntry> = {};
  let meta: AttendanceDayMeta | null = null;
  snapshot.forEach((childSnap) => {
    const key = childSnap.key;
    if (key === '_meta') {
      meta = childSnap.val() as AttendanceDayMeta;
    } else {
      entries[key] = {
        status: (childSnap.val() as Record<string, unknown>).status as
          | AttendanceStatus
          | undefined ?? 'absent',
        note: String((childSnap.val() as Record<string, unknown>).note ?? ''),
        markedBy: String(
          (childSnap.val() as Record<string, unknown>).markedBy ?? '',
        ),
        updatedAt: Number(
          (childSnap.val() as Record<string, unknown>).updatedAt ?? 0,
        ),
      };
    }
  });
  return { entries, meta };
}

/**
 * Save an entire class day in one multi-location write: every student entry
 * plus the _meta rollup counts. All-or-nothing semantics via update().
 */
export async function saveDayAttendance(input: {
  institutionId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  /** studentUid → AttendanceEntry */
  entries: Record<string, AttendanceEntry>;
  markedBy: string; // uid of the staff member marking
}): Promise<void> {
  const db = getDb();
  const base = `${input.institutionId}/attendance/${input.classId}/${input.date}`;
  const now = serverTimestamp();

  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  const entriesToWrite: Record<string, unknown> = {};
  for (const [uid, entry] of Object.entries(input.entries)) {
    entriesToWrite[uid] = {
      status: entry.status,
      note: entry.note ?? '',
      markedBy: input.markedBy,
      updatedAt: now,
    };
    counts[entry.status as keyof typeof counts] =
      (counts[entry.status as keyof typeof counts] ?? 0) + 1;
  }

  await update(ref(db, base), {
    ...entriesToWrite,
    _meta: {
      markedBy: input.markedBy,
      markedAt: now,
      counts,
    },
  });
}

/**
 * Correct a single student's attendance entry (correction flow with audit).
 * Writes updatedAt/markedBy so corrections are traceable.
 */
export async function correctAttendance(input: {
  institutionId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  studentUid: string;
  status: AttendanceStatus;
  note?: string;
  correctedBy: string;
}): Promise<void> {
  await set(
    ref(
      getDb(),
      `${input.institutionId}/attendance/${input.classId}/${input.date}/${input.studentUid}`,
    ),
    {
      status: input.status,
      note: input.note ?? '',
      markedBy: input.correctedBy,
      updatedAt: serverTimestamp(),
    },
  );
}

/**
 * List attendance days for a class within a calendar month, paginated by date
 * (cursor = last date string returned, exclusive). Returns day summaries with
 * counts so the UI can render a month heatmap/table without loading every entry.
 */
export async function listMonthAttendance(input: {
  institutionId: string;
  classId: string;
  yearMonth: string; // YYYY-MM
  cursor?: string | null;
  pageSize?: number;
}): Promise<{
  items: Array<{
    date: string;
    meta: AttendanceDayMeta | null;
    totalMarked: number;
  }>;
  nextCursor: string | null;
}> {
  const pageSize = input.pageSize ?? 30;
  const classRef = ref(
    getDb(),
    `${input.institutionId}/attendance/${input.classId}`,
  );
  const start = input.cursor ? input.cursor : `${input.yearMonth}-01`;
  const end = `${input.yearMonth}-31`;
  const q = query(
    classRef,
    orderByChild('.'), // order by key (date)
    startAt(start),
    endAt(end),
    limitToFirst(pageSize + 1),
  );
  const snapshot = await get(q);
  if (!snapshot.exists()) {
    return { items: [], nextCursor: null };
  }
  const days: Array<{
    date: string;
    meta: AttendanceDayMeta | null;
    totalMarked: number;
  }> = [];
  snapshot.forEach((childSnap) => {
    const date = childSnap.key ?? '';
    const val = childSnap.val() as Record<string, unknown>;
    const meta = (val._meta as AttendanceDayMeta) ?? null;
    let totalMarked = 0;
    childSnap.forEach((entrySnap) => {
      if (entrySnap.key !== '_meta') totalMarked += 1;
    });
    days.push({ date, meta, totalMarked });
  });
  const hasMore = days.length > pageSize;
  return {
    items: hasMore ? days.slice(0, pageSize) : days,
    nextCursor: hasMore ? days[pageSize - 1]?.date ?? null : null,
  };
}
