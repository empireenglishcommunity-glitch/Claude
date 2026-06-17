# Supabase Edge Functions — AI Abstraction Layer & Funnel Logic

> **Status:** Scaffold only (Task 1.1). No function logic lives here yet — it is
> added in later P1 tasks. This folder reserves the server-side workspace and
> documents the boundary that keeps the app free of vendor lock-in and secrets.

## Purpose

This directory hosts the **server-side TypeScript (Deno runtime)** Edge Functions
that the rest of Empire English depends on. Per the design (§1, §5), the Learner
App never calls an AI provider or holds a provider key directly — **every** AI
request and every privileged operation routes through functions defined here.

Two responsibility groups will live in this folder:

1. **AI Abstraction Layer** (design §5) — the provider-agnostic boundary:
   - `AiRouter` — the single server-side entry point for all AI requests
     (cost guard → cache → provider routing → Layer 0 writes).
   - `SpeechEngine` adapters (e.g. Azure Pronunciation Assessment, Speechace).
   - `LanguageEngine` adapters (e.g. GPT-4 / Claude-class LLMs).
   - `CostGuard` — per-tier daily allowance enforcement and usage accounting.

   Providers are swapped by registering a different adapter behind the same
   interface, with **zero** app-side changes.

2. **Funnel logic** (design §3.1) — the secure Telegram → app account handoff:
   - `createFunnelClaim` — mints a single-use, short-lived claim token.
   - `redeemFunnelClaim` — validates the token and bootstraps the profile.

## Why server-side

- **Key safety** — provider API keys and the Supabase service-role key are set
  as Edge Function secrets (`supabase secrets set ...`) and never ship in the
  app bundle (Requirement 1.5).
- **Cost control** — the cost guard and response cache run before any paid
  provider call (Requirements 9.1–9.7).
- **Swappability** — the app depends on the normalized result shapes, not on
  any vendor SDK (Requirements 8.1–8.5).

## Conventions (for later tasks)

- One function per folder: `supabase/functions/<function-name>/index.ts`.
- Deno runtime; configuration is in `deno.json` (this folder).
- Secrets are read from the environment via `Deno.env.get(...)` — never hard-coded.
- These files are **excluded** from the app's `tsconfig.json` because they target
  the Deno runtime, not React Native.

## Local tooling (later)

```bash
# Serve functions locally (requires the Supabase CLI; added in a later task)
supabase functions serve
```
