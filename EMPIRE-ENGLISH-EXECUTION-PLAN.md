# 🗺️ EMPIRE ENGLISH — EXECUTION PROJECTS PLAN
### The Phased Build Roadmap (derived from approved Blueprint V2.0)
**Status:** Planning — For Review · **Source of truth:** `EMPIRE-ENGLISH-BLUEPRINT-V2.md`

> This plan breaks the entire Empire English system into concrete, buildable **projects**, sequences them into the **4 phases** from the blueprint, and maps their **dependencies**. Each project will become its own formal spec (Requirements → Design → Tasks) when we build it. Nothing is built yet. We build from scratch, Phase 1 first, funded by revenue thereafter.

---

## Guiding Principles
1. **Prove fluency first.** Phase 1 ships the smallest system that delivers the core promise (Arabic-aware accent feedback + speaking loop). Everything else is earned from revenue.
2. **One project = one spec.** We never build without an approved spec for that project.
3. **Dependencies before features.** Foundation (data + AI + app shell) precedes user-facing features.
4. **Solo-founder friendly.** Favor managed services and a single codebase to keep you shipping alone.
5. **Swappable AI.** All AI access goes through our own interface — no vendor lock-in.

---

## Recommended Tech Stack (to confirm in Project 1 spec)
- **Learner App:** React Native + Expo (evolves the existing app), with full **Arabic RTL** support and a low-data mode.
- **Backend / Data:** A managed backend (recommended: Supabase — Postgres + Auth + Storage for audio + Realtime) to move fast solo. The **Unified Learner Profile** lives here.
- **Speech Engine:** Specialized pronunciation-assessment API (recommended: Azure Pronunciation Assessment; Speechace as alternative) behind a swappable interface.
- **Language Engine:** GPT-4 / Claude-class LLM via API, behind the same abstraction layer.
- **Acquisition Bot:** Telegram bot (evolves existing `telegram-assistant/`), Node-based.
- **Payments:** Paymob / Fawry / Vodafone Cash / InstaPay (Egypt) + Stripe / Paddle (international).

*(These are recommendations; final decisions are locked in the Project 1 — Foundation spec.)*

---

## PHASE 1 — PILOT MVP (10–20 Founding Members)
**Goal:** Deliver the core promise — Arabic-aware accent + speaking feedback in a daily loop — to a small pilot. This is the minimum that proves the system works.

| # | Project | Goal | Key Deliverables | Depends on |
|---|---------|------|------------------|-----------|
| **P1** | **Foundation & Infrastructure** | The technical backbone | Stack decision, repo/monorepo setup, **Unified Learner Profile** data model, auth, storage for audio, **AI abstraction layer** | — |
| **P2** | **AI Engine Integration** | Make the system "hear" and "explain" | Speech Engine integration (phoneme/stress/fluency scoring) + Language Engine (LLM) + feedback pipeline, all behind the swappable interface | P1 |
| **P3** | **Learner App Shell (Arabic-First)** | The home learners open | Expo app shell, **Arabic RTL UI**, navigation, auth flow, onboarding screens, low-data mode, dashboard skeleton | P1 |
| **P4** | **Placement & Entry System** | Place learners + diagnose accent | 5-module diagnostic incl. **Arabic accent diagnostic**, scoring/level assignment, writes accent plan to profile | P2, P3 |
| **P5** | **Arabic-L1 Accent Engine (Core)** | The centerpiece | Target-sound drills, minimal pairs, **dialect-aware /θ/–/ð/**, accent scoring, **Accent Score + Before/After Replay** | P2, P3 |
| **P6** | **Core Daily Loop** | The habit engine | Accent drill + speaking mission, recording → AI feedback, **streaks (Core path)**, daily delivery | P4, P5 |
| **P7** | **Pronunciation Reference Tool** | In-loop word lookup | US audio + syllable/stress + IPA + **Arabic logical meaning** + example, "add to vocab" | P2, P3 |
| **P8** | **Telegram Acquisition Funnel** | Turn interest into members | Bot: discovery → pricing → **local payments** → account creation → route into app | P1 |

**Phase 1 build order (recommended):** P1 → P2 → P3 (P2/P3 can overlap) → P4 → P5 → P6 → P7 → P8.
**Phase 1 exit criteria:** a Founding Member can sign up via the funnel, take placement (incl. accent diagnostic), complete the Core daily loop, receive real AI accent + speaking feedback, and see their Accent Score + before/after replay.

---

## PHASE 2 — EARLY GROWTH (~100 Members)
**Goal:** Complete the full learning system and automate operations.

| # | Project | Goal |
|---|---------|------|
| P9 | **Full Daily Loop** | Add vocabulary (spaced repetition), shadowing, listening immersion, writing practice + AI correction |
| P10 | **Community Engine v1** | In-app feed, level rooms, **async voice notes**, accountability hub, gamification (points/badges/leaderboards) |
| P11 | **Live Voice Rooms** | Real-time audio practice (scheduled + open), **Ramadan/prayer-aware scheduling** |
| P12 | **Assessment & Progression** | Weekly assessments, WPS scoring, sub-level engine, advancement exams, **provisional advancement** |
| P13 | **Materials Library** | AI-generated grammar cards, vocab, templates, writing frameworks, personalized cheat sheets |
| P14 | **Automated Onboarding & Mentorship** | Buddy assignment, onboarding sequence, mentorship ladder, intervention protocol |
| P15 | **Content Curation + Cultural Filter** | Vetted, family-safe immersion library by level |

---

## PHASE 3 — SCALE (1,000+ Members)
**Goal:** Polish, predict, and reduce manual load.

| # | Project | Goal |
|---|---------|------|
| P16 | **Mobile Polish & Performance** | Production-grade app, push notifications, offline robustness |
| P17 | **Web Dashboard & Admin** | Full progress analytics, admin/moderation controls |
| P18 | **Predictive Churn Intervention** | Identify at-risk members before they drop |
| P19 | **Content Feedback Loop** | Amplify popular content types; quality automation |
| P20 | **Ambassador & Moderation Tools** | Peer moderation, points-based privileges |

---

## PHASE 4 — MASS SCALE (10,000+ Members)
**Goal:** Global platform, autonomous operations.

| # | Project | Goal |
|---|---------|------|
| P21 | **Marketplace** | Third-party Empire-compatible content |
| P22 | **Multi-L1 Localization** | Extend beyond Arabic to other native-language backgrounds |
| P23 | **Autonomous AI Tutors** | Per-learner AI tutor, human escalation only |
| P24 | **Scale Infrastructure** | Microservices, CDN, WebRTC/real-time, data warehouse |

---

## Dependency Map (Phase 1)
```
P1 Foundation
 ├──> P2 AI Engine ──┐
 ├──> P3 App Shell ──┼──> P4 Placement ─┐
 │                   ├──> P5 Accent Engine ─┼──> P6 Core Daily Loop
 │                   └──> P7 Pronunciation Ref
 └──> P8 Telegram Funnel
```

---

## Recommended Starting Point
**Begin with Project P1 — Foundation & Infrastructure.** It is the prerequisite for everything: it locks the tech stack, stands up the Unified Learner Profile (Layer 0 backbone), auth, audio storage, and the swappable AI abstraction layer. Once P1's spec is approved and built, P2 (AI Engine) and P3 (App Shell) can proceed in parallel.

When ready, we create the first formal spec: **"Foundation & Infrastructure" (P1)** — Requirements → Design → Tasks.

---

## Document Control
- **Version:** 1.0 (Planning)
- **Derived from:** Blueprint V2.0
- **Next step:** Approve this plan → create the P1 (Foundation) spec → begin building.
