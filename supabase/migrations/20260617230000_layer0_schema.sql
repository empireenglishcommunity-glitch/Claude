-- ════════════════════════════════════════════════════════════════════════
-- Migration: Layer 0 — Unified Learner Profile schema (Project P1, Task 2.1)
-- ════════════════════════════════════════════════════════════════════════
--
-- Source of truth: design.md §4.2 (Postgres schema) + §4.1 (domain model),
-- requirements.md Req 3.1, 3.2, 3.3.
--
-- This migration creates the Layer 0 storage of record: the enum types and the
-- four core tables (learner_profile, error_record, recording_ref, funnel_claim)
-- with their indexes, CHECK constraints, and defaults.
--
-- RECONCILIATION NOTE (Task 1.2 + Req 3.3/3.8): design §4.1 originally modelled
-- `sub_level` as a 12-value string union ("0.1".."L3.Platinum"). The REQUIREMENTS
-- are authoritative and define `sub_level` as an INTEGER in [1,12]; the shared
-- TypeScript `SubLevel` type (src/foundation/types) already uses integers 1–12.
-- This schema therefore stores `sub_level` as a `smallint` constrained to [1,12]
-- (default 1, which maps to the human label "0.1"). See SubLevelLabel in types.
--
-- SCOPE GUARDRAIL: Row-Level Security (enable + own_profile / own_errors /
-- own_recordings policies) is DELIBERATELY NOT included here — it is authored in
-- Task 3.1 (a separate migration). This migration only defines the schema.
-- ════════════════════════════════════════════════════════════════════════

-- ── Enum types (design §4.2) ────────────────────────────────────────────
create type tier_t            as enum ('gate', 'recruit', 'builder', 'empire', 'vip');
create type region_t          as enum ('egypt', 'international');
create type dialect_t         as enum ('msa', 'egyptian', 'levantine', 'gulf', 'maghrebi', 'unknown');
create type ui_locale_t       as enum ('ar', 'en');
create type recording_kind_t  as enum ('baseline', 'placement', 'drill', 'mission', 'assessment', 'milestone');

-- ── learner_profile: THE single source of truth — one row per learner ────
-- Keyed by the Supabase auth user id (Req 3.1). Defaults: ui_locale 'ar'
-- (Arabic-first), tier 'gate', streak JSON, level 0 / sub_level 1 ("0.1").
create table learner_profile (
  user_id             uuid        primary key references auth.users (id) on delete cascade,
  -- identity & onboarding
  display_name        text        not null,
  ui_locale           ui_locale_t not null default 'ar',
  region              region_t    not null,
  tier                tier_t      not null default 'gate',
  telegram_id         text        unique,
  -- progression (Req 3.3): level integer 0–3, sub_level integer 1–12
  level               smallint    not null default 0 check (level between 0 and 3),
  sub_level           smallint    not null default 1 check (sub_level between 1 and 12),
  placement_completed boolean     not null default false,
  -- performance (JSONB for flexible sub-structures; score bounds [0,100]
  -- validated app-side by the Task 2.2 validators before every write)
  skill_scores        jsonb       not null default '{}'::jsonb,
  accent_profile      jsonb       not null default '{}'::jsonb,
  streak              jsonb       not null default '{"current":0,"longest":0,"lastCoreDayAt":null,"ramadanMode":false}'::jsonb,
  -- audit timestamps (updated_at write-touch rule enforced app-side, Req 4.6)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── error_record: high-volume, queryable personal error log (design §4.2) ─
create table error_record (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references learner_profile (user_id) on delete cascade,
  category      text        not null,
  detail        text        not null,
  related_sound text,
  recording_id  uuid,
  resolved      boolean     not null default false,
  occurred_at   timestamptz not null default now()
);
create index error_record_user_occurred_idx on error_record (user_id, occurred_at desc);

-- ── recording_ref: archive metadata (bytes live in Storage) (design §4.2) ─
create table recording_ref (
  id                   uuid             primary key default gen_random_uuid(),
  user_id              uuid             not null references learner_profile (user_id) on delete cascade,
  storage_path         text             not null,
  kind                 recording_kind_t not null,
  reference_text       text,
  duration_ms          integer          not null,
  byte_size            integer          not null,
  accent_score_at_time smallint         check (accent_score_at_time between 0 and 100),
  created_at           timestamptz      not null default now()
);
create index recording_ref_user_kind_created_idx on recording_ref (user_id, kind, created_at desc);

-- ── funnel_claim: Telegram → app handoff. Short-lived, single-use ────────
-- (design §4.2; redemption logic + RLS handled in later tasks — 5.x / 3.1)
create table funnel_claim (
  token       text        primary key,
  telegram_id text        not null,
  tier        tier_t      not null,
  region      region_t    not null,
  redeemed_by uuid        references auth.users (id),
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
