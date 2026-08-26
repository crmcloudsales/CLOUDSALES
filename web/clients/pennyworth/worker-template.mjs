const HTML=__HTML_JSON__;
const GATE_KEY="69a3dc7f-d733-41b4-aec5-08d7ca521d81";
const ORIGIN="https://pennyworth.cloudsales.app/";
const INTAKE="https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/lead-intake";
const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"}});
async function sha(v){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
export default{async fetch(req,env){
 const u=new URL(req.url);
 if(req.method==="GET"&&u.pathname==="/health")return json({ok:true,service:"pennyworth-lead-gateway",version:"1"});
 if(req.method==="GET")return new Response(HTML,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public,max-age=120","x-frame-options":"DENY","x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin","permissions-policy":"camera=(), microphone=(), geolocation=()"}});
 if(req.method!=="POST"||u.pathname!=="/lead")return json({error:"not_found"},404);
 let b;try{b=await req.json()}catch{return json({message:"Solicitud inválida."},400)}
 const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",turn=String(b.turnstile_token||""),honey=String(b.website||"").trim()!=="";
 const form=new URLSearchParams();form.set("secret",env.TURNSTILE_SECRET);form.set("response",turn);if(ip)form.set("remoteip",ip);
 const vr=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form.toString()});
 const vd=await vr.json().catch(()=>({success:false}));
 const first=String(b.first_name||"").trim().slice(0,120),last=String(b.last_name||"").trim().slice(0,120),em=String(b.email||"").trim().toLowerCase().slice(0,320),phone=String(b.phone||"").trim().replace(/[^0-9+]/g,"").slice(0,40);
 let score=0;const reasons=[];
 if(vd.success)score+=30;else reasons.push("turnstile_failed");
 if(first.length>=2)score+=10;else reasons.push("name_weak");
 if(phone.replace(/\D/g,"").length>=8)score+=20;else reasons.push("phone_weak");
 if(em){if(validEmail(em))score+=15;else reasons.push("email_invalid")}
 const dwell=Date.now()-Number(b.started_at||Date.now());if(dwell>=1800)score+=5;else reasons.push("fast_submit");
 if(honey){score=0;reasons.push("honeypot")}
 const att=b.attribution||{};
 const payload={gate_key:GATE_KEY,idempotency_key:String(b.idempotency_key||crypto.randomUUID()).slice(0,180),origin_url:ORIGIN,contact:{first_name:first,last_name:last,email:em,phone},attribution:{source_provider:String(att.utm_source||"direct").slice(0,80),campaign_id:String(att.utm_campaign||"pennyworth-main").slice(0,180),ad_group_id:String(att.utm_content||"").slice(0,180),ad_id:String(att.ad_id||"").slice(0,180),landing_url:ORIGIN,referrer:req.headers.get("Referer")||"",fbclid:String(att.fbclid||"").slice(0,300),gclid:String(att.gclid||"").slice(0,300)},security:{quality_score:score,turnstile:vd.success===true,honeypot:honey,ip_hash:await sha(ip||"unknown"),user_agent_hash:await sha(ua||"unknown"),reasons}};
 const r=await fetch(INTAKE,{method:"POST",headers:{"content-type":"application/json","x-cloudsales-edge-token":env.EDGE_TOKEN},body:JSON.stringify(payload)});
 const d=await r.json().catch(()=>({}));
 if(r.ok)return json(d,r.status);
 if(r.status===409)return json({status:"challenge",message:"Necesitamos una verificación adicional. Intenta nuevamente."},409);
 if(r.status===422)return json({status:"rejected",message:"No pudimos validar la solicitud. Revisa tus datos e intenta nuevamente."},422);
 return json({message:"No pudimos procesar la solicitud."},502)
}};