import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { roundToQuarter, roundDateDown, roundDateUp, roundDateNearest, QUARTERS } from '../src/index.js';

/**
 * Helper: build a Date at a specific UTC instant.
 * All tests use UTC instants so results never depend on the host's time zone
 * or daylight-saving rules.
 */
function utc(year, month, day, hour = 0, minute = 0, second = 0, ms = 0) {
  return new Date(Date.UTC(year, month, day, hour, minute, second, ms));
}

/**
 * Every quarter start is returned at exactly 00:00:00.000 UTC with the correct
 * quarter number. We check all four quarter starts and one interior date per
 * quarter.
 */

test('roundDateDown floors to the quarter start for a mid-quarter date', () => {
  const result = roundDateDown(utc(2024, 5, 15, 10, 30, 0, 500));
  assert.deepStrictEqual(result.start.getTime(), Date.UTC(2024, 3, 1, 0, 0, 0, 0));
  assert.strictEqual(result.quarter, 2);
  assert.strictEqual(result.name, 'Q2');
});

test('roundDateDown at the exact quarter boundary returns the same boundary', () => {
  const result = roundDateDown(utc(2024, 3, 1, 0, 0, 0, 0));
  assert.deepStrictEqual(result.start.getTime(), Date.UTC(2024, 3, 1, 0, 0, 0, 0));
  assert.strictEqual(result.quarter, 2);
});

test('roundDateUp at an exact boundary returns the same boundary, not the next one', () => {
  const result = roundDateUp(utc(2024, 0, 1, 0, 0, 0, 0));
  assert.deepStrictEqual(result.start.getTime(), Date.UTC(2024, 0, 1, 0, 0, 0, 0));
  assert.strictEqual(result.quarter, 1);
});

test('roundDateUp rounds a mid-quarter date to the next quarter start', () => {
  const result = roundDateUp(utc(2024, 5, 15, 10, 30, 0, 0));
  assert.deepStrictEqual(result.start.getTime(), Date.UTC(2024, 6, 1, 0, 0, 0, 0));
  assert.strictEqual(result.quarter, 3);
});

test('roundDateUp on Q4 rolls over into Q1 of the next year', () => {
  const result = roundDateUp(utc(2024, 11, 15, 0, 0, 0, 0));
  assert.deepStrictEqual(result.start.getTime(), Date.UTC(2025, 0, 1, 0, 0, 0, 0));
  assert.strictEqual(result.quarter, 1);
  assert.strictEqual(result.name, 'Q1');
});

test('roundDateNearest picks the closer boundary - next quarter', () => {
  // 2024-05-20 is closer to Q3 start (Jul 1) than Q2 start (Apr 1).
  const result = roundDateNearest(utc(2024, 4, 20, 12, 0, 0, 0));
  assert.deepStrictEqual(result.start.getTime(), Date.UTC(2024, 6, 1, 0, 0, 0, 0));
  assert.strictEqual(result.quarter, 3);
});

test('roundDateNearest picks the closer boundary - current quarter', () => {
  // 2024-04-10 is closer to Q2 start (Apr 1) than Q3 start (Jul 1).
  const result = roundDateNearest(utc(2024, 3, 10, 12, 0, 0, 0));
  assert.deepStrictEqual(result.start.getTime(), Date.UTC(2024, 3, 1, 0, 0, 0, 0));
  assert.strictEqual(result.quarter, 2);
});

test('roundDateNearest rounds up on an exact tie between boundaries', () => {
  // Q2 2024: Apr 1 (17314 days) to Jul 1 (17315 days) is 91 days.
  // The midpoint is May 17 00:00 (45.5 days from each side is impossible since
  // 91 is odd). Let's test the exact midpoint instant: Apr 1 + 45.5 days.
  // Apr 1 00:00 + 45 days = May 16 00:00; +0.5 day = May 16 12:00.
  // Distance to Apr 1 = 45.5 days; distance to Jul 1 = 45.5 days. Tie -> up.
  const tie = utc(2024, 4, 16, 12, 0, 0, 0);
  const result = roundDateNearest(tie);
  assert.deepStrictEqual(result.start.getTime(), Date.UTC(2024, 6, 1, 0, 0, 0, 0));
  assert.strictEqual(result.quarter, 3);
});

test('roundToQuarter dispatches on mode correctly', () => {
  const date = utc(2024, 1, 15, 6, 0, 0, 0);
  const down = roundToQuarter(date, 'down');
  assert.deepStrictEqual(down.start.getTime(), Date.UTC(2024, 0, 1, 0, 0, 0, 0));
  assert.strictEqual(down.quarter, 1);

  const up = roundToQuarter(date, 'up');
  assert.deepStrictEqual(up.start.getTime(), Date.UTC(2024, 3, 1, 0, 0, 0, 0));
  assert.strictEqual(up.quarter, 2);

  const nearest = roundToQuarter(date, 'nearest');
  assert.deepStrictEqual(nearest.start.getTime(), Date.UTC(2024, 0, 1, 0, 0, 0, 0));
  assert.strictEqual(nearest.quarter, 1);
});

test('roundToQuarter throws TypeError on invalid mode', () => {
  const date = utc(2024, 0, 1);
  assert.throws(
    () => roundToQuarter(date, 'sideways'),
    (err) => {
      assert.ok(err instanceof TypeError, 'should be TypeError');
      assert.match(err.message, /Invalid rounding mode/);
      return true;
    }
  );
});

test('QUARTERS exports four fixed calendar quarters', () => {
  assert.strictEqual(QUARTERS.length, 4);
  assert.strictEqual(QUARTERS[0].quarter, 1);
  assert.strictEqual(QUARTERS[0].month, 0);
  assert.strictEqual(QUARTERS[3].quarter, 4);
  assert.strictEqual(QUARTERS[3].month, 9);
});

test('a date with a non-zero time component is not treated as a boundary by roundDateUp', () => {
  // Jan 1 2024 at 00:00:00.001 should round up to Q2, not stay at Q1.
  const result = roundDateUp(utc(2024, 0, 1, 0, 0, 0, 1));
  assert.deepStrictEqual(result.start.getTime(), Date.UTC(2024, 3, 1, 0, 0, 0, 0));
  assert.strictEqual(result.quarter, 2);
});

test('roundDateDown on a leap-year Q1 date works correctly', () => {
  // Feb 29 2024 exists; it falls in Q1, whose start is Jan 1.
  const result = roundDateDown(utc(2024, 1, 29, 15, 0, 0, 0));
  assert.deepStrictEqual(result.start.getTime(), Date.UTC(2024, 0, 1, 0, 0, 0, 0));
  assert.strictEqual(result.quarter, 1);
});
