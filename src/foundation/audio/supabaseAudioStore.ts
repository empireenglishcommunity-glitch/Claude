/**
 * Supabase-backed implementation of the {@link AudioStore} port (Task 7.2).
 *
 * It wraps the shared Foundation backend client (the single backend boundary,
 * per design §1) and bridges two surfaces:
 *   • Supabase Storage (the private `recordings` bucket, Task 7.1) for the
 *     signed UPLOAD / PLAYBACK urls, and
 *   • the `recording_ref` table for recording metadata.
 *
 * ── Object key derivation ───────────────────────────────────────────────────
 * The SDK works with the logical `storage_path` `recordings/{userId}/{id}.m4a`
 * (bucket name + object key, matching design §4.1). Supabase Storage operates
 * on the object KEY within a bucket, so this adapter strips the leading
 * `recordings/` to derive `{userId}/{id}.m4a`. The Storage RLS policy (Task 7.1)
 * then checks `(storage.foldername(name))[1] = auth.uid()` against that key, and
 * the `own_recordings` RLS policy scopes the metadata table — so this module
 * performs no extra authorization (design §9 Property 6/8).
 *
 * ── Signed-url TTL ──────────────────────────────────────────────────────────
 * `createSignedUrl(key, expiresIn)` honours the requested playback TTL directly
 * (≤ 3600s, Req 7.7). For uploads, Supabase's `createSignedUploadUrl` issues a
 * single-use token; the SDK requests a ≤ 300s lifetime (Req 7.2) and that bound
 * is the contract the in-memory fake verifies. The `ttlSeconds` argument is
 * threaded through so the bound is explicit at this boundary.
 */
import type { SupabaseClient } from '../backendClient';
import { getBackendClient } from '../backendClient';
import type { RecordingRow } from '../profile/profileApi';
import type { RecordingRef, UUID } from '../types';
import {
  AudioError,
  RECORDINGS_BUCKET,
  type AudioStore,
  type SignedUploadUrl,
} from './audioApi';

const RECORDING_TABLE = 'recording_ref';

/** A generic storage/persistence failure surfaced from the backend. */
export class AudioBackendError extends AudioError {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

/** Strip the leading `recordings/` bucket segment to get the object key. */
function toObjectKey(storagePath: string): string {
  const prefix = `${RECORDINGS_BUCKET}/`;
  return storagePath.startsWith(prefix) ? storagePath.slice(prefix.length) : storagePath;
}

export class SupabaseAudioStore implements AudioStore {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient = getBackendClient()) {
    this.client = client;
  }

  async createSignedUploadUrl(storagePath: string, _ttlSeconds: number): Promise<SignedUploadUrl> {
    const key = toObjectKey(storagePath);
    const { data, error } = await this.client.storage
      .from(RECORDINGS_BUCKET)
      .createSignedUploadUrl(key);
    if (error || !data) {
      throw new AudioBackendError(
        `Failed to create signed upload url: ${error?.message ?? 'unknown error'}`,
        error,
      );
    }
    return { url: data.signedUrl, storagePath };
  }

  async createSignedPlaybackUrl(storagePath: string, ttlSeconds: number): Promise<string> {
    const key = toObjectKey(storagePath);
    const { data, error } = await this.client.storage
      .from(RECORDINGS_BUCKET)
      .createSignedUrl(key, ttlSeconds);
    if (error || !data) {
      throw new AudioBackendError(
        `Failed to create signed playback url: ${error?.message ?? 'unknown error'}`,
        error,
      );
    }
    return data.signedUrl;
  }

  async insertRecordingRow(row: RecordingRow): Promise<RecordingRow> {
    const { data, error } = await this.client
      .from(RECORDING_TABLE)
      .insert(row)
      .select('*')
      .single();
    if (error) {
      throw new AudioBackendError(`Failed to insert recording metadata: ${error.message}`, error);
    }
    return data as RecordingRow;
  }

  async listRecordingRows(userId: UUID, kind?: RecordingRef['kind']): Promise<RecordingRow[]> {
    let query = this.client.from(RECORDING_TABLE).select('*').eq('user_id', userId);
    if (kind) {
      query = query.eq('kind', kind);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      throw new AudioBackendError(`Failed to list recordings: ${error.message}`, error);
    }
    return (data as RecordingRow[] | null) ?? [];
  }
}
