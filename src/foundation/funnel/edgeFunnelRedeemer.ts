/**
 * Production {@link ClaimRedeemer} for the app — invokes the `redeem-funnel-claim`
 * Edge Function over HTTPS (Task 5.2 wiring).
 *
 * CRITICAL boundary (Req 6.7 / 1.5): the shipped app must NEVER construct a
 * service-role client or touch the `funnel_claim` table directly. Redemption
 * happens server-side inside the Edge Function (which holds the service-role key
 * in `Deno.env`). This redeemer is therefore a thin HTTPS caller: it forwards
 * the token + user id to the Edge Function via the backend client's
 * `functions.invoke` and returns the bootstrapped {@link LearnerProfile} the
 * function responds with.
 *
 * It maps the function's typed error payload back onto the same claim error
 * classes the in-process {@link FunnelClaimService} raises, so the SDK contract
 * is identical whether redemption runs in-process (tests) or over the Edge
 * (production) — the app code path is unchanged.
 */
import type { LearnerProfile, UUID } from '../types';
import type { SupabaseClient } from '../backendClient';
import { getBackendClient } from '../backendClient';
import {
  ClaimAlreadyRedeemedError,
  ClaimError,
  ClaimExpiredError,
  ClaimInvalidError,
  type ClaimRedeemer,
} from './funnelClaim';

/** Name of the deployed Edge Function that performs redemption. */
export const REDEEM_FUNCTION_NAME = 'redeem-funnel-claim';

/** Shape of the Edge Function's error payload (mirrors the typed claim errors). */
interface RedeemErrorPayload {
  error: 'invalid' | 'expired' | 'redeemed' | string;
  message?: string;
  expiresAt?: string;
}

/** Re-raise the Edge Function's typed error payload as the matching claim error. */
function mapErrorPayload(payload: RedeemErrorPayload): ClaimError {
  switch (payload.error) {
    case 'invalid':
      return new ClaimInvalidError(payload.message);
    case 'expired':
      return new ClaimExpiredError(payload.expiresAt ?? 'unknown');
    case 'redeemed':
      return new ClaimAlreadyRedeemedError();
    default:
      return new ClaimError(payload.message ?? 'Funnel claim redemption failed.');
  }
}

/**
 * App-side redeemer that delegates to the `redeem-funnel-claim` Edge Function.
 * Never holds a service key; the Edge Function does all privileged work.
 */
export class EdgeFunnelRedeemer implements ClaimRedeemer {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient = getBackendClient()) {
    this.client = client;
  }

  async redeem(token: string, userId: UUID): Promise<LearnerProfile> {
    const { data, error } = await this.client.functions.invoke(REDEEM_FUNCTION_NAME, {
      body: { token, userId },
    });
    if (error) {
      // Supabase wraps non-2xx responses; try to surface the typed payload.
      const payload = (error as { context?: { body?: unknown } }).context?.body;
      if (payload && typeof payload === 'object' && 'error' in (payload as object)) {
        throw mapErrorPayload(payload as RedeemErrorPayload);
      }
      throw new ClaimError(`Funnel claim redemption failed: ${error.message}`);
    }
    if (data && typeof data === 'object' && 'error' in (data as object)) {
      throw mapErrorPayload(data as RedeemErrorPayload);
    }
    return (data as { profile: LearnerProfile }).profile;
  }
}
