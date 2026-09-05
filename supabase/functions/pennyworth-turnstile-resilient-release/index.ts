import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Pennyworth release gate: Turnstile stays a verified signal, but a high-confidence
// human REVIEW must not be trapped in the form. REVIEW remains quarantined from CRM
// while the visitor may continue to chat/WhatsApp.
const nativeFetch=globalThis.fetch.bind(globalThis);
const TEMPLATE='/web/clients/pennyworth/worker-edge-template.mjs';
const REVIEW_CONTINUE_SCORE=80;

function patchTemplate(raw:string){
  let x=raw;
  x=x.replaceAll("appearance:'always'","appearance:'interaction-only'").replaceAll('appearance:"always"','appearance:"interaction-only"');

  // Client: Turnstile may be slow/unavailable. Still submit the signed PoW request.
  x=x.replace("const turnstileToken=await ensureTurnstileToken();if(!turnstileToken)throw new Error('turnstile_required');const ch=await challenge(id),a=qp();","const turnstileToken=await ensureTurnstileToken(2200);const ch=await challenge(id),a=qp();");
  x=x.replace("show(err?.message==='secure_chat_grant_missing'?'No pudimos iniciar el chat seguro. Intenta nuevamente.':err?.message==='turnstile_required'?'Completa la verificación de seguridad.':'No pudimos validar la solicitud. Intenta nuevamente.',false);","show(err?.message==='secure_chat_grant_missing'?'No pudimos iniciar el chat seguro. Intenta nuevamente.':'No pudimos validar la solicitud. Intenta nuevamente.',false);");
  x=x.replace("if(++attempts<80)setTimeout(render,120);else failTurnstile('No pudimos cargar la verificación de seguridad. Recarga la página.');return;","if(++attempts<80)setTimeout(render,120);else resolveTurnstileWaiters('');return;");
  x=x.replace("if(++attempts<80)setTimeout(render,180);else failTurnstile('No pudimos cargar la verificación de seguridad. Recarga la página.')","if(++attempts<80)setTimeout(render,180);else resolveTurnstileWaiters('')");
  x=x.replace("'expired-callback':()=>{turnstileValue='';show('La verificación expiró. Confirma nuevamente.',false)}","'expired-callback':()=>{turnstileValue='';setTimeout(remountTurnstile,0)}");
  x=x.replace("'error-callback':()=>failTurnstile('No pudimos cargar la verificación de seguridad. Intenta nuevamente.')","'error-callback':()=>{turnstileValue='';resolveTurnstileWaiters('')}");

  // Server: verify Turnstile when present; never return 422 only because the provider
  // is unavailable. The shared lead-intake decides ACCEPT/REVIEW/REJECT.
  const ip=' const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=clean(b.website,300)!=="";';
  const optional=` const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=clean(b.website,300)!="";\n const turnstileToken=clean(b.turnstile_token,2048);let turnstileOk=false,turnstileChecked=false;\n if(turnstileToken){turnstileChecked=true;try{const tr=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:turnstileToken,remoteip:ip})});const td=await tr.json();turnstileOk=td?.success===true&&(!td?.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase())}catch{turnstileOk=false}}`;
  if(x.includes(ip))x=x.replace(ip,optional);
  x=x.replace('let score=25;const reasons=["edge_pow_hmac"];','let score=25;const reasons=["edge_pow_hmac"];if(turnstileChecked&&turnstileOk)reasons.push("cloudflare_turnstile");else if(turnstileChecked)reasons.push("turnstile_failed_review");else reasons.push("turnstile_unavailable")');
  x=x.replace('security:{quality_score:Math.max(0,Math.min(100,score)),turnstile:true,honeypot:honey','security:{quality_score:Math.max(0,Math.min(100,score)),turnstile:turnstileOk,honeypot:honey');

  // A high-confidence REVIEW is already durably captured. Let the visitor continue
  // instead of showing a red/blocked "verificando" state. Low-confidence REVIEW stays blocked.
  const acceptedGate="if(!(r.ok&&d.status==='accepted')){show(d.message||'No pudimos enviar la solicitud. Intenta nuevamente.',false);return}if(intent==='chat'){";
  const continueGate=`const reviewContinue=r.ok&&d.status==='review'&&Number(d.quality_score||0)>=${REVIEW_CONTINUE_SCORE};if(!(r.ok&&(d.status==='accepted'||reviewContinue))){show(d.message||'No pudimos enviar la solicitud. Intenta nuevamente.',false);return}if(intent==='chat'){`;
  if(x.includes(acceptedGate))x=x.replace(acceptedGate,continueGate);

  // Issue one-time chat grant for ACCEPTED or high-confidence REVIEW.
  x=x.replace('if(d?.status==="accepted"&&channel==="chat"&&d?.attempt_id&&d?.contact_id){',`if((d?.status==="accepted"||(d?.status==="review"&&Number(d?.quality_score||0)>=${REVIEW_CONTINUE_SCORE}))&&channel==="chat"&&d?.attempt_id&&d?.contact_id){`);

  // Pennyworth is isolated from LISTIA labels/routing.
  x=x.replaceAll("distribution_target:'listia_subscriber_pool'","distribution_target:'pennyworth_internal'");
  x=x.replaceAll('lead_pool:"listia-subscriber-distribution"','lead_pool:"pennyworth-internal"');

  // Use the existing public chat API; its verifier is upgraded separately to accept
  // signed high-confidence REVIEW grants.
  return x;
}

function assertContract(x:string){
  const checks={
    intake:x.includes('/functions/v1/lead-intake'),
    no_turnstile_required:!x.includes('turnstile_required'),
    no_appearance_always:!/(?:appearance\s*:\s*['"]always['"]|data-appearance=["']always["'])/i.test(x),
    turnstile_signal:/turnstile:\s*turnstileOk/.test(x),
    review_continue:x.includes("d.status==='review'")&&x.includes('reviewContinue'),
    review_grant:x.includes('d?.status==="review"'),
    no_listia:!x.includes('listia_subscriber_pool')&&!x.includes('listia-subscriber-distribution')
  };
  const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
  if(failed.length)throw new Error('pennyworth_worker_form_contract_failed_'+failed.join(','));
}

globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  const res=await nativeFetch(input as any,init);
  if(!res.ok||!url.includes(TEMPLATE))return res;
  const text=patchTemplate(await res.text());
  assertContract(text);
  const headers=new Headers(res.headers);headers.delete('content-length');
  return new Response(text,{status:res.status,statusText:res.statusText,headers});
}) as typeof fetch;

await import("https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/9c6821efe75e2a3b7e22754778b647015c1ba734/supabase/functions/pennyworth-provision/index.ts");
