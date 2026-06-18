/**
 * LinkedIn Content Engine — Phase 1 (Text + Telegram Cockpit) — Cloudflare Workers
 * --------------------------------------------------------------------------------
 * Generates a daily, brand-voice LinkedIn post (hook + body + hashtags) with Gemini
 * (free tier) and delivers it to YOU on Telegram with inline buttons:
 *
 *      [✅ Approve & Save]  [✏️ Tweak]  [🔄 Regenerate]  [🔁 Other hook]  [⏭️ Skip]
 *
 * Nothing is ever auto-published. You stay in control with a ~60-second daily tap —
 * which is exactly what the 2026 LinkedIn algorithm rewards.
 *
 * Reliability: Gemini -> (optional Groq) -> built-in EVERGREEN bank, so you NEVER
 * have an empty day. Topic rotation avoids repeating the same pillar/format.
 *
 * Setup (see SETUP.md): bind a KV namespace named "KV", add a daily Cron trigger,
 * and set TELEGRAM_TOKEN, ADMIN_CHAT_ID, GEMINI_API_KEY (env vars OR the constants
 * just below — env vars win and are safer).
 *
 * Admin commands: /new  /queue  /clearqueue  /pillars  /version
 */

// ============================================================
//  1) SECRETS — prefer Cloudflare env vars; constants are fallback for quick paste
// ============================================================
const TELEGRAM_TOKEN_FALLBACK = "PUT_YOUR_TELEGRAM_BOT_TOKEN_HERE";
const ADMIN_CHAT_ID_FALLBACK  = "PUT_YOUR_TELEGRAM_CHAT_ID_HERE";
const GEMINI_API_KEY_FALLBACK = "PUT_YOUR_GEMINI_API_KEY_HERE";
const GROQ_API_KEY_FALLBACK   = ""; // optional secondary fallback (console.groq.com)

const VERSION = "linkedin-engine v1.0";
const GEMINI_MODEL = "gemini-2.5-flash-lite"; // 1,000 free requests/day
const GROQ_MODEL   = "llama-3.3-70b-versatile";

// ============================================================
//  2) BRAND VOICE — this is the single biggest quality lever. EDIT THIS.
// ============================================================
// Language for the posts: "en", "ar", or "mix" (let the model choose per topic).
const LANGUAGE = "en";

// A short, honest description of how YOU write. Be specific.
const BRAND_VOICE = `
I'm a multi-disciplinary personal-brand creator (investing, markets, trading, real
estate, AI, marketing, social media, design, modeling, cooking, writing, life coaching,
entrepreneurship). My voice is direct, confident, and practical. I share real lessons,
strong opinions, and tactical takeaways — never vague motivational fluff. Short punchy
lines. One idea per post. I write like a sharp friend who respects the reader's time.
`.trim();

// 🔑 PASTE 6–10 OF YOUR BEST REAL LINKEDIN POSTS HERE (between the backticks).
// This is what makes the output sound like YOU and not generic AI. Until you fill
// these in, the engine still works but the voice will be more generic.
const BEST_POSTS = [
`// Example placeholder — replace with a real post of yours.
Most people don't have a money problem. They have an attention problem.
You can't out-earn a mind that's scattered across 14 browser tabs and 3 side hustles.
Pick one game. Learn its rules cold. Then play it for 5 years instead of 5 weeks.`,
`// Example placeholder — replace with a real post of yours.
Real estate taught me the lesson no course did: the deal is won before you negotiate.
It's won in the boring months when nobody's watching and you're still showing up.`,
];

// Mike-Baxter-style sarcasm dial: 0 = never, 1 = light, 2 = medium, 3 = heavy.
// It's applied PROBABILISTICALLY so it stays a seasoning, not a gimmick.
const SARCASM_MAX_LEVEL = 2;
const SARCASM_PROBABILITY = 0.25; // ~1 in 4 posts gets a sarcastic edge

// Soft self-promotion. Every Nth post weaves in one of these brands with a light CTA.
const PROMO_EVERY_N_POSTS = 6;
const PROMO_BRANDS = [
  "Macal Empire (my brand / business ventures)",
  "Empire English Community (my community for learning English with confidence)",
];

// ============================================================
//  3) CONTENT MATRIX — pillars + formats. Rotation avoids recent repeats.
// ============================================================
const PILLARS = [
  "investing", "financial markets", "trading", "real estate", "AI",
  "marketing", "social media", "design", "modeling", "cooking",
  "writing", "life coaching", "entrepreneurship",
];

const FORMATS = [
  "contrarian take", "personal story", "actionable how-to", "numbered listicle",
  "mini case study", "myth-bust", "thought-provoking question", "lessons learned",
];

// 3–5 curated hashtags per pillar. Keep it tight — over-hashtagging looks spammy.
const HASHTAG_BANK = {
  "investing":         ["#Investing", "#WealthBuilding", "#FinancialFreedom", "#MoneyMindset"],
  "financial markets": ["#Markets", "#Finance", "#Economy", "#Investing"],
  "trading":           ["#Trading", "#Markets", "#RiskManagement", "#Discipline"],
  "real estate":       ["#RealEstate", "#PropertyInvesting", "#Wealth", "#RealEstateInvesting"],
  "AI":                ["#AI", "#ArtificialIntelligence", "#Automation", "#FutureOfWork"],
  "marketing":         ["#Marketing", "#Branding", "#GrowthMarketing", "#ContentStrategy"],
  "social media":      ["#SocialMedia", "#ContentCreation", "#PersonalBrand", "#CreatorEconomy"],
  "design":            ["#Design", "#DesignThinking", "#Creativity", "#Branding"],
  "modeling":          ["#Modeling", "#Confidence", "#PersonalBrand", "#Mindset"],
  "cooking":           ["#Cooking", "#Food", "#Discipline", "#Creativity"],
  "writing":           ["#Writing", "#Copywriting", "#Storytelling", "#ContentCreation"],
  "life coaching":     ["#LifeCoaching", "#PersonalGrowth", "#Mindset", "#SelfImprovement"],
  "entrepreneurship":  ["#Entrepreneurship", "#StartupLife", "#Business", "#Founder"],
};

const HOW_MANY_RECENT_TO_AVOID = 4; // don't reuse the last N pillars

// ============================================================
//  4) EVERGREEN FALLBACK BANK — used if the AI is down/rate-limited. Never empty.
// ============================================================
const EVERGREEN = [
  { pillar:"entrepreneurship", hook:"Everyone wants the highlight reel. Nobody wants the reps.",
    body:"The highlight reel is 30 seconds.\nThe reps are 3 years.\n\nThe people you admire aren't more talented.\nThey just kept showing up on the days it felt pointless.\n\nConsistency isn't sexy. It's just undefeated.",
    hashtags:["#Entrepreneurship", "#Discipline", "#Mindset"] },
  { pillar:"investing", hook:"The best investment I ever made had a 0% return for 2 years.",
    body:"It was a skill, not a stock.\n\nIt paid nothing while I learned it.\nThen it paid for everything after.\n\nStop optimizing for this quarter. Start compounding for this decade.",
    hashtags:["#Investing", "#WealthBuilding", "#MoneyMindset"] },
  { pillar:"AI", hook:"AI won't take your job. Someone using AI to do your job 10x faster will.",
    body:"The gap isn't human vs. machine.\nIt's people who learned the new tools vs. people who didn't.\n\nSpend one hour a week learning. In a year you'll be unrecognizable.",
    hashtags:["#AI", "#FutureOfWork", "#Automation"] },
];

// ============================================================
//  5) RUNTIME — entrypoints
// ============================================================
export default {
  async fetch(req, env) {
    if (req.method !== "POST") return new Response(VERSION + " ✅");
    let u; try { u = await req.json(); } catch (e) { return new Response("ok"); }
    try {
      if (u.callback_query) await onCallback(u.callback_query, env);
      else if (u.message)   await onMessage(u.message, env);
    } catch (err) {
      await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "⚠️ Error: " + (err && err.stack ? err.stack : err) });
    }
    return new Response("ok");
  },

  // Daily cron (set e.g. "0 5 * * *"): generate today's post and deliver to Telegram.
  async scheduled(event, env) {
    await generateAndDeliver(env, { reason: "daily" });
  },
};

// ============================================================
//  6) HELPERS (mirrors the sales-bot style)
// ============================================================
function TOKEN(env) { return (env && env.TELEGRAM_TOKEN) || TELEGRAM_TOKEN_FALLBACK; }
function ADMIN(env) { return (env && env.ADMIN_CHAT_ID) || ADMIN_CHAT_ID_FALLBACK; }
function GKEY(env)  { return (env && env.GEMINI_API_KEY) || GEMINI_API_KEY_FALLBACK; }
function QKEY(env)  { return (env && env.GROQ_API_KEY) || GROQ_API_KEY_FALLBACK; }

async function tg(env, method, payload) {
  return fetch(`https://api.telegram.org/bot${TOKEN(env)}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
}
function K(rows) { return { inline_keyboard: rows }; }
function B(t, d) { return { text: t, callback_data: d }; }

// Marker embedded in the force-reply prompt so we can route the admin's tweak text.
const TWEAKMARK = "✏️ Tweak instructions for draft #";

// The inline keyboard shown under every delivered draft.
function draftKeyboard() {
  return K([
    [B("✅ Approve & Save", "lp:ap"), B("🔄 Regenerate", "lp:rg")],
    [B("🔁 Other hook", "lp:hk"), B("✏️ Tweak", "lp:tw")],
    [B("⏭️ Skip", "lp:sk")],
  ]);
}

// ============================================================
//  7) TOPIC ROTATION
// ============================================================
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function chooseTopic(env) {
  let recent = [];
  if (env && env.KV) recent = (await env.KV.get("recent", "json")) || [];
  const recentPillars = recent.slice(-HOW_MANY_RECENT_TO_AVOID).map(r => r.pillar);
  let available = PILLARS.filter(p => !recentPillars.includes(p));
  if (available.length === 0) available = PILLARS.slice();
  const pillar = pick(available);
  const format = pick(FORMATS);

  // promo rotation counter
  let count = 0;
  if (env && env.KV) count = Number(await env.KV.get("post_count")) || 0;
  const isPromo = PROMO_EVERY_N_POSTS > 0 && (count + 1) % PROMO_EVERY_N_POSTS === 0;
  const promoBrand = isPromo ? pick(PROMO_BRANDS) : null;

  // sarcasm dial (probabilistic)
  const sarcasm = Math.random() < SARCASM_PROBABILITY ? 1 + Math.floor(Math.random() * SARCASM_MAX_LEVEL) : 0;

  return { pillar, format, isPromo, promoBrand, sarcasm };
}

async function rememberTopic(env, topic) {
  if (!env || !env.KV) return;
  const recent = (await env.KV.get("recent", "json")) || [];
  recent.push({ pillar: topic.pillar, format: topic.format, ts: Date.now() });
  await env.KV.put("recent", JSON.stringify(recent.slice(-20)));
  const count = (Number(await env.KV.get("post_count")) || 0) + 1;
  await env.KV.put("post_count", String(count));
}

// ============================================================
//  8) PROMPT BUILDING + AI CALLS
// ============================================================
function buildPrompt(topic, tweakInstruction) {
  const langLine = LANGUAGE === "ar" ? "Write the post in Arabic."
    : LANGUAGE === "mix" ? "Write in whichever language (English or Arabic) best fits the topic and my audience."
    : "Write the post in English.";

  const sarcasmLine = topic.sarcasm > 0
    ? `Add a Mike-Baxter-style dry, sarcastic edge at intensity ${topic.sarcasm}/3 — witty and a little cheeky, never mean or unprofessional.`
    : "Keep the tone sincere and direct (no sarcasm this time).";

  const promoLine = topic.isPromo && topic.promoBrand
    ? `At the very end, weave in ONE soft, natural mention of "${topic.promoBrand}" with a light call-to-action. Do not make it salesy.`
    : "Do NOT promote any product or brand in this post. Pure value only.";

  const examples = BEST_POSTS
    .map((p, i) => `--- EXAMPLE ${i + 1} ---\n${p.replace(/^\/\/.*$/gm, "").trim()}`)
    .filter(e => e.replace(/--- EXAMPLE \d+ ---/, "").trim().length > 0)
    .join("\n\n");

  const tweakLine = tweakInstruction
    ? `\n\nIMPORTANT — apply this revision instruction from me: "${tweakInstruction}"`
    : "";

  return `You are my ghostwriter for LinkedIn. Match MY voice precisely.

MY VOICE:
${BRAND_VOICE}

${examples ? "EXAMPLES OF MY REAL POSTS (match this rhythm, length, and tone):\n" + examples + "\n" : ""}
TODAY'S BRIEF:
- Pillar / topic area: ${topic.pillar}
- Format: ${topic.format}
- ${langLine}
- ${sarcasmLine}
- ${promoLine}

RULES:
- Write a scroll-stopping LinkedIn post that earns COMMENTS, not just likes.
- The first line (hook) must make people stop and want to read more.
- Short lines. Generous line breaks. One idea. No corporate fluff. No "In today's fast-paced world".
- Do NOT use markdown, asterisks, or headers. Plain text only (LinkedIn style).
- 80–200 words for the body.
- End the body in a way that invites a reply or a comment.${tweakLine}

Return ONLY valid JSON (no code fences) with exactly this shape:
{
  "hooks": ["hook option 1", "hook option 2", "hook option 3"],
  "body": "the post body WITHOUT the hook line and WITHOUT hashtags",
  "hashtags": ["#Tag1", "#Tag2", "#Tag3"]
}`;
}

function extractJson(text) {
  if (!text) return null;
  let t = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "");
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s !== -1 && e !== -1 && e > s) t = t.slice(s, e + 1);
  try { return JSON.parse(t); } catch (err) { return null; }
}

async function callGemini(env, prompt) {
  const key = GKEY(env);
  if (!key || key.indexOf("PUT_YOUR") === 0) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.95, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data && data.candidates && data.candidates[0] &&
    data.candidates[0].content && data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
  return extractJson(text);
}

async function callGroq(env, prompt) {
  const key = QKEY(env);
  if (!key) return null;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
    body: JSON.stringify({
      model: GROQ_MODEL, temperature: 0.95,
      messages: [
        { role: "system", content: "You are an expert LinkedIn ghostwriter. Always return valid JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  return extractJson(text);
}

// Produce a draft object: { pillar, format, hooks[], hookIdx, body, hashtags[], source }
async function generateDraft(env, topic, tweakInstruction) {
  const prompt = buildPrompt(topic, tweakInstruction);
  let out = await callGemini(env, prompt);
  let source = "gemini";
  if (!out) { out = await callGroq(env, prompt); source = "groq"; }

  if (out && Array.isArray(out.hooks) && out.body) {
    let hashtags = Array.isArray(out.hashtags) && out.hashtags.length ? out.hashtags : (HASHTAG_BANK[topic.pillar] || []).slice(0, 4);
    return {
      pillar: topic.pillar, format: topic.format,
      hooks: out.hooks.filter(Boolean).slice(0, 3),
      hookIdx: 0, body: String(out.body).trim(),
      hashtags, source,
    };
  }

  // Fallback: evergreen bank (never an empty day)
  const ev = pick(EVERGREEN);
  return {
    pillar: ev.pillar, format: "evergreen",
    hooks: [ev.hook], hookIdx: 0, body: ev.body, hashtags: ev.hashtags, source: "evergreen",
  };
}

// ============================================================
//  9) RENDERING + DELIVERY
// ============================================================
function renderPost(draft) {
  const hook = draft.hooks[draft.hookIdx] || draft.hooks[0] || "";
  const tags = (draft.hashtags || []).join(" ");
  return `${hook}\n\n${draft.body}${tags ? "\n\n" + tags : ""}`;
}

function renderTelegram(draft, topic) {
  const post = renderPost(draft);
  const meta = `📌 ${draft.pillar} · ${draft.format} · ✍️ ${draft.source}` +
    (topic && topic.isPromo ? " · 📣 promo" : "") +
    (topic && topic.sarcasm ? ` · 😏 sarcasm ${topic.sarcasm}` : "");
  return `🗓️ Your LinkedIn draft for today\n${meta}\n\n— — — — —\n${post}\n— — — — —\n\nReview and tap a button 👇`;
}

async function generateAndDeliver(env, opts) {
  const topic = await chooseTopic(env);
  const draft = await generateDraft(env, topic);

  const sent = await tg(env, "sendMessage", {
    chat_id: ADMIN(env),
    text: renderTelegram(draft, topic),
    reply_markup: draftKeyboard(),
  });

  // Persist the draft keyed by the delivered message_id so callbacks can act on it.
  try {
    const j = await sent.json();
    const mid = j && j.result && j.result.message_id;
    if (mid && env && env.KV) {
      await env.KV.put("draft:" + mid, JSON.stringify({ draft, topic }), { expirationTtl: 60 * 60 * 24 * 14 });
    }
    if (env && env.KV) await rememberTopic(env, topic);
  } catch (e) { /* ignore */ }
}

// ============================================================
//  10) MESSAGE HANDLING (admin only)
// ============================================================
async function onMessage(msg, env) {
  const fromId = String(msg.from && msg.from.id);
  const text = (msg.text || "").trim();
  if (fromId !== String(ADMIN(env))) return; // single-operator tool

  // Admin replying to a "Tweak" force-reply -> regenerate with the instruction.
  const rt = msg.reply_to_message;
  if (rt && rt.text && rt.text.indexOf(TWEAKMARK) !== -1) {
    const m = rt.text.match(/draft #(\d+)/);
    if (m && env && env.KV) {
      const mid = m[1];
      const stored = await env.KV.get("draft:" + mid, "json");
      if (stored) {
        await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "🔄 Reworking with your note…" });
        const draft = await generateDraft(env, stored.topic, text);
        await env.KV.put("draft:" + mid, JSON.stringify({ draft, topic: stored.topic }), { expirationTtl: 60 * 60 * 24 * 14 });
        await tg(env, "editMessageText", {
          chat_id: ADMIN(env), message_id: Number(mid),
          text: renderTelegram(draft, stored.topic), reply_markup: draftKeyboard(),
        });
        return;
      }
    }
    await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "⚠️ That draft expired. Send /new for a fresh one." });
    return;
  }

  if (text === "/version") {
    await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "✅ " + VERSION + " · model: " + GEMINI_MODEL });
    return;
  }
  if (text === "/new" || text === "/start") {
    await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "✍️ Generating a fresh draft…" });
    await generateAndDeliver(env, { reason: "manual" });
    return;
  }
  if (text === "/pillars") {
    await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "📚 Pillars:\n• " + PILLARS.join("\n• ") });
    return;
  }
  if (text === "/queue") {
    const q = (env && env.KV) ? ((await env.KV.get("queue", "json")) || []) : [];
    if (!q.length) { await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "📭 Approved queue is empty." }); return; }
    const list = q.slice(-10).map((p, i) => `${i + 1}. [${p.pillar}] ${(p.text || "").split("\n")[0].slice(0, 60)}…`).join("\n");
    await tg(env, "sendMessage", { chat_id: ADMIN(env), text: `📥 Approved (${q.length}):\n${list}` });
    return;
  }
  if (text === "/clearqueue") {
    if (env && env.KV) await env.KV.put("queue", "[]");
    await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "🧹 Approved queue cleared." });
    return;
  }

  // Anything else: quick help
  await tg(env, "sendMessage", {
    chat_id: ADMIN(env),
    text: "👋 LinkedIn Content Engine\n\n/new — generate a draft now\n/queue — see approved posts\n/clearqueue — empty the queue\n/pillars — list topics\n/version",
  });
}

// ============================================================
//  11) CALLBACK HANDLING (button taps)
// ============================================================
async function onCallback(cq, env) {
  const presser = String(cq.from && cq.from.id);
  if (presser !== String(ADMIN(env))) { await tg(env, "answerCallbackQuery", { callback_query_id: cq.id }); return; }

  const data = cq.data || "";
  const mid = cq.message && cq.message.message_id;
  const chatId = cq.message && cq.message.chat && cq.message.chat.id;
  const ack = (t) => tg(env, "answerCallbackQuery", { callback_query_id: cq.id, text: t || "" });

  if (data.indexOf("lp:") !== 0 || !mid) { await ack(); return; }
  const action = data.split(":")[1];

  const stored = (env && env.KV) ? await env.KV.get("draft:" + mid, "json") : null;
  if (!stored) {
    await tg(env, "editMessageReplyMarkup", { chat_id: chatId, message_id: mid, reply_markup: K([]) }).catch(() => {});
    await ack("Draft expired — send /new");
    return;
  }
  let { draft, topic } = stored;

  if (action === "ap") {
    const post = renderPost(draft);
    if (env && env.KV) {
      const q = (await env.KV.get("queue", "json")) || [];
      q.push({ pillar: draft.pillar, format: draft.format, text: post, ts: Date.now() });
      await env.KV.put("queue", JSON.stringify(q));
    }
    await tg(env, "editMessageText", {
      chat_id: chatId, message_id: mid,
      text: "✅ APPROVED & SAVED\n\nCopy the block below and paste it into LinkedIn's native scheduler (or your queue):\n\n— — — — —\n" + post + "\n— — — — —",
    });
    await ack("Saved ✅");
    return;
  }

  if (action === "hk") {
    draft.hookIdx = (draft.hookIdx + 1) % Math.max(1, draft.hooks.length);
    await env.KV.put("draft:" + mid, JSON.stringify({ draft, topic }), { expirationTtl: 60 * 60 * 24 * 14 });
    await tg(env, "editMessageText", { chat_id: chatId, message_id: mid, text: renderTelegram(draft, topic), reply_markup: draftKeyboard() });
    await ack(`Hook ${draft.hookIdx + 1}/${draft.hooks.length}`);
    return;
  }

  if (action === "rg") {
    await ack("Regenerating…");
    const fresh = await generateDraft(env, topic);
    await env.KV.put("draft:" + mid, JSON.stringify({ draft: fresh, topic }), { expirationTtl: 60 * 60 * 24 * 14 });
    await tg(env, "editMessageText", { chat_id: chatId, message_id: mid, text: renderTelegram(fresh, topic), reply_markup: draftKeyboard() });
    return;
  }

  if (action === "tw") {
    await tg(env, "sendMessage", {
      chat_id: ADMIN(env),
      text: `${TWEAKMARK}${mid}\n\nReply to THIS message with what to change (e.g. "shorter", "more sarcasm", "add a stat", "different angle").`,
      reply_markup: { force_reply: true },
    });
    await ack();
    return;
  }

  if (action === "sk") {
    if (env && env.KV) await env.KV.delete("draft:" + mid);
    await tg(env, "editMessageText", { chat_id: chatId, message_id: mid, text: "⏭️ Skipped. Send /new whenever you want another." });
    await ack("Skipped");
    return;
  }

  await ack();
}
