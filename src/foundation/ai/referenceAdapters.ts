/**
 * Reference (mock) AI provider adapters — the swappability CONTRACT (Task 8.1).
 *
 * ⚠️ NON-PRODUCTION. These two adapters implement the provider-agnostic
 * {@link SpeechEngine} / {@link LanguageEngine} interfaces (design §5.1) with
 * deterministic, offline, in-repo logic. They exist ONLY to:
 *   • prove the AI Abstraction Layer's swappability contract — that any adapter
 *     behind the interface yields a correctly-shaped NORMALIZED result so no
 *     call site changes when a real provider is registered (Property 3), and
 *   • let the whole router / cost-guard pipeline run fully offline in tests and
 *     in a local Edge Function, with zero external calls or API keys.
 *
 * They DO NOT call Azure / Speechace / OpenAI / Anthropic — concrete provider
 * wiring is explicitly deferred to Project P2 (design "Scope Guardrails").
 * Scores are derived from a stable hash of the inputs so results are
 * deterministic (the same request always yields the same result), which keeps
 * property/unit tests reproducible.
 *
 * Each adapter stamps its own `provider` field with {@link SpeechEngine.name} /
 * {@link LanguageEngine.name}; the {@link AiRouter} additionally re-stamps the
 * provider SERVER-SIDE so the tag is authoritative (Req 8.5).
 *
 * Requirements: 8.4 (swappable adapters behind one interface), 8.5 (provider tag).
 */
import type {
  AssessRequest,
  CoachingFeedback,
  FeedbackRequest,
  GenerationRequest,
  GenerationResult,
  LanguageEngine,
  PhonemeScore,
  PronunciationResult,
  SpeechEngine,
  WordScore,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// Deterministic pseudo-scoring (pure, offline)
// ═══════════════════════════════════════════════════════════════════════════

/** FNV-1a 32-bit hash — small, fast, dependency-free, deterministic. */
function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A stable score in [0,100] derived from a seed string. */
function pseudoScore(seed: string): number {
  return hashString(seed) % 101;
}

/** Split reference text into word tokens (ignoring punctuation-only tokens). */
function tokenizeWords(referenceText: string): string[] {
  return referenceText
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z']/g, ''))
    .filter((w) => w.length > 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// Reference Speech Engine
// ═══════════════════════════════════════════════════════════════════════════

/** Stable adapter name (also used as the `provider` tag). */
export const REFERENCE_SPEECH_PROVIDER = 'reference-speech-v0';

/**
 * Deterministic, offline {@link SpeechEngine} reference adapter. Produces a
 * fully-shaped {@link PronunciationResult} (overall/fluency/completeness in
 * [0,100], per-word + per-phoneme scores, `provider` tag) from a hash of the
 * request. NON-PRODUCTION — see file header.
 */
export class ReferenceSpeechEngine implements SpeechEngine {
  readonly name = REFERENCE_SPEECH_PROVIDER;

  async assess(req: AssessRequest): Promise<PronunciationResult> {
    const base = `${req.audioStoragePath}::${req.referenceText}`;
    const tokens = tokenizeWords(req.referenceText);

    const words: WordScore[] = tokens.map((word, index) => {
      const accuracy = pseudoScore(`${base}::w${index}::${word}`);
      const expected = `/${(word[0] ?? 'x').toLowerCase()}/`;
      // Below 50 → model a substitution (e.g. park→bark), else a clean match.
      const actual = accuracy < 50 ? '/b/' : null;
      const phonemes: PhonemeScore[] = [
        { phoneme: expected, accuracy, expected, actual },
      ];
      return {
        word,
        accuracy,
        stressCorrect: accuracy >= 50,
        phonemes,
      };
    });

    const overallScore =
      words.length === 0
        ? 0
        : Math.round(words.reduce((sum, w) => sum + w.accuracy, 0) / words.length);

    return {
      overallScore,
      fluency: pseudoScore(`${base}::fluency`),
      completeness: words.length === 0 ? 0 : 100,
      words,
      provider: this.name,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Reference Language Engine
// ═══════════════════════════════════════════════════════════════════════════

/** Stable adapter name (also used as the `provider` tag). */
export const REFERENCE_LANGUAGE_PROVIDER = 'reference-language-v0';

/**
 * Deterministic, offline {@link LanguageEngine} reference adapter. Produces a
 * fully-shaped {@link CoachingFeedback} / {@link GenerationResult} with a
 * `provider` tag and a non-negative integer `tokensUsed`. NON-PRODUCTION — see
 * file header.
 */
export class ReferenceLanguageEngine implements LanguageEngine {
  readonly name = REFERENCE_LANGUAGE_PROVIDER;

  async synthesizeFeedback(req: FeedbackRequest): Promise<CoachingFeedback> {
    // Bilingual (Arabic) scaffolding for L0–L1 learners (design §5.1).
    const bilingual = req.profileSnapshot.level <= 1 || req.locale === 'ar';
    const score = req.result.overallScore;
    const weakest = req.profileSnapshot.accentProfile?.weakestSound ?? null;
    return {
      summary: `Pronunciation accuracy ${score}/100. Keep practicing your target sounds.`,
      bilingual,
      mechanicsTips: weakest
        ? [`Focus on the "${weakest}" sound on your next drill.`]
        : ['Slow down slightly and exaggerate each target sound.'],
      encouragement: score >= 70 ? 'Great progress — keep it up!' : 'You are improving — one step at a time.',
      provider: this.name,
    };
  }

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    const text = `[${req.task}] ${req.prompt}`.trim();
    // A deterministic, non-negative integer token estimate (~4 chars/token).
    const tokensUsed = Math.ceil(text.length / 4);
    return {
      text,
      provider: this.name,
      tokensUsed,
    };
  }
}
