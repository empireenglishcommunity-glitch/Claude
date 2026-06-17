/**
 * Unit lane — Authentication & account-bootstrap SDK (Tasks 4.1/4.2, tested in 4.3).
 *
 * Runs the `AuthApi` fully offline against the in-memory {@link InMemoryAuthPort}
 * and a real `ProfileApi` over the {@link InMemoryProfileStore}. Covers:
 *   • sign-up / sign-in (password + email OTP)               (Req 5.1)
 *   • issued JWT expiry ≤ 60 min                              (Req 5.2)
 *   • sign-out invalidation behaviour/timing                 (Req 5.4)
 *   • invalid-credential rejection (no session)              (Req 5.6)
 *   • duplicate-email rejection (no new profile)             (Req 5.7)
 *   • bootstrap-failure safe retry (no duplicate profiles)   (Req 5.8, 5.3)
 *   • the reusable `requireSession` gating guard             (Req 1.6, 5.5)
 */
import {
  AuthApi,
  DuplicateAccountError,
  InvalidCredentialsError,
  ProfileBootstrapError,
  SessionPolicyError,
} from '../../src/foundation/auth/authApi';
import {
  isSessionTtlWithinLimit,
  requireSession,
  UnauthenticatedError,
  type AuthSession,
} from '../../src/foundation/auth/sessionGuard';
import { ProfileApi, type ProfileRow } from '../../src/foundation/profile/profileApi';
import { InMemoryAuthPort } from '../helpers/inMemoryAuthPort';
import { InMemoryProfileStore } from '../helpers/inMemoryProfileStore';

const FIXED_NOW = 1_700_000_000; // Unix seconds

function makeProfiles(store: InMemoryProfileStore = new InMemoryProfileStore()): ProfileApi {
  return new ProfileApi(store, {
    now: () => new Date(FIXED_NOW * 1000).toISOString(),
    uuid: (() => {
      let n = 0;
      return () => `err-${(n += 1)}`;
    })(),
  });
}

describe('AuthApi — sign-up & account bootstrap (Req 5.1, 5.3)', () => {
  it('creates an account, issues a session, and bootstraps exactly one profile', async () => {
    const store = new InMemoryProfileStore();
    const port = new InMemoryAuthPort({ now: () => FIXED_NOW });
    const auth = new AuthApi(port, makeProfiles(store), { now: () => FIXED_NOW });

    const { userId } = await auth.signUp('new@empire.test', 'pw-correct-horse', {
      seed: { region: 'egypt', tier: 'recruit', displayName: 'Layla' },
    });

    expect(userId).toBeTruthy();
    expect(store.totalProfiles()).toBe(1);
    expect(store.profileCount(userId)).toBe(1);
    expect(await auth.getSession()).toEqual({ userId });
  });

  it('repeated bootstrap via re-auth never creates a second profile (idempotent, Req 5.3)', async () => {
    const store = new InMemoryProfileStore();
    const port = new InMemoryAuthPort({ now: () => FIXED_NOW });
    const auth = new AuthApi(port, makeProfiles(store), { now: () => FIXED_NOW });

    const { userId } = await auth.signUp('again@empire.test', 'pw-12345678');
    // Sign in again and re-run an OTP verify (which also bootstraps) — still one row.
    await auth.signIn('again@empire.test', 'pw-12345678');
    await auth.requestEmailOtp('again@empire.test');
    await auth.verifyEmailOtp('again@empire.test', '123456');

    expect(store.totalProfiles()).toBe(1);
    expect(store.profileCount(userId)).toBe(1);
  });
});

describe('AuthApi — email OTP sign-in (Req 5.1)', () => {
  it('requests and verifies an OTP, bootstrapping the profile', async () => {
    const store = new InMemoryProfileStore();
    const port = new InMemoryAuthPort({ now: () => FIXED_NOW });
    const auth = new AuthApi(port, makeProfiles(store), { now: () => FIXED_NOW });

    await auth.requestEmailOtp('otp@empire.test');
    const { userId } = await auth.verifyEmailOtp('otp@empire.test', '123456');

    expect(userId).toBeTruthy();
    expect(store.profileCount(userId)).toBe(1);
    expect(await auth.getSession()).toEqual({ userId });
  });

  it('rejects a wrong OTP with no session created (Req 5.6)', async () => {
    const port = new InMemoryAuthPort({ now: () => FIXED_NOW });
    const auth = new AuthApi(port, makeProfiles(), { now: () => FIXED_NOW });

    await auth.requestEmailOtp('otp2@empire.test');
    await expect(auth.verifyEmailOtp('otp2@empire.test', '000000')).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(await auth.getSession()).toBeNull();
  });
});

describe('AuthApi — JWT expiry ≤ 60 minutes (Req 5.2)', () => {
  it('accepts a compliant 60-minute session', async () => {
    const port = new InMemoryAuthPort({ now: () => FIXED_NOW, sessionTtlSeconds: 3600 });
    const auth = new AuthApi(port, makeProfiles(), { now: () => FIXED_NOW });
    await expect(auth.signUp('ttl-ok@empire.test', 'pw-12345678')).resolves.toBeTruthy();
  });

  it('rejects a session whose TTL exceeds 60 minutes and bootstraps no profile', async () => {
    const store = new InMemoryProfileStore();
    const port = new InMemoryAuthPort({ now: () => FIXED_NOW, sessionTtlSeconds: 7200 });
    const auth = new AuthApi(port, makeProfiles(store), { now: () => FIXED_NOW });

    await expect(auth.signUp('ttl-bad@empire.test', 'pw-12345678')).rejects.toBeInstanceOf(
      SessionPolicyError,
    );
    expect(store.totalProfiles()).toBe(0);
  });

  it('isSessionTtlWithinLimit enforces the [0, 3600] bound', () => {
    const at = (ttl: number): AuthSession => ({
      userId: 'u',
      accessToken: 't',
      issuedAt: FIXED_NOW,
      expiresAt: FIXED_NOW + ttl,
    });
    expect(isSessionTtlWithinLimit(at(3600))).toBe(true);
    expect(isSessionTtlWithinLimit(at(60))).toBe(true);
    expect(isSessionTtlWithinLimit(at(3601))).toBe(false);
    expect(isSessionTtlWithinLimit(at(0))).toBe(false); // non-positive TTL is malformed
  });
});

describe('AuthApi — sign-out invalidation (Req 5.4)', () => {
  it('invalidates the active session immediately (well within 5 seconds)', async () => {
    const port = new InMemoryAuthPort({ now: () => FIXED_NOW });
    const auth = new AuthApi(port, makeProfiles(), { now: () => FIXED_NOW });

    await auth.signUp('out@empire.test', 'pw-12345678');
    expect(await auth.getSession()).not.toBeNull();

    const start = Date.now();
    await auth.signOut();
    const elapsedMs = Date.now() - start;

    expect(elapsedMs).toBeLessThan(5000);
    expect(await auth.getSession()).toBeNull();
  });
});

describe('AuthApi — credential & duplicate rejection (Req 5.6, 5.7)', () => {
  it('rejects invalid password sign-in and creates no session (Req 5.6)', async () => {
    const port = new InMemoryAuthPort({ now: () => FIXED_NOW });
    const auth = new AuthApi(port, makeProfiles(), { now: () => FIXED_NOW });
    port.seedAccount('known@empire.test', 'right-password');

    await expect(auth.signIn('known@empire.test', 'wrong-password')).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(await auth.getSession()).toBeNull();
  });

  it('rejects duplicate-email sign-up and creates no new profile (Req 5.7)', async () => {
    const store = new InMemoryProfileStore();
    const port = new InMemoryAuthPort({ now: () => FIXED_NOW });
    const auth = new AuthApi(port, makeProfiles(store), { now: () => FIXED_NOW });
    port.seedAccount('dupe@empire.test', 'existing-pw');

    await expect(auth.signUp('dupe@empire.test', 'another-pw')).rejects.toBeInstanceOf(
      DuplicateAccountError,
    );
    expect(store.totalProfiles()).toBe(0);
  });
});

describe('AuthApi — bootstrap-failure safe retry (Req 5.8, 5.3)', () => {
  /** A store whose first insertProfile fails transiently, then succeeds. */
  class FlakyInsertStore extends InMemoryProfileStore {
    private failsLeft: number;
    constructor(failures = 1) {
      super();
      this.failsLeft = failures;
    }
    async insertProfile(row: ProfileRow): Promise<ProfileRow> {
      if (this.failsLeft > 0) {
        this.failsLeft -= 1;
        throw new Error('transient backend failure');
      }
      return super.insertProfile(row);
    }
  }

  it('surfaces a safe-retry error, and a retry creates exactly one profile', async () => {
    const store = new FlakyInsertStore(1);
    const profiles = makeProfiles(store);
    const port = new InMemoryAuthPort({ now: () => FIXED_NOW });
    const auth = new AuthApi(port, profiles, { now: () => FIXED_NOW });

    // First attempt: account is created, but bootstrap fails → safe-retry error.
    let thrown: unknown;
    try {
      await auth.signUp('retry@empire.test', 'pw-12345678');
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(ProfileBootstrapError);
    expect((thrown as ProfileBootstrapError).safeToRetry).toBe(true);
    expect(store.totalProfiles()).toBe(0);

    // Retry the idempotent bootstrap for the now-existing account — succeeds once.
    const userId = (thrown as ProfileBootstrapError).userId;
    await profiles.bootstrap(userId, { region: 'egypt' });
    await profiles.bootstrap(userId, { region: 'egypt' }); // idempotent no-op
    expect(store.totalProfiles()).toBe(1);
    expect(store.profileCount(userId)).toBe(1);
  });
});

describe('requireSession gating guard (Task 4.2 — Req 1.6, 5.5)', () => {
  const valid: AuthSession = {
    userId: 'learner-1',
    accessToken: 'tok',
    issuedAt: FIXED_NOW,
    expiresAt: FIXED_NOW + 3600,
  };

  it('returns the authenticated context for a live, valid session', () => {
    expect(requireSession(valid, FIXED_NOW)).toEqual({ userId: 'learner-1' });
  });

  it('denies a missing session with reason "missing"', () => {
    expect(() => requireSession(null, FIXED_NOW)).toThrow(UnauthenticatedError);
    try {
      requireSession(null, FIXED_NOW);
    } catch (e) {
      expect((e as UnauthenticatedError).reason).toBe('missing');
    }
  });

  it('denies an expired session with reason "expired"', () => {
    try {
      requireSession(valid, FIXED_NOW + 3601);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(UnauthenticatedError);
      expect((e as UnauthenticatedError).reason).toBe('expired');
    }
  });

  it('denies a structurally invalid session with reason "invalid"', () => {
    const broken: AuthSession = { ...valid, accessToken: '' };
    try {
      requireSession(broken, FIXED_NOW);
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as UnauthenticatedError).reason).toBe('invalid');
    }
  });

  it('AuthApi.requireActiveSession enforces gating end-to-end', async () => {
    // Session issued at 1000 with 3600 TTL; evaluate at 5000 → expired.
    const port = new InMemoryAuthPort({ now: () => 1000, sessionTtlSeconds: 3600 });
    const expiredView = new AuthApi(port, makeProfiles(), { now: () => 5000 });
    await port.seedAccount('gate@empire.test', 'pw');
    await port.signInWithPassword('gate@empire.test', 'pw');

    await expect(expiredView.requireActiveSession()).rejects.toBeInstanceOf(UnauthenticatedError);

    // A live view (now within TTL) succeeds.
    const liveView = new AuthApi(port, makeProfiles(), { now: () => 1500 });
    await expect(liveView.requireActiveSession()).resolves.toEqual({ userId: expect.any(String) });
  });
});
