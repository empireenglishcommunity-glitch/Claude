/**
 * In-memory {@link AudioStore} fake for deterministic, offline tests.
 *
 * This is NOT a test file (no `.test.ts` suffix, so Jest's `testMatch` ignores
 * it). It lets the Audio SDK (Task 7.2) run fully offline — no live Supabase —
 * for the audio-path-integrity property test (7.3), the metadata round-trip
 * property test (7.4), and the storage-slice integration test (7.5).
 *
 * It faithfully reproduces the contract the SDK relies on:
 *   • signed-url minting records the requested TTL (so tests can assert the
 *     ≤ 300s upload / ≤ 3600s playback bounds, Req 7.2/7.7) and embeds an
 *     `expires` query param;
 *   • `insertRecordingRow` stores metadata keyed by `user_id`;
 *   • `listRecordingRows` returns the owning learner's rows most-recent-first,
 *     filtered by `kind` when provided (mirroring the SupabaseAudioStore order).
 */
import type {
  AudioStore,
  SignedUploadUrl,
} from '../../src/foundation/audio/audioApi';
import type { RecordingRow } from '../../src/foundation/profile/profileApi';
import type { RecordingRef, UUID } from '../../src/foundation/types';

/** A record of a minted signed url (for test assertions). */
export interface MintedUrl {
  storagePath: string;
  ttlSeconds: number;
  url: string;
}

export class InMemoryAudioStore implements AudioStore {
  private readonly recordings = new Map<UUID, RecordingRow[]>();

  /** Every signed UPLOAD url minted, in order (test helper). */
  readonly uploadUrls: MintedUrl[] = [];
  /** Every signed PLAYBACK url minted, in order (test helper). */
  readonly playbackUrls: MintedUrl[] = [];

  /** Test helper: total recording rows for a user. */
  rowCount(userId: UUID): number {
    return (this.recordings.get(userId) ?? []).length;
  }

  /** Test helper: total recording rows across all users. */
  totalRows(): number {
    let n = 0;
    for (const list of this.recordings.values()) n += list.length;
    return n;
  }

  async createSignedUploadUrl(storagePath: string, ttlSeconds: number): Promise<SignedUploadUrl> {
    const url = `memory://upload/${storagePath}?token=${Math.random()
      .toString(16)
      .slice(2)}&expires=${ttlSeconds}`;
    this.uploadUrls.push({ storagePath, ttlSeconds, url });
    return { url, storagePath };
  }

  async createSignedPlaybackUrl(storagePath: string, ttlSeconds: number): Promise<string> {
    const url = `memory://playback/${storagePath}?token=${Math.random()
      .toString(16)
      .slice(2)}&expires=${ttlSeconds}`;
    this.playbackUrls.push({ storagePath, ttlSeconds, url });
    return url;
  }

  async insertRecordingRow(row: RecordingRow): Promise<RecordingRow> {
    const list = this.recordings.get(row.user_id) ?? [];
    list.push({ ...row });
    this.recordings.set(row.user_id, list);
    return { ...row };
  }

  async listRecordingRows(userId: UUID, kind?: RecordingRef['kind']): Promise<RecordingRow[]> {
    const list = [...(this.recordings.get(userId) ?? [])];
    const filtered = kind ? list.filter((r) => r.kind === kind) : list;
    // Most-recent-first, mirroring the SupabaseAudioStore ordering.
    return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}
