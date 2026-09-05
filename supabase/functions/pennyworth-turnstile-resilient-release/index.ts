import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Pennyworth form resilience + release gate.
// Security-provider uncertainty must never erase plausible human commercial intent.
// Turnstile remains a strong signal when available; shared lead-intake owns
// ACCEPT / REVIEW / REJECT and REVIEW is a durable successful capture.
const nativeFetch = globalThis.fetch.bind(globalThis);
const TEMPLATE = '/web/clients/pennyworth/worker-edge-template.mjs';

function patchTemplate(raw:string){
  let x=raw;
  x=x.replaceAll("appearance:'always'","appearance:'interaction-only'")
     .replaceAll('appearance:"always"','appearance:"interaction-only"');

  // Do not hard-block a plausible human merely because Turnstile is slow/unavailable.
  x=x.replace(
    "const turnstileToken=await ensureTurnstileToken();if(!turnstileToken)throw new Error('turnstile_required');const ch=await challenge(id),a=qp();",
    "const turnstileToken=await ensureTurnstileToken(2200);const ch=await challenge(id),a=qp();"
  );
  x=x.replace(
    "show(err?.message==='secure_chat_grant_missing'?'No pudimos iniciar el chat seguro. Intenta nuevamente.':err?.message==='turnstile_required'?'Completa la verificación de seguridad.':'No pudimos validar la solicitud. Intenta nuevamente.',false);",
    "show(err?.message==='secure_chat_grant_missing'?'No pudimos iniciar el chat seguro. Intenta nuevamente.':'No pudimos validar la solicitud. Intenta nuevamente.',false);"
  );
  x=x.replace(
    "if(++attempts<80)setTimeout(render,120);else failTurnstile('No pudimos cargar la verificación de seguridad. Recarga la página.');return;",
    "if(++attempts<80)setTimeout(render,120);else resolveTurnstileWaiters('');return;"
  );
  x=x.replace(
    "if(++attempts<80)setTimeout(render,180);else failTurnstile('No pudimos cargar la verificación de seguridad. Recarga la página.')",
    "if(++attempts<80)setTimeout(render,180);else resolveTurnstileWaiters('')"
  );

  // Verify Turnstile server-side when a token exists; otherwise pass uncertainty
  // to lead-intake instead of returning 422 before durable capture.
  const ip=' const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=clean(b.website,300)!=="";';
  const optional=` const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=clean(b.website,300)!="";\n const turnstileToken=clean(b.turnstile_token,2048);let turnstileOk=false,turnstileChecked=false;\n if(turnstileToken){turnstileChecked=true;try{const tr=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:turnstileToken,remoteip:ip})});const td=await tr.json();turnstileOk=td?.success===true&&(!td?.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase())}catch{turnstileOk=false}}`;
  if(x.includes(ip)) x=x.replace(ip,optional);

  x=x.replace(
    'let score=25;const reasons=["edge_pow_hmac"];',
    'let score=25;const reasons=["edge_pow_hmac"];if(turnstileChecked&&turnstileOk)reasons.push("cloudflare_turnstile");else if(turnstileChecked)reasons.push("turnstile_review");else reasons.push("turnstile_unavailable")'
  );
  x=x.replace(
    'security:{quality_score:Math.max(0,Math.min(100,score)),turnstile:true,honeypot:honey',
    'security:{quality_score:Math.max(0,Math.min(100,score)),turnstile:turnstileOk,honeypot:honey'
  );

  x=x.replace(
    "'expired-callback':()=>{turnstileValue='';show('La verificación expiró. Confirma nuevamente.',false)}",
    "'expired-callback':()=>{turnstileValue='';setTimeout(remountTurnstile,0)}"
  );
  x=x.replace(
    "'error-callback':()=>failTurnstile('No pudimos cargar la verificación de seguridad. Intenta nuevamente.')",
    "'error-callback':()=>{turnstileValue='';resolveTurnstileWaiters('')}"
  );

  // REVIEW is a successful, durable capture. Do not open chat/WhatsApp or launch
  // downstream sales automation until the lead is promoted to ACCEPTED.
  const acceptedGate="if(!(r.ok&&d.status==='accepted')){show(d.message||'No pudimos enviar la solicitud. Intenta nuevamente.',false);return}if(intent==='chat'){";
  const reviewGate="if(r.ok&&d.status==='review'){form.reset();remountTurnstile();show(d.message||'Recibimos tus datos. Los estamos verificando para atender tu solicitud.',true);return}if(!(r.ok&&d.status==='accepted')){show(d.message||'No pudimos enviar la solicitud. Intenta nuevamente.',false);return}if(intent==='chat'){";
  if(x.includes(acceptedGate)) x=x.replace(acceptedGate,reviewGate);

  // Pennyworth must not route or label customer submissions as LISTIA inventory.
  x=x.replaceAll("distribution_target:'listia_subscriber_pool'","distribution_target:'pennyworth_internal'");

  return x;
}

function assertWorkerContract(x:string){
  const checks={
    intake:x.includes('/functions/v1/lead-intake'),
    no_turnstile_required:!x.includes('turnstile_required'),
    no_appearance_always:!/(?:appearance\s*:\s*['"]always['"]|data-appearance=["']always["'])/i.test(x),
    no_turnstile_422:!/!turnstileOk\)return json\([^;]{0,180},422\)/i.test(x),
    turnstile_signal:/turnstile:\s*turnstileOk/.test(x),
    review_success:x.includes("d.status==='review'"),
    no_listia_pool:!x.includes('listia_subscriber_pool')
  };
  const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
  if(failed.length)throw new Error('pennyworth_worker_form_contract_failed_'+failed.join(','));
}

globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  const res=await nativeFetch(input as any,init);
  if(!res.ok||!url.includes(TEMPLATE)) return res;
  const text=patchTemplate(await res.text());
  assertWorkerContract(text);
  const headers=new Headers(res.headers);headers.delete('content-length');
  return new Response(text,{status:res.status,statusText:res.statusText,headers});
}) as typeof fetch;

await import("https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/9c6821efe75e2a3b7e22754778b647015c1ba734/supabase/functions/pennyworth-provision/index.ts");
