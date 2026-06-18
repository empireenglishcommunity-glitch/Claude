/**
 * Property 9 — Recording metadata round-trip (Task 7.4).
 *
 * **Validates: Requirements 7.5, 7.8**
 *
 * For any registered recording metadata, `listArchive` returns equivalent
 * metadata (a faithful round-trip), the archive contains ONLY the owning
 * learner's recordings (never another learner's — Req 7.9 tenant scoping), and
 * the optional `kind` filter returns exactly the rows of that kind.
 *
 * The Audio SDK is exercised fully OFFLINE via the in-memory store fake, so the
 * test is deterministic and needs no live Supabase. Library: fast-check (≥100
 * iterations).
 */
import fc from 'fast-check';
import { AudioApi, buildStoragePath } from '../../src/foundation/audio/audioApi';
import { InMemoryAudioStore } from '../helpers/inMemoryAudioStore';
import type { RecordingRef } from '../../src/foundation/types';

const RUNS = { numRuns: 150 } as const;

const KINDS: RecordingRef['kind'][] = [
  'baseline',
  'placement',
  'drill',
  'mission',
  'assessment',
  'milestone',
];

/** Arbitrary recording metadata (sans id/storagePath, which the test derives). */
const metaArb = fc.record({
  recordingId: fc.uuid(),
  kind: fc.constantFrom(...KINDS),
  referenceText: fc.option(fc.string(), { nil: null }),
  durationMs: fc.integer({ min: 0, max: 600_000 }),
  byteSize: fc.integer({ min: 0, max: 10_000_000 }),
  accentScoreAtTime: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
  // Distinct timestamps so ordering is well-defined.
  createdAtMs: fc.integer({ min: 0, max: 4_000_000_000_000 }),
});

let idCounter = 0;
function makeApi(store: InMemoryAudioStore): AudioApi {
  return new AudioApi(store, { uuid: () => `rec-${++idCounter}` });
}

describe('Property 9: Recording metadata round-trip (Req 7.5, 7.8)', () => {
  it('listArchive returns equivalent metadata for every registered recording', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(metaArb, { minLength: 1, maxLength: 8 }),
        async (userId, metas) => {
          idCounter = 0;
          const store = new InMemoryAudioStore();
          const api = makeApi(store);

          const registered: RecordingRef[] = [];
          for (const m of metas) {
            const storagePath = buildStoragePath(userId, m.recordingId);
            const ref = await api.registerRecording(userId, {
              storagePath,
              kind: m.kind,
              referenceText: m.referenceText,
              durationMs: m.durationMs,
              byteSize: m.byteSize,
              createdAt: new Date(m.createdAtMs).toISOString(),
              accentScoreAtTime: m.accentScoreAtTime,
            });
            registered.push(ref);
          }

          const archive = await api.listArchive(userId);
          expect(archive).toHaveLength(registered.length);

          // Every registered recording appears in the archive, field-for-field.
          for (const ref of registered) {
            const found = archive.find((a) => a.id === ref.id);
            expect(found).toBeDefined();
            expect(found).toEqual(ref);
          }
          return true;
        },
      ),
      RUNS,
    );
  });

  it('archive returns only the owner\'s recordings and respects the kind filter', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.array(metaArb, { minLength: 1, maxLength: 6 }),
        fc.array(metaArb, { minLength: 1, maxLength: 6 }),
        fc.constantFrom(...KINDS),
        async (userA, userB, metasA, metasB, filterKind) => {
          fc.pre(userA !== userB);
          idCounter = 0;
          const store = new InMemoryAudioStore();
          const api = makeApi(store);

          const register = async (userId: string, metas: typeof metasA) => {
            for (const m of metas) {
              await api.registerRecording(userId, {
                storagePath: buildStoragePath(userId, m.recordingId),
                kind: m.kind,
                referenceText: m.referenceText,
                durationMs: m.durationMs,
                byteSize: m.byteSize,
                createdAt: new Date(m.createdAtMs).toISOString(),
                accentScoreAtTime: m.accentScoreAtTime,
              });
            }
          };
          await register(userA, metasA);
          await register(userB, metasB);

          // A's archive contains only A's recordings (never B's) — Req 7.9 scoping.
          const archiveA = await api.listArchive(userA);
          expect(archiveA).toHaveLength(metasA.length);
          for (const ref of archiveA) {
            expect(ref.storagePath.startsWith(`recordings/${userA}/`)).toBe(true);
          }

          // The kind filter returns exactly A's rows of that kind (Req 7.8).
          const filtered = await api.listArchive(userA, filterKind);
          const expectedCount = metasA.filter((m) => m.kind === filterKind).length;
          expect(filtered).toHaveLength(expectedCount);
          for (const ref of filtered) {
            expect(ref.kind).toBe(filterKind);
          }
          return true;
        },
      ),
      RUNS,
    );
  });

  it('archive is ordered most-recent-first', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uniqueArray(fc.integer({ min: 0, max: 4_000_000_000_000 }), {
          minLength: 2,
          maxLength: 8,
        }),
        async (userId, createdMsList) => {
          idCounter = 0;
          const store = new InMemoryAudioStore();
          const api = makeApi(store);

          let i = 0;
          for (const ms of createdMsList) {
            await api.registerRecording(userId, {
              storagePath: buildStoragePath(userId, `r${i++}`),
              kind: 'drill',
              referenceText: null,
              durationMs: 1000,
              byteSize: 1024,
              createdAt: new Date(ms).toISOString(),
              accentScoreAtTime: null,
            });
          }

          const archive = await api.listArchive(userId);
          const times = archive.map((a) => Date.parse(a.createdAt));
          const sortedDesc = [...times].sort((a, b) => b - a);
          expect(times).toEqual(sortedDesc);
          return true;
        },
      ),
      RUNS,
    );
  });
});
