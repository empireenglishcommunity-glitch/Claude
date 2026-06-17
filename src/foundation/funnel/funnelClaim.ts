/**
 * Telegram funnel claim-token core — pure, offline-testable logic (Task 5.1/5.2).
 *
 * This module is the SOURCE OF TRUTH for the funnel handoff's claim
 * creation/validation/redemption rules (design §3.1, §4.2 `funnel_claim`,
 * Property 7; Requirements 6.1–6.7). It is deliberately split into:
 *
 *   • PURE functions — token minting, deep-link building, and the single
 *     redemption-classification decision ({@link classifyClaimForRedemption})
 *     that Property 7 pins down. These have no I/O and no provider dependency,
 *     so they run fully offline and deterministically (with an injected clock /
 *     token generator).
 *
 *   • A small injectable **persistence port** ({@link ClaimStore}) — exactly
 *     mirroring the `ProfileStore` / `AuthPort` pattern. Production wires a
 *     Supabase service-role adapter inside the Edge Functions; tests inject an
 *     in-memory fake so the whole funnel pipeline is exercised without Deno or a
 *     live Supabase.
 *
 * ── Boundary / security note (Req 6.7) ──────────────────────────────────────
 * The `funnel_claim` table is intentionally NOT under RLS — it is server/Edge
 * only. The Funnel_Bot calls the `create-funnel-claim` Edge Function endpoint;
 * the Supabase service-role key lives in Edge secrets and is NEVER shared with
 * the bot. This module holds only the provider-agnostic logic; the service-role
 * client is constructed solely inside the Deno Edge Functions.
 *
 * ── Deno re-export ──────────────────────────────────────────────────────────
 * The Edge Functions (Deno runtime) consume this exact logic through the
 * `supabase/functions/_shared/funnelClaim.ts` shim (mirroring `_shared/types.ts`).
 * The app + Jest import this module directly with extensionless paths.
 */
import type { ISODateTime, Region, Tier, UUID } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// Domain model — the claim record (mirrors the `funnel_claim` table, design §4.2)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A single-use, short-lived funnel claim. Carries the tier/region/Telegram id
 * captured in the funnel so they can be applied to the bootstrapped profile on
 * redemption. `redeemedBy` is `null` until the token is consumed exactly once.
 */
export interface ClaimRecord {
  token: string;
  telegramId: string;
  tier: Tier;
  region: Region;
  redeemedBy: UUID | null;
  expiresAt: ISODateTime;
  createdAt: ISODateTime;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants & deep-link scheme
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Maximum claim lifetime: 900 seconds / 15 minutes (Requirement 6.1). A minted
 * token's `expires_at` is always ≤ creation time + this bound.
 */
export const MAX_CLAIM_TTL_SECONDS = 900;

/** Default claim lifetime when a caller does not specify one (= the maximum). */
export const DEFAULT_CLAIM_TTL_SECONDS = MAX_CLAIM_TTL_SECONDS;

/** Custom deep-link scheme/host that opens the Learner_App at the claim screen. */
export const CLAIM_DEEP_LINK_SCHEME = 'empireenglish';
export const CLAIM_DEEP_LINK_HOST = 'claim';

/** Number of random bytes (→ hex chars × 2) backing a generated claim token. */
const CLAIM_TOKEN_BYTES = 24; // 48 hex chars — ample entropy, URL-safe

// ═══════════════════════════════════════════════════════════════════════════
// Typed errors (Requirements 6.4, 6.5, 6.6)
// ═══════════════════════════════════════════════════════════════════════════

/** Base class for all funnel-claim errors. */
export class ClaimError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * Raised when a redemption presents an unknown or malformed token (Req 6.6).
 * No profile is bootstrapped.
 */
export class ClaimInvalidError extends ClaimError {
  constructor(message = 'The claim token is invalid.') {
    super(message);
  }
}

/**
 * Raised when a redemption is attempted at or after the token's expiry (Req 6.5).
 * No profile is bootstrapped.
 */
export class ClaimExpiredError extends ClaimError {
  constructor(public readonly expiresAt: ISODateTime) {
    super(`The claim token expired at ${expiresAt}.`);
  }
}

/**
 * Raised when a redemption is attempted on a token already marked redeemed
 * (Req 6.4). The existing Learner_Profile is left unchanged.
 */
export class ClaimAlreadyRedeemedError extends ClaimError {
  constructor() {
    super('The claim token has already been redeemed.');
  }
}

/** Raised by {@link ClaimStore.insertClaim} when a token collides with an existing row. */
export class ClaimAlreadyExistsError extends ClaimError {
  constructor(public readonly token: string) {
    super('A claim with this token already exists.');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Persistence port (implemented by a Supabase service-role adapter + a fake)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The persistence port the funnel service depends on. Implementations MUST:
 *   • raise {@link ClaimAlreadyExistsError} from `insertClaim` on a token clash;
 *   • implement `markRedeemed` as an ATOMIC compare-and-set that succeeds only
 *     when `redeemed_by` is currently null — this is what guarantees a token is
 *     consumed at most once even under concurrent redemptions (Property 7).
 */
export interface ClaimStore {
  /** Persist a freshly minted claim. Throws {@link ClaimAlreadyExistsError} on a duplicate token. */
  insertClaim(claim: ClaimRecord): Promise<ClaimRecord>;
  /** Look up a claim by token, or `null` when none exists. */
  findClaim(token: string): Promise<ClaimRecord | null>;
  /**
   * Atomically set `redeemed_by = userId` IFF it is currently null. Returns the
   * updated claim on success, or `null` when the token is unknown or was already
   * redeemed (lost the single-use race).
   */
  markRedeemed(token: string, userId: UUID): Promise<ClaimRecord | null>;
}

// ═══════════════════════════════════════════════════════════════════════════
// PURE helpers — token format, generation, deep link
// ═══════════════════════════════════════════════════════════════════════════

/** A well-formed claim token: 16–128 lowercase hex characters. */
const TOKEN_PATTERN = /^[0-9a-f]{16,128}$/;

/** True iff `token` is structurally a well-formed claim token (Req 6.6 guard). */
export function isWellFormedToken(token: string | null | undefined): token is string {
  return typeof token === 'string' && TOKEN_PATTERN.test(token);
}

/** Convert a byte array to a lowercase hex string. */
function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

/**
 * Generate a cryptographically-random claim token (48 lowercase hex chars).
 * Uses the platform Web Crypto when available (browser, React Native, Deno,
 * modern Node), falling back to `Math.random` only when no CSPRNG is present.
 */
export function generateClaimToken(): string {
  const g = globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } };
  const bytes = new Uint8Array(CLAIM_TOKEN_BYTES);
  if (g.crypto?.getRandomValues) {
    g.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytesToHex(bytes);
}

/**
 * Build the deep link that opens the Learner_App at the claim screen with the
 * given token (Req 6.2), e.g. `empireenglish://claim?token=<token>`.
 */
export function buildClaimDeepLink(token: string): string {
  return `${CLAIM_DEEP_LINK_SCHEME}://${CLAIM_DEEP_LINK_HOST}?token=${encodeURIComponent(token)}`;
}

/** Extract the `token` query value from a claim deep link, or `null` if absent. */
export function parseClaimDeepLink(link: string): string | null {
  const marker = 'token=';
  const idx = link.indexOf(marker);
  if (idx === -1) return null;
  const raw = link.slice(idx + marker.length).split('&')[0];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PURE minting — build a claim record with a bounded expiry (Req 6.1)
// ═══════════════════════════════════════════════════════════════════════════

/** Inputs the bot supplies to mint a claim. */
export interface MintClaimInput {
  telegramId: string;
  tier: Tier;
  region: Region;
}

/** Options controlling minting (clock + token + ttl are injectable for tests). */
export interface MintClaimOptions {
  /** The token to embed; defaults to a freshly generated CSPRNG token. */
  token?: string;
  /** Creation time in Unix epoch milliseconds; defaults to `Date.now()`. */
  nowMs?: number;
  /** Requested lifetime in seconds; clamped to (0, {@link MAX_CLAIM_TTL_SECONDS}]. */
  ttlSeconds?: number;
}

/**
 * Clamp a requested TTL into the valid `(0, MAX_CLAIM_TTL_SECONDS]` range so a
 * minted claim's expiry never exceeds 900s after creation (Req 6.1).
 */
export function clampClaimTtlSeconds(ttlSeconds: number | undefined): number {
  if (typeof ttlSeconds !== 'number' || !Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    return DEFAULT_CLAIM_TTL_SECONDS;
  }
  return Math.min(Math.floor(ttlSeconds), MAX_CLAIM_TTL_SECONDS);
}

/**
 * Mint a new (unredeemed) {@link ClaimRecord}. Pure: given the same inputs +
 * options it produces the same record. `expiresAt` is always ≤ `createdAt` +
 * 900s (Requirement 6.1).
 */
export function mintClaimRecord(input: MintClaimInput, options: MintClaimOptions = {}): ClaimRecord {
  const nowMs = options.nowMs ?? Date.now();
  const ttlSeconds = clampClaimTtlSeconds(options.ttlSeconds);
  const token = options.token ?? generateClaimToken();
  const createdAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + ttlSeconds * 1000).toISOString();
  return {
    token,
    telegramId: input.telegramId,
    tier: input.tier,
    region: input.region,
    redeemedBy: null,
    expiresAt,
    createdAt,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PURE redemption classification — the heart of Property 7
// ═══════════════════════════════════════════════════════════════════════════

/** Why a claim is not redeemable. */
export type ClaimRejectionReason = 'unknown' | 'redeemed' | 'expired';

/** The pure verdict for a redemption attempt. */
export type ClaimClassification =
  | { redeemable: true }
  | { redeemable: false; reason: ClaimRejectionReason };

/**
 * The SINGLE redemption decision (Property 7 / Requirements 6.4, 6.5, 6.6).
 *
 * A claim is redeemable IFF it exists, has not been redeemed, and has not
 * expired relative to `nowMs`. Otherwise it is rejected with a specific reason:
 *   • `unknown`  — no such claim (Req 6.6)
 *   • `redeemed` — already consumed (Req 6.4); checked before expiry so a
 *                  consumed-then-expired token still reports "already redeemed"
 *   • `expired`  — `nowMs >= expiresAt` (Req 6.5)
 *
 * Pure and clock-injectable, so "redeemable at most once and only before expiry"
 * is verifiable fully offline.
 */
export function classifyClaimForRedemption(
  claim: ClaimRecord | null | undefined,
  nowMs: number,
): ClaimClassification {
  if (!claim) return { redeemable: false, reason: 'unknown' };
  if (claim.redeemedBy !== null) return { redeemable: false, reason: 'redeemed' };
  if (Date.parse(claim.expiresAt) <= nowMs) return { redeemable: false, reason: 'expired' };
  return { redeemable: true };
}

/** Map a rejection reason to its typed error (used by the service + Edge Fns). */
export function rejectionToError(reason: ClaimRejectionReason, claim: ClaimRecord | null): ClaimError {
  switch (reason) {
    case 'unknown':
      return new ClaimInvalidError();
    case 'redeemed':
      return new ClaimAlreadyRedeemedError();
    case 'expired':
      return new ClaimExpiredError(claim?.expiresAt ?? 'unknown');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// The redeemer contract the AuthApi SDK depends on
// ═══════════════════════════════════════════════════════════════════════════

import type { LearnerProfile } from '../types';

/**
 * The funnel-redeem capability the `AuthApi.redeemFunnelClaim` SDK method
 * delegates to. In production this invokes the `redeem-funnel-claim` Edge
 * Function; in tests it is the in-process {@link FunnelClaimService}. Either way
 * the app depends only on this interface, never on the redeem implementation.
 */
export interface ClaimRedeemer {
  redeem(token: string, userId: UUID): Promise<LearnerProfile>;
}
