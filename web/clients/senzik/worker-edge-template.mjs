const HTML_RAW=__HTML_JSON__;
const GATE_KEY="6a5d3fce-7b17-413c-8b0d-010035db3aaa";
const ORIGIN="https://senzikresidences.cloudsales.app";
const INTAKE="https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/lead-intake";
const SITEKEY="__TURNSTILE_SITEKEY__";
const WHATSAPP_NUMBER="529843105551";
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const clean=(v,n=500)=>String(v||"").trim().slice(0,n);
const emailOk=(v)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function patchHtml(raw){
 let h=raw;
 h=h.replace(/href="https:\/\/api\.whatsapp\.com\/send\?phone=525512819326[^"]*" target="_blank" rel="noopener"/g,'href="#contacto" data-wa-locked="true"');
 h=h.replace('Abrir WhatsApp del proyecto ↗','Completa tus datos para abrir WhatsApp ↓');
 h=h.replace(/<div class="grid2">[\s\S]*?<\/div><input class="hp"/,'<div class="grid2"><div class="field"><label for="first">Nombre</label><input id="first" name="first_name" autocomplete="given-name" required maxlength="120"></div><div class="field"><label for="last">Apellido</label><input id="last" name="last_name" autocomplete="family-name" required maxlength="120"></div><div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required maxlength="320"></div><div class="field"><label for="phone">Teléfono / WhatsApp</label><input id="phone" name="phone" autocomplete="tel" inputmode="tel" required maxlength="40"></div><div class="field"><label for="interest">¿Cuándo buscas entrega?</label><select id="interest" name="interest" required><option value="">Selecciona una opción</option><option value="Entrega inmediata">Inmediata</option><option value="3 a 6 meses">3 a 6 meses</option><option value="6 meses o más">6 meses o más</option></select></div><div class="field"><label for="budget">Presupuesto</label><select id="budget" name="budget" required><option value="">Selecciona una opción</option><option value="Entre 3 y 5 millones">Entre 3 y 5 millones</option><option value="6 a 10 millones">6 a 10 millones</option><option value="10 millones o más">10 millones o más</option></select></div></div><input class="hp"');
 h=h.replace('Completa tus datos para consultar disponibilidad actual.','Deja tus datos para consultar disponibilidad y habilitar el chat directo del proyecto.');
 h=h.replace('Consultar disponibilidad</button><div class="status" id="status" role="status" aria-live="polite"></div></form>','Enviar datos y continuar a WhatsApp</button><div class="status" id="status" role="status" aria-live="polite"></div><a id="waUnlocked" class="waUnlocked" href="#" target="_blank" rel="noopener" hidden>Continuar por WhatsApp ↗</a></form>');
 h=h.replace('</style>','.waUnlocked{display:flex;margin-top:12px;align-items:center;justify-content:center;text-decoration:none;border-radius:999px;padding:15px 18px;background:#182019;color:#fff;font-size:12px;font-weight:900;box-shadow:0 14px 30px rgba(24,32,25,.18)}.waUnlocked[hidden]{display:none!important}[data-wa-locked="true"]{cursor:pointer}</style>');
 h=h.replace("interest:String(fd.get('interest')||''),message:","interest:String(fd.get('interest')||''),budget:String(fd.get('budget')||''),message:");
 h=h.replace("show('Gracias. Recibimos tus datos correctamente.',true);form.reset();turnToken='';if(window.turnstile)window.turnstile.reset()","show('Gracias. Tus datos quedaron registrados. Ya puedes continuar por WhatsApp.',true);window.dispatchEvent(new CustomEvent('senzik:lead-ok',{detail:{first,delivery:String(fd.get('interest')||''),budget:String(fd.get('budget')||'')}}));form.reset();turnToken='';if(window.turnstile)window.turnstile.reset()");
 const gateScript=`<script>(()=>{const locked=[...document.querySelectorAll('[data-wa-locked="true"]')],out=document.getElementById('waUnlocked');locked.forEach(a=>a.addEventListener('click',()=>document.getElementById('contacto')?.scrollIntoView({behavior:'smooth'})));window.addEventListener('senzik:lead-ok',e=>{const first=String(e.detail?.first||'').trim(),delivery=String(e.detail?.delivery||'').trim(),budget=String(e.detail?.budget||'').trim(),text=encodeURIComponent('Hola, soy '+first+'. Ya dejé mis datos en la página de Senzik Residences. Plazo de entrega: '+delivery+'. Presupuesto: '+budget+'. Quiero continuar con información y disponibilidad.');const url='https://wa.me/${WHATSAPP_NUMBER}?text='+text;if(out){out.href=url;out.hidden=false}locked.forEach(a=>{a.href=url;a.target='_blank';a.rel='noopener';a.removeAttribute('data-wa-locked');if(a.textContent.trim()==='WhatsApp')a.textContent='Abrir WhatsApp'})})})();</script>`;
 h=h.replace('</body>',gateScript+'</body>');
 return h;
}
const HTML=patchHtml(HTML_RAW);
const page=()=>new Response(HTML,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public,max-age=120","x-frame-options":"DENY","x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin"}});
export default {
  async fetch(req,env) {
    const u=new URL(req.url),path=u.pathname.replace(/\/+$/,'')||'/';
    if(req.method==='GET'&&path==='/health')return json({ok:true,service:'senzik-gateway-v1',version:'edge-4',security:'turnstile+honeypot+server-validation',whatsapp_gate:'lead_required',qualification:['delivery_timeline','budget']});
    if(req.method==='GET'&&path==='/robots.txt')return new Response('User-agent: *\nAllow: /\nSitemap: https://senzikresidences.cloudsales.app/sitemap.xml\n',{headers:{'content-type':'text/plain;charset=utf-8','cache-control':'public,max-age=3600'}});
    if(req.method==='GET'&&path==='/sitemap.xml')return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://senzikresidences.cloudsales.app/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>',{headers:{'content-type':'application/xml;charset=utf-8','cache-control':'public,max-age=3600'}});
    if(req.method==='GET'&&path==='/challenge')return json({nonce:crypto.randomUUID(),ts:Date.now(),sig:'turnstile',prefix:'0'});
    if(req.method==='GET'||req.method==='HEAD')return req.method==='HEAD'?new Response(null,{status:200}):page();
    if(req.method!=='POST'||path!=='/lead')return json({error:'not_found'},404);
    const origin=req.headers.get('Origin')||'';
    if(origin&&origin!==ORIGIN)return json({error:'origin_not_allowed'},403);
    let b;try{b=await req.json()}catch{return json({message:'Solicitud inválida.'},400)}
    const first=clean(b.first_name,120),last=clean(b.last_name,120),email=clean(b.email,320).toLowerCase(),phone=clean(b.phone,40).replace(/[^0-9+]/g,''),delivery=clean(b.delivery_timeline||b.interest,80),budget=clean(b.budget,80),honeypot=clean(b.website,300)!=='';
    if(honeypot)return json({status:'accepted'},200);
    const allowedDelivery=new Set(['Entrega inmediata','3 a 6 meses','6 meses o más']);
    const allowedBudget=new Set(['Entre 3 y 5 millones','6 a 10 millones','10 millones o más']);
    if(first.length<2||last.length<2||!emailOk(email)||phone.replace(/\D/g,'').length<8||!allowedDelivery.has(delivery)||!allowedBudget.has(budget))return json({message:'Completa nombre, apellido, email, teléfono/WhatsApp, plazo de entrega y presupuesto.'},422);
    const token=clean(b.turnstile_token,2048);if(!token)return json({message:'Completa la verificación de seguridad.'},422);
    let turnstileOk=false;
    try{const tr=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:token,remoteip:req.headers.get('CF-Connecting-IP')||''})});const td=await tr.json();turnstileOk=td&&td.success===true&&(!td.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase())}catch{}
    if(!turnstileOk)return json({message:'No pudimos validar la verificación de seguridad.'},422);
    const att=b.attribution||{};
    const payload={gate_key:GATE_KEY,idempotency_key:clean(b.idempotency_key,180)||crypto.randomUUID(),origin_url:ORIGIN+'/',form_id:'senzik-residences-main',form_name:'Senzik Residences - Solicitud de información',form_answers:{delivery_timeline:delivery,budget},contact:{first_name:first,last_name:last,email,phone},attribution:{source_provider:clean(att.utm_source||'direct',80),campaign_id:clean(att.utm_campaign||'senzik-main',180),ad_group_id:clean(att.utm_content||delivery,180),ad_id:'',landing_url:ORIGIN+'/',referrer:req.headers.get('Referer')||'',fbclid:clean(att.fbclid,300),gclid:clean(att.gclid,300)},security:{quality_score:92,turnstile:true,honeypot:false,reasons:['cloudflare_turnstile','server_validation','required_identity_fields','delivery_timeline','budget']}};
    const r=await fetch(INTAKE,{method:'POST',headers:{'content-type':'application/json','x-cloudsales-edge-token':env.EDGE_TOKEN},body:JSON.stringify(payload)});const d=await r.json().catch(()=>({}));
    if(r.ok)return json({...d,whatsapp_unlocked:true},r.status);if(r.status===409)return json({status:'challenge',message:'Necesitamos una verificación adicional. Intenta nuevamente.'},409);if(r.status===422)return json({status:'rejected',message:'No pudimos validar la solicitud. Revisa tus datos.'},422);return json({message:'No pudimos procesar la solicitud.'},502);
  }
};