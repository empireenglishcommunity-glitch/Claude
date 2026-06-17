/**
 * Profile access SDK — Unified Learner Profile (Layer 0) read/write (Task 3.2).
 *
 * Implements the design §6 `ProfileApi` contract: `get`, `bootstrap`
 * (idempotent), `updateScores`, `updateAccent` (runs weakest-sound derivation),
 * `appendError`, and `recordCoreDay`. It wires the Task 2.2 validators and the
 * Task 2.3 weakest-sound derivation into every write path, maps Postgres rows
 * (snake_case, JSONB sub-structures) to/from the domain model, and enforces the
 * `updated_at` write-touch rule (Req 4.6).
 *
 * ── Testability decision (offline / deterministic) ──────────────────────────
 * The SDK depends on a small **persistence port** ({@link ProfileStore}) rather
 * than importing the Supabase client directly. Production wires the
 * {@link SupabaseProfileStore} (which wraps the shared backend client); tests
 * inject an in-memory fake store so the whole SDK runs deterministically and
 * fully offline — no live Supabase needed (Property 1 / Task 3.3, unit Task 3.5).
 * A `now()` clock and `uuid()` generator are likewise injectable for determinism.
 *
 * ── Return-type reconciliation (Req 4.1 is authoritative) ───────────────────
 * design §6 typed the mutating methods as `Promise<void>`. Requirement 4.1
 * states each operation "returns the affected Learner_Profile or record on
 * success", so — mirroring the SubLevel string→integer reconciliation already
 * documented in `src/foundation/types` — this implementation returns the
 * affected entity. The shared `ProfileApi` interface is left untouched; this
 * class is its requirement-faithful runtime realization.
 *
 * Requirements: 3.1, 3.9, 4.1, 4.2, 4.6 (and 3.4/3.7/3.8 via the validators,
 * 3.5/3.6 via the weakest-sound derivation).
 */
import type {
  AccentProfile,
  ErrorRecord,
  ISODateTime,
  LearnerProfile,
  Level,
  Region,
  SkillScores,
  StreakState,
  SubLevel,
  TargetSound,
  Tier,
  UiLocale,
  UUID,
} from '../types';
import {
  isValidLevel,
  isValidSubLevel,
  resolveUpdatedAt,
  validateAccentProfileWrite,
  validateSkillScoresWrite,
  type ValidationError,
} from './validators';
import { withDerivedWeakestSound } from './weakestSound';

// ═══════════════════════════════════════════════════════════════════════════
// Typed errors
// ═══════════════════════════════════════════════════════════════════════════

/** Base class for all Profile SDK errors. */
export class ProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Raised by `get`/write paths when no profile exists for the user id. */
export class ProfileNotFoundError extends ProfileError {
  constructor(public readonly userId: UUID) {
    super(`No learner profile exists for user "${userId}".`);
  }
}

/**
 * Raised when a second profile row would be created for a user id that already
 * has one (Req 3.9). `bootstrap` never surfaces this — it is idempotent — but
 * the persistence layer raises it to defend the single-source-of-truth invariant
 * (e.g. a concurrent create race), and `bootstrap` recovers by returning the
 * existing profile.
 */
export class ProfileAlreadyExistsError extends ProfileError {
  constructor(public readonly userId: UUID) {
    super(`A learner profile already exists for user "${userId}".`);
  }
}

/** Raised when a write would push a score outside [0,100] (Req 3.7). */
export class ScoreOutOfRangeError extends ProfileError {
  constructor(public readonly validation: ValidationError) {
    super(validation.message);
  }
}

/** Raised when a seed `level`/`sub_level` is outside its valid integer range (Req 3.8). */
export class ProgressionOutOfRangeError extends ProfileError {
  constructor(message: string, public readonly field: 'level' | 'sub_level') {
    super(message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Persistence rows (mirror the Postgres schema, design §4.2) + the store port
// ═══════════════════════════════════════════════════════════════════════════

/** A `learner_profile` row. JSONB columns hold the score sub-structures. */
export interface ProfileRow {
  user_id: string;
  display_name: string;
  ui_locale: UiLocale;
  region: Region;
  tier: Tier;
  telegram_id: string | null;
  level: number;
  sub_level: number;
  placement_completed: boolean;
  skill_scores: Partial<SkillScores>;
  accent_profile: Partial<AccentProfile>;
  streak: StreakState;
  created_at: string;
  updated_at: string;
}

/** An `error_record` row. */
export interface ErrorRow {
  id: string;
  user_id: string;
  category: ErrorRecord['category'];
  detail: string;
  related_sound: TargetSound | null;
  recording_id: string | null;
  resolved: boolean;
  occurred_at: string;
}

/** A `recording_ref` row (read-only here; written by AudioApi in Task 7). */
export interface RecordingRow {
  id: string;
  user_id: string;
  storage_path: string;
  kind: LearnerProfile['recordings'][number]['kind'];
  reference_text: string | null;
  duration_ms: number;
  byte_size: number;
  accent_score_at_time: number | null;
  created_at: string;
}

/**
 * The persistence port the SDK depends on. Implemented by
 * {@link SupabaseProfileStore} in production and by an in-memory fake in tests.
 * Implementations MUST raise {@link ProfileAlreadyExistsError} from
 * `insertProfile` when a row with the same `user_id` already exists.
 */
export interface ProfileStore {
  findProfile(userId: UUID): Promise<ProfileRow | null>;
  insertProfile(row: ProfileRow): Promise<ProfileRow>;
  updateProfile(userId: UUID, patch: Partial<ProfileRow>): Promise<ProfileRow>;
  listErrors(userId: UUID): Promise<ErrorRow[]>;
  insertError(row: ErrorRow): Promise<ErrorRow>;
  listRecordings(userId: UUID): Promise<RecordingRow[]>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Domain defaults (used to seed a fresh profile / fill empty JSONB)
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_SKILL_SCORES: SkillScores = Object.freeze({
  speakingFluency: 0,
  listening: 0,
  vocabulary: 0,
  grammar: 0,
  writing: 0,
});

export const DEFAULT_ACCENT_PROFILE: AccentProfile = Object.freeze({
  overallAccentScore: 0,
  dialectTendency: 'unknown',
  targetSounds: [],
  weakestSound: null,
  wordStress: 0,
  linking: 0,
  rhythm: 0,
  intonation: 0,
});

export const DEFAULT_STREAK: StreakState = Object.freeze({
  current: 0,
  longest: 0,
  lastCoreDayAt: null,
  ramadanMode: false,
});

// ═══════════════════════════════════════════════════════════════════════════
// Row ⇆ domain mapping
// ═══════════════════════════════════════════════════════════════════════════

/** Fill any missing skill-score fields from defaults (tolerates empty JSONB). */
export function coerceSkillScores(raw: Partial<SkillScores> | null | undefined): SkillScores {
  return { ...DEFAULT_SKILL_SCORES, ...(raw ?? {}) };
}

/** Fill any missing accent fields from defaults (tolerates empty JSONB). */
export function coerceAccentProfile(raw: Partial<AccentProfile> | null | undefined): AccentProfile {
  return {
    ...DEFAULT_ACCENT_PROFILE,
    ...(raw ?? {}),
    // Arrays must not be shared with the frozen default.
    targetSounds: raw?.targetSounds ? [...raw.targetSounds] : [],
  };
}

function coerceStreak(raw: StreakState | null | undefined): StreakState {
  return { ...DEFAULT_STREAK, ...(raw ?? {}) };
}

function errorRowToDomain(row: ErrorRow): ErrorRecord {
  return {
    id: row.id,
    category: row.category,
    detail: row.detail,
    relatedSound: row.related_sound,
    occurredAt: row.occurred_at,
    recordingId: row.recording_id,
    resolved: row.resolved,
  };
}

function recordingRowToDomain(row: RecordingRow): LearnerProfile['recordings'][number] {
  return {
    id: row.id,
    storagePath: row.storage_path,
    kind: row.kind,
    referenceText: row.reference_text,
    durationMs: row.duration_ms,
    byteSize: row.byte_size,
    createdAt: row.created_at,
    accentScoreAtTime: row.accent_score_at_time,
  };
}

/** Assemble the full domain `LearnerProfile` from its row + child-table rows. */
export function rowToProfile(
  row: ProfileRow,
  errors: ErrorRow[],
  recordings: RecordingRow[],
): LearnerProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    uiLocale: row.ui_locale,
    region: row.region,
    tier: row.tier,
    telegramId: row.telegram_id,
    createdAt: row.created_at,
    level: row.level as Level,
    subLevel: row.sub_level as SubLevel,
    placementCompleted: row.placement_completed,
    skillScores: coerceSkillScores(row.skill_scores),
    accentProfile: coerceAccentProfile(row.accent_profile),
    errorHistory: errors.map(errorRowToDomain),
    streak: coerceStreak(row.streak),
    recordings: recordings.map(recordingRowToDomain),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Small pure helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Structural equality via canonical JSON (sufficient for our plain records). */
function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** UTC calendar-day index (days since epoch) for streak gap arithmetic. */
function utcDayIndex(iso: ISODateTime): number {
  return Math.floor(Date.parse(iso) / 86_400_000);
}

/**
 * Pure streak advancement (Layer 0 hook; full progression logic is P4).
 *
 * Rules, keyed on UTC calendar days:
 *   • first ever core day        → current = 1
 *   • same UTC day as last       → unchanged (idempotent within a day)
 *   • exactly the next UTC day   → current += 1
 *   • a gap of 2+ UTC days       → current resets to 1
 * `longest` tracks the max `current` ever seen; `lastCoreDayAt` advances to `at`
 * on any non-same-day update; `ramadanMode` is preserved.
 */
export function advanceStreak(prior: StreakState, at: ISODateTime): StreakState {
  if (prior.lastCoreDayAt === null) {
    return { ...prior, current: 1, longest: Math.max(prior.longest, 1), lastCoreDayAt: at };
  }
  const lastDay = utcDayIndex(prior.lastCoreDayAt);
  const today = utcDayIndex(at);
  if (today === lastDay) {
    return prior; // same day → no change
  }
  const current = today === lastDay + 1 ? prior.current + 1 : 1;
  return {
    ...prior,
    current,
    longest: Math.max(prior.longest, current),
    lastCoreDayAt: at,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// The Profile SDK
// ═══════════════════════════════════════════════════════════════════════════

export interface ProfileApiOptions {
  /** Injectable clock for deterministic `updated_at` / `createdAt` (tests). */
  now?: () => ISODateTime;
  /** Injectable id generator for new error records (tests). */
  uuid?: () => UUID;
}

function defaultUuid(): UUID {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  // RFC-4122-ish fallback for environments without crypto.randomUUID.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Requirement-faithful realization of the design §6 `ProfileApi` (see the
 * return-type reconciliation note in the file header).
 */
export class ProfileApi {
  private readonly store: ProfileStore;
  private readonly now: () => ISODateTime;
  private readonly uuid: () => UUID;

  constructor(store: ProfileStore, options: ProfileApiOptions = {}) {
    this.store = store;
    this.now = options.now ?? (() => new Date().toISOString());
    this.uuid = options.uuid ?? defaultUuid;
  }

  /** Read the full Unified Learner Profile (Req 4.1). Throws if it does not exist. */
  async get(userId: UUID): Promise<LearnerProfile> {
    const row = await this.store.findProfile(userId);
    if (!row) throw new ProfileNotFoundError(userId);
    return this.assemble(userId, row);
  }

  /**
   * Idempotently bootstrap the single profile row for `userId` (Req 3.1, 4.2).
   *
   * If a profile already exists it is returned UNCHANGED and no second row is
   * created, so any number of repeated calls yield an identical profile id. The
   * persistence layer's unique-key guard also defends against a concurrent
   * create race: an {@link ProfileAlreadyExistsError} from `insertProfile` is
   * caught and resolved by returning the now-existing profile.
   */
  async bootstrap(userId: UUID, seed: Partial<LearnerProfile> = {}): Promise<LearnerProfile> {
    const existing = await this.store.findProfile(userId);
    if (existing) return this.assemble(userId, existing);

    const row = this.buildInsertRow(userId, seed);
    try {
      const inserted = await this.store.insertProfile(row);
      return this.assemble(userId, inserted);
    } catch (err) {
      if (err instanceof ProfileAlreadyExistsError) {
        const raced = await this.store.findProfile(userId);
        if (raced) return this.assemble(userId, raced);
      }
      throw err;
    }
  }

  /** Update skill scores (Req 4.1). Out-of-range writes are rejected (Req 3.7). */
  async updateScores(userId: UUID, scores: Partial<SkillScores>): Promise<LearnerProfile> {
    const row = await this.requireRow(userId);
    const prior = coerceSkillScores(row.skill_scores);
    const res = validateSkillScoresWrite(prior, scores);
    if (!res.ok) throw new ScoreOutOfRangeError(res.error);
    return this.persistIfChanged(userId, row, prior, res.value, (value) => ({ skill_scores: value }));
  }

  /**
   * Replace the accent profile (Req 4.1), running the weakest-sound derivation
   * (Task 2.3). Any out-of-range score rejects the whole write (Req 3.7).
   */
  async updateAccent(userId: UUID, accent: AccentProfile): Promise<LearnerProfile> {
    const row = await this.requireRow(userId);
    const prior = coerceAccentProfile(row.accent_profile);
    const res = validateAccentProfileWrite(prior, accent);
    if (!res.ok) throw new ScoreOutOfRangeError(res.error);
    const derived = withDerivedWeakestSound(res.value);
    return this.persistIfChanged(userId, row, prior, derived, (value) => ({ accent_profile: value }));
  }

  /**
   * Append an error record to the learner's history (Req 4.1) and return the
   * created record (with its generated id). The error lives in the separate
   * `error_record` table, so this does not touch the `learner_profile` row's
   * `updated_at` (Req 4.6 is scoped to learner_profile fields).
   */
  async appendError(userId: UUID, error: Omit<ErrorRecord, 'id'>): Promise<ErrorRecord> {
    await this.requireRow(userId);
    const record: ErrorRecord = { id: this.uuid(), ...error };
    const inserted = await this.store.insertError({
      id: record.id,
      user_id: userId,
      category: record.category,
      detail: record.detail,
      related_sound: record.relatedSound,
      recording_id: record.recordingId,
      resolved: record.resolved,
      occurred_at: record.occurredAt,
    });
    return errorRowToDomain(inserted);
  }

  /** Record a core-practice day and return the new streak state (Req 4.1). */
  async recordCoreDay(userId: UUID, at: ISODateTime): Promise<StreakState> {
    const row = await this.requireRow(userId);
    const prior = coerceStreak(row.streak);
    const next = advanceStreak(prior, at);
    const didModify = !deepEqual(prior, next);
    if (didModify) {
      const updatedAt = resolveUpdatedAt(row.updated_at, true, this.now());
      await this.store.updateProfile(userId, { streak: next, updated_at: updatedAt });
    }
    return next;
  }

  // ── internals ────────────────────────────────────────────────────────────

  private async requireRow(userId: UUID): Promise<ProfileRow> {
    const row = await this.store.findProfile(userId);
    if (!row) throw new ProfileNotFoundError(userId);
    return row;
  }

  private async assemble(userId: UUID, row: ProfileRow): Promise<LearnerProfile> {
    const [errors, recordings] = await Promise.all([
      this.store.listErrors(userId),
      this.store.listRecordings(userId),
    ]);
    return rowToProfile(row, errors, recordings);
  }

  /**
   * Persist a validated JSONB sub-structure only when it actually changed,
   * applying the `updated_at` write-touch rule (Req 4.6): a real modification
   * advances `updated_at`; a no-op write leaves the row (and `updated_at`)
   * untouched. Returns the freshly-assembled profile either way.
   */
  private async persistIfChanged<T>(
    userId: UUID,
    row: ProfileRow,
    prior: T,
    next: T,
    toPatch: (value: T) => Partial<ProfileRow>,
  ): Promise<LearnerProfile> {
    const didModify = !deepEqual(prior, next);
    if (didModify) {
      const updatedAt = resolveUpdatedAt(row.updated_at, true, this.now());
      const updated = await this.store.updateProfile(userId, {
        ...toPatch(next),
        updated_at: updatedAt,
      });
      return this.assemble(userId, updated);
    }
    return this.assemble(userId, row);
  }

  /** Build the insert row for a fresh profile, validating seeded invariants. */
  private buildInsertRow(userId: UUID, seed: Partial<LearnerProfile>): ProfileRow {
    const ts = this.now();

    const level: Level = seed.level ?? 0;
    if (!isValidLevel(level)) {
      throw new ProgressionOutOfRangeError(
        `Seed level ${String(level)} is out of range; expected an integer in [0,3].`,
        'level',
      );
    }
    const subLevel: SubLevel = seed.subLevel ?? 1;
    if (!isValidSubLevel(subLevel)) {
      throw new ProgressionOutOfRangeError(
        `Seed sub_level ${String(subLevel)} is out of range; expected an integer in [1,12].`,
        'sub_level',
      );
    }

    // Validate any seeded scores through the same validators used by writes.
    const skillRes = validateSkillScoresWrite(DEFAULT_SKILL_SCORES, seed.skillScores ?? {});
    if (!skillRes.ok) throw new ScoreOutOfRangeError(skillRes.error);

    let accent: AccentProfile = DEFAULT_ACCENT_PROFILE;
    if (seed.accentProfile) {
      const accentRes = validateAccentProfileWrite(DEFAULT_ACCENT_PROFILE, seed.accentProfile);
      if (!accentRes.ok) throw new ScoreOutOfRangeError(accentRes.error);
      accent = withDerivedWeakestSound(accentRes.value);
    }

    return {
      user_id: userId,
      display_name: seed.displayName ?? '',
      ui_locale: seed.uiLocale ?? 'ar',
      region: seed.region ?? 'international',
      tier: seed.tier ?? 'gate',
      telegram_id: seed.telegramId ?? null,
      level,
      sub_level: subLevel,
      placement_completed: seed.placementCompleted ?? false,
      skill_scores: skillRes.value,
      accent_profile: accent,
      streak: seed.streak ? coerceStreak(seed.streak) : { ...DEFAULT_STREAK },
      created_at: seed.createdAt ?? ts,
      updated_at: ts,
    };
  }
}

/**
 * Construct the production Profile SDK backed by Supabase. Imported lazily so
 * tests that inject a fake store never pull in the backend client.
 */
export async function createProfileApi(options: ProfileApiOptions = {}): Promise<ProfileApi> {
  const { SupabaseProfileStore } = await import('./supabaseProfileStore');
  return new ProfileApi(new SupabaseProfileStore(), options);
}
