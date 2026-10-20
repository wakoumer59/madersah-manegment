// Date helpers. Attendance dates use institution-local YYYY-MM-DD strings;
// test windows use epoch ms validated against server time in Security Rules.

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Institution-local calendar date as YYYY-MM-DD. */
export function todayIso(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** '2026-10-15' -> '15 Oct 2026' */
export function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return iso;
  return `${d} ${MONTH_SHORT[m - 1]} ${y}`;
}
