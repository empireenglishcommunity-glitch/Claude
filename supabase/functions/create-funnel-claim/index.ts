/**
 * Edge Function: `create-funnel-claim` (Deno) — Task 5.1.
 *
 * Thin handler the Telegram Funnel_Bot calls to mint a single-use claim token
 * for a learner who completed discovery + payment (design §3.1, Req 6.1/6.2/6.7).
 * It constructs the SERVICE-ROLE Supabase client from `Deno.env` (the bot never
 * receives this key — Req 6.7), wires the {@link SupabaseClaimStore}, and
 * delegates ALL rules to the provider-agnostic {@link FunnelClaimService}
 * (minting bounds, deep-link building). No business logic lives here.
 *
 * Request  (POST JSON): { telegramId: string, tier: Tier, region: Region }
 * Response (200 JSON):  { token: string, deepLink: string, expiresAt: string }
 *
 * Auth: the bot authenticates to this function with a shared FUNNEL_BOT_SECRET
 * (an `Authorization: Bearer <secret>` header), kept in Edge secrets — NOT a
 * Supabase service key. This keeps the privileged service-role key server-only.
 *
 * NOTE: `supabase/functions` is excluded from the app's tsc project; this file
 * targets the Deno runtime (deployed via `supabase functions deploy`).
 */
// @ts-nocheck — Deno runtime module; type-checked by the Deno toolchain, not app tsc.
import { createClient } from '@supabase/supabase-js';
import { FunnelClaimService, SupabaseClaimStore } from '../_shared/funnelClaim.ts';
import { ProfileApi } from '../../../src/foundation/profile/profileApi.ts';
import { SupabaseProfileStore } from '../../../src/foundation/profile/supabaseProfileStore.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function serviceRoleClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) {
    throw new Error('Edge secrets SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured.');
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Validate the bot's shared-secret authorization (never a Supabase key). */
function isAuthorizedBot(req: Request): boolean {
  const expected = Deno.env.get('FUNNEL_BOT_SECRET');
  if (!expected) return false;
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${expected}`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }
  if (!isAuthorizedBot(req)) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  let payload: { telegramId?: string; tier?: string; region?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const { telegramId, tier, region } = payload;
  if (!telegramId || !tier || !region) {
    return jsonResponse({ error: 'missing_fields', message: 'telegramId, tier and region are required.' }, 400);
  }

  try {
    const client = serviceRoleClient();
    const profiles = new ProfileApi(new SupabaseProfileStore(client));
    const service = new FunnelClaimService(new SupabaseClaimStore(client), profiles);
    const created = await service.createClaim({ telegramId, tier, region });
    return jsonResponse({
      token: created.token,
      deepLink: created.deepLink,
      expiresAt: created.claim.expiresAt,
    });
  } catch (err) {
    return jsonResponse({ error: 'internal_error', message: (err as Error).message }, 500);
  }
});
