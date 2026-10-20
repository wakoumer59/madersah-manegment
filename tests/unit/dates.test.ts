import { describe, expect, it } from 'vitest';
import { formatDisplayDate, todayIso } from '@/utils/dates';

describe('todayIso', () => {
  it('formats a date as local YYYY-MM-DD with zero padding', () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(todayIso(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('formatDisplayDate', () => {
  it('converts ISO to a readable date', () => {
    expect(formatDisplayDate('2026-10-15')).toBe('15 Oct 2026');
    expect(formatDisplayDate('2026-01-01')).toBe('1 Jan 2026');
  });

  it('returns the input unchanged for invalid values', () => {
    expect(formatDisplayDate('not-a-date')).toBe('not-a-date');
    expect(formatDisplayDate('2026-13-01')).toBe('2026-13-01');
  });
});
