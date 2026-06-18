/**
 * Edge Function: `ai-router` (Deno) — Task 8.4.
 *
 * The single server-side entry point the Learner_App's `AiApi` SDK calls for
 * EVERY AI request (design §3.2, Req 8.1). It:
 *   1. derives the authenticated learner id from the caller's Supabase JWT
 *      (never trusting a user id in the body);
 *   2. constructs the SERVICE-ROLE client from `Deno.env` (provider + service
 *      keys live ONLY here — Req 1.5) and wires the AI Abstraction Layer:
 *      reference provider registry + Supabase usage store + in-memory cache +
 *      the real `ProfileApi`;
 *   3. delegates ALL logic to the provider-agnostic {@link DefaultAiRouter}
 *      (cost guard, cache, provider routing, server-side `provider` tagging,
 *      Layer 0 writes). No business logic lives here.
 *
 * Request  (POST JSON, `Authorization: Bearer <user JWT>`):
 *   { action: 'assessPronunciation' | 'generate', req: AssessRequest | GenerationRequest }
 * Response (200 JSON): the normalized router result (assessment bundle or generation result).
 * Errors map the typed errors → { error: 'unavailable' | 'allowance_exceeded', ... }.
 *
 * NOTE: `supabase/functions` is excluded from the app's tsc project; this file
 * targets the Deno runtime (deployed via `supabase functions deploy`).
 */
// @ts-nocheck — Deno runtime module; type-checked by the Deno toolchain, not app tsc.
import { createClient } from '@supabase/supabase-js';
import {
  DefaultAiRouter,
  AiUnavailableError,
  TierCostGuard,
  AllowanceExceededError,
  createReferenceRegistry,
  InMemoryAiCache,
  SupabaseUsageStore,
} from '../_shared/ai.ts';
import { ProfileApi } from '../../../src/foundation/profile/profileApi.ts';
import { SupabaseProfileStore } from '../../../src/foundation/profile/supabaseProfileStore.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Edge secret ${name} is not configured.`);
  return value;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return jsonResponse({ error: 'unauthorized', message: 'Missing bearer token.' }, 401);
  }

  let body: { action?: string; req?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }
  const { action, req: aiReq } = body;
  if (action !== 'assessPronunciation' && action !== 'generate') {
    return jsonResponse({ error: 'invalid_action', message: 'action must be assessPronunciation or generate.' }, 400);
  }
  if (!aiReq || typeof aiReq !== 'object') {
    return jsonResponse({ error: 'missing_fields', message: 'req is required.' }, 400);
  }

  const url = requireEnv('SUPABASE_URL');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  // Derive the learner id from the caller's JWT (never trust a body user id).
  const userScoped = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userScoped.auth.getUser();
  if (userErr || !userData.user) {
    return jsonResponse({ error: 'unauthorized', message: 'Invalid session token.' }, 401);
  }
  const userId = userData.user.id;

  // Privileged work uses the service-role client (Req 1.5) — never shipped to the app.
  const serviceClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const profiles = new ProfileApi(new SupabaseProfileStore(serviceClient));
  const router = new DefaultAiRouter({
    registry: createReferenceRegistry(), // reference adapters (P2 swaps in real providers)
    costGuard: new TierCostGuard(new SupabaseUsageStore(serviceClient)),
    cache: new InMemoryAiCache(),
    profiles,
  });

  try {
    const result =
      action === 'assessPronunciation'
        ? await router.assessPronunciation(userId, aiReq)
        : await router.generate(userId, aiReq);
    return jsonResponse(result);
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      return jsonResponse(
        { error: 'unavailable', engine: err.engine, reason: err.reason, message: err.message },
        503,
      );
    }
    if (err instanceof AllowanceExceededError) {
      return jsonResponse(
        { error: 'allowance_exceeded', op: err.op, tier: err.tier, allowance: err.allowance, message: err.message },
        429,
      );
    }
    return jsonResponse({ error: 'internal_error', message: (err as Error).message }, 500);
  }
});
