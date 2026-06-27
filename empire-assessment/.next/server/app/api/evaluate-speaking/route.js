"use strict";(()=>{var e={};e.id=230,e.ids=[230],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},1028:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>h,patchFetch:()=>m,requestAsyncStorage:()=>u,routeModule:()=>l,serverHooks:()=>d,staticGenerationAsyncStorage:()=>p});var n={};a.r(n),a.d(n,{POST:()=>c});var o=a(9303),s=a(8716),r=a(670);let i=process.env.GEMINI_API_KEY||"";async function c(e){try{let{audioBase64:t,expectedText:a,partType:n,mimeType:o}=await e.json();if(!t||!a)return Response.json({error:"Missing audio or expected text"},{status:400});if(!i)return Response.json({success:!0,scores:{pronunciation:0,fluency:0,coherence:0,overall:0},feedback:"AI evaluation unavailable. Please contact administrator.",fallback:!0});let s=`IMPORTANT: The attached data is an AUDIO RECORDING (speech/voice). 
It is NOT an image. Do NOT describe it visually. Do NOT classify it as a gesture or image.
You must LISTEN to the audio content and evaluate the SPOKEN ENGLISH words.
If you cannot process the audio, respond with all scores as 0 and feedback explaining the issue.

`,r="";r=("read_aloud"===n?s+`You are an expert English pronunciation evaluator for Arabic-speaking students.

TASK: Listen to the attached AUDIO RECORDING of a student reading aloud.

The student was asked to read this text:
"${a}"

Evaluate their SPOKEN PERFORMANCE:
1. PRONUNCIATION (0-100): How correctly they pronounce each English word. Consider: individual phonemes, word stress, vowel quality. Arabic speakers commonly struggle with /p/ vs /b/, /v/ vs /f/, short vs long vowels, /θ/ and /\xf0/.
2. FLUENCY (0-100): How smoothly they speak. Consider: pace, hesitations, stumbles, restarts. 70+ means mostly smooth with minor pauses.
3. COHERENCE (0-100): How much of the text they actually read correctly and completely. Did they skip words? Read wrong words? Cover most of the passage?

SCORING GUIDE:
- Silent/no speech/noise only → all scores 0
- Speaking Arabic or random words → all scores 5-10  
- Attempted but heavy accent/many errors → 20-40
- Decent pronunciation with some errors → 50-70
- Good pronunciation, clear → 75-90
- Near-native → 90-100`:"spontaneous"===n?s+`You are an expert English speaking evaluator for Arabic-speaking students.

TASK: Listen to the attached AUDIO RECORDING of a student responding spontaneously.

The student was asked: "${a}"

Evaluate their SPOKEN RESPONSE:
1. PRONUNCIATION (0-100): Clarity of English pronunciation in their response.
2. FLUENCY (0-100): Smoothness, pace, confidence. Natural pauses OK, long silences reduce score.
3. COHERENCE (0-100): Does response make sense? Relevant to question? In English?

SCORING GUIDE:
- Silent/no speech → all scores 0
- Arabic only, no English → coherence 5, others 0
- Very short (few words) → cap fluency at 40
- Clear attempt with errors → 30-60
- Good response → 60-85
- Excellent natural response → 85-100`:s+`You are an expert English pronunciation evaluator for Arabic-speaking students.

TASK: Listen to the attached AUDIO RECORDING of a student repeating a sentence.

The student was asked to repeat: "${a}"

Evaluate their REPETITION:
1. PRONUNCIATION (0-100): How closely their pronunciation matches correct English.
2. FLUENCY (0-100): Rhythm and flow of their repetition.
3. COHERENCE (0-100): Did they repeat the correct words in the right order?

SCORING GUIDE:
- Silent → all scores 0
- Wrong words entirely → coherence 5-15
- Partial repetition → scores 30-50
- Full correct repetition with accent → 60-80
- Clear accurate repetition → 80-100`)+`

CRITICAL RULES:
- This is a PLACEMENT TEST — inflated scores harm the student. Be honest.
- You are evaluating AUDIO (speech). NOT an image. NOT a video frame.
- If you see/detect no speech in the audio, give all scores 0.
- Arabic L1 interference is expected. Score the actual performance fairly.

Respond ONLY with this exact JSON (no markdown, no extra text):
{"pronunciation": <0-100>, "fluency": <0-100>, "coherence": <0-100>, "overall": <0-100>, "feedback": "<one sentence in Arabic evaluating their performance>"}`;let c=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${i}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:r},{inline_data:{mime_type:"audio/webm",data:t}}]}],generationConfig:{temperature:.1,maxOutputTokens:300,topP:.8}})});if(!c.ok){let e=await c.text();return console.error("Gemini API error:",c.status,e),400===c.status&&console.error("Possible MIME type issue. Received status 400."),Response.json({success:!0,scores:{pronunciation:0,fluency:0,coherence:0,overall:0},feedback:"حدث خطأ في التقييم. سيتم مراجعة تسجيلك يدوياً.",fallback:!0,error:`API ${c.status}`})}let l=await c.json();if(!l.candidates||0===l.candidates.length)return console.error("Gemini returned no candidates:",JSON.stringify(l)),Response.json({success:!0,scores:{pronunciation:0,fluency:0,coherence:0,overall:0},feedback:"لم يتمكن النظام من تقييم التسجيل. حاول مرة أخرى.",fallback:!0});let u=l.candidates[0];if("SAFETY"===u.finishReason||"BLOCKED"===u.finishReason)return console.error("Gemini blocked the response:",u.finishReason),Response.json({success:!0,scores:{pronunciation:0,fluency:0,coherence:0,overall:0},feedback:"تم حظر التقييم. حاول التسجيل مرة أخرى.",fallback:!0});let p=u.content?.parts?.[0]?.text||"",d=p.toLowerCase();if(["image","picture","photo","gesture","visual","shows","depicts","appears to be"].some(e=>d.includes(e)))return console.error("Model misinterpreted audio as image. Response:",p),Response.json({success:!0,scores:{pronunciation:0,fluency:0,coherence:0,overall:0},feedback:"حدث خطأ تقني في تحليل الصوت. سيتم مراجعة تسجيلك يدوياً.",fallback:!0,debug:"model_misinterpreted_as_image"});let h={pronunciation:0,fluency:0,coherence:0,overall:0},m="";try{let e=p.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim(),t=JSON.parse(e);h={pronunciation:Math.max(0,Math.min(100,Math.round(t.pronunciation)||0)),fluency:Math.max(0,Math.min(100,Math.round(t.fluency)||0)),coherence:Math.max(0,Math.min(100,Math.round(t.coherence)||0)),overall:Math.max(0,Math.min(100,Math.round(t.overall)||0))},m=t.feedback||"",0===h.overall&&(h.pronunciation>0||h.fluency>0)&&(h.overall=Math.round((h.pronunciation+h.fluency+h.coherence)/3))}catch(t){console.error("Failed to parse Gemini response:",p);let e=p.match(/\d+/g);if(e&&e.length>=3){let t=Math.min(100,parseInt(e[0])||0),a=Math.min(100,parseInt(e[1])||0),n=Math.min(100,parseInt(e[2])||0);h={pronunciation:t,fluency:a,coherence:n,overall:e[3]?Math.min(100,parseInt(e[3])):Math.round((t+a+n)/3)}}}return Response.json({success:!0,scores:h,feedback:m,fallback:!1})}catch(e){return console.error("Speaking evaluation error:",e),Response.json({success:!0,scores:{pronunciation:0,fluency:0,coherence:0,overall:0},feedback:"حدث خطأ. سيتم تقييمك يدوياً.",fallback:!0})}}let l=new o.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/evaluate-speaking/route",pathname:"/api/evaluate-speaking",filename:"route",bundlePath:"app/api/evaluate-speaking/route"},resolvedPagePath:"/projects/sandbox/Claude/empire-assessment/app/api/evaluate-speaking/route.js",nextConfigOutput:"",userland:n}),{requestAsyncStorage:u,staticGenerationAsyncStorage:p,serverHooks:d}=l,h="/api/evaluate-speaking/route";function m(){return(0,r.patchFetch)({serverHooks:d,staticGenerationAsyncStorage:p})}},9303:(e,t,a)=>{e.exports=a(517)}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),n=t.X(0,[377],()=>a(1028));module.exports=n})();