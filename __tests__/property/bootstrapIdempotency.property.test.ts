/**
 * Property 1 — Single source of truth / bootstrap idempotency (Task 3.3).
 *
 * **Validates: Requirements 3.1, 4.2, 5.3**
 *
 * For any learner there is exactly one `learner_profile` row keyed by `user_id`,
 * and `bootstrap` is idempotent: repeated invocations (with arbitrary seeds)
 * create no duplicate row and yield an identical profile identifier — and an
 * identical profile — every time.
 *
 * The Profile SDK is exercised fully OFFLINE via the in-memory store fake, so
 * the test is deterministic and needs no live Supabase. Library: fast-check
 * (≥100 iterations).
 */
import fc from 'fast-check';
import { ProfileApi } from '../../src/foundation/profile/profileApi';
import { InMemoryProfileStore } from '../helpers/inMemoryProfileStore';
import type { LearnerProfile } from '../../src/foundation/types';

const RUNS = { numRuns: 150 } as const;

// A fixed clock keeps `createdAt`/`updatedAt` deterministic across calls.
const FIXED_NOW = '2026-06-17T21:00:00.000Z';

const seedArb: fc.Arbitrary<Partial<LearnerProfile>> = fc.record(
  {
    displayName: fc.string(),
    uiLocale: fc.constantFrom('ar', 'en'),
    region: fc.constantFrom('egypt', 'international'),
    tier: fc.constantFrom('gate', 'recruit', 'builder', 'empire', 'vip'),
    telegramId: fc.option(fc.string({ minLength: 1 }), { nil: null }),
    level: fc.constantFrom(0, 1, 2, 3),
    subLevel: fc.integer({ min: 1, max: 12 }),
    placementCompleted: fc.boolean(),
  },
  { requiredKeys: [] },
) as fc.Arbitrary<Partial<LearnerProfile>>;

function makeApi(store: InMemoryProfileStore): ProfileApi {
  return new ProfileApi(store, { now: () => FIXED_NOW });
}

describe('Property 1: Single source of truth / bootstrap idempotency (Req 3.1, 4.2, 5.3)', () => {
  it('repeated bootstrap yields one row and an identical profile identifier', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        seedArb,
        fc.array(seedArb, { minLength: 1, maxLength: 5 }),
        async (userId, firstSeed, laterSeeds) => {
          const store = new InMemoryProfileStore();
          const api = makeApi(store);

          const first = await api.bootstrap(userId, firstSeed);

          for (const seed of laterSeeds) {
            const again = await api.bootstrap(userId, seed);
            // Idempotent: same identity AND the original profile is unchanged,
            // regardless of the (ignored) later seed.
            expect(again.userId).toBe(first.userId);
            expect(again).toEqual(first);
          }

          // Exactly one row for this user — and only one row overall.
          expect(store.profileCount(userId)).toBe(1);
          expect(store.totalProfiles()).toBe(1);
          return true;
        },
      ),
      RUNS,
    );
  });

  it('concurrent bootstraps for the same user still converge to a single row', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), seedArb, async (userId, seed) => {
        const store = new InMemoryProfileStore();
        const api = makeApi(store);

        // Fire several bootstraps "at once"; the unique-key guard + idempotent
        // recovery must still leave exactly one row.
        const results = await Promise.all(
          Array.from({ length: 4 }, () => api.bootstrap(userId, seed)),
        );

        const ids = new Set(results.map((p) => p.userId));
        expect(ids.size).toBe(1);
        expect(store.profileCount(userId)).toBe(1);
        return true;
      }),
      RUNS,
    );
  });
});
