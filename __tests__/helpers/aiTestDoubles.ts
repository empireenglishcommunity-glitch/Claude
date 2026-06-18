/**
 * AI test doubles — adapters + registries for offline router/cost-guard tests.
 *
 * NOT a test file (no `.test.ts` suffix → ignored by Jest's `testMatch`).
 * Provides:
 *   • {@link AltSpeechEngine} / {@link AltLanguageEngine} — a SECOND valid
 *     adapter pair (different provider names + values, identical normalized
 *     shape) used to prove swappability (Property 3 / Task 8.6);
 *   • {@link ThrowingSpeechEngine} / {@link ThrowingLanguageEngine} — adapters
 *     that reject, to exercise the provider-error → `AiUnavailableError` path;
 *   • {@link HangingSpeechEngine} / {@link HangingLanguageEngine} — adapters
 *     that never resolve, to exercise the timeout path;
 *   • {@link singleSpeechRegistry} / {@link emptyRegistry} helpers to build
 *     registries with/without registered adapters (no-adapter path).
 */
import {
  ConfigurableAiProviderRegistry,
  REFERENCE_PROVIDER_KEY,
} from '../../src/foundation/ai/providerRegistry';
import {
  ReferenceLanguageEngine,
  ReferenceSpeechEngine,
} from '../../src/foundation/ai/referenceAdapters';
import type {
  AssessRequest,
  CoachingFeedback,
  FeedbackRequest,
  GenerationRequest,
  GenerationResult,
  LanguageEngine,
  PronunciationResult,
  SpeechEngine,
} from '../../src/foundation/types';

// ── A second, differently-valued (but identically-shaped) adapter pair ───────

export class AltSpeechEngine implements SpeechEngine {
  readonly name = 'alt-speech-v9';
  async assess(req: AssessRequest): Promise<PronunciationResult> {
    const words = req.referenceText
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => ({
        word,
        accuracy: 42,
        stressCorrect: true,
        phonemes: [{ phoneme: '/x/', accuracy: 42, expected: '/x/', actual: null }],
      }));
    return {
      overallScore: 42,
      fluency: 50,
      completeness: words.length ? 100 : 0,
      words,
      provider: this.name,
    };
  }
}

export class AltLanguageEngine implements LanguageEngine {
  readonly name = 'alt-language-v9';
  async synthesizeFeedback(_req: FeedbackRequest): Promise<CoachingFeedback> {
    return {
      summary: 'alt summary',
      bilingual: false,
      mechanicsTips: ['alt tip'],
      encouragement: 'alt encouragement',
      provider: this.name,
    };
  }
  async generate(req: GenerationRequest): Promise<GenerationResult> {
    return { text: `alt:${req.prompt}`, provider: this.name, tokensUsed: 7 };
  }
}

// ── Failing adapters (provider-error path) ───────────────────────────────────

export class ThrowingSpeechEngine implements SpeechEngine {
  readonly name = 'throwing-speech';
  async assess(): Promise<PronunciationResult> {
    throw new Error('speech provider exploded');
  }
}

export class ThrowingLanguageEngine implements LanguageEngine {
  readonly name = 'throwing-language';
  async synthesizeFeedback(): Promise<CoachingFeedback> {
    throw new Error('language provider exploded');
  }
  async generate(): Promise<GenerationResult> {
    throw new Error('language provider exploded');
  }
}

// ── Hanging adapters (timeout path) ──────────────────────────────────────────

export class HangingSpeechEngine implements SpeechEngine {
  readonly name = 'hanging-speech';
  assess(): Promise<PronunciationResult> {
    return new Promise<PronunciationResult>(() => {
      /* never resolves */
    });
  }
}

export class HangingLanguageEngine implements LanguageEngine {
  readonly name = 'hanging-language';
  synthesizeFeedback(): Promise<CoachingFeedback> {
    return new Promise<CoachingFeedback>(() => {});
  }
  generate(): Promise<GenerationResult> {
    return new Promise<GenerationResult>(() => {});
  }
}

// ── Registry builders ────────────────────────────────────────────────────────

/** Registry wired to the in-repo reference adapters. */
export function referenceRegistry(): ConfigurableAiProviderRegistry {
  return new ConfigurableAiProviderRegistry(
    { speech: REFERENCE_PROVIDER_KEY, language: REFERENCE_PROVIDER_KEY },
    { [REFERENCE_PROVIDER_KEY]: () => new ReferenceSpeechEngine() },
    { [REFERENCE_PROVIDER_KEY]: () => new ReferenceLanguageEngine() },
  );
}

/** Registry wired to the alternative adapter pair. */
export function altRegistry(): ConfigurableAiProviderRegistry {
  return new ConfigurableAiProviderRegistry(
    { speech: 'alt', language: 'alt' },
    { alt: () => new AltSpeechEngine() },
    { alt: () => new AltLanguageEngine() },
  );
}

/** Registry wired to arbitrary speech/language adapters. */
export function registryWith(
  speech: SpeechEngine,
  language: LanguageEngine,
): ConfigurableAiProviderRegistry {
  return new ConfigurableAiProviderRegistry(
    { speech: 'k', language: 'k' },
    { k: () => speech },
    { k: () => language },
  );
}

/** Registry with NO registered adapters (no-adapter path → AiUnavailableError). */
export function emptyRegistry(): ConfigurableAiProviderRegistry {
  return new ConfigurableAiProviderRegistry({ speech: 'none', language: 'none' }, {}, {});
}
