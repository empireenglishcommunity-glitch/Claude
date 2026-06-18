/**
 * Property 3 — Swappability / normalized shape (Project P1, Task 8.6).
 *
 * **Validates: Requirements 8.2, 8.3, 8.4**
 *
 * For ANY registered Speech/Language adapter pair, the `AiRouter` yields a
 * normalized result with the IDENTICAL set of fields and identical data types,
 * so no call site changes when a provider is swapped. The test runs the router
 * across several distinct adapter pairs (the in-repo reference pair, an
 * alternative pair, and failing/edge pairs are covered elsewhere) and random
 * requests, asserting every result conforms to the SAME normalized schema
 * (exact key set + field types), with a non-empty server-set `provider` tag.
 *
 * Library: fast-check (≥100 iterations).
 */
import fc from 'fast-check';
import { DefaultAiRouter } from '../../src/foundation/ai/aiRouter';
import { TierCostGuard } from '../../src/foundation/ai/costGuard';
import { InMemoryAiCache } from '../../src/foundation/ai/aiCache';
import { ProfileApi } from '../../src/foundation/profile/profileApi';
import { InMemoryProfileStore } from '../helpers/inMemoryProfileStore';
import { InMemoryUsageStore } from '../helpers/inMemoryUsageStore';
import {
  altRegistry,
  referenceRegistry,
  registryWith,
  AltLanguageEngine,
  AltSpeechEngine,
} from '../helpers/aiTestDoubles';
import { ReferenceLanguageEngine, ReferenceSpeechEngine } from '../../src/foundation/ai/referenceAdapters';
import type { ConfigurableAiProviderRegistry } from '../../src/foundation/ai/providerRegistry';

const RUNS = { numRuns: 120 } as const;

// ── Schema assertions (exact key set + field types) ──────────────────────────

function exactKeys(obj: unknown, keys: string[]): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const actual = Object.keys(obj as object).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((k, i) => k === expected[i]);
}

function isScore(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
}

function isPronunciationResult(r: any): boolean {
  if (!exactKeys(r, ['overallScore', 'fluency', 'completeness', 'words', 'provider'])) return false;
  if (!isScore(r.overallScore) || !isScore(r.fluency) || !isScore(r.completeness)) return false;
  if (typeof r.provider !== 'string' || r.provider.length === 0) return false;
  if (!Array.isArray(r.words)) return false;
  return r.words.every(
    (w: any) =>
      exactKeys(w, ['word', 'accuracy', 'stressCorrect', 'phonemes']) &&
      typeof w.word === 'string' &&
      isScore(w.accuracy) &&
      typeof w.stressCorrect === 'boolean' &&
      Array.isArray(w.phonemes) &&
      w.phonemes.every(
        (p: any) =>
          exactKeys(p, ['phoneme', 'accuracy', 'expected', 'actual']) &&
          typeof p.phoneme === 'string' &&
          isScore(p.accuracy) &&
          typeof p.expected === 'string' &&
          (p.actual === null || typeof p.actual === 'string'),
      ),
  );
}

function isCoachingFeedback(f: any): boolean {
  return (
    exactKeys(f, ['summary', 'bilingual', 'mechanicsTips', 'encouragement', 'provider']) &&
    typeof f.summary === 'string' &&
    typeof f.bilingual === 'boolean' &&
    Array.isArray(f.mechanicsTips) &&
    f.mechanicsTips.every((t: unknown) => typeof t === 'string') &&
    typeof f.encouragement === 'string' &&
    typeof f.provider === 'string' &&
    f.provider.length > 0
  );
}

function isGenerationResult(g: any): boolean {
  return (
    exactKeys(g, ['text', 'provider', 'tokensUsed']) &&
    typeof g.text === 'string' &&
    typeof g.provider === 'string' &&
    g.provider.length > 0 &&
    typeof g.tokensUsed === 'number' &&
    Number.isInteger(g.tokensUsed) &&
    g.tokensUsed >= 0
  );
}

// ── Harness ──────────────────────────────────────────────────────────────────

async function buildRouter(registry: ConfigurableAiProviderRegistry) {
  const profileStore = new InMemoryProfileStore();
  const profiles = new ProfileApi(profileStore, { now: () => '2026-06-17T00:00:00.000Z' });
  const userId = '22222222-2222-4222-8222-222222222222';
  await profiles.bootstrap(userId, { displayName: 'L', region: 'international', tier: 'vip' });
  const router = new DefaultAiRouter({
    registry,
    costGuard: new TierCostGuard(new InMemoryUsageStore()),
    cache: new InMemoryAiCache(),
    profiles,
    now: () => '2026-06-17T12:00:00.000Z',
  });
  return { router, userId };
}

const adapterPairs: Array<{ label: string; registry: () => ConfigurableAiProviderRegistry }> = [
  { label: 'reference', registry: referenceRegistry },
  { label: 'alt', registry: altRegistry },
  {
    label: 'mixed (reference speech + alt language)',
    registry: () => registryWith(new ReferenceSpeechEngine(), new AltLanguageEngine()),
  },
  {
    label: 'mixed (alt speech + reference language)',
    registry: () => registryWith(new AltSpeechEngine(), new ReferenceLanguageEngine()),
  },
];

const wordsArb = fc
  .array(fc.constantFrom('park', 'bird', 'three', 'people', 'video', 'thing'), {
    minLength: 1,
    maxLength: 6,
  })
  .map((ws) => ws.join(' '));

describe('Property 3: Swappability / normalized shape (Req 8.2, 8.3, 8.4)', () => {
  it.each(adapterPairs)(
    'assessPronunciation yields the identical normalized shape for the $label adapter pair',
    async ({ registry }) => {
      await fc.assert(
        fc.asyncProperty(wordsArb, async (referenceText) => {
          const { router, userId } = await buildRouter(registry());
          const { result, feedback, recordingId } = await router.assessPronunciation(userId, {
            audioStoragePath: `recordings/${userId}/rec-1.m4a`,
            referenceText,
          });
          return (
            isPronunciationResult(result) &&
            isCoachingFeedback(feedback) &&
            typeof recordingId === 'string' &&
            recordingId.length > 0
          );
        }),
        RUNS,
      );
    },
  );

  it.each(adapterPairs)(
    'generate yields the identical normalized shape for the $label adapter pair',
    async ({ registry }) => {
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1, maxLength: 40 }), async (prompt) => {
          const { router, userId } = await buildRouter(registry());
          const generated = await router.generate(userId, { task: 'content_generation', prompt });
          return isGenerationResult(generated);
        }),
        RUNS,
      );
    },
  );
});
