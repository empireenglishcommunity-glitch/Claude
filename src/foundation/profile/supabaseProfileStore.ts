/**
 * Supabase-backed implementation of the {@link ProfileStore} persistence port
 * (Task 3.2). It wraps the shared Foundation backend client (never importing a
 * provider SDK at a call site beyond the single backend boundary, per design §1)
 * and maps the `learner_profile`, `error_record`, and `recording_ref` tables to
 * the row shapes the Profile SDK consumes.
 *
 * Row-Level Security (Task 3.1) makes every query implicitly scoped to the
 * authenticated learner: the policies allow a learner to read/write ONLY rows
 * whose `user_id` equals `auth.uid()`. This module therefore performs no extra
 * authorization — it relies on RLS for tenant isolation (design §9 Property 6).
 */
import type { SupabaseClient } from '../backendClient';
import { getBackendClient } from '../backendClient';
import {
  ProfileAlreadyExistsError,
  ProfileError,
  type ErrorRow,
  type ProfileRow,
  type ProfileStore,
  type RecordingRow,
} from './profileApi';
import type { UUID } from '../types';

/** Postgres unique-violation SQLSTATE (raised when a duplicate PK is inserted). */
const PG_UNIQUE_VIOLATION = '23505';

/** A generic persistence failure surfaced from the backend. */
export class BackendPersistenceError extends ProfileError {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

const PROFILE_TABLE = 'learner_profile';
const ERROR_TABLE = 'error_record';
const RECORDING_TABLE = 'recording_ref';

export class SupabaseProfileStore implements ProfileStore {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient = getBackendClient()) {
    this.client = client;
  }

  async findProfile(userId: UUID): Promise<ProfileRow | null> {
    const { data, error } = await this.client
      .from(PROFILE_TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new BackendPersistenceError(`Failed to read profile: ${error.message}`, error);
    return (data as ProfileRow | null) ?? null;
  }

  async insertProfile(row: ProfileRow): Promise<ProfileRow> {
    const { data, error } = await this.client
      .from(PROFILE_TABLE)
      .insert(row)
      .select('*')
      .single();
    if (error) {
      if (error.code === PG_UNIQUE_VIOLATION) {
        throw new ProfileAlreadyExistsError(row.user_id);
      }
      throw new BackendPersistenceError(`Failed to insert profile: ${error.message}`, error);
    }
    return data as ProfileRow;
  }

  async updateProfile(userId: UUID, patch: Partial<ProfileRow>): Promise<ProfileRow> {
    const { data, error } = await this.client
      .from(PROFILE_TABLE)
      .update(patch)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw new BackendPersistenceError(`Failed to update profile: ${error.message}`, error);
    return data as ProfileRow;
  }

  async listErrors(userId: UUID): Promise<ErrorRow[]> {
    const { data, error } = await this.client
      .from(ERROR_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('occurred_at', { ascending: false });
    if (error) throw new BackendPersistenceError(`Failed to list errors: ${error.message}`, error);
    return (data as ErrorRow[] | null) ?? [];
  }

  async insertError(row: ErrorRow): Promise<ErrorRow> {
    const { data, error } = await this.client
      .from(ERROR_TABLE)
      .insert(row)
      .select('*')
      .single();
    if (error) throw new BackendPersistenceError(`Failed to insert error: ${error.message}`, error);
    return data as ErrorRow;
  }

  async listRecordings(userId: UUID): Promise<RecordingRow[]> {
    const { data, error } = await this.client
      .from(RECORDING_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new BackendPersistenceError(`Failed to list recordings: ${error.message}`, error);
    return (data as RecordingRow[] | null) ?? [];
  }
}
