/**
 * Integration lane — Telegram funnel end-to-end (design §3.1, Task 5.4).
 *
 * Exercises the full claim handoff with the real `FunnelClaimService`,
 * `ProfileApi`, and `AuthApi` wired over IN-MEMORY fakes, so it runs fully
 * OFFLINE and deterministically (no Deno, no live Supabase):
 *
 *   createFunnelClaim → (open deep link → token) → signUp (AuthApi) →
 *   redeemFunnelClaim → profile bootstrapped carrying tier / region / Telegram id.
 *
 * The funnel sign-up path defers profile bootstrap to redemption (the account is
 * created first, then the claim completes the Layer 0 profile with the funnel
 * context), so the carried tier/region/Telegram id land on the profile exactly
 * as design §3.1 specifies. A guarded `describe.skip` documents where the
 * live-backend variant (real Edge Functions + Supabase) would run when
 * credentials are present, keeping the lane runnable offline.
 *
 * _Requirements: 6.1, 6.2, 6.3_
 */
import { FunnelClaimService } from '../../src/foundation/funnel/funnelClaimService';
import { parseClaimDeepLink, CLAIM_DEEP_LINK_SCHEME } from '../../src/foundation/funnel/funnelClaim';
import { AuthApi } from '../../src/foundation/auth/authApi';
import { ProfileApi } from '../../src/foundation/profile/profileApi';
import { InMemoryClaimStore } from '../helpers/inMemoryClaimStore';
import { InMemoryProfileStore } from '../helpers/inMemoryProfileStore';
import { InMemoryAuthPort } from '../helpers/inMemoryAuthPort';

const FIXED_NOW_ISO = '2026-06-17T21:00:00.000Z';
const FIXED_NOW_MS = Date.parse(FIXED_NOW_ISO);

function wireFunnel() {
  const claims = new InMemoryClaimStore();
  const profileStore = new InMemoryProfileStore();
  const profiles = new ProfileApi(profileStore, { now: () => FIXED_NOW_ISO });
  const service = new FunnelClaimService(claims, profiles, { nowMs: () => FIXED_NOW_MS });
  // Funnel sign-up defers bootstrap to redemption (account created first, then
  // the claim completes the profile), so signUp issues no session here.
  const authPort = new InMemoryAuthPort({ requireConfirmation: true });
  const auth = new AuthApi(authPort, profiles, { claimRedeemer: service });
  return { claims, profileStore, profiles, service, auth };
}

describe('funnel integration lane (offline, design §3.1)', () => {
  it('createFunnelClaim -> signUp -> redeemFunnelClaim bootstraps the profile with carried context', async () => {
    const { service, auth, profileStore, claims } = wireFunnel();

    // 1. Bot mints a claim carrying the funnel context (Req 6.1) + deep link (Req 6.2).
    const created = await service.createClaim({
      telegramId: 'tg-880055',
      tier: 'builder',
      region: 'egypt',
    });
    expect(created.deepLink.startsWith(`${CLAIM_DEEP_LINK_SCHEME}://`)).toBe(true);
    // The minted expiry is bounded to ≤ 900s after creation (Req 6.1).
    expect(Date.parse(created.claim.expiresAt) - FIXED_NOW_MS).toBeLessThanOrEqual(900 * 1000);

    // 2. The learner opens the deep link; the app extracts the token.
    const token = parseClaimDeepLink(created.deepLink);
    expect(token).toBe(created.token);

    // 3. The learner signs up in the app (account created; bootstrap deferred).
    const { userId } = await auth.signUp('founder@empire.test', 'super-secret-pw');
    expect(profileStore.totalProfiles()).toBe(0);

    // 4. Redeem the claim → profile bootstrapped with tier/region/Telegram id (Req 6.3).
    const profile = await auth.redeemFunnelClaim(token as string, userId);
    expect(profile.userId).toBe(userId);
    expect(profile.tier).toBe('builder');
    expect(profile.region).toBe('egypt');
    expect(profile.telegramId).toBe('tg-880055');

    // Exactly one profile row and the token consumed exactly once.
    expect(profileStore.totalProfiles()).toBe(1);
    expect(claims.redeemedBy(token as string)).toBe(userId);

    // 5. Reading the profile back reflects the carried funnel context.
    const fetched = await auth['profiles'].get(userId);
    expect(fetched.tier).toBe('builder');
    expect(fetched.region).toBe('egypt');
    expect(fetched.telegramId).toBe('tg-880055');
  });

  const hasBackendCredentials =
    !!process.env.EXPO_PUBLIC_SUPABASE_URL && !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  (hasBackendCredentials ? describe : describe.skip)(
    'live funnel via Edge Functions (guarded)',
    () => {
      it.todo('create-funnel-claim Edge Function mints a token + deep link (Req 6.1, 6.2)');
      it.todo('redeem-funnel-claim Edge Function bootstraps the profile from the JWT user (Req 6.3)');
    },
  );
});
