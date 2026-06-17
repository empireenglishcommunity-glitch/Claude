/**
 * Property lane — fast-check property-based tests.
 *
 * Task 1.1 smoke test: confirms the fast-check runner is wired up and that the
 * property lane executes the required minimum number of iterations. The real
 * design properties (design §9) are implemented in their respective tasks.
 */
import fc from 'fast-check';

describe('property tooling smoke test', () => {
  it('runs fast-check with at least 100 iterations', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        // A trivially-true invariant just to exercise the runner.
        return n === n && Number.isInteger(n);
      }),
      { numRuns: 100 },
    );
  });
});
