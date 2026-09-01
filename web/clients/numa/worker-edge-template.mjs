const HTML=__HTML_JSON__;
const GATE_KEY="72d0c381-dcc6-4054-8394-fc10d305fcde";
const ORIGIN="https://numa.cloudsales.app/";
const INTAKE="https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/lead-intake";
const SITEKEY="__TURNSTILE_SITEKEY__";
const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer"}});
async function sha(v){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function hmac(secret,v){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const s=await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(v));return[...new Uint8Array(s)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function same(a,b){if(!a||!b||a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0}
function clean(v,n=500){return String(v??"").trim().slice(0,n)}
function validEmail(v){return !v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function page(){return new Response(HTML,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public,max-age=120","x-frame-options":"DENY","x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin","permissions-policy":"camera=(), microphone=(), geolocation=(), payment=()","cross-origin-opener-policy":"same-origin-allow-popups","x-permitted-cross-domain-policies":"none","content-security-policy":"default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://challenges.cloudflare.com https://fkahaqprzgcimgyathqx.supabase.co; frame-src https://challenges.cloudflare.com https://www.google.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests"}})}
export default{async fetch(req,env){
 const u=new URL(req.url),path=u.pathname.replace(/\/+$/,'')||'/';
 if(req.method==='GET'&&path==='/health')return json({ok:true,service:'numa-hotel-gateway',version:'edge-1',challenge:'pow-hmac+turnstile',turnstile:'cloudflare-managed',seo:'indexable'});
 if(req.method==='GET'&&path==='/robots.txt')return new Response('User-agent: *\nAllow: /\nSitemap: https://numa.cloudsales.app/sitemap.xml\n',{headers:{'content-type':'text/plain;charset=utf-8','cache-control':'public,max-age=3600','x-content-type-options':'nosniff'}});
 if(req.method==='GET'&&path==='/sitemap.xml')return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://numa.cloudsales.app/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>',{headers:{'content-type':'application/xml;charset=utf-8','cache-control':'public,max-age=3600','x-content-type-options':'nosniff'}});
 if(req.method==='GET'&&path==='/challenge'){
  const id=clean(u.searchParams.get('id'),180);if(!id)return json({error:'id_required'},400);
  const nonce=crypto.randomUUID(),ts=Date.now(),sig=await hmac(env.CHALLENGE_SECRET,`${id}.${nonce}.${ts}`);return json({nonce,ts,sig,prefix:'000'});
 }
 if(req.method==='GET'||req.method==='HEAD')return req.method==='HEAD'?new Response(null,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'public,max-age=120'}}):page();
 if(req.method!=='POST'||path!=='/lead')return json({error:'not_found'},404);
 const origin=req.headers.get('Origin')||'';if(origin&&origin!==ORIGIN.slice(0,-1))return json({error:'origin_not_allowed'},403);
 let b;try{b=await req.json()}catch{return json({message:'Solicitud inválida.'},400)}
 const id=clean(b.idempotency_key,180),ch=b.challenge||{},nonce=clean(ch.nonce,100),sig=clean(ch.sig,128),ts=Number(ch.ts||0),n=Number(ch.n);
 if(!id||!nonce||!sig||!Number.isFinite(ts)||!Number.isFinite(n))return json({message:'No pudimos validar la solicitud.'},422);
 if(Math.abs(Date.now()-ts)>300000)return json({message:'La verificación expiró. Intenta nuevamente.'},422);
 const expected=await hmac(env.CHALLENGE_SECRET,`${id}.${nonce}.${ts}`);if(!(await same(sig,expected)))return json({message:'No pudimos validar la solicitud.'},422);
 const proof=await sha(`${id}.${nonce}.${ts}.${sig}.${n}`);if(!proof.startsWith('000'))return json({message:'No pudimos validar la solicitud.'},422);
 const ip=req.headers.get('CF-Connecting-IP')||'',ua=req.headers.get('User-Agent')||'',honey=clean(b.website,300)!=='';
 const turnstileToken=clean(b.turnstile_token,2048);if(!turnstileToken)return json({message:'Completa la verificación de seguridad.'},422);
 let turnstileOk=false;try{const tr=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:turnstileToken,remoteip:ip})});const td=await tr.json();turnstileOk=td?.success===true&&(!td?.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase())}catch{}
 if(!turnstileOk)return json({message:'No pudimos validar la verificación de seguridad.'},422);
 const first=clean(b.first_name,120),last=clean(b.last_name,120),em=clean(b.email,320).toLowerCase(),phone=clean(b.phone,40).replace(/[^0-9+]/g,''),arrival=clean(b.arrival,20),departure=clean(b.departure,20),guests=clean(b.guests,20),interest=clean(b.interest,80),message=clean(b.message,1500);
 if(first.length<2||phone.replace(/\D/g,'').length<8||!validEmail(em))return json({message:'Revisa nombre, teléfono y email.'},422);
 let score=35;const reasons=['edge_pow_hmac','cloudflare_turnstile'];score+=15;score+=20;if(em)score+=10;const dwell=Date.now()-Number(b.started_at||Date.now());if(dwell>=1800)score+=5;else reasons.push('fast_submit');if(honey){score=0;reasons.push('honeypot')}
 const att=b.attribution||{};
 const payload={gate_key:GATE_KEY,idempotency_key:id,origin_url:ORIGIN,form_id:'numa-hotel-availability',form_name:'NUMA Hotel Boutique · Solicitud de disponibilidad',form_answers:{interest,arrival,departure,guests,message},contact:{first_name:first,last_name:last,email:em,phone},attribution:{source_provider:clean(att.utm_source||'direct',80),campaign_id:clean(att.utm_campaign||'numa-main',180),ad_group_id:clean(att.utm_content||interest,180),ad_id:'',landing_url:ORIGIN,referrer:req.headers.get('Referer')||'',fbclid:clean(att.fbclid,300),gclid:clean(att.gclid,300)},security:{quality_score:Math.max(0,Math.min(100,score)),turnstile:turnstileOk,honeypot:honey,ip_hash:await sha(ip||'unknown'),user_agent_hash:await sha(ua||'unknown'),reasons}};
 const r=await fetch(INTAKE,{method:'POST',headers:{'content-type':'application/json','x-cloudsales-edge-token':env.EDGE_TOKEN},body:JSON.stringify(payload)});const d=await r.json().catch(()=>({}));
 if(r.ok)return json(d,r.status);if(r.status===409)return json({status:'challenge',message:'Necesitamos una verificación adicional. Intenta nuevamente.'},409);if(r.status===422)return json({status:'rejected',message:'No pudimos validar la solicitud. Revisa tus datos.'},422);return json({message:'No pudimos procesar la solicitud.'},502)
}};
