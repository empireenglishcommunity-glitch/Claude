"use strict";(()=>{var e={};e.id=794,e.ids=[794],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},6592:(e,s,o)=>{o.r(s),o.d(s,{originalPathname:()=>v,patchFetch:()=>f,requestAsyncStorage:()=>m,routeModule:()=>u,serverHooks:()=>d,staticGenerationAsyncStorage:()=>g});var n={};o.r(n),o.d(n,{POST:()=>p});var t=o(9303),r=o(8716),a=o(670);let i=process.env.TELEGRAM_BOT_TOKEN||"",l=process.env.TELEGRAM_ADMIN_CHAT_ID||"";async function c(e){if(!i||!l){console.warn("Telegram notification skipped: missing bot token or chat ID");return}let{scores:s,result:o,userId:n,email:t,timestamp:r}=e,a=o.level,c=o.level_info?.name||"Unknown",p=`
${"L3"===a?"\uD83D\uDC51":"L2"===a?"\uD83D\uDEE1️":"L1"===a?"⚔️":"\uD83D\uDDE1️"} *New Assessment Completed*

👤 *Student:* ${t||"Unknown"}
📅 *Date:* ${new Date(r).toLocaleString("en-GB",{timeZone:"Asia/Dubai"})}

🏅 *Assigned Level:* ${a} — ${c}

📊 *Scores:*
  👂 Listening: ${s.listening}%
  📖 Vocabulary: ${s.vocabulary}%
  ✍️ Grammar: ${s.grammar}%
  🎙️ Speaking: ${s.speaking}%

${o.flag?`⚠️ *FLAGGED:* ${o.flag_reason}`:"✅ No flags — consistent performance"}

🔗 User ID: \`${n||"anonymous"}\`
`;try{await fetch(`https://api.telegram.org/bot${i}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:l,text:p,parse_mode:"Markdown"})})}catch(e){console.error("Telegram notification failed:",e)}}async function p(e){try{let s=await e.json(),{scores:o,result:n,timestamp:t,userId:r,email:a}=s;if(!o||!n)return Response.json({error:"Missing scores or result"},{status:400});return console.log("=== PLACEMENT ASSESSMENT RESULT ==="),console.log(`Student: ${a||"anonymous"}`),console.log(`Timestamp: ${t}`),console.log(`Level: ${n.level} (${n.level_info?.name})`),console.log(`Scores: Listening=${o.listening}% Vocab=${o.vocabulary}% Grammar=${o.grammar}% Speaking=${o.speaking}%`),console.log(`Flagged: ${n.flag?"YES — "+n.flag_reason:"No"}`),console.log("==================================="),c(s).catch(()=>{}),Response.json({success:!0,level:n.level,level_info:n.level_info})}catch(e){return console.error("Assessment save error:",e),Response.json({error:"Server error"},{status:500})}}let u=new t.AppRouteRouteModule({definition:{kind:r.x.APP_ROUTE,page:"/api/assessment/route",pathname:"/api/assessment",filename:"route",bundlePath:"app/api/assessment/route"},resolvedPagePath:"/projects/sandbox/Claude/empire-assessment/app/api/assessment/route.js",nextConfigOutput:"",userland:n}),{requestAsyncStorage:m,staticGenerationAsyncStorage:g,serverHooks:d}=u,v="/api/assessment/route";function f(){return(0,a.patchFetch)({serverHooks:d,staticGenerationAsyncStorage:g})}},9303:(e,s,o)=>{e.exports=o(517)}};var s=require("../../../webpack-runtime.js");s.C(e);var o=e=>s(s.s=e),n=s.X(0,[377],()=>o(6592));module.exports=n})();