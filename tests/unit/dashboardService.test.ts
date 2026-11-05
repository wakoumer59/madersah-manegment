import { describe, expect, it } from 'vitest';
import { summarizeAdminDashboard } from '@/services/dashboardService';

describe('summarizeAdminDashboard', () => {
  it('counts institution records and today attendance without counting metadata', () => {
    const summary = summarizeAdminDashboard({
      students: { s1: {}, s2: {} },
      teachers: { t1: {} },
      classes: { c1: {}, c2: {}, c3: {} },
      materials: { m1: {} },
      tests: {
        active: { title: 'Active test', status: 'published', startTime: 100, endTime: 300, createdAt: 200 },
        draft: { title: 'Draft test', status: 'draft', startTime: 0, endTime: 300, createdAt: 250 },
        future: { title: 'Future test', status: 'published', startTime: 301, endTime: 400, createdAt: 300 },
      },
      attendanceDays: [
        {
          s1: { status: 'present' },
          s2: { status: 'absent' },
          s3: { status: 'late' },
          _meta: { counts: { present: 1, absent: 1 } },
        },
      ],
    }, 200);

    expect(summary).toMatchObject({
      totalStudents: 2,
      totalTeachers: 1,
      totalClasses: 3,
      presentToday: 1,
      absentToday: 1,
      activeTests: 1,
      materialCount: 1,
    });
    expect(summary.recentTests.map((test) => test.title)).toEqual([
      'Future test',
      'Draft test',
      'Active test',
    ]);
  });

  it('returns zero values when the institution has no records', () => {
    expect(summarizeAdminDashboard({
      students: null,
      teachers: null,
      classes: null,
      materials: null,
      tests: null,
      attendanceDays: [],
    })).toMatchObject({
      totalStudents: 0,
      totalTeachers: 0,
      totalClasses: 0,
      presentToday: 0,
      absentToday: 0,
      activeTests: 0,
      materialCount: 0,
      recentTests: [],
    });
  });
});
