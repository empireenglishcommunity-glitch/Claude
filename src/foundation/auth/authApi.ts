/**
 * Authentication & account-bootstrap SDK — `AuthApi` (Project P1, Task 4.1).
 *
 * Implements the design §6 `AuthApi` contract over Supabase Auth: `signUp`,
 * `signIn` (email/password AND email OTP), `signOut`, and `getSession`. On new
 * account creation it triggers the idempotent profile bootstrap (reusing the
 * Task 3.2 `ProfileApi.bootstrap`) so retries never create more than one
 * profile, surfacing a safe-retry error if bootstrap fails. It rejects invalid
 * credentials (no session) and duplicate-email sign-up (no new profile).
 *
 * ── Testability decision (offline / deterministic) ──────────────────────────
 * Exactly mirroring the `ProfileApi`/`ProfileStore` pattern, this SDK depends on
 * a small injectable **auth port** ({@link AuthPort}) that wraps `supabase.auth`,
 * plus the `ProfileApi`. Production wires {@link SupabaseAuthPort} + the real
 * `ProfileApi` via {@link createAuthApi}; tests inject in-memory fakes so the
 * whole SDK runs deterministically and fully offline — no live Supabase needed.
 * A `now()` clock (Unix epoch seconds) is likewise injectable for determinism.
 *
 * This split is also what makes the two hardest requirements assertable offline:
 *   • Req 5.2 (JWT expiry ≤ 60 min): the port returns a normalized
 *     {@link AuthSession} carrying `issuedAt`/`expiresAt`; the SDK enforces
 *     {@link isSessionTtlWithinLimit} on every issued session and rejects a
 *     non-compliant TTL with {@link SessionPolicyError}. A fake port can hand
 *     back any TTL, so the bound is verified without a real token.
 *   • Req 5.4 (sign-out invalidates within 5s): `signOut` clears the port's
 *     session synchronously; a test asserts `getSession()` is `null` immediately
 *     afterwards (well inside the 5-second budget).
 *
 * ── Interface reconciliation (mirrors ProfileApi) ───────────────────────────
 * design §6's `AuthApi` declares `signIn(email, password)` and a
 * `redeemFunnelClaim` method. Email-OTP sign-in (Req 5.1) needs a request/verify
 * pair the single `signIn` signature cannot express. So — exactly as the
 * `ProfileApi` class is a requirement-faithful realization that does not
 * literally `implements` the interface — this class realizes the interface's
 * intent and adds the OTP methods. `redeemFunnelClaim` (Task 5) is now wired:
 * it delegates to an injected {@link ClaimRedeemer} so the app never holds a
 * service key (Req 6.7) and the funnel pipeline stays offline-testable.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 5.8 (and 1.6/5.5 via the
 * {@link requireSession} guard surfaced through {@link AuthApi.requireActiveSession}).
 */
import type { LearnerProfile, UUID } from '../types';
import type { ProfileApi } from '../profile/profileApi';
import type { ClaimRedeemer } from '../funnel/funnelClaim';
import {
  AuthError,
  isSessionTtlWithinLimit,
  nowSeconds,
  requireSession,
  sessionTtlSeconds,
  type AuthenticatedContext,
  type AuthSession,
} from './sessionGuard';

// ═══════════════════════════════════════════════════════════════════════════
// The injectable auth port (wraps supabase.auth) + outcomes
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Outcome of a sign-up. `session` is `null` when the provider requires email
 * confirmation before issuing a session (in which case the profile is
 * bootstrapped later, on first authenticated sign-in/OTP verification).
 */
export interface SignUpOutcome {
  userId: UUID;
  session: AuthSession | null;
}

/**
 * Provider-agnostic auth port. {@link SupabaseAuthPort} implements it over
 * `supabase.auth`; tests implement an in-memory fake. Implementations MUST map
 * provider errors onto the typed SDK errors below — in particular raising
 * {@link InvalidCredentialsError} for bad sign-in credentials (Req 5.6) and
 * {@link DuplicateAccountError} for an already-registered sign-up email
 * (Req 5.7) — and MUST return TTL-bearing {@link AuthSession}s.
 */
export interface AuthPort {
  /** Create an account with email + password. Raises {@link DuplicateAccountError} if the email exists. */
  signUpWithPassword(email: string, password: string): Promise<SignUpOutcome>;
  /** Sign in with email + password. Raises {@link InvalidCredentialsError} on bad credentials. */
  signInWithPassword(email: string, password: string): Promise<AuthSession>;
  /** Send a one-time passcode to `email`. `createUser` controls whether a new account may be created. */
  requestEmailOtp(email: string, createUser: boolean): Promise<void>;
  /** Verify an emailed OTP and return the resulting session. Raises {@link InvalidCredentialsError} on a bad/expired code. */
  verifyEmailOtp(email: string, token: string): Promise<AuthSession>;
  /** Invalidate the active session locally (and server-side where supported). */
  signOut(): Promise<void>;
  /** Return the current session, or `null` if there is none. */
  getSession(): Promise<AuthSession | null>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Typed errors (Req 5.2, 5.6, 5.7, 5.8)
// ═══════════════════════════════════════════════════════════════════════════

/** Raised when sign-in credentials are invalid; no session is created (Req 5.6). */
export class InvalidCredentialsError extends AuthError {
  constructor(message = 'Invalid email or password.') {
    super(message);
  }
}

/** Raised when a sign-up email is already registered; no new profile is created (Req 5.7). */
export class DuplicateAccountError extends AuthError {
  constructor(public readonly email: string) {
    super(`An account already exists for "${email}".`);
  }
}

/**
 * Raised when an issued session violates the ≤ 60-minute TTL policy (Req 5.2).
 * Defensive: signals a backend auth misconfiguration (access-token expiry set
 * above 3600s) rather than normal operation.
 */
export class SessionPolicyError extends AuthError {
  constructor(public readonly ttlSeconds: number) {
    super(
      `Issued session TTL of ${ttlSeconds}s violates the maximum of 3600s (60 minutes). ` +
        'Check the backend access-token (JWT) expiry configuration.',
    );
  }
}

/**
 * Raised when profile bootstrap fails after account creation (Req 5.8). The
 * underlying `bootstrap` is idempotent, so the operation is ALWAYS SAFE TO RETRY
 * — a retry will never create a duplicate profile. The triggering cause is
 * preserved for diagnostics.
 */
export class ProfileBootstrapError extends AuthError {
  readonly safeToRetry = true;
  constructor(
    public readonly userId: UUID,
    public readonly cause: unknown,
  ) {
    super(
      `Profile bootstrap failed for user "${userId}" after account creation. ` +
        'The account exists and bootstrap is idempotent — retry is safe and will not duplicate the profile.',
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// The Auth SDK
// ═══════════════════════════════════════════════════════════════════════════

export interface AuthApiOptions {
  /** Injectable clock (Unix epoch seconds) for deterministic expiry/TTL checks in tests. */
  now?: () => number;
  /**
   * The funnel-claim redeemer that {@link AuthApi.redeemFunnelClaim} delegates
   * to (Task 5). Production wires the Edge-Function-invoking redeemer via
   * {@link createAuthApi}; tests inject an in-process {@link FunnelClaimService}
   * (or a fake). When omitted, {@link AuthApi.redeemFunnelClaim} throws
   * {@link FunnelRedeemerUnavailableError}.
   */
  claimRedeemer?: ClaimRedeemer;
}

/**
 * Raised when {@link AuthApi.redeemFunnelClaim} is called but no
 * {@link ClaimRedeemer} was wired into the SDK. Signals a composition error
 * (the production factory always injects one) rather than normal operation.
 */
export class FunnelRedeemerUnavailableError extends AuthError {
  constructor() {
    super(
      'No funnel claim redeemer is configured. Construct AuthApi with a claimRedeemer ' +
        '(createAuthApi injects the production redeemer).',
    );
  }
}

/** Options accepted by sign-up / OTP-verify flows that bootstrap a profile. */
export interface AccountSeedOptions {
  /** Seed values carried into the idempotent profile bootstrap (e.g. region, tier from a funnel). */
  seed?: Partial<LearnerProfile>;
}

/**
 * Requirement-faithful realization of the design §6 `AuthApi` (see the interface
 * reconciliation note in the file header).
 */
export class AuthApi {
  private readonly port: AuthPort;
  private readonly profiles: ProfileApi;
  private readonly now: () => number;
  private readonly claimRedeemer?: ClaimRedeemer;

  constructor(port: AuthPort, profiles: ProfileApi, options: AuthApiOptions = {}) {
    this.port = port;
    this.profiles = profiles;
    this.now = options.now ?? nowSeconds;
    this.claimRedeemer = options.claimRedeemer;
  }

  /**
   * Create an account with email + password (Req 5.1) and, when a session is
   * issued, bootstrap exactly one profile idempotently (Req 5.3). A duplicate
   * email is rejected by the port with {@link DuplicateAccountError} and no
   * profile is created (Req 5.7). The issued session's TTL is enforced ≤ 60 min
   * (Req 5.2). If bootstrap fails, a safe-retry {@link ProfileBootstrapError} is
   * surfaced (Req 5.8) — the account already exists and bootstrap is idempotent.
   */
  async signUp(
    email: string,
    password: string,
    options: AccountSeedOptions = {},
  ): Promise<{ userId: UUID }> {
    const outcome = await this.port.signUpWithPassword(email, password);
    if (outcome.session) {
      this.enforceSessionPolicy(outcome.session);
      await this.bootstrapProfile(outcome.userId, options.seed);
    }
    return { userId: outcome.userId };
  }

  /**
   * Sign in with email + password (Req 5.1). Invalid credentials are rejected by
   * the port with {@link InvalidCredentialsError} and no session is created
   * (Req 5.6). The issued session's TTL is enforced ≤ 60 min (Req 5.2).
   */
  async signIn(email: string, password: string): Promise<{ userId: UUID }> {
    const session = await this.port.signInWithPassword(email, password);
    this.enforceSessionPolicy(session);
    return { userId: session.userId };
  }

  /**
   * Request an email OTP (Req 5.1). When `createAccount` is true (default) the
   * provider may create a new account on verification; pass `false` to restrict
   * the code to existing accounts (a pure sign-in).
   */
  async requestEmailOtp(email: string, options: { createAccount?: boolean } = {}): Promise<void> {
    await this.port.requestEmailOtp(email, options.createAccount ?? true);
  }

  /**
   * Verify an emailed OTP (Req 5.1) and, on success, bootstrap the profile
   * idempotently (Req 5.3) — safe whether this is a brand-new account or a
   * returning learner, because `bootstrap` returns the existing profile
   * unchanged. The issued session's TTL is enforced ≤ 60 min (Req 5.2); a bad or
   * expired code is rejected by the port with {@link InvalidCredentialsError}
   * (Req 5.6). A bootstrap failure surfaces a safe-retry
   * {@link ProfileBootstrapError} (Req 5.8).
   */
  async verifyEmailOtp(
    email: string,
    token: string,
    options: AccountSeedOptions = {},
  ): Promise<{ userId: UUID }> {
    const session = await this.port.verifyEmailOtp(email, token);
    this.enforceSessionPolicy(session);
    await this.bootstrapProfile(session.userId, options.seed);
    return { userId: session.userId };
  }

  /**
   * Redeem a Telegram funnel claim token after sign-up (design §6,
   * Requirements 6.3–6.6), delegating to the injected {@link ClaimRedeemer}.
   *
   * The SDK depends ONLY on the redeemer interface: in production this is the
   * Edge-Function-invoking redeemer wired by {@link createAuthApi} (so the app
   * never holds a Supabase service key — Req 6.7); in tests it is an in-process
   * {@link FunnelClaimService} over in-memory fakes. On success the bootstrapped
   * {@link LearnerProfile} (carrying the claim's tier/region/Telegram id) is
   * returned; invalid / expired / already-redeemed tokens reject with the typed
   * claim errors and bootstrap no profile.
   */
  async redeemFunnelClaim(token: string, userId: UUID): Promise<LearnerProfile> {
    if (!this.claimRedeemer) {
      throw new FunnelRedeemerUnavailableError();
    }
    return this.claimRedeemer.redeem(token, userId);
  }

  /**
   * Sign out, invalidating the active session on the app (Req 5.4). This clears
   * the port's session synchronously on completion, so a subsequent
   * {@link getSession} immediately returns `null` — well within the 5-second
   * invalidation budget.
   */
  async signOut(): Promise<void> {
    await this.port.signOut();
  }

  /**
   * Return the active session's owner, or `null` when there is no live session.
   * An expired session is treated as no session (returns `null`).
   */
  async getSession(): Promise<{ userId: UUID } | null> {
    const session = await this.getActiveSession();
    return session ? { userId: session.userId } : null;
  }

  /**
   * Return the full normalized {@link AuthSession} when one is live and unexpired,
   * else `null`. Used by SDK surfaces that need the token/expiry, and the basis
   * for {@link requireActiveSession}.
   */
  async getActiveSession(): Promise<AuthSession | null> {
    const session = await this.port.getSession();
    if (!session) return null;
    // An expired token is not a live session (Req 5.5 semantics).
    if (session.expiresAt <= this.now()) return null;
    return session;
  }

  /**
   * Authenticated-session guard for protected SDK surfaces (Task 4.2,
   * Req 1.6/5.5). Fetches the active session and applies {@link requireSession},
   * returning the authenticated context or throwing {@link UnauthenticatedError}
   * (missing / expired / invalid) so the caller returns no protected data.
   */
  async requireActiveSession(): Promise<AuthenticatedContext> {
    const session = await this.port.getSession();
    return requireSession(session, this.now());
  }

  // ── internals ──────────────────────────────────────────────────────────────

  /** Enforce the ≤ 60-minute session-TTL policy (Req 5.2). */
  private enforceSessionPolicy(session: AuthSession): void {
    if (!isSessionTtlWithinLimit(session)) {
      throw new SessionPolicyError(sessionTtlSeconds(session));
    }
  }

  /**
   * Idempotently bootstrap the learner profile after account creation (Req 5.3),
   * wrapping any failure in a safe-retry {@link ProfileBootstrapError} (Req 5.8).
   */
  private async bootstrapProfile(userId: UUID, seed: Partial<LearnerProfile> = {}): Promise<void> {
    try {
      await this.profiles.bootstrap(userId, seed);
    } catch (err) {
      throw new ProfileBootstrapError(userId, err);
    }
  }
}

/**
 * Construct the production Auth SDK backed by Supabase Auth + the real
 * `ProfileApi`. Imported lazily so tests that inject fakes never pull in the
 * backend client.
 */
export async function createAuthApi(options: AuthApiOptions = {}): Promise<AuthApi> {
  const [{ SupabaseAuthPort }, { createProfileApi }, { EdgeFunnelRedeemer }] = await Promise.all([
    import('./supabaseAuthPort'),
    import('../profile/profileApi'),
    import('../funnel/edgeFunnelRedeemer'),
  ]);
  const profiles = await createProfileApi();
  return new AuthApi(new SupabaseAuthPort(), profiles, {
    claimRedeemer: new EdgeFunnelRedeemer(),
    ...options,
  });
}
