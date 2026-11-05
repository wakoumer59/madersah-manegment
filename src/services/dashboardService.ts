import { get, ref } from 'firebase/database';
import { getDb } from '@/firebase/init';
import { todayIso } from '@/utils/dates';
import type { TestStatus } from '@/types';

type DataRecord = Record<string, unknown>;

export interface DashboardRecentTest {
  id: string;
  title: string;
  status: TestStatus;
  createdAt: number;
}

export interface AdminDashboardSummary {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  presentToday: number;
  absentToday: number;
  activeTests: number;
  materialCount: number;
  recentTests: DashboardRecentTest[];
}

function asRecord(value: unknown): DataRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as DataRecord
    : {};
}

function countRecords(value: unknown): number {
  return Object.keys(asRecord(value)).length;
}

export function summarizeAdminDashboard(
  input: {
    students: unknown;
    teachers: unknown;
    classes: unknown;
    materials: unknown;
    tests: unknown;
    attendanceDays: unknown[];
  },
  now = Date.now(),
): AdminDashboardSummary {
  let presentToday = 0;
  let absentToday = 0;
  for (const dayValue of input.attendanceDays) {
    for (const entryValue of Object.values(asRecord(dayValue))) {
      const status = asRecord(entryValue).status;
      if (status === 'present') presentToday += 1;
      if (status === 'absent') absentToday += 1;
    }
  }

  const tests = Object.entries(asRecord(input.tests)).map(([id, value]) => {
    const record = asRecord(value);
    return {
      id,
      title: typeof record.title === 'string' ? record.title : '',
      status: record.status as TestStatus,
      startTime: Number(record.startTime ?? 0),
      endTime: Number(record.endTime ?? 0),
      createdAt: Number(record.createdAt ?? 0),
    };
  });
  const recentTests = [...tests]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)
    .map(({ id, title, status, createdAt }) => ({ id, title, status, createdAt }));

  return {
    totalStudents: countRecords(input.students),
    totalTeachers: countRecords(input.teachers),
    totalClasses: countRecords(input.classes),
    presentToday,
    absentToday,
    activeTests: tests.filter(
      (test) => test.status === 'published' && now >= test.startTime && now <= test.endTime,
    ).length,
    materialCount: countRecords(input.materials),
    recentTests,
  };
}

export async function getAdminDashboardSummary(
  institutionId: string,
): Promise<AdminDashboardSummary> {
  const paths = ['students', 'teachers', 'classes', 'materials', 'testCatalog'] as const;
  const snapshots = await Promise.all(
    paths.map((path) => get(ref(getDb(), `${institutionId}/${path}`))),
  );
  const records = snapshots.map((snapshot) => snapshot.val());
  const classes = asRecord(records[2]);
  const date = todayIso();
  const attendanceSnapshots = await Promise.all(
    Object.keys(classes).map((classId) =>
      get(ref(getDb(), `${institutionId}/attendance/${classId}/${date}`)),
    ),
  );

  return summarizeAdminDashboard({
    students: records[0],
    teachers: records[1],
    classes,
    materials: records[3],
    tests: records[4],
    attendanceDays: attendanceSnapshots.map((snapshot) => snapshot.val()),
  });
}
