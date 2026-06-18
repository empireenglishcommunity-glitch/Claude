/**
 * Supabase-backed implementation of the {@link UsageStore} port (Task 8.2).
 *
 * Persists per-(learner, op, UTC-day) AI usage counters so the {@link CostGuard}
 * can enforce per-tier daily allowances across stateless Edge invocations. It
 * wraps the shared Foundation backend client (the single backend boundary, per
 * design §1) and targets an `ai_usage` table keyed by `(user_id, op, day_key)`.
 *
 * ⚠️ STUB SCOPE (P1): this adapter is the server-side persistence CONTRACT for
 * the cost guard. The `ai_usage` table migration and a concurrency-safe atomic
 * increment (a Postgres `rpc`/upsert) are finalized alongside the real provider
 * wiring in P2; here it uses a read-then-upsert that is correct for the P1
 * reference pipeline. It is constructed ONLY server-side (Edge Function with a
 * service-role client) and is never bundled into the shipped app.
 */
import type { SupabaseClient } from '../backendClient';
import { getBackendClient } from '../backendClient';
import type { UUID } from '../types';
import { EMPTY_USAGE, type AiOp, type DailyUsage, type UsageStore } from './costGuard';

const USAGE_TABLE = 'ai_usage';

/** A generic usage-store persistence failure surfaced from the backend. */
export class UsageStoreError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'UsageStoreError';
  }
}

/** The `ai_usage` row shape (snake_case, as stored). */
interface UsageRow {
  user_id: string;
  op: AiOp;
  day_key: string;
  operations: number;
  units: number;
}

export class SupabaseUsageStore implements UsageStore {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient = getBackendClient()) {
    this.client = client;
  }

  async getDailyUsage(userId: UUID, op: AiOp, dayKey: string): Promise<DailyUsage> {
    const { data, error } = await this.client
      .from(USAGE_TABLE)
      .select('operations, units')
      .eq('user_id', userId)
      .eq('op', op)
      .eq('day_key', dayKey)
      .maybeSingle();
    if (error) {
      throw new UsageStoreError(`Failed to read AI usage: ${error.message}`, error);
    }
    if (!data) return { ...EMPTY_USAGE };
    return { operations: data.operations ?? 0, units: data.units ?? 0 };
  }

  async addUsage(userId: UUID, op: AiOp, dayKey: string, units: number): Promise<DailyUsage> {
    const current = await this.getDailyUsage(userId, op, dayKey);
    const next: UsageRow = {
      user_id: userId,
      op,
      day_key: dayKey,
      operations: current.operations + 1,
      units: current.units + (Number.isFinite(units) && units > 0 ? Math.floor(units) : 0),
    };
    const { data, error } = await this.client
      .from(USAGE_TABLE)
      .upsert(next, { onConflict: 'user_id,op,day_key' })
      .select('operations, units')
      .single();
    if (error) {
      throw new UsageStoreError(`Failed to record AI usage: ${error.message}`, error);
    }
    return { operations: data.operations, units: data.units };
  }
}
