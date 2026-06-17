/**
 * Property 7 — Claim safety (Task 5.3).
 *
 * **Validates: Requirements 6.4, 6.5**
 *
 * For any `funnel_claim` token, it can be redeemed AT MOST ONCE and ONLY before
 * its `expires_at`:
 *   • a fresh, unexpired token redeems successfully and bootstraps the learner
 *     profile EXACTLY ONCE (carrying the claim's tier/region/Telegram id);
 *   • every repeated redemption of an already-consumed token is rejected with
 *     `ClaimAlreadyRedeemedError` and changes no profile (Req 6.4);
 *   • a redemption at or after expiry is rejected with `ClaimExpiredError` and
 *     bootstraps no profile (Req 6.5);
 *   • under concurrent redemptions exactly one wins (single-use), the rest are
 *     rejected, and the profile is still bootstrapped exactly once.
 *
 * The whole funnel pipeline runs fully OFFLINE via the in-memory `ClaimStore` +
 * `ProfileApi`(in-memory store) fakes, with an injected clock — so "redeemable
 * at most once and only before expiry" is verified deterministically. Library:
 * fast-check (≥100 iterations).
 */
import fc from 'fast-check';
import { FunnelClaimService } from '../../src/foundation/funnel/funnelClaimService';
import {
  ClaimAlreadyRedeemedError,
  ClaimExpiredError,
  ClaimInvalidError,
  mintClaimRecord,
} from '../../src/foundation/funnel/funnelClaim';
import { ProfileApi } from '../../src/foundation/profile/profileApi';
import { InMemoryClaimStore } from '../helpers/inMemoryClaimStore';
import { InMemoryProfileStore } from '../helpers/inMemoryProfileStore';
import type { Region, Tier } from '../../src/foundation/types';

const RUNS = { numRuns: 200 } as const;

const T0_MS = Date.parse('2026-06-17T21:00:00.000Z');

const mintInputArb = fc.record({
  telegramId: fc.string({ minLength: 1, maxLength: 24 }),
  tier: fc.constantFrom<Tier>('gate', 'recruit', 'builder', 'empire', 'vip'),
  region: fc.constantFrom<Region>('egypt', 'international'),
});

// A deterministic well-formed hex token (16–128 lowercase hex chars per isWellFormedToken).
const tokenArb: fc.Arbitrary<string> = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 32, maxLength: 48 })
  .map((nibbles) => nibbles.map((n) => n.toString(16)).join(''));

interface Harness {
  service: FunnelClaimService;
  claims: InMemoryClaimStore;
  profiles: InMemoryProfileStore;
  setClock: (ms: number) => void;
}

function makeHarness(): Harness {
  let clockMs = T0_MS;
  const claims = new InMemoryClaimStore();
  const profiles = new InMemoryProfileStore();
  const profileApi = new ProfileApi(profiles, { now: () => new Date(clockMs).toISOString() });
  const service = new FunnelClaimService(claims, profileApi, { nowMs: () => clockMs });
  return { service, claims, profiles, setClock: (ms) => { clockMs = ms; } };
}

describe('Property 7: Claim safety (Req 6.4, 6.5)', () => {
  it('a fresh token redeems once, bootstraps exactly one profile, then rejects repeats', async () => {
    await fc.assert(
      fc.asyncProperty(
        tokenArb,
        mintInputArb,
        fc.uuid(),
        fc.integer({ min: 1, max: 900 }),
        fc.integer({ min: 1, max: 6 }),
        async (token, input, userId, ttlSeconds, repeats) => {
          const h = makeHarness();
          // Persist a fresh claim minted at T0 with a bounded TTL.
          const claim = mintClaimRecord(input, { token, nowMs: T0_MS, ttlSeconds });
          await h.claims.insertClaim(claim);

          // Redeem strictly before expiry.
          h.setClock(T0_MS + (ttlSeconds * 1000) / 2);
          const profile = await h.service.redeem(token, userId);

          // Carried funnel context applied (Req 6.3) and profile bootstrapped once.
          expect(profile.userId).toBe(userId);
          expect(profile.tier).toBe(input.tier);
          expect(profile.region).toBe(input.region);
          expect(profile.telegramId).toBe(input.telegramId);
          expect(h.profiles.totalProfiles()).toBe(1);
          expect(h.claims.redeemedBy(token)).toBe(userId);

          // Every repeat (still before expiry) is rejected as already-redeemed,
          // and no second profile is ever created (Req 6.4).
          for (let i = 0; i < repeats; i += 1) {
            await expect(h.service.redeem(token, `other-user-${i}`)).rejects.toBeInstanceOf(
              ClaimAlreadyRedeemedError,
            );
          }
          expect(h.profiles.totalProfiles()).toBe(1);
          expect(h.claims.redeemedBy(token)).toBe(userId);
          return true;
        },
      ),
      RUNS,
    );
  });

  it('a token redeemed at/after expiry is rejected and bootstraps no profile (Req 6.5)', async () => {
    await fc.assert(
      fc.asyncProperty(
        tokenArb,
        mintInputArb,
        fc.uuid(),
        fc.integer({ min: 1, max: 900 }),
        fc.integer({ min: 0, max: 100_000 }),
        async (token, input, userId, ttlSeconds, pastOffsetMs) => {
          const h = makeHarness();
          const claim = mintClaimRecord(input, { token, nowMs: T0_MS, ttlSeconds });
          await h.claims.insertClaim(claim);

          // Clock at or after expiry.
          h.setClock(T0_MS + ttlSeconds * 1000 + pastOffsetMs);
          await expect(h.service.redeem(token, userId)).rejects.toBeInstanceOf(ClaimExpiredError);

          expect(h.profiles.totalProfiles()).toBe(0);
          expect(h.claims.redeemedBy(token)).toBeNull();
          return true;
        },
      ),
      RUNS,
    );
  });

  it('an unknown or malformed token is rejected as invalid with no bootstrap (Req 6.6)', async () => {
    await fc.assert(
      fc.asyncProperty(tokenArb, fc.uuid(), async (unknownToken, userId) => {
        const h = makeHarness();
        // Nothing inserted → unknown token.
        await expect(h.service.redeem(unknownToken, userId)).rejects.toBeInstanceOf(ClaimInvalidError);
        // A structurally malformed token is also invalid.
        await expect(h.service.redeem('not a valid token!', userId)).rejects.toBeInstanceOf(
          ClaimInvalidError,
        );
        expect(h.profiles.totalProfiles()).toBe(0);
        return true;
      }),
      RUNS,
    );
  });

  it('concurrent redemptions consume the token exactly once (single-use)', async () => {
    await fc.assert(
      fc.asyncProperty(
        tokenArb,
        mintInputArb,
        fc.integer({ min: 2, max: 8 }),
        async (token, input, concurrency) => {
          const h = makeHarness();
          const claim = mintClaimRecord(input, { token, nowMs: T0_MS, ttlSeconds: 900 });
          await h.claims.insertClaim(claim);
          h.setClock(T0_MS + 1000); // well before expiry

          const userIds = Array.from({ length: concurrency }, (_, i) => `racer-${i}`);
          const results = await Promise.allSettled(
            userIds.map((uid) => h.service.redeem(token, uid)),
          );

          const fulfilled = results.filter((r) => r.status === 'fulfilled');
          const rejected = results.filter((r) => r.status === 'rejected');

          // Exactly one redemption wins; the rest are rejected as already-redeemed.
          expect(fulfilled).toHaveLength(1);
          expect(rejected).toHaveLength(concurrency - 1);
          for (const r of rejected) {
            expect((r as PromiseRejectedResult).reason).toBeInstanceOf(ClaimAlreadyRedeemedError);
          }
          // Profile bootstrapped exactly once, by the winner.
          expect(h.profiles.totalProfiles()).toBe(1);
          const winner = (fulfilled[0] as PromiseFulfilledResult<{ userId: string }>).value;
          expect(h.claims.redeemedBy(token)).toBe(winner.userId);
          return true;
        },
      ),
      RUNS,
    );
  });
});
