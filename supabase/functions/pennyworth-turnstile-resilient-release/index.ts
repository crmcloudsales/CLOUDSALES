import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Pennyworth Turnstile resilience layer.
// Turnstile remains verified server-side when a token is available, but a missing
// client token is not allowed to become a single point of failure. The signed
// challenge/proof-of-work, honeypot, validation and downstream rate limits remain.
const nativeFetch = globalThis.fetch.bind(globalThis);
const TEMPLATE = '/web/clients/pennyworth/worker-edge-template.mjs';

function patchTemplate(raw:string){
  let x=raw;

  // Never force a visible CAPTCHA for normal visitors.
  x=x.replaceAll("appearance:'always'","appearance:'interaction-only'")
     .replaceAll('appearance:"always"','appearance:"interaction-only"');

  // Do not block a real visitor only because the browser did not emit a
  // Turnstile token in time. We still wait briefly and send it when available.
  x=x.replace(
    "const turnstileToken=await ensureTurnstileToken();if(!turnstileToken)throw new Error('turnstile_required');const ch=await challenge(id),a=qp();",
    "const turnstileToken=await ensureTurnstileToken(2200);const ch=await challenge(id),a=qp();"
  );

  // Remove the old unreachable client error branch as well, so future edits cannot
  // accidentally revive the legacy hard Turnstile dependency.
  x=x.replace(
    "show(err?.message==='secure_chat_grant_missing'?'No pudimos iniciar el chat seguro. Intenta nuevamente.':err?.message==='turnstile_required'?'Completa la verificación de seguridad.':'No pudimos validar la solicitud. Intenta nuevamente.',false);",
    "show(err?.message==='secure_chat_grant_missing'?'No pudimos iniciar el chat seguro. Intenta nuevamente.':'No pudimos validar la solicitud. Intenta nuevamente.',false);"
  );

  // Make the server verify Turnstile when present, while retaining the other
  // independent anti-bot controls when it is absent or the widget is blocked.
  const ip=' const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=clean(b.website,300)!=="";';
  const optional=` const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=clean(b.website,300)!="";\n const turnstileToken=clean(b.turnstile_token,2048);let turnstileOk=false,turnstileChecked=false;\n if(turnstileToken){turnstileChecked=true;try{const tr=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:turnstileToken,remoteip:ip})});const td=await tr.json();turnstileOk=td?.success===true&&(!td?.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase())}catch{}if(!turnstileOk)return json({message:"No pudimos validar la seguridad. Intenta nuevamente."},422);}`;
  if(x.includes(ip)) x=x.replace(ip,optional);

  // Keep telemetry honest: only say Turnstile helped when it actually verified.
  x=x.replace(
    'let score=25;const reasons=["edge_pow_hmac"];',
    'let score=25;const reasons=["edge_pow_hmac"];if(turnstileChecked&&turnstileOk)reasons.push("cloudflare_turnstile");'
  );
  x=x.replace(
    'security:{quality_score:Math.max(0,Math.min(100,score)),turnstile:true,honeypot:honey',
    'security:{quality_score:Math.max(0,Math.min(100,score)),turnstile:turnstileOk,honeypot:honey'
  );

  // Expired tokens are silently refreshed. No red error is shown unless a
  // submission truly fails server-side.
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

globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  const res=await nativeFetch(input as any,init);
  if(!res.ok||!url.includes(TEMPLATE)) return res;
  const text=patchTemplate(await res.text());
  const headers=new Headers(res.headers);headers.delete('content-length');
  return new Response(text,{status:res.status,statusText:res.statusText,headers});
}) as typeof fetch;

await import("https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/9c6821efe75e2a3b7e22754778b647015c1ba734/supabase/functions/pennyworth-provision/index.ts");
