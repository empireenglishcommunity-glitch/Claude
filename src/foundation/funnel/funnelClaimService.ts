/**
 * Funnel claim service — in-process, provider-agnostic orchestration (Task 5.1/5.2).
 *
 * This is the COMPOSITION layer that wires the pure funnel logic in
 * `./funnelClaim` to the two injectable ports it needs — a {@link ClaimStore}
 * (persistence of `funnel_claim` rows) and the {@link ProfileApi} (idempotent
 * Layer 0 bootstrap). It contains NO duplicated rule logic: every decision
 * (minting bounds, well-formed-token guard, the single redemption
 * classification) is delegated to the pure functions already proven by
 * Property 7. This module only sequences I/O around those decisions.
 *
 * It exposes:
 *   • {@link FunnelClaimService.createClaim} — mints + persists a claim and
 *     returns the token + the app deep link (Requirements 6.1, 6.2). The
 *     Funnel_Bot reaches this through the `create-funnel-claim` Edge Function;
 *     the bot never holds a Supabase service key (Req 6.7) — the service-role
 *     client lives only inside the Edge runtime.
 *   • {@link FunnelClaimService.redeem} — implements the {@link ClaimRedeemer}
 *     contract the `AuthApi.redeemFunnelClaim` SDK method delegates to
 *     (Requirements 6.3–6.6).
 *
 * ── Testability (offline / deterministic) ───────────────────────────────────
 * Exactly mirroring `ProfileApi`/`AuthApi`, the service depends only on the
 * `ClaimStore` + `ProfileApi` interfaces. Production wires the
 * {@link SupabaseClaimStore} (service-role) + the real `ProfileApi`; tests
 * inject the in-memory `ClaimStore` fake + an `InMemoryProfileStore`-backed
 * `ProfileApi`, so the entire funnel pipeline runs without Deno or a live
 * Supabase. The clock / token / ttl used by minting are injectable.
 */
import type { LearnerProfile, UUID } from '../types';
import type { ProfileApi } from '../profile/profileApi';
import {
  buildClaimDeepLink,
  classifyClaimForRedemption,
  isWellFormedToken,
  mintClaimRecord,
  rejectionToError,
  ClaimInvalidError,
  type ClaimRecord,
  type ClaimRedeemer,
  type ClaimStore,
  type MintClaimInput,
  type MintClaimOptions,
} from './funnelClaim';

/** What {@link FunnelClaimService.createClaim} returns to the bot/Edge Function. */
export interface CreatedClaim {
  /** The minted single-use token. */
  token: string;
  /** The deep link (`empireenglish://claim?token=...`) that opens the app (Req 6.2). */
  deepLink: string;
  /** The full persisted claim record (useful for observability/tests). */
  claim: ClaimRecord;
}

export interface FunnelClaimServiceOptions {
  /** Injectable clock (Unix epoch ms) used when minting; defaults to `Date.now()`. */
  nowMs?: () => number;
}

/**
 * Provider-agnostic funnel claim orchestration. Depends only on the injectable
 * {@link ClaimStore} + {@link ProfileApi}; realizes {@link ClaimRedeemer}.
 */
export class FunnelClaimService implements ClaimRedeemer {
  private readonly claims: ClaimStore;
  private readonly profiles: ProfileApi;
  private readonly nowMs: () => number;

  constructor(claims: ClaimStore, profiles: ProfileApi, options: FunnelClaimServiceOptions = {}) {
    this.claims = claims;
    this.profiles = profiles;
    this.nowMs = options.nowMs ?? (() => Date.now());
  }

  /**
   * Mint and persist a single-use claim, returning the token + app deep link
   * (Requirements 6.1, 6.2). The minted `expires_at` is always ≤ creation +
   * 900s (enforced by the pure {@link mintClaimRecord} / TTL clamp). `options`
   * lets the Edge Function / tests inject a token, clock, or ttl.
   */
  async createClaim(input: MintClaimInput, options: MintClaimOptions = {}): Promise<CreatedClaim> {
    const claim = mintClaimRecord(input, { nowMs: this.nowMs(), ...options });
    const persisted = await this.claims.insertClaim(claim);
    return {
      token: persisted.token,
      deepLink: buildClaimDeepLink(persisted.token),
      claim: persisted,
    };
  }

  /**
   * Redeem a claim for an authenticated learner (Requirements 6.3–6.6).
   *
   * Flow (each rule delegated to the pure layer, no logic duplicated here):
   *   1. {@link isWellFormedToken} guard — a malformed token is rejected as
   *      invalid with NO lookup and NO bootstrap (Req 6.6).
   *   2. `findClaim` + {@link classifyClaimForRedemption} — decide redeemability
   *      against the injected clock (unknown / redeemed / expired → typed error
   *      via {@link rejectionToError}; no bootstrap in any rejection path).
   *   3. On redeemable: atomic `markRedeemed` compare-and-set. If it loses the
   *      single-use race (returns `null`), the token was consumed concurrently —
   *      surface "already redeemed" (Req 6.4), leaving any existing profile
   *      untouched.
   *   4. Idempotently `bootstrap` the Layer 0 profile carrying the claim's
   *      tier / region / Telegram id (Req 6.3), and return the LearnerProfile.
   */
  async redeem(token: string, userId: UUID): Promise<LearnerProfile> {
    // 1. Malformed-token guard (Req 6.6) — never touches the store.
    if (!isWellFormedToken(token)) {
      throw new ClaimInvalidError();
    }

    // 2. Look up + classify against the injected clock.
    const existing = await this.claims.findClaim(token);
    const verdict = classifyClaimForRedemption(existing, this.nowMs());
    if (!verdict.redeemable) {
      throw rejectionToError(verdict.reason, existing);
    }

    // 3. Atomic single-use consumption (CAS on redeemed_by IS NULL).
    const redeemed = await this.claims.markRedeemed(token, userId);
    if (!redeemed) {
      // Lost the race (or vanished): re-classify the now-current row to surface
      // the precise reason — typically "already redeemed" (Req 6.4).
      const current = await this.claims.findClaim(token);
      const reclassified = classifyClaimForRedemption(current, this.nowMs());
      // It cannot be redeemable now (markRedeemed just failed), so this throws.
      throw rejectionToError(
        reclassified.redeemable ? 'redeemed' : reclassified.reason,
        current,
      );
    }

    // 4. Idempotent Layer 0 bootstrap with the carried funnel context (Req 6.3).
    return this.profiles.bootstrap(userId, {
      tier: redeemed.tier,
      region: redeemed.region,
      telegramId: redeemed.telegramId,
    });
  }
}

/**
 * Construct the production funnel service backed by the Supabase SERVICE-ROLE
 * claim store + the real `ProfileApi`. Imported lazily (mirroring
 * `createAuthApi`/`createProfileApi`) so tests that inject fakes never pull in
 * the backend client, and so the service-role client is only ever constructed
 * server-side (Edge runtime), never in the shipped app bundle (Req 6.7).
 */
export async function createFunnelClaimService(
  options: FunnelClaimServiceOptions = {},
): Promise<FunnelClaimService> {
  const [{ SupabaseClaimStore }, { createProfileApi }] = await Promise.all([
    import('./supabaseClaimStore'),
    import('../profile/profileApi'),
  ]);
  const profiles = await createProfileApi();
  return new FunnelClaimService(new SupabaseClaimStore(), profiles, options);
}
