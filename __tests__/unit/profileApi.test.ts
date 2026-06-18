/**
 * Unit lane — Profile SDK write/read paths (Task 3.5).
 *
 * Example-based coverage for `updateScores`, `appendError`, `recordCoreDay`, and
 * the duplicate-bootstrap / second-row-creation rejection edge case (Req 3.9).
 * Runs fully offline against the in-memory store fake.
 *
 * _Requirements: 3.9, 4.1, 4.6_
 */
import {
  advanceStreak,
  ProfileApi,
  ProfileAlreadyExistsError,
  ProfileNotFoundError,
  ScoreOutOfRangeError,
  type ProfileRow,
} from '../../src/foundation/profile/profileApi';
import { InMemoryProfileStore } from '../helpers/inMemoryProfileStore';
import type { AccentProfile } from '../../src/foundation/types';

const USER = '11111111-1111-4111-8111-111111111111';
const T0 = '2026-06-17T20:00:00.000Z';
const T1 = '2026-06-18T09:30:00.000Z';

function setup(now: () => string = () => T1) {
  const store = new InMemoryProfileStore();
  const api = new ProfileApi(store, { now });
  return { store, api };
}

describe('bootstrap + get (Req 3.1, 4.1)', () => {
  it('bootstraps a profile with defaults and reads it back', async () => {
    const { api } = setup();
    const created = await api.bootstrap(USER, { displayName: 'Layla', region: 'egypt' });
    expect(created.userId).toBe(USER);
    expect(created.uiLocale).toBe('ar'); // Arabic-first default
    expect(created.tier).toBe('gate');
    expect(created.level).toBe(0);
    expect(created.subLevel).toBe(1);
    expect(created.skillScores).toEqual({
      speakingFluency: 0,
      listening: 0,
      vocabulary: 0,
      grammar: 0,
      writing: 0,
    });

    const fetched = await api.get(USER);
    expect(fetched).toEqual(created);
  });

  it('get throws when the profile does not exist', async () => {
    const { api } = setup();
    await expect(api.get(USER)).rejects.toBeInstanceOf(ProfileNotFoundError);
  });
});

describe('updateScores (Req 4.1, 3.7, 4.6)', () => {
  it('merges a partial update and advances updated_at', async () => {
    const { store, api } = setup(() => T1);
    await api.bootstrap(USER, { displayName: 'A', region: 'egypt', createdAt: T0 });
    // Force a known prior updated_at.
    await store.updateProfile(USER, { updated_at: T0 });

    const updated = await api.updateScores(USER, { grammar: 88, writing: 91 });
    expect(updated.skillScores.grammar).toBe(88);
    expect(updated.skillScores.writing).toBe(91);
    expect(updated.skillScores.listening).toBe(0); // untouched field preserved

    const row = (await store.findProfile(USER)) as ProfileRow;
    expect(row.updated_at).toBe(T1); // write-touch rule applied
  });

  it('rejects an out-of-range score and preserves the prior value (Req 3.7)', async () => {
    const { store, api } = setup();
    await api.bootstrap(USER, { displayName: 'A', region: 'egypt' });
    await api.updateScores(USER, { grammar: 70 });

    await expect(api.updateScores(USER, { grammar: 150 })).rejects.toBeInstanceOf(
      ScoreOutOfRangeError,
    );

    const after = await api.get(USER);
    expect(after.skillScores.grammar).toBe(70); // unchanged
  });

  it('does not touch updated_at for a no-op write (Req 4.6)', async () => {
    const { store, api } = setup(() => T1);
    await api.bootstrap(USER, { displayName: 'A', region: 'egypt', createdAt: T0 });
    await store.updateProfile(USER, { updated_at: T0, skill_scores: { grammar: 50 } });

    await api.updateScores(USER, { grammar: 50 }); // same value → no change
    const row = (await store.findProfile(USER)) as ProfileRow;
    expect(row.updated_at).toBe(T0); // unchanged
  });
});

describe('updateAccent (Req 4.1, 3.5/3.6)', () => {
  it('runs weakest-sound derivation on write', async () => {
    const { api } = setup();
    await api.bootstrap(USER, { displayName: 'A', region: 'egypt' });

    const accent: AccentProfile = {
      overallAccentScore: 60,
      dialectTendency: 'egyptian',
      weakestSound: null,
      wordStress: 50,
      linking: 50,
      rhythm: 50,
      intonation: 50,
      targetSounds: [
        { sound: 'p_b', score: 70, attempts: 2, lastEvaluatedAt: '2026-06-17T00:00:00Z' },
        { sound: 'v_f', score: 35, attempts: 2, lastEvaluatedAt: '2026-06-17T00:00:00Z' },
      ],
    };
    const updated = await api.updateAccent(USER, accent);
    expect(updated.accentProfile.weakestSound).toBe('v_f');
  });

  it('rejects an out-of-range accent score and preserves the prior profile', async () => {
    const { api } = setup();
    await api.bootstrap(USER, { displayName: 'A', region: 'egypt' });
    const bad = {
      ...({
        overallAccentScore: 200,
        dialectTendency: 'unknown',
        weakestSound: null,
        wordStress: 50,
        linking: 50,
        rhythm: 50,
        intonation: 50,
        targetSounds: [],
      } as AccentProfile),
    };
    await expect(api.updateAccent(USER, bad)).rejects.toBeInstanceOf(ScoreOutOfRangeError);
    const after = await api.get(USER);
    expect(after.accentProfile.overallAccentScore).toBe(0); // prior default retained
  });
});

describe('appendError (Req 4.1)', () => {
  it('appends an error record with a generated id and returns it', async () => {
    let counter = 0;
    const store = new InMemoryProfileStore();
    const api = new ProfileApi(store, { now: () => T1, uuid: () => `err-${++counter}` });
    await api.bootstrap(USER, { displayName: 'A', region: 'egypt' });

    const rec = await api.appendError(USER, {
      category: 'phoneme',
      detail: 'park→bark (/p/ devoiced to /b/)',
      relatedSound: 'p_b',
      occurredAt: '2026-06-18T08:00:00Z',
      recordingId: null,
      resolved: false,
    });
    expect(rec.id).toBe('err-1');
    expect(rec.category).toBe('phoneme');

    const profile = await api.get(USER);
    expect(profile.errorHistory).toHaveLength(1);
    expect(profile.errorHistory[0].detail).toContain('park');
  });

  it('throws when appending to a non-existent profile', async () => {
    const { api } = setup();
    await expect(
      api.appendError(USER, {
        category: 'grammar',
        detail: 'x',
        relatedSound: null,
        occurredAt: T1,
        recordingId: null,
        resolved: false,
      }),
    ).rejects.toBeInstanceOf(ProfileNotFoundError);
  });
});

describe('recordCoreDay (Req 4.1, 4.6)', () => {
  it('starts a streak at 1 on the first core day', async () => {
    const { api } = setup();
    await api.bootstrap(USER, { displayName: 'A', region: 'egypt' });
    const streak = await api.recordCoreDay(USER, '2026-06-18T07:00:00Z');
    expect(streak.current).toBe(1);
    expect(streak.longest).toBe(1);
    expect(streak.lastCoreDayAt).toBe('2026-06-18T07:00:00Z');
  });

  it('increments on a consecutive UTC day and resets after a gap', async () => {
    const { api } = setup();
    await api.bootstrap(USER, { displayName: 'A', region: 'egypt' });
    await api.recordCoreDay(USER, '2026-06-18T07:00:00Z');
    const day2 = await api.recordCoreDay(USER, '2026-06-19T07:00:00Z');
    expect(day2.current).toBe(2);
    expect(day2.longest).toBe(2);

    // Gap of several days → reset to 1, but longest is retained.
    const afterGap = await api.recordCoreDay(USER, '2026-06-25T07:00:00Z');
    expect(afterGap.current).toBe(1);
    expect(afterGap.longest).toBe(2);
  });

  it('is idempotent within the same UTC day (no double count)', async () => {
    const { api } = setup();
    await api.bootstrap(USER, { displayName: 'A', region: 'egypt' });
    await api.recordCoreDay(USER, '2026-06-18T07:00:00Z');
    const same = await api.recordCoreDay(USER, '2026-06-18T22:00:00Z');
    expect(same.current).toBe(1);
  });

  it('advanceStreak is a pure helper matching the rules', () => {
    const base = { current: 0, longest: 0, lastCoreDayAt: null, ramadanMode: false };
    expect(advanceStreak(base, '2026-06-18T00:00:00Z').current).toBe(1);
  });
});

describe('updateLocale (Req 2.3, 4.6)', () => {
  it('persists a locale switch and advances updated_at', async () => {
    const { store, api } = setup(() => T1);
    await api.bootstrap(USER, { displayName: 'A', region: 'egypt', createdAt: T0 });
    await store.updateProfile(USER, { updated_at: T0 });

    const updated = await api.updateLocale(USER, 'en');
    expect(updated.uiLocale).toBe('en');

    const row = (await store.findProfile(USER)) as ProfileRow;
    expect(row.ui_locale).toBe('en');
    expect(row.updated_at).toBe(T1); // write-touch rule applied
  });

  it('is a no-op (and leaves updated_at unchanged) when the locale is unchanged', async () => {
    const { store, api } = setup(() => T1);
    await api.bootstrap(USER, { displayName: 'A', region: 'egypt', createdAt: T0 });
    await store.updateProfile(USER, { updated_at: T0 }); // ui_locale defaults to 'ar'

    const same = await api.updateLocale(USER, 'ar');
    expect(same.uiLocale).toBe('ar');
    const row = (await store.findProfile(USER)) as ProfileRow;
    expect(row.updated_at).toBe(T0); // unchanged
  });

  it('throws when the profile does not exist', async () => {
    const { api } = setup();
    await expect(api.updateLocale(USER, 'en')).rejects.toBeInstanceOf(ProfileNotFoundError);
  });
});

describe('duplicate / second-row-creation rejection (Req 3.9)', () => {
  it('the persistence guard rejects a second profile row for the same user', async () => {
    const store = new InMemoryProfileStore();
    const api = new ProfileApi(store, { now: () => T1 });
    await api.bootstrap(USER, { displayName: 'A', region: 'egypt' });

    // A direct second-row insert (e.g. a concurrent create) is rejected, and the
    // existing profile is preserved (still exactly one row).
    const existing = (await store.findProfile(USER)) as ProfileRow;
    await expect(store.insertProfile(existing)).rejects.toBeInstanceOf(ProfileAlreadyExistsError);
    expect(store.profileCount(USER)).toBe(1);
  });

  it('bootstrap stays idempotent (never rejects) for an existing profile', async () => {
    const store = new InMemoryProfileStore();
    const api = new ProfileApi(store, { now: () => T1 });
    const first = await api.bootstrap(USER, { displayName: 'A', region: 'egypt' });
    const second = await api.bootstrap(USER, { displayName: 'CHANGED', region: 'international' });
    expect(second).toEqual(first); // unchanged, no duplicate
    expect(store.totalProfiles()).toBe(1);
  });
});
