# Requirements Document

## Introduction

This document specifies the requirements for **Foundation & Infrastructure (Project P1)** of Empire English. These requirements are **derived from the approved Technical Design** (`design.md`) and trace directly to its scope. P1 builds the technical backbone that later projects (P2–P8) depend on: it locks the tech stack, stands up the **Unified Learner Profile (Layer 0)** as the single source of truth, provides **authentication and account creation** (including the Telegram funnel handoff), provides **private per-learner audio storage** optimized for low-data MENA mobile, and defines the **AI Abstraction Layer** (a provider-agnostic Speech Engine and Language Engine, a router, and a cost guard) so AI vendors are swappable with zero app disruption.

P1 builds *from scratch* and assumes nothing is already built. These requirements deliberately stay inside the P1 scope guardrails: they do **not** specify Phase 2+ features (live voice rooms, full daily loop, gamification depth, marketplace, multi-L1 localization) and do **not** specify feature logic owned by P2–P8 (placement diagnostics, accent drills/scoring logic, daily loop, pronunciation reference UI, or the concrete provider wiring of AI calls). P1 provides only the foundation those projects build on.

## Glossary

- **Learner_App**: The React Native + Expo (TypeScript, Expo Router) client application used by learners on iOS, Android, and web.
- **Foundation_Backend**: The managed Supabase backend (Postgres, Auth, Storage, Realtime) plus the Edge Functions that host server-side logic.
- **Learner_Profile**: The Unified Learner Profile (Layer 0) — a single Postgres row per learner that is the single source of truth for all personalization data.
- **Profile_Api**: The typed Foundation Client SDK contract for reading and writing the Learner_Profile.
- **Auth_Service**: Supabase Auth, providing email/password and OTP sign-up and sign-in and issuing session tokens (JWT).
- **Funnel_Claim_Service**: The Edge Function logic that mints and redeems single-use, short-lived funnel claim tokens for account creation originating from the Telegram funnel.
- **Audio_Store**: The private Supabase Storage bucket `recordings` plus the `recording_ref` metadata table, accessed only through signed URLs.
- **AI_Router**: The single server-side entry point through which every AI request passes; it applies the cost guard, caching, provider selection, and Layer 0 writes.
- **Speech_Engine**: The provider-agnostic interface that takes audio plus reference text and returns a normalized pronunciation result (phoneme, stress, fluency, scores).
- **Language_Engine**: The provider-agnostic interface that uses an LLM for feedback synthesis, content generation, and writing correction.
- **Cost_Guard**: The component that enforces per-tier daily AI allowances and records AI usage units.
- **Outbox**: The local, offline-resilient queue that holds recordings and evaluation jobs until connectivity returns.
- **Funnel_Bot**: The existing Telegram acquisition bot that initiates the secure account-creation handoff.
- **Target_Sound**: One of the defined Arabic-L1 accent target sounds tracked per learner.
- **Tier**: The learner's Value Ladder role (`gate`, `recruit`, `builder`, `empire`, `vip`) that governs AI allowances.

## Requirements

### Requirement 1: Tech Stack Foundation & App Shell

**User Story:** As the founder, I want the platform built on a single managed tech stack with one codebase, so that a solo founder can ship and operate it across iOS, Android, and web without stitching multiple vendors together.

#### Acceptance Criteria
1. THE Learner_App SHALL be implemented as a single React Native + Expo codebase using TypeScript and Expo Router, and SHALL build and launch to a usable app shell on iOS, Android, and web from that same codebase.
2. THE Foundation_Backend SHALL provide all of the following capabilities through Supabase: relational database (Postgres), authentication, file storage, and realtime updates.
3. THE Learner_App SHALL direct all data, authentication, storage, and AI requests exclusively to the Foundation_Backend, and SHALL NOT issue requests directly to any external third-party service for these operations.
4. WHERE an AI capability is required, THE Learner_App SHALL route the request through a Foundation_Backend Edge Function, and SHALL NOT include or call any external AI provider endpoint directly.
5. THE Foundation_Backend SHALL store all provider API keys exclusively in Edge Function secrets, and THE Learner_App distributable bundle SHALL NOT contain any provider API key.
6. IF the Learner_App attempts a backend request without a valid authenticated session, THEN THE Foundation_Backend SHALL reject the request and return a response indicating authentication is required, without returning the requested protected data.

### Requirement 2: Arabic-First Interface

**User Story:** As an Arabic-speaking learner at level 0 or 1, I want the interface presented in Arabic with right-to-left layout, so that I can use the app comfortably while the learning content stays in English.

#### Acceptance Criteria
1. THE Learner_App SHALL default the interface language (`uiLocale`) to Arabic (`ar`) for newly created learners.
2. WHILE the interface language is set to Arabic, THE Learner_App SHALL render the interface in right-to-left layout using logical start and end positioning, such that no UI elements are clipped or overflowing.
3. WHEN a learner changes the interface language between Arabic and English, THE Learner_App SHALL persist the selected `uiLocale` to the Learner_Profile and apply the corresponding layout direction within 1 second.
4. IF persisting the selected `uiLocale` fails, THEN THE Learner_App SHALL retain the prior locale and layout direction and surface an error indication.
5. THE Learner_App SHALL source all interface strings from `ar` and `en` localization resource bundles.
6. IF a string is missing from the active resource bundle, THEN THE Learner_App SHALL fall back to the `en` bundle.
7. THE Learner_App SHALL keep learning content (lesson text and audio) in English regardless of the selected interface language.

### Requirement 3: Unified Learner Profile Data Model (Layer 0)

**User Story:** As a developer building later layers, I want a single, well-defined learner data model with enforced invariants, so that every feature project reads and writes one consistent source of truth.

#### Acceptance Criteria
1. THE Foundation_Backend SHALL maintain exactly one Learner_Profile row per learner, keyed by the learner's authentication user id.
2. THE Learner_Profile SHALL store identity fields (display name, `uiLocale`, region, tier, optional Telegram id), progression fields (level, sub-level, placement-completed flag), performance fields (skill scores, accent profile, error history, streak state), and audio references.
3. THE Foundation_Backend SHALL constrain `level` to an integer between 0 and 3 inclusive and SHALL constrain `sub_level` to an integer between 1 and 12 inclusive.
4. THE Foundation_Backend SHALL constrain every score value — overall accent score, each accent target-sound score, accent sub-metrics, and each skill score — to the range 0 to 100 inclusive.
5. WHEN a pronunciation evaluation updates the accent profile and at least one target sound has a recorded score, THE Foundation_Backend SHALL set `weakestSound` to the target sound with the lowest score, and SHALL resolve ties by selecting the first such sound in the profile's defined target-sound ordering.
6. WHEN a pronunciation evaluation updates the accent profile and no target sound has a recorded score, THE Foundation_Backend SHALL leave `weakestSound` unset.
7. IF a write would set any score value outside the range 0 to 100 inclusive, THEN THE Foundation_Backend SHALL reject the write, SHALL retain the previously stored value unchanged, and SHALL return an error response indicating the score is out of range.
8. IF a write would set `level` outside 0 to 3 inclusive or `sub_level` outside 1 to 12 inclusive, THEN THE Foundation_Backend SHALL reject the write, SHALL retain the previously stored progression values unchanged, and SHALL return an error response indicating the value is out of range.
9. IF a request would create a second Learner_Profile row for an authentication user id that already has a profile, THEN THE Foundation_Backend SHALL reject the request, SHALL preserve the existing profile unchanged, and SHALL return an error response indicating the profile already exists.

### Requirement 4: Profile Access & Tenant Isolation

**User Story:** As a learner, I want my profile data accessible only to me, so that my progress and personal data remain private and secure.

#### Acceptance Criteria
1. THE Profile_Api SHALL expose, through the typed SDK, operations to get a profile, bootstrap a profile, update skill scores, update the accent profile, append an error record, and record a core-practice day, where each operation returns the affected Learner_Profile or record on success.
2. WHEN `bootstrap` is invoked for a learner that already has a Learner_Profile, THE Foundation_Backend SHALL return the existing profile unchanged and create no additional Learner_Profile row, such that any number of repeated `bootstrap` invocations for the same learner yield an identical profile identifier (idempotent).
3. WHEN an authenticated learner requests profile, error-history, or recording data, THE Foundation_Backend SHALL return only the rows whose owning learner identifier equals the authenticated learner's identifier, and SHALL exclude every row owned by any other learner.
4. IF an authenticated learner attempts to read or write a Learner_Profile, error-history, or recording row owned by a different learner, THEN THE Foundation_Backend SHALL deny the request via Postgres Row-Level Security, return an authorization-failure indication, expose none of the other learner's data, and leave the targeted row unmodified.
5. IF a profile, error-history, or recording request carries no valid authenticated learner identity, THEN THE Foundation_Backend SHALL deny the request, return an authentication-failure indication, and expose no Learner_Profile, error-history, or recording data.
6. WHEN any persisted field of a Learner_Profile row is modified through a write operation, THE Foundation_Backend SHALL set that row's `updated_at` to the modification time, and SHALL NOT change `updated_at` for read-only operations.

### Requirement 5: Authentication & Account Creation

**User Story:** As a new learner, I want to create an account and sign in securely, so that my learning data is tied to my identity and protected.

#### Acceptance Criteria
1. THE Auth_Service SHALL support account creation and sign-in using email and password and using email one-time passcode (OTP).
2. WHEN a learner successfully signs up or signs in, THE Auth_Service SHALL issue a learner-scoped session token (JWT) with an expiry no more than 60 minutes after issuance.
3. WHEN a new learner account is created, THE Foundation_Backend SHALL bootstrap exactly one Learner_Profile idempotently, such that retries never create more than one Learner_Profile.
4. WHEN a learner signs out, THE Auth_Service SHALL invalidate the active session on the Learner_App within 5 seconds.
5. IF a request presents a missing, expired, or invalid session token, THEN THE Foundation_Backend SHALL deny the protected profile, recording, and AI operations and return an unauthenticated error.
6. IF sign-in credentials are invalid, THEN THE Auth_Service SHALL reject the sign-in with an authentication-failure indication and create no session.
7. IF a sign-up uses an email that is already registered, THEN THE Auth_Service SHALL reject the sign-up with a duplicate-account indication and create no new Learner_Profile.
8. IF profile bootstrap fails after account creation, THEN THE Foundation_Backend SHALL surface an error indication and allow a safe retry without creating duplicate Learner_Profiles.

### Requirement 6: Telegram Funnel Claim-Token Handoff

**User Story:** As a learner who completed discovery and payment in the Telegram funnel, I want to finish account creation in the app through a secure link, so that my tier and region carry over without the bot holding any backend secrets.

#### Acceptance Criteria
1. WHEN the Funnel_Bot requests a funnel claim for a learner, THE Funnel_Claim_Service SHALL create a single-use claim token recording the Telegram id, tier, and region, with an expiry timestamp set no more than 900 seconds (15 minutes) after the token creation time.
2. WHEN a funnel claim token is created, THE Funnel_Claim_Service SHALL return a deep link containing the claim token that opens the Learner_App.
3. WHEN a learner redeems a valid, unexpired, unredeemed claim token after completing sign-up, THE Foundation_Backend SHALL bootstrap the Learner_Profile with the tier, region, and Telegram id carried by the token and mark the token as redeemed.
4. IF a claim token is presented for redemption when it has already been marked redeemed, THEN THE Funnel_Claim_Service SHALL reject the redemption, return an error indicating the token has already been redeemed, and SHALL NOT modify the existing Learner_Profile.
5. IF a claim token is redeemed at or after its expiry timestamp, THEN THE Funnel_Claim_Service SHALL reject the redemption, return an error indicating the token has expired, and SHALL NOT bootstrap a Learner_Profile.
6. IF a redemption request presents a token that is unknown or malformed, THEN THE Funnel_Claim_Service SHALL reject the redemption, return an error indicating the token is invalid, and SHALL NOT bootstrap a Learner_Profile.
7. THE Funnel_Claim_Service SHALL operate without exposing any Supabase service key to the Funnel_Bot.

### Requirement 7: Private Audio Storage

**User Story:** As a learner, I want my voice recordings stored privately and efficiently with the ability to replay before/after versions and browse my archive, so that I can hear my progress without consuming excessive mobile data.

#### Acceptance Criteria
1. WHEN a recording is captured, THE Learner_App SHALL encode it as compressed mono AAC/m4a audio at a bitrate between 24 kbps and 64 kbps.
2. WHEN a learner uploads a recording, THE Audio_Store SHALL accept it only through a signed upload URL that expires within 300 seconds of issuance and is scoped to the path prefix `recordings/{userId}/`.
3. IF a learner attempts to upload through an expired or path-mismatched signed upload URL, THEN THE Audio_Store SHALL reject the upload without storing any data and return an error response indicating the upload was denied.
4. THE Audio_Store SHALL store every recording reference with a `storage_path` prefixed by `recordings/{userId}/` for the owning learner.
5. WHEN a recording upload succeeds, THE Foundation_Backend SHALL persist recording metadata including kind, reference text, duration in seconds, byte size in bytes, and the accent score at the time of recording.
6. IF a recording upload fails before completion, THEN THE Foundation_Backend SHALL NOT persist recording metadata and SHALL return an error response indicating the upload did not complete.
7. WHEN a learner requests playback of one of their recordings, THE Audio_Store SHALL return a signed playback URL that expires within 3600 seconds of issuance.
8. WHEN a learner requests their recording archive, THE Audio_Store SHALL return the metadata for that learner's recordings, optionally filtered by kind.
9. IF a learner requests a recording that does not belong to that learner, THEN THE Audio_Store SHALL deny access and return an error response indicating access is denied, without disclosing the recording's contents or metadata.

### Requirement 8: AI Abstraction Layer — Speech & Language Engines

**User Story:** As the founder, I want every AI call to route through provider-agnostic interfaces, so that I can swap speech or language vendors with zero disruption to the app and avoid vendor lock-in.

#### Acceptance Criteria
1. THE AI_Router SHALL be the single server-side entry point through which the Learner_App issues every AI request, such that no AI request reaches a Speech or Language provider without passing through the AI_Router.
2. WHEN the AI_Router receives a pronunciation assessment request, THE Speech_Engine SHALL return a normalized pronunciation result containing an overall score, a fluency score, and a completeness score each expressed as a number from 0 to 100, a per-word score list, a per-phoneme score list, and the producing provider name as a non-empty string.
3. WHEN the AI_Router receives a feedback or generation request, THE Language_Engine SHALL return a normalized result that records the producing provider name as a non-empty string and, for generation requests, the number of tokens used as a non-negative integer.
4. WHERE a different Speech or Language provider adapter is registered, THE AI_Router SHALL return a normalized result containing the identical set of fields and identical data types as any other registered adapter for the same request type, such that no call site in the Learner_App requires modification.
5. THE AI_Router SHALL set the provider field of every returned AI result to the name of the adapter that produced it, on the server side.
6. WHEN a pronunciation assessment completes, THE AI_Router SHALL write the resulting scores and the error history to the Learner_Profile before returning the result to the Learner_App.
7. IF a Speech or Language provider returns an error or does not respond within the configured request timeout, THEN THE AI_Router SHALL return a typed unavailable error identifying the failed engine and SHALL retain the originating job in a retryable state without recording partial scores.
8. IF no provider adapter is registered for the requested engine, THEN THE AI_Router SHALL return a typed unavailable error indicating no adapter is available and SHALL retain the originating job in a retryable state.

### Requirement 9: Cost-Aware AI Routing

**User Story:** As the founder, I want per-tier AI usage limits and usage accounting enforced server-side, so that per-evaluation AI cost stays inside the feasibility model and margins are protected.

#### Acceptance Criteria
1. WHEN the AI_Router receives an AI request, THE Cost_Guard SHALL resolve the operation type as speech or language and verify that the learner's tier daily allowance for that operation type has not been exceeded before any provider is called.
2. IF a learner's tier daily allowance for an operation type is exceeded, THEN THE Cost_Guard SHALL deny the request with an allowance-exceeded error, make no provider call, and record no usage.
3. WHEN an AI operation completes successfully, THE Cost_Guard SHALL record the usage units consumed for that learner and operation type.
4. IF a provider call fails, THEN THE Cost_Guard SHALL record no usage and preserve the learner's remaining allowance.
5. THE Cost_Guard SHALL define the daily accounting window as a fixed 24-hour period starting at 00:00 UTC and SHALL reset each learner's allowances to zero at that boundary.
6. THE Foundation_Backend SHALL ensure the number of billable AI operations for a learner in a day does not exceed that learner's tier-configured allowance.
7. WHERE reusable language-model content is available in cache, THE AI_Router SHALL serve the cached content instead of issuing a new provider request, and SHALL NOT count a cache-served request as a billable operation.

### Requirement 10: Offline & Connectivity Resilience

**User Story:** As a learner on an unstable or low-data mobile connection, I want my recordings and evaluations to be saved locally and synced when I am back online, so that my work is never lost and the app degrades gracefully.

#### Acceptance Criteria
1. WHEN a recording is captured, THE Learner_App SHALL persist it locally before any upload is attempted and SHALL confirm that local persistence succeeded.
2. IF local persistence of a captured recording fails, THEN THE Learner_App SHALL surface an error indication and SHALL NOT silently drop the recording.
3. WHILE the Learner_App is offline, THE Outbox SHALL enqueue evaluation jobs in a persisted "pending" state rather than failing them.
4. WHEN connectivity returns, THE Outbox SHALL flush queued jobs in first-in-first-out order by uploading recordings and submitting evaluations, SHALL update each job's outcome state, and SHALL reconcile the interface within 2 seconds of receiving results.
5. THE Learner_App SHALL ensure that every recording accepted by audio capture is always in exactly one observable state — evaluated, pending, or failed-with-indication — and is never removed before reaching success or explicit learner dismissal.
6. WHILE low-data mode is enabled, THE Learner_App SHALL defer downloads not required for the current screen, prefer cached content, and restrict network use to active uploads and submissions.
7. IF an upload fails mid-transfer, THEN THE Learner_App SHALL retain the recording locally, keep the job pending, and retry up to 5 attempts with increasing back-off, then move the job to a terminal failed state with a learner-visible indication and a manual retry option.
