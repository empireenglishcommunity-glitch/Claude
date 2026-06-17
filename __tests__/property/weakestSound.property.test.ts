/**
 * Property 12 — Weakest-sound targeting (Project P1, Task 2.6).
 *
 * **Validates: Requirements 3.5, 3.6**
 *
 * For any accent profile, `weakestSound` equals the lowest-scoring target sound
 * (ties broken by the canonical target-sound ordering) and is left unset when no
 * target sound has a recorded score.
 *
 * Library: fast-check (≥100 iterations).
 */
import fc from 'fast-check';
import type { AccentProfile, AccentSoundScore } from '../../src/foundation/types';
import {
  deriveWeakestSound,
  hasRecordedScore,
  TARGET_SOUND_ORDER,
  targetSoundOrder,
  withDerivedWeakestSound,
} from '../../src/foundation/profile/weakestSound';

const RUNS = { numRuns: 200 } as const;

/**
 * Generate a list of target-sound scores with UNIQUE sounds (so each sound maps
 * to exactly one score) but in ARBITRARY array order — proving the tie-break
 * relies on the canonical ordering, not array position. Integer scores make ties
 * common. `recorded` toggles whether the sound has a recorded score.
 */
const targetSoundsArb: fc.Arbitrary<AccentSoundScore[]> = fc
  .array(
    fc.record({
      sound: fc.constantFrom(...TARGET_SOUND_ORDER),
      score: fc.integer({ min: 0, max: 100 }),
      recorded: fc.boolean(),
    }),
    { maxLength: 20 },
  )
  .map((entries) => {
    const seen = new Set<string>();
    const unique: AccentSoundScore[] = [];
    for (const e of entries) {
      if (seen.has(e.sound)) continue;
      seen.add(e.sound);
      unique.push({
        sound: e.sound,
        score: e.score,
        attempts: e.recorded ? 1 : 0,
        lastEvaluatedAt: e.recorded ? '2026-01-01T00:00:00Z' : null,
      });
    }
    return unique;
  });

function profileWith(targetSounds: AccentSoundScore[]): AccentProfile {
  return {
    overallAccentScore: 50,
    dialectTendency: 'unknown',
    targetSounds,
    weakestSound: null,
    wordStress: 50,
    linking: 50,
    rhythm: 50,
    intonation: 50,
  };
}

describe('Property 12: Weakest-sound targeting (Req 3.5, 3.6)', () => {
  it('derives the lowest-scoring recorded sound, tie-broken by canonical ordering', () => {
    fc.assert(
      fc.property(targetSoundsArb, (targetSounds) => {
        const profile = profileWith(targetSounds);
        const result = deriveWeakestSound(profile);
        const recorded = targetSounds.filter(hasRecordedScore);

        if (recorded.length === 0) {
          // Req 3.6 — nothing recorded → unset.
          return result === null;
        }

        const minScore = Math.min(...recorded.map((s) => s.score));
        const tied = recorded.filter((s) => s.score === minScore);
        // Expected = earliest tied sound in the canonical ordering (Req 3.5).
        const expected = tied.reduce((a, b) =>
          targetSoundOrder(a.sound) <= targetSoundOrder(b.sound) ? a : b,
        ).sound;

        return result === expected;
      }),
      RUNS,
    );
  });

  it('withDerivedWeakestSound sets the derived value without mutating the input', () => {
    fc.assert(
      fc.property(targetSoundsArb, (targetSounds) => {
        const profile = profileWith(targetSounds);
        const next = withDerivedWeakestSound(profile);
        const expected = deriveWeakestSound(profile);
        // Field is set on the returned copy; the original is untouched.
        return next.weakestSound === expected && profile.weakestSound === null && next !== profile;
      }),
      RUNS,
    );
  });

  it('leaves weakestSound unset when no target sound has a recorded score', () => {
    const unscored: AccentSoundScore[] = TARGET_SOUND_ORDER.slice(0, 4).map((sound) => ({
      sound,
      score: 0,
      attempts: 0,
      lastEvaluatedAt: null,
    }));
    expect(deriveWeakestSound(profileWith(unscored))).toBeNull();
  });
});
