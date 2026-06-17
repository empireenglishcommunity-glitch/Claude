/**
 * Unit lane — Layer 0 profile validators & weakest-sound derivation (Tasks 2.2/2.3).
 *
 * Example-based edge cases complementing the property tests (2.4–2.6):
 * boundary scores, integer/range rules for level & sub-level, the updated_at
 * write-touch rule, and weakest-sound tie-breaking / unset behaviour.
 */
import type { AccentProfile, AccentSoundScore, SkillScores } from '../../src/foundation/types';
import {
  clampScore,
  isValidLevel,
  isValidScore,
  isValidSubLevel,
  resolveUpdatedAt,
  validateAccentProfileWrite,
  validateLevelWrite,
  validateScoreWrite,
  validateSkillScoresWrite,
  validateSubLevelWrite,
} from '../../src/foundation/profile/validators';
import { deriveWeakestSound, withDerivedWeakestSound } from '../../src/foundation/profile/weakestSound';

const baseSkills: SkillScores = {
  speakingFluency: 50,
  listening: 50,
  vocabulary: 50,
  grammar: 50,
  writing: 50,
};

function accent(targetSounds: AccentSoundScore[], overrides: Partial<AccentProfile> = {}): AccentProfile {
  return {
    overallAccentScore: 50,
    dialectTendency: 'unknown',
    targetSounds,
    weakestSound: null,
    wordStress: 50,
    linking: 50,
    rhythm: 50,
    intonation: 50,
    ...overrides,
  };
}

describe('score-bound validators (Req 3.4, 3.7)', () => {
  it('accepts the inclusive boundaries 0 and 100', () => {
    expect(isValidScore(0)).toBe(true);
    expect(isValidScore(100)).toBe(true);
    expect(isValidScore(73.5)).toBe(true);
  });

  it('rejects out-of-range and non-finite values', () => {
    expect(isValidScore(-1)).toBe(false);
    expect(isValidScore(100.01)).toBe(false);
    expect(isValidScore(Number.NaN)).toBe(false);
    expect(isValidScore(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isValidScore('50' as unknown)).toBe(false);
  });

  it('clampScore pins to [0,100] and floors non-finite to 0', () => {
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(150)).toBe(100);
    expect(clampScore(42)).toBe(42);
    expect(clampScore(Number.NaN)).toBe(0);
  });

  it('validateScoreWrite preserves the prior value when rejecting', () => {
    expect(validateScoreWrite(60, 80)).toEqual({ ok: true, value: 80 });
    const rejected = validateScoreWrite(60, 120);
    expect(rejected.ok).toBe(false);
    expect(rejected.value).toBe(60);
  });

  it('validateSkillScoresWrite merges valid partials and rejects atomically', () => {
    const ok = validateSkillScoresWrite(baseSkills, { grammar: 90 });
    expect(ok).toEqual({ ok: true, value: { ...baseSkills, grammar: 90 } });

    const bad = validateSkillScoresWrite(baseSkills, { grammar: 90, writing: 101 });
    expect(bad.ok).toBe(false);
    expect(bad.value).toBe(baseSkills); // prior untouched
  });

  it('validateAccentProfileWrite rejects a single out-of-range target sound', () => {
    const prior = accent([{ sound: 'p_b', score: 40, attempts: 1, lastEvaluatedAt: '2026-01-01T00:00:00Z' }]);
    const candidate = accent([
      { sound: 'p_b', score: 999, attempts: 2, lastEvaluatedAt: '2026-01-02T00:00:00Z' },
    ]);
    const res = validateAccentProfileWrite(prior, candidate);
    expect(res.ok).toBe(false);
    expect(res.value).toBe(prior);
  });
});

describe('level / sub-level validators (Req 3.3, 3.8)', () => {
  it('level is valid only for integers in [0,3]', () => {
    expect(isValidLevel(0)).toBe(true);
    expect(isValidLevel(3)).toBe(true);
    expect(isValidLevel(4)).toBe(false);
    expect(isValidLevel(-1)).toBe(false);
    expect(isValidLevel(2.5)).toBe(false);
  });

  it('sub_level is valid only for integers in [1,12]', () => {
    expect(isValidSubLevel(1)).toBe(true);
    expect(isValidSubLevel(12)).toBe(true);
    expect(isValidSubLevel(0)).toBe(false);
    expect(isValidSubLevel(13)).toBe(false);
    expect(isValidSubLevel(6.5)).toBe(false);
  });

  it('write validators preserve the prior value on rejection', () => {
    expect(validateLevelWrite(1, 2)).toEqual({ ok: true, value: 2 });
    const lvl = validateLevelWrite(1, 9);
    expect(lvl.ok).toBe(false);
    expect(lvl.value).toBe(1);

    const sub = validateSubLevelWrite(5, 0);
    expect(sub.ok).toBe(false);
    expect(sub.value).toBe(5);
  });
});

describe('updated_at write-touch rule (Req 4.6)', () => {
  const prior = '2026-06-17T20:00:00Z';
  const now = '2026-06-17T21:30:00Z';

  it('advances updated_at when a field was modified', () => {
    expect(resolveUpdatedAt(prior, true, now)).toBe(now);
  });

  it('leaves updated_at unchanged for read-only / no-op operations', () => {
    expect(resolveUpdatedAt(prior, false, now)).toBe(prior);
  });
});

describe('weakest-sound derivation (Req 3.5, 3.6)', () => {
  it('picks the lowest-scoring recorded sound', () => {
    const profile = accent([
      { sound: 'p_b', score: 70, attempts: 3, lastEvaluatedAt: '2026-01-01T00:00:00Z' },
      { sound: 'v_f', score: 30, attempts: 2, lastEvaluatedAt: '2026-01-01T00:00:00Z' },
      { sound: 'ng', score: 55, attempts: 1, lastEvaluatedAt: '2026-01-01T00:00:00Z' },
    ]);
    expect(deriveWeakestSound(profile)).toBe('v_f');
  });

  it('breaks ties by canonical ordering, ignoring array order', () => {
    // th_voiced appears first in the array but th_voiceless precedes it canonically.
    const profile = accent([
      { sound: 'th_voiced', score: 20, attempts: 1, lastEvaluatedAt: '2026-01-01T00:00:00Z' },
      { sound: 'th_voiceless', score: 20, attempts: 1, lastEvaluatedAt: '2026-01-01T00:00:00Z' },
    ]);
    expect(deriveWeakestSound(profile)).toBe('th_voiceless');
  });

  it('ignores sounds with no recorded score', () => {
    const profile = accent([
      { sound: 'p_b', score: 10, attempts: 0, lastEvaluatedAt: null }, // not recorded
      { sound: 'v_f', score: 80, attempts: 4, lastEvaluatedAt: '2026-01-01T00:00:00Z' },
    ]);
    expect(deriveWeakestSound(profile)).toBe('v_f');
  });

  it('returns null when no sound has a recorded score', () => {
    const profile = accent([{ sound: 'p_b', score: 10, attempts: 0, lastEvaluatedAt: null }]);
    expect(deriveWeakestSound(profile)).toBeNull();
    expect(withDerivedWeakestSound(profile).weakestSound).toBeNull();
  });
});
