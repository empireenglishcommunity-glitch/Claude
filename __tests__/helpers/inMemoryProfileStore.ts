/**
 * In-memory {@link ProfileStore} fake for deterministic, offline tests.
 *
 * This is NOT a test file (no `.test.ts` suffix, so Jest's `testMatch` ignores
 * it). It lets the Profile SDK (Task 3.2) run fully offline — no live Supabase —
 * for the bootstrap-idempotency property test (3.3) and the write/read unit
 * tests (3.5). It faithfully reproduces the one persistence invariant the SDK
 * relies on: `insertProfile` raises {@link ProfileAlreadyExistsError} when a row
 * for the same `user_id` already exists (the Postgres primary-key guard, Req 3.9).
 */
import {
  ProfileAlreadyExistsError,
  type ErrorRow,
  type ProfileRow,
  type ProfileStore,
  type RecordingRow,
} from '../../src/foundation/profile/profileApi';
import type { UUID } from '../../src/foundation/types';

export class InMemoryProfileStore implements ProfileStore {
  private readonly profiles = new Map<UUID, ProfileRow>();
  private readonly errors = new Map<UUID, ErrorRow[]>();
  private readonly recordings = new Map<UUID, RecordingRow[]>();

  /** Test helper: total number of profile rows for a user (must never exceed 1). */
  profileCount(userId: UUID): number {
    return this.profiles.has(userId) ? 1 : 0;
  }

  /** Test helper: total profile rows across all users. */
  totalProfiles(): number {
    return this.profiles.size;
  }

  /** Test helper: seed a recording row directly (AudioApi is Task 7). */
  seedRecording(row: RecordingRow): void {
    const list = this.recordings.get(row.user_id) ?? [];
    list.push(row);
    this.recordings.set(row.user_id, list);
  }

  async findProfile(userId: UUID): Promise<ProfileRow | null> {
    const row = this.profiles.get(userId);
    // Return a copy so callers cannot mutate stored state directly.
    return row ? { ...row } : null;
  }

  async insertProfile(row: ProfileRow): Promise<ProfileRow> {
    if (this.profiles.has(row.user_id)) {
      throw new ProfileAlreadyExistsError(row.user_id);
    }
    this.profiles.set(row.user_id, { ...row });
    return { ...row };
  }

  async updateProfile(userId: UUID, patch: Partial<ProfileRow>): Promise<ProfileRow> {
    const existing = this.profiles.get(userId);
    if (!existing) {
      throw new Error(`updateProfile called for non-existent user "${userId}".`);
    }
    const next = { ...existing, ...patch };
    this.profiles.set(userId, next);
    return { ...next };
  }

  async listErrors(userId: UUID): Promise<ErrorRow[]> {
    // Most-recent-first, mirroring the SupabaseProfileStore ordering.
    return [...(this.errors.get(userId) ?? [])].sort((a, b) =>
      b.occurred_at.localeCompare(a.occurred_at),
    );
  }

  async insertError(row: ErrorRow): Promise<ErrorRow> {
    const list = this.errors.get(row.user_id) ?? [];
    list.push({ ...row });
    this.errors.set(row.user_id, list);
    return { ...row };
  }

  async listRecordings(userId: UUID): Promise<RecordingRow[]> {
    return [...(this.recordings.get(userId) ?? [])];
  }
}
