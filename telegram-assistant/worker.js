/**
 * Empire English — Smart Sales Bot on CLOUDFLARE WORKERS  (v8)
 * Keyword Answer Bank + Approval + Auto-Learn + Customer Memory + Daily Reminders
 * + Invoice capture + Subscribe confirm + Feedback.   [No AI, 100% free]
 *
 * Needs: fill TELEGRAM_TOKEN + ADMIN_CHAT_ID, bind a KV namespace named "KV",
 *        and add a Cron Trigger (e.g. "0 16 * * *") for daily reminders.
 * Admin commands: /version /kv /list /stats
 */

// ======= عدّل دول بس =======
const TELEGRAM_TOKEN = "ضع_توكن_البوت_هنا";
const ADMIN_CHAT_ID  = "ضع_رقمك_من_userinfobot_هنا";
// ===========================

const VERSION   = "v9";
const MARK      = "🤖 الرد المقترح (راجعه قبل الإرسال):\n";
const EDITMARK  = "✏️ اكتب ردك للعميل (id: ";
const LEARNMARK = "🧠 اكتب الرد وهحفظه للمرة الجاية (id: ";

const WELCOME = `مبروك يا Founder 🎉👑 أهلاً بيك في الإمبراطورية!

الخطوات دلوقتي:
1️⃣ هبعتلك لينك الكوميونيتي + شارة Founder
2️⃣ ابدأ اختبار تحديد المستوى عشان نحطك في الصح
3️⃣ دفعتك الأولى بتبدأ السبت ٢٧ يونيو 🚀

مبسوطين جدًا إنك معانا — وهتشوف الفرق بنفسك 💪`;

const FEEDBACK = `إزاي تجربتك معانا لحد دلوقتي؟ 🌟
رأيك بيهمنا جدًا — ابعتلنا كلمتين أو أي اقتراح، وشكرًا إنك جزء من الإمبراطورية 👑`;

// ====================== بنك الإجابات (تسويقي + منسّق) ======================
const ANSWERS = [
  { keys:['عايز اشترك','هشترك','ينفع اشترك','اشترك','اشتراك','انضم','عايز ادخل','ازاي ابدا','ابدا ازاي','join','subscribe','register'],
    reply:`قرار موفّق يا بطل 👑🔥 يلا نكمّلها في دقيقة:
1️⃣ قوللي عايز أنهي باقة (Recruit / Builder / Empire / VIP)
2️⃣ ادفع بالطريقة اللي تناسبك
3️⃣ ابعتلي صورة الإيصال 📸 وأفعّلك كـ Founder على طول

💳 الدفع جوه وبرّه مصر متاح كله — اكتب «الدفع» تشوف الطرق.
محتار في الباقة؟ قوللي مستواك وهدفك وأرشّحلك الأنسب 🎯` },

  { keys:['طرق الدفع','ازاي ادفع','ازاى ادفع','الدفع','ادفع','فودافون','انستا','instapay','paypal','باي بال','فيزا','تحويل','الحساب','wise','دفع'],
    reply:`💳 طرق الدفع — كلها متاحة:

🇪🇬 جوه مصر:
• فودافون كاش: 01004581035
• إنستا باي: 01004581035 (أو اليوزر: mohamedashry10041)
• تحويل بنكي / محفظة → كلّمني

🌍 برّه مصر:
• PayPal: paypal.me/bioroma
• تحويل دولي / Wise → كلّمني
• 🇦🇪 الإمارات: تحويل بنكي محلي (اطلب التفاصيل)

📸 بعد الدفع، ابعتلي صورة الإيصال هنا على طول وأفعّلك كـ Founder فورًا 👑` },

  { keys:['الفرق','فرق','مقارنه','مقارنة','قارن','الفرق بين','ايه الفرق','انهي احسن','انهي افضل','ايهم احسن','ايهم افضل','محتار','مش عارف اختار','انهي باقه','اختار ايه','تنصحني','يناسبني','vs','ولا'],
    reply:`خليني أساعدك تختار صح 🎯👇

• بتبدأ وميزانيتك محدودة → RECRUIT 🥉
• عايز تتكلم بثقة فعلاً (ترشيحي ليك 🔥) → BUILDER ⭐
• عندك هدف/ديدلاين وعايز نتيجة أسرع → EMPIRE 🥇
• عايز اهتمام شخصي كامل وأسرع تحوّل → VIP 👑

أغلب أعضائنا بيبدأوا بـ Builder وبيكونوا مبسوطين جدًا 😍 وتقدر ترقّي أي وقت.
قوللي مستواك وهدفك وأقولك الأنسب ليك بالظبط 👑` },

  { keys:['recruit','ريكروت','الباقه الاولى','الباقة الاولى','الاولانيه'],
    reply:`RECRUIT 🥉 — البداية الصح (199ج / 19$ شهري)

لمين؟ للمبتدئين اللي عايزين يبدأوا بنظام منظّم وبأقل تكلفة.
بتاخد:
✅ نظامك اليومي الكامل (نطق + كلمات + استماع + تكلّم)
✅ ملخصات أسبوعية بالـ AI
✅ قنوات مستواك (نصية وصوتية) + تقييم أسبوعي

💡 ولو عايز «تتكلم» فعلاً أسرع، Builder ⭐ بتضيفلك تصحيح كلامك + كل الجلسات اليومية — فرق كبير بجنيهات بسيطة 🔥
تحب أحجزلك Recruit ولا أرشّحلك Builder؟ 👑` },

  { keys:['builder','بيلدر','الباقه التانيه','الباقة التانية','التانيه','التانية'],
    reply:`BUILDER ⭐ — التطوّر الحقيقي (399ج / 39$ شهري) — الأكثر اختيارًا 🔥

لمين؟ للجاد اللي عايز «يتكلم» فعلاً مش بس يذاكر.
كل مميزات Recruit + :
✅ تصحيح كلامك وكتابتك بالـ AI (أهم ميزة)
✅ مكتبة أفلام وبودكاست كاملة
✅ كل الجلسات الصوتية اليومية (بتتكلم والجروب بيسمعك)
✅ Buddy + امتحانات الترقّي + خزنة تسجيلات

🎯 ولو عندك هدف قريب، Empire بتديك كوتشينج وخطة شخصية لنتيجة أسرع.
تحب أحجزلك Builder دلوقتي بسعر التأسيس الثابت؟ 👑` },

  { keys:['empire','امباير','إمباير','الباقه التالته','التالته','الثالثة'],
    reply:`EMPIRE 🥇 — أسرع واهتمام شخصي (799ج / 89$ شهري)

لمين؟ للطموح اللي عنده هدف وعايز لمسة بشرية ونتيجة أسرع.
كل مميزات Builder + :
✅ تصحيح بشري بأولوية
✅ جلستين كوتشينج جماعي / شهر + خطة شهرية شخصية
✅ مراجعة فردية + شهادات Mastery + شارة Empire

👑 وللي عايز أقصى سرعة واهتمام كامل، VIP فيها ٤ جلسات خاصة معايا شهريًا.
تحب أحجزلك Empire قبل ما المقاعد تخلص؟ ⏳👑` },

  { keys:['vip','في اي بي','خاص','لوحدي','مدرس خاص','جلسات خاصه','جلسه خاصه','الدائره','one on one','1 on 1'],
    reply:`VIP 👑 — الدائرة الخاصة / مدرّبك الشخصي (3,500ج / 249$ شهري · مقاعد محدودة جدًا)

لمين؟ للي عايز تحوّل سريع واهتمام ١٠٠٪ وعنده هدف واضح.
كل مميزات Empire + :
✅ ٤ جلسات خاصة 1-on-1 / شهر (إنت بس مع المدرب)
✅ تصحيح بشري غير محدود خلال ٢٤ ساعة
✅ لاين مباشر على واتساب + خطة مخصصة بالكامل
✅ توثيق before/after لتحوّلك

ده أقوى وأسرع طريق للطلاقة 🔥 والمقاعد قليلة جدًا.
تحب أحجزلك مقعد VIP قبل ما يخلص؟ 👑` },

  { keys:['مش فاهم','مش فاهمه','اشرحلي','اشرح','وضحلي','يعني ايه','اشرحلي اكتر','مش عارف','explain'],
    reply:`ولا يهمك، هوضّحلك ببساطة 🌟

Empire English مش كورس تتفرّج عليه وتنساه — ده «نظام» بيمشي معاك كل يوم:
✅ مهام يومية بسيطة
✅ كوميونيتي بتتكلم فيه إنجليزي مع ناس في مستواك
✅ لكنة أمريكية من أول يوم
✅ متابعة وتصحيح لحد ما توصل

بنبدأ من الصفر ونوصّلك لطلاقة خطوة بخطوة 💪
تحب أوريك الباقات؟ اكتب «الباقات» 👑` },

  { keys:['المستويات','مستويات','كام مستوى','levels','بتشتغلوا ازاي','النظام بيشتغل','المنهج','المحتوى','بتعلموا ازاي'],
    reply:`النظام على ٤ مستويات 🪜
• Level 0: مبتدئ تمامًا (الأصوات + أول كلمات)
• Level 1: محادثات يومية بثقة
• Level 2: مواضيع أصعب + فهم السرعة الطبيعية
• Level 3: طلاقة ولكنة زي الـ native

كل يوم مهام بسيطة + جلسات صوتية + تصحيح 🎯
أول ما تشترك بتعمل اختبار تحديد مستوى يحطك في الصح. تحب تبدأ؟ 👑` },

  { keys:['خصم','عرض','تخفيض','كوبون','اوفر','عروض','discount','offer','promo'],
    reply:`أحسن عرض هو دلوقتي بالظبط 🔥
سعر «التأسيس» ثابت للأبد ومش هيتكرر بعد ما المقاعد تخلص ⏳، وكمان الاشتراك السنوي بيوفّرلك ~٣٥٪ (تدفع ٨ شهور وتاخد ١٢).
تحب أحجزلك سعر التأسيس قبل ما يزيد؟ 👑` },

  { keys:['اقساط','قسط','تقسيط','installment','على مرات'],
    reply:`تقدر تشترك شهر بشهر من غير التزام طويل 👍 ولو حابب توفّر، فيه السنوي بخصم ~٣٥٪. أنهي باقة في بالك وأظبطلك الطريقة؟ 👑` },

  { keys:['شهاده','شهادة','certificate','معتمد','ايلتس','ielts','توفل','toefl','امتحان'],
    reply:`عندنا شهادات Mastery (Silver / Gold / Platinum) في Empire و VIP بتثبت مستواك 🏅
والنظام بيقوّي الكلام والاستماع اللي بيفيدك في أي امتحان زي IELTS/TOEFL — بس إحنا مش جهة الامتحان الرسمي. عايز أرشّحلك باقة تناسب هدفك؟ 👑` },

  { keys:['اونلاين','اون لاين','حضوري','online','offline','مكان','بالعربي','بالانجليزي','عن بعد'],
    reply:`كله أونلاين ١٠٠٪ 🌍 كوميونيتي + جلسات صوتية حية من أي مكان. الشرح مبسّط وبنبدأ من مستواك. تحب تعرف المواعيد؟ 👑` },

  { keys:['سن','عمر','للاطفال','اطفال','للكبار','مناسب لسني','kids','age'],
    reply:`النظام مناسب للمراهقين والكبار (من ١٤ سنة تقريبًا)، ومن أي مستوى حتى الصفر 🌟 عايز أبدأ معاك منين؟ 👑` },

  { keys:['الوقت في اليوم','محتاج قد ايه','ساعات','الالتزام','مشغول','معنديش وقت','قد ايه يوميا'],
    reply:`وقت بسيط ومنتظم يوميًا أهم من ساعات متفرقة ⏳ والنظام مرن، والجلسات بتتسجّل لو فاتك حاجة. تحب تبدأ بأنهي باقة؟ 👑` },

  { keys:['تسجيل','تسجيلات','مسجل','فيديو','فيديوهات','اعيد','ارجعله','recording'],
    reply:`أيوه 🎥 كل الجلسات بتتسجّل في «خزنة التسجيلات» وترجعلها أي وقت طول ما اشتراكك شغّال، وبتحتفظ بالملخصات للأبد (من Builder وفوق) 👑` },

  { keys:['مواعيد','ميعاد','الجلسات امتى','امتى الجلسات','الساعه','schedule','بتبدا','وقت الجلسات'],
    reply:`الجلسات يومية وفيها أكتر من ميعاد عشان تناسب الجميع 🎤 (وكلها بتتسجّل). الجدول الكامل بيوصلك أول ما تدخل، ودفعتنا الأولى بتبدأ السبت ٢٧ يونيو 👑` },

  { keys:['اغير الباقه','تغيير الباقه','اغيّر','ارقي','ترقيه','انزل باقه','upgrade','downgrade'],
    reply:`عادي خالص 👍 ترقّي أي وقت فورًا، أو تغيّر/تنزّل من الشهر اللي بعده — مفيش تقييد، وسعر التأسيس بيفضل ثابت ليك 👑` },

  { keys:['مبتدئ','مبتدي','ضعيف','من الصفر','لسه بادئ','مستواي','صفر','beginner','انجليزيي وحش'],
    reply:`متقلقش خالص 🌟 بنبدأ من Level 0 — الصفر تمامًا، والنظام معمول للمبتدئين بالظبط، وأول ما تدخل تعمل اختبار تحديد مستوى. تحب تبدأ؟ 👑` },

  { keys:['ضمان','استرجاع','مجاني','تجربه','تجربة','فري','free','trial','refund','مخاطره'],
    reply:`فيه ضمان استرجاع فلوس خلال ٧ أيام 🛡️ صفر مخاطرة — تجرّب، ولو مش مناسب ترجعلك فلوسك. يعني مفيش حاجة تخسرها وكل حاجة تكسبها 🔥 تحب تبدأ؟ 👑` },

  { keys:['نصب','مضمون','ثقة','تجربة حد','ريفيو','اراء','تقييمات','reviews','scam','حقيقي'],
    reply:`سؤال مشروع 👍 عشان كده فيه ضمان استرجاع ٧ أيام، وأعضاء حقيقيين بنتايج، وكوميونيتي شغّال ٢٤ ساعة تشوفه بنفسك. ابدأ بالتجربة ومفيش أي مخاطرة 🛡️👑` },

  { keys:['مقعد','مقاعد','اماكن','كام مكان','باقي كام','متاح'],
    reply:`إحنا في مرحلة المؤسسين (Founding) — مقاعد محدودة بسعر ثابت للأبد + شارة Founder + Accent Bootcamp مجاني 🎁 اللي يلحق دلوقتي يثبّت سعره للأبد ⏳ تحب أحجزلك؟ 👑` },

  { keys:['الكوميونيتي','المجتمع','مجتمع','community','ديسكورد','discord','جروب'],
    reply:`الكوميونيتي شغّال ٢٤ ساعة 🏛️ جلسات صوتية حية، تدريب مع أعضاء في مستواك، ومتابعة يومية — ده سر إنك تتكلم فعلاً 🔥 تحب تنضم؟ 👑` },

  { keys:['قد ايه','مده','مدة','كام شهر','هتعلم في','نتيجه','اتقن','اطلع'],
    reply:`المدة حسب مستواك ومجهودك، بس النظام مصمّم يوصّلك بأسرع طريق عن طريق التنفيذ اليومي + المتابعة 🎯 وكل ما تلتزم، توصل أسرع. عايز أرشّحلك تبدأ منين؟ 👑` },

  { keys:['صوتي يطلع','صوتي','مايك','اتكلم','هتكلم','بتكلم في الجروب','الجلسات الصوتيه'],
    reply:`أيوه 🎤 بتفتح المايك وبتتكلم والجروب بيسمعك ويرد عليك — تدريب حقيقي مش استماع بس. الجو داعم والكاميرا اختيارية. ده اللي بيكسر حاجز الخوف 🔥👑` },

  { keys:['اكلم حد','في حد','حد يرد','مساعده','دعم','support','حضرتك مين','انت مين'],
    reply:`إنت بتكلم فريق Empire English مباشرة 🙌 قوللي اللي محتاجه وأنا هساعدك خطوة بخطوة. تحب تعرف الباقات ولا تشترك؟ 👑` },

  { keys:['الباقات','باقات','باقه','باقة','الاسعار','اسعار','السعر','بكام','كام','الخطط','plans','price','packages','الباقا'],
    reply:`دي باقاتك يا بطل 👑 (السعر بيتظبط حسب بلدك):

🥉 RECRUIT — 199ج / 19$ → البداية الصح
🥈 BUILDER ⭐ — 399ج / 39$ → الأكثر اختيارًا 🔥 (أحسن قيمة)
🥇 EMPIRE — 799ج / 89$ → أسرع + اهتمام شخصي
👑 VIP — 3,500ج / 249$ → مدرّب خاص (مقاعد محدودة)

🛡️ ضمان ٧ أيام · ⏳ سعر تأسيس ثابت للأبد.
قوللي مستواك وهدفك وأرشّحلك الباقة المثالية 🎯👑` },

  { keys:['شكرا','متشكر','تسلم','thanks','thank you','جزاك'],
    reply:`العفو يا فندم 🌟 أنا تحت أمرك. ولو حابب تبدأ رحلتك دلوقتي، قوللي وأرتبلك كل حاجة 👑` },

  { keys:['السلام عليكم','السلام','سلام','اهلا','اهلين','هاي','هلا','مرحبا','ازيك','صباح','مساء','hello','hi','hey'],
    reply:`أهلاً بيك في Empire English 👑✨
إحنا مش كورس... إحنا النظام اللي هيخليك تتكلم إنجليزي بثقة 🔥

✅ مهام يومية بسيطة
✅ كوميونيتي بيتكلم معاك ٢٤ ساعة
✅ لكنة أمريكية من أول يوم
✅ تصحيح ومتابعة لحد ما توصل

🎁 ودلوقتي تقدر تبقى Founder بسعر ثابت للأبد (المقاعد محدودة ⏳).
تحب أوريك الباقات وأرشّحلك الأنسب؟ اكتب «الباقات» 👇` },
];
// ====================================================================

export default {
  async fetch(req, env){
    if (req.method !== "POST") return new Response("Empire English bot is running ✅ " + VERSION);
    let u;
    try { u = await req.json(); } catch(e){ return new Response("ok"); }
    try {
      if (u.callback_query) await onCallback(u.callback_query, env);
      else if (u.message)   await onMessage(u.message, env);
    } catch(err){ await tg("sendMessage", {chat_id: ADMIN_CHAT_ID, text: "⚠️ خطأ: " + err}); }
    return new Response("ok");
  },

  // Daily reminders (set a Cron Trigger, e.g. "0 16 * * *")
  async scheduled(event, env, ctx){
    if (!env || !env.KV) return;
    const now = Date.now();
    const list = await env.KV.list({ prefix: "u:" });
    for (const k of list.keys){
      const u = await env.KV.get(k.name, "json");
      if (!u) continue;
      const chatId = k.name.slice(2);
      try {
        if (u.subscribed){
          // ask feedback once, ~2 days after subscribing
          if (!u.feedbackAsked && u.subAt && (now - u.subAt > 2 * 864e5)){
            await tg("sendMessage", {chat_id: Number(chatId), text: FEEDBACK});
            u.feedbackAsked = true; await env.KV.put(k.name, JSON.stringify(u));
          }
          continue;
        }
        if ((u.reminders || 0) >= REMINDERS.length) continue;   // finished the funnel
        if (now - (u.lastReminder || 0) < 20 * 36e5) continue;  // 1/day max
        if (now - (u.lastSeen || 0) < 20 * 36e5) continue;      // only if inactive ~a day
        await tg("sendMessage", {chat_id: Number(chatId), text: reminderText(u)});
        u.reminders = (u.reminders || 0) + 1; u.lastReminder = now;
        await env.KV.put(k.name, JSON.stringify(u));
      } catch(e){ /* skip blocked users */ }
    }
  }
};

// ===== Smart reminder funnel (one per day, in order) =====
const REMINDERS = [
  `🌟 قصة نجاح من الإمبراطورية:\n«بدأت من الصفر وكنت بتجمّد لما أتكلم... بعد أسابيع بقيت أمسك محادثة كاملة بثقة!» — عضو في Builder ⭐\nده مش استثناء، ده النظام 👑 تحب تبدأ قصتك إنت؟ اكتب «الباقات» 🔥`,

  `🤔 لسه محتار تختار؟ خليها بسيطة:\n🥉 Recruit = البداية · 🥈 Builder ⭐ = الأكثر اختيارًا (تتكلم فعلاً) · 🥇 Empire = أسرع + اهتمام · 👑 VIP = مدرّب خاص.\nأغلب الناس بيبدأوا بـ Builder وبيكونوا مبسوطين 😍 قوللي هدفك وأرشّحلك الأنسب 🎯👑`,

  `🛡️ قلقان تجرّب؟ معاك ضمان استرجاع ٧ أيام — صفر مخاطرة تمامًا.\n• مبتدئ؟ بنبدأ من الصفر.\n• مشغول؟ النظام مرن والجلسات بتتسجّل.\n• مش متأكد؟ جرّب وانت مأمّن.\nمفيش حاجة تخسرها وكل حاجة تكسبها 🔥 تحب نبدأ؟ 👑`,

  `🎁 عرض المؤسسين لسه شغّال — بس المقاعد بتقل ⏳\nسعر تأسيس ثابت للأبد + شارة Founder + Accent Bootcamp مجاني.\nبعد ما المقاعد تخلص، الأسعار بتزيد. تحب أحجزلك سعرك دلوقتي؟ 👑`,

  `⏰ آخر فرصة — ده آخر تذكير مني 🙏\nلو جاد إنك تتكلم إنجليزي بثقة، دي لحظتك. سعر التأسيس مش هيتكرر.\nابعتلي «عايز اشترك» وأنا أرتبلك كل حاجة في دقيقة 👑🔥`,
];
function reminderText(u){ return REMINDERS[(u.reminders || 0)] || REMINDERS[REMINDERS.length - 1]; }

async function tg(method, payload){
  return fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`, {
    method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(payload)
  });
}

function norm(s){
  return (s || "").toString().toLowerCase()
    .replace(/[\u064B-\u0652\u0670]/g, "").replace(/\u0640/g, "")
    .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/\s+/g, " ").trim();
}

function matchStatic(text){
  const t = norm(text);
  if (!t) return null;
  for (const item of ANSWERS)
    for (const key of item.keys)
      if (t.indexOf(norm(key)) !== -1) return item.reply;
  return null;
}

async function matchLearned(text, env){
  if (!env || !env.KV) return null;
  const t = norm(text); if (!t) return null;
  const arr = (await env.KV.get("LEARNED", "json")) || [];
  for (const e of arr) if (e.q && t.indexOf(e.q) !== -1) return e.reply;
  return null;
}

function inferStage(text){
  const t = norm(text);
  const intent   = ['اشترك','اشتراك','ادفع','الدفع','فودافون','انستا','paypal','تحويل'];
  const consider = ['الباقات','باقه','سعر','اسعار','بكام','الفرق','محتار','recruit','builder','empire','vip'];
  if (intent.some(k => t.indexOf(norm(k)) !== -1)) return 'intent';
  if (consider.some(k => t.indexOf(norm(k)) !== -1)) return 'considering';
  return 'engaged';
}

async function touch(env, chatId, name, stage){
  if (!env || !env.KV) return;
  const key = "u:" + chatId;
  const u = (await env.KV.get(key, "json")) || {firstSeen: Date.now(), reminders: 0, subscribed: false};
  if (name) u.name = name;
  u.lastSeen = Date.now();
  const rank = {engaged:1, considering:2, intent:3, paid_pending:4};
  if (stage && (!u.stage || (rank[stage]||0) >= (rank[u.stage]||0))) u.stage = stage;
  await env.KV.put(key, JSON.stringify(u));
}

async function onMessage(msg, env){
  const chatId = msg.chat.id;
  const fromId = String(msg.from.id);
  const text = msg.text || "";

  // ---- Admin ----
  if (fromId === String(ADMIN_CHAT_ID)){
    if (text === "/version"){ await tg("sendMessage",{chat_id:ADMIN_CHAT_ID,text:"✅ النسخة المنشورة: "+VERSION+" — بوت مبيعات ذكي 👑"}); return; }
    if (text === "/kv"){
      if (env && env.KV){ const a=(await env.KV.get("LEARNED","json"))||[]; await tg("sendMessage",{chat_id:ADMIN_CHAT_ID,text:"✅ الذاكرة (KV) متصلة. المتعلّم: "+a.length}); }
      else await tg("sendMessage",{chat_id:ADMIN_CHAT_ID,text:"❌ الذاكرة (KV) مش متصلة. اربط KV namespace باسم KV واعمل Deploy."});
      return;
    }
    if (text === "/list"){
      if (env && env.KV){ const a=(await env.KV.get("LEARNED","json"))||[];
        await tg("sendMessage",{chat_id:ADMIN_CHAT_ID,text: a.length? ("📚 المتعلّم ("+a.length+"):\n"+a.slice(-10).map((e,i)=>(i+1)+". «"+e.q+"» → "+e.reply.slice(0,40)).join("\n")) : "📭 لسه مفيش إجابات متعلّمة."});
      } else await tg("sendMessage",{chat_id:ADMIN_CHAT_ID,text:"❌ KV مش متصل."});
      return;
    }
    if (text === "/stats"){
      if (env && env.KV){
        const users = await env.KV.list({prefix:"u:"});
        let subs=0; for (const k of users.keys){ const u=await env.KV.get(k.name,"json"); if(u&&u.subscribed) subs++; }
        const inv=(await env.KV.get("INVOICES","json"))||[];
        await tg("sendMessage",{chat_id:ADMIN_CHAT_ID,text:`📊 إحصائيات:\n👥 عملاء: ${users.keys.length}\n✅ مشتركين: ${subs}\n🧾 إيصالات: ${inv.length}`});
      } else await tg("sendMessage",{chat_id:ADMIN_CHAT_ID,text:"❌ KV مش متصل."});
      return;
    }
    const rt = msg.reply_to_message;
    if (rt && rt.text){
      if (rt.text.indexOf(LEARNMARK) !== -1){
        const m = rt.text.match(/id:\s*(-?\d+)/), qm = rt.text.match(/«([^»]*)»/);
        if (m){
          const cid = m[1], question = qm ? qm[1] : "";
          await tg("sendMessage",{chat_id:Number(cid), text:text});
          let learned=false, count=0;
          if (env && env.KV && question){ const arr=(await env.KV.get("LEARNED","json"))||[]; arr.push({q:norm(question),reply:text}); await env.KV.put("LEARNED",JSON.stringify(arr)); learned=true; count=arr.length; }
          await tg("sendMessage",{chat_id:ADMIN_CHAT_ID, text: learned? ("✅ اتبعت ردك، واتعلمت الإجابة دي 🧠 (إجمالي المتعلّم: "+count+")") : "✅ اتبعت ردك للعميل."});
        }
      } else if (rt.text.indexOf(EDITMARK) !== -1){
        const m = rt.text.match(/id:\s*(-?\d+)/);
        if (m){ await tg("sendMessage",{chat_id:Number(m[1]),text:text}); await tg("sendMessage",{chat_id:ADMIN_CHAT_ID,text:"✅ اتبعت ردك للعميل."}); }
      }
    }
    return;
  }

  const name = ((msg.from.first_name || "") + " " + (msg.from.last_name || "")).trim() || "عميل";

  // ---- Customer sent a payment proof (photo/document) ----
  if (msg.photo || msg.document){
    await tg("forwardMessage", {chat_id: ADMIN_CHAT_ID, from_chat_id: chatId, message_id: msg.message_id});
    await tg("sendMessage", {
      chat_id: ADMIN_CHAT_ID,
      text: `🧾 إثبات دفع من ${name} (id: ${chatId}). راجعه واضغط الزر للتأكيد:`,
      reply_markup: { inline_keyboard: [[ {text: "✅ تأكيد الاشتراك", callback_data: "sub:" + chatId} ]] }
    });
    if (env && env.KV){ const inv=(await env.KV.get("INVOICES","json"))||[]; inv.push({id:String(chatId), name, ts:Date.now()}); await env.KV.put("INVOICES", JSON.stringify(inv)); }
    await touch(env, chatId, name, "paid_pending");
    await tg("sendMessage", {chat_id: chatId, text: "استلمنا الإيصال ✅ بنراجعه ونفعّل اشتراكك حالًا وهنرحّب بيك يا Founder 👑"});
    return;
  }

  // ---- Customer text ----
  if (text === "/start"){
    await touch(env, chatId, name, "engaged");
    await tg("sendMessage", {chat_id: chatId, text: "أهلاً بيك في Empire English 👑 اكتب سؤالك (مثلاً: الباقات / الأسعار / الفرق / الدفع) وهنرد عليك."});
    return;
  }

  await touch(env, chatId, name, inferStage(text));
  let answer = matchStatic(text);
  if (!answer) answer = await matchLearned(text, env);

  if (answer){
    await tg("sendMessage", {
      chat_id: ADMIN_CHAT_ID,
      text: `📩 رسالة من ${name} (id: ${chatId}):\n«${text}»\n\n${MARK}${answer}`,
      reply_markup: { inline_keyboard: [[
        {text:"✅ موافقة وإرسال", callback_data:"ok:"+chatId},
        {text:"✏️ تعديل",        callback_data:"edit:"+chatId}
      ]]}
    });
  } else {
    await tg("sendMessage", {
      chat_id: ADMIN_CHAT_ID,
      text: `🚩 سؤال جديد مالوش رد جاهز — من ${name} (id: ${chatId}):\n«${text}»\n\nاضغط الزر، اكتب الرد، وهبعته للعميل وأحفظه للمرة الجاية:`,
      reply_markup: { inline_keyboard: [[ {text:"🧠 رد + تعليم", callback_data:"learn:"+chatId} ]] }
    });
  }
}

async function onCallback(cq, env){
  const [action, custId] = cq.data.split(":");

  if (action === "ok"){
    const t = cq.message.text || ""; const idx = t.indexOf(MARK);
    const answer = idx !== -1 ? t.slice(idx + MARK.length) : "";
    if (answer){
      await tg("sendMessage", {chat_id: Number(custId), text: answer});
      await tg("editMessageText", {chat_id: cq.message.chat.id, message_id: cq.message.message_id, text: t + "\n\n✅ تم الإرسال للعميل."});
    }
  } else if (action === "edit"){
    await tg("sendMessage", {chat_id: ADMIN_CHAT_ID, text: `${EDITMARK}${custId}):`, reply_markup: {force_reply: true}});
  } else if (action === "learn"){
    const ct = cq.message.text || ""; const qm = ct.match(/«([^»]*)»/); const question = qm ? qm[1] : "";
    await tg("sendMessage", {chat_id: ADMIN_CHAT_ID, text: `${LEARNMARK}${custId}) — للسؤال: «${question}»\nاكتب ردك في خانة الـ Reply 👇`, reply_markup: {force_reply: true}});
  } else if (action === "sub"){
    if (env && env.KV){ const u=(await env.KV.get("u:"+custId,"json"))||{}; u.subscribed=true; u.subAt=Date.now(); u.stage="subscribed"; await env.KV.put("u:"+custId, JSON.stringify(u)); }
    await tg("sendMessage", {chat_id: Number(custId), text: WELCOME});
    await tg("editMessageText", {chat_id: cq.message.chat.id, message_id: cq.message.message_id, text: (cq.message.text||"") + "\n\n✅ تم تأكيد الاشتراك 👑"});
  }
  await tg("answerCallbackQuery", {callback_query_id: cq.id});
}
