/**
 * AI provider registry — config-driven adapter selection (Task 8.1).
 *
 * Realizes the design §5.2 {@link AiProviderRegistry}: it returns the currently
 * configured Speech / Language adapter so a vendor can be swapped by CHANGING
 * CONFIG ALONE — no call site in the router or app changes (Property 3 /
 * Requirements 8.2, 8.4). The registry holds a map of named adapter factories;
 * the active config names which one to use. Registering a real provider in P2
 * is just adding a factory + flipping the config key.
 *
 * The shipped app NEVER touches this registry — it lives server-side in the
 * `ai-router` Edge Function. The app reaches AI only through the `AiApi` SDK
 * (Task 8.4), so no provider adapter or key is ever reachable from client code
 * (Property 2 / Req 1.3–1.5, 8.1).
 */
import type { AiProviderRegistry, LanguageEngine, SpeechEngine } from '../types';
import {
  ReferenceLanguageEngine,
  ReferenceSpeechEngine,
  REFERENCE_LANGUAGE_PROVIDER,
  REFERENCE_SPEECH_PROVIDER,
} from './referenceAdapters';

/** Factory producing a fresh Speech adapter instance. */
export type SpeechEngineFactory = () => SpeechEngine;
/** Factory producing a fresh Language adapter instance. */
export type LanguageEngineFactory = () => LanguageEngine;

/** Which engine a registry could not resolve. */
export type AiEngineKind = 'speech' | 'language';

/**
 * Raised when the active config names an engine that has no registered factory
 * (or no engine is configured at all). The {@link AiRouter} catches this and
 * surfaces a typed retryable `AiUnavailableError` with `reason: 'no_adapter'`
 * (Req 8.8).
 */
export class NoAdapterRegisteredError extends Error {
  constructor(
    public readonly engine: AiEngineKind,
    public readonly requested: string | undefined,
  ) {
    super(
      requested
        ? `No ${engine} adapter registered for provider "${requested}".`
        : `No ${engine} adapter is configured.`,
    );
    this.name = 'NoAdapterRegisteredError';
  }
}

/** The active provider selection (a vendor swap = changing these strings). */
export interface AiProviderConfig {
  speech: string;
  language: string;
}

/**
 * Config-driven {@link AiProviderRegistry}. Construct it with the active config
 * plus the available adapter factories keyed by provider name. `speech()` /
 * `language()` resolve the configured factory and instantiate it, throwing
 * {@link NoAdapterRegisteredError} when the configured name is unknown.
 */
export class ConfigurableAiProviderRegistry implements AiProviderRegistry {
  private readonly config: AiProviderConfig;
  private readonly speechFactories: Readonly<Record<string, SpeechEngineFactory>>;
  private readonly languageFactories: Readonly<Record<string, LanguageEngineFactory>>;

  constructor(
    config: AiProviderConfig,
    speechFactories: Record<string, SpeechEngineFactory>,
    languageFactories: Record<string, LanguageEngineFactory>,
  ) {
    this.config = config;
    this.speechFactories = { ...speechFactories };
    this.languageFactories = { ...languageFactories };
  }

  speech(): SpeechEngine {
    const factory = this.speechFactories[this.config.speech];
    if (!factory) throw new NoAdapterRegisteredError('speech', this.config.speech);
    return factory();
  }

  language(): LanguageEngine {
    const factory = this.languageFactories[this.config.language];
    if (!factory) throw new NoAdapterRegisteredError('language', this.config.language);
    return factory();
  }
}

/** Provider key for the in-repo reference/mock adapters. */
export const REFERENCE_PROVIDER_KEY = 'reference';

/**
 * Build a registry wired to the in-repo reference/mock adapters (Task 8.1).
 * This is the default used by the local `ai-router` Edge Function and tests.
 * P2 swaps in real providers by registering their factories and changing the
 * config keys — no router/app change required.
 */
export function createReferenceRegistry(): ConfigurableAiProviderRegistry {
  return new ConfigurableAiProviderRegistry(
    { speech: REFERENCE_PROVIDER_KEY, language: REFERENCE_PROVIDER_KEY },
    {
      [REFERENCE_PROVIDER_KEY]: () => new ReferenceSpeechEngine(),
    },
    {
      [REFERENCE_PROVIDER_KEY]: () => new ReferenceLanguageEngine(),
    },
  );
}

/** Re-exported for callers/tests that want to assert the reference provider tags. */
export { REFERENCE_SPEECH_PROVIDER, REFERENCE_LANGUAGE_PROVIDER };
