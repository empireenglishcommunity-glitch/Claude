# ✅ Empire English — Projects Checklist (what's inside this folder)

> Quick map of everything we built. Open this first when you come back.
> Repo: github.com/empireenglishcommunity-glitch/Claude · all merged into `main`.

---

## 🤖 1) Telegram Sales Bot  — ⭐ MAIN / LIVE
- [x] **`telegram-assistant/worker.js`** — the live bot (Cloudflare Worker, **v13**)
- [x] `telegram-assistant/SETUP.md` — setup steps (bot, KV, cron, webhook)
- [x] ~~`telegram-assistant/Code.gs`~~ — old Apps Script version (deprecated, ignore)

**What it does:** guided button menus (packages, compare, help-me-choose, FAQ, subscribe) ·
auto-replies to typed questions (keyword bank, no AI = free + reliable) ·
**payment approval gate** (money stuff goes to you first) · crypto/bank escalated to you ·
auto-learns new answers · daily 5-step reminder funnel · invoice capture · subscribe-confirm ·
feedback · admin commands `/version /kv /list /stats`.

---

## 💰 2) Pricing & Business Strategy
- [x] **`EEC-Feasibility-Study.md`** — Egypt (zero-cost bootstrap) + how many members = 3,000 AED salary
- [x] **`EEC-International-Pricing-and-Feasibility.md`** — Gulf/worldwide USD pricing + feasibility
- [x] Final pricing (in docs + bot): Recruit 199ج/$19 · Builder ⭐ 399ج/$39 · Empire 799ج/$89 · VIP 3,500ج/$249

---

## 🚀 3) Launch Playbook & Marketing Content
- [x] **`EEC-Launch-Night-Playbook.md`** — full A-to-Z launch ("The Gates Open"):
  - [x] Part B — finalized plan (TikTok + Telegram, timeline)
  - [x] Part C — soft founding-launch plan
  - [x] Part C.1 — ready Telegram announcement post (with prices + date)
  - [x] Part C.2 — package cards (features + image prompts + album caption)
  - [x] Part C.3 / C.4 — ChatGPT image prompts (English + Arabic)
  - [x] Part C.5 — final announcement post with payment details
  - [x] Part C.6 — per-package explainer DM messages (Egyptian Arabic)

---

## 🌐 4) Landing Pages (black + gold "empire" theme)
- [x] **`index.html`** — English landing page
- [x] **`index-ar.html`** — Arabic (RTL) landing page
- Features: animated gates, countdown, 🇪🇬/🌍 price toggle, packages, 9 testimonials (placeholders), FAQ, TikTok @macal.empire, logo/favicon slots

---

## 📚 5) Guides & Handoff (so you never lose work)
- [x] **`GUIDE.md`** — backup, folder structure, how to add answers/buttons, deploy cheat-sheet
- [x] **`PROJECT-CONTEXT.md`** — full handoff doc + ready prompt to continue in a new conversation
- [x] **`PROJECTS-CHECKLIST.md`** — this file

---

## 🔜 Possible next steps (not done yet)
- [ ] Add real success stories/testimonials (landing page + bot)
- [ ] og-image (social share image) + analytics pixels (Meta/TikTok)
- [ ] Custom domain for the landing page
- [ ] Fill bot crypto (USDT/Binance) + bank-transfer details (currently handled by you manually)
- [ ] Weekly stats report from the bot

---

## 🎯 6) 30-Day Challenge Bot (Discord) — READY TO DEPLOY
- [x] **`empire-challenge-bot/`** — complete Discord bot + content package
- [x] `src/bot.py` — main bot: 12 commands (join, done, today, me, top, cert, recap, guide, status, setday, announce, reset)
- [x] `src/database.py` — SQLite storage (participants + progress)
- [x] `src/challenges.py` — load/serve 30 challenges from JSON
- [x] `src/ai_coach.py` — Groq AI motivation + Arabic fallback (100% works without key)
- [x] `src/certificate.py` — PDF certificates with Cairo Arabic font
- [x] `data/challenges.json` — all 30 challenge definitions
- [x] `data/tiktok-captions.md` — 30 Arabic TikTok captions
- [x] `data/tiktok-captions-en.md` — 30 English TikTok captions
- [x] `data/poster-text.md` — 30 poster text designs + 3 templates
- [x] `data/launch-week-promo.md` — 7 teaser video scripts (Day -7 to -1)
- [x] `data/launch-day-live-script.md` — Day 0 live stream script (45 min, bilingual)
- [x] `data/CONTENT-INDEX.md` — content index + launch flow diagram
- [x] `fonts/Cairo-Variable.ttf` — Arabic font for PDF certificates (OFL licensed)
- [x] `tests/` — 49 automated tests (pytest)
- [x] `.github/workflows/challenge-bot-test.yml` — CI (runs on push/PR)
- [x] `Dockerfile` + `docker-compose.yml` — containerized deployment
- [x] `DEPLOYMENT.md` — deployment guide (Docker / direct / free cloud)
- [x] `scripts/backup.py` — SQLite backup utility with rotation
- [x] `README.md` — full setup guide (bilingual EN/AR)

**What it does:** Auto-posts daily challenge · tracks progress & streaks · AI motivation ·
auto-assigns Discord rank roles (4 tiers) · PDF certificates · leaderboard · weekly recap ·
admin commands (status, setday, announce, reset) · cron backup. 100% free, zero vendor lock-in.

**What YOU still need to do (human-only steps):**
- [ ] Create Discord bot at discord.com/developers (5 min)
- [ ] Create Discord server per blueprint in `docs/تحدي-30-يوم-المنطقة-غير-المريحة.md` (20 min)
- [ ] Fill `.env` with your credentials (2 min)
- [ ] Deploy (`docker compose up -d`) on VPS or free host (5 min)
- [ ] Set `START_DATE` when challenge begins
- [ ] Design 30 posters in Canva from `data/poster-text.md` (creative work)
- [ ] Record 7 teaser videos from `data/launch-week-promo.md` (creative work)

---

ℹ️ Note: the repo also contains a separate **mobile app** ("Phase 1 — The Core", React Native/Expo) merged via PR #4 from another effort — not part of the work in this conversation.
