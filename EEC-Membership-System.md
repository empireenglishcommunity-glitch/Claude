# Empire English Community — The Membership System

## "The Empire Citizenship System" — a full membership architecture

> **Aligns with:** the V2 Blueprint (CEFR levels, earned advancement, community, AI partner), the Monetization & Pricing Strategy (4 PPP bands, tiers, programs, founding), and the **live Telegram bot** (`telegram-assistant/worker.js` v13 + Cloudflare KV).
> **Design rule:** everything here must be implementable on the existing free stack (Cloudflare Worker + KV + Telegram) first, and portable to the web/mobile app later.
> **Status:** design + brainstorm for founder review. *Nothing in the bot is changed by this document — it's the spec for the next build.*

---

## 0. The Core Insight — Separate What You *Buy* From What You *Earn*

Almost every membership conflates "what you paid for" with "your status." That is a strategic mistake for a learning brand whose whole ethic is *"advancement is earned, not given"* (V2 Blueprint).

**Empire English splits identity into two independent axes:**

| Axis | Name | How you move up | What it represents |
|------|------|-----------------|--------------------|
| 💳 **Patronage** | **Tier** (Free → Recruit → Builder → Empire → VIP / Founding) | You **pay** | How much *support, access & speed* you buy |
| 🎖️ **Honor** | **Rank** (Visitor → Initiate → … → Sovereign) | You **earn** (CEFR progress + contribution) | Your *actual achievement & standing* in the Empire |

> **Money buys you support. It cannot buy you rank.**
> A scholarship student can outrank a VIP. This single rule makes the community *aspirational and fair at the same time* — and it's the creative heart of the whole system.

This maps cleanly onto the live data model: today the bot stores only `subscribed: true`. The membership system adds **two tracked dimensions** — `tier` (purchased) and `rank` (earned) — plus the lifecycle around them.

---

## 1. The Empire Passport (the member's identity object)

Every member has **one Passport** — their profile, progress, and access rights in a single object. It's stored as the KV record `u:<telegramId>` (extending the existing one), rendered as a shareable card, and is the spine of the whole system.

**What's on the Passport (member-facing):**
- 👤 Citizen name + emblem
- 🎖️ **Rank** + crest (earned) and 🌟 **Mastery tier** if Sovereign
- 💳 **Tier** badge (patronage) + renewal date
- 🛡️ **Legion** (cohort) name
- 🔥 **Streak** (flame) + freeze tokens
- 👑 **Renown** (points) + Empire Leaderboard position
- 📜 **Seals** (certificates earned)
- 🤝 Buddy / people they mentor
- 🗓️ Member since · 🏛️ Founding Citizen badge (if applicable)

**Why it matters:** a single, beautiful, shareable identity object drives pride, retention, and virality (members post their Passport / rank-ups). It also gives the bot/app one object to read for every access decision.

---

## 2. RANK — The Earned Ladder (tied to CEFR)

8 ranks, imperial-themed, each mapped to a CEFR band from the Blueprint. **Rank is granted only by passing the level's advancement exam** (Blueprint rule: no fake passes).

| # | Rank | CEFR | Meaning / unlock | Crest |
|---|------|------|------------------|-------|
| 0 | **Visitor** (at the Gate) | — | Joined, not yet placed | 🚪 |
| 1 | **Initiate** | Pre-A1 | Absolute beginner; the foundation | 🕯️ |
| 2 | **Apprentice** | A1 | Can introduce self & survive basics | 🔰 |
| 3 | **Soldier** | A2 | Handles daily life in English | ⚔️ |
| 4 | **Knight** | B1 | Independent user; can work in English | 🛡️ |
| 5 | **Commander** | B2 | Confident across complex topics (≈IELTS 5.5–6.5) | 🎖️ |
| 6 | **Noble** | C1 | Proficient, near-native (≈IELTS 7+) | 👑 |
| 7 | **Sovereign** *(Voice of the Empire)* | C2 | Native-like mastery — the destination | 🦅 |

**Sovereign Mastery tiers** (from Blueprint §2.4): **Silver → Gold → Platinum** based on accent/fluency scores — continuous status for the top, so there's always a next mountain.

**Honor ranks (parallel, earned by contribution, not level):**
- 🤝 **Knight-Mentor** — earns rank by helping lower ranks (mentorship ladder).
- 🎙️ **Herald** — runs voice sessions / events.
- 🛡️ **Legion Ambassador** — moderates a cohort.

> These map to the Blueprint's mentorship ladder and give non-exam ways to gain status → powerful retention for people between level-ups.

---

## 3. TIER — The Purchased Ladder (what unlocks access)

Straight from the Pricing Strategy. Tier sets **access + support + AI-partner allowance + founder time**, not status.

| Tier | Role | Key unlocks | AI Partner |
|------|------|-------------|-----------|
| 🆓 **Free (The Gate)** | Acquisition | Placement test, A0/A1 taster, 1 weekly public event | Capped (~10 min/day) |
| 🥉 **Recruit** | Entry | Full self-paced curriculum, all level text channels, weekly self-assessment | More |
| 🥈 **Builder ⭐** | Flagship | + **unlimited AI partner**, all live voice sessions, Legion seat, AI assessment, certificate track | Unlimited |
| 🥇 **Empire** | Premium | + live **group coaching**, human feedback, priority Programs, advanced certification | Unlimited |
| 👑 **VIP** | 1-on-1 | + private sessions, unlimited async, WhatsApp line (hard-capped 4–6) | Unlimited |
| ♾️ **Founding Citizen** | Launch class | Price locked forever + permanent Hall-of-Founders badge | per chosen tier |

Tier is stored as `tier` + billing fields. Free is the default for any non-subscribed member (so even leads have a Passport).

---

## 4. LEGIONS — Cohorts as Identity (the retention engine)

Each monthly intake is a **Legion** (e.g., *"Legion of July 2026 ⚔️"*). Members start together, share a private group, and graduate milestones together.

- **Belonging + accountability** = the bootcamp effect (massively lifts completion at zero cost).
- Legion-wide streaks, challenges, and a Legion leaderboard.
- Legion graduation ceremonies → transformation content (ties to growth flywheel).
- Stored as `cohort: "2026-07"`; Legions can have an `ambassador`.

> This directly upgrades the Blueprint's rolling enrollment into a far stickier cohort model, and it's free.

---

## 5. RENOWN — The Points & Honor Economy

**Renown** = the gamification currency (Blueprint §8.5), earned by *doing the work and helping others*.

| Action | Renown |
|--------|--------|
| Complete daily mission set | +100 |
| Speaking recording submitted | +25 |
| Writing submitted | +20 |
| Give peer feedback | +15 |
| Join a live voice session (10+ min) | +20 |
| Help/mentor a lower rank | +30 |
| Weekly assessment done | +50 |
| Rank-up (advancement) | +500 |
| 7-day streak | +200 bonus |

**What Renown buys (status & perks, never English-skill shortcuts):**
- Empire Leaderboard position (weekly + all-time).
- Honor ranks (Knight-Mentor etc.), badges, profile flair.
- **Streak freeze tokens**, scholarship-granting power for top members, early access to Programs.
- "Citizen of the Month" (Community MVP) → free month + Hall of Fame.

> Rule: Renown buys **recognition and small perks**, not rank or curriculum. Keeps integrity intact.

---

## 6. The Member Lifecycle (state machine)

The current bot tracks a *sales* funnel (`stage`: engaged→considering→intent→paid_pending→subscribed). The membership system extends this into a **full lifecycle** that continues *after* purchase — which today's `subscribed: true` flag completely misses.

```
 VISITOR ─▶ LEAD ─▶ INTENT ─▶ PAID_PENDING ─▶ ACTIVE ─┐
 (free)    (engaged) (wants in) (paid, awaiting     │
                                  admin confirm)     │
                                                     ▼
                  ┌──────────────── ACTIVE (citizen) ───────────────┐
                  │   renewal cycle: T-7 ▸ T-3 ▸ T-0 reminders       │
                  ▼                                                  │
              GRACE (past due, ~7d, access intact) ──pays──▶ ACTIVE ─┘
                  │ no pay
                  ▼
              LAPSED (access revoked, Passport frozen)
                  │ win-back funnel
                  ▼
            RECLAIMED ──▶ ACTIVE        or        ALUMNUS/VETERAN
                                          (keeps rank + Hall badge, read-only)

   side states:  PAUSED (self-requested hold)   ·   EXILED (banned)
```

**Why this is the #1 functional upgrade:** without expiry + renewal states, the bot can never (a) know who's actually still paying, (b) prompt renewals, (c) revoke access, or (d) run win-back. This is where most recurring revenue silently leaks.

---

## 7. Subscription & Billing Lifecycle (manual-payment-aware)

Payments are **manual** (Vodafone/InstaPay/PayPal/USDT), so the bot must *track time* and *prompt humans*, since there's no Stripe webhook.

**Stored per member:** `tier`, `cycle` (monthly/annual/lifetime), `band` (A–D from pricing), `currency`, `startedAt`, `expiresAt`, `priceLocked` (founding), `lastPaymentAt`.

**Automated renewal flow (extends the existing Cron):**
1. **T-7 / T-3 / T-0** before `expiresAt` → friendly renewal nudge to member (+ payment options).
2. **Expiry passes → GRACE** (e.g., 7 days): access kept, daily gentle reminders, admin notified.
3. **Grace ends → LAPSED**: access revoked (removed from paid groups), Passport frozen (rank & Renown preserved), win-back funnel begins (mirrors the existing 5-step reminder funnel, re-themed).
4. **Member sends new payment proof → admin confirms** (existing `sub:` button) → `expiresAt` extended, state → ACTIVE, welcome-back.

**Annual/lifetime** simply set a far/så `expiresAt` (or `null` for lifetime). Founding sets `priceLocked: true`.

---

## 8. Access Control — Tier × Rank → What You Can Touch

Two gates combine: **Rank** decides *which level spaces* you belong in (A0 zone, A2 zone…); **Tier** decides *which kinds of access* you get (voice, coaching, AI partner).

| Resource | Free | Recruit | Builder ⭐ | Empire | VIP |
|----------|:----:|:-------:|:---------:|:------:|:---:|
| Free taster + 1 weekly event | ✅ | ✅ | ✅ | ✅ | ✅ |
| Full curriculum + level text channels (by Rank) | — | ✅ | ✅ | ✅ | ✅ |
| AI Speaking Partner | cap | + | ♾️ | ♾️ | ♾️ |
| All daily live voice sessions | — | — | ✅ | ✅ | ✅ |
| Legion seat + certificate track | — | — | ✅ | ✅ | ✅ |
| Group coaching + human feedback | — | — | — | ✅ | ✅ |
| 1-on-1 + WhatsApp line | — | — | — | — | ✅ |

**Enforcement on the live stack (practical, no custom infra):**
- Community spaces = **Telegram groups/channels** (or WhatsApp). Access = the bot **sends a one-time invite link** on activation and **removes/ kicks** on LAPSED (Telegram Bot API supports `unbanChatMember`/`banChatMember` to add/remove).
- Level spaces gated by **Rank**; support spaces gated by **Tier**.
- The Passport is the single source of truth the bot reads before granting/revoking.

---

## 9. Onboarding — From Payment to First Win (the 1-hour goal)

Replaces the heavy 48-hour V1 flow with a fast, Passport-centric path:

1. **Admin confirms payment** (existing button) → **Passport created** (tier set, state ACTIVE, rank = Visitor).
2. Bot sends **welcome + Founding badge** (existing `SUB_WELCOME`, extended).
3. **Placement test** → assigns **Rank** (Initiate…Commander) and CEFR.
4. **Legion assignment** + private group invite link(s) by tier/rank.
5. **Buddy** auto-assigned (one rank up) — mentorship ladder.
6. **First mission within 1 hour** → record a 60-sec baseline → AI partner replies with encouragement → **first Renown + streak day 1**.
7. Day-1 Passport delivered as a shareable card.

> Target: *first speaking rep + first Renown within 60 minutes of joining.* Early win = retention.

---

## 10. Certification — Seals of the Empire

- Each **rank-up = a Seal** (certificate), CEFR-aligned, with a **verification URL** (free: a static page + a KV-backed lookup).
- Shareable to LinkedIn/social = free growth loop + real-world ROI (the thing Arab learners actually want for jobs/visas).
- Sovereign Mastery (Silver/Gold/Platinum) = premium flagship seals for marketing.

---

## 11. KV Data Model (concrete, extends the current `u:<id>`)

```jsonc
// u:<telegramId>  — the Empire Passport (backward-compatible superset of today's record)
{
  // --- existing fields (kept) ---
  "firstSeen": 1718900000000,
  "lastSeen":  1718990000000,
  "name": "Mohamed",
  "reminders": 0,
  "subscribed": true,          // kept for compatibility; derive from state==ACTIVE
  "subAt": 1718900000000,
  "stage": "subscribed",       // pre-purchase funnel (kept)
  "feedbackAsked": false,

  // --- NEW: membership core ---
  "state": "active",           // visitor|lead|intent|paid_pending|active|grace|lapsed|paused|alumnus|exiled
  "lang": "ar",

  // Patronage (purchased)
  "tier": "builder",           // free|recruit|builder|empire|vip
  "founding": true,
  "cycle": "monthly",          // monthly|annual|lifetime
  "band": "A",                 // A Egypt | B Levant | C Gulf | D West
  "currency": "EGP",
  "startedAt": 1718900000000,
  "expiresAt": 1721492000000,  // null = lifetime
  "priceLocked": true,
  "lastPaymentAt": 1718900000000,
  "renewNudges": 0,

  // Honor (earned)
  "rank": 3,                   // 0..7 (Visitor..Sovereign)
  "cefr": "A2",
  "mastery": null,             // silver|gold|platinum (Sovereign only)
  "honors": ["knight_mentor"], // earned honor roles
  "placement": { "score": 58, "date": 1718900000000 },

  // Community & engagement
  "cohort": "2026-07",         // Legion
  "buddyId": "123456",
  "mentees": ["222","333"],
  "streak": { "current": 12, "longest": 30, "lastDay": "2026-07-04", "freezes": 2 },
  "renown": 1340,
  "speakingMin": 210,
  "aiPartnerMinToday": 8,
  "seals": ["A1","A2"],
  "scholarship": false,

  "flags": [],
  "history": [ { "t": 1718900000000, "e": "activated", "by": "admin" } ]
}
```

Plus existing global keys: `LEARNED[]`, `INVOICES[]`. **New global keys:** `LEGIONS` (cohort metadata), `LEADERBOARD` (cached top Renown), optional `SEALS:<code>` for certificate verification.

> All additive — nothing in the current bot breaks. `subscribed` stays as a derived mirror of `state === "active"|"grace"`.

---

## 12. Admin & Operations (extend the bot's admin tools)

New admin commands alongside the existing `/version /kv /list /stats`:

| Command | Does |
|---------|------|
| `/member <id>` | Print a member's full Passport |
| `/grant <id> <tier> <cycle>` | Activate/upgrade + set `expiresAt`, send invites |
| `/rank <id> <0-7>` | Set earned rank after an advancement exam, award Seal + Renown |
| `/expiring` | List members expiring in 7 days (renewal targets) |
| `/lapsed` | List lapsed members (win-back targets) |
| `/legion <YYYY-MM>` | Roster + stats for a Legion |
| `/board` | Current Renown leaderboard |

**Cron upgrades (the existing `0 16 * * *` job):** in addition to the sales funnel, iterate `u:*` to: send renewal nudges (T-7/3/0), move expired→grace→lapsed, revoke access on lapse, update streaks, refresh the leaderboard.

---

## 13. Implementation Roadmap (don't break the live bot)

**Phase 1 — Passport foundation (highest ROI):**
- Extend `u:<id>` with `state`, `tier`, `cycle`, `expiresAt`, `rank`, `cohort`, `renown`, `streak` (all optional/backward-compatible).
- Change activation (`sub:` button) to set `tier` + `expiresAt` (ask admin which tier/cycle) instead of just `subscribed:true`.
- Add `/member` and `/grant`. **This alone fixes the renewal-revenue leak.**

**Phase 2 — Lifecycle automation:**
- Cron handles renewal nudges + grace + lapse + win-back funnel.
- Telegram group invite/kick on activate/lapse (access enforcement).

**Phase 3 — Honor & engagement:**
- Placement → rank assignment; Seals + verification page; streaks; Renown; `/rank`, `/board`.

**Phase 4 — Passport card + Legions + leaderboard UI:**
- Shareable Passport image; Legion groups & ceremonies; public leaderboard.

**Phase 5 — Port to web/mobile app** (the Expo app), reusing the same Passport model via a small API over KV.

> Each phase ships independently, keeps every current bot feature working, and bumps the version (per your deploy rule).

---

## 14. Creative Extras (the "wow" layer)

1. **Shareable Passport card** — auto-generated black-&-gold image; members post rank-ups → free growth.
2. **Rank-Up Ceremony** — public announcement + crest + Renown bonus when someone advances (social proof + dopamine).
3. **The Founders' Hall** — permanent page listing all Founding Citizens; their badge never expires, even as alumni.
4. **Legions** — cohort identity, Legion vs Legion challenges, graduation ceremonies.
5. **Streak Flame + Freeze tokens** — loss-aversion engine; tokens earned with Renown or gifted by mentors.
6. **Knight-Mentor path** — earn honor by teaching; turns learners into free, motivated community labor (and deepens their own mastery).
7. **Citizen of the Month** — Community MVP → free month + Hall of Fame.
8. **Sponsored Citizens (scholarships)** — top members spend Renown to grant a free seat to a low-income learner → ethical + on-brand + viral story.
9. **Veteran/Alumni status** — even after leaving, members keep their rank + a "Veteran of the Empire" badge and read-only access → emotional retention + easy win-back.
10. **Recruiting Officer honors** — referral program reframed: bring citizens, earn ranked honors + Renown (two-sided rewards).

---

## 15. Why This System Is Strong

- **Fair + aspirational:** money buys support, effort buys status — perfectly on-brand and retention-positive.
- **Fixes the silent revenue leak:** real tier + expiry + renewal lifecycle instead of a single `subscribed` flag.
- **Free-stack-native:** runs entirely on the bot + KV today; ports to the app later with the same Passport model.
- **Blueprint-aligned:** CEFR ranks, earned advancement, mentorship ladder, gamification, cohorts, community gating — all present.
- **Growth built-in:** shareable Passports, ceremonies, Legions, referrals, scholarships feed the content/virality flywheel.
- **Retention built-in:** streaks, Legions, honor paths, alumni identity, and renewal automation attack churn from every angle.

---

## 16. Open Decisions For You

1. **Rank names** — keep the military/noble ladder (Initiate→Sovereign), or a different theme?
2. **Community platform** — Telegram groups (bot can auto-invite/kick) vs WhatsApp (manual) for paid spaces?
3. **Grace period length** — 7 days? And how many renewal nudges?
4. **Renown perks** — confirm the list of what points can/can't buy (keep skill integrity).
5. **Build order** — agree Phase 1 (Passport + tier/expiry + `/grant`) first? *(Recommended — biggest revenue impact.)*
6. **Founding cap** — how many Founding Citizens before the badge closes?

---

*Document Control — EEC Membership System ("Empire Citizenship") v1.0 (Draft) · Macal Empire / Empire English · Aligns with V2 Blueprint + Monetization & Pricing Strategy · Maps to telegram-assistant/worker.js + Cloudflare KV · Status: for founder review; no live code changed by this doc.*
