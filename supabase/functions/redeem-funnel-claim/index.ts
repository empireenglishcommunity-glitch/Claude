/**
 * Edge Function: `redeem-funnel-claim` (Deno) — Task 5.2.
 *
 * Thin handler the Learner_App calls (after sign-up) to redeem a funnel claim
 * token and bootstrap the learner's Layer 0 profile with the carried
 * tier/region/Telegram id (design §3.1, Req 6.3–6.6). It:
 *   1. derives the authenticated learner id from the caller's Supabase JWT
 *      (never trusting a user id in the body);
 *   2. constructs the SERVICE-ROLE client from `Deno.env` (Req 6.7) and wires
 *      the {@link SupabaseClaimStore} + the real `ProfileApi`;
 *   3. delegates ALL rules to the provider-agnostic {@link FunnelClaimService}
 *      (well-formed guard, single redemption classification, atomic CAS,
 *      idempotent bootstrap). No business logic lives here.
 *
 * Request  (POST JSON, with `Authorization: Bearer <user JWT>`): { token: string }
 * Response (200 JSON): { profile: LearnerProfile }
 * Errors map the typed claim errors → { error: 'invalid'|'expired'|'redeemed', message }.
 *
 * NOTE: `supabase/functions` is excluded from the app's tsc project; this file
 * targets the Deno runtime (deployed via `supabase functions deploy`).
 */
// @ts-nocheck — Deno runtime module; type-checked by the Deno toolchain, not app tsc.
import { createClient } from '@supabase/supabase-js';
import {
  FunnelClaimService,
  SupabaseClaimStore,
  ClaimInvalidError,
  ClaimExpiredError,
  ClaimAlreadyRedeemedError,
} from '../_shared/funnelClaim.ts';
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

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }
  const token = body.token;
  if (!token) {
    return jsonResponse({ error: 'missing_fields', message: 'token is required.' }, 400);
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

  // Privileged work uses the service-role client (Req 6.7) — never shipped to app/bot.
  const serviceClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const profiles = new ProfileApi(new SupabaseProfileStore(serviceClient));
  const service = new FunnelClaimService(new SupabaseClaimStore(serviceClient), profiles);

  try {
    const profile = await service.redeem(token, userId);
    return jsonResponse({ profile });
  } catch (err) {
    if (err instanceof ClaimInvalidError) {
      return jsonResponse({ error: 'invalid', message: err.message }, 400);
    }
    if (err instanceof ClaimExpiredError) {
      return jsonResponse({ error: 'expired', message: err.message, expiresAt: err.expiresAt }, 410);
    }
    if (err instanceof ClaimAlreadyRedeemedError) {
      return jsonResponse({ error: 'redeemed', message: err.message }, 409);
    }
    return jsonResponse({ error: 'internal_error', message: (err as Error).message }, 500);
  }
});
