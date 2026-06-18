/**
 * Shared AI Abstraction Layer for the Edge Functions workspace (Deno runtime).
 *
 * Mirrors the `_shared/types.ts` / `_shared/funnelClaim.ts` re-export shim
 * pattern (Task 1.1/8.x): the `ai-router` Edge Function imports the router,
 * cost guard, provider registry, cache, and reference adapters from HERE, which
 * re-exports the single source-of-truth modules under `src/foundation/ai`.
 *
 * Why a shim:
 *   - There is ONE implementation of the AI Abstraction Layer for the whole
 *     system; the app + Jest import it directly (extensionless), while Deno
 *     imports it through this file with explicit `.ts` extensions.
 *   - The Edge Function constructs the SERVICE-ROLE Supabase client from
 *     `Deno.env` itself and injects it into the usage/profile stores, so the
 *     service-role key and all provider keys never leave the Edge runtime
 *     (Req 1.5).
 *
 * NOTE: `supabase/functions` is excluded from the app's `tsc` project; this
 * workspace is type-checked/run by the Deno toolchain at deploy time.
 */
export { DefaultAiRouter, AiUnavailableError } from '../../../src/foundation/ai/aiRouter.ts';
export { TierCostGuard, AllowanceExceededError } from '../../../src/foundation/ai/costGuard.ts';
export { createReferenceRegistry } from '../../../src/foundation/ai/providerRegistry.ts';
export { InMemoryAiCache } from '../../../src/foundation/ai/aiCache.ts';
export { SupabaseUsageStore } from '../../../src/foundation/ai/supabaseUsageStore.ts';
