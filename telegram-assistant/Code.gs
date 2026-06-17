/**
 * Empire English — Telegram Inquiry Assistant (Human-in-the-loop)
 * 100% free: Google Apps Script + Telegram Bot API + Gemini API (free tier)
 *
 * Customer messages the bot -> Gemini drafts a reply -> sent to YOU with
 * [✅ Approve] [✏️ Edit]. Nothing reaches the customer without your approval.
 *
 * SETUP: see SETUP.md. After editing code, redeploy: Manage deployments ->
 * Edit (pencil) -> Version: New version -> Deploy (keeps the same /exec URL).
 */

function P(k){ return PropertiesService.getScriptProperties().getProperty(k); }
const TELEGRAM_TOKEN = P('TELEGRAM_TOKEN');
const GEMINI_KEY     = P('GEMINI_KEY');
const ADMIN_CHAT_ID  = P('ADMIN_CHAT_ID');

const KNOWLEDGE = `
انت مساعد خدمة عملاء لـ "Empire English Community" — مجتمع تعليم إنجليزي (مش كورس، ده نظام كامل: مهام يومية + كوميونيتي ٢٤ ساعة + تصحيح بالـ AI + لكنة أمريكية من أول يوم).
ردودك لازم تكون: بالعامية المصرية، قصيرة وواضحة ومحترمة، وتنتهي بسؤال بسيط أو دعوة للاشتراك.

الباقات والأسعار (شهري):
- RECRUIT: 199ج / 19$ — للمبتدئين: النظام اليومي + ملخصات AI + قنوات المستوى + تقييم أسبوعي.
- BUILDER ⭐ (الأكثر اختيارًا): 399ج / 39$ — كل Recruit + تصحيح كلامك وكتابتك بالـ AI + مكتبة أفلام/بودكاست + كل الجلسات الصوتية اليومية (تفاعلية: بتتكلم والجروب بيسمعك) + امتحانات + خزنة تسجيلات. (جماعي، مش جلسات خاصة)
- EMPIRE: 799ج / 89$ — كل Builder + تصحيح بشري بأولوية + جلستين كوتشينج جماعي/شهر + خطة شهرية + مراجعة فردية + شهادات.
- VIP: 3500ج / 249$ (مقاعد محدودة) — كل Empire + 4 جلسات خاصة 1-on-1/شهر + تصحيح بشري غير محدود 24 ساعة + لاين واتساب مباشر + خطة مخصصة. (أسرع نتيجة باهتمام شخصي)

حقائق مهمة:
- المؤسسون (Founding): سعر ثابت للأبد + شارة Founder + Accent Bootcamp مجاني.
- الدفعة الأولى (Cohort 1) بتبدأ السبت 27 يونيو (توقيت دبي).
- ضمان استرجاع 7 أيام. تقدر تغيّر باقتك أي وقت (ترقية فورية / تنزيل من الشهر اللي بعده).
- الدفع: فودافون كاش/إنستا باي 01004581035 (يوزر إنستا باي: mohamedashry10041) · PayPal: paypal.me/bioroma · الإمارات: تحويل بنكي عند الطلب.
- السعر بيتظبط حسب البلد (مصر بالجنيه، برّه بالدولار).

قواعد مهمة:
- متخترعش أي معلومة مش موجودة فوق. لو مش متأكد، قول إنك هتحوّله للفريق.
- أي موضوع حساس (استرجاع فعلي، شكوى، نزاع، طلب خاص/خصم) — ابدأ ردك بـ [HUMAN] وبعدها رد مهذّب بسيط.
- خلّي الرد مختصر (3-5 أسطر).
`;

function tg(method, payload){
  return UrlFetchApp.fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/' + method, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify(payload), muteHttpExceptions: true
  });
}

// Browser visit shows this (confirms the app is live)
function doGet(){
  return ContentService.createTextOutput('Empire English bot is running ✅');
}

function doPost(e){
  try{
    const u = JSON.parse(e.postData.contents);

    // De-duplicate: Telegram retries (because Apps Script returns 302),
    // so ignore any update_id we already handled. Stops the spam loop.
    const id = 'u_' + u.update_id;
    const cache = CacheService.getScriptCache();
    if (cache.get(id)) return ContentService.createTextOutput('dup');
    cache.put(id, '1', 21600); // remember for 6h

    if (u.callback_query) handleCallback(u.callback_query);
    else if (u.message)   handleMessage(u.message);
  } catch(err){
    if (ADMIN_CHAT_ID) tg('sendMessage', {chat_id: ADMIN_CHAT_ID, text: '⚠️ خطأ: ' + err});
  }
  return ContentService.createTextOutput('ok');
}

function handleMessage(msg){
  const props = PropertiesService.getScriptProperties();
  const chatId = msg.chat.id;
  const fromId = String(msg.from.id);
  const text = msg.text || '';

  // ---- Message from YOU (admin) ----
  if (fromId === String(ADMIN_CHAT_ID)){
    const target = props.getProperty('awaitingEdit');
    if (target){
      tg('sendMessage', {chat_id: Number(target), text: text});
      props.deleteProperty('awaitingEdit');
      tg('sendMessage', {chat_id: ADMIN_CHAT_ID, text: '✅ اتبعت ردك المعدّل للعميل.'});
    }
    // if not editing: do nothing (no spam). The bot only relays customer messages.
    return;
  }

  // ---- Message from a CUSTOMER ----
  if (text === '/start'){
    tg('sendMessage', {chat_id: chatId, text: 'أهلاً بيك في Empire English 👑 اكتب استفسارك أو كلمة EMPIRE وهنرد عليك حالًا.'});
    return;
  }
  const name = ((msg.from.first_name || '') + ' ' + (msg.from.last_name || '')).trim() || 'عميل';
  const draft = generateDraft(text);
  props.setProperty('draft_' + chatId, draft);

  const flagged = draft.indexOf('[HUMAN]') === 0;
  const header = flagged ? '🚩 محتاج مراجعتك — رسالة من ' : '📩 رسالة جديدة من ';
  const cleanDraft = draft.replace('[HUMAN]', '').trim();
  const adminText = header + name + ' (id: ' + chatId + '):\n«' + text + '»\n\n🤖 الرد المقترح:\n' + cleanDraft;

  tg('sendMessage', {
    chat_id: ADMIN_CHAT_ID,
    text: adminText,
    reply_markup: { inline_keyboard: [[
      {text: '✅ موافقة وإرسال', callback_data: 'ok:' + chatId},
      {text: '✏️ تعديل',        callback_data: 'edit:' + chatId}
    ]]}
  });
}

function handleCallback(cq){
  const props = PropertiesService.getScriptProperties();
  const parts = cq.data.split(':');
  const action = parts[0], custId = parts[1];

  if (action === 'ok'){
    const draft = props.getProperty('draft_' + custId);
    if (draft){
      tg('sendMessage', {chat_id: Number(custId), text: draft.replace('[HUMAN]','').trim()});
      props.deleteProperty('draft_' + custId);
      tg('editMessageText', {chat_id: cq.message.chat.id, message_id: cq.message.message_id, text: cq.message.text + '\n\n✅ تم الإرسال للعميل.'});
    } else {
      tg('answerCallbackQuery', {callback_query_id: cq.id, text: 'الرد اتبعت قبل كده.'});
      return;
    }
  } else if (action === 'edit'){
    props.setProperty('awaitingEdit', custId);
    tg('sendMessage', {chat_id: ADMIN_CHAT_ID, text: '✏️ اكتب ردك المعدّل دلوقتي وهبعته للعميل على طول:'});
  }
  tg('answerCallbackQuery', {callback_query_id: cq.id});
}

function generateDraft(userMsg){
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_KEY;
  const body = { contents: [{ parts: [{ text: KNOWLEDGE + '\n\nرسالة العميل: ' + userMsg + '\n\nاكتب الرد المناسب:' }]}] };
  try{
    const res = UrlFetchApp.fetch(url, {method:'post', contentType:'application/json', payload: JSON.stringify(body), muteHttpExceptions:true});
    const j = JSON.parse(res.getContentText());
    return j.candidates[0].content.parts[0].text.trim();
  } catch(err){
    return '[HUMAN] (تعذّر توليد رد تلقائي — اكتب الرد يدويًا)';
  }
}

function setWebhook(){ Logger.log(tg('setWebhook', {url: ScriptApp.getService().getUrl()}).getContentText()); }
function deleteWebhook(){ Logger.log(tg('deleteWebhook', {drop_pending_updates:true}).getContentText()); }
