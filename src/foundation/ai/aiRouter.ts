/**
 * AI Router — the single server-side entry point for every AI request (Task 8.3).
 *
 * Realizes the design §5.2/§6 {@link AiRouter} and the §3.2 pipeline. EVERY AI
 * request in the system passes through here (Req 8.1); the shipped app reaches
 * it only via the `AiApi` SDK → `ai-router` Edge Function (Task 8.4), so no
 * provider adapter or key is ever reachable from client code (Property 2).
 *
 * The router centralizes the cross-cutting concerns that must NOT live at call
 * sites: the cost guard, result caching, provider selection via the registry,
 * server-side provider tagging, Layer 0 writes, and typed failure handling.
 *
 * `assessPronunciation(userId, req)` (design §3.2, Req 8.2/8.6):
 *   1. resolve tier → {@link CostGuard.checkAllowance}('speech') (deny before any
 *      provider call when over allowance — Req 9.1/9.2);
 *   2. cache lookup (a repeated recording+reference is served free — Req 9.7);
 *   3. resolve + call the Speech adapter (read audio is the adapter's job via the
 *      storage path); server-stamp `result.provider` (Req 8.5);
 *   4. resolve + call the Language adapter (`synthesizeFeedback`); server-stamp
 *      `feedback.provider`;
 *   5. WRITE scores + error history to Layer 0 BEFORE returning (Req 8.6);
 *   6. record usage (one billable speech op — Req 9.3) and cache the bundle;
 *   7. return `{ result, feedback, recordingId }`.
 *
 * `generate(userId, req)` (Req 8.3, 9.7):
 *   checkAllowance('language') → cache lookup (cache-served is NOT billable) →
 *   Language adapter → server-stamp provider → cache → record usage → return.
 *
 * Failure handling (Req 8.7/8.8): a provider error or timeout, OR no registered
 * adapter, surfaces a typed {@link AiUnavailableError} (engine identified,
 * `retryable = true`) WITHOUT recording usage and WITHOUT writing partial scores
 * — the originating job stays retryable.
 */
import type {
  AccentProfile,
  AssessRequest,
  CoachingFeedback,
  ErrorRecord,
  GenerationRequest,
  GenerationResult,
  ISODateTime,
  LearnerProfile,
  PronunciationResult,
  SkillScores,
  Tier,
  UUID,
} from '../types';
import { clampScore } from '../profile/validators';
import type { AiProviderRegistry, CostGuard } from '../types';
import type { AiCache } from './aiCache';
import { TierCostGuard } from './costGuard';
import { NoAdapterRegisteredError } from './providerRegistry';

// ═══════════════════════════════════════════════════════════════════════════
// Typed failure (Req 8.7, 8.8)
// ═══════════════════════════════════════════════════════════════════════════

/** Which engine failed. */
export type AiEngineKind = 'speech' | 'language';
/** Why the engine was unavailable. */
export type AiUnavailableReason = 'provider_error' | 'timeout' | 'no_adapter';

/**
 * Typed, retryable AI-unavailable error (Req 8.7/8.8). Identifies the failed
 * engine and the reason. `retryable = true` signals the originating job should
 * remain queued (the Outbox retries with back-off, design §8); no partial
 * scores or usage are recorded when this is thrown.
 */
export class AiUnavailableError extends Error {
  readonly retryable = true;
  constructor(
    public readonly engine: AiEngineKind,
    public readonly reason: AiUnavailableReason,
    public readonly cause?: unknown,
  ) {
    super(`The ${engine} engine is unavailable (${reason}).`);
    this.name = 'AiUnavailableError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Layer 0 write port (subset of ProfileApi the router needs)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The Layer 0 write surface the router depends on. The real `ProfileApi`
 * satisfies this structurally; tests inject a `ProfileApi` over an in-memory
 * store. Methods return profiles/records, which are assignable to `unknown`.
 */
export interface ProfileWriter {
  get(userId: UUID): Promise<LearnerProfile>;
  updateScores(userId: UUID, scores: Partial<SkillScores>): Promise<unknown>;
  updateAccent(userId: UUID, accent: AccentProfile): Promise<unknown>;
  appendError(userId: UUID, error: Omit<ErrorRecord, 'id'>): Promise<unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Router dependencies
// ═══════════════════════════════════════════════════════════════════════════

export interface AiRouterDeps {
  registry: AiProviderRegistry;
  costGuard: CostGuard;
  cache: AiCache;
  profiles: ProfileWriter;
  /** Resolve a learner's tier (for allowance checks). Defaults to reading the profile. */
  resolveTier?: (userId: UUID) => Promise<Tier>;
  /** Injectable wall clock for `occurredAt`/cache timing (ISO). */
  now?: () => ISODateTime;
  /** Per-provider-call timeout in ms (0 disables). Default 15000ms. */
  timeoutMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Default per-provider-call timeout (design §8 "configured request timeout"). */
export const DEFAULT_PROVIDER_TIMEOUT_MS = 15_000;

/** Extract the recording id from a `recordings/{userId}/{id}.m4a` storage path. */
export function recordingIdFromPath(storagePath: string): UUID {
  const file = storagePath.split('/').pop() ?? '';
  return file.replace(/\.[^.]+$/, '') || file || storagePath;
}

/** Stable cache key for a generation request (task + prompt + vars + maxTokens). */
export function generationCacheKey(req: GenerationRequest): string {
  return JSON.stringify({
    task: req.task,
    prompt: req.prompt,
    variables: req.variables ?? null,
    maxTokens: req.maxTokens ?? null,
  });
}

/** Stable cache key for an assessment (recording + what was asked). */
export function assessmentCacheKey(req: AssessRequest): string {
  return JSON.stringify({ path: req.audioStoragePath, ref: req.referenceText });
}

/**
 * Race a provider call against a timeout. On timeout the returned promise
 * rejects with a timeout marker the caller maps to {@link AiUnavailableError}.
 */
const TIMEOUT_MARKER = Symbol('ai-provider-timeout');

async function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) return work;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(TIMEOUT_MARKER), timeoutMs);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// The Router
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Requirement-faithful realization of the design §5.2/§6 {@link AiRouter}.
 */
export class DefaultAiRouter {
  private readonly registry: AiProviderRegistry;
  private readonly costGuard: CostGuard;
  private readonly cache: AiCache;
  private readonly profiles: ProfileWriter;
  private readonly resolveTier: (userId: UUID) => Promise<Tier>;
  private readonly now: () => ISODateTime;
  private readonly timeoutMs: number;

  constructor(deps: AiRouterDeps) {
    this.registry = deps.registry;
    this.costGuard = deps.costGuard;
    this.cache = deps.cache;
    this.profiles = deps.profiles;
    this.resolveTier =
      deps.resolveTier ?? (async (userId: UUID) => (await this.profiles.get(userId)).tier);
    this.now = deps.now ?? (() => new Date().toISOString());
    this.timeoutMs = deps.timeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS;
  }

  /**
   * Assess a recording and synthesize coaching feedback, writing the results to
   * Layer 0 before returning (design §3.2). See the file header for the ordered
   * pipeline and failure guarantees.
   */
  async assessPronunciation(
    userId: UUID,
    req: AssessRequest,
  ): Promise<{ result: PronunciationResult; feedback: CoachingFeedback; recordingId: UUID }> {
    // 1. Cost guard — deny BEFORE any provider call (Req 9.1/9.2).
    const tier = await this.resolveTier(userId);
    await this.costGuard.checkAllowance(userId, tier, 'speech');

    // 2. Cache lookup — a repeated recording+reference is served free (Req 9.7).
    const cacheKey = assessmentCacheKey(req);
    const cached = await this.cache.getAssessment(cacheKey);
    if (cached) return cached;

    // 3. Speech adapter (read-audio is the adapter's job via the storage path).
    const speech = this.resolveSpeech();
    const result = await this.callProvider('speech', () => speech.assess(req));
    result.provider = speech.name; // server-side authoritative tag (Req 8.5)

    // 4. Language adapter — coaching feedback.
    const profile = await this.profiles.get(userId);
    const language = this.resolveLanguage();
    const feedback = await this.callProvider('language', () =>
      language.synthesizeFeedback({
        result,
        profileSnapshot: {
          level: profile.level,
          uiLocale: profile.uiLocale,
          accentProfile: profile.accentProfile,
        },
        locale: profile.uiLocale,
      }),
    );
    feedback.provider = language.name; // server-side authoritative tag (Req 8.5)

    const recordingId = recordingIdFromPath(req.audioStoragePath);

    // 5. WRITE scores + error history to Layer 0 BEFORE returning (Req 8.6).
    await this.writeAssessmentToProfile(userId, profile, req, result, recordingId);

    // 6. Record one billable speech op (Req 9.3) and cache the bundle.
    await this.costGuard.recordUsage(userId, 'speech', 1);
    const bundle = { result, feedback, recordingId };
    await this.cache.setAssessment(cacheKey, bundle);

    // 7. Return the normalized bundle.
    return bundle;
  }

  /**
   * Run a Language-Engine generation. Cache-served content is returned WITHOUT
   * a provider call and is NOT billable (Req 9.7); a fresh generation records
   * one billable language op (Req 9.3).
   */
  async generate(userId: UUID, req: GenerationRequest): Promise<GenerationResult> {
    // 1. Cost guard — deny BEFORE any provider call (Req 9.1/9.2).
    const tier = await this.resolveTier(userId);
    await this.costGuard.checkAllowance(userId, tier, 'language');

    // 2. Cache lookup — cache-served content is NOT billable (Req 9.7).
    const cacheKey = generationCacheKey(req);
    const cached = await this.cache.getGeneration(cacheKey);
    if (cached) return cached;

    // 3. Language adapter.
    const language = this.resolveLanguage();
    const generated = await this.callProvider('language', () => language.generate(req));
    generated.provider = language.name; // server-side authoritative tag (Req 8.5)

    // 4. Cache + record one billable language op (units = tokens for accounting).
    await this.cache.setGeneration(cacheKey, generated);
    await this.costGuard.recordUsage(userId, 'language', generated.tokensUsed);

    return generated;
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private resolveSpeech() {
    try {
      return this.registry.speech();
    } catch (err) {
      if (err instanceof NoAdapterRegisteredError) {
        throw new AiUnavailableError('speech', 'no_adapter', err);
      }
      throw err;
    }
  }

  private resolveLanguage() {
    try {
      return this.registry.language();
    } catch (err) {
      if (err instanceof NoAdapterRegisteredError) {
        throw new AiUnavailableError('language', 'no_adapter', err);
      }
      throw err;
    }
  }

  /** Call a provider with the configured timeout, mapping failures to AiUnavailable. */
  private async callProvider<T>(engine: AiEngineKind, work: () => Promise<T>): Promise<T> {
    try {
      return await withTimeout(work(), this.timeoutMs);
    } catch (err) {
      if (err === TIMEOUT_MARKER) {
        throw new AiUnavailableError(engine, 'timeout');
      }
      throw new AiUnavailableError(engine, 'provider_error', err);
    }
  }

  /**
   * Persist the assessment to Layer 0 (Req 8.6): the overall accent score, the
   * per-target-sound scores for the drill's focus sounds, the speaking-fluency
   * skill score, and an error record for each detected phoneme substitution.
   * Runs only after BOTH providers succeed, so a provider failure leaves no
   * partial scores (Req 8.7).
   */
  private async writeAssessmentToProfile(
    userId: UUID,
    profile: LearnerProfile,
    req: AssessRequest,
    result: PronunciationResult,
    recordingId: UUID,
  ): Promise<void> {
    const at = this.now();

    // Accent profile: overall score + update the focus target sounds.
    const focus = req.targetSounds ?? [];
    const existing = profile.accentProfile;
    const bySound = new Map(existing.targetSounds.map((t) => [t.sound, t]));
    for (const sound of focus) {
      const prior = bySound.get(sound);
      bySound.set(sound, {
        sound,
        score: clampScore(result.overallScore),
        attempts: (prior?.attempts ?? 0) + 1,
        lastEvaluatedAt: at,
      });
    }
    const nextAccent: AccentProfile = {
      ...existing,
      overallAccentScore: clampScore(result.overallScore),
      targetSounds: Array.from(bySound.values()),
    };
    await this.profiles.updateAccent(userId, nextAccent);

    // Skill scores: reflect the fluency reading.
    await this.profiles.updateScores(userId, { speakingFluency: clampScore(result.fluency) });

    // Error history: one record per detected phoneme substitution.
    for (const word of result.words) {
      for (const ph of word.phonemes) {
        if (ph.actual !== null && ph.actual !== ph.expected) {
          await this.profiles.appendError(userId, {
            category: 'phoneme',
            detail: `${word.word}: expected ${ph.expected}, heard ${ph.actual}`,
            relatedSound: focus[0] ?? null,
            occurredAt: at,
            recordingId,
            resolved: false,
          });
        }
      }
    }
  }
}

/**
 * Construct the production-style router wired to the reference registry, the
 * Supabase usage store, an in-memory cache, and the real `ProfileApi`. The
 * concrete provider wiring (Azure/Speechace/OpenAI/Anthropic) is deferred to P2;
 * here the reference adapters provide the swappability contract. Imported lazily
 * so tests that inject fakes never pull in the backend client.
 */
export async function createReferenceAiRouter(
  options: { now?: () => ISODateTime; timeoutMs?: number } = {},
): Promise<DefaultAiRouter> {
  const [{ createReferenceRegistry }, { SupabaseUsageStore }, { InMemoryAiCache }, { createProfileApi }] =
    await Promise.all([
      import('./providerRegistry'),
      import('./supabaseUsageStore'),
      import('./aiCache'),
      import('../profile/profileApi'),
    ]);
  const profiles = await createProfileApi();
  return new DefaultAiRouter({
    registry: createReferenceRegistry(),
    costGuard: new TierCostGuard(new SupabaseUsageStore()),
    cache: new InMemoryAiCache(),
    profiles,
    now: options.now,
    timeoutMs: options.timeoutMs,
  });
}
