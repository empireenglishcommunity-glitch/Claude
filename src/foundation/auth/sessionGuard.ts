/**
 * Authenticated-session gating primitives (Project P1, Task 4.2).
 *
 * This is the LOW-LEVEL, dependency-free layer the auth SDK builds on. It
 * defines the normalized {@link AuthSession} shape, the typed authentication
 * errors, and the single reusable guard — {@link requireSession} — that every
 * protected SDK surface (profile, recording, AI) calls before returning any
 * protected data.
 *
 * Why a typed app-layer guard when RLS already protects the database?
 * Postgres Row-Level Security (Task 3.1) is the authoritative enforcement at
 * the data tier: a request without a valid `auth.uid()` simply sees no rows.
 * This guard adds the *app-layer* contract required by Requirements 1.6 and
 * 5.5 — it lets an SDK surface fail fast with a single, typed
 * {@link UnauthenticatedError} (distinguishing missing / expired / invalid
 * tokens) and guarantees no protected operation is even attempted without a
 * live session, so no protected data is returned. It is pure and clock-injectable
 * so the "expired token is denied" behaviour is assertable fully offline.
 *
 * Requirements: 1.6 (reject unauthenticated backend requests, return no
 * protected data) and 5.5 (deny protected profile/recording/AI operations on a
 * missing, expired, or invalid session token with an unauthenticated error).
 */
import type { UUID } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// Normalized session shape
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A provider-independent, normalized authenticated session.
 *
 * The Supabase auth adapter (and any future auth provider adapter) maps its
 * native session onto this shape so the rest of the SDK never depends on a
 * provider session type. Timestamps are Unix epoch SECONDS (matching Supabase's
 * `expires_at`), which keeps TTL arithmetic exact and easy to assert in tests.
 */
export interface AuthSession {
  /** The authenticated learner id (= Supabase auth user id). */
  userId: UUID;
  /** The bearer access token (JWT). Never logged. */
  accessToken: string;
  /** Unix epoch seconds at which the access token expires. */
  expiresAt: number;
  /** Unix epoch seconds at which the access token was issued. */
  issuedAt: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Session TTL policy — Requirement 5.2
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Maximum allowed access-token lifetime: 60 minutes (Requirement 5.2).
 *
 * This equals Supabase's DEFAULT access-token TTL (`JWT expiry = 3600s`), so no
 * Supabase override is needed to satisfy the requirement — the default already
 * complies. The constant is enforced defensively app-side (see
 * {@link isSessionTtlWithinLimit}) so a future backend misconfiguration that
 * widened the TTL beyond 60 minutes would be caught rather than silently
 * accepted. To stay compliant, the Supabase project's
 * `Auth → Sessions → Access token (JWT) expiry` MUST remain ≤ 3600 seconds.
 */
export const MAX_SESSION_TTL_SECONDS = 60 * 60; // 3600

/** The lifetime of a session in seconds (`expiresAt - issuedAt`). */
export function sessionTtlSeconds(session: AuthSession): number {
  return session.expiresAt - session.issuedAt;
}

/**
 * True iff the session's lifetime is a positive duration no greater than
 * {@link MAX_SESSION_TTL_SECONDS} (Requirement 5.2). A non-positive TTL (expiry
 * at or before issuance) is rejected as malformed.
 */
export function isSessionTtlWithinLimit(session: AuthSession): boolean {
  const ttl = sessionTtlSeconds(session);
  return ttl > 0 && ttl <= MAX_SESSION_TTL_SECONDS;
}

// ═══════════════════════════════════════════════════════════════════════════
// Typed authentication errors
// ═══════════════════════════════════════════════════════════════════════════

/** Base class for all authentication/authorization errors raised by the SDK. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Why a session was rejected by {@link requireSession}. */
export type UnauthenticatedReason = 'missing' | 'expired' | 'invalid';

/**
 * Raised when a protected operation is attempted without a valid live session
 * (Requirements 1.6, 5.5). The `reason` distinguishes a missing token, an
 * expired token, and a structurally invalid token; in every case the caller
 * MUST return no protected data.
 */
export class UnauthenticatedError extends AuthError {
  constructor(public readonly reason: UnauthenticatedReason) {
    super(`Authentication required: session token is ${reason}.`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// The guard — Requirements 1.6, 5.5
// ═══════════════════════════════════════════════════════════════════════════

/** The authenticated context returned by a successful {@link requireSession}. */
export interface AuthenticatedContext {
  userId: UUID;
}

/** Current time in Unix epoch seconds (injectable in callers for determinism). */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Reusable authenticated-session guard (Task 4.2).
 *
 * Returns the authenticated context when `session` is present, structurally
 * valid (non-empty `userId` and `accessToken`), and unexpired relative to
 * `now`. Otherwise throws a typed {@link UnauthenticatedError} so the calling
 * SDK surface denies the protected profile/recording/AI operation and returns
 * no protected data (Requirements 1.6, 5.5).
 *
 * Pure and clock-injectable: passing a fixed `now` makes the expired-token
 * denial deterministically testable offline.
 *
 * @param session the normalized session to validate (or `null` when absent)
 * @param now     current time in Unix epoch seconds (defaults to wall clock)
 */
export function requireSession(
  session: AuthSession | null | undefined,
  now: number = nowSeconds(),
): AuthenticatedContext {
  if (!session) {
    throw new UnauthenticatedError('missing');
  }
  if (!session.userId || !session.accessToken) {
    throw new UnauthenticatedError('invalid');
  }
  if (session.expiresAt <= now) {
    throw new UnauthenticatedError('expired');
  }
  return { userId: session.userId };
}

/**
 * Non-throwing variant of {@link requireSession}: returns `true` iff the session
 * is present, structurally valid, and unexpired. Useful for SDK surfaces that
 * prefer to branch rather than catch.
 */
export function hasValidSession(
  session: AuthSession | null | undefined,
  now: number = nowSeconds(),
): boolean {
  try {
    requireSession(session, now);
    return true;
  } catch {
    return false;
  }
}
