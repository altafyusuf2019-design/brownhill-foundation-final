/**
 * Central date utility for Sunday-to-Sunday reporting periods.
 *
 * REPORTING WEEK:  Monday → Sunday  (shifts to a new week every Monday)
 * REPORTING MONTH: the calendar month is represented by the Sunday–Sunday
 *   window that fully contains it.  Start = the Sunday on or before the 1st
 *   of that month.  End = the Saturday after the last day of the month
 *   (i.e. the last Sunday of the month, expressed as the Saturday night
 *   boundary so that .lte(end) on dates captures that whole Sunday).
 *
 *   Example — April 2026:
 *     April 1 is a Wednesday → period starts Sunday 29 March 2026
 *     April 30 is a Thursday → next Sunday is 3 May 2026
 *     → period end = 3 May 2026  (inclusive)
 */

/** Returns today as YYYY-MM-DD (local time). */
export function todayISO(): string {
  const d = new Date();
  return localISO(d);
}

/** Formats a YYYY-MM-DD string as DD/MM/YYYY for display. */
export function formatDateGB(isoDate: string): string {
  // Parse as local date to avoid UTC-offset surprises on date-only strings
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB');
}

/** Returns a Date set to midnight local time for the given YYYY-MM-DD string. */
function parseLocal(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Formats a Date as YYYY-MM-DD using local time. */
function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Adds `n` days to a Date (returns a new Date). */
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/**
 * Returns the Monday–Sunday reporting week that contains today.
 * The week boundary shifts every Monday morning.
 *
 *   getDay(): 0=Sun, 1=Mon, …, 6=Sat
 *   Days since Monday: (getDay() + 6) % 7
 */
export function getCurrentReportingWeek(): { start: string; end: string; label: string } {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun … 6=Sat
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = addDays(today, -daysSinceMonday);
  const sunday = addDays(monday, 6);

  return {
    start: localISO(monday),
    end: localISO(sunday),
    label: `${formatDateGB(localISO(monday))} – ${formatDateGB(localISO(sunday))}`,
  };
}

/**
 * Returns the Sunday-anchored reporting period for a given calendar month.
 *
 * START: the Sunday on or before the 1st of the month.
 * END:   the Sunday on or after the last day of the month.
 *
 * @param year  Full year, e.g. 2026
 * @param month 1-based month number (1=Jan … 12=Dec)
 */
export function getReportingPeriodForMonth(
  year: number,
  month: number,
): { start: string; end: string; label: string } {
  // First day of month
  const firstDay = new Date(year, month - 1, 1);
  // Last day of month
  const lastDay = new Date(year, month, 0);

  // Roll back to the nearest Sunday on or before the 1st
  const startDayOfWeek = firstDay.getDay(); // 0=Sun
  const start = addDays(firstDay, -startDayOfWeek);

  // Roll forward to the nearest Sunday on or after the last day
  const endDayOfWeek = lastDay.getDay(); // 0=Sun
  const daysUntilSunday = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek;
  const end = addDays(lastDay, daysUntilSunday);

  const monthName = firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return {
    start: localISO(start),
    end: localISO(end),
    label: `${monthName} (${formatDateGB(localISO(start))} – ${formatDateGB(localISO(end))})`,
  };
}

/**
 * Returns a list of { year, month, label } objects for every calendar month
 * from `earliestISO` up to and including December of the current year.
 * Ordered most-recent first.
 */
export function getAvailableReportingMonths(
  earliestISO: string,
): Array<{ year: number; month: number; label: string }> {
  const earliest = parseLocal(earliestISO);
  const now = new Date();
  const endYear = now.getFullYear();

  const result: Array<{ year: number; month: number; label: string }> = [];
  let y = endYear;
  let m = 12; // always go up to December of the current year

  while (true) {
    const d = new Date(y, m - 1, 1);
    result.push({
      year: y,
      month: m,
      label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    });

    if (y === earliest.getFullYear() && m === earliest.getMonth() + 1) break;

    m -= 1;
    if (m === 0) { m = 12; y -= 1; }

    // Safety: don't go further back than 5 years
    if (endYear - y > 5) break;
  }

  return result;
}
