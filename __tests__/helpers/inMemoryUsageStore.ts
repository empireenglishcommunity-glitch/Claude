/**
 * In-memory {@link UsageStore} fake for deterministic, offline cost-guard tests.
 *
 * NOT a test file (no `.test.ts` suffix → ignored by Jest's `testMatch`). It
 * lets the {@link TierCostGuard} run fully offline — no live Supabase — for the
 * cost-ceiling property test (Task 8.7) and the cost-guard unit tests (Task 8.8).
 * Counters are scoped by (`userId`, `op`, `dayKey`) exactly like the Supabase
 * adapter, so the 00:00-UTC reset behaviour is faithfully reproduced.
 */
import {
  EMPTY_USAGE,
  type AiOp,
  type DailyUsage,
  type UsageStore,
} from '../../src/foundation/ai/costGuard';
import type { UUID } from '../../src/foundation/types';

function key(userId: UUID, op: AiOp, dayKey: string): string {
  return `${userId}::${op}::${dayKey}`;
}

export class InMemoryUsageStore implements UsageStore {
  private readonly buckets = new Map<string, DailyUsage>();

  async getDailyUsage(userId: UUID, op: AiOp, dayKey: string): Promise<DailyUsage> {
    const hit = this.buckets.get(key(userId, op, dayKey));
    return hit ? { ...hit } : { ...EMPTY_USAGE };
  }

  async addUsage(userId: UUID, op: AiOp, dayKey: string, units: number): Promise<DailyUsage> {
    const k = key(userId, op, dayKey);
    const current = this.buckets.get(k) ?? { ...EMPTY_USAGE };
    const next: DailyUsage = {
      operations: current.operations + 1,
      units: current.units + (Number.isFinite(units) && units > 0 ? Math.floor(units) : 0),
    };
    this.buckets.set(k, next);
    return { ...next };
  }

  /** Test introspection: operations recorded for a (user, op, day) bucket. */
  operations(userId: UUID, op: AiOp, dayKey: string): number {
    return this.buckets.get(key(userId, op, dayKey))?.operations ?? 0;
  }
}
