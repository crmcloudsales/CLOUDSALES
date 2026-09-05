import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Pennyworth form resilience + release gate.
// Turnstile is a strong verified signal when available, but security-provider
// failure must never erase plausible human commercial intent.
const nativeFetch = globalThis.fetch.bind(globalThis);
const TEMPLATE = '/web/clients/pennyworth/worker-edge-template.mjs';

function patchTemplate(raw:string){
  let x=raw;
  x=x.replaceAll("appearance:'always'","appearance:'interaction-only'")
     .replaceAll('appearance:"always"','appearance:"interaction-only"');

  x=x.replace(
    "const turnstileToken=await ensureTurnstileToken();if(!turnstileToken)throw new Error('turnstile_required');const ch=await challenge(id),a=qp();",
    "const turnstileToken=await ensureTurnstileToken(2200);const ch=await challenge(id),a=qp();"
  );

  x=x.replace(
    "show(err?.message==='secure_chat_grant_missing'?'No pudimos iniciar el chat seguro. Intenta nuevamente.':err?.message==='turnstile_required'?'Completa la verificación de seguridad.':'No pudimos validar la solicitud. Intenta nuevamente.',false);",
    "show(err?.message==='secure_chat_grant_missing'?'No pudimos iniciar el chat seguro. Intenta nuevamente.':'No pudimos validar la solicitud. Intenta nuevamente.',false);"
  );

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
  return x;
}

function requiredById(x:string,id:string){
  return new RegExp(`<input\\b[^>]*id=["']${id}["'][^>]*\\brequired\\b|<input\\b[^>]*\\brequired\\b[^>]*id=["']${id}["']`,'i').test(x);
}

function assertFormContract(x:string){
  const checks={
    form:/id=["']leadForm["']/i.test(x),
    submit:/<button\b[^>]*type=["']submit["']/i.test(x),
    first_required:requiredById(x,'first'),
    phone_required:requiredById(x,'phone'),
    email_required:requiredById(x,'email'),
    no_turnstile_required:!x.includes('turnstile_required'),
    no_hard_security_copy:!/Completa la verificación de seguridad|Complete the security verification/i.test(x),
    no_appearance_always:!/(?:appearance\s*:\s*['"]always['"]|data-appearance=["']always["'])/i.test(x),
    no_turnstile_422:!/!turnstileOk\)return json\([^;]{0,180},422\)/i.test(x)
  };
  const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
  if(failed.length)throw new Error('pennyworth_form_qa_contract_failed_'+failed.join(','));
}

globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  const res=await nativeFetch(input as any,init);
  if(!res.ok||!url.includes(TEMPLATE)) return res;
  const text=patchTemplate(await res.text());
  assertFormContract(text);
  const headers=new Headers(res.headers);headers.delete('content-length');
  return new Response(text,{status:res.status,statusText:res.statusText,headers});
}) as typeof fetch;

await import("https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/9c6821efe75e2a3b7e22754778b647015c1ba734/supabase/functions/pennyworth-provision/index.ts");
