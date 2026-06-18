/**
 * AI result cache port + in-memory implementation (Task 8.3).
 *
 * The {@link AiRouter} consults a cache so reusable Language-Engine content is
 * served WITHOUT a new provider call, and a cache-served request is NOT counted
 * as a billable operation (Req 9.7). The cache is also consulted for repeated
 * assessments of the same recording+reference (a legitimate dedupe), which are
 * likewise served free.
 *
 * This module defines the provider-agnostic {@link AiCache} port plus a simple
 * in-process {@link InMemoryAiCache} used by tests and by the local `ai-router`
 * Edge Function. A production deployment can swap in a durable/shared cache
 * (e.g. a KV store) behind the same port with no router change — mirroring the
 * injectable-port pattern used across the Foundation SDKs.
 */
import type { CoachingFeedback, GenerationResult, PronunciationResult, UUID } from '../types';

/** The cached payload of a completed pronunciation assessment. */
export interface AssessmentBundle {
  result: PronunciationResult;
  feedback: CoachingFeedback;
  recordingId: UUID;
}

/**
 * Cache port. Keys are caller-built deterministic strings (the router derives
 * them from the request). All methods are async to allow durable backends.
 */
export interface AiCache {
  getGeneration(key: string): Promise<GenerationResult | null>;
  setGeneration(key: string, value: GenerationResult): Promise<void>;
  getAssessment(key: string): Promise<AssessmentBundle | null>;
  setAssessment(key: string, value: AssessmentBundle): Promise<void>;
}

/**
 * Simple in-process {@link AiCache}. Stores deep copies so cached values cannot
 * be mutated by callers after retrieval. Suitable for tests and a single Edge
 * invocation; not shared across instances.
 */
export class InMemoryAiCache implements AiCache {
  private readonly generations = new Map<string, GenerationResult>();
  private readonly assessments = new Map<string, AssessmentBundle>();

  async getGeneration(key: string): Promise<GenerationResult | null> {
    const hit = this.generations.get(key);
    return hit ? { ...hit } : null;
  }

  async setGeneration(key: string, value: GenerationResult): Promise<void> {
    this.generations.set(key, { ...value });
  }

  async getAssessment(key: string): Promise<AssessmentBundle | null> {
    const hit = this.assessments.get(key);
    return hit ? structuredCopy(hit) : null;
  }

  async setAssessment(key: string, value: AssessmentBundle): Promise<void> {
    this.assessments.set(key, structuredCopy(value));
  }
}

/** JSON-based deep copy (sufficient for our plain, serializable AI payloads). */
function structuredCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
