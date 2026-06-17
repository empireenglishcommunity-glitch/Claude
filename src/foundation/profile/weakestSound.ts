/**
 * Layer 0 — weakest-sound derivation (Project P1, Task 2.3).
 *
 * Pure derivation of `AccentProfile.weakestSound`, which auto-targets tomorrow's
 * accent drill (Blueprint §5.5). Implements Requirements 3.5 / 3.6 and design
 * §9 Property 12:
 *
 *   - When at least one target sound has a RECORDED score, `weakestSound` is the
 *     target sound with the LOWEST score; ties are broken by the canonical
 *     target-sound ordering (the first such sound wins).
 *   - When NO target sound has a recorded score, `weakestSound` is left unset
 *     (`null`).
 *
 * Side-effect free: the caller persists the returned profile.
 */
import type { AccentProfile, AccentSoundScore, TargetSound } from '../types';

/**
 * The canonical target-sound ordering. This MATCHES the declaration order of the
 * `TargetSound` union in `src/foundation/types` (L0 → L1 → L2 → L3) and is the
 * single authoritative ordering used to break ties when two target sounds share
 * the lowest score (Req 3.5). Reuse this constant anywhere an ordering is needed.
 */
export const TARGET_SOUND_ORDER: readonly TargetSound[] = [
  // L0
  'p_b',
  'v_f',
  'ng',
  'th_voiceless',
  'th_voiced',
  // L1
  'ih_iy',
  'ae_uh',
  'uh_uw',
  'word_stress',
  // L2
  'clusters',
  'linking',
  'schwa',
  // L3
  'flap_t',
  'dark_l',
  'intonation',
  'stress_timing',
];

/** Map for O(1) ordering lookups by target sound. */
const ORDER_INDEX: ReadonlyMap<TargetSound, number> = new Map(
  TARGET_SOUND_ORDER.map((sound, index) => [sound, index]),
);

/**
 * The ordering index of a target sound in {@link TARGET_SOUND_ORDER}. Unknown
 * sounds (should not occur for a well-typed profile) sort last.
 */
export function targetSoundOrder(sound: TargetSound): number {
  const idx = ORDER_INDEX.get(sound);
  return idx === undefined ? TARGET_SOUND_ORDER.length : idx;
}

/**
 * Whether a target sound has a RECORDED score (Req 3.5/3.6).
 *
 * A score is considered recorded once the sound has been evaluated at least
 * once — signalled by a non-null `lastEvaluatedAt`. A freshly-seeded sound that
 * has never been evaluated (`lastEvaluatedAt === null`) is treated as having no
 * recorded score and is excluded from the derivation.
 */
export function hasRecordedScore(s: AccentSoundScore): boolean {
  return s.lastEvaluatedAt !== null;
}

/**
 * Derive the weakest (lowest-scoring) target sound from an accent profile.
 *
 * Returns the lowest-scoring sound among those with a recorded score, breaking
 * ties by {@link TARGET_SOUND_ORDER}; returns `null` when no target sound has a
 * recorded score (Req 3.6).
 */
export function deriveWeakestSound(profile: AccentProfile): TargetSound | null {
  let weakest: AccentSoundScore | null = null;

  for (const candidate of profile.targetSounds) {
    if (!hasRecordedScore(candidate)) continue;

    if (weakest === null) {
      weakest = candidate;
      continue;
    }

    if (candidate.score < weakest.score) {
      // Strictly lower score wins.
      weakest = candidate;
    } else if (
      candidate.score === weakest.score &&
      targetSoundOrder(candidate.sound) < targetSoundOrder(weakest.sound)
    ) {
      // Tie on score → earlier in the canonical ordering wins (Req 3.5).
      weakest = candidate;
    }
  }

  return weakest === null ? null : weakest.sound;
}

/**
 * Return a copy of the accent profile with `weakestSound` set to the derived
 * lowest-scoring target sound (or `null` when none has a recorded score). The
 * input profile is not mutated.
 */
export function withDerivedWeakestSound(profile: AccentProfile): AccentProfile {
  return { ...profile, weakestSound: deriveWeakestSound(profile) };
}
