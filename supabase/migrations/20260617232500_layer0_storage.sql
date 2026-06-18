-- ════════════════════════════════════════════════════════════════════════
-- Migration: Layer 0 — Private audio storage bucket + path policy (Task 7.1)
-- ════════════════════════════════════════════════════════════════════════
--
-- Source of truth: design.md §1 (Audio Storage row), §4.2 (recording_ref +
-- "storage_path MUST be prefixed recordings/{user_id}/"), §9 Property 6/8;
-- requirements.md Req 7.2, 7.3, 7.4, 7.9.
--
-- This migration stands up the PRIVATE Supabase Storage bucket `recordings`
-- and the per-user Row-Level Security policies on `storage.objects` that
-- enforce the path prefix `recordings/{auth.uid()}/...` for every read and
-- write. Combined with the `recording_ref` metadata table (created in
-- `20260617230000_layer0_schema.sql`) and its `own_recordings` RLS policy
-- (`20260617231500_layer0_rls.sql`), this gives end-to-end per-learner audio
-- isolation: a learner can only touch storage objects, and only see metadata,
-- under their own folder.
--
-- ── Object key vs. logical storage_path ─────────────────────────────────
-- The bucket is named `recordings`. Within the bucket, each object's key is
-- `{user_id}/{recordingId}.m4a`, so the object's FIRST folder segment is the
-- owning learner's id. The AudioApi SDK persists the logical `storage_path`
-- as `recordings/{user_id}/{recordingId}.m4a` (bucket name + object key) to
-- match design §4.1's RecordingRef.storagePath; the SupabaseAudioStore strips
-- the leading `recordings/` to derive the object key. The policy below checks
-- `(storage.foldername(name))[1] = auth.uid()` against that object key.
--
-- ── Private bucket + signed-URL-only access (Req 7.2, 7.7) ──────────────
-- `public = false` means objects are NEVER served over a public URL. The app
-- uploads via a short-lived signed UPLOAD url (≤ 300s, Req 7.2) and plays back
-- via a short-lived signed url (≤ 3600s, Req 7.7), both minted by the backend.
-- The RLS policies here are the second line of defence behind those signed
-- URLs: even a leaked/forged path cannot escape the owning learner's folder.
-- ════════════════════════════════════════════════════════════════════════

-- ── Create the PRIVATE `recordings` bucket (idempotent) ──────────────────
-- public = false → objects are accessible only through signed URLs.
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

-- ── Per-user storage path policies on storage.objects ────────────────────
-- DENY-by-default: storage.objects already has RLS enabled by Supabase. We add
-- one policy per operation, each constraining access to objects whose first
-- folder segment equals the authenticated learner's id, inside the
-- `recordings` bucket only. `(storage.foldername(name))[1]` is the object key's
-- first path segment = `{user_id}` (Req 7.4 prefix enforcement, Req 7.9 deny
-- cross-learner access).

-- SELECT (download / signed playback url issuance) — own folder only.
create policy recordings_own_select on storage.objects
  for select
  using (
    bucket_id = 'recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- INSERT (upload) — may only write into own folder (Req 7.2, 7.3).
create policy recordings_own_insert on storage.objects
  for insert
  with check (
    bucket_id = 'recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- UPDATE (overwrite/upsert) — own folder only, on both the existing and new row.
create policy recordings_own_update on storage.objects
  for update
  using (
    bucket_id = 'recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- DELETE — own folder only.
create policy recordings_own_delete on storage.objects
  for delete
  using (
    bucket_id = 'recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
