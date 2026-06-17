/**
 * Foundation shared domain types (Layer 0 + AI Abstraction Layer contracts).
 *
 * This is the SINGLE shared type module for Empire English Project P1. It is the
 * source-of-truth set of TypeScript contracts consumed by BOTH:
 *   - the Learner App (React Native + Expo) — imported as
 *     `import type { LearnerProfile } from "@src/foundation/types"`, and
 *   - the Supabase Edge Functions workspace (Deno) — re-exported by
 *     `supabase/functions/_shared/types.ts` (which imports this file with an
 *     explicit `.ts` extension, as Deno requires).
 *
 * It is intentionally kept as a single, self-contained file (no internal
 * relative imports) so the exact same module resolves cleanly under both the
 * React Native/TypeScript toolchain and the Deno runtime.
 *
 * Scope (Task 1.2): TYPES AND INTERFACES ONLY. There is deliberately no runtime
 * logic here — no SDK method implementations, no validators, no schema, no
 * lookup tables. Implementations arrive in later P1 tasks (validators in 2.2/2.3,
 * the SDKs in 3–10, the router/cost-guard/adapters in 8).
 *
 * Design references are cited per section:
 *   - §4.1  Unified Learner Profile (Layer 0) domain model
 *   - §5.1  Provider-agnostic Speech/Language engine contracts
 *   - §5.2  Provider registry, cost guard, AI router
 *   - §6    Foundation Client SDK & API signatures
 *
 * Requirements traceability: 3.2 (profile fields), 4.1 (Profile_Api surface),
 * 8.2 / 8.3 (normalized Speech/Language result shapes).
 */

// ═══════════════════════════════════════════════════════════════════════════
// Shared scalar aliases
// ═══════════════════════════════════════════════════════════════════════════

/** A v4-style UUID string (e.g. a Supabase auth user id). Design §4.1. */
export type UUID = string;

/** An ISO-8601 date-time string, e.g. "2026-06-17T21:00:00Z". Design §4.1. */
export type ISODateTime = string;

/**
 * A score value. By invariant (Requirements 3.4 / 3.7 and design Property 4)
 * every score-bearing field below MUST lie in the inclusive range [0, 100].
 * Kept as a `number` alias (the type system cannot express the range); the
 * [0,100] bound is enforced at write time by the validators in Task 2.2.
 */
export type Score = number; // 0–100 inclusive

// ═══════════════════════════════════════════════════════════════════════════
// §4.1 — Layer 0: Unified Learner Profile (domain model)
// The single source of truth. All personalization flows from this.
// ═══════════════════════════════════════════════════════════════════════════

/** Blueprint §2.1 — 4 levels (0–3), each with 3 sub-levels. Design §4.1. */
export type Level = 0 | 1 | 2 | 3;

/**
 * Sub-level as an INTEGER in [1, 12] (Requirements 3.3 / 3.8, design Property 5).
 *
 * Reconciliation note: design §4.1 originally modelled sub-levels as a string
 * union ("0.1".."L3.Platinum"). The REQUIREMENTS are authoritative and define
 * `sub_level` as an integer 1–12, so this type uses integers. The original
 * human-readable labels map to integers as follows (see {@link SubLevelLabel}):
 *
 *   1 → "0.1"          5 → "1.2"          9  → "2.3"
 *   2 → "0.2"          6 → "1.3"          10 → "L3.Silver"
 *   3 → "0.3"          7 → "2.1"          11 → "L3.Gold"
 *   4 → "1.1"          8 → "2.2"          12 → "L3.Platinum"
 */
export type SubLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/**
 * Human-readable sub-level labels (reference only). The persisted/transported
 * value on {@link LearnerProfile} is the integer {@link SubLevel}; these labels
 * document the 12-step ladder and the integer mapping above. Provided as a type
 * (not a runtime table) to keep this module logic-free.
 */
export type SubLevelLabel =
  | '0.1' | '0.2' | '0.3' // integers 1–3
  | '1.1' | '1.2' | '1.3' // integers 4–6
  | '2.1' | '2.2' | '2.3' // integers 7–9
  | 'L3.Silver' | 'L3.Gold' | 'L3.Platinum'; // integers 10–12

/** Value Ladder roles (Blueprint §10.1). Governs AI allowances. Design §4.1. */
export type Tier = 'gate' | 'recruit' | 'builder' | 'empire' | 'vip';

/** Two price-books run simultaneously, detected by region (Blueprint §10.5). */
export type Region = 'egypt' | 'international';

/** Arabic dialect tendency — drives dialect-aware /θ/–/ð/ coaching (Refinement #6). */
export type DialectTendency =
  | 'msa'
  | 'egyptian'
  | 'levantine'
  | 'gulf'
  | 'maghrebi'
  | 'unknown';

/** UI language preference — Arabic-first for L0–L1, English-toggle as they climb (Refinement #1). */
export type UiLocale = 'ar' | 'en';

/** Target sounds for the Arabic-L1 accent track (Blueprint §2.2 / §5). Design §4.1. */
export type TargetSound =
  | 'p_b' | 'v_f' | 'ng' | 'th_voiceless' | 'th_voiced' // L0
  | 'ih_iy' | 'ae_uh' | 'uh_uw' | 'word_stress' // L1
  | 'clusters' | 'linking' | 'schwa' // L2
  | 'flap_t' | 'dark_l' | 'intonation' | 'stress_timing'; // L3

/** Per-target-sound accent mastery. Seeded by placement (P4), updated each evaluation. Design §4.1. */
export interface AccentSoundScore {
  sound: TargetSound;
  score: Score; // 0–100
  attempts: number;
  lastEvaluatedAt: ISODateTime | null;
}

/** The learner's personal accent plan + always-visible Accent Score (Blueprint §5.5). Design §4.1. */
export interface AccentProfile {
  overallAccentScore: Score; // 0–100
  dialectTendency: DialectTendency;
  targetSounds: AccentSoundScore[]; // personal target-sound hit list
  weakestSound: TargetSound | null; // tomorrow's drill auto-targets this
  wordStress: Score; // 0–100
  linking: Score; // 0–100
  rhythm: Score; // 0–100
  intonation: Score; // 0–100
}

/** Per-skill scores feeding the dashboard radar + WPS (Blueprint §8). Design §4.1. */
export interface SkillScores {
  speakingFluency: Score; // 0–100
  listening: Score; // 0–100
  vocabulary: Score; // 0–100
  grammar: Score; // 0–100
  writing: Score; // 0–100
}

/** One logged error → builds the personal Error Log / cheat sheets (Blueprint §6). Design §4.1. */
export interface ErrorRecord {
  id: UUID;
  category: 'phoneme' | 'stress' | 'grammar' | 'vocabulary' | 'fluency';
  detail: string; // e.g. "park→bark (/p/ devoiced to /b/)"
  relatedSound: TargetSound | null;
  occurredAt: ISODateTime;
  recordingId: UUID | null; // link to the audio that produced it
  resolved: boolean;
}

/** Streak — rewards the Core path; Ramadan-flexible (Blueprint §4.2 / Refinement #5). Design §4.1. */
export interface StreakState {
  current: number;
  longest: number;
  lastCoreDayAt: ISODateTime | null;
  ramadanMode: boolean; // fasting learners aren't penalized
}

/** Reference to a stored recording (audio archive + before/after replay). Design §4.1. */
export interface RecordingRef {
  id: UUID;
  storagePath: string; // recordings/{userId}/{id}.m4a
  kind: 'baseline' | 'placement' | 'drill' | 'mission' | 'assessment' | 'milestone';
  referenceText: string | null;
  durationMs: number;
  byteSize: number;
  createdAt: ISODateTime;
  accentScoreAtTime: Score | null; // enables Day-1 vs today before/after replay (0–100)
}

/** THE single source of truth — one row per learner. Design §4.1, Requirement 3.2. */
export interface LearnerProfile {
  userId: UUID; // = Supabase auth user id
  // identity & onboarding
  displayName: string;
  uiLocale: UiLocale;
  region: Region;
  tier: Tier;
  telegramId: string | null; // set when arriving via the funnel
  createdAt: ISODateTime;
  // progression
  level: Level;
  subLevel: SubLevel; // integer 1–12 (see SubLevel / SubLevelLabel mapping)
  placementCompleted: boolean;
  // performance
  skillScores: SkillScores;
  accentProfile: AccentProfile;
  errorHistory: ErrorRecord[];
  streak: StreakState;
  // audio
  recordings: RecordingRef[];
}

// ═══════════════════════════════════════════════════════════════════════════
// §5.1 — AI Abstraction Layer: provider-agnostic engine contracts
// Every AI call routes through these. The app depends on the interface, never
// on a provider. Implementations (adapters) arrive in Task 8 / P2.
// ═══════════════════════════════════════════════════════════════════════════

/** Normalized, provider-independent pronunciation result (Blueprint §5.3 / §11.1). Design §5.1. */
export interface PhonemeScore {
  phoneme: string; // IPA, e.g. "/p/"
  accuracy: Score; // 0–100
  expected: string; // expected phoneme
  actual: string | null; // detected substitution, e.g. "/b/" for park→bark
}

/** Per-word pronunciation score. Design §5.1. */
export interface WordScore {
  word: string;
  accuracy: Score; // 0–100
  stressCorrect: boolean; // word-stress placement
  phonemes: PhonemeScore[];
}

/** Normalized pronunciation result returned by any Speech_Engine adapter. Design §5.1, Requirement 8.2. */
export interface PronunciationResult {
  overallScore: Score; // 0–100 (the Accent Score input)
  fluency: Score; // 0–100
  completeness: Score; // 0–100 (how much of referenceText was spoken)
  words: WordScore[];
  provider: string; // which adapter produced this (audit/observability), set server-side
}

/** Request to assess a recording against reference text. Design §5.1. */
export interface AssessRequest {
  audioStoragePath: string; // recordings/{userId}/{id}.m4a
  referenceText: string; // what they were asked to say
  targetSounds?: TargetSound[]; // focus sounds for this drill
  locale?: 'en-US';
}

/**
 * SPEECH ENGINE INTERFACE — audio in → per-phoneme/stress/fluency/score out.
 * Implemented by: AzurePronunciationAdapter (primary), SpeechaceAdapter (alternative).
 * Design §5.1.
 */
export interface SpeechEngine {
  readonly name: string;
  assess(req: AssessRequest): Promise<PronunciationResult>;
}

/** Warm, Arabic-aware coaching feedback returned by the Language_Engine. Design §5.1. */
export interface CoachingFeedback {
  summary: string; // warm, Arabic-aware coaching
  bilingual: boolean; // true for L0–L1 (Arabic clarifications), false L2+
  mechanicsTips: string[]; // how to fix the weakest sound
  encouragement: string;
  provider: string; // set server-side
}

/** Request to synthesize coaching feedback from a pronunciation result. Design §5.1. */
export interface FeedbackRequest {
  result: PronunciationResult;
  profileSnapshot: Pick<LearnerProfile, 'level' | 'uiLocale' | 'accentProfile'>;
  locale: UiLocale; // controls bilingual scaffolding
}

/** Generic LLM generation request, filled from the Prompt Library (Blueprint §11.6). Design §5.1. */
export interface GenerationRequest {
  task: 'writing_correction' | 'content_generation' | 'feedback_synthesis' | 'conversation';
  prompt: string; // filled from the Prompt Library
  variables?: Record<string, string | number>;
  maxTokens?: number;
}

/** Normalized generation result returned by any Language_Engine adapter. Design §5.1, Requirement 8.3. */
export interface GenerationResult {
  text: string;
  provider: string; // set server-side
  tokensUsed: number; // for cost accounting (non-negative integer)
}

/**
 * LANGUAGE ENGINE INTERFACE — LLM for feedback synthesis, content, writing correction.
 * Implemented by: OpenAiAdapter, AnthropicAdapter (swappable).
 * Design §5.1.
 */
export interface LanguageEngine {
  readonly name: string;
  synthesizeFeedback(req: FeedbackRequest): Promise<CoachingFeedback>;
  generate(req: GenerationRequest): Promise<GenerationResult>;
}

// ═══════════════════════════════════════════════════════════════════════════
// §5.2 — Provider registry, cost guard & AI router
// ═══════════════════════════════════════════════════════════════════════════

/** Registry lets us swap providers via config — no app/code change at call sites. Design §5.2. */
export interface AiProviderRegistry {
  speech(): SpeechEngine; // returns the currently configured Speech adapter
  language(): LanguageEngine; // returns the currently configured Language adapter
}

/** Per-tier limits keep per-evaluation cost inside the feasibility model (Blueprint §10.5, §11.4). Design §5.2. */
export interface CostGuard {
  /** Throws/denies when a tier's daily AI allowance is exceeded. */
  checkAllowance(userId: UUID, tier: Tier, op: 'speech' | 'language'): Promise<void>;
  recordUsage(userId: UUID, op: 'speech' | 'language', units: number): Promise<void>;
}

/** The single entry point the app calls. Handles cost guard, cache, provider routing, profile writes. Design §5.2. */
export interface AiRouter {
  assessPronunciation(
    userId: UUID,
    req: AssessRequest,
  ): Promise<{
    result: PronunciationResult;
    feedback: CoachingFeedback;
    recordingId: UUID;
  }>;
  generate(userId: UUID, req: GenerationRequest): Promise<GenerationResult>;
}

// ═══════════════════════════════════════════════════════════════════════════
// §6 — Foundation Client SDK & API signatures
// The thin typed contract screens build on; never touches Supabase/Edge directly.
// Requirement 4.1 (Profile_Api surface).
// ═══════════════════════════════════════════════════════════════════════════

/** Auth & account creation. Design §6. */
export interface AuthApi {
  signUp(email: string, password: string): Promise<{ userId: UUID }>;
  signIn(email: string, password: string): Promise<{ userId: UUID }>;
  signOut(): Promise<void>;
  redeemFunnelClaim(token: string, userId: UUID): Promise<LearnerProfile>; // funnel entry
  getSession(): Promise<{ userId: UUID } | null>;
}

/** Unified Learner Profile (Layer 0) access. Design §6, Requirement 4.1. */
export interface ProfileApi {
  get(userId: UUID): Promise<LearnerProfile>;
  bootstrap(userId: UUID, seed: Partial<LearnerProfile>): Promise<LearnerProfile>; // idempotent
  updateScores(userId: UUID, scores: Partial<SkillScores>): Promise<void>;
  updateAccent(userId: UUID, accent: AccentProfile): Promise<void>;
  appendError(userId: UUID, error: Omit<ErrorRecord, 'id'>): Promise<void>;
  recordCoreDay(userId: UUID, at: ISODateTime): Promise<StreakState>; // streak engine hook
}

/** Audio storage (low-data aware). Design §6. */
export interface AudioApi {
  /** Returns a short-lived signed upload URL scoped to recordings/{userId}/. */
  getUploadUrl(userId: UUID, recordingId: UUID): Promise<{ url: string; storagePath: string }>;
  /** Persists metadata after a successful upload. */
  registerRecording(userId: UUID, ref: Omit<RecordingRef, 'id'>): Promise<RecordingRef>;
  /** Signed URL for before/after replay + archive playback. */
  getPlaybackUrl(userId: UUID, storagePath: string): Promise<string>;
  listArchive(userId: UUID, kind?: RecordingRef['kind']): Promise<RecordingRef[]>;
}

/** AI (always via the abstraction layer / router). Design §6. */
export interface AiApi {
  assessPronunciation(req: AssessRequest): Promise<{
    result: PronunciationResult;
    feedback: CoachingFeedback;
    recordingId: UUID;
  }>;
  generate(req: GenerationRequest): Promise<GenerationResult>;
}

/** Offline-resilient capture (Refinement #3). Design §6. */
export interface AudioCapture {
  startRecording(): Promise<void>;
  stopRecording(): Promise<{ localUri: string; durationMs: number; byteSize: number }>; // compressed m4a
}

/** Offline outbox queue (Refinement #3). Design §6. */
export interface Outbox {
  enqueue(job: EvaluationJob): Promise<void>;
  flush(): Promise<void>; // called when connectivity returns
  pending(): Promise<EvaluationJob[]>;
}

/** A queued evaluation job persisted while offline. Design §6. */
export interface EvaluationJob {
  id: UUID;
  localUri: string;
  meta: AssessRequest;
  enqueuedAt: ISODateTime;
}
