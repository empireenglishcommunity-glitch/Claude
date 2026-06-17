/**
 * Empire English — Telegram Auto-Reply (Keyword Answer Bank)  [No AI, 100% free]
 *
 * Customer messages the bot -> the bot detects keywords -> sends the matching
 * ready answer instantly. If no answer matches -> it forwards the message to YOU
 * with a "✏️ Reply" button so you answer manually.
 *
 * Needs only 2 Script Properties: TELEGRAM_TOKEN, ADMIN_CHAT_ID  (no AI key).
 * SETUP: see SETUP.md.
 *
 * ➕ لإضافة سؤال جديد: ضيف عنصر جديد في ANSWERS:  { keys:['كلمة','كلمة تانية'], reply:`الرد` }
 *    رتّب الأسئلة المحددة (باقة معيّنة) فوق العامة (الباقات/الأسعار).
 */

function P(k){ return PropertiesService.getScriptProperties().getProperty(k); }
const TELEGRAM_TOKEN = P('TELEGRAM_TOKEN');
const ADMIN_CHAT_ID  = P('ADMIN_CHAT_ID');

// ====================== بنك الإجابات (عدّل/زوّد براحتك) ======================
const ANSWERS = [
  // --- الاشتراك ---
  { keys:['عايز اشترك','هشترك','ينفع اشترك','اشترك','اشتراك','انضم','join','subscribe','register'],
    reply:`تمام 👑 الاشتراك سهل:
1️⃣ قوللي عايز أنهي باقة (Recruit / Builder / Empire / VIP)
2️⃣ ادفع بالطريقة المناسبة ليك
3️⃣ ابعتلي screenshot وأفعّلك على طول كـ Founder

💳 الدفع:
• فودافون كاش / إنستا باي: 01004581035 (يوزر: mohamedashry10041)
• PayPal (برّه مصر): paypal.me/bioroma
• الإمارات 🇦🇪: تحويل بنكي (اطلبه)

عايز أنهي باقة؟ 👑` },

  // --- الدفع ---
  { keys:['طرق الدفع','ازاي ادفع','ازاى ادفع','الدفع','ادفع','فودافون','انستا','instapay','paypal','باي بال','فيزا','تحويل بنكي','ابعت الفلوس'],
    reply:`💳 طرق الدفع:
• فودافون كاش: 01004581035
• إنستا باي: 01004581035 / mohamedashry10041
• PayPal (برّه مصر): paypal.me/bioroma
• من الإمارات 🇦🇪: ابعتلي وأديك تفاصيل التحويل البنكي

بعد الدفع ابعتلي screenshot وأفعّلك فورًا 👑` },

  // --- باقات محددة ---
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
• 4 جلسات خاصة 1-on-1 / شهر (إنت بس مع المدرب)
• تصحيح بشري غير محدود خلال 24 ساعة
• لاين مباشر على واتساب • خطة مخصصة لهدفك
«كأن معاك مدرب خاص يمشي معاك خطوة بخطوة» 👑` },

  // --- أسئلة متكررة ---
  { keys:['تسجيل','تسجيلات','مسجل','مسجله','فيديو','فيديوهات','اعيد','ارجعله','recording'],
    reply:`أيوه 🎥 كل الجلسات الحية والكوتشينج بتتسجّل في «خزنة التسجيلات» وترجعلها أي وقت طول ما اشتراكك شغّال، وبتحتفظ بكل الملخصات والـ cheat sheets للأبد (من باقة Builder وفوق) 👑` },

  { keys:['مواعيد','ميعاد','الجلسات امتى','امتى الجلسات','الوقت','الساعه','schedule','بتبدا','بتبدأ امتى'],
    reply:`الجلسات الصوتية يومية وفيها أكتر من ميعاد عشان تناسب الجميع 🎤 (وكلها بتتسجّل لو فاتك حاجة). الجدول الكامل بالمواعيد بيوصلك أول ما تدخل، ودفعتنا الأولى بتبدأ السبت 27 يونيو 👑` },

  { keys:['اغير الباقه','تغيير الباقه','اغيّر','ارقي','ترقيه','انزل باقه','upgrade','downgrade'],
    reply:`عادي خالص 👍 تقدر ترقّي باقتك أي وقت (فورًا)، أو تغيّر/تنزّل من الشهر اللي بعده — مفيش تقييد. وسعر التأسيس بيفضل ثابت ليك طول ما اشتراكك شغّال 👑` },

  { keys:['مبتدئ','مبتدي','ضعيف','من الصفر','لسه بادئ','مستواي','صفر','beginner'],
    reply:`متقلقش خالص 🌟 بنبدأ من Level 0 — الصفر تمامًا. النظام معمول للمبتدئين بالظبط، خطوة بخطوة، وأول ما تدخل بتعمل اختبار تحديد مستوى يحطك في المكان الصح 👑` },

  { keys:['ضمان','استرجاع','مجاني','تجربه','تجربة','فري','free','trial','refund','مخاطره'],
    reply:`فيه ضمان استرجاع فلوس خلال 7 أيام 🛡️ يعني صفر مخاطرة — تجرّب النظام، ولو مش لقيته مناسب ترجعلك فلوسك. 👑` },

  { keys:['مقعد','مقاعد','اماكن','كام مكان','باقي كام','متاح'],
    reply:`إحنا في مرحلة المؤسسين (Founding) — مقاعد محدودة بسعر ثابت للأبد + شارة Founder + Accent Bootcamp مجاني. اللي يلحق دلوقتي يثبّت سعره للأبد 👑` },

  { keys:['الكوميونيتي','المجتمع','مجتمع','community','ديسكورد','discord','جروب'],
    reply:`الكوميونيتي شغّال 24 ساعة 🏛️ فيه جلسات صوتية حية، تدريب مع أعضاء في مستواك، ومتابعة والتزام يومي — ده اللي بيفرق وبيخليك تتكلم فعلاً 👑` },

  { keys:['شهاده','شهادة','certificate','معتمد'],
    reply:`أيوه 🏅 فيه شهادات Mastery (Silver / Gold / Platinum) في باقتي Empire و VIP بتثبت مستواك بعد التقييم 👑` },

  { keys:['قد ايه','مده','مدة','كام شهر','هتعلم في','نتيجه','اتقن','اطلع'],
    reply:`المدة بتعتمد على مستواك ومجهودك، بس النظام مصمّم يوصّلك بأسرع طريق ممكن عن طريق التنفيذ اليومي + المتابعة 🎯 وكل ما تلتزم أكتر، توصل أسرع. عايز أرشّحلك تبدأ منين؟ 👑` },

  // --- عام: الباقات والأسعار (لازم بعد الباقات المحددة) ---
  { keys:['الباقات','باقات','باقه','باقة','الاسعار','اسعار','السعر','بكام','كام','الخطط','plans','price','packages','الباقا'],
    reply:`باقاتنا (شهري) 👑 — والسعر بيتظبط حسب بلدك:
🥉 RECRUIT — 199ج / 19$ → البداية الصح
🥈 BUILDER ⭐ — 399ج / 39$ → الأكثر اختيارًا (تتكلم فعلاً)
🥇 EMPIRE — 799ج / 89$ → أسرع + اهتمام شخصي
👑 VIP — 3,500ج / 249$ → مدرّب خاص (مقاعد محدودة)

🛡️ ضمان 7 أيام · سعر تأسيس ثابت للأبد.
محتار؟ قوللي مستواك وهدفك وأرشّحلك 👑` },

  // --- شكر ---
  { keys:['شكرا','متشكر','تسلم','thanks','thank you'],
    reply:`العفو يا فندم 🌟 أي وقت. ولو حابب تبدأ، قوللي وأنا أرتبلك كل حاجة 👑` },

  // --- تحية (آخر حاجة) ---
  { keys:['السلام','سلام','اهلا','أهلا','هاي','هلا','مرحبا','صباح','مساء','hello','hi'],
    reply:`أهلاً بيك في Empire English 👑
إحنا نظام كامل بيخليك تتكلم إنجليزي بطلاقة — مهام يومية + كوميونيتي 24 ساعة + لكنة أمريكية.
تحب تعرف الباقات والأسعار؟ اكتب «الباقات» 👇` },
];
// ====================================================================

function tg(method, payload){
  return UrlFetchApp.fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/' + method, {
    method:'post', contentType:'application/json', payload:JSON.stringify(payload), muteHttpExceptions:true
  });
}

function doGet(){ return ContentService.createTextOutput('Empire English bot is running ✅'); }

function doPost(e){
  try{
    const u = JSON.parse(e.postData.contents);
    const id = 'u_' + u.update_id;
    const cache = CacheService.getScriptCache();
    if (cache.get(id)) return ContentService.createTextOutput('dup');
    cache.put(id, '1', 21600);
    if (u.callback_query) handleCallback(u.callback_query);
    else if (u.message)   handleMessage(u.message);
  } catch(err){
    if (ADMIN_CHAT_ID) tg('sendMessage', {chat_id: ADMIN_CHAT_ID, text:'⚠️ خطأ: ' + err});
  }
  return ContentService.createTextOutput('ok');
}

// Normalize Arabic/English for reliable keyword matching
function norm(s){
  return (s || '').toString().toLowerCase()
    .replace(/[\u064B-\u0652\u0670]/g,'')  // tashkeel
    .replace(/\u0640/g,'')                 // tatweel
    .replace(/[أإآ]/g,'ا')
    .replace(/ى/g,'ي')
    .replace(/ة/g,'ه')
    .replace(/\s+/g,' ')
    .trim();
}

function matchAnswer(text){
  const t = norm(text);
  if (!t) return null;
  for (let i = 0; i < ANSWERS.length; i++){
    const keys = ANSWERS[i].keys;
    for (let k = 0; k < keys.length; k++){
      if (t.indexOf(norm(keys[k])) !== -1) return ANSWERS[i].reply;
    }
  }
  return null;
}

function handleMessage(msg){
  const props = PropertiesService.getScriptProperties();
  const chatId = msg.chat.id;
  const fromId = String(msg.from.id);
  const text = msg.text || '';

  // ---- Admin messages ----
  if (fromId === String(ADMIN_CHAT_ID)){
    const target = props.getProperty('awaitingEdit');
    if (target){
      tg('sendMessage', {chat_id: Number(target), text: text});
      props.deleteProperty('awaitingEdit');
      tg('sendMessage', {chat_id: ADMIN_CHAT_ID, text:'✅ اتبعت ردك للعميل.'});
    }
    return; // otherwise ignore (no spam)
  }

  // ---- Customer messages ----
  if (text === '/start'){
    tg('sendMessage', {chat_id: chatId, text:'أهلاً بيك في Empire English 👑 اكتب سؤالك (مثلاً: الباقات / الأسعار / الدفع) وهنرد عليك فورًا.'});
    return;
  }

  const name = ((msg.from.first_name || '') + ' ' + (msg.from.last_name || '')).trim() || 'عميل';
  const answer = matchAnswer(text);

  if (answer){
    // Auto-send the ready answer + notify admin
    tg('sendMessage', {chat_id: chatId, text: answer});
    tg('sendMessage', {chat_id: ADMIN_CHAT_ID, text:'✅ رد تلقائي اتبعت لـ ' + name + ' (id: ' + chatId + ')\nسؤاله: «' + text + '»'});
  } else {
    // Unknown -> forward to you to answer manually
    tg('sendMessage', {chat_id: chatId, text:'وصلتنا رسالتك 🌟 وهنرد عليك حالًا 👌'});
    tg('sendMessage', {
      chat_id: ADMIN_CHAT_ID,
      text:'🚩 سؤال جديد مالوش رد جاهز — من ' + name + ' (id: ' + chatId + '):\n«' + text + '»\n\nاضغط الزر وردّ بنفسك (وفكّر تضيفه لبنك الإجابات):',
      reply_markup:{ inline_keyboard:[[ {text:'✏️ رد على العميل', callback_data:'edit:' + chatId} ]] }
    });
  }
}

function handleCallback(cq){
  const props = PropertiesService.getScriptProperties();
  const parts = cq.data.split(':');
  if (parts[0] === 'edit'){
    props.setProperty('awaitingEdit', parts[1]);
    tg('sendMessage', {chat_id: ADMIN_CHAT_ID, text:'✏️ اكتب ردك دلوقتي وهبعته للعميل على طول:'});
  }
  tg('answerCallbackQuery', {callback_query_id: cq.id});
}

function setWebhook(){ Logger.log(tg('setWebhook', {url: ScriptApp.getService().getUrl()}).getContentText()); }
function deleteWebhook(){ Logger.log(tg('deleteWebhook', {drop_pending_updates:true}).getContentText()); }
