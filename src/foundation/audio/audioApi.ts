/**
 * Audio storage SDK — private per-learner recordings (Task 7.2).
 *
 * Implements the design §6 `AudioApi` contract:
 *   • `getUploadUrl(userId, recordingId)`   — a short-lived signed UPLOAD url
 *     (≤ 300s, Req 7.2) targeting `recordings/{userId}/{recordingId}.m4a`.
 *   • `registerRecording(userId, ref)`      — persists recording metadata AFTER
 *     a successful upload, only for a path under `recordings/{userId}/` (Req 7.4,
 *     7.5).
 *   • `getPlaybackUrl(userId, storagePath)` — a short-lived signed playback url
 *     (≤ 3600s, Req 7.7); denies paths the learner does not own (Req 7.9).
 *   • `listArchive(userId, kind?)`          — the owning learner's recordings,
 *     optional kind filter, most-recent-first (Req 7.8).
 *
 * ── Testability decision (mirrors ProfileStore / ClaimStore) ────────────────
 * The SDK depends on a small **persistence/storage port** ({@link AudioStore})
 * rather than importing the Supabase client directly. Production wires the
 * {@link SupabaseAudioStore} (which wraps the shared backend client's Storage +
 * the `recording_ref` table); tests inject an in-memory fake so the whole SDK
 * runs deterministically and fully offline — no live Supabase needed (Property
 * 8 / Task 7.3, Property 9 / Task 7.4, integration Task 7.5). A `now()` clock and
 * `uuid()` generator are likewise injectable for determinism.
 *
 * ── Path-prefix invariant (Property 8, Req 7.2/7.4/7.9) ─────────────────────
 * Every path this SDK produces or accepts is validated against the owning
 * learner's prefix `recordings/{userId}/`. `getUploadUrl` builds the path so it
 * is correct by construction; `registerRecording` rejects an out-of-prefix
 * `storagePath`; `getPlaybackUrl` rejects a path the learner does not own. This
 * is the app-side half of the defence; the Storage RLS policy (Task 7.1) is the
 * backend half.
 *
 * ── Duration units note ─────────────────────────────────────────────────────
 * The persisted `recording_ref.duration_ms` column and the domain
 * `RecordingRef.durationMs` field (design §4.1/§4.2) are the storage of record,
 * so this SDK persists/returns milliseconds. (Requirement 7.5's prose says
 * "duration in seconds"; the design schema — authoritative here, mirroring the
 * SubLevel reconciliation already documented in `src/foundation/types` — uses
 * `duration_ms`.)
 *
 * Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9.
 */
import type { ISODateTime, RecordingRef, UUID } from '../types';
import type { RecordingRow } from '../profile/profileApi';

// ═══════════════════════════════════════════════════════════════════════════
// Constants — bucket, TTL bounds, path scheme
// ═══════════════════════════════════════════════════════════════════════════

/** The private Storage bucket holding learner recordings (Task 7.1). */
export const RECORDINGS_BUCKET = 'recordings';

/** Compressed recording file extension (design §1 — mono AAC/m4a). */
export const RECORDING_EXTENSION = 'm4a';

/** Max signed UPLOAD url lifetime — 300 seconds (Requirement 7.2). */
export const UPLOAD_URL_TTL_SECONDS = 300;

/** Max signed PLAYBACK url lifetime — 3600 seconds (Requirement 7.7). */
export const PLAYBACK_URL_TTL_SECONDS = 3600;

/** The owning-learner path prefix every recording must live under (Req 7.4). */
export function userPathPrefix(userId: UUID): string {
  return `${RECORDINGS_BUCKET}/${userId}/`;
}

/** Build the canonical storage path for a recording (design §4.1 storagePath). */
export function buildStoragePath(userId: UUID, recordingId: UUID): string {
  return `${userPathPrefix(userId)}${recordingId}.${RECORDING_EXTENSION}`;
}

/** True iff `storagePath` is under the owning learner's prefix (Property 8). */
export function isOwnedPath(userId: UUID, storagePath: string): boolean {
  return storagePath.startsWith(userPathPrefix(userId));
}

// ═══════════════════════════════════════════════════════════════════════════
// Typed errors
// ═══════════════════════════════════════════════════════════════════════════

/** Base class for all Audio SDK errors. */
export class AudioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * Raised when a path is not under the owning learner's `recordings/{userId}/`
 * prefix on an upload-url request or a metadata registration (Req 7.3, 7.4).
 */
export class AudioPathError extends AudioError {
  constructor(
    public readonly userId: UUID,
    public readonly storagePath: string,
  ) {
    super(
      `Storage path "${storagePath}" is not under the owning learner's prefix "${userPathPrefix(
        userId,
      )}".`,
    );
  }
}

/**
 * Raised when a learner requests playback (or any access to) a recording that
 * does not belong to them (Req 7.9). No metadata or content is disclosed.
 */
export class AudioAccessDeniedError extends AudioError {
  constructor(
    public readonly userId: UUID,
    public readonly storagePath: string,
  ) {
    super('Access to the requested recording is denied.');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Persistence / storage port (implemented by SupabaseAudioStore + a fake)
// ═══════════════════════════════════════════════════════════════════════════

/** Result of minting a signed upload url. */
export interface SignedUploadUrl {
  url: string;
  storagePath: string;
}

/**
 * The storage port the SDK depends on. Implemented by {@link SupabaseAudioStore}
 * in production and by an in-memory fake in tests.
 *
 * Implementations:
 *   • `createSignedUploadUrl` / `createSignedPlaybackUrl` MUST mint a url whose
 *     validity does not exceed `ttlSeconds` (the SDK requests ≤ 300s / ≤ 3600s).
 *   • `insertRecordingRow` persists metadata for a SUCCESSFUL upload only.
 *   • `listRecordingRows` returns the owning learner's rows most-recent-first,
 *     filtered by `kind` when provided.
 */
export interface AudioStore {
  createSignedUploadUrl(storagePath: string, ttlSeconds: number): Promise<SignedUploadUrl>;
  createSignedPlaybackUrl(storagePath: string, ttlSeconds: number): Promise<string>;
  insertRecordingRow(row: RecordingRow): Promise<RecordingRow>;
  listRecordingRows(userId: UUID, kind?: RecordingRef['kind']): Promise<RecordingRow[]>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Row ⇆ domain mapping
// ═══════════════════════════════════════════════════════════════════════════

/** Map a `recording_ref` row to the domain {@link RecordingRef}. */
export function recordingRowToDomain(row: RecordingRow): RecordingRef {
  return {
    id: row.id,
    storagePath: row.storage_path,
    kind: row.kind,
    referenceText: row.reference_text,
    durationMs: row.duration_ms,
    byteSize: row.byte_size,
    createdAt: row.created_at,
    accentScoreAtTime: row.accent_score_at_time,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// id generation (mirrors profileApi defaultUuid)
// ═══════════════════════════════════════════════════════════════════════════

function defaultUuid(): UUID {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// The Audio SDK
// ═══════════════════════════════════════════════════════════════════════════

export interface AudioApiOptions {
  /** Injectable clock for deterministic `createdAt` defaults (tests). */
  now?: () => ISODateTime;
  /** Injectable id generator for new recording rows (tests). */
  uuid?: () => UUID;
}

/**
 * Requirement-faithful realization of the design §6 `AudioApi`. (Named to mirror
 * the `ProfileApi` class realization; it depends only on the {@link AudioStore}
 * port so it runs fully offline in tests.)
 */
export class AudioApi {
  private readonly store: AudioStore;
  private readonly now: () => ISODateTime;
  private readonly uuid: () => UUID;

  constructor(store: AudioStore, options: AudioApiOptions = {}) {
    this.store = store;
    this.now = options.now ?? (() => new Date().toISOString());
    this.uuid = options.uuid ?? defaultUuid;
  }

  /**
   * Return a short-lived signed UPLOAD url (≤ 300s, Req 7.2) for the recording,
   * scoped to `recordings/{userId}/{recordingId}.m4a`. The path is correct by
   * construction (always under the owning learner's prefix → Property 8).
   */
  async getUploadUrl(userId: UUID, recordingId: UUID): Promise<SignedUploadUrl> {
    const storagePath = buildStoragePath(userId, recordingId);
    // Defensive guard (correct by construction, but keeps the invariant local).
    if (!isOwnedPath(userId, storagePath)) {
      throw new AudioPathError(userId, storagePath);
    }
    const signed = await this.store.createSignedUploadUrl(storagePath, UPLOAD_URL_TTL_SECONDS);
    return { url: signed.url, storagePath };
  }

  /**
   * Persist recording metadata after a successful upload (Req 7.5). The
   * `storagePath` MUST be under the owning learner's prefix (Req 7.4); otherwise
   * the write is rejected and nothing is persisted. Returns the stored
   * {@link RecordingRef} with its generated id.
   *
   * NOTE (Req 7.6): this is called ONLY on a successful upload. A failed upload
   * never reaches here, so no metadata is persisted — the caller surfaces the
   * upload error instead.
   */
  async registerRecording(userId: UUID, ref: Omit<RecordingRef, 'id'>): Promise<RecordingRef> {
    if (!isOwnedPath(userId, ref.storagePath)) {
      throw new AudioPathError(userId, ref.storagePath);
    }
    const row: RecordingRow = {
      id: this.uuid(),
      user_id: userId,
      storage_path: ref.storagePath,
      kind: ref.kind,
      reference_text: ref.referenceText,
      duration_ms: ref.durationMs,
      byte_size: ref.byteSize,
      accent_score_at_time: ref.accentScoreAtTime,
      created_at: ref.createdAt ?? this.now(),
    };
    const inserted = await this.store.insertRecordingRow(row);
    return recordingRowToDomain(inserted);
  }

  /**
   * Return a short-lived signed PLAYBACK url (≤ 3600s, Req 7.7) for one of the
   * learner's recordings. If the path is not owned by `userId`, access is
   * denied without disclosing the recording (Req 7.9).
   */
  async getPlaybackUrl(userId: UUID, storagePath: string): Promise<string> {
    if (!isOwnedPath(userId, storagePath)) {
      throw new AudioAccessDeniedError(userId, storagePath);
    }
    return this.store.createSignedPlaybackUrl(storagePath, PLAYBACK_URL_TTL_SECONDS);
  }

  /**
   * Return the owning learner's recording archive (Req 7.8), optionally filtered
   * by `kind`, most-recent-first. Only the owner's rows are returned (Req 7.9 /
   * tenant isolation), enforced by both this SDK's `userId` scoping and RLS.
   */
  async listArchive(userId: UUID, kind?: RecordingRef['kind']): Promise<RecordingRef[]> {
    const rows = await this.store.listRecordingRows(userId, kind);
    return rows.map(recordingRowToDomain);
  }
}

/**
 * Construct the production Audio SDK backed by Supabase. Imported lazily so
 * tests that inject a fake store never pull in the backend client (mirrors
 * `createProfileApi`).
 */
export async function createAudioApi(options: AudioApiOptions = {}): Promise<AudioApi> {
  const { SupabaseAudioStore } = await import('./supabaseAudioStore');
  return new AudioApi(new SupabaseAudioStore(), options);
}
