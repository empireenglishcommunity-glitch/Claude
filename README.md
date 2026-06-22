# Empire English Community

> **Speak like an Emperor.** — An online English-learning community for Arabic speakers.
> Sub-brand of MACAL Empire.

---

## What's in this repository

This is a **monorepo** containing all technical systems for Empire English Community. Each component is self-contained with its own README and documentation.

| Component | Directory | Status | Description |
|-----------|-----------|:------:|-------------|
| **Telegram Sales Bot** | `telegram-assistant/` | Live | Keyword answer bank + button menus + payment approval gate (Cloudflare Worker) |
| **LinkedIn Content Engine** | `linkedin-engine/` | Built | AI-powered daily LinkedIn post generator with Telegram cockpit (Cloudflare Worker) |
| **30-Day Challenge Bot** | `empire-challenge-bot/` | Deployed | Discord bot for community challenges + AI coaching + PDF certificates (Python/Docker) |
| **Mobile App** | `app/` + `src/` | Phase 1 complete | Pronunciation dictionary with syllables, IPA, Arabic meanings (React Native / Expo) |
| **Landing Pages** | `web/` | Built | English + Arabic (RTL) landing pages with pricing, countdown, FAQ |
| **Server Hardening** | `server-hardening/` | Deployed | Security, monitoring, and resilience scripts for the production Hetzner server |

---

## Infrastructure

| Layer | Tool | Status |
|-------|------|:------:|
| **Server** | Hetzner CX23 (Helsinki, 4GB RAM, Ubuntu 26.04) | Running |
| **Automation** | n8n (Docker, pinned v2.26.8) | Running |
| **Routing** | Cloudflare Tunnel → `bot.empireenglish.online` | Running |
| **Monitoring** | Telegram watchdog (60s) + BetterStack (3min) | Active |
| **Security** | Key-only SSH, Fail2Ban, UFW, resource limits | Hardened |
| **Backups** | Daily 3AM, 14-day rotation | Automated |

Full infrastructure details: [`docs/SERVER_REFERENCE.md`](docs/SERVER_REFERENCE.md)

---

## Deployment Status (as of June 22, 2026)

| System | Where | Container/Process | Auto-Starts |
|--------|-------|-------------------|:-----------:|
| **n8n** (workflow automation) | Hetzner VPS `/opt/n8n/` | `empire-n8n` (Docker) | ✅ |
| **Cloudflare Tunnel** | Hetzner VPS (systemd) | `cloudflared.service` | ✅ |
| **Challenge Bot** | Hetzner VPS `/opt/empire-challenge/` | `empire-challenge-bot` (Docker) | ✅ |
| **Telegram Sales Bot** | Cloudflare Workers | `worker.js` (serverless) | ✅ |
| **LinkedIn Engine** | Not yet deployed | — | — |
| **Monitoring Watchdog** | Hetzner VPS (systemd timer) | 60s interval | ✅ |
| **Backup** | Hetzner VPS (cron) | Daily 3 AM | ✅ |

---

## Documentation

All guides, strategy documents, and operational references live in `docs/`:

| Document | Purpose |
|----------|---------|
| [`SERVER_REFERENCE.md`](docs/SERVER_REFERENCE.md) | Complete server architecture & configuration (source of truth) |
| [`EMERGENCY-RECOVERY.md`](docs/EMERGENCY-RECOVERY.md) | Standalone recovery guide for any failure (save locally) |
| [`SERVER_AUDIT.md`](docs/SERVER_AUDIT.md) | Security audit report (historical reference) |
| [`PROJECTS-CHECKLIST.md`](docs/PROJECTS-CHECKLIST.md) | Master index of everything built |
| [`GUIDE.md`](docs/GUIDE.md) | How to enhance the Telegram bot, deploy, backup |
| [`PROJECT-CONTEXT.md`](docs/PROJECT-CONTEXT.md) | Handoff document for new AI agents/developers |
| [`EEC-Launch-Night-Playbook.md`](docs/EEC-Launch-Night-Playbook.md) | Full launch strategy & marketing content |
| [`EEC-Feasibility-Study.md`](docs/EEC-Feasibility-Study.md) | Egypt pricing & business feasibility |
| [`EEC-International-Pricing-and-Feasibility.md`](docs/EEC-International-Pricing-and-Feasibility.md) | Gulf/worldwide pricing |
| [`LinkedIn-Content-Automation-System.md`](docs/LinkedIn-Content-Automation-System.md) | LinkedIn engine architecture & research |

---

## Quick Start (by component)

### Telegram Sales Bot (live)
```bash
# The bot is already deployed on Cloudflare Workers.
# To make changes: edit telegram-assistant/worker.js → paste in Cloudflare dashboard → Deploy
# See: telegram-assistant/SETUP.md
```

### LinkedIn Content Engine
```bash
cd linkedin-engine
# See: linkedin-engine/SETUP.md (Cloudflare Worker + Telegram cockpit)
```

### 30-Day Challenge Bot (deployed June 22, 2026)
```bash
# Already deployed on Hetzner VPS at /opt/empire-challenge/empire-challenge-bot/
# Container: empire-challenge-bot (Docker, restart: unless-stopped)
# Discord server: Empire English — تحدّي 30 يوم (ID: 1518615304035373106)
# Start date: July 1, 2026 at 6 AM Asia/Dubai
# To update: ssh in → cd /opt/empire-challenge && git pull && cd empire-challenge-bot && docker compose up -d --build
# See: empire-challenge-bot/DEPLOYMENT.md
```

### Mobile App (Expo)
```bash
npm install
npm run setup           # Installs matched Expo packages
npx expo start --tunnel # Scan QR with Expo Go
```

### Server Hardening (already deployed)
```bash
# Already deployed on production server (June 21, 2026)
# For rebuilds: scp server-hardening/ to new server → bash deploy.sh
# See: server-hardening/README.md
```

---

## Repository Structure

```
Claude/
├── README.md                          ← This file (project index)
├── docs/                              ← All documentation & guides
│   ├── SERVER_REFERENCE.md            ← Server architecture (source of truth)
│   ├── EMERGENCY-RECOVERY.md          ← Disaster recovery (save locally!)
│   ├── SERVER_AUDIT.md                ← Security audit (historical)
│   ├── PROJECTS-CHECKLIST.md          ← Master index of work done
│   ├── GUIDE.md                       ← Bot enhancement & deployment guide
│   ├── PROJECT-CONTEXT.md             ← AI/developer handoff context
│   ├── EEC-Launch-Night-Playbook.md   ← Launch strategy
│   ├── EEC-Feasibility-Study.md       ← Egypt business feasibility
│   ├── EEC-International-Pricing-and-Feasibility.md
│   ├── LinkedIn-Content-Automation-System.md
│   └── تحدي-30-يوم-المنطقة-غير-المريحة.md  ← 30-day challenge program (Arabic)
│
├── telegram-assistant/                ← Telegram sales bot (Cloudflare Worker)
│   ├── worker.js                      ← THE live bot (v13)
│   └── SETUP.md                       ← Setup guide
│
├── linkedin-engine/                   ← LinkedIn content automation
│   ├── worker.js                      ← Cloudflare Worker (Phases 1-5)
│   ├── carousel.gs                    ← Google Apps Script for PDF carousels
│   ├── brand/macal-brand-bible.md     ← MACAL Empire voice guide
│   ├── SETUP.md                       ← Setup guide
│   └── _test.mjs                      ← Smoke test
│
├── empire-challenge-bot/              ← Discord 30-day challenge bot
│   ├── src/                           ← Python bot code
│   ├── data/                          ← Challenges, captions, posters, scripts
│   ├── tests/                         ← 49 pytest tests
│   ├── fonts/                         ← Cairo Arabic font (PDF certificates)
│   ├── Dockerfile + docker-compose.yml
│   ├── DEPLOYMENT.md                  ← Deployment guide
│   └── README.md                      ← Setup guide
│
├── server-hardening/                  ← Server security & monitoring (deployed)
│   ├── deploy.sh                      ← Master deployment script
│   ├── scripts/01-07*.sh              ← Individual hardening steps
│   ├── configs/                       ← docker-compose.yml, watchdog.sh
│   ├── systemd/                       ← Monitor timer + service
│   └── README.md                      ← Usage guide
│
├── web/                               ← Landing pages
│   ├── index.html                     ← English landing page
│   └── index-ar.html                  ← Arabic (RTL) landing page
│
├── app/                               ← Mobile app screens (Expo Router)
│   ├── index.tsx                      ← Splash / gate screen
│   ├── (tabs)/                        ← Dictionary + Sentences tabs
│   └── word/[word].tsx                ← Word detail screen
│
├── src/                               ← Mobile app source
│   ├── components/                    ← Reusable UI components
│   ├── data/                          ← Curated dictionary (30 words)
│   ├── services/                      ← Speech, dictionary, translation, storage
│   └── theme/                         ← Gold-on-black design system
│
├── .github/workflows/                 ← CI/CD
│   ├── challenge-bot-test.yml         ← Python tests on push/PR
│   └── linkedin-engine-smoke-test.yml ← Node syntax + wrangler check
│
├── package.json                       ← Mobile app dependencies (Expo)
├── app.json                           ← Expo configuration
├── babel.config.js                    ← Babel (Expo preset)
├── tsconfig.json                      ← TypeScript config (mobile app)
└── .gitignore                         ← Git ignore rules
```

---

## Design Principles

- **Zero vendor lock-in** — self-hosted, open-source tools preferred
- **Zero/near-zero cost** — Cloudflare free, Hetzner $7/mo, all APIs on free tiers
- **No AI dependency for critical paths** — keyword banks + fallback pools for 100% uptime
- **Human-in-the-loop** — all sensitive actions (payments, publishing) require admin approval
- **Single-file deployments** — each Cloudflare Worker is one self-contained `.js` file
- **Arabic-first UX** — all customer-facing copy in Egyptian Arabic dialect

---

## For New AI Agents / Developers

Start with these files in order:
1. **This README** — understand the project map
2. **[`docs/PROJECTS-CHECKLIST.md`](docs/PROJECTS-CHECKLIST.md)** — everything that's been built
3. **[`docs/PROJECT-CONTEXT.md`](docs/PROJECT-CONTEXT.md)** — full handoff context + prompt template
4. **[`docs/SERVER_REFERENCE.md`](docs/SERVER_REFERENCE.md)** — server architecture if doing infra work

---

## Brand

- **Community:** Empire English Community
- **Parent Brand:** MACAL Empire ("Common Sense First")
- **Visual Identity:** Gold (#D4AF37) on matte black (#0A0A0B)
- **Voice:** Authoritative, sarcastic (scalpel not sledgehammer), paternal/protective
- **Owner:** Mahmoud Ashri (@macal_emperor)
