/**
 * Empire English — Smart Sales Bot (v10) — Cloudflare Workers
 * Guided buttons + Answer Bank + PAYMENT APPROVAL GATE + Auto-Learn + Memory
 * + Daily reminder funnel + Invoice capture + Subscribe confirm + Feedback.
 *
 * SAFETY: anything money-related (payment details / crypto / offers) is sent to YOU
 * for approval BEFORE it reaches the customer. General info auto-replies instantly.
 *
 * Setup: fill TELEGRAM_TOKEN + ADMIN_CHAT_ID, bind KV namespace "KV", add Cron "0 16 * * *".
 * Admin: /version /kv /list /stats
 */

// ======= عدّل دول بس =======
const TELEGRAM_TOKEN = "ضع_توكن_البوت_هنا";
const ADMIN_CHAT_ID  = "ضع_رقمك_من_userinfobot_هنا";
// ---- بيانات الدفع (راجعها كويس) ----
const PAY = {
  vodafone: "01004581035",
  instapay: "01004581035 / mohamedashry10041",
  paypal:   "paypal.me/bioroma",
  usdt:     "ضع_عنوان_USDT_هنا (Binance)",   // ← ابعتلي العنوان + الشبكة (TRC20/BEP20)
  usdtNetwork: "TRC20",
  usdtQR:   "",                               // ← (اختياري) رابط صورة QR للمحفظة
  bank:     "تحويل بنكي للمبالغ الكبيرة/السنوي — اطلب التفاصيل"
};
// ===========================

const VERSION = "v10";
const MARK = "💰 محتوى دفع للمراجعة (وافق قبل الإرسال):\n";
const EDITMARK = "✏️ اكتب ردك للعميل (id: ";
const LEARNMARK = "🧠 اكتب الرد وهحفظه للمرة الجاية (id: ";

const WELCOME = `أهلاً بيك في إمبراطورية Empire English 👑✨
إحنا مش كورس... إحنا النظام اللي هيخليك تتكلم إنجليزي بثقة 🔥
اختار من تحت وأنا ماشي معاك خطوة بخطوة 👇`;

const SUB_WELCOME = `مبروك يا Founder 🎉👑 أهلاً بيك في الإمبراطورية!
1️⃣ هبعتلك لينك الكوميونيتي + شارة Founder
2️⃣ ابدأ اختبار تحديد المستوى
3️⃣ دفعتك الأولى السبت ٢٧ يونيو 🚀
مبسوطين إنك معانا 💪`;

const FEEDBACK = `إزاي تجربتك معانا لحد دلوقتي؟ 🌟 رأيك بيهمنا — ابعتلنا كلمتين أو أي اقتراح 👑`;

// ===== payment text (SENSITIVE — always approved by admin first) =====
function payText(pkg){
  const head = pkg ? `تمام يا بطل 👑 باقة ${pkg} — تفاصيل الدفع:` : `💳 طرق الدفع:`;
  return `${head}

🇪🇬 جوه مصر:
• فودافون كاش: ${PAY.vodafone}
• إنستا باي: ${PAY.instapay}

🌍 برّه مصر:
• PayPal: ${PAY.paypal}
• 🪙 USDT (Binance ${PAY.usdtNetwork}): ${PAY.usdt}
• 🏦 تحويل بنكي: ${PAY.bank}

📸 بعد الدفع ابعت صورة الإيصال هنا وأفعّلك فورًا كـ Founder 👑`;
}

// ===== smart reminder funnel (1/day) =====
const REMINDERS = [
  `🌟 قصة نجاح: «بدأت من الصفر وكنت بتجمّد لما أتكلم... بعد أسابيع بقيت أمسك محادثة كاملة بثقة!» — عضو Builder ⭐\nتحب تبدأ قصتك؟ 👑`,
  `🤔 لسه محتار؟ أغلب الناس بيبدأوا بـ Builder ⭐ وبيتكلموا بثقة بسرعة. قوللي هدفك وأرشّحلك الأنسب 🎯👑`,
  `🛡️ قلقان تجرّب؟ معاك ضمان استرجاع ٧ أيام — صفر مخاطرة. مبتدئ؟ بنبدأ من الصفر. مشغول؟ النظام مرن 🔥`,
  `🎁 عرض المؤسسين لسه شغّال بس المقاعد بتقل ⏳ سعر تأسيس ثابت للأبد + شارة Founder. تحب أحجزلك؟ 👑`,
  `⏰ آخر فرصة — ده آخر تذكير مني 🙏 لو جاد إنك تتكلم إنجليزي بثقة، دي لحظتك. ابعت «اشتراك» 👑🔥`,
];

// ===== text answer bank (general = auto; sensitive = approval) =====
const ANSWERS = [
  { keys:['عايز اشترك','هشترك','اشترك','اشتراك','انضم','join','subscribe'], menu:"sub" },
  { keys:['طرق الدفع','ازاي ادفع','الدفع','ادفع','فودافون','انستا','instapay','paypal','تحويل','كريبتو','crypto','usdt','بينminance','binance','محفظه'], sensitive:true, reply: payText(null) },
  { keys:['غالي','غاليه','مكلف','كتير اوي','مش مناسب','معايا مش','السعر عالي'], reply:`أفهمك 👌 بس فكّر: ده أرخص من مدرس خصوصي، ومعاك نظام كامل + كوميونيتي ٢٤ ساعة + ضمان ٧ أيام 🛡️\nولو الميزانية محدودة، Recruit بـ 199ج/19$ بداية ممتازة 🥉 — وتقدر ترقّي بعدين. تحب أرشّحلك؟ 👑` },
  { keys:['ليه اغلى بره','ليه مغليها','الفرق بين مصر وبره','ليه برة مصر اغلى','ليه السعر مختلف'], reply:`سؤال وجيه 👍 السعر بيتظبط حسب القدرة الشرائية لكل بلد — زي نتفليكس وسبوتيفاي بالظبط. يعني المصري بيدفع *أقل* مش العكس 🇪🇬، وكل منطقة بسعر عادل ليها 🌍👑` },
  { keys:['recruit','ريكروت','الباقه الاولى'], reply:`RECRUIT 🥉 (199ج/19$) — البداية الصح\n✅ نظام يومي + ملخصات AI + قنوات مستواك + تقييم أسبوعي\n💡 وعشان تتكلم أسرع، Builder ⭐ بتضيف تصحيح + جلسات يومية 🔥` },
  { keys:['builder','بيلدر','الباقه التانيه','التانيه'], reply:`BUILDER ⭐ (399ج/39$) — الأكثر اختيارًا 🔥\n✅ كل Recruit + تصحيح كلامك بالـ AI + كل الجلسات الصوتية + مكتبة + امتحانات\n«ده اللي بيخليك تتكلم فعلاً» 👑` },
  { keys:['empire','امباير','الباقه التالته'], reply:`EMPIRE 🥇 (799ج/89$) — أسرع + اهتمام شخصي\n✅ كل Builder + كوتشينج جماعي + خطة شهرية + مراجعة فردية + شهادات 👑` },
  { keys:['vip','في اي بي','خاص','لوحدي','مدرس خاص'], reply:`VIP 👑 (3,500ج/249$ · مقاعد محدودة)\n✅ كل Empire + ٤ جلسات خاصة 1-on-1 + تصحيح غير محدود + لاين واتساب مباشر\n«كأن معاك مدرب خاص» 🔥` },
  { keys:['الفرق','قارن','مقارنه','محتار','انهي احسن','انهي افضل','vs'], menu:"compare" },
  { keys:['ساعدني','رشحلي','اختار ايه','يناسبني','انهي باقه'], menu:"help" },
  { keys:['مبتدئ','من الصفر','ضعيف','مستواي','صفر','beginner'], reply:`متقلقش 🌟 بنبدأ من Level 0 — الصفر تمامًا، والنظام معمول للمبتدئين، وأول ما تدخل تعمل اختبار تحديد مستوى 👑` },
  { keys:['ضمان','استرجاع','تجربه','فري','free','trial','مخاطره'], reply:`فيه ضمان استرجاع ٧ أيام 🛡️ صفر مخاطرة — تجرّب، ولو مش مناسب ترجعلك فلوسك 🔥👑` },
  { keys:['تسجيل','تسجيلات','مسجل','فيديو','recording'], reply:`أيوه 🎥 كل الجلسات بتتسجّل في «خزنة التسجيلات» وترجعلها أي وقت (من Builder وفوق) 👑` },
  { keys:['مواعيد','ميعاد','الساعه','schedule','بتبدا'], reply:`الجلسات يومية وفيها أكتر من ميعاد (وكلها بتتسجّل) 🎤 الجدول بيوصلك أول ما تدخل، والدفعة الأولى السبت ٢٧ يونيو 👑` },
  { keys:['اونلاين','حضوري','online','مكان','عن بعد'], reply:`كله أونلاين ١٠٠٪ 🌍 كوميونيتي + جلسات صوتية حية من أي مكان 👑` },
  { keys:['شهاده','شهادة','certificate','ايلتس','ielts','توفل'], reply:`عندنا شهادات Mastery في Empire و VIP 🏅 والنظام بيقوّي مهاراتك لأي امتحان زي IELTS — بس إحنا مش جهة الامتحان الرسمي 👑` },
  { keys:['نصب','مضمون','ثقة','reviews','حقيقي'], reply:`سؤال مشروع 👍 فيه ضمان ٧ أيام، أعضاء حقيقيين بنتايج، وكوميونيتي شغّال ٢٤ ساعة تشوفه بنفسك 🛡️👑` },
  { keys:['عرض','خصم','اوفر','offer','discount','كوبون'], sensitive:true, reply:`🎁 أحسن عرض دلوقتي: سعر التأسيس ثابت للأبد + الاشتراك السنوي يوفّر ~٣٥٪. تحب أحجزلك قبل ما المقاعد تخلص؟ 👑` },
  { keys:['شكرا','متشكر','تسلم','thanks'], reply:`العفو يا فندم 🌟 تحت أمرك دايمًا 👑` },
];

// ============================================================
export default {
  async fetch(req, env){
    if (req.method !== "POST") return new Response("Empire English bot ✅ " + VERSION);
    let u; try { u = await req.json(); } catch(e){ return new Response("ok"); }
    try {
      if (u.callback_query) await onCallback(u.callback_query, env);
      else if (u.message)   await onMessage(u.message, env);
    } catch(err){ await tg("sendMessage",{chat_id:ADMIN_CHAT_ID, text:"⚠️ خطأ: "+err}); }
    return new Response("ok");
  },
  async scheduled(event, env, ctx){
    if (!env || !env.KV) return;
    const now = Date.now();
    const list = await env.KV.list({prefix:"u:"});
    for (const k of list.keys){
      const u = await env.KV.get(k.name,"json"); if(!u) continue;
      const id = k.name.slice(2);
      try {
        if (u.subscribed){
          if (!u.feedbackAsked && u.subAt && now - u.subAt > 2*864e5){ await tg("sendMessage",{chat_id:Number(id),text:FEEDBACK}); u.feedbackAsked=true; await env.KV.put(k.name,JSON.stringify(u)); }
          continue;
        }
        if ((u.reminders||0) >= REMINDERS.length) continue;
        if (now - (u.lastReminder||0) < 20*36e5) continue;
        if (now - (u.lastSeen||0) < 20*36e5) continue;
        await tg("sendMessage",{chat_id:Number(id), text:REMINDERS[u.reminders||0]});
        u.reminders=(u.reminders||0)+1; u.lastReminder=now; await env.KV.put(k.name,JSON.stringify(u));
      } catch(e){}
    }
  }
};

async function tg(method, payload){
  return fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)});
}
function K(rows){ return {inline_keyboard: rows}; }
function B(t,d){ return {text:t, callback_data:d}; }

function norm(s){ return (s||"").toString().toLowerCase().replace(/[\u064B-\u0652\u0670]/g,"").replace(/\u0640/g,"").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/\s+/g," ").trim(); }

// ---- menu views ----
function view(name){
  if (name === "main") return { text: WELCOME, kb: K([
    [B("📦 الباقات","m:packages"), B("🎯 ساعدني أختار","m:help")],
    [B("🆚 قارن الباقات","m:compare"), B("💳 طرق الدفع","m:pay")],
    [B("❓ أسئلة شائعة","m:faq"), B("👑 عايز أشترك","m:sub")] ]) };
  if (name === "packages") return { text:`باقاتك يا بطل 👑 (السعر حسب بلدك):\n🥉 Recruit 199ج/19$ · 🥈 Builder ⭐ 399ج/39$ · 🥇 Empire 799ج/89$ · 👑 VIP 3,500ج/249$\nاختار باقة تشوف تفاصيلها 👇`, kb:K([
    [B("🥉 Recruit","p:recruit"), B("🥈 Builder ⭐","p:builder")],
    [B("🥇 Empire","p:empire"), B("👑 VIP","p:vip")],
    [B("👑 عايز أشترك","m:sub"), B("↩️ رجوع","m:main")] ]) };
  if (name === "compare") return { text:"عايز تقارن إيه؟ 🆚", kb:K([
    [B("Recruit ⚔️ Builder","cmp:rb"), B("Builder ⚔️ Empire","cmp:be")],
    [B("Empire ⚔️ VIP","cmp:ev"), B("📊 قارن الكل","cmp:all")],
    [B("↩️ رجوع","m:main")] ]) };
  if (name === "help") return { text:"إيه أقرب حاجة ليك؟ وأنا أرشّحلك الباقة المثالية 🎯", kb:K([
    [B("💰 ميزانيتي محدودة","rec:budget")],
    [B("🗣️ عايز أتكلم بثقة","rec:speak")],
    [B("🎯 عندي هدف/ديدلاين","rec:goal")],
    [B("👑 عايز مدرّب خاص","rec:personal")],
    [B("↩️ رجوع","m:main")] ]) };
  if (name === "faq") return { text:"اختار سؤالك 👇", kb:K([
    [B("🛡️ الضمان","faq:guarantee"), B("🧑‍🎓 مبتدئ؟","faq:beginner")],
    [B("🎥 التسجيلات","faq:rec"), B("🕐 المواعيد","faq:time")],
    [B("🌍 أونلاين؟","faq:online"), B("💸 غالية عليّا؟","faq:price")],
    [B("↩️ رجوع","m:main")] ]) };
  if (name === "sub") return { text:"اختار باقتك وأنا أجهّزلك تفاصيل الدفع 👑", kb:K([
    [B("🥉 Recruit","buy:Recruit"), B("🥈 Builder ⭐","buy:Builder")],
    [B("🥇 Empire","buy:Empire"), B("👑 VIP","buy:VIP")],
    [B("↩️ رجوع","m:main")] ]) };
  return null;
}
const PKG = {
  recruit:`RECRUIT 🥉 (199ج/19$) — البداية الصح\n✅ نظام يومي + ملخصات AI + قنوات مستواك + تقييم أسبوعي\n«تبدأ صح وتبني عادة يومية» 👑`,
  builder:`BUILDER ⭐ (399ج/39$) — الأكثر اختيارًا 🔥\n✅ كل Recruit + تصحيح كلامك بالـ AI + كل الجلسات الصوتية + مكتبة + امتحانات\n«ده اللي بيخليك تتكلم فعلاً» 👑`,
  empire:`EMPIRE 🥇 (799ج/89$) — أسرع + اهتمام شخصي\n✅ كل Builder + كوتشينج جماعي + خطة شهرية + مراجعة فردية + شهادات 👑`,
  vip:`VIP 👑 (3,500ج/249$ · مقاعد محدودة)\n✅ كل Empire + ٤ جلسات خاصة 1-on-1 + تصحيح غير محدود + لاين واتساب مباشر 🔥`
};
const CMP = {
  rb:`Recruit ⚔️ Builder:\n🥉 Recruit = النظام اليومي لوحدك.\n🥈 Builder ⭐ = + تصحيح كلامك بالـ AI + كل الجلسات الصوتية + مكتبة. (الفرق إنك تتكلم فعلاً) 🔥`,
  be:`Builder ⚔️ Empire:\n🥈 Builder = تتكلم بثقة جماعيًا.\n🥇 Empire = + كوتشينج + خطة شخصية + مراجعة فردية + شهادات (نتيجة أسرع) 👑`,
  ev:`Empire ⚔️ VIP:\n🥇 Empire = كوتشينج جماعي.\n👑 VIP = + ٤ جلسات خاصة 1-on-1 + تصحيح غير محدود + لاين مباشر (أقصى اهتمام) 🔥`,
  all:`📊 مقارنة:\n🥉 Recruit 199ج/19$ — البداية\n🥈 Builder ⭐ 399ج/39$ — الأكثر اختيارًا (تتكلم فعلاً)\n🥇 Empire 799ج/89$ — أسرع + اهتمام\n👑 VIP 3,500ج/249$ — مدرّب خاص\nأغلب الناس بيبدأوا بـ Builder ⭐👑`
};
const REC = {
  budget:["recruit","ميزانيتك محدودة؟ Recruit 🥉 بداية ممتازة، وتقدّر ترقّي بعدين 👑"],
  speak:["builder","عايز تتكلم بثقة؟ Builder ⭐ هي اختيارك المثالي 🔥"],
  goal:["empire","عندك هدف/ديدلاين؟ Empire 🥇 هتوصّلك أسرع 👑"],
  personal:["vip","عايز اهتمام شخصي كامل؟ VIP 👑 مدرّبك الخاص 🔥"]
};
const FAQ = {
  guarantee:`🛡️ ضمان استرجاع ٧ أيام — صفر مخاطرة. تجرّب وانت مأمّن 👑`,
  beginner:`🧑‍🎓 بنبدأ من الصفر تمامًا (Level 0)، والنظام معمول للمبتدئين بالظبط 🌟`,
  rec:`🎥 كل الجلسات بتتسجّل في خزنة التسجيلات وترجعلها أي وقت (من Builder وفوق) 👑`,
  time:`🕐 جلسات يومية بأكتر من ميعاد وكلها بتتسجّل. الدفعة الأولى السبت ٢٧ يونيو 👑`,
  online:`🌍 كله أونلاين ١٠٠٪ — كوميونيتي + جلسات صوتية من أي مكان 👑`,
  price:`💸 أرخص من مدرس خصوصي ومعاك نظام كامل + ضمان ٧ أيام. ولو الميزانية محدودة، Recruit بداية ممتازة 🥉👑`
};

async function touch(env, chatId, name, stage){
  if (!env || !env.KV) return;
  const key = "u:"+chatId;
  const u = (await env.KV.get(key,"json")) || {firstSeen:Date.now(), reminders:0, subscribed:false};
  if (name) u.name = name; u.lastSeen = Date.now();
  const rank = {engaged:1, considering:2, intent:3, paid_pending:4};
  if (stage && (!u.stage || (rank[stage]||0) >= (rank[u.stage]||0))) u.stage = stage;
  await env.KV.put(key, JSON.stringify(u));
}

// payment request -> goes to ADMIN for approval (safety gate)
async function requestPayment(env, custId, name, pkg){
  await tg("sendMessage", {chat_id: Number(custId), text:"تمام يا بطل 👑 ثواني وبجهّزلك تفاصيل الدفع 🙌"});
  await tg("sendMessage", {
    chat_id: ADMIN_CHAT_ID,
    text: `💰 طلب دفع من ${name} (id: ${custId})${pkg? " — باقة "+pkg : ""}:\n\n${MARK}${payText(pkg)}`,
    reply_markup: K([
      [B("✅ موافقة وإرسال","ok:"+custId)],
      [B("🪙 موافقة + صورة USDT","okq:"+custId)],
      [B("✏️ تعديل","edit:"+custId)] ])
  });
  await touch(env, custId, name, "intent");
}

async function onMessage(msg, env){
  const chatId = msg.chat.id;
  const fromId = String(msg.from.id);
  const text = msg.text || "";

  // ---- Admin ----
  if (fromId === String(ADMIN_CHAT_ID)){
    if (text === "/version"){ await tg("sendMessage",{chat_id:ADMIN_CHAT_ID,text:"✅ النسخة المنشورة: "+VERSION+" — بوت مبيعات بالأزرار + بوابة دفع 👑"}); return; }
    if (text === "/kv"){ const a=env&&env.KV?(await env.KV.get("LEARNED","json"))||[]:null; await tg("sendMessage",{chat_id:ADMIN_CHAT_ID,text: a?("✅ KV متصلة. المتعلّم: "+a.length):"❌ KV مش متصلة."}); return; }
    if (text === "/list"){ if(env&&env.KV){const a=(await env.KV.get("LEARNED","json"))||[]; await tg("sendMessage",{chat_id:ADMIN_CHAT_ID,text:a.length?("📚 ("+a.length+"):\n"+a.slice(-10).map((e,i)=>(i+1)+". «"+e.q+"»").join("\n")):"📭 مفيش متعلّم."});} else await tg("sendMessage",{chat_id:ADMIN_CHAT_ID,text:"❌ KV مش متصل."}); return; }
    if (text === "/stats"){ if(env&&env.KV){const us=await env.KV.list({prefix:"u:"}); let s=0; for(const k of us.keys){const u=await env.KV.get(k.name,"json"); if(u&&u.subscribed)s++;} const inv=(await env.KV.get("INVOICES","json"))||[]; await tg("sendMessage",{chat_id:ADMIN_CHAT_ID,text:`📊 عملاء: ${us.keys.length} · مشتركين: ${s} · إيصالات: ${inv.length}`});} else await tg("sendMessage",{chat_id:ADMIN_CHAT_ID,text:"❌ KV مش متصل."}); return; }
    const rt = msg.reply_to_message;
    if (rt && rt.text){
      if (rt.text.indexOf(LEARNMARK) !== -1){
        const m = rt.text.match(/id:\s*(-?\d+)/), qm = rt.text.match(/«([^»]*)»/);
        if (m){ const cid=m[1], q=qm?qm[1]:""; await tg("sendMessage",{chat_id:Number(cid),text:text}); let learned=false,c=0;
          if(env&&env.KV&&q){const arr=(await env.KV.get("LEARNED","json"))||[]; arr.push({q:norm(q),reply:text}); await env.KV.put("LEARNED",JSON.stringify(arr)); learned=true; c=arr.length;}
          await tg("sendMessage",{chat_id:ADMIN_CHAT_ID,text:learned?("✅ اتبعت واتعلمت 🧠 (إجمالي: "+c+")"):"✅ اتبعت ردك."}); }
      } else if (rt.text.indexOf(EDITMARK) !== -1){
        const m = rt.text.match(/id:\s*(-?\d+)/); if(m){ await tg("sendMessage",{chat_id:Number(m[1]),text:text}); await tg("sendMessage",{chat_id:ADMIN_CHAT_ID,text:"✅ اتبعت ردك."}); }
      }
    }
    return;
  }

  const name = ((msg.from.first_name||"")+" "+(msg.from.last_name||"")).trim() || "عميل";

  // ---- payment proof (photo/document) ----
  if (msg.photo || msg.document){
    await tg("forwardMessage",{chat_id:ADMIN_CHAT_ID, from_chat_id:chatId, message_id:msg.message_id});
    await tg("sendMessage",{chat_id:ADMIN_CHAT_ID, text:`🧾 إثبات دفع من ${name} (id: ${chatId}). راجعه واضغط للتأكيد:`, reply_markup:K([[B("✅ تأكيد الاشتراك","sub:"+chatId)]])});
    if(env&&env.KV){const inv=(await env.KV.get("INVOICES","json"))||[]; inv.push({id:String(chatId),name,ts:Date.now()}); await env.KV.put("INVOICES",JSON.stringify(inv));}
    await touch(env, chatId, name, "paid_pending");
    await tg("sendMessage",{chat_id:chatId, text:"استلمنا الإيصال ✅ بنراجعه ونفعّلك حالًا يا Founder 👑"});
    return;
  }

  // ---- first time -> welcome + menu ----
  if (env && env.KV){
    const existing = await env.KV.get("u:"+chatId);
    if (!existing){ await touch(env, chatId, name, "engaged"); const v=view("main"); await tg("sendMessage",{chat_id:chatId, text:v.text, reply_markup:v.kb}); return; }
  }
  if (text === "/start"){ await touch(env,chatId,name,"engaged"); const v=view("main"); await tg("sendMessage",{chat_id:chatId,text:v.text,reply_markup:v.kb}); return; }

  // ---- match text bank ----
  await touch(env, chatId, name, "engaged");
  let item = matchStatic(text);
  if (!item){ const l = await matchLearned(text, env); if (l) item = {reply:l}; }

  if (item && item.menu){ const v=view(item.menu); await tg("sendMessage",{chat_id:chatId, text:v.text, reply_markup:v.kb}); return; }
  if (item && item.sensitive){ // money-related typed -> approval gate
    await tg("sendMessage",{chat_id:chatId, text:"تمام 🙌 ثواني وبرد عليك بالتفاصيل."});
    await tg("sendMessage",{chat_id:ADMIN_CHAT_ID, text:`💰 استفسار دفع من ${name} (id: ${chatId}):\n«${text}»\n\n${MARK}${item.reply}`, reply_markup:K([[B("✅ موافقة وإرسال","ok:"+chatId)],[B("🪙 موافقة + صورة USDT","okq:"+chatId)],[B("✏️ تعديل","edit:"+chatId)]])});
    return;
  }
  if (item && item.reply){ // general -> auto reply + back-to-menu button
    await tg("sendMessage",{chat_id:chatId, text:item.reply, reply_markup:K([[B("📋 القائمة","m:main"), B("👑 اشترك","m:sub")]])});
    return;
  }
  // unknown -> escalate to admin
  await tg("sendMessage",{chat_id:ADMIN_CHAT_ID, text:`🚩 سؤال جديد مالوش رد — من ${name} (id: ${chatId}):\n«${text}»\n\nاضغط الزر وردّ (وهحفظه للمرة الجاية):`, reply_markup:K([[B("🧠 رد + تعليم","learn:"+chatId)]])});
}

function matchStatic(text){
  const t = norm(text); if(!t) return null;
  for (const it of ANSWERS) for (const k of it.keys) if (t.indexOf(norm(k)) !== -1) return it;
  return null;
}
async function matchLearned(text, env){
  if(!env||!env.KV) return null; const t=norm(text); if(!t) return null;
  const arr=(await env.KV.get("LEARNED","json"))||[]; for(const e of arr) if(e.q && t.indexOf(e.q)!==-1) return e.reply; return null;
}

async function onCallback(cq, env){
  const data = cq.data || "";
  const presser = String(cq.from.id);
  const chatId = cq.message ? cq.message.chat.id : cq.from.id;

  // ----- Admin actions -----
  if (presser === String(ADMIN_CHAT_ID) && /^(ok|okq|edit|sub):/.test(data)){
    const [action, custId] = data.split(":");
    if (action === "ok" || action === "okq"){
      const t = cq.message.text || ""; const idx = t.indexOf(MARK);
      const ans = idx !== -1 ? t.slice(idx + MARK.length) : "";
      if (ans){
        await tg("sendMessage",{chat_id:Number(custId), text:ans});
        if (action === "okq" && PAY.usdtQR) await tg("sendPhoto",{chat_id:Number(custId), photo:PAY.usdtQR, caption:"محفظة USDT ("+PAY.usdtNetwork+") 🪙"});
        await tg("editMessageText",{chat_id:cq.message.chat.id, message_id:cq.message.message_id, text:t+"\n\n✅ اتبعت للعميل."+(action==="okq"&&!PAY.usdtQR?"\n⚠️ مفيش صورة USDT محفوظة — ابعتها بنفسك.":"")});
      }
    } else if (action === "edit"){
      await tg("sendMessage",{chat_id:ADMIN_CHAT_ID, text:`${EDITMARK}${custId}):`, reply_markup:{force_reply:true}});
    } else if (action === "sub"){
      if(env&&env.KV){const u=(await env.KV.get("u:"+custId,"json"))||{}; u.subscribed=true; u.subAt=Date.now(); u.stage="subscribed"; await env.KV.put("u:"+custId,JSON.stringify(u));}
      await tg("sendMessage",{chat_id:Number(custId), text:SUB_WELCOME});
      await tg("editMessageText",{chat_id:cq.message.chat.id, message_id:cq.message.message_id, text:(cq.message.text||"")+"\n\n✅ تم تأكيد الاشتراك 👑"});
    }
    await tg("answerCallbackQuery",{callback_query_id:cq.id});
    return;
  }

  // ----- Customer navigation -----
  const name = ((cq.from.first_name||"")+" "+(cq.from.last_name||"")).trim() || "عميل";
  const [pre, arg] = data.split(":");
  async function show(v){ await tg("editMessageText",{chat_id:chatId, message_id:cq.message.message_id, text:v.text, reply_markup:v.kb}).catch(async()=>{ await tg("sendMessage",{chat_id:chatId, text:v.text, reply_markup:v.kb}); }); }

  if (pre === "m"){ const v=view(arg); if(v){ await show(v); await touch(env,chatId,name, arg==="pay"||arg==="sub"?"intent":(arg==="compare"||arg==="packages"||arg==="help"?"considering":"engaged")); } }
  else if (pre === "p"){ await show({text:PKG[arg]||"—", kb:K([[B("👑 اشترك في دي","buy:"+(arg.charAt(0).toUpperCase()+arg.slice(1)))],[B("🆚 قارن","m:compare"), B("↩️ رجوع","m:packages")]])}); await touch(env,chatId,name,"considering"); }
  else if (pre === "cmp"){ await show({text:CMP[arg]||"—", kb:K([[B("👑 عايز أشترك","m:sub"), B("↩️ رجوع","m:compare")]])}); await touch(env,chatId,name,"considering"); }
  else if (pre === "rec"){ const r=REC[arg]; if(r){ await show({text:r[1]+"\n\n"+PKG[r[0]], kb:K([[B("👑 اشترك في دي","buy:"+(r[0].charAt(0).toUpperCase()+r[0].slice(1)))],[B("↩️ رجوع","m:help")]])}); await touch(env,chatId,name,"considering"); } }
  else if (pre === "faq"){ await show({text:FAQ[arg]||"—", kb:K([[B("👑 عايز أشترك","m:sub"), B("↩️ رجوع","m:faq")]])}); }
  else if (pre === "buy"){ await requestPayment(env, chatId, name, arg); } // SENSITIVE -> admin approval
  await tg("answerCallbackQuery",{callback_query_id:cq.id});
}
