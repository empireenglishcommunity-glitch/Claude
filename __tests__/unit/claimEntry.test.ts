/**
 * Unit lane — funnel claim deep-link entry/handler helpers (Task 11.1).
 *
 * Covers link classification + token extraction (delegating to the pure
 * `parseClaimDeepLink`) and the §3.1 sign-up→redeem entry path wired over the
 * in-memory funnel + auth fakes, so it runs fully offline.
 *
 * _Requirements: 6.3 (and the 1.3/1.4/4.1 single-surface entry wiring)._
 */
import {
  extractClaimToken,
  isClaimLink,
  redeemClaimForUser,
  signUpAndRedeemClaim,
} from '../../src/foundation/funnel/claimEntry';
import { buildClaimDeepLink } from '../../src/foundation/funnel/funnelClaim';
import { FunnelClaimService } from '../../src/foundation/funnel/funnelClaimService';
import { AuthApi } from '../../src/foundation/auth/authApi';
import { ProfileApi } from '../../src/foundation/profile/profileApi';
import { InMemoryClaimStore } from '../helpers/inMemoryClaimStore';
import { InMemoryProfileStore } from '../helpers/inMemoryProfileStore';
import { InMemoryAuthPort } from '../helpers/inMemoryAuthPort';

const FIXED_NOW_ISO = '2026-06-17T21:00:00.000Z';
const FIXED_NOW_MS = Date.parse(FIXED_NOW_ISO);

describe('isClaimLink / extractClaimToken', () => {
  it('classifies and extracts the token from a claim deep link', () => {
    const link = buildClaimDeepLink('abc123def456abc1');
    expect(isClaimLink(link)).toBe(true);
    expect(extractClaimToken(link)).toBe('abc123def456abc1');
  });

  it('returns null for a non-claim link', () => {
    expect(isClaimLink('https://example.com/claim?token=x')).toBe(false);
    expect(extractClaimToken('https://example.com/claim?token=x')).toBeNull();
  });

  it('returns null for a claim link with no token', () => {
    expect(extractClaimToken('empireenglish://claim')).toBeNull();
  });
});

describe('signUpAndRedeemClaim / redeemClaimForUser (design §3.1)', () => {
  function wire() {
    const claims = new InMemoryClaimStore();
    const profiles = new ProfileApi(new InMemoryProfileStore(), { now: () => FIXED_NOW_ISO });
    const funnel = new FunnelClaimService(claims, profiles, { nowMs: () => FIXED_NOW_MS });
    const auth = new AuthApi(new InMemoryAuthPort({ requireConfirmation: true }), profiles, {
      claimRedeemer: funnel,
    });
    return { funnel, auth };
  }

  it('signs up then redeems, bootstrapping the carried funnel context', async () => {
    const { funnel, auth } = wire();
    const created = await funnel.createClaim({ telegramId: 'tg-7', tier: 'recruit', region: 'egypt' });

    const profile = await signUpAndRedeemClaim(auth, {
      token: created.token,
      email: 'entry@empire.test',
      password: 'pw-1234567',
    });

    expect(profile.tier).toBe('recruit');
    expect(profile.region).toBe('egypt');
    expect(profile.telegramId).toBe('tg-7');
  });

  it('redeems for an already-authenticated learner', async () => {
    const { funnel, auth } = wire();
    const created = await funnel.createClaim({ telegramId: 'tg-9', tier: 'vip', region: 'international' });
    const { userId } = await auth.signUp('already@empire.test', 'pw-1234567');

    const profile = await redeemClaimForUser(auth, created.token, userId);
    expect(profile.userId).toBe(userId);
    expect(profile.tier).toBe('vip');
  });
});
