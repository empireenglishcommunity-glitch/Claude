# 🤖 LinkedIn Content Engine — Phase 1 (Setup Guide)

Generates a daily, **brand-voice** LinkedIn post (hook + body + hashtags) with Gemini's
free tier and sends it to you on **Telegram** with buttons:

> **[✅ Approve & Save]  [🔄 Regenerate]  [🔁 Other hook]  [✏️ Tweak]  [⏭️ Skip]**

Nothing is auto-published. You tap once (~60 seconds), copy the approved block, and paste
it into LinkedIn's free native scheduler. That human touch is exactly what the 2026
algorithm rewards — and it keeps you 100% inside LinkedIn's Terms.

**Cost: $0.** Cloudflare Workers (free) + Gemini free tier + Telegram (free).

---

## What you need (all free, ~10 minutes)

1. **Telegram bot token** — message **@BotFather** → `/newbot` → copy the token.
2. **Your Telegram chat id** — message **@userinfobot** → copy the number. Then press **Start** on your new bot so it can message you.
3. **Gemini API key** — https://aistudio.google.com/apikey (no credit card).
4. *(Optional)* **Groq API key** — https://console.groq.com (free secondary fallback).

---

## Option A — Dashboard (no CLI, matches the sales-bot workflow) ✅ easiest

1. Go to **dash.cloudflare.com → Workers & Pages → Create → Worker** → name it `linkedin-engine` → **Deploy**.
2. **Edit code** → delete the default → paste the entire contents of **`worker.js`**.
3. **Settings → Variables and Secrets** → add these (type *Secret* for the keys):
   | Name | Value |
   |---|---|
   | `TELEGRAM_TOKEN` | token from BotFather |
   | `ADMIN_CHAT_ID` | your id from @userinfobot |
   | `GEMINI_API_KEY` | key from AI Studio |
   | `GROQ_API_KEY` | *(optional)* |
   > Don't want to use variables? You can instead paste the values into the `*_FALLBACK`
   > constants at the top of `worker.js`. Variables are safer.
4. **Settings → Bindings → Add → KV namespace** → create one (e.g. `linkedin-kv`) → set
   **Variable name = `KV`** exactly → **Deploy**.
5. **Connect Telegram** — open this URL in your browser (swap in your token + worker URL):
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_WORKER_URL>&drop_pending_updates=true
   ```
   You should get `{"ok":true,...}`.
6. **Daily auto-post** — **Settings → Triggers → Cron Triggers → Add** → `0 5 * * *`
   (05:00 UTC = 07:00 Cairo / 09:00 Dubai). Adjust to your preferred morning time.

## Option B — CLI (wrangler)

```bash
cd linkedin-engine
npx wrangler kv namespace create KV     # paste the returned id into wrangler.toml
npx wrangler secret put TELEGRAM_TOKEN
npx wrangler secret put ADMIN_CHAT_ID
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GROQ_API_KEY    # optional
npx wrangler deploy
# then set the Telegram webhook (step 5 above) to your deployed URL
```

---

## Try it

- Message your bot **`/new`** → within a few seconds you get a full draft with buttons.
- Tap **🔁 Other hook** to cycle hook variants, **✏️ Tweak** → reply with a note like
  *"shorter"* / *"more sarcasm"* / *"add a real stat"* to rewrite it, **🔄 Regenerate**
  for a brand-new angle, **✅ Approve & Save** to store it and get a clean copy block.
- Every morning the cron sends one automatically.

**Admin commands:** `/new` · `/queue` · `/clearqueue` · `/pillars` · `/version`

---

## 🔑 Make it sound like YOU (most important step)

Open `worker.js` and edit the **BRAND VOICE** block near the top:

- **`BRAND_VOICE`** — a few honest lines about how you write.
- **`BEST_POSTS`** — paste **6–10 of your best real LinkedIn posts**. This is the #1 lever
  for voice quality. The placeholders work, but your real posts make it sound like you.
- **`SARCASM_MAX_LEVEL` / `SARCASM_PROBABILITY`** — your Mike-Baxter dial (default: medium, ~1 in 4 posts).
- **`PROMO_EVERY_N_POSTS` / `PROMO_BRANDS`** — how often it softly mentions Macal Empire / Empire English Community (default: every 6th post).
- **`LANGUAGE`** — `"en"`, `"ar"`, or `"mix"`.
- **`PILLARS` / `FORMATS` / `HASHTAG_BANK`** — your topics, post styles, and hashtags.

Redeploy after editing (dashboard: **Deploy**; CLI: `npx wrangler deploy`).

---

## How reliability works

`Gemini` → if it fails/rate-limits → `Groq` (if configured) → built-in **EVERGREEN** bank.
You will **never** get an empty day. Topic rotation also avoids repeating the last few pillars.

---

## ملخّص سريع بالعربي

- البوت بيكتبلك بوست LinkedIn يومي بصوتك ويبعتهولك على تيليجرام بأزرار:
  **موافقة / إعادة توليد / هوك تاني / تعديل / تخطّي**. مفيش نشر تلقائي — إنت اللي بتوافق.
- مجاني ١٠٠٪ (Cloudflare + Gemini + Telegram).
- التركيب زي بوت المبيعات بالظبط: انسخ `worker.js` في Cloudflare، حط الأسرار، اعمل KV باسم `KV`،
  فعّل الـ webhook، وحط Cron يومي.
- **أهم خطوة:** افتح `worker.js` وحط ٦–١٠ من أحسن بوستاتك في `BEST_POSTS` عشان يطلع بصوتك إنت.
- جرّب: ابعت `/new` للبوت.
