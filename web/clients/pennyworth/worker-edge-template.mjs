const HTML=__HTML_JSON__.replaceAll("5219841792035","529843098059");
const GATE_KEY="69a3dc7f-d733-41b4-aec5-08d7ca521d81";
const ORIGIN="https://pennyworth.cloudsales.app/";
const INTAKE="https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/lead-intake";
const PUBLIC_DATA="https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/public-landing-data";
const INVENTORY_SCRIPT=`<script>(()=>{'use strict';const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));const money=(v,c)=>{const n=Number(v);if(!Number.isFinite(n))return'';try{return new Intl.NumberFormat('es-MX',{style:'currency',currency:c||'MXN',maximumFractionDigits:0}).format(n)}catch{return n.toLocaleString('es-MX')+' '+(c||'')}};fetch('${PUBLIC_DATA}?hostname='+encodeURIComponent(location.hostname),{headers:{accept:'application/json'}}).then(r=>r.ok?r.json():null).then(d=>{if(!d?.inventory?.length)return;const sec=document.getElementById('properties'),grid=sec?.querySelector('.grid3');if(!grid)return;grid.innerHTML=d.inventory.map(i=>{const a=i.attributes||{},img=i.media?.[0]?.url||'',meta=[a.location||a.market||a.city,a.bedrooms?String(a.bedrooms)+' hab.':'',a.area_m2?String(a.area_m2)+' m²':''].filter(Boolean).join(' · ');const p1=money(i.price_min,i.currency),p2=i.price_max&&i.price_max!==i.price_min?money(i.price_max,i.currency):'';const price=p1?(p2?'Desde '+p1+' hasta '+p2:'Desde '+p1):'';return '<article class="card property">'+(img?'<img src="'+e(img)+'" alt="'+e(i.name)+'" loading="lazy">':'')+'<div class="card-pad"><h3>'+e(i.name)+'</h3>'+(meta?'<div class="meta">'+e(meta)+'</div>':'')+(price?'<div class="price">'+e(price)+'</div>':'')+(i.short_description?'<p class="muted" style="font-size:13px;line-height:1.5">'+e(i.short_description)+'</p>':'')+'<a class="btn" href="#contact" data-inventory-id="'+e(i.id)+'">Solicitar información</a></div></article>'}).join('');sec.dataset.cloudsalesInventory='live';const note=sec.querySelector('.section-head .muted');if(note)note.textContent='Inventario vigente administrado desde CloudSales. Precios y disponibilidad pueden cambiar; confirma siempre la información con un asesor.'}).catch(()=>{})})();</script>`;
const LEGAL_SCRIPT=`<script>(()=>{'use strict';const fine=document.querySelector('#leadForm .fine');if(fine){fine.innerHTML='<strong>Condiciones de contacto:</strong> Al enviar tus datos, autorizas su uso para atender tu solicitud, identificar opciones inmobiliarias que coincidan con tus necesidades y compartir tu información con terceros o profesionales inmobiliarios que puedan ofrecerte propiedades relevantes. Podrás ser contactado en relación con tu búsqueda inmobiliaria. Este formulario utiliza la capa de calidad de leads de CloudSales. <a href="https://pennyworth.vip/privacy-policy" target="_blank" rel="noopener">Aviso de privacidad</a>.'}})();</script>`;
const CHAT_SCRIPT=`<style>
.wa{display:none!important}
#pwWaGate{position:fixed;right:18px;bottom:18px;z-index:1000;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
#pwWaBubble{display:flex;align-items:center;gap:9px;border:0;border-radius:999px;background:#25D366;color:#fff;font-weight:900;font-size:16px;padding:14px 18px;box-shadow:0 18px 45px rgba(0,0,0,.38);cursor:pointer}
#pwWaBubble svg{width:23px;height:23px;fill:#fff;flex:none}
#pwWaPanel{position:absolute;right:0;bottom:66px;width:min(390px,calc(100vw - 24px));max-height:min(690px,calc(100vh - 100px));overflow:auto;background:#101713;border:1px solid rgba(255,255,255,.12);border-radius:24px;box-shadow:0 28px 80px rgba(0,0,0,.55);display:none}
#pwWaGate.open #pwWaPanel{display:block}
.pwWaHead{position:sticky;top:0;z-index:2;background:#25D366;color:#fff;padding:18px 18px 16px;border-radius:23px 23px 0 0;display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.pwWaHead strong{font-size:20px;display:block}.pwWaHead span{display:block;font-size:12px;line-height:1.4;margin-top:4px;opacity:.94}
#pwWaClose{border:0;background:rgba(0,0,0,.13);color:#fff;width:34px;height:34px;border-radius:50%;font-size:22px;line-height:1;cursor:pointer}
#pwWaForm{padding:16px}
#pwWaForm label{display:block;color:#d9e5dd;font-size:11px;font-weight:800;margin:12px 0 6px}
#pwWaForm input,#pwWaForm textarea{width:100%;border:1px solid #33433a;background:#0a0f0c;color:#fff;border-radius:12px;padding:12px 13px;font:inherit;outline:none}
#pwWaForm textarea{min-height:88px;resize:vertical}
#pwWaForm input:focus,#pwWaForm textarea:focus{border-color:#25D366}
#pwWaSubmit{width:100%;border:0;border-radius:999px;background:#25D366;color:#fff;font-weight:950;font-size:15px;padding:14px 16px;margin-top:16px;cursor:pointer}
#pwWaSubmit:disabled{opacity:.55;cursor:not-allowed}
#pwWaMsg{display:none;margin-top:11px;padding:10px 11px;border-radius:10px;font-size:12px;line-height:1.45}
#pwWaMsg.ok{display:block;background:#123520;color:#c9f7d7;border:1px solid #276641}
#pwWaMsg.err{display:block;background:#35171b;color:#ffd1d7;border:1px solid #6f343d}
.pwWaFine{font-size:10px;color:#819087;line-height:1.45;margin-top:10px}
@media(max-width:620px){#pwWaGate{right:12px;bottom:12px}#pwWaPanel{position:fixed;left:12px;right:12px;bottom:76px;width:auto;max-height:calc(100vh - 96px)}#pwWaBubble{padding:14px 17px}}
</style>
<script>(()=>{'use strict';
const WHATSAPP='529843098059';
const started=Date.now();
const root=document.createElement('div');
root.id='pwWaGate';
root.innerHTML='<button id="pwWaBubble" type="button" aria-haspopup="dialog" aria-expanded="false"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M19.11 17.2c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.15-.42-2.19-1.35-.81-.72-1.36-1.61-1.52-1.88-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.26 0 1.33.97 2.62 1.1 2.8.14.18 1.9 2.9 4.6 4.07.64.28 1.14.44 1.53.57.64.2 1.23.17 1.69.1.52-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.12-.25-.18-.52-.32zM16.03 3C8.85 3 3.03 8.79 3.03 15.94c0 2.52.73 4.87 1.98 6.86L3 29l6.37-1.99a13.04 13.04 0 006.66 1.83C23.21 28.84 29 23.05 29 15.94 29 8.79 23.21 3 16.03 3zm0 23.65c-2.13 0-4.12-.62-5.8-1.69l-.42-.25-3.78 1.18 1.21-3.68-.27-.43a10.72 10.72 0 01-1.75-5.84c0-5.94 4.85-10.76 10.81-10.76 5.96 0 10.81 4.82 10.81 10.76 0 5.9-4.85 10.71-10.81 10.71z"/></svg><span>WhatsApp</span></button><section id="pwWaPanel" role="dialog" aria-modal="false" aria-label="Habla con un asesor"><div class="pwWaHead"><div><strong>Habla con un asesor</strong><span>Completa tus datos para continuar por WhatsApp.</span></div><button id="pwWaClose" type="button" aria-label="Cerrar">×</button></div><form id="pwWaForm" novalidate><label>Nombre completo</label><input id="pwWaName" autocomplete="name" maxlength="180" required><label>WhatsApp / Teléfono</label><input id="pwWaPhone" type="tel" autocomplete="tel" maxlength="40" required><label>Email</label><input id="pwWaEmail" type="email" autocomplete="email" maxlength="320" required><label>Propiedad o proyecto de interés</label><input id="pwWaInterest" maxlength="180" placeholder="Ej. IDILIK, inversión, departamento..." required><label>Mensaje</label><textarea id="pwWaText" maxlength="900" placeholder="Cuéntanos qué estás buscando" required></textarea><button id="pwWaSubmit" type="submit">CONTINUAR A WHATSAPP</button><div id="pwWaMsg"></div><div class="pwWaFine">Al continuar autorizas el uso de tus datos para atender tu solicitud. Tus datos pasan por la capa de calidad de leads de CloudSales.</div></form></section>';
document.body.appendChild(root);
const bubble=root.querySelector('#pwWaBubble'),close=root.querySelector('#pwWaClose'),form=root.querySelector('#pwWaForm'),submit=root.querySelector('#pwWaSubmit'),msg=root.querySelector('#pwWaMsg');
function openGate(){root.classList.add('open');bubble.setAttribute('aria-expanded','true');setTimeout(()=>root.querySelector('#pwWaName')?.focus(),80)}
function closeGate(){root.classList.remove('open');bubble.setAttribute('aria-expanded','false')}
bubble.addEventListener('click',()=>root.classList.contains('open')?closeGate():openGate());
close.addEventListener('click',closeGate);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeGate()});
document.querySelectorAll('.wa').forEach(el=>el.remove());
document.querySelectorAll('a[href*="whatsapp.com"],a[href*="wa.me"]').forEach(a=>{a.removeAttribute('target');a.removeAttribute('rel');a.href='#';a.dataset.pwWhatsappGate='1'});
document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const href=String(a.getAttribute('href')||'');if(a.dataset.pwWhatsappGate==='1'||/whatsapp\.com|wa\.me/i.test(href)){e.preventDefault();openGate()}},true);
function q(){const u=new URL(location.href);return{utm_source:u.searchParams.get('utm_source'),utm_medium:u.searchParams.get('utm_medium'),utm_campaign:u.searchParams.get('utm_campaign'),utm_content:u.searchParams.get('utm_content'),utm_term:u.searchParams.get('utm_term'),fbclid:u.searchParams.get('fbclid'),gclid:u.searchParams.get('gclid'),ad_id:u.searchParams.get('ad_id')}}
async function hash(x){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function challenge(id){const r=await fetch('/challenge?id='+encodeURIComponent(id),{cache:'no-store'}),c=await r.json();if(!r.ok)throw Error('challenge');let n=0;while(n<900000){const h=await hash(id+'.'+c.nonce+'.'+c.ts+'.'+c.sig+'.'+n);if(h.startsWith(c.prefix))return Object.assign({},c,{n});n++}throw Error('challenge')}
function setMsg(text,ok){msg.className=ok?'ok':'err';msg.textContent=text}
form.addEventListener('submit',async e=>{e.preventDefault();msg.className='';msg.textContent='';
 const name=root.querySelector('#pwWaName').value.trim(),phone=root.querySelector('#pwWaPhone').value.trim(),email=root.querySelector('#pwWaEmail').value.trim(),interest=root.querySelector('#pwWaInterest').value.trim(),text=root.querySelector('#pwWaText').value.trim();
 if(!name||!phone||!email||!interest||!text){setMsg('Completa todos los campos para continuar.',false);return}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setMsg('Escribe un email válido.',false);return}
 const parts=name.split(/\s+/),first=parts.shift()||name,last=parts.join(' ');
 submit.disabled=true;submit.textContent='VALIDANDO…';
 const id=crypto.randomUUID();
 try{
   const ch=await challenge(id),att=q();submit.textContent='ENVIANDO…';
   const r=await fetch('/lead',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({first_name:first,last_name:last,phone,email,website:'',started_at:started,idempotency_key:id,challenge:ch,attribution:att})});
   const d=await r.json().catch(()=>({}));
   if(!r.ok){setMsg(d.message||'No pudimos validar tus datos. Intenta nuevamente.',false);return}
   setMsg('Datos recibidos. Abriendo WhatsApp…',true);
   const wa='Hola, ya llené el formulario en PENNYWORTH y me gustaría recibir información.%0A%0ANombre: '+encodeURIComponent(name)+'%0ATeléfono: '+encodeURIComponent(phone)+'%0AEmail: '+encodeURIComponent(email)+'%0AInterés: '+encodeURIComponent(interest)+'%0AMensaje: '+encodeURIComponent(text);
   window.open('https://api.whatsapp.com/send?phone='+WHATSAPP+'&text='+wa,'_blank','noopener');
 }catch(err){setMsg('No pudimos validar tus datos. Intenta nuevamente.',false)}
 finally{submit.disabled=false;submit.textContent='CONTINUAR A WHATSAPP'}
});
})();</script>`;
const PAGE=HTML.includes('</body>')?HTML.replace('</body>',INVENTORY_SCRIPT+LEGAL_SCRIPT+CHAT_SCRIPT+'</body>'):HTML+INVENTORY_SCRIPT+LEGAL_SCRIPT+CHAT_SCRIPT;
const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"}});
async function sha(v){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function hmac(secret,v){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const s=await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(v));return[...new Uint8Array(s)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function same(a,b){if(!a||!b||a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
export default{async fetch(req,env){
 const u=new URL(req.url);
 if(req.method==="GET"&&u.pathname==="/health")return json({ok:true,service:"pennyworth-lead-gateway",version:"edge-3",challenge:"pow",inventory:"cloudsales",whatsapp_gate:"required-form"});
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
