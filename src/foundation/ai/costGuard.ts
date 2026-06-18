/**
 * Cost Guard — per-tier daily AI allowance enforcement (Task 8.2).
 *
 * Realizes the design §5.2 {@link CostGuard}: it keeps per-evaluation AI cost
 * inside the feasibility model (Blueprint §10.5/§11.4) by capping how many
 * BILLABLE AI operations a learner may perform per day, per operation type
 * (speech vs language), according to their tier.
 *
 * Behaviour (Requirements 9.1–9.6):
 *   • `checkAllowance(userId, tier, op)` resolves the op type and verifies the
 *     learner's tier daily allowance for that op has NOT been exceeded BEFORE
 *     any provider is called; when exceeded it throws {@link AllowanceExceededError}
 *     (the router makes no provider call and records no usage — Req 9.2).
 *   • `recordUsage(userId, op, units)` records ONE billable operation (and the
 *     `units` consumed, e.g. tokens, for observability) for the current day
 *     (Req 9.3). The router calls it only AFTER a provider call SUCCEEDS, so a
 *     provider failure records no usage and preserves the remaining allowance
 *     (Req 9.4).
 *   • The accounting window is a fixed 24-hour period starting at 00:00 UTC; the
 *     UTC calendar date is the day key, so allowances reset to zero at that
 *     boundary automatically (Req 9.5).
 *
 * ── Testability decision (mirrors ProfileStore / ClaimStore) ────────────────
 * The guard depends on an injectable {@link UsageStore} (in-memory fake in
 * tests, a Supabase-backed adapter in production) and an injectable clock, so
 * the allowance arithmetic and the 00:00-UTC reset are verified fully offline
 * and deterministically (Property 11 / Task 8.7, unit Task 8.8). The allowance
 * table is also overridable for focused tests.
 */
import type { CostGuard, Tier, UUID } from '../types';

/** The two AI operation types the cost guard meters. */
export type AiOp = 'speech' | 'language';

// ═══════════════════════════════════════════════════════════════════════════
// Per-tier daily allowance table (billable operations per op type, per day)
// ═══════════════════════════════════════════════════════════════════════════

/** Daily billable-operation allowance for one tier. */
export interface TierAllowance {
  /** Max billable SPEECH (pronunciation-assessment) ops per UTC day. */
  speech: number;
  /** Max billable LANGUAGE (LLM feedback/generation) ops per UTC day. */
  language: number;
}

/**
 * Per-tier daily allowance table (Req 9.1/9.6). Higher Value-Ladder tiers get
 * larger daily AI budgets; the free `gate` tier is intentionally small to
 * protect margins. These are the P1 defaults and can be tuned without code
 * changes elsewhere (the router reads them through the guard).
 */
export const TIER_ALLOWANCES: Readonly<Record<Tier, TierAllowance>> = Object.freeze({
  gate: { speech: 3, language: 5 },
  recruit: { speech: 10, language: 20 },
  builder: { speech: 30, language: 60 },
  empire: { speech: 100, language: 200 },
  vip: { speech: 500, language: 1000 },
});

// ═══════════════════════════════════════════════════════════════════════════
// Daily accounting window — fixed 24h from 00:00 UTC (Req 9.5)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The day key for a moment in time: its UTC calendar date (`YYYY-MM-DD`).
 * Because the key changes exactly at 00:00 UTC, per-day usage counters reset at
 * that boundary with no extra bookkeeping (Req 9.5).
 */
export function utcDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

// ═══════════════════════════════════════════════════════════════════════════
// Usage store port (in-memory fake in tests; Supabase adapter in production)
// ═══════════════════════════════════════════════════════════════════════════

/** Recorded usage for one (learner, op, day) bucket. */
export interface DailyUsage {
  /** Number of billable operations recorded in the day (the allowance metric). */
  operations: number;
  /** Sum of usage units (e.g. tokens) recorded in the day (observability). */
  units: number;
}

/** Zeroed usage for a bucket with no recorded activity yet. */
export const EMPTY_USAGE: DailyUsage = Object.freeze({ operations: 0, units: 0 });

/**
 * The persistence port the cost guard depends on. Implementations MUST scope
 * counters by (`userId`, `op`, `dayKey`) so the 00:00-UTC reset is automatic.
 * `addUsage` records exactly ONE operation and adds `units`.
 */
export interface UsageStore {
  /** Current usage for the (learner, op, day) bucket; zeroed when none exists. */
  getDailyUsage(userId: UUID, op: AiOp, dayKey: string): Promise<DailyUsage>;
  /** Record one billable operation plus `units` consumed; returns the new total. */
  addUsage(userId: UUID, op: AiOp, dayKey: string, units: number): Promise<DailyUsage>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Typed error (Req 9.2)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Raised by {@link TierCostGuard.checkAllowance} when a learner's tier daily
 * allowance for an op type is exhausted. NOT retryable in the AI-unavailable
 * sense — it resets at the next 00:00-UTC boundary (the UI surfaces an
 * upgrade/"resets tomorrow" message, design §8).
 */
export class AllowanceExceededError extends Error {
  readonly retryable = false;
  constructor(
    public readonly userId: UUID,
    public readonly op: AiOp,
    public readonly tier: Tier,
    public readonly allowance: number,
  ) {
    super(
      `Daily ${op} allowance of ${allowance} exceeded for tier "${tier}". Resets at 00:00 UTC.`,
    );
    this.name = 'AllowanceExceededError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// The Cost Guard
// ═══════════════════════════════════════════════════════════════════════════

export interface TierCostGuardOptions {
  /** Override the per-tier allowance table (focused tests). */
  allowances?: Readonly<Record<Tier, TierAllowance>>;
  /** Injectable clock (Unix epoch ms) for deterministic day-key/reset tests. */
  now?: () => number;
}

/**
 * Requirement-faithful realization of the design §5.2 {@link CostGuard},
 * backed by an injectable {@link UsageStore} + clock.
 */
export class TierCostGuard implements CostGuard {
  private readonly usage: UsageStore;
  private readonly allowances: Readonly<Record<Tier, TierAllowance>>;
  private readonly now: () => number;

  constructor(usage: UsageStore, options: TierCostGuardOptions = {}) {
    this.usage = usage;
    this.allowances = options.allowances ?? TIER_ALLOWANCES;
    this.now = options.now ?? (() => Date.now());
  }

  /** The configured daily allowance for a tier + op (Req 9.1). */
  allowanceFor(tier: Tier, op: AiOp): number {
    return this.allowances[tier][op];
  }

  /**
   * Verify the learner's tier daily allowance for `op` has not been exceeded
   * (Req 9.1). Throws {@link AllowanceExceededError} when the recorded operation
   * count for today's UTC bucket has already reached the allowance — BEFORE any
   * provider is called (Req 9.2).
   */
  async checkAllowance(userId: UUID, tier: Tier, op: AiOp): Promise<void> {
    const allowance = this.allowanceFor(tier, op);
    const dayKey = utcDayKey(this.now());
    const used = await this.usage.getDailyUsage(userId, op, dayKey);
    if (used.operations >= allowance) {
      throw new AllowanceExceededError(userId, op, tier, allowance);
    }
  }

  /**
   * Record one successful billable operation and the `units` consumed for the
   * current UTC day (Req 9.3). The router calls this ONLY after a provider call
   * succeeds, so failures and cache-served requests record nothing (Req 9.4/9.7).
   */
  async recordUsage(userId: UUID, op: AiOp, units: number): Promise<void> {
    const dayKey = utcDayKey(this.now());
    const safeUnits = Number.isFinite(units) && units > 0 ? Math.floor(units) : 0;
    await this.usage.addUsage(userId, op, dayKey, safeUnits);
  }
}
