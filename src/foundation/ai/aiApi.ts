/**
 * Client AI SDK — `EdgeAiApi` (Task 8.4). Routes ONLY through the backend.
 *
 * Realizes the design §6 {@link AiApi} contract for the app. CRITICAL boundary
 * (Property 2 / Req 1.3–1.5, 8.1): the shipped app must NEVER import a provider
 * SDK, call a provider endpoint, or hold an API key. ALL AI work happens
 * server-side inside the `ai-router` Edge Function (which holds provider keys in
 * `Deno.env`). This SDK is therefore a thin HTTPS caller — exactly mirroring
 * {@link EdgeFunnelRedeemer}: it forwards the request to the Edge Function via
 * the shared backend client's `functions.invoke` and returns the normalized,
 * server-tagged result.
 *
 * The only modules imported here are the shared backend client, the shared
 * domain TYPES, and the typed error classes (pure JS — no provider coupling).
 * The router/registry/adapters are NOT imported, so no provider code is
 * reachable from this client path.
 */
import type {
  AiApi,
  AssessRequest,
  CoachingFeedback,
  GenerationRequest,
  GenerationResult,
  PronunciationResult,
  UUID,
} from '../types';
import type { SupabaseClient } from '../backendClient';
import { getBackendClient } from '../backendClient';
import { AiUnavailableError } from './aiRouter';
import { AllowanceExceededError } from './costGuard';

/** Name of the deployed Edge Function hosting the AI Abstraction Layer router. */
export const AI_ROUTER_FUNCTION_NAME = 'ai-router';

/** Error payload shape returned by the Edge Function (mirrors the typed errors). */
interface AiErrorPayload {
  error: 'unavailable' | 'allowance_exceeded' | string;
  message?: string;
  engine?: 'speech' | 'language';
  reason?: 'provider_error' | 'timeout' | 'no_adapter';
  op?: 'speech' | 'language';
  tier?: string;
  allowance?: number;
}

/** Re-raise the Edge Function's typed error payload as the matching error class. */
function mapErrorPayload(payload: AiErrorPayload): Error {
  switch (payload.error) {
    case 'unavailable':
      return new AiUnavailableError(
        payload.engine ?? 'language',
        payload.reason ?? 'provider_error',
      );
    case 'allowance_exceeded':
      return new AllowanceExceededError(
        '',
        payload.op ?? 'language',
        (payload.tier as never) ?? 'gate',
        payload.allowance ?? 0,
      );
    default:
      return new Error(payload.message ?? 'AI request failed.');
  }
}

function isErrorPayload(value: unknown): value is AiErrorPayload {
  return !!value && typeof value === 'object' && 'error' in (value as object);
}

/**
 * App-side AI SDK that delegates every call to the `ai-router` Edge Function.
 * Never holds a provider key; the Edge Function does all privileged work and
 * sets the `provider` tag server-side.
 */
export class EdgeAiApi implements AiApi {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient = getBackendClient()) {
    this.client = client;
  }

  async assessPronunciation(req: AssessRequest): Promise<{
    result: PronunciationResult;
    feedback: CoachingFeedback;
    recordingId: UUID;
  }> {
    return this.invoke('assessPronunciation', req) as Promise<{
      result: PronunciationResult;
      feedback: CoachingFeedback;
      recordingId: UUID;
    }>;
  }

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    return this.invoke('generate', req) as Promise<GenerationResult>;
  }

  /** Forward an action + request to the Edge Function and unwrap the response. */
  private async invoke(action: 'assessPronunciation' | 'generate', req: unknown): Promise<unknown> {
    const { data, error } = await this.client.functions.invoke(AI_ROUTER_FUNCTION_NAME, {
      body: { action, req },
    });
    if (error) {
      const payload = (error as { context?: { body?: unknown } }).context?.body;
      if (isErrorPayload(payload)) throw mapErrorPayload(payload);
      throw new Error(`AI request failed: ${error.message}`);
    }
    if (isErrorPayload(data)) throw mapErrorPayload(data);
    return data;
  }
}
