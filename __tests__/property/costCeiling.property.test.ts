/**
 * Property 11 — Cost ceiling (Project P1, Task 8.7).
 *
 * **Validates: Requirements 9.1, 9.2, 9.6**
 *
 * For ANY sequence of a learner's AI requests within a single UTC day, the
 * number of BILLABLE operations never exceeds that learner's tier-configured
 * allowance, and any over-allowance request is DENIED BEFORE a provider is ever
 * called (no provider call, no usage recorded).
 *
 * The test drives `generate` (a language op) with UNIQUE prompts so every
 * request is a cache miss (hence billable), counts real provider invocations via
 * a counting adapter, and asserts: successes === min(n, allowance), billable
 * recorded === successes, and provider calls === successes (denials never reach
 * the provider).
 *
 * Library: fast-check (≥100 iterations).
 */
import fc from 'fast-check';
import { DefaultAiRouter } from '../../src/foundation/ai/aiRouter';
import {
  AllowanceExceededError,
  TIER_ALLOWANCES,
  TierCostGuard,
} from '../../src/foundation/ai/costGuard';
import { InMemoryAiCache } from '../../src/foundation/ai/aiCache';
import { ConfigurableAiProviderRegistry } from '../../src/foundation/ai/providerRegistry';
import { ReferenceSpeechEngine } from '../../src/foundation/ai/referenceAdapters';
import { ProfileApi } from '../../src/foundation/profile/profileApi';
import { InMemoryProfileStore } from '../helpers/inMemoryProfileStore';
import { InMemoryUsageStore } from '../helpers/inMemoryUsageStore';
import type {
  CoachingFeedback,
  GenerationRequest,
  GenerationResult,
  LanguageEngine,
  Tier,
} from '../../src/foundation/types';

const RUNS = { numRuns: 150 } as const;
const FIXED_NOW_MS = Date.parse('2026-06-17T12:00:00.000Z'); // one fixed UTC day
const TIERS: Tier[] = ['gate', 'recruit', 'builder', 'empire', 'vip'];

/** Counts real provider invocations so we can assert denials never reach it. */
class CountingLanguageEngine implements LanguageEngine {
  readonly name = 'counting-language';
  calls = 0;
  async synthesizeFeedback(): Promise<CoachingFeedback> {
    this.calls += 1;
    return { summary: '', bilingual: false, mechanicsTips: [], encouragement: '', provider: this.name };
  }
  async generate(req: GenerationRequest): Promise<GenerationResult> {
    this.calls += 1;
    return { text: req.prompt, provider: this.name, tokensUsed: 1 };
  }
}

async function buildHarness(tier: Tier) {
  const profileStore = new InMemoryProfileStore();
  const profiles = new ProfileApi(profileStore, { now: () => '2026-06-17T00:00:00.000Z' });
  const userId = '11111111-1111-4111-8111-111111111111';
  await profiles.bootstrap(userId, { displayName: 'L', region: 'egypt', tier });

  const language = new CountingLanguageEngine();
  const registry = new ConfigurableAiProviderRegistry(
    { speech: 'r', language: 'c' },
    { r: () => new ReferenceSpeechEngine() },
    { c: () => language },
  );
  const usage = new InMemoryUsageStore();
  const costGuard = new TierCostGuard(usage, { now: () => FIXED_NOW_MS });
  const router = new DefaultAiRouter({
    registry,
    costGuard,
    cache: new InMemoryAiCache(),
    profiles,
    now: () => new Date(FIXED_NOW_MS).toISOString(),
  });
  return { router, language, usage, userId };
}

describe('Property 11: Cost ceiling (Req 9.1, 9.2, 9.6)', () => {
  it('billable ops never exceed the tier allowance; over-allowance is denied before any provider call', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...TIERS),
        fc.integer({ min: 0, max: 25 }),
        async (tier, requestCount) => {
          const { router, language, usage, userId } = await buildHarness(tier);
          const allowance = TIER_ALLOWANCES[tier].language;

          let successes = 0;
          let denials = 0;
          for (let i = 0; i < requestCount; i += 1) {
            try {
              // Unique prompt → cache miss → billable.
              await router.generate(userId, {
                task: 'content_generation',
                prompt: `prompt-${tier}-${i}`,
              });
              successes += 1;
            } catch (err) {
              if (err instanceof AllowanceExceededError) {
                denials += 1;
              } else {
                throw err;
              }
            }
          }

          const expectedSuccesses = Math.min(requestCount, allowance);
          const billable = usage.operations(userId, 'language', '2026-06-17');

          return (
            successes === expectedSuccesses &&
            billable === successes &&
            billable <= allowance &&
            language.calls === successes && // denials never reached the provider
            denials === requestCount - expectedSuccesses
          );
        },
      ),
      RUNS,
    );
  });
});
