/**
 * Property 8 — Audio path integrity (Task 7.3).
 *
 * **Validates: Requirements 7.2, 7.4**
 *
 * For any learner id + recording id, the signed UPLOAD url target and the
 * persisted `storage_path` are BOTH prefixed `recordings/{userId}/` for the
 * owning learner, and the requested upload-url TTL never exceeds 300s (Req 7.2).
 * Registering metadata for a path OUTSIDE the owning learner's prefix is
 * rejected and nothing is persisted (Req 7.4 / Property 8).
 *
 * The Audio SDK is exercised fully OFFLINE via the in-memory store fake, so the
 * test is deterministic and needs no live Supabase. Library: fast-check (≥100
 * iterations).
 */
import fc from 'fast-check';
import {
  AudioApi,
  AudioPathError,
  UPLOAD_URL_TTL_SECONDS,
  userPathPrefix,
} from '../../src/foundation/audio/audioApi';
import { InMemoryAudioStore } from '../helpers/inMemoryAudioStore';
import type { RecordingRef } from '../../src/foundation/types';

const RUNS = { numRuns: 200 } as const;
const FIXED_NOW = '2026-06-17T21:00:00.000Z';

const kindArb: fc.Arbitrary<RecordingRef['kind']> = fc.constantFrom(
  'baseline',
  'placement',
  'drill',
  'mission',
  'assessment',
  'milestone',
);

function makeApi(store: InMemoryAudioStore): AudioApi {
  return new AudioApi(store, { now: () => FIXED_NOW, uuid: () => 'fixed-id' });
}

describe('Property 8: Audio path integrity (Req 7.2, 7.4)', () => {
  it('upload url + persisted storage_path are prefixed recordings/{userId}/', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), kindArb, async (userId, recordingId, kind) => {
        const store = new InMemoryAudioStore();
        const api = makeApi(store);
        const prefix = userPathPrefix(userId);

        const { url, storagePath } = await api.getUploadUrl(userId, recordingId);

        // The returned storage path and the minted url both live under the prefix.
        expect(storagePath.startsWith(prefix)).toBe(true);
        expect(url).toContain(prefix);

        // The requested upload TTL never exceeds 300s (Req 7.2).
        const minted = store.uploadUrls[store.uploadUrls.length - 1];
        expect(minted.ttlSeconds).toBeLessThanOrEqual(300);
        expect(minted.ttlSeconds).toBe(UPLOAD_URL_TTL_SECONDS);

        // Registering metadata for that owned path persists with the same prefix.
        const ref = await api.registerRecording(userId, {
          storagePath,
          kind,
          referenceText: null,
          durationMs: 1000,
          byteSize: 2048,
          createdAt: FIXED_NOW,
          accentScoreAtTime: null,
        });
        expect(ref.storagePath.startsWith(prefix)).toBe(true);
        expect(store.rowCount(userId)).toBe(1);
        return true;
      }),
      RUNS,
    );
  });

  it('registering a path outside the owning prefix is rejected and persists nothing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        kindArb,
        async (userId, otherUserId, kind) => {
          fc.pre(userId !== otherUserId);
          const store = new InMemoryAudioStore();
          const api = makeApi(store);

          // A path under a DIFFERENT learner's prefix must be rejected (Req 7.4).
          const foreignPath = `${userPathPrefix(otherUserId)}some-recording.m4a`;
          await expect(
            api.registerRecording(userId, {
              storagePath: foreignPath,
              kind,
              referenceText: null,
              durationMs: 500,
              byteSize: 1024,
              createdAt: FIXED_NOW,
              accentScoreAtTime: null,
            }),
          ).rejects.toBeInstanceOf(AudioPathError);

          // Nothing persisted for either learner.
          expect(store.totalRows()).toBe(0);
          return true;
        },
      ),
      RUNS,
    );
  });
});
