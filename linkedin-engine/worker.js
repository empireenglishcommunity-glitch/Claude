/**
 * LinkedIn Content Engine — Cloudflare Worker (Phases 1–5)
 * --------------------------------------------------------------------------------
 * Generates a daily, brand-voice LinkedIn post and delivers it to YOU on Telegram
 * with inline buttons. Nothing is auto-published — you approve with one tap, which is
 * exactly what the 2026 LinkedIn algorithm rewards.
 *
 *   Phase 1  Text engine + Telegram cockpit (hook + body + hashtags)
 *   Phase 2  On-brand image per post (Cloudflare Workers AI / Flux)
 *   Phase 3  Carousel PDF (Google Apps Script + Slides web app)
 *   Phase 4  Publishing: copy block + optional webhook + /export batch
 *   Phase 5  Reliability + self-tuning: evergreen bank, AI fallback chain,
 *            approval-weighted topic rotation, comment seeder, idea inbox
 *
 * Cockpit buttons:
 *   [✅ Approve & Save] [🔄 Regenerate] [🔁 Other hook] [✏️ Tweak]
 *   [🖼️ New image] [🎠 Carousel] [⏭️ Skip]
 *
 * Setup (see SETUP.md): bind KV namespace "KV", (optional) Workers AI binding "AI",
 * add a daily Cron trigger, set TELEGRAM_TOKEN / ADMIN_CHAT_ID / GEMINI_API_KEY.
 *
 * Admin commands: /new  /queue  /export  /clearqueue  /stats  /pillars  /version
 */

// ============================================================
//  1) SECRETS / INTEGRATIONS — prefer Cloudflare env vars; constants are fallbacks
// ============================================================
const TELEGRAM_TOKEN_FALLBACK = "PUT_YOUR_TELEGRAM_BOT_TOKEN_HERE";
const ADMIN_CHAT_ID_FALLBACK  = "PUT_YOUR_TELEGRAM_CHAT_ID_HERE";
const GEMINI_API_KEY_FALLBACK = "PUT_YOUR_GEMINI_API_KEY_HERE";
const GROQ_API_KEY_FALLBACK   = ""; // optional secondary LLM fallback (console.groq.com)

// Phase 3 — Google Apps Script carousel web app (see carousel.gs). Leave blank to disable.
const CAROUSEL_WEBAPP_URL_FALLBACK = "";
const CAROUSEL_TOKEN_FALLBACK      = "";

// Phase 4 — optional publish webhook (Make/Zapier/Buffer/your own). Leave blank to disable.
const PUBLISH_WEBHOOK_URL_FALLBACK = "";

const VERSION = "linkedin-engine v2.0";
const GEMINI_MODEL = "gemini-2.5-flash-lite";          // 1,000 free requests/day
const GROQ_MODEL   = "llama-3.3-70b-versatile";
const IMAGE_MODEL  = "@cf/black-forest-labs/flux-1-schnell"; // Workers AI (free quota)

// ============================================================
//  2) BRAND VOICE — encoded from MACAL_Brand_Bible.docx (see brand/macal-brand-bible.md)
// ============================================================
const LANGUAGE = "en"; // "en", "ar", or "mix"

// "Common Sense First" — the MACAL Empire / Mike-Baxter-inspired voice.
const BRAND_VOICE = `
MACAL Empire voice — "Common Sense First". I cut through noise, jargon, and hype with
straight talk and proven principles. Persona: a seasoned operator (real estate, markets,
capital protection) who's been through multiple cycles. Three tones, always blended:
- Authoritative but NOT arrogant — authority comes from proof and reps, never posturing.
- Sarcastic but NEVER cruel — sarcasm is a scalpel that exposes absurdity, not a weapon.
- Paternal / protective — I warn the reader like a father who wishes someone had warned him.
Worldview: hard work beats hype every time; if it sounds too good to be true, grab your
wallet; the best tool is the one that works; complexity is often a smokescreen; respect is
earned by showing up and delivering. Underneath everything: family, legacy, and protecting
people's futures. Plain-spoken, experienced, honest, direct, unapologetic, grounded, real.
`.trim();

// Few-shot anchors written in the MACAL voice (derived from the brand bible's templates and
// example transformations). Replace/extend with your own real top posts when you have them.
const BEST_POSTS = [
`You know what's crazy? People are paying $800,000 for a 600-square-foot condo because it has "smart home features."
It has a Wi-Fi thermostat, Karen. That's not smart. That's a thermostat with an app.
Here's the common-sense version: a home is shelter that holds its value. Not a gadget you finance for 30 years.
You don't build wealth chasing shiny features. You build it on fundamentals — location, cash flow, and a price that makes sense.
The market doesn't care how cool your thermostat is. It cares whether you overpaid.
We don't do hype. We do homework.`,
`They promise passive income with zero effort.
I'll promise you this: the only thing passive about that plan is how passively you'll watch your money disappear.
Real estate is like hunting. You don't bag a trophy buck by sitting on the couch posting about it. You scout. You wait. You prepare. Then you move.
The "overnight success" guys are selling you the highlight reel and skipping the three years of boring reps that actually built it.
Do the homework or be the lesson. Your call.`,
`Twenty years in this business, and I still see folks treat a mortgage like a personality trait.
A '69 Mustang with a solid frame will outlast a brand-new luxury sedan full of electrical gremlins. Old and solid beats new and fragile — every time.
Same with your money. Boring fundamentals will quietly outlast flashy speculation dressed up as "strategy."
I'm telling you this because I wish someone had told me at 25.
Build smart. Build solid. And never trust a guy in a rented suit selling shortcuts.`,
];

// Sarcasm is core to this brand — keep it frequent but always followed by substance.
const SARCASM_MAX_LEVEL = 3;
const SARCASM_PROBABILITY = 0.5; // ~half of posts carry a sarcastic edge

// Soft self-promotion rotation.
const PROMO_EVERY_N_POSTS = 6;
const PROMO_BRANDS = [
  "Macal Empire (real estate, secondary market, and capital protection)",
  "Empire English Community (my community for learning English with confidence)",
];

// Phase 2 — fixed visual identity appended to every image prompt (matte black + gold empire).
const BRAND_IMAGE_STYLE =
  "Premium, grounded, masculine editorial illustration. Deep matte black background with rich " +
  "gold (#D4AF37) accents, empire/royal aesthetic crossed with rugged classic Americana (classic " +
  "cars, workshop tools, the outdoors). High contrast, cinematic lighting, lots of negative space, " +
  "no text, no words, no logos, sophisticated, timeless, 4k.";
const AUTO_IMAGE = true; // auto-generate an image with each delivered draft (if AI binding present)

// Phase 3 — small footer handle printed on carousel slides.
const BRAND_HANDLE = "MACAL Empire — Common Sense First";

// ============================================================
//  3) CONTENT MATRIX
// ============================================================
const PILLARS = [
  "investing", "financial markets", "trading", "real estate", "AI",
  "marketing", "social media", "design", "modeling", "cooking",
  "writing", "life coaching", "entrepreneurship",
];

const FORMATS = [
  "contrarian take", "personal story", "actionable how-to", "numbered listicle",
  "mini case study", "myth-bust", "thought-provoking question", "lessons learned",
  "carousel deep-dive",
];

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

const HOW_MANY_RECENT_TO_AVOID = 4;

// ============================================================
//  4) EVERGREEN FALLBACK BANK — never an empty day
// ============================================================
const EVERGREEN = [
  { pillar:"entrepreneurship", hook:"Everyone wants the trophy. Nobody wants the cold mornings in the blind.",
    body:"The trophy shot is 30 seconds.\nThe scouting, the waiting, the boring reps — that's 3 years.\n\nThe folks you admire aren't more talented. They just kept showing up on the days it felt pointless.\n\nConsistency isn't flashy. It's just undefeated.\n\nWe don't do hype. We do homework.",
    hashtags:["#Entrepreneurship", "#Discipline", "#CommonSense"],
    image:"a lone hunter waiting patiently in a misty blind at dawn",
    comments:["What's one boring rep you're committing to this month?"] },
  { pillar:"investing", hook:"The best investment I ever made paid 0% for two years.",
    body:"It wasn't a stock. It was a skill.\n\nIt paid nothing while I learned it. Then it paid for everything after.\n\nA '69 Mustang with a solid frame outlasts a flashy sedan full of electrical gremlins. Old and solid beats new and fragile.\n\nStop optimizing for this quarter. Start compounding for this decade.",
    hashtags:["#Investing", "#WealthBuilding", "#CommonSense"],
    image:"a restored classic car engine gleaming under workshop light",
    comments:["What skill are you compounding right now?"] },
  { pillar:"real estate", hook:"They keep building McMansions nobody can afford while families can't find a starter home.",
    body:"It's like bringing a million-dollar race car to a demolition derby. Wrong tool, wrong arena, wrong result.\n\nA home isn't a gadget you finance for 30 years. It's shelter that holds its value.\n\nThe market doesn't care how smart your thermostat is. It cares whether you overpaid.\n\nBuild smart. Build solid.",
    hashtags:["#RealEstate", "#PropertyInvesting", "#CommonSense"],
    image:"a solid brick family home foundation at golden hour",
    comments:["Buyers: what's the most overpriced 'feature' you've been pitched?"] },
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

  // Daily cron (e.g. "0 5 * * *"): generate today's post and deliver to Telegram.
  async scheduled(event, env) {
    await generateAndDeliver(env, { reason: "daily" });
  },
};

// ============================================================
//  6) HELPERS
// ============================================================
function TOKEN(env)         { return (env && env.TELEGRAM_TOKEN) || TELEGRAM_TOKEN_FALLBACK; }
function ADMIN(env)         { return (env && env.ADMIN_CHAT_ID) || ADMIN_CHAT_ID_FALLBACK; }
function GKEY(env)          { return (env && env.GEMINI_API_KEY) || GEMINI_API_KEY_FALLBACK; }
function QKEY(env)          { return (env && env.GROQ_API_KEY) || GROQ_API_KEY_FALLBACK; }
function CAROUSEL_URL(env)  { return (env && env.CAROUSEL_WEBAPP_URL) || CAROUSEL_WEBAPP_URL_FALLBACK; }
function CAROUSEL_TOK(env)  { return (env && env.CAROUSEL_TOKEN) || CAROUSEL_TOKEN_FALLBACK; }
function PUBLISH_URL(env)   { return (env && env.PUBLISH_WEBHOOK_URL) || PUBLISH_WEBHOOK_URL_FALLBACK; }

async function tg(env, method, payload) {
  return fetch(`https://api.telegram.org/bot${TOKEN(env)}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
}
async function tgPhoto(env, chatId, bytes, caption) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (caption) form.append("caption", caption);
  form.append("photo", new Blob([bytes], { type: "image/png" }), "post.png");
  return fetch(`https://api.telegram.org/bot${TOKEN(env)}/sendPhoto`, { method: "POST", body: form });
}
function K(rows) { return { inline_keyboard: rows }; }
function B(t, d) { return { text: t, callback_data: d }; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function weightedPick(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const TWEAKMARK = "✏️ Tweak instructions for draft #";

function draftKeyboard() {
  return K([
    [B("✅ Approve & Save", "lp:ap"), B("🔄 Regenerate", "lp:rg")],
    [B("🔁 Other hook", "lp:hk"), B("✏️ Tweak", "lp:tw")],
    [B("🖼️ New image", "lp:img"), B("🎠 Carousel", "lp:car")],
    [B("⏭️ Skip", "lp:sk")],
  ]);
}

// ============================================================
//  7) TOPIC ROTATION (Phase 5: approval-weighted + idea inbox)
// ============================================================
async function chooseTopic(env) {
  let recent = [], stats = {}, ideas = [];
  if (env && env.KV) {
    recent = (await env.KV.get("recent", "json")) || [];
    stats  = (await env.KV.get("stats", "json")) || {};
    ideas  = (await env.KV.get("ideas", "json")) || [];
  }

  // Idea inbox: if you texted the bot a raw idea, use (and consume) the oldest one.
  let seed = null;
  if (ideas.length) {
    seed = ideas.shift().text;
    if (env && env.KV) await env.KV.put("ideas", JSON.stringify(ideas));
  }

  const recentPillars = recent.slice(-HOW_MANY_RECENT_TO_AVOID).map(r => r.pillar);
  let available = PILLARS.filter(p => !recentPillars.includes(p));
  if (available.length === 0) available = PILLARS.slice();

  // Weight by your own approve/skip behaviour (Laplace-smoothed). Self-tuning, free.
  const weights = available.map(p => {
    const s = stats[p] || { approved: 0, skipped: 0 };
    return (s.approved + 1) / (s.approved + s.skipped + 2);
  });
  const pillar = weightedPick(available, weights);
  const format = pick(FORMATS);

  let count = 0;
  if (env && env.KV) count = Number(await env.KV.get("post_count")) || 0;
  const isPromo = PROMO_EVERY_N_POSTS > 0 && (count + 1) % PROMO_EVERY_N_POSTS === 0;
  const promoBrand = isPromo ? pick(PROMO_BRANDS) : null;
  const sarcasm = Math.random() < SARCASM_PROBABILITY ? 1 + Math.floor(Math.random() * SARCASM_MAX_LEVEL) : 0;

  return { pillar, format, isPromo, promoBrand, sarcasm, seed };
}

async function rememberTopic(env, topic) {
  if (!env || !env.KV) return;
  const recent = (await env.KV.get("recent", "json")) || [];
  recent.push({ pillar: topic.pillar, format: topic.format, ts: Date.now() });
  await env.KV.put("recent", JSON.stringify(recent.slice(-20)));
  const count = (Number(await env.KV.get("post_count")) || 0) + 1;
  await env.KV.put("post_count", String(count));
}

async function bumpStat(env, pillar, key) {
  if (!env || !env.KV || !pillar) return;
  const stats = (await env.KV.get("stats", "json")) || {};
  stats[pillar] = stats[pillar] || { approved: 0, skipped: 0 };
  stats[pillar][key] = (stats[pillar][key] || 0) + 1;
  await env.KV.put("stats", JSON.stringify(stats));
}

// ============================================================
//  8) PROMPT BUILDING + AI CALLS
// ============================================================
function buildPrompt(topic, tweakInstruction) {
  const langLine = LANGUAGE === "ar" ? "Write the post in Arabic."
    : LANGUAGE === "mix" ? "Write in whichever language (English or Arabic) best fits the topic and my audience."
    : "Write the post in English.";

  const sarcasmLine = topic.sarcasm > 0
    ? `Sarcasm: ON at intensity ${topic.sarcasm}/3 (MACAL "scalpel, not sledgehammer"). RULES: punch up at systems/scams/hype, never at people struggling; ALWAYS follow a sarcastic line with real substance; keep it clean (no profanity); pass the "friendly wink" test.`
    : "Sarcasm: OFF this time — sincere, direct, and protective.";

  const promoLine = topic.isPromo && topic.promoBrand
    ? `At the very end, weave in ONE soft, natural mention of "${topic.promoBrand}" with a light call-to-action. Do not make it salesy.`
    : "Do NOT promote any product or brand in this post. Pure value only.";

  const seedLine = topic.seed
    ? `\n- Base the post on THIS specific idea from me: "${topic.seed}"`
    : "";

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

${examples ? "EXAMPLES OF MY VOICE (match this rhythm, length, and tone):\n" + examples + "\n" : ""}
TODAY'S BRIEF:
- Pillar / topic area: ${topic.pillar}
- Format: ${topic.format}
- ${langLine}
- ${sarcasmLine}
- ${promoLine}${seedLine}

STRUCTURE (MACAL "Common Sense First" architecture):
1. HOOK (first line): call out a modern absurdity everyone sees but nobody names. Stop the scroll in 5 seconds.
2. MEAT: make the point through ONE relatable analogy from this arsenal — hunting/outdoors, tools/workshop,
   classic cars, sports, military, or family/home — backed by plain logic or evidence.
3. CLOSE: a direct, punchy sign-off with authority (e.g. "We don't do hype. We do homework.").

HARD RULES (the Forbidden List):
- Short, punchy lines. Use fragments for emphasis. One idea per sentence. End paragraphs with a sharp "kicker".
- No jargon without instant translation. No guaranteed returns. No attacks on individuals (punch up at systems).
- No profanity. No fluff. No "In today's fast-paced world". No markdown/asterisks/headers — plain text only.
- Every claim backed by logic or evidence. Always land a clear takeaway. Confidence WITH humility.
- A 12-year-old should understand the main point. Protect the reader's interests first.
- 80–200 words for the body. End in a way that invites a reply or comment.${tweakLine}

Also provide:
- "image_prompt": a short visual concept (a scene/metaphor from the analogy arsenal), NO text in the image.
- "comments": 3 short, thoughtful first-comment ideas I could post myself to spark discussion.

Return ONLY valid JSON (no code fences) with exactly this shape:
{
  "hooks": ["hook 1", "hook 2", "hook 3"],
  "body": "the post body WITHOUT the hook line and WITHOUT hashtags",
  "hashtags": ["#Tag1", "#Tag2", "#Tag3"],
  "image_prompt": "visual concept, no text",
  "comments": ["comment idea 1", "comment idea 2", "comment idea 3"]
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

// Draft: { pillar, format, hooks[], hookIdx, body, hashtags[], imagePrompt, comments[], source }
async function generateDraft(env, topic, tweakInstruction) {
  const prompt = buildPrompt(topic, tweakInstruction);
  let out = await callGemini(env, prompt);
  let source = "gemini";
  if (!out) { out = await callGroq(env, prompt); source = "groq"; }

  if (out && Array.isArray(out.hooks) && out.body) {
    const hashtags = Array.isArray(out.hashtags) && out.hashtags.length
      ? out.hashtags : (HASHTAG_BANK[topic.pillar] || []).slice(0, 4);
    return {
      pillar: topic.pillar, format: topic.format,
      hooks: out.hooks.filter(Boolean).slice(0, 3),
      hookIdx: 0, body: String(out.body).trim(), hashtags,
      imagePrompt: out.image_prompt || `${topic.pillar}, professional conceptual illustration`,
      comments: Array.isArray(out.comments) ? out.comments.slice(0, 3) : [],
      source,
    };
  }

  // Fallback: evergreen bank
  const ev = pick(EVERGREEN);
  return {
    pillar: ev.pillar, format: "evergreen", hooks: [ev.hook], hookIdx: 0,
    body: ev.body, hashtags: ev.hashtags, imagePrompt: ev.image,
    comments: ev.comments || [], source: "evergreen",
  };
}

// ============================================================
//  9) IMAGE (Phase 2) + CAROUSEL (Phase 3)
// ============================================================
async function genImage(env, prompt) {
  const ai = env && env.AI;
  if (!ai || !prompt) return null;
  try {
    const full = prompt + ". " + BRAND_IMAGE_STYLE;
    const res = await ai.run(IMAGE_MODEL, { prompt: full, seed: Math.floor(Math.random() * 1e6) });
    if (res && typeof res.image === "string") return b64ToBytes(res.image);
    if (res instanceof ReadableStream) return new Uint8Array(await new Response(res).arrayBuffer());
    if (res instanceof ArrayBuffer) return new Uint8Array(res);
    return null;
  } catch (e) { return null; }
}

async function maybeSendImage(env, draft) {
  if (!AUTO_IMAGE || !(env && env.AI)) return;
  const bytes = await genImage(env, draft.imagePrompt);
  if (bytes) await tgPhoto(env, ADMIN(env), bytes, "🖼️ Suggested image (tap 🖼️ New image to regenerate)").catch(() => {});
}

async function generateSlides(env, draft) {
  const prompt = `Turn the LinkedIn post below into a punchy carousel of 6 slides.
Slide 1 is a bold cover (just the big hook). Slides 2-5 each make ONE point (a few words title + one short line). Slide 6 is a call-to-action.
Keep each field very short (titles <= 6 words, body <= 16 words). No markdown.

POST:
${renderPost(draft)}

Return ONLY valid JSON: {"title":"deck title","slides":[{"title":"...","body":"..."}]}`;
  let out = await callGemini(env, prompt);
  if (!out) out = await callGroq(env, prompt);
  if (out && Array.isArray(out.slides) && out.slides.length) return out;
  return null;
}

async function buildCarousel(env, draft) {
  const url = CAROUSEL_URL(env);
  if (!url) return { error: "not configured (set CAROUSEL_WEBAPP_URL + CAROUSEL_TOKEN)" };
  const slides = await generateSlides(env, draft);
  if (!slides) return { error: "could not generate slide copy" };
  try {
    const res = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: CAROUSEL_TOK(env), title: slides.title, slides: slides.slides, handle: BRAND_HANDLE }),
    });
    const txt = await res.text();
    let j = null; try { j = JSON.parse(txt); } catch (e) { /* not json */ }
    if (j && j.pdf_url) return { pdf_url: j.pdf_url, count: slides.slides.length };
    return { error: (j && j.error) || ("web app response: " + txt.slice(0, 120)) };
  } catch (e) { return { error: String(e) }; }
}

// ============================================================
//  10) RENDERING + DELIVERY
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
    (topic && topic.sarcasm ? ` · 😏 sarcasm ${topic.sarcasm}` : "") +
    (topic && topic.seed ? " · 💡 your idea" : "");
  return `🗓️ Your LinkedIn draft\n${meta}\n\n— — — — —\n${post}\n— — — — —\n\nReview and tap a button 👇`;
}

async function generateAndDeliver(env, opts) {
  const topic = await chooseTopic(env);
  const draft = await generateDraft(env, topic);

  const sent = await tg(env, "sendMessage", {
    chat_id: ADMIN(env), text: renderTelegram(draft, topic), reply_markup: draftKeyboard(),
  });

  try {
    const j = await sent.json();
    const mid = j && j.result && j.result.message_id;
    if (mid && env && env.KV) {
      await env.KV.put("draft:" + mid, JSON.stringify({ draft, topic }), { expirationTtl: 60 * 60 * 24 * 14 });
    }
    if (env && env.KV) await rememberTopic(env, topic);
  } catch (e) { /* ignore */ }

  await maybeSendImage(env, draft);
}

// ============================================================
//  11) MESSAGE HANDLING (admin only)
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
        await maybeSendImage(env, draft);
        return;
      }
    }
    await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "⚠️ That draft expired. Send /new for a fresh one." });
    return;
  }

  if (text === "/version") {
    await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "✅ " + VERSION + " · text:" + GEMINI_MODEL + " · img:" + IMAGE_MODEL });
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
  if (text === "/stats") {
    const stats = (env && env.KV) ? ((await env.KV.get("stats", "json")) || {}) : {};
    const rows = Object.keys(stats).sort().map(p => `${p}: ✅${stats[p].approved || 0} / ⏭️${stats[p].skipped || 0}`);
    await tg(env, "sendMessage", { chat_id: ADMIN(env), text: rows.length ? "📊 Approve/skip by pillar:\n" + rows.join("\n") : "📊 No stats yet." });
    return;
  }
  if (text === "/queue") {
    const q = (env && env.KV) ? ((await env.KV.get("queue", "json")) || []) : [];
    if (!q.length) { await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "📭 Approved queue is empty." }); return; }
    const list = q.slice(-10).map((p, i) => `${i + 1}. [${p.pillar}] ${(p.text || "").split("\n")[0].slice(0, 60)}…`).join("\n");
    await tg(env, "sendMessage", { chat_id: ADMIN(env), text: `📥 Approved (${q.length}). Use /export to dump them:\n${list}` });
    return;
  }
  if (text === "/export") {
    const q = (env && env.KV) ? ((await env.KV.get("queue", "json")) || []) : [];
    if (!q.length) { await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "📭 Nothing to export." }); return; }
    // Send each approved post as its own message for easy batch pasting into LinkedIn's scheduler.
    for (let i = 0; i < q.length; i++) {
      await tg(env, "sendMessage", { chat_id: ADMIN(env), text: `📦 ${i + 1}/${q.length} [${q[i].pillar}]\n\n${q[i].text}` });
    }
    return;
  }
  if (text === "/clearqueue") {
    if (env && env.KV) await env.KV.put("queue", "[]");
    await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "🧹 Approved queue cleared." });
    return;
  }

  // Unknown slash command -> help. Plain text -> idea inbox (Phase 5).
  if (text.startsWith("/")) {
    await tg(env, "sendMessage", {
      chat_id: ADMIN(env),
      text: "👋 LinkedIn Content Engine\n\n/new — generate a draft now\n/queue — see approved posts\n/export — dump approved posts to paste\n/clearqueue — empty the queue\n/stats — approve/skip by pillar\n/pillars — list topics\n/version\n\n💡 Tip: just text me any raw idea and I'll turn it into your next post.",
    });
    return;
  }
  if (text.length > 0) {
    if (env && env.KV) {
      const ideas = (await env.KV.get("ideas", "json")) || [];
      ideas.push({ text, ts: Date.now() });
      await env.KV.put("ideas", JSON.stringify(ideas.slice(-50)));
    }
    await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "💡 Idea saved. I'll use it on your next draft — send /new to use it now." });
    return;
  }
}

// ============================================================
//  12) CALLBACK HANDLING (button taps)
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
    await bumpStat(env, draft.pillar, "approved");

    // Phase 4: optional publish webhook (Make/Zapier/Buffer/your endpoint).
    if (PUBLISH_URL(env)) {
      fetch(PUBLISH_URL(env), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: post, pillar: draft.pillar, format: draft.format, hashtags: draft.hashtags }),
      }).catch(() => {});
    }

    const comments = (draft.comments || []).filter(Boolean).slice(0, 3);
    const commentBlock = comments.length
      ? "\n\n💬 First-comment ideas (post one yourself to boost reach):\n• " + comments.join("\n• ")
      : "";
    await tg(env, "editMessageText", {
      chat_id: chatId, message_id: mid,
      text: "✅ APPROVED & SAVED\n\nCopy the block below into LinkedIn's native scheduler:\n\n— — — — —\n" + post + "\n— — — — —" + commentBlock,
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

  if (action === "img") {
    await ack("Generating image…");
    if (!(env && env.AI)) {
      await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "⚠️ Image needs the Workers AI binding named 'AI' (see SETUP.md)." });
      return;
    }
    const bytes = await genImage(env, draft.imagePrompt);
    if (bytes) await tgPhoto(env, chatId, bytes, "🖼️ " + draft.pillar + " — " + (draft.imagePrompt || "").slice(0, 80));
    else await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "⚠️ Image generation failed. Try again in a moment." });
    return;
  }

  if (action === "car") {
    await ack("Building carousel…");
    await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "🎠 Building your carousel PDF…" });
    const r = await buildCarousel(env, draft);
    if (r.pdf_url) await tg(env, "sendMessage", { chat_id: ADMIN(env), text: `🎠 Carousel ready (${r.count} slides):\n${r.pdf_url}\n\nUpload it to LinkedIn as a "document" post.` });
    else await tg(env, "sendMessage", { chat_id: ADMIN(env), text: "⚠️ Carousel unavailable — " + r.error });
    return;
  }

  if (action === "sk") {
    await bumpStat(env, draft.pillar, "skipped");
    if (env && env.KV) await env.KV.delete("draft:" + mid);
    await tg(env, "editMessageText", { chat_id: chatId, message_id: mid, text: "⏭️ Skipped. Send /new whenever you want another." });
    await ack("Skipped");
    return;
  }

  await ack();
}
