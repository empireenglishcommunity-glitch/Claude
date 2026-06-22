# Empire English Community — AI Agent Steering Rules

> This file is automatically loaded by Kiro and any AI agent working on this repository.
> It provides critical context, constraints, and decision rules for all future work.

---

## 0. Session Management Protocol

### `/sync` Command
When the user sends `/sync`, execute the full repository closing protocol:
1. **Session Review** — identify all changes made during the session
2. **Code Verification** — confirm modified code compiles, tests pass, no secrets/debug left
3. **Documentation Sync** — update PROJECTS-CHECKLIST.md, PROJECT-CONTEXT.md, README.md, and any CHANGELOG.md as needed
4. **Repository Cleanup** — remove orphaned files, check .gitignore, verify no untracked files
5. **Commit & Push** — stage all changes, write descriptive commit message, push to main
6. **Final Report** — deliver summary with files changed, test results, doc updates, next steps

### `/status` Command
When the user sends `/status`, provide current repository state without making changes.

### `/sync dry` Command
Run the protocol analysis and show what would be done, without actually committing or pushing.

---

## 1. Project Identity

- **Project:** Empire English Community (EEC)
- **Parent Brand:** MACAL Empire ("Common Sense First")
- **Owner:** Mahmoud Ashri (@macal_emperor / @macal.empire)
- **Target Audience:** Arabic speakers learning English (Egyptian dialect primary)
- **Repository:** `empireenglishcommunity-glitch/Claude` (monorepo)

---

## 2. Architecture Principles (MUST follow)

| Principle | Explanation |
|-----------|-------------|
| **Zero vendor lock-in** | Self-hosted, open-source tools preferred. Never recommend SaaS with restrictive limits. |
| **Zero/near-zero cost** | All APIs on free tiers. Server cost: $7/mo max. No paid subscriptions. |
| **No AI dependency for critical paths** | Keyword banks + fallback pools for 100% uptime. AI is optional enhancement. |
| **Human-in-the-loop for money** | All payment/sensitive actions require admin approval before reaching customers. |
| **Single-file deployments** | Cloudflare Workers = one self-contained `.js` file. No build steps. |
| **Arabic-first UX** | All customer-facing copy in Egyptian Arabic dialect. Clean, warm, motivating. |
| **5-year scalability test** | Every decision must pass: "Will this work in 5 years at 10x scale?" |
| **Idempotent operations** | Scripts safe to re-run. Database operations with conflict handling. |

---

## 3. Server Infrastructure (DO NOT break)

| Item | Details |
|------|---------|
| **Server** | Hetzner CX23, Helsinki, `77.42.43.250`, Ubuntu 26.04 |
| **SSH** | Key-only (`C:\Users\97150\.ssh\id_ed25519`). Password auth DISABLED. |
| **n8n** | Docker at `/opt/n8n/`, pinned v2.26.8, bound to `127.0.0.1:5678` |
| **Tunnel** | Cloudflare Named Tunnel → `bot.empireenglish.online` |
| **Challenge Bot** | Docker at `/opt/empire-challenge/empire-challenge-bot/` |
| **Monitoring** | Telegram watchdog (60s) + BetterStack (3min) |
| **Backup** | Daily 3 AM, 14-day rotation |

**CRITICAL RULES:**
- Never expose port 5678 to public (Docker bypasses UFW — binding to 127.0.0.1 IS the enforcement)
- Never modify SSH config without testing from a second terminal first
- Never run destructive git commands on the VPS without explicit user permission
- Always verify existing services still work after any change

---

## 4. Deployed Systems (Current State — June 22, 2026)

| System | Platform | Status | Location |
|--------|----------|--------|----------|
| Telegram Sales Bot | Cloudflare Worker | LIVE (v13) | `telegram-assistant/worker.js` |
| Challenge Bot | Docker on Hetzner | LIVE (v1.0.0) | `/opt/empire-challenge/` |
| LinkedIn Engine | Cloudflare Worker | BUILT (not deployed) | `linkedin-engine/worker.js` |
| n8n Workflows | Docker on Hetzner | RUNNING | `/opt/n8n/` |
| Landing Pages | Not hosted | BUILT | `web/index.html`, `web/index-ar.html` |
| Mobile App | Not published | Phase 1 done | `app/` + `src/` |

---

## 5. Code Conventions

### Telegram/LinkedIn Workers (JavaScript)
- Single self-contained file (`worker.js`)
- All secrets via Cloudflare environment variables (fallback constants at top for dev)
- Always return HTTP 200 to Telegram (prevents webhook retry storms)
- Version constant at top of file — bump on every change
- Test: paste into Cloudflare dashboard → Deploy → send `/version` to bot

### Challenge Bot (Python)
- Modular: `src/` package with separate modules per concern
- Config via `.env` (python-dotenv) — never commit `.env`
- Tests: `pytest` in `tests/` — must pass before deployment
- Database: SQLite with UPSERT pattern, duplicate protection
- Docker: `docker compose up -d --build` to deploy changes

### General
- Commit messages: `type(scope): description` (e.g., `feat(challenge-bot): add version command`)
- Branch naming: `component/description` (e.g., `challenge-bot/v1.0.0-production-ready`)
- Always push to a branch, never directly to main (create PR)
- Arabic text: use Egyptian dialect, warm tone, consistent emojis

---

## 6. n8n Workflow Rules

- Switch node expressions DO NOT reliably evaluate nested JSON paths — they fail silently
- **Mandatory pattern:** Telegram Trigger → Code Node (flatten to `_route`) → Switch (simple string match)
- After Google Sheets nodes: MUST use explicit reference `$('Code in JavaScript').first().json...`
- Never use `$json` after a Sheets node — it contains Sheets output, not trigger data

---

## 7. Decision Log (Why We Chose What)

| Decision | Why |
|----------|-----|
| n8n over Make.com/Zapier | No operation limits, self-hosted, no vendor lock-in |
| Cloudflare Workers over VPS for bots | Always-on, zero-cost, no process management |
| No AI in Telegram sales bot | AI free tiers are unreliable; keyword bank = 100% uptime |
| SQLite over PostgreSQL (challenge bot) | Single-file DB, zero setup, perfect for <10K users |
| Groq over OpenAI (challenge bot AI) | Free tier, no credit card, fast inference |
| Docker over bare Python | Isolation, reproducibility, survives server updates |
| Hetzner over Oracle Cloud | Oracle signup failed; Hetzner is stable since 2003 |
| Helsinki over other locations | CX23 available; good latency to Middle East |

---

## 8. What NOT to Do

- Do NOT add paid dependencies or services without explicit permission
- Do NOT auto-publish content to LinkedIn/TikTok (human-in-the-loop always)
- Do NOT store real credentials in code (always `.env` or Cloudflare secrets)
- Do NOT modify the Telegram bot without bumping version and testing `/version`
- Do NOT remove the payment approval gate from any system
- Do NOT assume Make.com/Zapier as solutions (user migrated away deliberately)
- Do NOT suggest tools with operation limits, credit caps, or usage-based pricing
- Do NOT break existing running services when deploying new ones

---

## 9. File References

Key files to read before making changes:

- **Architecture:** `docs/SERVER_REFERENCE.md`
- **Recovery:** `docs/EMERGENCY-RECOVERY.md`
- **Project index:** `docs/PROJECTS-CHECKLIST.md`
- **Handoff:** `docs/PROJECT-CONTEXT.md`
- **Challenge program:** `docs/تحدي-30-يوم-المنطقة-غير-المريحة.md`
- **Brand voice:** `linkedin-engine/brand/macal-brand-bible.md`

---

## 10. Contact & Accounts

| Service | Account |
|---------|---------|
| GitHub | `empireenglishcommunity-glitch` |
| Telegram (admin) | `@macal_emperor` |
| TikTok | `@macal.empire` |
| Domain | `empireenglish.online` (Namecheap → Cloudflare NS) |
| Cloudflare | Free plan |
| Hetzner | Project "Empire English" |
| n8n | `https://bot.empireenglish.online` (owner: macalempire@gmail.com) |
| Discord | Empire English — تحدّي 30 يوم (ID: 1518615304035373106) |
