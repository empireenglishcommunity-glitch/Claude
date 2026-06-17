/**
 * Shared Foundation types for the Edge Functions workspace (Deno runtime).
 *
 * The AI Abstraction Layer and funnel Edge Functions (Task 5 / Task 8) import
 * their domain + contract types from HERE, which simply re-exports the single
 * source-of-truth module at `src/foundation/types/index.ts` (Task 1.2).
 *
 * Why a re-export shim:
 *   - There is ONE shared type module for the whole system; the app imports it
 *     directly while Deno imports it through this file.
 *   - Deno requires explicit file extensions on relative imports, so this file
 *     references the shared module with its `.ts` extension. The shared module
 *     is a single self-contained file (no internal relative imports), so it
 *     resolves cleanly under Deno.
 *   - These types are erased at compile time (type-only), so importing app-side
 *     source from the Deno workspace carries no runtime/React-Native coupling.
 *
 * NOTE (Task 1.2 scope): types only — no function logic. Edge Function
 * implementations are added in later P1 tasks.
 */
export type * from '../../../src/foundation/types/index.ts';
