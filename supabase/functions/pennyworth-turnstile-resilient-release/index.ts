import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Pennyworth release gate: durable capture first, then route the visitor to the
// requested channel. High-confidence REVIEW stays quarantined from CRM but must
// not trap a real visitor inside the form.
const nativeFetch=globalThis.fetch.bind(globalThis);
const TEMPLATE='/web/clients/pennyworth/worker-edge-template.mjs';
const REVIEW_CONTINUE_SCORE=80;

function patchTemplate(raw:string){
  let x=raw;
  x=x.replaceAll("appearance:'always'","appearance:'interaction-only'").replaceAll('appearance:"always"','appearance:"interaction-only"');

  // Turnstile is a strong signal, not a single point of failure.
  x=x.replace("const turnstileToken=await ensureTurnstileToken();if(!turnstileToken)throw new Error('turnstile_required');const ch=await challenge(id),a=qp();","const turnstileToken=await ensureTurnstileToken(2200);const ch=await challenge(id),a=qp();");
  x=x.replace("show(err?.message==='secure_chat_grant_missing'?'No pudimos iniciar el chat seguro. Intenta nuevamente.':err?.message==='turnstile_required'?'Completa la verificación de seguridad.':'No pudimos validar la solicitud. Intenta nuevamente.',false);","show(err?.message==='secure_chat_grant_missing'?'No pudimos iniciar el chat seguro. Intenta nuevamente.':'No pudimos validar la solicitud. Intenta nuevamente.',false);");
  x=x.replace("if(++attempts<80)setTimeout(render,120);else failTurnstile('No pudimos cargar la verificación de seguridad. Recarga la página.');return;","if(++attempts<80)setTimeout(render,120);else resolveTurnstileWaiters('');return;");
  x=x.replace("if(++attempts<80)setTimeout(render,180);else failTurnstile('No pudimos cargar la verificación de seguridad. Recarga la página.')","if(++attempts<80)setTimeout(render,180);else resolveTurnstileWaiters('')");
  x=x.replace("'expired-callback':()=>{turnstileValue='';show('La verificación expiró. Confirma nuevamente.',false)}","'expired-callback':()=>{turnstileValue='';setTimeout(remountTurnstile,0)}");
  x=x.replace("'error-callback':()=>failTurnstile('No pudimos cargar la verificación de seguridad. Intenta nuevamente.')","'error-callback':()=>{turnstileValue='';resolveTurnstileWaiters('')}");

  const ip=' const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=clean(b.website,300)!=="";';
  const optional=` const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=clean(b.website,300)!="";\n const turnstileToken=clean(b.turnstile_token,2048);let turnstileOk=false,turnstileChecked=false;\n if(turnstileToken){turnstileChecked=true;try{const tr=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:turnstileToken,remoteip:ip})});const td=await tr.json();turnstileOk=td?.success===true&&(!td?.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase())}catch{turnstileOk=false}}`;
  if(x.includes(ip))x=x.replace(ip,optional);
  x=x.replace('let score=25;const reasons=["edge_pow_hmac"];','let score=25;const reasons=["edge_pow_hmac"];if(turnstileChecked&&turnstileOk)reasons.push("cloudflare_turnstile");else if(turnstileChecked)reasons.push("turnstile_failed_review");else reasons.push("turnstile_unavailable")');
  x=x.replace('security:{quality_score:Math.max(0,Math.min(100,score)),turnstile:true,honeypot:honey','security:{quality_score:Math.max(0,Math.min(100,score)),turnstile:turnstileOk,honeypot:honey');

  // Old/open browser tabs may still run an earlier client. Normalize a durable,
  // high-confidence REVIEW to an accepted handoff response while keeping the
  // database/contact quality_status as REVIEW. This makes WhatsApp open immediately
  // instead of showing a red "verificando" box.
  x=x.replace(
    '   return json(d,r.status)\n }',
    `   if(d?.status==="review"&&Number(d?.quality_score||0)>=${REVIEW_CONTINUE_SCORE}){d.capture_status="review";d.review_continue=true;d.status="accepted"}\n   return json(d,r.status)\n }`
  );

  // Grant chat access for accepted leads and high-confidence REVIEW captures.
  x=x.replace('if(d?.status==="accepted"&&channel==="chat"&&d?.attempt_id&&d?.contact_id){',`if((d?.status==="accepted"||(d?.status==="review"&&Number(d?.quality_score||0)>=${REVIEW_CONTINUE_SCORE}))&&channel==="chat"&&d?.attempt_id&&d?.contact_id){`);

  // New clients also understand reviewContinue directly.
  const acceptedGate="if(!(r.ok&&d.status==='accepted')){show(d.message||'No pudimos enviar la solicitud. Intenta nuevamente.',false);return}if(intent==='chat'){";
  const continueGate=`const reviewContinue=r.ok&&(d.status==='accepted'||(d.status==='review'&&Number(d.quality_score||0)>=${REVIEW_CONTINUE_SCORE}));if(!reviewContinue){show(d.message||'No pudimos enviar la solicitud. Intenta nuevamente.',false);return}if(intent==='chat'){`;
  if(x.includes(acceptedGate))x=x.replace(acceptedGate,continueGate);

  // CHAT must leave the form/modal and go to a dedicated CloudSales IA Chat page.
  const embeddedStart="async function startChat(grant,interest,delivery){const first='Interés: '+interest+(delivery?'\\nFecha de entrega: '+delivery:''),d=await chatApi({action:'chat.start',hostname:HOST,chat_grant:grant,message:first});chatSession=d.session_token;chatAfter=new Date().toISOString();addBubble('inbound',first);host.style.display='none';chatBox.classList.add('active');schedulePoll(1000)}";
  const routedStart="async function startChat(grant,interest,delivery){const first='Interés: '+interest+(delivery?'\\nFecha de entrega: '+delivery:''),d=await chatApi({action:'chat.start',hostname:HOST,chat_grant:grant,message:first});if(!d?.session_token)throw new Error('chat_session_missing');location.assign('/ia-chat#session='+encodeURIComponent(d.session_token))}";
  if(x.includes(embeddedStart))x=x.replace(embeddedStart,routedStart);

  // Dedicated, full-page CloudSales IA Chat. Session token remains in the URL fragment
  // and is removed from browser history immediately after boot.
  const marker='export default{async fetch(req,env){';
  if(x.includes(marker)&&!x.includes('const IA_CHAT_PAGE=String.raw`')){
    const page=`const IA_CHAT_PAGE=String.raw\`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>CloudSales IA Chat · PENNYWORTH</title><meta name="robots" content="noindex,nofollow"><style>html,body{margin:0;min-height:100%;background:#08090d;color:#f4f5f7;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}*{box-sizing:border-box}.app{min-height:100dvh;display:grid;grid-template-rows:auto 1fr auto;background:radial-gradient(circle at 50% -20%,#2d0a4a55,transparent 38%),#08090d}.head{padding:16px 18px;border-bottom:1px solid #292633;background:#0d0e14;display:flex;align-items:center;justify-content:space-between;gap:12px}.brand b{display:block;font-size:18px}.brand span{display:block;color:#a9a8b1;font-size:12px;margin-top:2px}.back{border:1px solid #393641;background:#17151e;color:#fff;border-radius:999px;padding:9px 13px;font-weight:700;text-decoration:none}.msgs{padding:18px;overflow:auto;display:flex;flex-direction:column;gap:10px}.bubble{max-width:min(82%,620px);padding:12px 14px;border-radius:16px;line-height:1.45;font-size:15px;white-space:pre-wrap;word-break:break-word}.in{align-self:flex-end;background:#5f50ff}.out{align-self:flex-start;background:#17191f;border:1px solid #2e3038}.welcome{margin:auto;text-align:center;color:#a5a4ad;max-width:420px;line-height:1.55}.composer{padding:12px max(12px,env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));border-top:1px solid #292633;background:#0d0e14;display:grid;grid-template-columns:1fr auto;gap:8px}.composer textarea{min-height:48px;max-height:140px;resize:none;border:1px solid #34313d;background:#12131a;color:#fff;border-radius:14px;padding:12px;font:inherit;font-size:16px}.composer button{border:0;border-radius:14px;background:#f955b6;color:#130711;font-weight:900;padding:0 18px;min-width:86px}.composer button:disabled{opacity:.5}.status{padding:8px 18px;color:#a5a4ad;font-size:12px;display:none}.status.show{display:block}</style></head><body><main class="app"><header class="head"><div class="brand"><b>CloudSales IA Chat</b><span>PENNYWORTH · conversación segura</span></div><a class="back" href="/">Volver</a></header><section id="msgs" class="msgs"><div class="welcome">Tu solicitud ya fue recibida. Continúa aquí con el IA Chat de CloudSales.</div></section><div><div id="status" class="status"></div><form id="composer" class="composer"><textarea id="text" rows="2" maxlength="3000" placeholder="Escribe tu mensaje…" aria-label="Mensaje"></textarea><button id="send" type="submit">Enviar</button></form></div></main><script>(()=>{'use strict';const API='${PUBLIC_DATA}',HOST=location.hostname.toLowerCase(),hash=new URLSearchParams(location.hash.slice(1)),session=hash.get('session')||'';history.replaceState(null,'',location.pathname);const msgs=document.getElementById('msgs'),form=document.getElementById('composer'),text=document.getElementById('text'),send=document.getElementById('send'),status=document.getElementById('status');let after='',poller=null,busy=false;function bubble(dir,body){const e=document.createElement('div');e.className='bubble '+(dir==='inbound'?'in':'out');e.textContent=body||'';msgs.appendChild(e);msgs.scrollTop=msgs.scrollHeight}function setStatus(v){status.textContent=v||'';status.className='status'+(v?' show':'')}async function api(body){const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'chat_unavailable');return d}async function poll(){if(!session||busy)return;busy=true;try{const d=await api({action:'chat.poll',session_token:session,after:after||undefined});for(const m of d.messages||[]){bubble(m.direction,m.body||'');if(m.occurred_at)after=m.occurred_at}setStatus('')}catch{setStatus('Reconectando…')}finally{busy=false;clearTimeout(poller);poller=setTimeout(poll,3500)}}form.addEventListener('submit',async e=>{e.preventDefault();const message=text.value.trim();if(!message||!session)return;send.disabled=true;try{await api({action:'chat.send',session_token:session,message});bubble('inbound',message);text.value='';after=new Date().toISOString();await poll()}catch{setStatus('No pudimos enviar el mensaje. Intenta nuevamente.')}finally{send.disabled=false;text.focus()}});if(!session){setStatus('La sesión segura no está disponible. Vuelve al sitio e inicia el chat nuevamente.');send.disabled=true;text.disabled=true}else{poll();text.focus()}})();<\/script></body></html>\`;\n`;
    x=x.replace(marker,page+marker);
  }

  // Route /ia-chat before the generic GET page route and prevent caching stale JS.
  const routeMarker=' const u=new URL(req.url);\n if(req.method==="GET"&&u.pathname==="/robots.txt")';
  const routePatch=' const u=new URL(req.url);\n if(req.method==="GET"&&u.pathname==="/ia-chat")return new Response(IA_CHAT_PAGE,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-frame-options":"DENY","x-content-type-options":"nosniff","referrer-policy":"no-referrer"}});\n if(req.method==="GET"&&u.pathname==="/robots.txt")';
  if(x.includes(routeMarker))x=x.replace(routeMarker,routePatch);
  x=x.replace('"content-type":"text/html; charset=utf-8","cache-control":"public,max-age=120"','"content-type":"text/html; charset=utf-8","cache-control":"no-store"');

  // Pennyworth is isolated from LISTIA labels/routing.
  x=x.replaceAll('listia_subscriber_pool','pennyworth_internal');
  x=x.replaceAll('listia-subscriber-distribution','pennyworth-internal');
  return x;
}

function assertContract(x:string){
  const checks={
    intake:x.includes('/functions/v1/lead-intake'),
    no_turnstile_required:!x.includes('turnstile_required'),
    no_appearance_always:!/(?:appearance\s*:\s*['"]always['"]|data-appearance=["']always["'])/i.test(x),
    turnstile_signal:/turnstile:\s*turnstileOk/.test(x),
    review_normalized:x.includes('d.capture_status="review"')&&x.includes('d.status="accepted"'),
    review_grant:x.includes('d?.status==="review"'),
    chat_route:x.includes('u.pathname==="/ia-chat"')&&x.includes('CloudSales IA Chat'),
    chat_redirect:x.includes("location.assign('/ia-chat#session='"),
    whatsapp_redirect:x.includes("location.href='https://api.whatsapp.com/send?phone='"),
    no_listia:!x.includes('listia_subscriber_pool')&&!x.includes('listia-subscriber-distribution')
  };
  const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);if(failed.length)throw new Error('pennyworth_worker_form_contract_failed_'+failed.join(','));
}

globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;const res=await nativeFetch(input as any,init);if(!res.ok||!url.includes(TEMPLATE))return res;const text=patchTemplate(await res.text());assertContract(text);const headers=new Headers(res.headers);headers.delete('content-length');return new Response(text,{status:res.status,statusText:res.statusText,headers})}) as typeof fetch;
await import("https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/9c6821efe75e2a3b7e22754778b647015c1ba734/supabase/functions/pennyworth-provision/index.ts");
