/**
 * Unit lane — Cost Guard arithmetic & daily reset (Task 8.8).
 *
 * Example-based coverage for per-tier allowance arithmetic, the 00:00-UTC
 * accounting window/reset, and provider-failure-preserves-allowance behaviour.
 * Runs fully offline against the in-memory usage store fake.
 *
 * _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
 */
import {
  AllowanceExceededError,
  TIER_ALLOWANCES,
  TierCostGuard,
  utcDayKey,
} from '../../src/foundation/ai/costGuard';
import { InMemoryUsageStore } from '../helpers/inMemoryUsageStore';

const USER = '11111111-1111-4111-8111-111111111111';

describe('utcDayKey (Req 9.5)', () => {
  it('is the UTC calendar date and flips exactly at 00:00 UTC', () => {
    expect(utcDayKey(Date.parse('2026-06-17T23:59:59.999Z'))).toBe('2026-06-17');
    expect(utcDayKey(Date.parse('2026-06-18T00:00:00.000Z'))).toBe('2026-06-18');
    // Same instant just before midnight UTC stays on the prior day.
    expect(utcDayKey(Date.parse('2026-06-18T00:00:00.000Z') - 1)).toBe('2026-06-17');
  });
});

describe('per-tier allowance arithmetic (Req 9.1, 9.2, 9.3, 9.6)', () => {
  it('permits exactly the tier allowance then denies further ops', async () => {
    const usage = new InMemoryUsageStore();
    const now = () => Date.parse('2026-06-17T08:00:00.000Z');
    const guard = new TierCostGuard(usage, { now });
    const allowance = TIER_ALLOWANCES.gate.speech; // 3

    for (let i = 0; i < allowance; i += 1) {
      await guard.checkAllowance(USER, 'gate', 'speech'); // passes
      await guard.recordUsage(USER, 'speech', 1);
    }
    // The (allowance+1)-th check is denied before any provider call.
    await expect(guard.checkAllowance(USER, 'gate', 'speech')).rejects.toBeInstanceOf(
      AllowanceExceededError,
    );
    expect(usage.operations(USER, 'speech', '2026-06-17')).toBe(allowance);
  });

  it('meters speech and language allowances independently', async () => {
    const usage = new InMemoryUsageStore();
    const guard = new TierCostGuard(usage, { now: () => Date.parse('2026-06-17T08:00:00Z') });

    // Exhaust gate speech (3) but language (5) is untouched.
    for (let i = 0; i < TIER_ALLOWANCES.gate.speech; i += 1) {
      await guard.recordUsage(USER, 'speech', 1);
    }
    await expect(guard.checkAllowance(USER, 'gate', 'speech')).rejects.toBeInstanceOf(
      AllowanceExceededError,
    );
    await expect(guard.checkAllowance(USER, 'gate', 'language')).resolves.toBeUndefined();
  });

  it('records usage units for observability without affecting the op count', async () => {
    const usage = new InMemoryUsageStore();
    const guard = new TierCostGuard(usage, { now: () => Date.parse('2026-06-17T08:00:00Z') });
    await guard.recordUsage(USER, 'language', 120); // 120 tokens, 1 op
    const used = await usage.getDailyUsage(USER, 'language', '2026-06-17');
    expect(used.operations).toBe(1);
    expect(used.units).toBe(120);
  });
});

describe('00:00-UTC reset (Req 9.5)', () => {
  it('resets the allowance at the UTC day boundary', async () => {
    const usage = new InMemoryUsageStore();
    let nowMs = Date.parse('2026-06-17T23:00:00.000Z');
    const guard = new TierCostGuard(usage, { now: () => nowMs });

    // Exhaust gate speech on day 1.
    for (let i = 0; i < TIER_ALLOWANCES.gate.speech; i += 1) {
      await guard.recordUsage(USER, 'speech', 1);
    }
    await expect(guard.checkAllowance(USER, 'gate', 'speech')).rejects.toBeInstanceOf(
      AllowanceExceededError,
    );

    // Cross into the next UTC day → fresh allowance.
    nowMs = Date.parse('2026-06-18T00:00:01.000Z');
    await expect(guard.checkAllowance(USER, 'gate', 'speech')).resolves.toBeUndefined();
    expect(usage.operations(USER, 'speech', '2026-06-18')).toBe(0);
  });
});

describe('provider failure preserves allowance (Req 9.4)', () => {
  it('a checkAllowance with no subsequent recordUsage leaves the count unchanged', async () => {
    const usage = new InMemoryUsageStore();
    const guard = new TierCostGuard(usage, { now: () => Date.parse('2026-06-17T08:00:00Z') });
    await guard.checkAllowance(USER, 'recruit', 'speech');
    // Simulated provider failure → router records nothing.
    expect(usage.operations(USER, 'speech', '2026-06-17')).toBe(0);
  });
});
