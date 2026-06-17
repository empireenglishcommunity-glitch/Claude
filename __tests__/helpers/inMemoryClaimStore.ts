/**
 * In-memory {@link ClaimStore} fake for deterministic, offline funnel tests
 * (Tasks 5.3 / 5.4).
 *
 * This is NOT a test file (no `.test.ts` suffix, so Jest's `testMatch` ignores
 * it). It lets the {@link FunnelClaimService} run fully offline — no Deno, no
 * live Supabase — while faithfully reproducing the two persistence invariants
 * the service (and Property 7) rely on:
 *
 *   • `insertClaim` raises {@link ClaimAlreadyExistsError} on a duplicate token
 *     (the Postgres primary-key guard on `funnel_claim.token`).
 *   • `markRedeemed` is an ATOMIC compare-and-set: it sets `redeemedBy` only
 *     when it is currently `null`, returning the updated row on success and
 *     `null` when the token is unknown or already redeemed. This single-winner
 *     semantics is exactly what guarantees a token is consumed at most once.
 *
 * The store is fully synchronous under the hood; because JS runs the body of
 * each `async` method to completion before yielding, the compare-and-set is
 * race-free even when many `markRedeemed` calls are fired via `Promise.all`,
 * mirroring the Postgres `UPDATE ... WHERE redeemed_by IS NULL` guarantee.
 */
import {
  ClaimAlreadyExistsError,
  type ClaimRecord,
  type ClaimStore,
} from '../../src/foundation/funnel/funnelClaim';
import type { UUID } from '../../src/foundation/types';

export class InMemoryClaimStore implements ClaimStore {
  private readonly claims = new Map<string, ClaimRecord>();

  /** Test helper: total number of stored claims. */
  size(): number {
    return this.claims.size;
  }

  /** Test helper: directly seed a claim row (bypassing minting). */
  seed(claim: ClaimRecord): void {
    this.claims.set(claim.token, { ...claim });
  }

  /** Test helper: read the current `redeemedBy` for a token (or `undefined`). */
  redeemedBy(token: string): UUID | null | undefined {
    return this.claims.get(token)?.redeemedBy;
  }

  async insertClaim(claim: ClaimRecord): Promise<ClaimRecord> {
    if (this.claims.has(claim.token)) {
      throw new ClaimAlreadyExistsError(claim.token);
    }
    this.claims.set(claim.token, { ...claim });
    return { ...claim };
  }

  async findClaim(token: string): Promise<ClaimRecord | null> {
    const row = this.claims.get(token);
    return row ? { ...row } : null;
  }

  async markRedeemed(token: string, userId: UUID): Promise<ClaimRecord | null> {
    const row = this.claims.get(token);
    // Compare-and-set: succeed ONLY when currently unredeemed (single-use).
    if (!row || row.redeemedBy !== null) {
      return null;
    }
    const updated: ClaimRecord = { ...row, redeemedBy: userId };
    this.claims.set(token, updated);
    return { ...updated };
  }
}
