/**
 * In-memory {@link AuthPort} fake for deterministic, offline auth tests (Task 4.3).
 *
 * This is NOT a test file (no `.test.ts` suffix, so Jest's `testMatch` ignores
 * it). It lets the `AuthApi` SDK run fully offline — no live Supabase — by
 * faithfully reproducing the auth behaviours the SDK relies on:
 *   • duplicate-email sign-up raises {@link DuplicateAccountError} (Req 5.7);
 *   • bad password / wrong OTP raises {@link InvalidCredentialsError} (Req 5.6);
 *   • every issued session carries `issuedAt`/`expiresAt` so the ≤ 60-min TTL
 *     policy (Req 5.2) is assertable; the TTL is configurable per instance to
 *     exercise both compliant and non-compliant tokens;
 *   • `signOut` clears the session synchronously, so `getSession` immediately
 *     returns `null` (Req 5.4).
 *
 * A fixed clock (Unix epoch seconds) keeps issuance/expiry deterministic.
 */
import type {
  AuthPort,
  SignUpOutcome,
} from '../../src/foundation/auth/authApi';
import {
  DuplicateAccountError,
  InvalidCredentialsError,
} from '../../src/foundation/auth/authApi';
import type { AuthSession } from '../../src/foundation/auth/sessionGuard';

interface FakeAccount {
  userId: string;
  email: string;
  password: string | null;
}

export interface InMemoryAuthPortOptions {
  /** Fixed "now" in Unix epoch seconds used to stamp issued sessions. */
  now?: () => number;
  /** TTL (seconds) applied to issued sessions. Default 3600 (= 60 min, compliant). */
  sessionTtlSeconds?: number;
  /** When true, sign-up returns no session (email-confirmation flow). Default false. */
  requireConfirmation?: boolean;
  /** Generates user ids. Default: sequential deterministic ids. */
  uuid?: () => string;
}

export class InMemoryAuthPort implements AuthPort {
  private readonly accounts = new Map<string, FakeAccount>(); // keyed by email
  private current: AuthSession | null = null;
  private pendingOtp = new Map<string, string>(); // email -> code
  private seq = 0;

  private readonly now: () => number;
  private readonly ttl: number;
  private readonly requireConfirmation: boolean;
  private readonly uuid: () => string;

  /** Test introspection: the session that signOut should clear. */
  get activeSession(): AuthSession | null {
    return this.current;
  }

  /** Test introspection: number of registered accounts. */
  get accountCount(): number {
    return this.accounts.size;
  }

  constructor(options: InMemoryAuthPortOptions = {}) {
    this.now = options.now ?? (() => 1_700_000_000);
    this.ttl = options.sessionTtlSeconds ?? 3600;
    this.requireConfirmation = options.requireConfirmation ?? false;
    this.uuid = options.uuid ?? (() => `user-${(this.seq += 1)}`);
  }

  /** Seed an existing account (e.g. to test duplicate-email sign-up / sign-in). */
  seedAccount(email: string, password: string, userId = this.uuid()): string {
    this.accounts.set(email, { userId, email, password });
    return userId;
  }

  private mkSession(userId: string): AuthSession {
    const issuedAt = this.now();
    return {
      userId,
      accessToken: `token-${userId}-${issuedAt}`,
      issuedAt,
      expiresAt: issuedAt + this.ttl,
    };
  }

  async signUpWithPassword(email: string, password: string): Promise<SignUpOutcome> {
    if (this.accounts.has(email)) {
      throw new DuplicateAccountError(email);
    }
    const userId = this.uuid();
    this.accounts.set(email, { userId, email, password });
    if (this.requireConfirmation) {
      return { userId, session: null };
    }
    const session = this.mkSession(userId);
    this.current = session;
    return { userId, session };
  }

  async signInWithPassword(email: string, password: string): Promise<AuthSession> {
    const account = this.accounts.get(email);
    if (!account || account.password !== password) {
      throw new InvalidCredentialsError();
    }
    const session = this.mkSession(account.userId);
    this.current = session;
    return session;
  }

  async requestEmailOtp(email: string, createUser: boolean): Promise<void> {
    if (!this.accounts.has(email)) {
      if (!createUser) {
        // Pure sign-in for a non-existent account: send nothing redeemable.
        return;
      }
      this.accounts.set(email, { userId: this.uuid(), email, password: null });
    }
    this.pendingOtp.set(email, '123456');
  }

  async verifyEmailOtp(email: string, token: string): Promise<AuthSession> {
    const expected = this.pendingOtp.get(email);
    const account = this.accounts.get(email);
    if (!account || !expected || token !== expected) {
      throw new InvalidCredentialsError('Invalid or expired one-time passcode.');
    }
    this.pendingOtp.delete(email);
    const session = this.mkSession(account.userId);
    this.current = session;
    return session;
  }

  async signOut(): Promise<void> {
    // Synchronous local invalidation — getSession immediately returns null (Req 5.4).
    this.current = null;
  }

  async getSession(): Promise<AuthSession | null> {
    return this.current;
  }
}
