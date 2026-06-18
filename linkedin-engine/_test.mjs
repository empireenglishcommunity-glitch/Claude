// Local smoke test: mocks Telegram + Gemini + KV and drives the Worker through
// /new -> draft delivered -> "other hook" -> approve. Run: node linkedin-engine/_test.mjs
// (This file is a dev aid; safe to delete.)

const ADMIN = "999";
process.env = {};

// ---- in-memory KV ----
const store = new Map();
const KV = {
  async get(k, t) { const v = store.get(k); if (v === undefined) return null; return t === "json" ? JSON.parse(v) : v; },
  async put(k, v) { store.set(k, v); },
  async delete(k) { store.delete(k); },
  async list({ prefix } = {}) { return { keys: [...store.keys()].filter(k => !prefix || k.startsWith(prefix)).map(name => ({ name })) }; },
};
const env = { KV, TELEGRAM_TOKEN: "T", ADMIN_CHAT_ID: ADMIN, GEMINI_API_KEY: "G" };

// ---- captured Telegram calls + mocked HTTP ----
const tgCalls = [];
let midSeq = 100;
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes("api.telegram.org")) {
    const method = u.split("/").pop().split("?")[0];
    const body = opts && opts.body ? JSON.parse(opts.body) : {};
    tgCalls.push({ method, body });
    const message_id = method === "sendMessage" ? ++midSeq : (body.message_id || midSeq);
    return new Response(JSON.stringify({ ok: true, result: { message_id } }), { status: 200 });
  }
  if (u.includes("generativelanguage.googleapis.com")) {
    const json = {
      hooks: ["HOOK A — stop scrolling.", "HOOK B — the real reason.", "HOOK C — nobody tells you this."],
      body: "Line one.\nLine two.\nThis is the AI-generated body.",
      hashtags: ["#Test", "#Brand", "#Voice"],
    };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }] }), { status: 200 });
  }
  return new Response("{}", { status: 200 });
};

const worker = (await import("./worker.js")).default;

function update(obj) {
  return new Request("https://x/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) });
}
const ok = (c, m) => console.log((c ? "✅" : "❌") + " " + m);

// 1) /new -> "Generating…" + a draft with a 5-button keyboard
tgCalls.length = 0;
await worker.fetch(update({ message: { from: { id: Number(ADMIN) }, chat: { id: Number(ADMIN) }, text: "/new" } }), env);
const draftMsg = tgCalls.find(c => c.method === "sendMessage" && c.body.reply_markup && c.body.reply_markup.inline_keyboard);
ok(tgCalls.some(c => /Generating/.test(c.body.text || "")), "/new sends a 'Generating…' notice");
ok(!!draftMsg, "draft message delivered");
const btnCount = draftMsg ? draftMsg.body.reply_markup.inline_keyboard.flat().length : 0;
ok(btnCount === 5, `draft has 5 buttons (got ${btnCount})`);
ok(/HOOK A/.test(draftMsg.body.text), "draft uses AI hook A first");
ok(/#Test/.test(draftMsg.body.text), "draft includes hashtags");

const draftMid = midSeq;
ok(store.has("draft:" + draftMid), "draft persisted in KV by message_id");
ok((store.get("recent") || "").includes("pillar"), "topic recorded in rotation history");

// 2) "Other hook" -> rotates to hook B
tgCalls.length = 0;
await worker.fetch(update({ callback_query: { id: "1", from: { id: Number(ADMIN) }, data: "lp:hk", message: { message_id: draftMid, chat: { id: Number(ADMIN) } } } }), env);
const edited = tgCalls.find(c => c.method === "editMessageText");
ok(edited && /HOOK B/.test(edited.body.text), "Other hook rotates to hook B");

// 3) Approve -> saved to queue + copy block, keyboard removed
tgCalls.length = 0;
await worker.fetch(update({ callback_query: { id: "2", from: { id: Number(ADMIN) }, data: "lp:ap", message: { message_id: draftMid, chat: { id: Number(ADMIN) } } } }), env);
const approved = tgCalls.find(c => c.method === "editMessageText");
ok(approved && /APPROVED/.test(approved.body.text), "Approve shows APPROVED copy block");
ok(approved && !approved.body.reply_markup, "Approve removes the buttons");
const q = JSON.parse(store.get("queue") || "[]");
ok(q.length === 1 && /HOOK B/.test(q[0].text), "approved post saved to queue with chosen hook");

// 4) Non-admin is ignored
tgCalls.length = 0;
await worker.fetch(update({ message: { from: { id: 1 }, chat: { id: 1 }, text: "/new" } }), env);
ok(tgCalls.length === 0, "non-admin messages are ignored");

console.log("\nDone.");
