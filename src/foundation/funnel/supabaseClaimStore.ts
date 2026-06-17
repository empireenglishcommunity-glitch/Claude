/**
 * Supabase SERVICE-ROLE implementation of the {@link ClaimStore} port (Task 5.2).
 *
 * The `funnel_claim` table is intentionally server/Edge-only and carries NO
 * Row-Level Security (it is keyed by an opaque token and references no
 * `auth.uid()`), so it must be reached with the Supabase SERVICE-ROLE key. That
 * key lives ONLY in Edge Function secrets (`Deno.env`) and is NEVER shipped to
 * the app or shared with the Funnel_Bot (Requirement 6.7 / design §11). For this
 * reason the service-role client is INJECTED: the `create-funnel-claim` /
 * `redeem-funnel-claim` Edge Functions construct it from `Deno.env` and pass it
 * in. The `getClient` fallback reads the service-role env vars and is meant for
 * server/Node contexts only — it is never bundled into the shipped app because
 * this module is imported lazily by server-side code paths exclusively.
 *
 * The critical correctness detail is {@link SupabaseClaimStore.markRedeemed}: it
 * is a single conditional UPDATE — `UPDATE funnel_claim SET redeemed_by = :uid
 * WHERE token = :token AND redeemed_by IS NULL RETURNING *` — so the database
 * itself guarantees at-most-once consumption even under concurrent redemptions
 * (the loser's UPDATE matches zero rows and returns `null`). This is what backs
 * design Property 7 in production.
 */
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '../backendClient';
import type { ISODateTime, Region, Tier, UUID } from '../types';
import {
  ClaimAlreadyExistsError,
  ClaimError,
  type ClaimRecord,
  type ClaimStore,
} from './funnelClaim';

/** Postgres unique-violation SQLSTATE (duplicate primary-key token). */
const PG_UNIQUE_VIOLATION = '23505';

const CLAIM_TABLE = 'funnel_claim';

/** A generic persistence failure surfaced from the backend. */
export class ClaimPersistenceError extends ClaimError {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

/** Raised when the service-role configuration is missing in a server context. */
export class ServiceRoleConfigError extends ClaimError {
  constructor(message: string) {
    super(message);
  }
}

/** The `funnel_claim` row shape (snake_case, as stored). */
interface ClaimRow {
  token: string;
  telegram_id: string;
  tier: Tier;
  region: Region;
  redeemed_by: UUID | null;
  expires_at: ISODateTime;
  created_at: ISODateTime;
}

/** Service-role env var names (Edge secrets / server env). */
export const SERVICE_ROLE_ENV_KEYS = {
  url: 'SUPABASE_URL',
  serviceRoleKey: 'SUPABASE_SERVICE_ROLE_KEY',
} as const;

/**
 * Build a SERVICE-ROLE Supabase client from server env vars. Used only as the
 * fallback for server/Node contexts when no client is injected; the Edge
 * Functions inject their own `Deno.env`-built service-role client instead.
 */
function buildServiceRoleClient(): SupabaseClient {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const url = env[SERVICE_ROLE_ENV_KEYS.url]?.trim();
  const key = env[SERVICE_ROLE_ENV_KEYS.serviceRoleKey]?.trim();
  if (!url || !key) {
    throw new ServiceRoleConfigError(
      `Missing ${SERVICE_ROLE_ENV_KEYS.url} / ${SERVICE_ROLE_ENV_KEYS.serviceRoleKey}. ` +
        'The funnel claim store requires a service-role client (Edge secrets / server env only).',
    );
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function rowToClaim(row: ClaimRow): ClaimRecord {
  return {
    token: row.token,
    telegramId: row.telegram_id,
    tier: row.tier,
    region: row.region,
    redeemedBy: row.redeemed_by,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function claimToRow(claim: ClaimRecord): ClaimRow {
  return {
    token: claim.token,
    telegram_id: claim.telegramId,
    tier: claim.tier,
    region: claim.region,
    redeemed_by: claim.redeemedBy,
    expires_at: claim.expiresAt,
    created_at: claim.createdAt,
  };
}

export class SupabaseClaimStore implements ClaimStore {
  private readonly client: SupabaseClient;

  /**
   * @param client A SERVICE-ROLE Supabase client. Edge Functions construct it
   * from `Deno.env` and pass it in; when omitted, it is built from server env
   * vars (server/Node contexts only — never the shipped app).
   */
  constructor(client: SupabaseClient = buildServiceRoleClient()) {
    this.client = client;
  }

  async insertClaim(claim: ClaimRecord): Promise<ClaimRecord> {
    const { data, error } = await this.client
      .from(CLAIM_TABLE)
      .insert(claimToRow(claim))
      .select('*')
      .single();
    if (error) {
      if (error.code === PG_UNIQUE_VIOLATION) {
        throw new ClaimAlreadyExistsError(claim.token);
      }
      throw new ClaimPersistenceError(`Failed to insert funnel claim: ${error.message}`, error);
    }
    return rowToClaim(data as ClaimRow);
  }

  async findClaim(token: string): Promise<ClaimRecord | null> {
    const { data, error } = await this.client
      .from(CLAIM_TABLE)
      .select('*')
      .eq('token', token)
      .maybeSingle();
    if (error) {
      throw new ClaimPersistenceError(`Failed to read funnel claim: ${error.message}`, error);
    }
    return data ? rowToClaim(data as ClaimRow) : null;
  }

  /**
   * Atomic single-use consumption: conditional UPDATE matching only an
   * as-yet-unredeemed row. Returns the updated claim on success, or `null` when
   * the token is unknown or was already redeemed (zero rows matched).
   */
  async markRedeemed(token: string, userId: UUID): Promise<ClaimRecord | null> {
    const { data, error } = await this.client
      .from(CLAIM_TABLE)
      .update({ redeemed_by: userId })
      .eq('token', token)
      .is('redeemed_by', null)
      .select('*')
      .maybeSingle();
    if (error) {
      throw new ClaimPersistenceError(`Failed to redeem funnel claim: ${error.message}`, error);
    }
    return data ? rowToClaim(data as ClaimRow) : null;
  }
}
