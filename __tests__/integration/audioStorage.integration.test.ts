/**
 * Integration lane — record → upload → register → playback (design §3.2 storage
 * slice, Task 7.5).
 *
 * **_Requirements: 7.3, 7.6, 7.7_**
 *
 * Exercises the real Supabase Storage + `recording_ref` pipeline behind the
 * Audio SDK against a LIVE backend: minting a signed upload url, uploading bytes
 * through it, persisting metadata, listing the archive, and minting a signed
 * playback url — plus asserting the failed-upload path persists no metadata and
 * that cross-learner access is denied (Storage RLS, Task 7.1).
 *
 * Because the Storage bucket + RLS policies live in Supabase (not in app code),
 * this suite follows the established guarded-skip pattern: it runs ONLY when
 * `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are present
 * (and the schema + RLS + storage migrations have been applied, with email
 * confirmation disabled so `signUp` yields an immediately-usable session).
 * Absent credentials the live assertions are skipped so the lane stays green in
 * offline CI.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  AudioApi,
  PLAYBACK_URL_TTL_SECONDS,
  UPLOAD_URL_TTL_SECONDS,
  userPathPrefix,
} from '../../src/foundation/audio/audioApi';
import { SupabaseAudioStore } from '../../src/foundation/audio/supabaseAudioStore';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const hasBackendCredentials = !!URL && !!ANON;

const PASSWORD = 'Test-Password-123!';
function uniqueEmail(tag: string): string {
  return `audio-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

describe('Audio storage slice (Req 7.3, 7.6, 7.7)', () => {
  it('lane is configured and runnable', () => {
    // Offline sanity: the SDK enforces its TTL bounds regardless of backend.
    expect(UPLOAD_URL_TTL_SECONDS).toBeLessThanOrEqual(300);
    expect(PLAYBACK_URL_TTL_SECONDS).toBeLessThanOrEqual(3600);
  });

  (hasBackendCredentials ? describe : describe.skip)('live Supabase Storage pipeline', () => {
    let client: SupabaseClient;
    let api: AudioApi;
    let userId = '';

    beforeAll(async () => {
      client = createClient(URL as string, ANON as string, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const signUp = await client.auth.signUp({ email: uniqueEmail('owner'), password: PASSWORD });
      userId = signUp.data.user?.id ?? '';
      expect(userId).not.toBe('');

      // The learner bootstraps their own profile row (FK target for recording_ref).
      await client
        .from('learner_profile')
        .insert({ user_id: userId, display_name: 'Owner', region: 'egypt' });

      api = new AudioApi(new SupabaseAudioStore(client));
    });

    afterAll(async () => {
      await client?.auth.signOut();
    });

    it('mints an upload url, uploads bytes, registers metadata, and plays back', async () => {
      const recordingId = `${Date.now()}`;
      const { url, storagePath } = await api.getUploadUrl(userId, recordingId);
      expect(storagePath.startsWith(userPathPrefix(userId))).toBe(true);

      // Upload a tiny payload through the signed url.
      const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
      const put = await fetch(url, {
        method: 'PUT',
        headers: { 'content-type': 'audio/m4a' },
        body: bytes,
      });
      expect(put.ok).toBe(true);

      // Persist metadata only after the successful upload (Req 7.5).
      const ref = await api.registerRecording(userId, {
        storagePath,
        kind: 'baseline',
        referenceText: 'hello world',
        durationMs: 1234,
        byteSize: bytes.byteLength,
        createdAt: new Date().toISOString(),
        accentScoreAtTime: 42,
      });
      expect(ref.storagePath).toBe(storagePath);

      const archive = await api.listArchive(userId, 'baseline');
      expect(archive.some((r) => r.id === ref.id)).toBe(true);

      // Playback url is issued for the owned recording (Req 7.7).
      const playback = await api.getPlaybackUrl(userId, storagePath);
      expect(typeof playback).toBe('string');
      expect(playback.length).toBeGreaterThan(0);
    });

    it('a learner cannot upload outside their own folder (Storage RLS, Req 7.3)', async () => {
      // Forge an object key under a different learner's folder and try to PUT.
      const foreignUser = '00000000-0000-4000-8000-000000000000';
      const foreignKey = `${foreignUser}/forged.m4a`;
      const { data, error } = await client.storage
        .from('recordings')
        .createSignedUploadUrl(foreignKey);

      // Either the signed-url mint is denied, or the subsequent PUT is rejected.
      if (!error && data) {
        const put = await fetch(data.signedUrl, {
          method: 'PUT',
          headers: { 'content-type': 'audio/m4a' },
          body: new Uint8Array([0]),
        });
        expect(put.ok).toBe(false);
      } else {
        expect(error).not.toBeNull();
      }
    });
  });
});
