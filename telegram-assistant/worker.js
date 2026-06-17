/**
 * Empire English — Telegram Assistant on CLOUDFLARE WORKERS
 * Rich Keyword Answer Bank + Approval + AUTO-LEARN  [No AI, 100% free, reliable]
 *
 * Customer asks -> bot finds a ready answer (static OR learned) -> sends to YOU
 * with [✅ Approve] [✏️ Edit]. Unknown -> [🧠 Reply + Teach] (saved for next time).
 *
 * Admin commands: /version  /kv  /list
 * Needs: fill TELEGRAM_TOKEN + ADMIN_CHAT_ID below, and bind a KV namespace named "KV".
 */

// ======= عدّل دول بس =======
const TELEGRAM_TOKEN = "ضع_توكن_البوت_هنا";
const ADMIN_CHAT_ID  = "ضع_رقمك_من_userinfobot_هنا";
// ===========================

const VERSION   = "v7";
const MARK      = "🤖 الرد المقترح (راجعه قبل الإرسال):\n";
const EDITMARK  = "✏️ اكتب ردك للعميل (id: ";
const LEARNMARK = "🧠 اكتب الرد وهحفظه للمرة الجاية (id: ";

// ====================== بنك الإجابات (عدّل/زوّد براحتك) ======================
const ANSWERS = [
  // ---------- الاشتراك ----------
  { keys:['عايز اشترك','هشترك','ينفع اشترك','اشترك','اشتراك','انضم','عايز ادخل','ازاي ابدا','ابدا ازاي','عايز ابدا','join','subscribe','register','how to join'],
    reply:`تمام 👑 الاشتراك سهل وسريع:
1️⃣ قوللي عايز أنهي باقة (Recruit / Builder / Empire / VIP)
2️⃣ ادفع بالطريقة المناسبة ليك
3️⃣ ابعتلي screenshot وأفعّلك على طول كـ Founder

💳 الدفع: فودافون كاش/إنستا باي 01004581035 (يوزر: mohamedashry10041) · PayPal: paypal.me/bioroma · الإمارات: تحويل بنكي.
عايز أنهي باقة؟ 👑` },

  // ---------- الدفع ----------
  { keys:['طرق الدفع','ازاي ادفع','ازاى ادفع','الدفع','ادفع','فودافون','انستا','instapay','paypal','باي بال','فيزا','تحويل بنكي','ابعت الفلوس','الحساب','حساب بنكي'],
    reply:`💳 طرق الدفع:
• فودافون كاش: 01004581035
• إنستا باي: 01004581035 / mohamedashry10041
• PayPal (برّه مصر): paypal.me/bioroma
• من الإمارات 🇦🇪: ابعتلي وأديك تفاصيل التحويل البنكي

بعد الدفع ابعتلي screenshot وأفعّلك فورًا 👑` },

  // ---------- المقارنة / محتار تختار ----------
  { keys:['الفرق','فرق','مقارنه','مقارنة','قارن','الفرق بين','ايه الفرق','فرق بين','انهي احسن','انهي افضل','ايهم احسن','ايهم افضل','محتار','مش عارف اختار','مش عارف ابدا','انهي باقه','انهي باقة','اختار ايه','تنصحني','يناسبني','vs','ولا'],
    reply:`خليني أسهّلهالك — مقارنة سريعة 👇

🥉 RECRUIT (199ج/19$): النظام اليومي + متابعة بسيطة. للبداية بأقل تكلفة.
🥈 BUILDER ⭐ (399ج/39$): كل Recruit + تصحيح كلامك بالـ AI + كل الجلسات الصوتية + مكتبة كاملة. (الأكثر اختيارًا وأحسن قيمة)
🥇 EMPIRE (799ج/89$): كل Builder + كوتشينج جماعي + خطة شخصية + شهادات. لنتيجة أسرع واهتمام أكبر.
👑 VIP (3,500ج/249$): كل Empire + جلسات خاصة 1-on-1 + لاين مباشر. الأقوى والأسرع (مقاعد محدودة).

باختصار:
• ميزانية محدودة → Recruit
• عايز تتكلم بثقة (الأنصح) → Builder ⭐
• عندك هدف/ديدلاين → Empire
• عايز اهتمام شخصي كامل → VIP

قوللي مستواك وهدفك وأرشّحلك الأنسب 👑` },

  // ---------- باقات محددة ----------
  { keys:['recruit','ريكروت','الباقه الاولى','الباقة الاولى','الاولانيه'],
    reply:`RECRUIT 🥉 — البداية الصح (199ج / 19$ شهري)

لمين؟ للمبتدئين واللي عايز يبدأ بنظام منظّم من غير ضغط ولا تكلفة كبيرة.
بتاخد:
• نظامك اليومي الكامل (نطق + كلمات + استماع + تكلّم + كتابة)
• ملخصات أسبوعية جاهزة بالـ AI
• دخول قنوات مستواك (نصية وصوتية) تتمرّن مع الناس
• تقييم أسبوعي يقيس تقدمك + نقاط وتحديات

ليه تختارها؟ «تبدأ صح وتبني عادة يومية بأقل تكلفة» 👑` },

  { keys:['builder','بيلدر','الباقه التانيه','الباقة التانية','التانيه','التانية'],
    reply:`BUILDER ⭐ — التطوّر الحقيقي (399ج / 39$ شهري) — الأكثر اختيارًا

لمين؟ للجاد اللي عايز «يتكلم» فعلاً مش بس يذاكر.
كل مميزات Recruit + :
• تصحيح كلامك وكتابتك بالـ AI (تبعت تسجيل/كتابة ويجيلك تصحيح فوري) — أهم ميزة
• مكتبة كاملة من الأفلام والبودكاست للتعلّم بالاستماع
• كل الجلسات الصوتية اليومية (بتتكلم والجروب بيسمعك)
• Buddy ومنتورشيب + امتحانات الترقّي + خزنة تسجيلات

ليه تختارها؟ «دي اللي بتكسر حاجز الكلام وتخليك تتكلم بثقة» 👑` },

  { keys:['empire','امباير','إمباير','الباقه التالته','التالته','الثالثة'],
    reply:`EMPIRE 🥇 — أسرع واهتمام شخصي (799ج / 89$ شهري)

لمين؟ للطموح اللي عنده هدف أو ديدلاين وعايز لمسة بشرية ونتيجة أسرع.
كل مميزات Builder + :
• تصحيح بشري بأولوية (مش بس AI)
• جلستين كوتشينج جماعي في الشهر (مجموعة صغيرة)
• خطة شهرية مخصصة ليك + مراجعة فردية
• شهادات Mastery (Silver / Gold / Platinum) + شارة Empire

ليه تختارها؟ «نتايج أسرع لأنك مش لوحدك» 👑` },

  { keys:['vip','في اي بي','خاص','لوحدي','مدرس خاص','جلسات خاصه','جلسه خاصه','الدائره','one on one','1 on 1'],
    reply:`VIP 👑 — الدائرة الخاصة / مدرّبك الشخصي (3,500ج / 249$ شهري · مقاعد محدودة)

لمين؟ للي عايز تحوّل سريع واهتمام كامل ١٠٠٪ وعنده هدف واضح.
كل مميزات Empire + :
• 4 جلسات خاصة 1-on-1 في الشهر (إنت بس مع المدرب)
• تصحيح بشري غير محدود خلال 24 ساعة
• لاين مباشر على واتساب + خطة مخصصة بالكامل لهدفك
• توثيق before/after لتحوّلك

ليه تختارها؟ «كأن معاك مدرب خاص يمشي معاك خطوة بخطوة» 👑` },

  // ---------- مش فاهم / اشرحلي ----------
  { keys:['مش فاهم','مش فاهمه','اشرحلي','اشرح','وضحلي','وضح','يعني ايه','ايه ده','اشرحلي اكتر','مش عارف','explain'],
    reply:`ولا يهمك، هوضّحلك ببساطة 🌟

Empire English مش كورس فيديوهات تتفرّج عليه وتنساه — ده «نظام» كامل بيمشي معاك كل يوم:
• مهام يومية بسيطة (نطق + كلمات + استماع + تكلّم)
• كوميونيتي بتتكلم فيه إنجليزي مع ناس في مستواك
• تدريب على اللكنة الأمريكية من أول يوم
• متابعة وتصحيح عشان تتطور بسرعة

بنبدأ من الصفر تمامًا ونوصّلك لطلاقة خطوة بخطوة. تحب أشرحلك الباقات؟ اكتب «الباقات» 👑` },

  // ---------- النظام / المستويات ----------
  { keys:['المستويات','مستويات','كام مستوى','levels','بتشتغلوا ازاي','النظام بيشتغل','ازاي التعليم','المنهج','المحتوى','بتعلموا ازاي','ازاي بتذاكروا'],
    reply:`النظام على ٤ مستويات 🪜
• Level 0: مبتدئ تمامًا (الأصوات + أول كلمات)
• Level 1: محادثات يومية بثقة
• Level 2: مواضيع أصعب وفهم السرعة الطبيعية
• Level 3: طلاقة ولكنة زي الـ native

وكل يوم عندك مهام بسيطة + جلسات صوتية + تصحيح. أول ما تشترك بتعمل اختبار تحديد مستوى يحطك في الصح 👑` },

  // ---------- خصم / عرض ----------
  { keys:['خصم','عرض','تخفيض','كوبون','اوفر','عروض','discount','offer','promo','اقل سعر'],
    reply:`أحسن عرض هو دلوقتي بالظبط 🔥
سعر «التأسيس» ثابت للأبد ومش هيتكرر بعد ما المقاعد تخلص. وكمان الاشتراك السنوي بيوفّرلك حوالي ٣٥٪ (تدفع ٨ شهور وتاخد ١٢). تحب تفاصيل باقة معيّنة؟ 👑` },

  // ---------- أقساط ----------
  { keys:['اقساط','قسط','تقسيط','installment','ادفع على مرات'],
    reply:`تقدر تشترك شهر بشهر من غير التزام طويل 👍 ولو حابب توفّر، فيه الاشتراك السنوي بخصم ~٣٥٪. أنهي باقة في بالك وأظبطلك الطريقة؟ 👑` },

  // ---------- شهادة / امتحانات ----------
  { keys:['شهاده','شهادة','certificate','معتمد','ايلتس','ielts','توفل','toefl','امتحان'],
    reply:`عندنا شهادات Mastery (Silver / Gold / Platinum) في باقتي Empire و VIP بتثبت مستواك 🏅
والنظام بيقوّي مهارات الكلام والاستماع اللي بتفيدك في أي امتحان زي IELTS/TOEFL — بس إحنا مش جهة الامتحان الرسمي نفسه. عايز أرشّحلك باقة تناسب هدفك؟ 👑` },

  // ---------- أونلاين / مكان / لغة ----------
  { keys:['اونلاين','اون لاين','حضوري','online','offline','مكان','بتشرحوا ازاي','بالعربي','بالانجليزي','عن بعد'],
    reply:`كله أونلاين ١٠٠٪ 🌍 عن طريق كوميونيتي + جلسات صوتية حية تحضرها من أي مكان. مفيش حضوري. الشرح بيكون مبسّط وبنبدأ من مستواك إنت. عايز تعرف المواعيد؟ 👑` },

  // ---------- السن ----------
  { keys:['سن','عمر','للاطفال','اطفال','للكبار','مناسب لسني','kids','age','عندي كام سنه'],
    reply:`النظام مناسب للمراهقين والكبار (من ١٤ سنة تقريبًا فأكتر)، ومن أي مستوى حتى لو من الصفر 🌟 عايز أبدأ معاك منين؟ 👑` },

  // ---------- الوقت / الالتزام ----------
  { keys:['الوقت في اليوم','محتاج قد ايه','ساعات','الالتزام','مشغول','معنديش وقت','وقت كتير','قد ايه يوميا'],
    reply:`وقت بسيط ومنتظم يوميًا أهم من ساعات كتير متفرقة ⏳ والنظام مرن — تبدأ باللي وقتك يسمح بيه، والجلسات بتتسجّل لو فاتك حاجة. تحب تبدأ بأنهي باقة؟ 👑` },

  // ---------- تسجيلات ----------
  { keys:['تسجيل','تسجيلات','مسجل','مسجله','فيديو','فيديوهات','اعيد','ارجعله','recording'],
    reply:`أيوه 🎥 كل الجلسات بتتسجّل في «خزنة التسجيلات» وترجعلها أي وقت طول ما اشتراكك شغّال، وبتحتفظ بالملخصات والـ cheat sheets للأبد (من باقة Builder وفوق) 👑` },

  // ---------- المواعيد ----------
  { keys:['مواعيد','ميعاد','الجلسات امتى','امتى الجلسات','الساعه','schedule','بتبدا','بتبدأ امتى','وقت الجلسات'],
    reply:`الجلسات الصوتية يومية وفيها أكتر من ميعاد عشان تناسب الجميع 🎤 (وكلها بتتسجّل). الجدول الكامل بيوصلك أول ما تدخل، ودفعتنا الأولى بتبدأ السبت 27 يونيو 👑` },

  // ---------- تغيير الباقة ----------
  { keys:['اغير الباقه','تغيير الباقه','اغيّر','ارقي','ترقيه','انزل باقه','upgrade','downgrade'],
    reply:`عادي خالص 👍 ترقّي أي وقت (فورًا)، أو تغيّر/تنزّل من الشهر اللي بعده — مفيش تقييد. وسعر التأسيس بيفضل ثابت ليك طول ما اشتراكك شغّال 👑` },

  // ---------- مبتدئ ----------
  { keys:['مبتدئ','مبتدي','ضعيف','من الصفر','لسه بادئ','مستواي','صفر','beginner','انجليزيي وحش'],
    reply:`متقلقش خالص 🌟 بنبدأ من Level 0 — الصفر تمامًا. النظام معمول للمبتدئين بالظبط، وأول ما تدخل بتعمل اختبار تحديد مستوى يحطك في المكان الصح 👑` },

  // ---------- ضمان / تجربة ----------
  { keys:['ضمان','استرجاع','مجاني','تجربه','تجربة','فري','free','trial','refund','مخاطره'],
    reply:`فيه ضمان استرجاع فلوس خلال 7 أيام 🛡️ صفر مخاطرة — تجرّب النظام، ولو مش مناسب ترجعلك فلوسك 👑` },

  // ---------- ثقة / نصب ----------
  { keys:['نصب','مضمون','ثقة','تجربة حد','ريفيو','اراء','تقييمات','reviews','scam','حقيقي','مش هتنصبوا'],
    reply:`سؤال مشروع 👍 عشان كده عندنا ضمان استرجاع فلوسك خلال ٧ أيام — صفر مخاطرة. وفيه أعضاء حقيقيين بنتايج، وكوميونيتي شغّال ٢٤ ساعة تقدر تشوفه بنفسك. تحب تبدأ بالتجربة؟ 👑` },

  // ---------- مقاعد ----------
  { keys:['مقعد','مقاعد','اماكن','كام مكان','باقي كام','متاح'],
    reply:`إحنا في مرحلة المؤسسين (Founding) — مقاعد محدودة بسعر ثابت للأبد + شارة Founder + Accent Bootcamp مجاني. اللي يلحق دلوقتي يثبّت سعره للأبد 👑` },

  // ---------- الكوميونيتي ----------
  { keys:['الكوميونيتي','المجتمع','مجتمع','community','ديسكورد','discord','جروب','المجموعه'],
    reply:`الكوميونيتي شغّال 24 ساعة 🏛️ جلسات صوتية حية، تدريب مع أعضاء في مستواك، ومتابعة يومية — ده اللي بيخليك تتكلم فعلاً 👑` },

  // ---------- المدة / النتيجة ----------
  { keys:['قد ايه','مده','مدة','كام شهر','هتعلم في','نتيجه','اتقن','اطلع','هطلع كويس'],
    reply:`المدة بتعتمد على مستواك ومجهودك، بس النظام مصمّم يوصّلك بأسرع طريق ممكن عن طريق التنفيذ اليومي + المتابعة 🎯 عايز أرشّحلك تبدأ منين؟ 👑` },

  // ---------- التكلّم بالصوت ----------
  { keys:['صوتي يطلع','صوتي','مايك','اتكلم','هتكلم','بتكلم في الجروب','الجلسات الصوتيه'],
    reply:`أيوه 🎤 في الجلسات بتفتح المايك وبتتكلم والجروب بيسمعك ويرد عليك — تدريب حقيقي مش استماع بس. والجو داعم والكاميرا اختيارية. ده اللي بيكسر حاجز الخوف ويخليك تتكلم 👑` },

  // ---------- مكلم مين / دعم ----------
  { keys:['اكلم حد','في حد','حد يرد','مساعده','دعم','support','حضرتك مين','انت مين'],
    reply:`إنت بتكلم فريق Empire English مباشرة 🙌 قوللي سؤالك أو اللي محتاجه وأنا هساعدك خطوة بخطوة. تحب تعرف الباقات ولا تشترك؟ 👑` },

  // ---------- عام: الباقات والأسعار ----------
  { keys:['الباقات','باقات','باقه','باقة','الاسعار','اسعار','السعر','بكام','كام','الخطط','plans','price','packages','الباقا'],
    reply:`باقاتنا (شهري) 👑 — والسعر بيتظبط حسب بلدك:
🥉 RECRUIT — 199ج / 19$ → البداية الصح
🥈 BUILDER ⭐ — 399ج / 39$ → الأكثر اختيارًا
🥇 EMPIRE — 799ج / 89$ → أسرع + اهتمام شخصي
👑 VIP — 3,500ج / 249$ → مدرّب خاص (مقاعد محدودة)

🛡️ ضمان 7 أيام · سعر تأسيس ثابت للأبد.
محتار؟ اكتب «الفرق» وأقارنلك، أو قوللي مستواك وأرشّحلك 👑` },

  // ---------- شكر ----------
  { keys:['شكرا','متشكر','تسلم','thanks','thank you','جزاك'],
    reply:`العفو يا فندم 🌟 أي وقت. ولو حابب تبدأ قوللي وأرتبلك كل حاجة 👑` },

  // ---------- تحية ----------
  { keys:['السلام عليكم','السلام','سلام','اهلا','اهلين','هاي','هلا','مرحبا','ازيك','ازيكم','صباح','مساء','hello','hi','hey'],
    reply:`أهلاً بيك في Empire English 👑
نظام كامل بيخليك تتكلم إنجليزي بطلاقة — مهام يومية + كوميونيتي 24 ساعة + لكنة أمريكية.
تحب تعرف الباقات والأسعار؟ اكتب «الباقات» 👇` },
];
// ====================================================================

export default {
  async fetch(req, env){
    if (req.method !== "POST") return new Response("Empire English bot is running ✅");
    let u;
    try { u = await req.json(); } catch(e){ return new Response("ok"); }
    try {
      if (u.callback_query) await onCallback(u.callback_query, env);
      else if (u.message)   await onMessage(u.message, env);
    } catch(err){
      await tg("sendMessage", {chat_id: ADMIN_CHAT_ID, text: "⚠️ خطأ: " + err});
    }
    return new Response("ok");
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

function matchStatic(text){
  const t = norm(text);
  if (!t) return null;
  for (const item of ANSWERS){
    for (const key of item.keys){
      if (t.indexOf(norm(key)) !== -1) return item.reply;
    }
  }
  return null;
}

async function matchLearned(text, env){
  if (!env || !env.KV) return null;
  const t = norm(text);
  if (!t) return null;
  const arr = (await env.KV.get("LEARNED", "json")) || [];
  for (const e of arr){ if (e.q && t.indexOf(e.q) !== -1) return e.reply; }
  return null;
}

async function onMessage(msg, env){
  const chatId = msg.chat.id;
  const fromId = String(msg.from.id);
  const text = msg.text || "";

  // ---- Admin ----
  if (fromId === String(ADMIN_CHAT_ID)){
    if (text === "/version"){
      await tg("sendMessage", {chat_id: ADMIN_CHAT_ID, text: "✅ النسخة المنشورة: " + VERSION + " — بنك موسّع + تعلّم 🧠"});
      return;
    }
    if (text === "/kv"){
      if (env && env.KV){
        const arr = (await env.KV.get("LEARNED", "json")) || [];
        await tg("sendMessage", {chat_id: ADMIN_CHAT_ID, text: "✅ الذاكرة (KV) متصلة. عدد الإجابات المتعلّمة: " + arr.length});
      } else {
        await tg("sendMessage", {chat_id: ADMIN_CHAT_ID, text: "❌ الذاكرة (KV) مش متصلة. اربط KV namespace باسم KV من Settings → Bindings واعمل Deploy."});
      }
      return;
    }
    if (text === "/list"){
      if (env && env.KV){
        const arr = (await env.KV.get("LEARNED", "json")) || [];
        if (!arr.length){ await tg("sendMessage", {chat_id: ADMIN_CHAT_ID, text: "📭 لسه مفيش إجابات متعلّمة (العدد = 0)."}); }
        else {
          const lines = arr.slice(-10).map((e, i) => (i + 1) + ". «" + e.q + "» → " + e.reply.slice(0, 40)).join("\n");
          await tg("sendMessage", {chat_id: ADMIN_CHAT_ID, text: "📚 المتعلّم (" + arr.length + "):\n" + lines});
        }
      } else { await tg("sendMessage", {chat_id: ADMIN_CHAT_ID, text: "❌ KV مش متصل."}); }
      return;
    }
    const rt = msg.reply_to_message;
    if (rt && rt.text){
      if (rt.text.indexOf(LEARNMARK) !== -1){
        const m = rt.text.match(/id:\s*(-?\d+)/);
        const qm = rt.text.match(/«([^»]*)»/);
        if (m){
          const cid = m[1];
          const question = qm ? qm[1] : "";
          await tg("sendMessage", {chat_id: Number(cid), text: text});
          let learned = false, count = 0;
          if (env && env.KV && question){
            const arr = (await env.KV.get("LEARNED", "json")) || [];
            arr.push({ q: norm(question), reply: text });
            await env.KV.put("LEARNED", JSON.stringify(arr));
            learned = true; count = arr.length;
          }
          await tg("sendMessage", {chat_id: ADMIN_CHAT_ID, text: learned ? ("✅ اتبعت ردك، واتعلمت الإجابة دي 🧠 (إجمالي المتعلّم: " + count + ")") : "✅ اتبعت ردك للعميل (ملاحظة: مكنتش قادر أحفظها — جرّب من زر 🧠 تاني)."});
        }
      }
      else if (rt.text.indexOf(EDITMARK) !== -1){
        const m = rt.text.match(/id:\s*(-?\d+)/);
        if (m){
          await tg("sendMessage", {chat_id: Number(m[1]), text: text});
          await tg("sendMessage", {chat_id: ADMIN_CHAT_ID, text: "✅ اتبعت ردك للعميل."});
        }
      }
    }
    return;
  }

  // ---- Customer ----
  if (text === "/start"){
    await tg("sendMessage", {chat_id: chatId, text: "أهلاً بيك في Empire English 👑 اكتب سؤالك (مثلاً: الباقات / الأسعار / الفرق / الدفع) وهنرد عليك."});
    return;
  }

  const name = ((msg.from.first_name || "") + " " + (msg.from.last_name || "")).trim() || "عميل";
  let answer = matchStatic(text);
  if (!answer) answer = await matchLearned(text, env);

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
      text: `🚩 سؤال جديد مالوش رد جاهز — من ${name} (id: ${chatId}):\n«${text}»\n\nاضغط الزر، اكتب الرد، وهبعته للعميل وأحفظه للمرة الجاية:`,
      reply_markup: { inline_keyboard: [[ {text: "🧠 رد + تعليم", callback_data: "learn:" + chatId} ]] }
    });
  }
}

async function onCallback(cq, env){
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
  } else if (action === "learn"){
    const ct = cq.message.text || "";
    const qm = ct.match(/«([^»]*)»/);
    const question = qm ? qm[1] : "";
    await tg("sendMessage", {chat_id: ADMIN_CHAT_ID, text: `${LEARNMARK}${custId}) — للسؤال: «${question}»\nاكتب ردك في خانة الـ Reply 👇`, reply_markup: {force_reply: true}});
  }
  await tg("answerCallbackQuery", {callback_query_id: cq.id});
}
