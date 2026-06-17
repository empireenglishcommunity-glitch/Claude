-- ════════════════════════════════════════════════════════════════════════
-- Migration: Layer 0 — Row-Level Security (Project P1, Task 3.1)
-- ════════════════════════════════════════════════════════════════════════
--
-- Source of truth: design.md §4.2 ("Row-Level Security") + §9 Property 6
-- (tenant isolation), requirements.md Req 4.3, 4.4, 4.5.
--
-- The base schema (enum types + tables) is created in the prior migration
-- `20260617230000_layer0_schema.sql`, which DELIBERATELY omits RLS. This
-- migration turns RLS ON for the three learner-owned tables and adds the
-- per-table "own row" policies so a learner can read/write ONLY rows whose
-- `user_id` equals their authenticated identity (`auth.uid()`).
--
-- Why USING + WITH CHECK on every policy:
--   • USING      — filters which existing rows are visible to SELECT/UPDATE/
--                  DELETE (a learner sees only their own rows; everyone else's
--                  rows are invisible, satisfying Req 4.3/4.4).
--   • WITH CHECK  — constrains the row values a learner may INSERT/UPDATE, so a
--                  learner cannot write a row owned by another `user_id`.
--
-- With RLS enabled and no policy granting cross-tenant access, an unauthenticated
-- request (`auth.uid()` is NULL) matches no row and is denied (Req 4.5). The
-- `funnel_claim` table is intentionally NOT covered here: it is written/redeemed
-- server-side by an Edge Function using the service role (Task 5.x), never by a
-- learner session, so it stays RLS-locked-by-default with no learner policy.
-- ════════════════════════════════════════════════════════════════════════

-- ── Enable Row-Level Security on the learner-owned tables ────────────────
-- Once enabled, access is DENY-by-default until a policy explicitly allows it.
alter table learner_profile enable row level security;
alter table error_record    enable row level security;
alter table recording_ref   enable row level security;

-- ── learner_profile: a learner may touch only their own profile row ──────
-- (Req 4.3, 4.4) — `user_id` is the Supabase auth user id (= auth.uid()).
create policy own_profile on learner_profile
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── error_record: a learner may touch only their own error history ───────
create policy own_errors on error_record
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── recording_ref: a learner may touch only their own recording metadata ─
create policy own_recordings on recording_ref
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
