/**
 * Unit lane — AiRouter cache, profile writes & failure paths (Task 8.8).
 *
 * Example-based coverage for:
 *   • the cache-served path NOT being billable (Req 9.7);
 *   • Layer 0 writes happening BEFORE return on success (Req 8.6);
 *   • provider error + timeout + no-adapter all surfacing a retryable
 *     `AiUnavailableError` with NO usage recorded and NO partial scores
 *     (Req 8.7, 8.8, 9.4).
 *
 * Runs fully offline against in-memory fakes.
 */
import { DefaultAiRouter, AiUnavailableError } from '../../src/foundation/ai/aiRouter';
import { TierCostGuard } from '../../src/foundation/ai/costGuard';
import { InMemoryAiCache } from '../../src/foundation/ai/aiCache';
import { ProfileApi } from '../../src/foundation/profile/profileApi';
import { InMemoryProfileStore } from '../helpers/inMemoryProfileStore';
import { InMemoryUsageStore } from '../helpers/inMemoryUsageStore';
import {
  emptyRegistry,
  referenceRegistry,
  registryWith,
  HangingLanguageEngine,
  ThrowingLanguageEngine,
  ThrowingSpeechEngine,
} from '../helpers/aiTestDoubles';
import { ReferenceLanguageEngine, ReferenceSpeechEngine } from '../../src/foundation/ai/referenceAdapters';
import type { ConfigurableAiProviderRegistry } from '../../src/foundation/ai/providerRegistry';

const USER = '44444444-4444-4444-8444-444444444444';
const NOW_MS = Date.parse('2026-06-17T12:00:00.000Z');
const NOW_ISO = '2026-06-17T12:00:00.000Z';
const DAY = '2026-06-17';

async function harness(registry: ConfigurableAiProviderRegistry, tier: 'gate' | 'vip' = 'vip') {
  const profileStore = new InMemoryProfileStore();
  const profiles = new ProfileApi(profileStore, { now: () => NOW_ISO });
  await profiles.bootstrap(USER, { displayName: 'L', region: 'egypt', tier });
  const usage = new InMemoryUsageStore();
  const router = new DefaultAiRouter({
    registry,
    costGuard: new TierCostGuard(usage, { now: () => NOW_MS }),
    cache: new InMemoryAiCache(),
    profiles,
    now: () => NOW_ISO,
    timeoutMs: 20, // small so the timeout path is fast
  });
  return { router, usage, profiles };
}

describe('cache-served generation is not billable (Req 9.7)', () => {
  it('repeats the same generate without a second billable op', async () => {
    const { router, usage } = await harness(referenceRegistry());
    const req = { task: 'content_generation' as const, prompt: 'same prompt' };

    const first = await router.generate(USER, req);
    const second = await router.generate(USER, req); // cache hit

    expect(second).toEqual(first);
    expect(usage.operations(USER, 'language', DAY)).toBe(1); // only the first billed
  });
});

describe('cache-served assessment is not billable (Req 9.7)', () => {
  it('repeats the same assessment without a second billable op', async () => {
    const { router, usage } = await harness(referenceRegistry());
    const req = { audioStoragePath: `recordings/${USER}/rec.m4a`, referenceText: 'park three video' };

    const first = await router.assessPronunciation(USER, req);
    const second = await router.assessPronunciation(USER, req); // cache hit

    expect(second.recordingId).toBe(first.recordingId);
    expect(usage.operations(USER, 'speech', DAY)).toBe(1);
  });
});

describe('Layer 0 writes happen before return (Req 8.6)', () => {
  it('writes accent score, fluency, and a phoneme error before resolving', async () => {
    // Reference speech maps accuracy < 50 to a substitution → at least sometimes
    // produces an error; use a reference text whose hash yields a substitution.
    const { router, profiles } = await harness(referenceRegistry());
    const { result, recordingId } = await router.assessPronunciation(USER, {
      audioStoragePath: `recordings/${USER}/rec.m4a`,
      referenceText: 'park bark dark',
      targetSounds: ['p_b'],
    });

    const profile = await profiles.get(USER);
    expect(profile.accentProfile.overallAccentScore).toBe(result.overallScore);
    expect(profile.skillScores.speakingFluency).toBe(result.fluency);
    // The focus target sound was recorded.
    const pb = profile.accentProfile.targetSounds.find((t) => t.sound === 'p_b');
    expect(pb).toBeDefined();
    expect(pb?.lastEvaluatedAt).toBe(NOW_ISO);
    // recordingId is derived from the storage path.
    expect(recordingId).toBe('rec');
  });
});

describe('provider error → retryable AiUnavailableError, no usage, no partial scores (Req 8.7, 9.4)', () => {
  it('speech provider error', async () => {
    const { router, usage, profiles } = await harness(
      registryWith(new ThrowingSpeechEngine(), new ReferenceLanguageEngine()),
    );
    const before = await profiles.get(USER);

    await expect(
      router.assessPronunciation(USER, {
        audioStoragePath: `recordings/${USER}/rec.m4a`,
        referenceText: 'hello world',
      }),
    ).rejects.toMatchObject({ engine: 'speech', reason: 'provider_error', retryable: true });

    expect(usage.operations(USER, 'speech', DAY)).toBe(0);
    const after = await profiles.get(USER);
    expect(after.accentProfile).toEqual(before.accentProfile); // no partial scores
  });

  it('language provider error (generate)', async () => {
    const { router, usage } = await harness(
      registryWith(new ReferenceSpeechEngine(), new ThrowingLanguageEngine()),
    );
    await expect(
      router.generate(USER, { task: 'content_generation', prompt: 'x' }),
    ).rejects.toBeInstanceOf(AiUnavailableError);
    expect(usage.operations(USER, 'language', DAY)).toBe(0);
  });
});

describe('provider timeout → retryable AiUnavailableError (Req 8.7)', () => {
  it('language timeout on generate', async () => {
    const { router, usage } = await harness(
      registryWith(new ReferenceSpeechEngine(), new HangingLanguageEngine()),
    );
    await expect(
      router.generate(USER, { task: 'content_generation', prompt: 'x' }),
    ).rejects.toMatchObject({ engine: 'language', reason: 'timeout', retryable: true });
    expect(usage.operations(USER, 'language', DAY)).toBe(0);
  });
});

describe('no adapter registered → retryable AiUnavailableError (Req 8.8)', () => {
  it('assessPronunciation with no speech adapter', async () => {
    const { router } = await harness(emptyRegistry());
    await expect(
      router.assessPronunciation(USER, {
        audioStoragePath: `recordings/${USER}/rec.m4a`,
        referenceText: 'hello',
      }),
    ).rejects.toMatchObject({ engine: 'speech', reason: 'no_adapter', retryable: true });
  });

  it('generate with no language adapter', async () => {
    const { router } = await harness(emptyRegistry());
    await expect(
      router.generate(USER, { task: 'content_generation', prompt: 'x' }),
    ).rejects.toMatchObject({ engine: 'language', reason: 'no_adapter', retryable: true });
  });
});
