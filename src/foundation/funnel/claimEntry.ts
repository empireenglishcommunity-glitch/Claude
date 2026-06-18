/**
 * Funnel claim deep-link entry/handler (Task 11.1 wiring).
 *
 * Thin, provider-agnostic helpers that wire the Telegram funnel deep link
 * (`empireenglish://claim?token=...`) into the account-creation flow (design
 * §3.1). They contain NO new rule logic — token parsing is delegated to the
 * pure {@link parseClaimDeepLink} (the source of truth), and redemption is
 * delegated to {@link AuthApi.redeemFunnelClaim} (which itself routes through
 * the injected {@link ClaimRedeemer}, so the app never holds a service key —
 * Req 6.7).
 *
 * This module is the seam the app shell's claim route (`app/claim.tsx`) and the
 * {@link FoundationSdk} both build on, keeping the screen a thin shell:
 *   • {@link isClaimLink} / {@link extractClaimToken} — classify + extract the
 *     token from an inbound deep link.
 *   • {@link signUpAndRedeemClaim} — the §3.1 entry path: create the account,
 *     then redeem the claim so the profile is bootstrapped with the carried
 *     tier / region / Telegram id.
 *   • {@link redeemClaimForUser} — redeem for an already-authenticated learner.
 *
 * Requirements: 1.3, 1.4, 4.1, 6.3.
 */
import type { AuthApi } from '../auth/authApi';
import type { LearnerProfile, UUID } from '../types';
import {
  CLAIM_DEEP_LINK_HOST,
  CLAIM_DEEP_LINK_SCHEME,
  parseClaimDeepLink,
} from './funnelClaim';

/** True iff `link` is a funnel claim deep link (`empireenglish://claim...`). */
export function isClaimLink(link: string): boolean {
  return link.startsWith(`${CLAIM_DEEP_LINK_SCHEME}://${CLAIM_DEEP_LINK_HOST}`);
}

/**
 * Extract the claim token from an inbound deep link, or `null` when the link is
 * not a claim link or carries no token. Token parsing itself is delegated to
 * the pure {@link parseClaimDeepLink}.
 */
export function extractClaimToken(link: string): string | null {
  if (!isClaimLink(link)) return null;
  return parseClaimDeepLink(link);
}

/** Credentials + token needed to complete funnel entry. */
export interface FunnelEntryParams {
  token: string;
  email: string;
  password: string;
}

/**
 * The Telegram funnel entry path (design §3.1): create the account, then redeem
 * the claim so the Layer 0 profile is bootstrapped carrying the claim's tier /
 * region / Telegram id (Req 6.3). All access is through the {@link AuthApi}
 * surface — no direct external call.
 */
export async function signUpAndRedeemClaim(
  auth: AuthApi,
  params: FunnelEntryParams,
): Promise<LearnerProfile> {
  const { userId } = await auth.signUp(params.email, params.password);
  return auth.redeemFunnelClaim(params.token, userId);
}

/** Redeem a claim for an already-authenticated learner (Req 6.3). */
export async function redeemClaimForUser(
  auth: AuthApi,
  token: string,
  userId: UUID,
): Promise<LearnerProfile> {
  return auth.redeemFunnelClaim(token, userId);
}
