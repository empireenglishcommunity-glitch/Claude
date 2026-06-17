/**
 * Shared funnel-claim logic + service for the Edge Functions workspace (Deno).
 *
 * Mirrors the `_shared/types.ts` re-export shim pattern (Task 1.1/1.2): the
 * `create-funnel-claim` and `redeem-funnel-claim` Edge Functions import the
 * provider-agnostic claim rules and the {@link FunnelClaimService} from HERE,
 * which re-exports the single source-of-truth modules under `src/foundation`.
 *
 * Why a shim:
 *   - There is ONE implementation of the funnel logic for the whole system; the
 *     app + Jest import it directly (extensionless), while Deno imports it
 *     through this file with explicit `.ts` extensions (as Deno requires).
 *   - The Edge Functions construct the SERVICE-ROLE Supabase client from
 *     `Deno.env` themselves and inject it into {@link SupabaseClaimStore} +
 *     the profile store, so the service-role key never leaves the Edge runtime
 *     (Requirement 6.7).
 *
 * NOTE: `supabase/functions` is excluded from the app's `tsc` project; this
 * workspace is type-checked/run by the Deno toolchain at deploy time.
 */
export * from '../../../src/foundation/funnel/funnelClaim.ts';
export { FunnelClaimService } from '../../../src/foundation/funnel/funnelClaimService.ts';
export { SupabaseClaimStore } from '../../../src/foundation/funnel/supabaseClaimStore.ts';
