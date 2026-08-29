const HTML=__HTML_JSON__.replaceAll("5219841792035","529843098059");
const GATE_KEY="69a3dc7f-d733-41b4-aec5-08d7ca521d81";
const ORIGIN="https://pennyworth.cloudsales.app/";
const INTAKE="https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/lead-intake";
const PUBLIC_DATA="https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/public-landing-data";
const INVENTORY_SCRIPT=`<script>(()=>{'use strict';const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));const money=(v,c)=>{const n=Number(v);if(!Number.isFinite(n))return'';try{return new Intl.NumberFormat('es-MX',{style:'currency',currency:c||'MXN',maximumFractionDigits:0}).format(n)}catch{return n.toLocaleString('es-MX')+' '+(c||'')}};fetch('${PUBLIC_DATA}?hostname='+encodeURIComponent(location.hostname),{headers:{accept:'application/json'}}).then(r=>r.ok?r.json():null).then(d=>{if(!d?.inventory?.length)return;const sec=document.getElementById('properties'),grid=sec?.querySelector('.grid3');if(!grid)return;grid.innerHTML=d.inventory.map(i=>{const a=i.attributes||{},img=i.media?.[0]?.url||'',meta=[a.location||a.market||a.city,a.bedrooms?String(a.bedrooms)+' hab.':'',a.area_m2?String(a.area_m2)+' m²':''].filter(Boolean).join(' · ');const p1=money(i.price_min,i.currency),p2=i.price_max&&i.price_max!==i.price_min?money(i.price_max,i.currency):'';const price=p1?(p2?'Desde '+p1+' hasta '+p2:'Desde '+p1):'';return '<article class="card property">'+(img?'<img src="'+e(img)+'" alt="'+e(i.name)+'" loading="lazy">':'')+'<div class="card-pad"><h3>'+e(i.name)+'</h3>'+(meta?'<div class="meta">'+e(meta)+'</div>':'')+(price?'<div class="price">'+e(price)+'</div>':'')+(i.short_description?'<p class="muted" style="font-size:13px;line-height:1.5">'+e(i.short_description)+'</p>':'')+'<a class="btn" href="#contact" data-inventory-id="'+e(i.id)+'">Solicitar información</a></div></article>'}).join('');sec.dataset.cloudsalesInventory='live';const note=sec.querySelector('.section-head .muted');if(note)note.textContent='Inventario vigente administrado desde CloudSales. Precios y disponibilidad pueden cambiar; confirma siempre la información con un asesor.'}).catch(()=>{})})();</script>`;
const LEGAL_SCRIPT=`<script>(()=>{'use strict';const fine=document.querySelector('#leadForm .fine');if(fine){fine.innerHTML='<strong>Condiciones de contacto:</strong> Al enviar tus datos, autorizas su uso para atender tu solicitud, identificar opciones inmobiliarias que coincidan con tus necesidades y compartir tu información con terceros o profesionales inmobiliarios que puedan ofrecerte propiedades relevantes. Podrás ser contactado en relación con tu búsqueda inmobiliaria. Este formulario utiliza la capa de calidad de leads de CloudSales. <a href="https://pennyworth.vip/privacy-policy" target="_blank" rel="noopener">Aviso de privacidad</a>.'}})();</script>`;
const PAGE=HTML.includes('</body>')?HTML.replace('</body>',INVENTORY_SCRIPT+LEGAL_SCRIPT+'</body>'):HTML+INVENTORY_SCRIPT+LEGAL_SCRIPT;
const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"}});
async function sha(v){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function hmac(secret,v){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const s=await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(v));return[...new Uint8Array(s)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function same(a,b){if(!a||!b||a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
export default{async fetch(req,env){
 const u=new URL(req.url);
 if(req.method==="GET"&&u.pathname==="/health")return json({ok:true,service:"pennyworth-lead-gateway",version:"edge-2",challenge:"pow",inventory:"cloudsales"});
 if(req.method==="GET"&&u.pathname==="/inventory.json"){
   const r=await fetch(`${PUBLIC_DATA}?hostname=${encodeURIComponent(u.hostname)}`,{headers:{accept:'application/json'}});return new Response(await r.text(),{status:r.status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"public,max-age=60","x-content-type-options":"nosniff"}})
 }
 if(req.method==="GET"&&u.pathname==="/challenge"){
   const id=String(u.searchParams.get("id")||"").slice(0,180);if(!id)return json({error:"id_required"},400);
   const nonce=crypto.randomUUID(),ts=Date.now(),sig=await hmac(env.CHALLENGE_SECRET,`${id}.${nonce}.${ts}`);
   return json({nonce,ts,sig,prefix:"000"});
 }
 if(req.method==="GET")return new Response(PAGE,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public,max-age=120","x-frame-options":"DENY","x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin","permissions-policy":"camera=(), microphone=(), geolocation=()"}});
 if(req.method!=="POST"||u.pathname!=="/lead")return json({error:"not_found"},404);
 let b;try{b=await req.json()}catch{return json({message:"Solicitud inválida."},400)}
 const id=String(b.idempotency_key||"").slice(0,180),ch=b.challenge||{},nonce=String(ch.nonce||""),sig=String(ch.sig||""),ts=Number(ch.ts||0),n=Number(ch.n);if(!id||!nonce||!sig||!Number.isFinite(ts)||!Number.isFinite(n))return json({message:"No pudimos validar la solicitud."},422);
 if(Math.abs(Date.now()-ts)>300000)return json({message:"La verificación expiró. Intenta nuevamente."},422);
 const expected=await hmac(env.CHALLENGE_SECRET,`${id}.${nonce}.${ts}`);if(!(await same(sig,expected)))return json({message:"No pudimos validar la solicitud."},422);
 const proof=await sha(`${id}.${nonce}.${ts}.${sig}.${n}`);if(!proof.startsWith("000"))return json({message:"No pudimos validar la solicitud."},422);
 const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=String(b.website||"").trim()!=="";
 const first=String(b.first_name||"").trim().slice(0,120),last=String(b.last_name||"").trim().slice(0,120),em=String(b.email||"").trim().toLowerCase().slice(0,320),phone=String(b.phone||"").trim().replace(/[^0-9+]/g,"").slice(0,40);
 let score=30;const reasons=["edge_pow_challenge"];
 if(first.length>=2)score+=10;else reasons.push("name_weak");
 if(phone.replace(/\D/g,"").length>=8)score+=20;else reasons.push("phone_weak");
 if(em){if(validEmail(em))score+=15;else reasons.push("email_invalid")}
 const dwell=Date.now()-Number(b.started_at||Date.now());if(dwell>=1800)score+=5;else reasons.push("fast_submit");
 if(honey){score=0;reasons.push("honeypot")}
 const att=b.attribution||{};
 const payload={gate_key:GATE_KEY,idempotency_key:id,origin_url:ORIGIN,contact:{first_name:first,last_name:last,email:em,phone},attribution:{source_provider:String(att.utm_source||"direct").slice(0,80),campaign_id:String(att.utm_campaign||"pennyworth-main").slice(0,180),ad_group_id:String(att.utm_content||"").slice(0,180),ad_id:String(att.ad_id||"").slice(0,180),landing_url:ORIGIN,referrer:req.headers.get("Referer")||"",fbclid:String(att.fbclid||"").slice(0,300),gclid:String(att.gclid||"").slice(0,300)},security:{quality_score:score,turnstile:true,honeypot:honey,ip_hash:await sha(ip||"unknown"),user_agent_hash:await sha(ua||"unknown"),reasons}};
 const r=await fetch(INTAKE,{method:"POST",headers:{"content-type":"application/json","x-cloudsales-edge-token":env.EDGE_TOKEN},body:JSON.stringify(payload)});const d=await r.json().catch(()=>({}));
 if(r.ok)return json(d,r.status);if(r.status===409)return json({status:"challenge",message:"Necesitamos una verificación adicional. Intenta nuevamente."},409);if(r.status===422)return json({status:"rejected",message:"No pudimos validar la solicitud. Revisa tus datos e intenta nuevamente."},422);return json({message:"No pudimos procesar la solicitud."},502)
}};
