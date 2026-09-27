# Quarter Rounding

Rounds a `Date` down, up, or to the nearest calendar-quarter boundary and returns the quarter start date and quarter number.

```js
import { roundToQuarter } from 'quarter-rounding';

const result = roundToQuarter(new Date('2024-05-20T12:00:00Z'), 'nearest');
// { start: Date(2024-07-01T00:00:00Z), quarter: 3 }
```

## Why

Quarter boundaries show up in reporting, billing cycles, and financial summaries. This library gives a single, dependency-free function that maps any instant to the start of its quarter (floor), the start of the next quarter (ceiling), or the nearer of the two.

Quarters are fixed calendar periods: Q1 starts January 1, Q2 starts April 1, Q3 starts July 1, Q4 starts October 1. Fiscal quarters vary by organisation; fixed calendar quarters do not, which is why this library uses them. All output dates are at 00:00:00.000 UTC — local-time quarter starts can shift by an hour near daylight-saving boundaries in some time zones, and UTC avoids that entirely.

## Exports

- `roundToQuarter(date, mode)` — `mode` is `'down'`, `'up'`, or `'nearest'`. Returns `{ start: Date, quarter: number }`.
- `roundDateDown(date)` — returns `{ start: Date, quarter: number, name: string }`.
- `roundDateUp(date)` — same return shape; an input exactly on a boundary is returned unchanged rather than advanced.
- `roundDateNearest(date)` — same return shape; exact ties round up.
- `QUARTERS` — the four fixed quarter definitions as `{ quarter, month, name }`.

## Edges

The two decisions most likely to surprise:

- `roundDateUp` on an exact quarter boundary returns that boundary, not the next one. This is standard ceiling semantics.
- `roundDateNearest` breaks ties by rounding up.

Both are documented in the source and covered by tests.
