/**
 * Property 2 — Provider isolation (Project P1, Task 8.5).
 *
 * **Validates: Requirements 1.3, 1.4, 8.1, 8.5**
 *
 * The app path reaches AI ONLY through `AiApi` (→ the `ai-router` Edge
 * Function); no provider SDK/endpoint/key is reachable from client code; and
 * every result carries a `provider` tag SET SERVER-SIDE.
 *
 * This is asserted three ways:
 *   1. Structurally — the client SDK source (`aiApi.ts`) contains no provider
 *      SDK import, endpoint, or API key, and talks to the backend only via
 *      `functions.invoke` (Req 1.3/1.4/8.1).
 *   2. Behaviourally — `EdgeAiApi` forwards every call to the `ai-router`
 *      function and never touches Postgres/Storage or a provider directly.
 *   3. Server tag — for any request, the router (server side) returns results
 *      whose `provider` is a non-empty string it set itself (Req 8.5).
 */
import fs from 'fs';
import path from 'path';
import fc from 'fast-check';
import { EdgeAiApi, AI_ROUTER_FUNCTION_NAME } from '../../src/foundation/ai/aiApi';
import type { SupabaseClient } from '../../src/foundation/backendClient';
import { DefaultAiRouter } from '../../src/foundation/ai/aiRouter';
import { TierCostGuard } from '../../src/foundation/ai/costGuard';
import { InMemoryAiCache } from '../../src/foundation/ai/aiCache';
import { referenceRegistry } from '../helpers/aiTestDoubles';
import { ProfileApi } from '../../src/foundation/profile/profileApi';
import { InMemoryProfileStore } from '../helpers/inMemoryProfileStore';
import { InMemoryUsageStore } from '../helpers/inMemoryUsageStore';

const RUNS = { numRuns: 120 } as const;

// ── 1. Structural isolation of the client SDK source ─────────────────────────

describe('Property 2: structural provider isolation of the client AiApi (Req 1.3, 1.4, 8.1)', () => {
  const sdkPath = path.resolve(__dirname, '../../src/foundation/ai/aiApi.ts');
  const source = fs.readFileSync(sdkPath, 'utf8');
  // Strip block + line comments so doc text ("Azure/Speechace/...") isn't flagged.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('imports no AI provider SDK', () => {
    expect(code).not.toMatch(/from\s+['"][^'"]*(azure|speechace|openai|anthropic|cognitiveservices)/i);
    expect(code).not.toMatch(/require\(\s*['"][^'"]*(azure|speechace|openai|anthropic)/i);
  });

  it('contains no provider endpoint or API key reference', () => {
    expect(code).not.toMatch(/https?:\/\//i); // no hard-coded provider endpoint
    expect(code).not.toMatch(/api[_-]?key/i);
    expect(code).not.toMatch(/bearer\s+sk-/i);
  });

  it('reaches the backend only via the ai-router Edge Function', () => {
    expect(code).toMatch(/functions\.invoke/);
    expect(code).toContain('ai-router');
    // No direct Postgres/Storage access from the client AI path.
    expect(code).not.toMatch(/\.from\(/);
    expect(code).not.toMatch(/\.storage\b/);
  });
});

// ── 2. Behavioural isolation: EdgeAiApi only calls functions.invoke ──────────

interface RecordedCall {
  name: string;
  body: unknown;
}

function fakeClient(serverResult: unknown): { client: SupabaseClient; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const client = {
    functions: {
      invoke: async (name: string, opts: { body?: unknown }) => {
        calls.push({ name, body: opts?.body });
        return { data: serverResult, error: null };
      },
    },
    from() {
      throw new Error('client AI path must not touch Postgres directly');
    },
    storage: {
      from() {
        throw new Error('client AI path must not touch Storage directly');
      },
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe('Property 2: EdgeAiApi routes every request through the backend (Req 1.3, 8.1)', () => {
  it('generate forwards to the ai-router function and returns the server result', async () => {
    const serverResult = { text: 'hi', provider: 'reference-language-v0', tokensUsed: 3 };
    const { client, calls } = fakeClient(serverResult);
    const api = new EdgeAiApi(client);

    const out = await api.generate({ task: 'content_generation', prompt: 'x' });
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe(AI_ROUTER_FUNCTION_NAME);
    expect(calls[0].body).toEqual({ action: 'generate', req: { task: 'content_generation', prompt: 'x' } });
    expect(out).toEqual(serverResult);
    expect(out.provider).toBe('reference-language-v0');
  });

  it('assessPronunciation forwards to the ai-router function and returns the server result', async () => {
    const serverResult = {
      result: { overallScore: 80, fluency: 70, completeness: 100, words: [], provider: 'reference-speech-v0' },
      feedback: { summary: 's', bilingual: true, mechanicsTips: [], encouragement: 'e', provider: 'reference-language-v0' },
      recordingId: 'rec-1',
    };
    const { client, calls } = fakeClient(serverResult);
    const api = new EdgeAiApi(client);

    const out = await api.assessPronunciation({
      audioStoragePath: 'recordings/u/rec-1.m4a',
      referenceText: 'hello',
    });
    expect(calls[0].name).toBe(AI_ROUTER_FUNCTION_NAME);
    expect(out.result.provider).toBe('reference-speech-v0');
  });
});

// ── 3. Server-side provider tag for any request ──────────────────────────────

async function buildRouter() {
  const profiles = new ProfileApi(new InMemoryProfileStore(), { now: () => '2026-06-17T00:00:00.000Z' });
  const userId = '33333333-3333-4333-8333-333333333333';
  await profiles.bootstrap(userId, { displayName: 'L', region: 'egypt', tier: 'vip' });
  const router = new DefaultAiRouter({
    registry: referenceRegistry(),
    costGuard: new TierCostGuard(new InMemoryUsageStore()),
    cache: new InMemoryAiCache(),
    profiles,
    now: () => '2026-06-17T12:00:00.000Z',
  });
  return { router, userId };
}

describe('Property 2: results always carry a server-set provider tag (Req 8.5)', () => {
  it('every router result has a non-empty provider set server-side', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.array(fc.constantFrom('park', 'three', 'video', 'thing'), { minLength: 1, maxLength: 4 }),
        async (prompt, words) => {
          const { router, userId } = await buildRouter();
          const gen = await router.generate(userId, { task: 'content_generation', prompt });
          const { result, feedback } = await router.assessPronunciation(userId, {
            audioStoragePath: `recordings/${userId}/rec.m4a`,
            referenceText: words.join(' '),
          });
          return (
            typeof gen.provider === 'string' &&
            gen.provider.length > 0 &&
            result.provider.length > 0 &&
            feedback.provider.length > 0
          );
        },
      ),
      RUNS,
    );
  });
});
