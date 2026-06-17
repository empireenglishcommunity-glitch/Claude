/**
 * Property 4 — Score bounds (Project P1, Task 2.4).
 *
 * **Validates: Requirements 3.4, 3.7**
 *
 * For any Learner_Profile, every score (`overallAccentScore`, each
 * `AccentSoundScore.score`, the accent sub-metrics, and all `SkillScores.*`)
 * lies in [0,100]; writes that would violate the range are rejected and the
 * prior value is retained unchanged.
 *
 * Library: fast-check (≥100 iterations).
 */
import fc from 'fast-check';
import type { AccentProfile, SkillScores } from '../../src/foundation/types';
import {
  ACCENT_SUBMETRIC_KEYS,
  clampScore,
  isValidScore,
  SCORE_MAX,
  SCORE_MIN,
  SKILL_SCORE_KEYS,
  validateAccentProfileWrite,
  validateScoreWrite,
  validateSkillScoresWrite,
} from '../../src/foundation/profile/validators';
import { TARGET_SOUND_ORDER } from '../../src/foundation/profile/weakestSound';

const RUNS = { numRuns: 200 } as const;

// ── Arbitraries ────────────────────────────────────────────────────────────
const inRangeScore = fc.double({ min: 0, max: 100, noNaN: true });
const outOfRangeScore = fc.oneof(
  fc.double({ min: 100 + 1e-6, max: 1e6, noNaN: true }),
  fc.double({ min: -1e6, max: -1e-6, noNaN: true }),
  fc.constant(Number.NaN),
  fc.constant(Number.POSITIVE_INFINITY),
  fc.constant(Number.NEGATIVE_INFINITY),
);
const anyScore = fc.oneof(inRangeScore, outOfRangeScore);

const validSkillScores = fc.record<SkillScores>({
  speakingFluency: inRangeScore,
  listening: inRangeScore,
  vocabulary: inRangeScore,
  grammar: inRangeScore,
  writing: inRangeScore,
});

const targetSoundArb = fc.constantFrom(...TARGET_SOUND_ORDER);

function accentProfileWith(scoreArb: fc.Arbitrary<number>): fc.Arbitrary<AccentProfile> {
  return fc.record<AccentProfile>({
    overallAccentScore: scoreArb,
    dialectTendency: fc.constantFrom('msa', 'egyptian', 'levantine', 'gulf', 'maghrebi', 'unknown'),
    targetSounds: fc.array(
      fc.record({
        sound: targetSoundArb,
        score: scoreArb,
        attempts: fc.nat(),
        lastEvaluatedAt: fc.option(fc.constant('2026-01-01T00:00:00Z'), { nil: null }),
      }),
      { maxLength: 8 },
    ),
    weakestSound: fc.constant(null),
    wordStress: scoreArb,
    linking: scoreArb,
    rhythm: scoreArb,
    intonation: scoreArb,
  });
}

// ── Tests ────────────────────────────────────────────────────────────────
describe('Property 4: Score bounds (Req 3.4, 3.7)', () => {
  it('isValidScore accepts a value iff it is finite and within [0,100]', () => {
    fc.assert(
      fc.property(anyScore, (x) => {
        const expected = Number.isFinite(x) && x >= SCORE_MIN && x <= SCORE_MAX;
        return isValidScore(x) === expected;
      }),
      RUNS,
    );
  });

  it('clampScore always yields a value within [0,100]', () => {
    fc.assert(
      fc.property(anyScore, (x) => {
        const c = clampScore(x);
        return c >= SCORE_MIN && c <= SCORE_MAX;
      }),
      RUNS,
    );
  });

  it('validateScoreWrite keeps valid candidates and preserves the prior value on rejection', () => {
    fc.assert(
      fc.property(inRangeScore, anyScore, (prior, candidate) => {
        const res = validateScoreWrite(prior, candidate);
        if (isValidScore(candidate)) {
          return res.ok && res.value === candidate;
        }
        // Rejected → prior preserved unchanged (Req 3.7).
        return !res.ok && res.value === prior;
      }),
      RUNS,
    );
  });

  it('validateSkillScoresWrite is atomic: any out-of-range field rejects the whole write', () => {
    fc.assert(
      fc.property(
        validSkillScores,
        fc.record<SkillScores>({
          speakingFluency: anyScore,
          listening: anyScore,
          vocabulary: anyScore,
          grammar: anyScore,
          writing: anyScore,
        }),
        (prior, candidate) => {
          const res = validateSkillScoresWrite(prior, candidate);
          const allValid = SKILL_SCORE_KEYS.every((k) => isValidScore(candidate[k]));
          if (allValid) {
            return res.ok && SKILL_SCORE_KEYS.every((k) => isValidScore(res.value[k]));
          }
          return !res.ok && res.value === prior;
        },
      ),
      RUNS,
    );
  });

  it('validateAccentProfileWrite accepts iff every score is in range, else preserves prior', () => {
    fc.assert(
      fc.property(accentProfileWith(inRangeScore), accentProfileWith(anyScore), (prior, candidate) => {
        const res = validateAccentProfileWrite(prior, candidate);
        const allValid =
          isValidScore(candidate.overallAccentScore) &&
          ACCENT_SUBMETRIC_KEYS.every((k) => isValidScore(candidate[k] as number)) &&
          candidate.targetSounds.every((t) => isValidScore(t.score));
        if (allValid) {
          return (
            res.ok &&
            isValidScore(res.value.overallAccentScore) &&
            ACCENT_SUBMETRIC_KEYS.every((k) => isValidScore(res.value[k] as number)) &&
            res.value.targetSounds.every((t) => isValidScore(t.score))
          );
        }
        return !res.ok && res.value === prior;
      }),
      RUNS,
    );
  });
});
