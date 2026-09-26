/**
 * Quarters are fixed calendar periods: Q1 starts January 1, Q2 starts April 1,
 * Q3 starts July 1, Q4 starts October 1. We use fixed quarters rather than
 * fiscal quarters because fiscal calendars vary by organisation and there is
 * no universal mapping. A fixed calendar quarter is unambiguous and stateless.
 */

/**
 * Month (0-indexed, as in Date.getMonth) at which each quarter begins.
 * Index 0 = Q1, 1 = Q2, 2 = Q3, 3 = Q4.
 */
export const QUARTERS = [
  { quarter: 1, month: 0, name: 'Q1' },
  { quarter: 2, month: 3, name: 'Q2' },
  { quarter: 3, month: 6, name: 'Q3' },
  { quarter: 4, month: 9, name: 'Q4' },
];

/**
 * Rounding direction: 'down' floors to the quarter start, 'up' ceilings to
 * the next quarter boundary (or the input itself if already on a boundary),
 * 'nearest' picks the closer boundary.
 *
 * @typedef {'down'|'up'|'nearest'} RoundingMode
 */

/**
 * Find the quarter a given month (0-indexed) falls into.
 * Month 0–2 -> Q1, 3–5 -> Q2, 6–8 -> Q3, 9–11 -> Q4.
 *
 * @param {number} month - 0-indexed month from Date.getMonth().
 * @returns {{ quarter: number, month: number, name: string }}
 */
function quarterForMonth(month) {
  const idx = Math.floor(month / 3);
  return QUARTERS[idx];
}

/**
 * Build a Date at midnight UTC on the given year/month/day. Using UTC avoids
 * daylight-saving-time discontinuities: local midnight can shift by an hour
 * near DST boundaries in some time zones, which would make quarter boundaries
 * land at 23:00 or 01:00 instead of 00:00. UTC has no DST, so boundaries are
 * exact and stable regardless of where the process runs.
 *
 * @param {number} year - Full year (e.g. 2024).
 * @param {number} month - 0-indexed month.
 * @param {number} day - Day of month.
 * @returns {Date}
 */
function midnightUTC(year, month, day) {
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Determine whether a Date falls exactly on a quarter boundary (Jan 1, Apr 1,
 * Jul 1, or Oct 1 at 00:00:00.000 UTC).
 *
 * @param {Date} date
 * @returns {boolean}
 */
function isQuarterBoundary(date) {
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();
  const ms = date.getUTCMilliseconds();
  if (hour !== 0 || minute !== 0 || second !== 0 || ms !== 0) return false;
  const month = date.getUTCMonth();
  if (day !== 1) return false;
  return month === 0 || month === 3 || month === 6 || month === 9;
}

/**
 * Get the start of the quarter the given date falls into.
 *
 * @param {Date} date
 * @returns {{ start: Date, quarter: number, name: string }}
 */
function quarterStart(date) {
  const month = date.getUTCMonth();
  const q = quarterForMonth(month);
  const start = midnightUTC(date.getUTCFullYear(), q.month, 1);
  return { start, quarter: q.quarter, name: q.name };
}

/**
 * Get the start of the next quarter relative to the given date's quarter.
 * If the date is in Q4, the next quarter starts Jan 1 of the following year.
 *
 * @param {Date} date
 * @returns {{ start: Date, quarter: number, name: string }}
 */
function nextQuarterStart(date) {
  const month = date.getUTCMonth();
  const q = quarterForMonth(month);
  if (q.quarter === 4) {
    const start = midnightUTC(date.getUTCFullYear() + 1, 0, 1);
    return { start, quarter: 1, name: 'Q1' };
  }
  const nextQ = QUARTERS[q.quarter]; // index equals current quarter number
  const start = midnightUTC(date.getUTCFullYear(), nextQ.month, 1);
  return { start, quarter: nextQ.quarter, name: nextQ.name };
}

/**
 * Round a date down to the start of its quarter.
 *
 * @param {Date} date
 * @returns {{ start: Date, quarter: number, name: string }}
 */
export function roundDateDown(date) {
  return quarterStart(date);
}

/**
 * Round a date up to the start of the next quarter, unless it already sits
 * exactly on a quarter boundary in which case it is returned unchanged.
 * Returning the boundary itself (rather than the next quarter) for an input
 * already on a boundary is the standard ceiling semantics and avoids
 * surprising off-by-one results.
 *
 * @param {Date} date
 * @returns {{ start: Date, quarter: number, name: string }}
 */
export function roundDateUp(date) {
  if (isQuarterBoundary(date)) {
    return quarterStart(date);
  }
  return nextQuarterStart(date);
}

/**
 * Round a date to the nearer of its quarter start or the next quarter start.
 * Ties (exactly midway between two boundaries) round up. The tie-break is
 * arbitrary but must be consistent; rounding up on ties is the conventional
 * choice.
 *
 * @param {Date} date
 * @returns {{ start: Date, quarter: number, name: string }}
 */
export function roundDateNearest(date) {
  const current = quarterStart(date);
  const next = nextQuarterStart(date);
  const distToCurrent = date.getTime() - current.start.getTime();
  const distToNext = next.start.getTime() - date.getTime();
  if (distToNext <= distToCurrent) {
    return next;
  }
  return current;
}

/**
 * Round a date to a quarter boundary and return the quarter start date along
 * with the quarter number.
 *
 * @param {Date} date - The date to round.
 * @param {RoundingMode} mode - 'down', 'up', or 'nearest'.
 * @returns {{ start: Date, quarter: number }} The quarter start (00:00:00.000
 *   UTC) and the quarter number (1–4).
 * @throws {TypeError} If mode is not one of 'down', 'up', 'nearest'.
 */
export function roundToQuarter(date, mode) {
  if (mode !== 'down' && mode !== 'up' && mode !== 'nearest') {
    throw new TypeError(`Invalid rounding mode '${mode}'. Expected 'down', 'up', or 'nearest'.`);
  }
  const result = mode === 'down'
    ? roundDateDown(date)
    : mode === 'up'
      ? roundDateUp(date)
      : roundDateNearest(date);
  return { start: result.start, quarter: result.quarter };
}
