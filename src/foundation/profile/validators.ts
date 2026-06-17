/**
 * Layer 0 domain validators — profile invariants (Project P1, Task 2.2).
 *
 * Pure, side-effect-free validation/clamping helpers that enforce the Unified
 * Learner Profile invariants from design §4.2 ("Validation rules") and §9
 * (Properties 4 & 5) before any value is persisted.
 *
 * Implemented here (Requirements 3.4, 3.7, 3.8, 4.6):
 *   - Score-bound validation/clamping in [0,100] for `overallAccentScore`,
 *     every `AccentSoundScore.score`, the accent sub-metrics (`wordStress`,
 *     `linking`, `rhythm`, `intonation`), and all `SkillScores.*`. Out-of-range
 *     writes are REJECTED and the prior value is preserved unchanged (Req 3.7).
 *   - `level` (integer 0–3) and `sub_level` (integer 1–12) validity — accepted
 *     iff valid, rejected otherwise (Req 3.8, design Property 5).
 *   - The `updated_at` write-touch rule helper: `updated_at` advances on any
 *     persisted field modification and is unchanged for read-only access
 *     (Req 4.6).
 *
 * There is no I/O here — the Profile SDK (Task 3.2) wires these into its write
 * paths. Keeping them pure makes them trivially unit/property testable.
 */
import type {
  AccentProfile,
  AccentSoundScore,
  ISODateTime,
  Level,
  Score,
  SkillScores,
  SubLevel,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// Result type
// ═══════════════════════════════════════════════════════════════════════════

/** A typed reason a write was rejected. */
export type ValidationErrorCode = 'score_out_of_range' | 'level_out_of_range' | 'sub_level_out_of_range';

export interface ValidationError {
  code: ValidationErrorCode;
  /** Human-readable, developer-facing message. */
  message: string;
  /** Dotted path of the offending field, e.g. `skillScores.grammar`. */
  field?: string;
}

/**
 * Outcome of validating a write.
 *  - `ok: true`  → the candidate is valid; `value` is the value to persist.
 *  - `ok: false` → the candidate is rejected; `value` is the PRIOR value,
 *                  preserved unchanged (Req 3.7 / 3.8), and `error` explains why.
 */
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; value: T; error: ValidationError };

// ═══════════════════════════════════════════════════════════════════════════
// Score bounds — Requirements 3.4, 3.7 (design Property 4)
// ═══════════════════════════════════════════════════════════════════════════

/** Inclusive score range shared by every score-bearing field. */
export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

/**
 * A score is valid iff it is a finite real number within [0,100] inclusive.
 * Rejects `NaN`, `±Infinity`, and any out-of-range value.
 */
export function isValidScore(value: unknown): value is Score {
  return typeof value === 'number' && Number.isFinite(value) && value >= SCORE_MIN && value <= SCORE_MAX;
}

/**
 * Clamp an arbitrary number into [0,100]. Non-finite inputs (`NaN`, `±Infinity`)
 * clamp to `SCORE_MIN` (0) as a safe floor. Use {@link validateScoreWrite} when
 * the requirement is to REJECT (not silently clamp) out-of-range values.
 */
export function clampScore(value: number): Score {
  if (!Number.isFinite(value)) return SCORE_MIN;
  if (value < SCORE_MIN) return SCORE_MIN;
  if (value > SCORE_MAX) return SCORE_MAX;
  return value;
}

/**
 * Validate a single score write. On success returns the candidate; on failure
 * returns the `prior` value unchanged together with a typed error (Req 3.7).
 */
export function validateScoreWrite(prior: Score, candidate: number, field?: string): ValidationResult<Score> {
  if (isValidScore(candidate)) {
    return { ok: true, value: candidate };
  }
  return {
    ok: false,
    value: prior,
    error: {
      code: 'score_out_of_range',
      message: `Score ${String(candidate)} is out of range [${SCORE_MIN}, ${SCORE_MAX}].`,
      field,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SkillScores — all five metrics in [0,100]
// ═══════════════════════════════════════════════════════════════════════════

/** The five skill-score keys (matches `SkillScores`). */
export const SKILL_SCORE_KEYS = [
  'speakingFluency',
  'listening',
  'vocabulary',
  'grammar',
  'writing',
] as const satisfies readonly (keyof SkillScores)[];

/**
 * Validate a partial `SkillScores` update against the prior value. The update
 * is atomic: if ANY provided field is out of range, the WHOLE write is rejected
 * and the prior `SkillScores` is preserved unchanged (Req 3.7).
 */
export function validateSkillScoresWrite(
  prior: SkillScores,
  candidate: Partial<SkillScores>,
): ValidationResult<SkillScores> {
  for (const key of SKILL_SCORE_KEYS) {
    const next = candidate[key];
    if (next !== undefined && !isValidScore(next)) {
      return {
        ok: false,
        value: prior,
        error: {
          code: 'score_out_of_range',
          message: `Skill score "${key}" = ${String(next)} is out of range [${SCORE_MIN}, ${SCORE_MAX}].`,
          field: `skillScores.${key}`,
        },
      };
    }
  }
  return { ok: true, value: { ...prior, ...candidate } };
}

// ═══════════════════════════════════════════════════════════════════════════
// AccentProfile — overall + sub-metrics + every target-sound score in [0,100]
// ═══════════════════════════════════════════════════════════════════════════

/** The four accent sub-metric keys constrained to [0,100]. */
export const ACCENT_SUBMETRIC_KEYS = [
  'wordStress',
  'linking',
  'rhythm',
  'intonation',
] as const satisfies readonly (keyof AccentProfile)[];

/**
 * Validate every score in an `AccentProfile`: `overallAccentScore`, the four
 * sub-metrics, and each `targetSounds[*].score`. Atomic — any single
 * out-of-range value rejects the whole write and preserves `prior` (Req 3.4/3.7).
 */
export function validateAccentProfileWrite(
  prior: AccentProfile,
  candidate: AccentProfile,
): ValidationResult<AccentProfile> {
  if (!isValidScore(candidate.overallAccentScore)) {
    return rejectAccent(prior, candidate.overallAccentScore, 'accentProfile.overallAccentScore');
  }
  for (const key of ACCENT_SUBMETRIC_KEYS) {
    const v = candidate[key] as number;
    if (!isValidScore(v)) {
      return rejectAccent(prior, v, `accentProfile.${key}`);
    }
  }
  for (let i = 0; i < candidate.targetSounds.length; i += 1) {
    const ts: AccentSoundScore = candidate.targetSounds[i];
    if (!isValidScore(ts.score)) {
      return rejectAccent(prior, ts.score, `accentProfile.targetSounds[${i}].score (${ts.sound})`);
    }
  }
  return { ok: true, value: candidate };
}

function rejectAccent(prior: AccentProfile, bad: number, field: string): ValidationResult<AccentProfile> {
  return {
    ok: false,
    value: prior,
    error: {
      code: 'score_out_of_range',
      message: `Accent score at "${field}" = ${String(bad)} is out of range [${SCORE_MIN}, ${SCORE_MAX}].`,
      field,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Level / sub-level validity — Requirements 3.3, 3.8 (design Property 5)
// ═══════════════════════════════════════════════════════════════════════════

export const LEVEL_MIN = 0;
export const LEVEL_MAX = 3;
export const SUB_LEVEL_MIN = 1;
export const SUB_LEVEL_MAX = 12;

/** `level` is valid iff it is an integer in [0,3]. */
export function isValidLevel(value: unknown): value is Level {
  return typeof value === 'number' && Number.isInteger(value) && value >= LEVEL_MIN && value <= LEVEL_MAX;
}

/** `sub_level` is valid iff it is an integer in [1,12]. */
export function isValidSubLevel(value: unknown): value is SubLevel {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= SUB_LEVEL_MIN && value <= SUB_LEVEL_MAX
  );
}

/**
 * Validate a `level` write — accepted iff an integer in [0,3], otherwise the
 * prior value is preserved unchanged with a typed error (Req 3.8).
 */
export function validateLevelWrite(prior: Level, candidate: number): ValidationResult<Level> {
  if (isValidLevel(candidate)) {
    return { ok: true, value: candidate };
  }
  return {
    ok: false,
    value: prior,
    error: {
      code: 'level_out_of_range',
      message: `level ${String(candidate)} is out of range; expected an integer in [${LEVEL_MIN}, ${LEVEL_MAX}].`,
      field: 'level',
    },
  };
}

/**
 * Validate a `sub_level` write — accepted iff an integer in [1,12], otherwise
 * the prior value is preserved unchanged with a typed error (Req 3.8).
 */
export function validateSubLevelWrite(prior: SubLevel, candidate: number): ValidationResult<SubLevel> {
  if (isValidSubLevel(candidate)) {
    return { ok: true, value: candidate };
  }
  return {
    ok: false,
    value: prior,
    error: {
      code: 'sub_level_out_of_range',
      message: `sub_level ${String(candidate)} is out of range; expected an integer in [${SUB_LEVEL_MIN}, ${SUB_LEVEL_MAX}].`,
      field: 'sub_level',
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// updated_at write-touch rule — Requirement 4.6
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve the `updated_at` value to persist for an operation.
 *
 * Write-touch rule (Req 4.6): when a write modifies at least one persisted field
 * (`didModify === true`), `updated_at` advances to `now`. For read-only access
 * or a no-op write (`didModify === false`), `updated_at` is returned unchanged.
 *
 * @param prior     the row's current `updated_at`
 * @param didModify whether this operation actually changed a persisted field
 * @param now       the modification timestamp to stamp on a real change
 */
export function resolveUpdatedAt(
  prior: ISODateTime,
  didModify: boolean,
  now: ISODateTime,
): ISODateTime {
  return didModify ? now : prior;
}
