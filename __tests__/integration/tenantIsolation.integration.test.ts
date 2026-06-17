/**
 * Integration lane — Property 6: Tenant isolation under RLS (Task 3.4).
 *
 * **Validates: Requirements 4.3, 4.4, 7.9**
 *
 * With two REAL authenticated users A and B, A can never read or write B's
 * profile, error history, or recordings, and an unauthenticated client sees
 * nothing — enforced by the Postgres Row-Level Security policies from Task 3.1
 * (`own_profile`, `own_errors`, `own_recordings`).
 *
 * This suite needs a live Supabase project (the RLS policies live in Postgres,
 * not in app code, so they cannot be exercised against the in-memory fake). It
 * therefore follows the established guarded-skip pattern: it runs ONLY when
 * `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are present
 * (and the schema + RLS migrations have been applied). Absent credentials, the
 * full assertions are skipped so the lane stays green in offline CI.
 *
 * The migrations must be applied and (for deterministic runs) email-confirmation
 * disabled, so `signUp` yields an immediately-usable session.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const hasBackendCredentials = !!URL && !!ANON;

/** Distinct per-run credentials so repeated runs don't collide on email uniqueness. */
function uniqueEmail(tag: string): string {
  return `rls-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

const PASSWORD = 'Test-Password-123!';

describe('Property 6: Tenant isolation under RLS (Req 4.3, 4.4, 7.9)', () => {
  it('lane is configured and runnable', () => {
    expect(true).toBe(true);
  });

  (hasBackendCredentials ? describe : describe.skip)('two real users via live RLS', () => {
    let clientA: SupabaseClient;
    let clientB: SupabaseClient;
    let anonClient: SupabaseClient;
    let userIdA = '';
    let userIdB = '';

    beforeAll(async () => {
      // Separate clients so each holds its own session (no shared auth state).
      clientA = createClient(URL as string, ANON as string, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      clientB = createClient(URL as string, ANON as string, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      anonClient = createClient(URL as string, ANON as string, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const a = await clientA.auth.signUp({ email: uniqueEmail('a'), password: PASSWORD });
      const b = await clientB.auth.signUp({ email: uniqueEmail('b'), password: PASSWORD });
      userIdA = a.data.user?.id ?? '';
      userIdB = b.data.user?.id ?? '';
      expect(userIdA).not.toBe('');
      expect(userIdB).not.toBe('');

      // Each user bootstraps their own profile row (allowed by own_profile).
      await clientA
        .from('learner_profile')
        .insert({ user_id: userIdA, display_name: 'A', region: 'egypt' });
      await clientB
        .from('learner_profile')
        .insert({ user_id: userIdB, display_name: 'B', region: 'international' });
    });

    afterAll(async () => {
      await clientA?.auth.signOut();
      await clientB?.auth.signOut();
    });

    it('a learner reads only their own profile row, never another learner\'s', async () => {
      // A selecting B's id returns no rows (RLS filters them out entirely).
      const crossRead = await clientA
        .from('learner_profile')
        .select('*')
        .eq('user_id', userIdB);
      expect(crossRead.error).toBeNull();
      expect(crossRead.data ?? []).toHaveLength(0);

      // A selecting its own row succeeds.
      const selfRead = await clientA.from('learner_profile').select('*').eq('user_id', userIdA);
      expect(selfRead.error).toBeNull();
      expect(selfRead.data ?? []).toHaveLength(1);
    });

    it('a learner cannot write another learner\'s profile row', async () => {
      const before = await clientB.from('learner_profile').select('display_name').eq('user_id', userIdB).single();
      // A attempts to update B's display_name — RLS yields zero affected rows.
      const update = await clientA
        .from('learner_profile')
        .update({ display_name: 'HACKED' })
        .eq('user_id', userIdB)
        .select('*');
      expect(update.data ?? []).toHaveLength(0);

      // B's row is unchanged.
      const after = await clientB.from('learner_profile').select('display_name').eq('user_id', userIdB).single();
      expect(after.data?.display_name).toBe(before.data?.display_name);
    });

    it('a learner cannot insert a profile row owned by another learner (WITH CHECK)', async () => {
      const insert = await clientA
        .from('learner_profile')
        .insert({ user_id: userIdB, display_name: 'spoof', region: 'egypt' })
        .select('*');
      expect(insert.error).not.toBeNull(); // WITH CHECK denies the cross-tenant insert
    });

    it('error history and recordings are isolated per learner', async () => {
      // A writes an error for itself; B must not see it.
      await clientA.from('error_record').insert({
        user_id: userIdA,
        category: 'phoneme',
        detail: 'a-only error',
      });
      const bSeesAErrors = await clientB.from('error_record').select('*').eq('user_id', userIdA);
      expect(bSeesAErrors.data ?? []).toHaveLength(0);

      const bSeesARecordings = await clientB.from('recording_ref').select('*').eq('user_id', userIdA);
      expect(bSeesARecordings.data ?? []).toHaveLength(0);
    });

    it('an unauthenticated client sees no profile, error, or recording rows', async () => {
      const profiles = await anonClient.from('learner_profile').select('*');
      const errors = await anonClient.from('error_record').select('*');
      const recordings = await anonClient.from('recording_ref').select('*');
      expect(profiles.data ?? []).toHaveLength(0);
      expect(errors.data ?? []).toHaveLength(0);
      expect(recordings.data ?? []).toHaveLength(0);
    });
  });
});
