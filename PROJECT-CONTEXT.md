# 🧭 PROJECT CONTEXT — Empire English (paste this into any new conversation)

> Purpose: hand off the ENTIRE project to a new chat (or another AI) so work continues
> smoothly without re-explaining. Read this top to bottom; everything is here.

---

## 0) ONE-LINE SUMMARY
"Empire English Community (EEC)" — an online English-learning community (sub-brand of MACALE EMPIRE)
for Arabic speakers. We built: pricing strategy, feasibility studies, landing pages (EN+AR),
a launch playbook, and a **Telegram sales bot** (the main ongoing work).

---

## 1) WHERE EVERYTHING LIVES
- **GitHub repo:** https://github.com/empireenglishcommunity-glitch/Claude
- **Branch:** `launch-night-strategy`  ·  **Pull Request:** #1
- The bot's live file: **`telegram-assistant/worker.js`**

---

## 2) FILES IN THE REPO
- `GUIDE.md` — master guide (backup, folder structure, how to enhance, deploy).
- `PROJECT-CONTEXT.md` — this handoff file.
- `index.html` / `index-ar.html` — landing pages (English / Arabic RTL), black+gold "empire" theme.
- `EEC-Launch-Night-Playbook.md` — launch strategy, Telegram posts, package cards, image prompts.
- `EEC-Feasibility-Study.md` — Egypt feasibility + how many members to cover a 3,000 AED salary.
- `EEC-International-Pricing-and-Feasibility.md` — Gulf/worldwide pricing + feasibility.
- `telegram-assistant/worker.js` — ⭐ the Telegram bot (Cloudflare Worker).
- `telegram-assistant/SETUP.md` — bot setup steps.
- `telegram-assistant/Code.gs` — OLD Apps Script version (deprecated, ignore).

---

## 3) THE TELEGRAM BOT (current state)
- **Platform:** Cloudflare Worker (single file `worker.js`), returns clean HTTP 200. Free + always-on.
- **Storage:** Cloudflare KV namespace bound as **`KV`** (stores `LEARNED` answers, `u:<id>` customer memory, `INVOICES`).
- **No AI** (Gemini/Groq free tiers were unreliable → we use a keyword answer bank + button menus). This was a deliberate, final decision.
- **Current version:** **v13** (check by sending the bot `/version`).
- **Config at top of worker.js:** `TELEGRAM_TOKEN`, `ADMIN_CHAT_ID`, `PAY` object.

### How it behaves
- **First message from a customer →** welcome + main menu buttons.
- **Buttons (instant):** الباقات / ساعدني أختار (quiz) / قارن الباقات (all 6 pairings) / طرق الدفع / أسئلة شائعة / عايز أشترك.
- **Typed text →** matched against the `ANSWERS` keyword bank → auto-reply (general info) instantly.
- **Payment / crypto / offers (money-sensitive) →** sent to ADMIN for approval FIRST (safety), then released to customer. Crypto (USDT/Binance) & bank transfer → escalated to admin to send personally.
- **Unknown question →** shows customer the menu + escalates to admin with a "🧠 رد + تعليم" button. When admin replies, the answer is SAVED (auto-learn) for next time.
- **Payment proof (photo) →** forwarded to admin + logged in INVOICES + "✅ تأكيد الاشتراك" button (marks subscribed, sends welcome, stops reminders).
- **Daily reminder funnel (Cron `0 16 * * *`):** 5 messages over 5 days (success story → comparison → objections → limited offer → last chance), stops when they subscribe. Feedback request 2 days after subscribing.
- **Admin commands:** `/version` `/kv` `/list` `/stats`.

### Key code parts in worker.js
- `ANSWERS` = keyword bank. `view()` = button menus. `PKG/CMP/REC/FAQ` = button texts. `REMINDERS` = funnel.
- Logic flags per answer: `menu:"..."` (opens a menu), `sensitive:true` (payment approval), `personal:true` (crypto/bank → admin sends).

---

## 4) PRICING (confirmed)
| Tier | 🇪🇬 Egypt /mo | 🌍 Worldwide /mo | Role |
|------|--------------|------------------|------|
| Recruit | 199 EGP | $19 | entry |
| Builder ⭐ | 399 EGP | $39 | most popular (push this) |
| Empire | 799 EGP | $89 | faster + personal |
| VIP | 3,500 EGP | $249 | private 1-on-1 (limited) |
- Founding price = locked forever. Annual ≈ 35% off. 7-day money-back guarantee. Cohort 1 starts Sat 27 June.
- Regional pricing framed as "fair, like Netflix" (Egypt pays less, not more).

## 5) PAYMENT METHODS (confirmed)
- 🇪🇬 Vodafone Cash: 01004581035 · InstaPay: 01004581035 / mohamedashry10041
- 🌍 PayPal: paypal.me/bioroma
- 🪙 USDT (Binance) & 🏦 bank transfer (large amounts / annual) → admin sends details personally.

## 6) KEY DECISIONS / PREFERENCES
- Bot copy must be **clean Arabic (Egyptian dialect)**, well-formatted, minimal English (only brand/package names + PayPal/USDT). Warm, motivating, sales-oriented, consistent emojis.
- **Any money-related message must be approved by the admin before reaching the customer.**
- Sell hard but honest: upsell/cross-sell, push Builder as the sweet spot.
- Keep it free + reliable. After ANY code change: paste into Cloudflare → Deploy → confirm `/version`.

## 7) WHAT'S DONE ✅ / POSSIBLE NEXT 🔜
Done: pricing, feasibility (Egypt + intl), landing pages (EN/AR), launch playbook + posts + cards, bot v13 (menus, payment gate, learning, reminders, invoices, feedback).
Possible next: real success stories/testimonials on the landing page + bot, og-image, analytics pixels, more bank topics, custom domain, weekly stats report.

---

## 8) ⭐ HANDOFF PROMPT (copy-paste this into the NEW conversation)

"I'm continuing a project called **Empire English Community** (online English-learning community for Arabic speakers, sub-brand of MACALE EMPIRE). Everything is in my GitHub repo `empireenglishcommunity-glitch/Claude` (branch `launch-night-strategy`, PR #1), and a full context file is at `PROJECT-CONTEXT.md`.

The main ongoing work is a **Telegram sales bot** built as a SINGLE Cloudflare Worker file `telegram-assistant/worker.js` — NO AI, it's a keyword answer bank + inline-button menus, with Cloudflare KV (bound as `KV`) for memory/auto-learning, a payment-approval gate (money stuff goes to admin first), a daily reminder funnel (Cron), invoice capture, subscribe-confirm, and admin commands (/version /kv /list /stats). Current version is v13.

I'm pasting the current `worker.js` below. I want to [DESCRIBE WHAT YOU WANT]. Please keep it ONE self-contained worker.js, keep ALL existing features working, keep the Arabic copy clean and well-formatted, keep money-related messages behind admin approval, and return the FULL updated file so I can paste-and-deploy. Bump the version number too."

(Then paste the full contents of `telegram-assistant/worker.js`.)

---
> With this file + the repo, any new chat or AI can continue exactly where we stopped. 👑
