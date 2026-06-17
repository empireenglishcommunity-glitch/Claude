# 🗂️ Empire English — Master Guide (Never Lose Your Work)

This guide explains **everything**: where your work lives, how to save it to your PC,
the folder structure, how the system works, how to enhance it (add answers/buttons),
and how to continue in a **new conversation or with another AI**.

---

## 1) WHERE EVERYTHING LIVES (your single source of truth)

- **GitHub repository:** https://github.com/empireenglishcommunity-glitch/Claude
- **Branch:** `launch-night-strategy`
- **Pull Request #1:** contains all the work.

> ✅ As long as it's on GitHub, you will never lose it. GitHub is your backup.
> 💡 Recommended: **merge Pull Request #1 into `main`** so the main branch has everything (cleaner going forward). On GitHub → Pull requests → #1 → "Merge".

---

## 2) HOW TO SAVE IT TO YOUR PC (3 ways)

**Way A — Download ZIP (easiest, no tools):**
1. Open the repo on GitHub.
2. Switch to branch `launch-night-strategy` (top-left branch dropdown).
3. Click the green **Code** button → **Download ZIP**.
4. Save the ZIP on your PC (e.g., `Documents/EmpireEnglish/`). Done — full backup.

**Way B — Clone with Git (keeps it updatable):**
```
git clone -b launch-night-strategy https://github.com/empireenglishcommunity-glitch/Claude.git
```

**Way C — Copy single files:** open any file on GitHub → "Raw" → copy → paste into a local file with the same name.

> Do Way A once a week (or after big changes) so you always have an offline copy.

---

## 3) FOLDER STRUCTURE (what each file is)

```
Claude/
├── README.md
├── GUIDE.md                              ← this guide
│
├── index.html                            ← Landing page (English)
├── index-ar.html                         ← Landing page (Arabic / RTL)
│
├── EEC-Launch-Night-Playbook.md          ← Full launch strategy + scripts + posts + image prompts
├── EEC-Feasibility-Study.md              ← Egypt feasibility + salary-coverage math
├── EEC-International-Pricing-and-Feasibility.md  ← Gulf/worldwide pricing + feasibility
│
└── telegram-assistant/
    ├── worker.js                         ← ⭐ THE BOT (Cloudflare Worker) — the live one
    ├── SETUP.md                          ← Step-by-step setup (bot, KV, cron, webhook)
    └── Code.gs                           ← OLD version (Google Apps Script) — not used anymore
```

**The only file that runs the bot is `telegram-assistant/worker.js`.**

---

## 4) HOW THE BOT WORKS (the mental model)

```
Customer (Telegram)  ⇄  Telegram  ⇄  Cloudflare Worker (worker.js)  ⇄  KV storage
```

- **Telegram Bot** = the front door (created via @BotFather).
- **Cloudflare Worker (`worker.js`)** = the brain. It receives every message via a "webhook" and decides what to reply. It's free and always-on.
- **KV namespace (named `KV`)** = the memory. Stores: learned answers (`LEARNED`), each customer's state (`u:<id>`), and invoices (`INVOICES`).
- **Cron Trigger** = a daily timer that sends the reminder funnel.

**Inside `worker.js`, the important parts:**
- `TELEGRAM_TOKEN` + `ADMIN_CHAT_ID` + `PAY` (top of file) → your settings.
- `ANSWERS` → the keyword answer bank (typed-text replies).
- `view()` → the button menus (main, packages, compare, help, faq, sub).
- `PKG`, `CMP`, `REC`, `FAQ` → the text shown by buttons.
- `REMINDERS` → the 5-day reminder funnel.
- Logic: general info = auto-reply · payment/crypto/offer = sent to YOU to approve first · unknown = escalated to you (and saved when you teach it).
- Admin commands: `/version` `/kv` `/list` `/stats`.

---

## 5) HOW TO ENHANCE IT (copy-paste recipes)

> After ANY change: paste the file into Cloudflare → **Deploy** → send `/version` to confirm.

### ➕ Add a new question + answer (auto-reply)
In `worker.js`, inside `const ANSWERS = [ ... ]`, add a line:
```js
{ keys:['كلمة','كلمة تانية','english word'], reply:`الرد اللي هيتبعت للعميل 👑` },
```
- `keys` = trigger words (add all variations people might type).
- `reply` = the message. Put specific topics ABOVE general ones.

### 💰 Make an answer require YOUR approval (money-related)
Add `sensitive:true`:
```js
{ keys:['سعر خاص','عرض'], sensitive:true, reply:`...` },
```

### 🔘 Make a keyword open a button menu instead of text
```js
{ keys:['الباقات','الاسعار'], menu:"packages" },
```
(valid menus: `main`, `packages`, `compare`, `help`, `faq`, `sub`)

### 🆕 Add a new button to a menu
In `view()`, find the menu (e.g. `faq`) and add a button to its `K([...])`:
```js
B("🎁 المكافآت","faq:bonus")
```
Then add the answer in the `FAQ` object:
```js
const FAQ = { ... , bonus:`تفاصيل المكافآت هنا 👑` };
```
(`B("label","prefix:key")` → the callback is handled in `onCallback`.)

### 💵 Change prices / payment numbers
- Payment numbers: edit the `PAY = { ... }` object at the top.
- Prices in text: search the file for `١٩٩` / `٣٩٩` etc. and the `PKG`/`CMP` objects.

### 🔔 Edit the daily reminders
Edit the `REMINDERS = [ ... ]` array (5 messages).

> 🧠 Easiest enhancement of all: just chat with the bot's **🧠 رد + تعليم** button — it learns new answers automatically (saved in KV).

---

## 6) HOW TO CONTINUE LATER (new conversation or another AI)

**To continue with ME or any AI in a new chat, paste this handoff prompt:**

> "I have a Telegram sales bot for 'Empire English' built as a single Cloudflare Worker file (`worker.js`). It uses NO AI — it's a keyword answer bank + inline-button menus, with Cloudflare KV for memory/learning, a payment-approval gate (money stuff goes to admin first), daily reminder funnel, invoice capture, and admin commands (/version /kv /list /stats). The full repo is at github.com/empireenglishcommunity-glitch/Claude (branch launch-night-strategy). I'm pasting the current `worker.js` below. I want to [DESCRIBE YOUR CHANGE]. Keep it ONE self-contained worker.js, keep all existing features working, and keep the syntax valid."

Then paste the contents of `worker.js`.

**Tips:**
- Always give the AI the **current `worker.js`** (the most important file).
- Ask it to **return the full file**, not snippets, so you can paste-and-deploy.
- After any AI edits: paste into Cloudflare → Deploy → test `/version`.

---

## 7) DEPLOY CHEAT-SHEET (Cloudflare)

1. Cloudflare dashboard → Workers & Pages → your worker → **Edit code**.
2. Paste the new `worker.js`.
3. Make sure the top still has YOUR `TELEGRAM_TOKEN` and `ADMIN_CHAT_ID`.
4. **Deploy**.
5. In Telegram, send the bot `/version` to confirm the new version is live.

**One-time setup (if rebuilding from scratch):** follow `telegram-assistant/SETUP.md`
(create bot → create Worker → bind KV namespace named `KV` → set webhook → add Cron `0 16 * * *`).

---

## 8) BACKUP CHECKLIST ✅
- [ ] Pull Request #1 merged into `main` (optional but cleaner).
- [ ] Downloaded a ZIP of the repo to my PC.
- [ ] Saved my `TELEGRAM_TOKEN`, `ADMIN_CHAT_ID`, and KV namespace name somewhere safe.
- [ ] Know that `telegram-assistant/worker.js` is the live bot file.
- [ ] Bookmarked the repo link.

> Your work is safe on GitHub. This guide + the repo = you can rebuild or continue anytime, anywhere, with anyone. 👑
