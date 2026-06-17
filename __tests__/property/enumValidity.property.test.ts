/**
 * Property 5 — Enum validity (Project P1, Task 2.5).
 *
 * **Validates: Requirements 3.3, 3.8**
 *
 * A candidate `level` / `sub_level` is accepted if and only if `level` is an
 * integer in [0,3] and `sub_level` is an integer in [1,12]; out-of-bounds (and
 * non-integer) writes are rejected and the prior value is preserved.
 *
 * Library: fast-check (≥100 iterations).
 */
import fc from 'fast-check';
import {
  isValidLevel,
  isValidSubLevel,
  LEVEL_MAX,
  LEVEL_MIN,
  SUB_LEVEL_MAX,
  SUB_LEVEL_MIN,
  validateLevelWrite,
  validateSubLevelWrite,
} from '../../src/foundation/profile/validators';
import type { Level, SubLevel } from '../../src/foundation/types';

const RUNS = { numRuns: 200 } as const;

// Candidate generators mix valid integers, out-of-range integers, and
// non-integers so the "integer AND in-range" rule is exercised from all sides.
const levelCandidate = fc.oneof(
  fc.integer({ min: 0, max: 3 }), // valid
  fc.integer({ min: -50, max: -1 }), // below range
  fc.integer({ min: 4, max: 50 }), // above range
  fc.double({ min: 0, max: 3, noNaN: true }).filter((x) => !Number.isInteger(x)), // non-integer in range
);

const subLevelCandidate = fc.oneof(
  fc.integer({ min: 1, max: 12 }), // valid
  fc.integer({ min: -50, max: 0 }), // below range
  fc.integer({ min: 13, max: 60 }), // above range
  fc.double({ min: 1, max: 12, noNaN: true }).filter((x) => !Number.isInteger(x)), // non-integer in range
);

const validLevel = fc.integer({ min: 0, max: 3 }) as fc.Arbitrary<Level>;
const validSubLevel = fc.integer({ min: 1, max: 12 }) as fc.Arbitrary<SubLevel>;

describe('Property 5: Enum validity (Req 3.3, 3.8)', () => {
  it('isValidLevel is true iff the candidate is an integer in [0,3]', () => {
    fc.assert(
      fc.property(levelCandidate, (c) => {
        const expected = Number.isInteger(c) && c >= LEVEL_MIN && c <= LEVEL_MAX;
        return isValidLevel(c) === expected;
      }),
      RUNS,
    );
  });

  it('isValidSubLevel is true iff the candidate is an integer in [1,12]', () => {
    fc.assert(
      fc.property(subLevelCandidate, (c) => {
        const expected = Number.isInteger(c) && c >= SUB_LEVEL_MIN && c <= SUB_LEVEL_MAX;
        return isValidSubLevel(c) === expected;
      }),
      RUNS,
    );
  });

  it('validateLevelWrite accepts valid levels and preserves prior on rejection', () => {
    fc.assert(
      fc.property(validLevel, levelCandidate, (prior, candidate) => {
        const res = validateLevelWrite(prior, candidate);
        if (isValidLevel(candidate)) {
          return res.ok && res.value === candidate;
        }
        return !res.ok && res.value === prior;
      }),
      RUNS,
    );
  });

  it('validateSubLevelWrite accepts valid sub-levels and preserves prior on rejection', () => {
    fc.assert(
      fc.property(validSubLevel, subLevelCandidate, (prior, candidate) => {
        const res = validateSubLevelWrite(prior, candidate);
        if (isValidSubLevel(candidate)) {
          return res.ok && res.value === candidate;
        }
        return !res.ok && res.value === prior;
      }),
      RUNS,
    );
  });
});
