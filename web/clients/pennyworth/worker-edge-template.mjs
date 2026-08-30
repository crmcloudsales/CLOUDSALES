const HTML=__HTML_JSON__.replaceAll("5219841792035","529843098059");
const GATE_KEY="69a3dc7f-d733-41b4-aec5-08d7ca521d81";
const ORIGIN="https://pennyworth.cloudsales.app/";
const INTAKE="https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/lead-intake";
const PUBLIC_DATA="https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/public-landing-data";

const INVENTORY_SCRIPT=`<script>(()=>{'use strict';
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=(v,c)=>{const n=Number(v);if(!Number.isFinite(n))return'';try{return new Intl.NumberFormat('es-MX',{style:'currency',currency:c||'MXN',maximumFractionDigits:0}).format(n)}catch{return n.toLocaleString('es-MX')+' '+(c||'')}};
fetch('${PUBLIC_DATA}?hostname='+encodeURIComponent(location.hostname),{headers:{accept:'application/json'}})
.then(r=>r.ok?r.json():null).then(d=>{
 if(!d?.inventory?.length)return;
 const sec=document.getElementById('properties'),grid=sec?.querySelector('.grid3');if(!grid)return;
 grid.innerHTML=d.inventory.map(i=>{const a=i.attributes||{},img=i.media?.[0]?.url||'',meta=[a.location||a.market||a.city,a.bedrooms?String(a.bedrooms)+' hab.':'',a.area_m2?String(a.area_m2)+' m²':''].filter(Boolean).join(' · ');
 const p1=money(i.price_min,i.currency),p2=i.price_max&&i.price_max!==i.price_min?money(i.price_max,i.currency):'',price=p1?(p2?'Desde '+p1+' hasta '+p2:'Desde '+p1):'';
 return '<article class="card property">'+(img?'<img src="'+e(img)+'" alt="'+e(i.name)+'" loading="lazy">':'')+'<div class="card-pad"><h3>'+e(i.name)+'</h3>'+(meta?'<div class="meta">'+e(meta)+'</div>':'')+(price?'<div class="price">'+e(price)+'</div>':'')+(i.short_description?'<p class="muted" style="font-size:13px;line-height:1.5">'+e(i.short_description)+'</p>':'')+'<a class="btn" href="#contact" data-inventory-id="'+e(i.id)+'">Solicitar información</a></div></article>'}).join('');
 sec.dataset.cloudsalesInventory='live';
 const note=sec.querySelector('.section-head .muted');if(note)note.textContent='Inventario vigente administrado desde CloudSales. Precios y disponibilidad pueden cambiar; confirma siempre la información con un asesor.';
}).catch(()=>{})})();</script>`;

const LEGAL_SCRIPT=`<script>(()=>{'use strict';
const fine=document.querySelector('#leadForm .fine');
if(fine)fine.innerHTML='<strong>Condiciones de contacto:</strong> Al enviar tus datos, autorizas su uso para atender tu solicitud, identificar opciones inmobiliarias que coincidan con tus necesidades y compartir tu información con terceros o profesionales inmobiliarios que puedan ofrecerte propiedades relevantes. Podrás ser contactado en relación con tu búsqueda inmobiliaria. Este formulario utiliza la capa de calidad de leads de CloudSales. <a href="https://pennyworth.vip/privacy-policy" target="_blank" rel="noopener">Aviso de privacidad</a>.';
})();</script>`;

const CONTACT_GATES_SCRIPT=String.raw`<style>
a.wa{display:none!important}
#pwContactGates{position:fixed;right:18px;bottom:18px;z-index:2147483000;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.pwLaunch{display:flex;align-items:center;justify-content:center;gap:9px;border:0;border-radius:999px;color:#fff;font-weight:950;font-size:15px;padding:13px 17px;box-shadow:0 18px 45px rgba(0,0,0,.42);cursor:pointer;min-width:112px}
.pwLaunch svg{width:21px;height:21px;fill:#fff;stroke:#fff;flex:none}#pwChatLaunch{background:#635BFF}#pwWaLaunch{background:#25D366}
.pwPanel{position:fixed;display:none}
#pwUnifiedPanel{position:fixed;z-index:2147483001;right:18px;bottom:145px;width:min(430px,calc(100vw - 24px));max-height:min(730px,calc(100vh - 175px));overflow:auto;background:#0d1010;color:#fff;border:1px solid rgba(255,255,255,.13);border-radius:24px;box-shadow:0 30px 100px rgba(0,0,0,.62);display:none}#pwUnifiedPanel.open{display:block}
.pwHead{position:sticky;top:0;z-index:3;padding:17px 18px 15px;display:flex;justify-content:space-between;align-items:flex-start;gap:14px;border-radius:23px 23px 0 0}.pwHead.chat{background:#635BFF}.pwHead.whatsapp{background:#25D366}.pwHead strong{display:block;font-size:19px}.pwHead span{display:block;margin-top:4px;font-size:11px;line-height:1.45;opacity:.94}.pwClose{border:0;background:rgba(0,0,0,.15);color:#fff;width:34px;height:34px;border-radius:50%;font-size:22px;line-height:1;cursor:pointer}
.pwFormHost{padding:12px}.pwFormHost .form-card{box-shadow:none;margin:0;border-color:#303632}.pwFormHost .form-card h3{font-size:22px}.pwFormHost .sub{font-size:13px}.pwFormHost .fine{font-size:10px}.pwFormHost .submit.chat{background:#635BFF;color:#fff}.pwFormHost .submit.whatsapp{background:#25D366;color:#fff}
.pwChatBox{display:none;grid-template-rows:1fr auto;height:min(535px,calc(100vh - 220px));min-height:390px}.pwChatBox.active{display:grid}.pwMsgs{padding:15px;overflow:auto;display:flex;flex-direction:column;gap:8px}.pwBubble{max-width:82%;padding:10px 12px;border-radius:15px;font-size:12px;line-height:1.45;white-space:pre-wrap;word-break:break-word}.pwIn{align-self:flex-end;background:#635BFF}.pwOut{align-self:flex-start;background:#191d1b;border:1px solid #303733}.pwWelcome{margin:auto;text-align:center;color:#929a95;font-size:12px;line-height:1.55;padding:24px}.pwChatComposer{padding:11px;border-top:1px solid #2a302d;background:#0a0d0c;display:grid;grid-template-columns:1fr auto;gap:7px}.pwChatComposer textarea{width:100%;border:1px solid #343c38;background:#111513;color:#fff;border-radius:11px;padding:10px;font:inherit;font-size:12px;resize:none}.pwChatSend{border:0;border-radius:11px;background:#635BFF;color:#fff;font-weight:900;padding:0 14px}.pwChatSend:disabled{opacity:.5}
@media(max-width:620px){#pwContactGates{right:12px;bottom:12px}#pwUnifiedPanel{left:12px;right:12px;bottom:150px;width:auto;max-height:calc(100vh - 170px)}.pwLaunch{padding:12px 15px;min-width:105px}.pwChatBox{height:calc(100vh - 215px);min-height:360px}}
</style><script>(()=>{'use strict';
const CHAT_API='https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/public-landing-data',WHATSAPP='529843098059',HOST=location.hostname.toLowerCase();
const form=document.getElementById('leadForm'),card=form?.closest('.form-card'),send=document.getElementById('send'),status=document.getElementById('status');if(!form||!card||!send||!status)return;
let intent='landing',intentStarted=Date.now(),chatSession='',chatAfter='',chatPoller=null,chatPolling=false,active=false;
const originalParent=card.parentNode,anchor=document.createComment('pennyworth-shared-form-anchor');originalParent.insertBefore(anchor,card);
const title=card.querySelector('h3'),sub=card.querySelector('.sub'),original={title:title?.textContent||'',sub:sub?.textContent||'',button:send.textContent||''};
const controls=document.createElement('div');controls.id='pwContactGates';controls.innerHTML='<button id="pwChatLaunch" class="pwLaunch" type="button" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v12H8l-4 4V4zm3 4v2h10V8H7zm0 4v2h7v-2H7z"/></svg><span>CHAT</span></button><button id="pwWaLaunch" class="pwLaunch" type="button" aria-expanded="false"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M19.11 17.2c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.15-.42-2.19-1.35-.81-.72-1.36-1.61-1.52-1.88-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.26 0 1.33.97 2.62 1.1 2.8.14.18 1.9 2.9 4.6 4.07.64.28 1.14.44 1.53.57.64.2 1.23.17 1.69.1.52-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.12-.25-.18-.52-.32zM16.03 3C8.85 3 3.03 8.79 3.03 15.94c0 2.52.73 4.87 1.98 6.86L3 29l6.37-1.99a13.04 13.04 0 006.66 1.83C23.21 28.84 29 23.05 29 15.94 29 8.79 23.21 3 16.03 3zm0 23.65c-2.13 0-4.12-.62-5.8-1.69l-.42-.25-3.78 1.18 1.21-3.68-.27-.43a10.72 10.72 0 01-1.75-5.84c0-5.94 4.85-10.76 10.81-10.76 5.96 0 10.81 4.82 10.81 10.76 0 5.9-4.85 10.71-10.81 10.71z"/></svg><span>WhatsApp</span></button>';document.body.appendChild(controls);
const panel=document.createElement('section');panel.id='pwUnifiedPanel';panel.setAttribute('role','dialog');panel.innerHTML='<div class="pwHead chat"><div><strong>Chat con PENNYWORTH</strong><span>Completa lo mínimo. Un asesor podrá continuar contigo.</span></div><button class="pwClose" type="button" aria-label="Cerrar">×</button></div><div class="pwFormHost"></div><div class="pwChatBox"><div class="pwMsgs"><div class="pwWelcome">Datos validados. Puedes continuar aquí mismo con PENNYWORTH.</div></div><div class="pwChatComposer"><textarea rows="2" maxlength="3000" placeholder="Escribe un mensaje..."></textarea><button class="pwChatSend" type="button">Enviar</button></div></div>';document.body.appendChild(panel);
const head=panel.querySelector('.pwHead'),headTitle=head.querySelector('strong'),headSub=head.querySelector('span'),host=panel.querySelector('.pwFormHost'),chatBox=panel.querySelector('.pwChatBox'),chatMsgs=panel.querySelector('.pwMsgs'),chatText=panel.querySelector('.pwChatComposer textarea'),chatSend=panel.querySelector('.pwChatSend'),chatLaunch=document.getElementById('pwChatLaunch'),waLaunch=document.getElementById('pwWaLaunch');
function show(t,ok){status.className='status '+(ok?'ok':'err');status.textContent=t}function clearStatus(){status.className='status';status.textContent=''}
function restoreForm(){if(anchor.parentNode)anchor.parentNode.insertBefore(card,anchor.nextSibling);card.style.display='';host.style.display='';chatBox.classList.remove('active');if(title)title.textContent=original.title;if(sub)sub.textContent=original.sub;send.textContent=original.button;send.classList.remove('chat','whatsapp')}
function closePanel(){panel.classList.remove('open');chatLaunch.setAttribute('aria-expanded','false');waLaunch.setAttribute('aria-expanded','false');active=false;stopPolling();restoreForm();intent='landing'}
function openPanel(next){intent=next;intentStarted=Date.now();active=true;panel.classList.add('open');chatLaunch.setAttribute('aria-expanded',next==='chat'?'true':'false');waLaunch.setAttribute('aria-expanded',next==='whatsapp'?'true':'false');head.className='pwHead '+next;headTitle.textContent=next==='chat'?'Chat con PENNYWORTH':'Habla por WhatsApp';headSub.textContent='Completa lo mínimo. Un asesor podrá continuar contigo.';if(title)title.textContent=next==='chat'?'Chat con PENNYWORTH':'Habla por WhatsApp';if(sub)sub.textContent='Completa lo mínimo. Un asesor podrá continuar contigo.';send.textContent=next==='chat'?'INICIAR CHAT':'CONTINUAR A WHATSAPP';send.classList.remove('chat','whatsapp');send.classList.add(next);host.appendChild(card);host.style.display=chatSession&&next==='chat'?'none':'';chatBox.classList.toggle('active',Boolean(chatSession&&next==='chat'));if(chatSession&&next==='chat')schedulePoll(250);else setTimeout(()=>document.getElementById('first')?.focus(),60)}
chatLaunch.addEventListener('click',()=>panel.classList.contains('open')&&intent==='chat'?closePanel():openPanel('chat'));waLaunch.addEventListener('click',()=>panel.classList.contains('open')&&intent==='whatsapp'?closePanel():openPanel('whatsapp'));panel.querySelector('.pwClose').addEventListener('click',closePanel);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('open'))closePanel()});
document.querySelectorAll('a.wa').forEach(el=>el.remove());document.querySelectorAll('a[href*="whatsapp.com"],a[href*="wa.me"]').forEach(a=>{a.removeAttribute('target');a.removeAttribute('rel');a.href='#';a.dataset.pwWhatsappGate='1'});document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const href=String(a.getAttribute('href')||'');if(a.dataset.pwWhatsappGate==='1'||/whatsapp\\.com|wa\\.me/i.test(href)){e.preventDefault();openPanel('whatsapp')}},true);
function qp(){const u=new URL(location.href);return{utm_source:u.searchParams.get('utm_source'),utm_medium:u.searchParams.get('utm_medium'),utm_campaign:u.searchParams.get('utm_campaign'),utm_content:u.searchParams.get('utm_content'),utm_term:u.searchParams.get('utm_term'),fbclid:u.searchParams.get('fbclid'),gclid:u.searchParams.get('gclid'),ad_id:u.searchParams.get('ad_id')}}async function hash(x){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}async function challenge(id){const r=await fetch('/challenge?id='+encodeURIComponent(id),{cache:'no-store'}),c=await r.json();if(!r.ok)throw Error('challenge');let n=0;while(n<900000){const h=await hash(id+'.'+c.nonce+'.'+c.ts+'.'+c.sig+'.'+n);if(h.startsWith(c.prefix))return Object.assign({},c,{n});n++}throw Error('challenge')}
async function chatApi(body){const r=await fetch(CHAT_API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'chat_unavailable');return d}function addBubble(direction,body){const el=document.createElement('div');el.className='pwBubble '+(direction==='inbound'?'pwIn':'pwOut');el.textContent=body||'';chatMsgs.appendChild(el);chatMsgs.scrollTop=chatMsgs.scrollHeight}
async function startChat(grant,interest){const first='Interés: '+interest,d=await chatApi({action:'chat.start',hostname:HOST,chat_grant:grant,message:first});chatSession=d.session_token;chatAfter=new Date().toISOString();addBubble('inbound',first);host.style.display='none';chatBox.classList.add('active');schedulePoll(1000)}
async function sendChat(){const message=chatText.value.trim();if(!message||!chatSession)return;chatSend.disabled=true;try{await chatApi({action:'chat.send',session_token:chatSession,message});addBubble('inbound',message);chatText.value='';chatAfter=new Date().toISOString();await pollChat()}catch{alert('No pudimos enviar el mensaje. Intenta nuevamente.')}finally{chatSend.disabled=false}}chatSend.addEventListener('click',sendChat);chatText.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()}});function stopPolling(){if(chatPoller)clearTimeout(chatPoller);chatPoller=null}function schedulePoll(delay=5000){stopPolling();if(!chatSession||!active||intent!=='chat'||document.visibilityState==='hidden')return;chatPoller=setTimeout(pollChat,delay)}async function pollChat(){if(!chatSession||!active||intent!=='chat'||chatPolling||document.visibilityState==='hidden'){schedulePoll();return}chatPolling=true;try{const d=await chatApi({action:'chat.poll',session_token:chatSession,after:chatAfter||undefined});for(const m of d.messages||[]){if(chatAfter&&m.direction==='inbound')continue;addBubble(m.direction,m.body||'');if(m.occurred_at)chatAfter=m.occurred_at}}catch(e){if(e.message==='invalid_session'||e.message==='secure_session_required'){chatSession='';chatBox.classList.remove('active');host.style.display=''}}finally{chatPolling=false;schedulePoll()}}document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&active&&intent==='chat')schedulePoll(300);else stopPolling()});
form.onsubmit=async e=>{e.preventDefault();clearStatus();if(!form.reportValidity())return;const first=document.getElementById('first').value.trim(),last=document.getElementById('last').value.trim(),phone=document.getElementById('phone').value.trim(),email=document.getElementById('email').value.trim(),interestValue=document.getElementById('interest').value,website=document.getElementById('website').value;if(!first||phone.replace(/\\D/g,'').length<8){show('Revisa tu nombre y teléfono para continuar.',false);return}send.disabled=true;send.textContent='VALIDANDO…';const id=crypto.randomUUID();try{const ch=await challenge(id),a=qp();send.textContent='ENVIANDO…';const channel=intent==='chat'?'chat':intent==='whatsapp'?'whatsapp':'landing_form',formId='pennyworth_shared_'+channel+'_v2';const r=await fetch('/lead',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({first_name:first,last_name:last,phone,email,website,started_at:intent==='landing'?Math.min(Date.now()-800,intentStarted):intentStarted,idempotency_key:id,challenge:ch,form_id:formId,form_name:'PENNYWORTH shared lead form',form_answers:{channel,interest:interestValue,distribution_target:'listia_subscriber_pool'},attribution:{...a,property_interest:interestValue},notes:'Property interest: '+interestValue})}),d=await r.json().catch(()=>({}));if(!(r.ok&&d.status==='accepted')){show(d.message||'No pudimos enviar la solicitud. Intenta nuevamente.',false);return}if(intent==='chat'){if(!d.chat_grant)throw new Error('secure_chat_grant_missing');show('Datos validados. Iniciando chat seguro…',true);await startChat(d.chat_grant,interestValue);form.reset()}else if(intent==='whatsapp'){show('Datos validados. Abriendo WhatsApp…',true);const text='Hola, ya llené el formulario seguro en PENNYWORTH y me gustaría recibir información.\\n\\nNombre: '+first+(last?' '+last:'')+'\\nTeléfono: '+phone+(email?'\\nEmail: '+email:'')+'\\nInterés: '+interestValue;form.reset();setTimeout(()=>{location.href='https://api.whatsapp.com/send?phone='+WHATSAPP+'&text='+encodeURIComponent(text)},250)}else{form.reset();show('Gracias. Tu solicitud fue recibida correctamente.',true)}}catch(err){show(err?.message==='secure_chat_grant_missing'?'No pudimos iniciar el chat seguro. Intenta nuevamente.':'No pudimos validar la solicitud. Intenta nuevamente.',false)}finally{send.disabled=false;if(intent==='chat')send.textContent='INICIAR CHAT';else if(intent==='whatsapp')send.textContent='CONTINUAR A WHATSAPP';else send.textContent=original.button}};
})();</script>`;

const PAGE=HTML.includes('</body>')?HTML.replace('</body>',INVENTORY_SCRIPT+LEGAL_SCRIPT+CONTACT_GATES_SCRIPT+'</body>'):HTML+INVENTORY_SCRIPT+LEGAL_SCRIPT+CONTACT_GATES_SCRIPT;
const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"}});
async function sha(v){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function hmac(secret,v){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const s=await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(v));return[...new Uint8Array(s)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function b64url(v){return btoa(v).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
async function same(a,b){if(!a||!b||a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function clean(v,n){return String(v??"").trim().slice(0,n)}

export default{async fetch(req,env){
 const u=new URL(req.url);
 if(req.method==="GET"&&u.pathname==="/health")return json({ok:true,service:"pennyworth-lead-gateway",version:"edge-5",challenge:"pow-hmac",inventory:"cloudsales",whatsapp_gate:"required-form",chat_gate:"required-form",crm:"highlevel",lead_pool:"listia-subscriber-distribution",contact_form:"shared-single-form",chat_grant:"hmac-one-time"});
 if(req.method==="GET"&&u.pathname==="/inventory.json"){
   const r=await fetch(`${PUBLIC_DATA}?hostname=${encodeURIComponent(u.hostname)}`,{headers:{accept:"application/json"}});
   return new Response(await r.text(),{status:r.status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"public,max-age=60","x-content-type-options":"nosniff"}});
 }
 if(req.method==="GET"&&u.pathname==="/challenge"){
   const id=clean(u.searchParams.get("id"),180);if(!id)return json({error:"id_required"},400);
   const nonce=crypto.randomUUID(),ts=Date.now(),sig=await hmac(env.CHALLENGE_SECRET,`${id}.${nonce}.${ts}`);
   return json({nonce,ts,sig,prefix:"000"});
 }
 if(req.method==="GET")return new Response(PAGE,{headers:{
   "content-type":"text/html; charset=utf-8","cache-control":"public,max-age=120","x-frame-options":"DENY","x-content-type-options":"nosniff",
   "referrer-policy":"strict-origin-when-cross-origin","permissions-policy":"camera=(), microphone=(), geolocation=(), payment=()",
   "cross-origin-opener-policy":"same-origin","strict-transport-security":"max-age=31536000; includeSubDomains"
 }});
 if(req.method!=="POST"||u.pathname!=="/lead")return json({error:"not_found"},404);
 const ct=req.headers.get("content-type")||"";if(!ct.toLowerCase().includes("application/json"))return json({message:"Solicitud inválida."},415);
 const len=Number(req.headers.get("content-length")||0);if(len>32768)return json({message:"Solicitud demasiado grande."},413);
 const origin=req.headers.get("Origin");if(origin&&origin!==new URL(ORIGIN).origin)return json({message:"Origen no permitido."},403);
 let b;try{b=await req.json()}catch{return json({message:"Solicitud inválida."},400)}
 const id=clean(b.idempotency_key,180),ch=b.challenge||{},nonce=clean(ch.nonce,180),sig=clean(ch.sig,180),ts=Number(ch.ts||0),n=Number(ch.n);
 if(!id||!nonce||!sig||!Number.isFinite(ts)||!Number.isFinite(n))return json({message:"No pudimos validar la solicitud."},422);
 if(Math.abs(Date.now()-ts)>300000)return json({message:"La verificación expiró. Intenta nuevamente."},422);
 const expected=await hmac(env.CHALLENGE_SECRET,`${id}.${nonce}.${ts}`);if(!(await same(sig,expected)))return json({message:"No pudimos validar la solicitud."},422);
 const proof=await sha(`${id}.${nonce}.${ts}.${sig}.${n}`);if(!proof.startsWith("000"))return json({message:"No pudimos validar la solicitud."},422);

 const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=clean(b.website,300)!=="";
 const first=clean(b.first_name,120),last=clean(b.last_name,120),em=clean(b.email,320).toLowerCase(),phone=clean(b.phone,40).replace(/[^0-9+]/g,"");
 const formId=clean(b.form_id,180),formName=clean(b.form_name,200),answers=(b.form_answers&&typeof b.form_answers==="object"&&!Array.isArray(b.form_answers))?b.form_answers:{};
 const isGate=formId==="pennyworth_chat_gate_v1"||formId==="pennyworth_whatsapp_gate_v1";
 const interest=clean(answers.interest,180),message=clean(answers.message,900),consent=answers.consent===true;
 let score=25;const reasons=["edge_pow_hmac"];
 if(first.length>=2)score+=10;else reasons.push("name_weak");
 if(phone.replace(/\D/g,"").length>=8)score+=20;else reasons.push("phone_weak");
 if(em&&validEmail(em))score+=15;else if(em)reasons.push("email_invalid");
 if(interest.length>=2)score+=5;else reasons.push("interest_missing");
 if(isGate&&interest.length>=2&&message.length>=3)score+=10;else if(isGate)reasons.push("form_content_weak");
 const dwell=Date.now()-Number(b.started_at||Date.now());
 if(dwell>=700)score+=10;else{score=Math.min(score,35);reasons.push("fast_submit")}
 if(isGate&&(!em||!validEmail(em)||phone.replace(/\D/g,"").length<8||!consent)){score=0;reasons.push("required_gate_fields_missing")}
 if(honey){score=0;reasons.push("honeypot")}
 const att=b.attribution||{};
 const payload={
   gate_key:GATE_KEY,idempotency_key:id,origin_url:ORIGIN,
   contact:{first_name:first,last_name:last,email:em,phone},
   form_id:formId||null,form_name:formName||null,
   form_answers:isGate?{channel:clean(answers.channel,40),interest,message,consent:true,distribution_target:"listia_subscriber_pool"}:(b.form_answers||null),
   attribution:{
     source_provider:clean(att.utm_source||"direct",80),campaign_id:clean(att.utm_campaign||"pennyworth-main",180),
     ad_group_id:clean(att.utm_content,180),ad_id:clean(att.ad_id,180),landing_url:ORIGIN,referrer:req.headers.get("Referer")||"",
     fbclid:clean(att.fbclid,300),gclid:clean(att.gclid,300)
   },
   security:{quality_score:Math.max(0,Math.min(100,score)),turnstile:true,honeypot:honey,ip_hash:await sha(ip||"unknown"),user_agent_hash:await sha(ua||"unknown"),reasons}
 };
 const r=await fetch(INTAKE,{method:"POST",headers:{"content-type":"application/json","x-cloudsales-edge-token":env.EDGE_TOKEN},body:JSON.stringify(payload)});
 const d=await r.json().catch(()=>({}));
 if(r.ok){
   const channel=clean(answers.channel,40);
   if(d?.status==="accepted"&&channel==="chat"&&d?.attempt_id&&d?.contact_id){
     const gp={v:1,host:u.hostname.toLowerCase(),attempt_id:d.attempt_id,contact_id:d.contact_id,iat:Date.now(),exp:Date.now()+300000,ua_hash:await sha(ua||"unknown")};
     const raw=b64url(JSON.stringify(gp));
     d.chat_grant=raw+"."+await hmac(env.EDGE_TOKEN,raw);
   }
   return json(d,r.status)
 }
 if(r.status===409)return json({status:"challenge",message:"Necesitamos una verificación adicional. Intenta nuevamente."},409);
 if(r.status===422)return json({status:"rejected",message:"No pudimos validar la solicitud. Revisa tus datos e intenta nuevamente."},422);
 return json({message:"No pudimos procesar la solicitud."},502)
}};
