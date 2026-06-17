/**
 * Empire English — Telegram Assistant on CLOUDFLARE WORKERS  [No AI, 100% free, reliable]
 *
 * Why Cloudflare: it returns a clean HTTP 200, so Telegram delivers every message
 * (Google Apps Script returns 302 -> Telegram stalls after the first message).
 *
 * Flow (with your approval on every reply):
 *  Customer -> bot finds a keyword answer -> sends it to YOU with [✅ Approve] [✏️ Edit].
 *  Approve -> sent to customer. Edit -> you type your reply -> sent.
 *  No keyword match -> forwarded to you with [✏️ Reply].  Stateless (no database).
 *
 * SETUP: see SETUP.md (Cloudflare section). Fill the 2 values below, deploy, set webhook.
 */

// ======= عدّل دول بس =======
const TELEGRAM_TOKEN = "ضع_توكن_البوت_هنا";
const ADMIN_CHAT_ID  = "ضع_رقمك_من_userinfobot_هنا";
// ===========================

const MARK = "🤖 الرد المقترح (راجعه قبل الإرسال):\n";
const EDITMARK = "✏️ اكتب ردك للعميل (id: ";

// ====================== بنك الإجابات (عدّل/زوّد براحتك) ======================
const ANSWERS = [
  { keys:['عايز اشترك','هشترك','ينفع اشترك','اشترك','اشتراك','انضم','join','subscribe','register'],
    reply:`تمام 👑 الاشتراك سهل:
1️⃣ قوللي عايز أنهي باقة (Recruit / Builder / Empire / VIP)
2️⃣ ادفع بالطريقة المناسبة ليك
3️⃣ ابعتلي screenshot وأفعّلك على طول كـ Founder

💳 الدفع: فودافون كاش/إنستا باي 01004581035 (يوزر: mohamedashry10041) · PayPal: paypal.me/bioroma · الإمارات: تحويل بنكي.
عايز أنهي باقة؟ 👑` },

  { keys:['طرق الدفع','ازاي ادفع','ازاى ادفع','الدفع','ادفع','فودافون','انستا','instapay','paypal','باي بال','فيزا','تحويل بنكي'],
    reply:`💳 طرق الدفع:
• فودافون كاش: 01004581035
• إنستا باي: 01004581035 / mohamedashry10041
• PayPal (برّه مصر): paypal.me/bioroma
• من الإمارات 🇦🇪: ابعتلي وأديك تفاصيل التحويل
بعد الدفع ابعتلي screenshot وأفعّلك فورًا 👑` },

  { keys:['recruit','ريكروت','الباقه الاولى','الباقة الاولى','الاولانيه'],
    reply:`RECRUIT 🥉 — البداية الصح (199ج / 19$ شهري)
للمبتدئين اللي عايزين نظام من غير ضغط:
• نظامك اليومي الكامل • ملخصات AI أسبوعية
• قنوات مستواك (نصية وصوتية) • تقييم أسبوعي • نقاط وتحديات
«تبدأ صح وتبني عادة يومية» 👑` },

  { keys:['builder','بيلدر','الباقه التانيه','الباقة التانية','التانيه','التانية'],
    reply:`BUILDER ⭐ — الأكثر اختيارًا (399ج / 39$ شهري)
اللي بتخليك تتكلم فعلاً:
• تصحيح كلامك وكتابتك بالـ AI • مكتبة أفلام وبودكاست
• كل الجلسات الصوتية اليومية (بتتكلم والجروب بيسمعك)
• Buddy ومنتورشيب • امتحانات • خزنة تسجيلات
«ده اللي بيخليك تتكلم فعلاً» 👑` },

  { keys:['empire','امباير','إمباير','الباقه التالته','التالته','الثالثة'],
    reply:`EMPIRE 🥇 — أسرع واهتمام شخصي (799ج / 89$ شهري)
كل مميزات Builder +:
• تصحيح بشري بأولوية • جلستين كوتشينج جماعي/شهر
• خطة شهرية شخصية + مراجعة فردية • شهادات Mastery
«نتايج أسرع لأنك مش لوحدك» 👑` },

  { keys:['vip','في اي بي','خاص','لوحدي','مدرس خاص','جلسات خاصه','جلسه خاصه','الدائره','one on one','1 on 1'],
    reply:`VIP 👑 — الدائرة الخاصة (3,500ج / 249$ شهري · مقاعد محدودة)
كل مميزات Empire +:
• 4 جلسات خاصة 1-on-1 / شهر • تصحيح بشري غير محدود 24 ساعة
• لاين مباشر على واتساب • خطة مخصصة لهدفك
«كأن معاك مدرب خاص» 👑` },

  { keys:['تسجيل','تسجيلات','مسجل','مسجله','فيديو','فيديوهات','اعيد','ارجعله','recording'],
    reply:`أيوه 🎥 كل الجلسات بتتسجّل في «خزنة التسجيلات» وترجعلها أي وقت طول ما اشتراكك شغّال، وبتحتفظ بالملخصات والـ cheat sheets للأبد (من باقة Builder وفوق) 👑` },

  { keys:['مواعيد','ميعاد','الجلسات امتى','امتى الجلسات','الوقت','الساعه','schedule','بتبدا','بتبدأ امتى'],
    reply:`الجلسات الصوتية يومية وفيها أكتر من ميعاد عشان تناسب الجميع 🎤 (وكلها بتتسجّل). الجدول الكامل بيوصلك أول ما تدخل، ودفعتنا الأولى بتبدأ السبت 27 يونيو 👑` },

  { keys:['اغير الباقه','تغيير الباقه','اغيّر','ارقي','ترقيه','انزل باقه','upgrade','downgrade'],
    reply:`عادي خالص 👍 ترقّي أي وقت (فورًا)، أو تغيّر/تنزّل من الشهر اللي بعده — مفيش تقييد. وسعر التأسيس بيفضل ثابت ليك طول ما اشتراكك شغّال 👑` },

  { keys:['مبتدئ','مبتدي','ضعيف','من الصفر','لسه بادئ','مستواي','صفر','beginner'],
    reply:`متقلقش خالص 🌟 بنبدأ من Level 0 — الصفر تمامًا. النظام معمول للمبتدئين بالظبط، وأول ما تدخل بتعمل اختبار تحديد مستوى 👑` },

  { keys:['ضمان','استرجاع','مجاني','تجربه','تجربة','فري','free','trial','refund','مخاطره'],
    reply:`فيه ضمان استرجاع فلوس خلال 7 أيام 🛡️ صفر مخاطرة — تجرّب، ولو مش مناسب ترجعلك فلوسك 👑` },

  { keys:['مقعد','مقاعد','اماكن','كام مكان','باقي كام','متاح'],
    reply:`إحنا في مرحلة المؤسسين (Founding) — مقاعد محدودة بسعر ثابت للأبد + شارة Founder + Accent Bootcamp مجاني. اللي يلحق دلوقتي يثبّت سعره للأبد 👑` },

  { keys:['الكوميونيتي','المجتمع','مجتمع','community','ديسكورد','discord','جروب'],
    reply:`الكوميونيتي شغّال 24 ساعة 🏛️ جلسات صوتية حية، تدريب مع أعضاء في مستواك، ومتابعة يومية — ده اللي بيخليك تتكلم فعلاً 👑` },

  { keys:['شهاده','شهادة','certificate','معتمد'],
    reply:`أيوه 🏅 فيه شهادات Mastery (Silver / Gold / Platinum) في باقتي Empire و VIP بعد التقييم 👑` },

  { keys:['قد ايه','مده','مدة','كام شهر','هتعلم في','نتيجه','اتقن','اطلع'],
    reply:`المدة بتعتمد على مستواك ومجهودك، بس النظام مصمّم يوصّلك بأسرع طريق ممكن عن طريق التنفيذ اليومي + المتابعة 🎯 عايز أرشّحلك تبدأ منين؟ 👑` },

  { keys:['الباقات','باقات','باقه','باقة','الاسعار','اسعار','السعر','بكام','كام','الخطط','plans','price','packages','الباقا'],
    reply:`باقاتنا (شهري) 👑 — والسعر حسب بلدك:
🥉 RECRUIT — 199ج / 19$ → البداية
🥈 BUILDER ⭐ — 399ج / 39$ → الأكثر اختيارًا
🥇 EMPIRE — 799ج / 89$ → أسرع + اهتمام شخصي
👑 VIP — 3,500ج / 249$ → مدرّب خاص (مقاعد محدودة)
🛡️ ضمان 7 أيام · سعر تأسيس ثابت للأبد.
محتار؟ قوللي مستواك وهدفك وأرشّحلك 👑` },

  { keys:['شكرا','متشكر','تسلم','thanks','thank you'],
    reply:`العفو يا فندم 🌟 أي وقت. ولو حابب تبدأ قوللي وأرتبلك كل حاجة 👑` },

  { keys:['السلام','سلام','اهلا','أهلا','هاي','هلا','مرحبا','صباح','مساء','hello','hi'],
    reply:`أهلاً بيك في Empire English 👑
نظام كامل بيخليك تتكلم إنجليزي بطلاقة — مهام يومية + كوميونيتي 24 ساعة + لكنة أمريكية.
تحب تعرف الباقات والأسعار؟ اكتب «الباقات» 👇` },
];
// ====================================================================

export default {
  async fetch(req){
    if (req.method !== "POST") return new Response("Empire English bot is running ✅");
    let u;
    try { u = await req.json(); } catch(e){ return new Response("ok"); }
    try {
      if (u.callback_query) await onCallback(u.callback_query);
      else if (u.message)   await onMessage(u.message);
    } catch(err){
      await tg("sendMessage", {chat_id: ADMIN_CHAT_ID, text: "⚠️ خطأ: " + err});
    }
    return new Response("ok"); // clean 200 -> Telegram keeps delivering
  }
};

async function tg(method, payload){
  return fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`, {
    method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(payload)
  });
}

function norm(s){
  return (s || "").toString().toLowerCase()
    .replace(/[\u064B-\u0652\u0670]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function matchAnswer(text){
  const t = norm(text);
  if (!t) return null;
  for (const item of ANSWERS){
    for (const key of item.keys){
      if (t.indexOf(norm(key)) !== -1) return item.reply;
    }
  }
  return null;
}

async function onMessage(msg){
  const chatId = msg.chat.id;
  const fromId = String(msg.from.id);
  const text = msg.text || "";

  // ---- Admin ----
  if (fromId === String(ADMIN_CHAT_ID)){
    const rt = msg.reply_to_message;
    if (rt && rt.text && rt.text.indexOf(EDITMARK) !== -1){
      const m = rt.text.match(/id:\s*(-?\d+)/);
      if (m){
        await tg("sendMessage", {chat_id: Number(m[1]), text: text});
        await tg("sendMessage", {chat_id: ADMIN_CHAT_ID, text: "✅ اتبعت ردك للعميل."});
      }
    }
    return;
  }

  // ---- Customer ----
  if (text === "/start"){
    await tg("sendMessage", {chat_id: chatId, text: "أهلاً بيك في Empire English 👑 اكتب سؤالك (مثلاً: الباقات / الأسعار / الدفع) وهنرد عليك."});
    return;
  }

  const name = ((msg.from.first_name || "") + " " + (msg.from.last_name || "")).trim() || "عميل";
  const answer = matchAnswer(text);

  if (answer){
    await tg("sendMessage", {
      chat_id: ADMIN_CHAT_ID,
      text: `📩 رسالة من ${name} (id: ${chatId}):\n«${text}»\n\n${MARK}${answer}`,
      reply_markup: { inline_keyboard: [[
        {text: "✅ موافقة وإرسال", callback_data: "ok:" + chatId},
        {text: "✏️ تعديل",        callback_data: "edit:" + chatId}
      ]]}
    });
  } else {
    await tg("sendMessage", {
      chat_id: ADMIN_CHAT_ID,
      text: `🚩 سؤال جديد مالوش رد جاهز — من ${name} (id: ${chatId}):\n«${text}»\n\nاضغط الزر وردّ بنفسك:`,
      reply_markup: { inline_keyboard: [[ {text: "✏️ رد على العميل", callback_data: "edit:" + chatId} ]] }
    });
  }
}

async function onCallback(cq){
  const [action, custId] = cq.data.split(":");

  if (action === "ok"){
    const t = cq.message.text || "";
    const idx = t.indexOf(MARK);
    const answer = idx !== -1 ? t.slice(idx + MARK.length) : "";
    if (answer){
      await tg("sendMessage", {chat_id: Number(custId), text: answer});
      await tg("editMessageText", {chat_id: cq.message.chat.id, message_id: cq.message.message_id, text: t + "\n\n✅ تم الإرسال للعميل."});
    }
  } else if (action === "edit"){
    await tg("sendMessage", {chat_id: ADMIN_CHAT_ID, text: `${EDITMARK}${custId}):`, reply_markup: {force_reply: true}});
  }
  await tg("answerCallbackQuery", {callback_query_id: cq.id});
}
