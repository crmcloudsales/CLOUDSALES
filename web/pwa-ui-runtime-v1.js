(()=>{
'use strict';
const ID='cs-pwa-ui-v1';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state=()=>document.documentElement.dataset.cloudyState||'idle';
let lastUser='';
let workTimer=null;

function css(){
 if(document.getElementById(ID+'-css'))return;
 const s=document.createElement('style');s.id=ID+'-css';s.textContent=`
 :root{--cs-bg:#0F0D15;--cs-panel:#17131F;--cs-panel2:#121019;--cs-pink:#F955B6;--cs-magenta:#E34DC9;--cs-violet:#B735D2;--cs-white:#F3F4F8;--cs-muted:#9F9DA6;--cs-line:#3B3142;--cs-green:#78DFA4}
 html.cs-native-app body{background:var(--cs-bg)!important}
 .csNBottom{background:rgba(15,13,21,.965)!important;border-color:#3B3142!important}
 .csNBottom button.active{background:#201329!important}
 .csNBottom .csNCloudy{background:transparent!important;box-shadow:none!important;overflow:visible!important;animation:none!important;transform:translateY(-16px)!important}
 .csNCloudy .csCloudyHead{background-image:none!important;background:#0E0B14!important;width:64px!important;height:64px!important;border-radius:50%!important;border:1px solid rgba(249,85,182,.7)!important;box-shadow:0 0 0 5px rgba(15,13,21,.96),0 8px 28px rgba(249,85,182,.26),inset 0 0 30px rgba(183,53,210,.16)!important;position:relative;display:grid!important;place-items:center!important;overflow:hidden!important}
 .csNCloudy .csCloudyHead:before{content:'';width:42px;height:42px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff 0 3%,#F955B6 10%,#B735D2 36%,#351246 62%,#0B0810 76%);box-shadow:0 0 18px rgba(249,85,182,.48);animation:csOrbIdle 2.2s ease-in-out infinite}
 .csNCloudy .csCloudyHead:after{content:'';position:absolute;width:34px;height:16px;left:15px;top:24px;background:repeating-linear-gradient(90deg,transparent 0 3px,rgba(243,244,248,.9) 3px 5px,transparent 5px 8px);mask:linear-gradient(#000 0 0);opacity:.62;animation:csOrbWave 1.35s ease-in-out infinite alternate;transform-origin:center}
 html[data-cloudy-state="listening"] .csNCloudy .csCloudyHead,html[data-cloudy-state="speaking"] .csNCloudy .csCloudyHead{border-color:#F955B6!important;box-shadow:0 0 0 5px rgba(15,13,21,.96),0 0 0 9px rgba(249,85,182,.12),0 0 34px rgba(249,85,182,.55)!important}
 html[data-cloudy-state="listening"] .csNCloudy .csCloudyHead:before{animation:csOrbListen .62s ease-in-out infinite alternate}
 html[data-cloudy-state="speaking"] .csNCloudy .csCloudyHead:before{animation:csOrbSpeak .42s ease-in-out infinite alternate}
 html[data-cloudy-state="thinking"] .csNCloudy .csCloudyHead:before,html[data-cloudy-state="transcribing"] .csNCloudy .csCloudyHead:before{animation:csOrbThink .85s linear infinite}
 @keyframes csOrbIdle{0%,100%{transform:scale(.9);filter:saturate(.9)}50%{transform:scale(1.04);filter:saturate(1.15)}}
 @keyframes csOrbListen{from{transform:scale(.82)}to{transform:scale(1.08)}}
 @keyframes csOrbSpeak{from{transform:scale(.86) rotate(-2deg)}to{transform:scale(1.12) rotate(2deg)}}
 @keyframes csOrbThink{to{transform:rotate(360deg)}}
 @keyframes csOrbWave{from{transform:scaleY(.45);opacity:.4}to{transform:scaleY(1.35);opacity:.92}}
 .csNMoreFloat svg circle{fill:currentColor;stroke:none}
 .csNMoreTop{position:relative!important;justify-content:center!important;text-align:center!important;min-height:38px}.csNMoreTop h3{width:100%;text-align:center!important;margin:0!important;padding:0 44px!important}.csNMoreTop .csNClose{position:absolute!important;right:0!important;top:0!important}.csNMoreGrid button{text-align:center!important;justify-items:center!important}.csNMoreGrid button .csNIcon{margin:auto!important}
 .csCloudyHead:not(.csNCloudy .csCloudyHead){background-position:50% 22%!important}
 .csCloudyWorkSurface{position:relative;margin:0 0 12px;border:1px solid rgba(249,85,182,.28);background:radial-gradient(520px 180px at 100% 0,rgba(249,85,182,.10),transparent 72%),linear-gradient(180deg,#17131F,#100D16);border-radius:20px;padding:14px;overflow:hidden;box-shadow:0 14px 42px rgba(0,0,0,.20)}
 .csCloudyWorkSurface:before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(#F955B6,#B735D2)}
 .csWorkTop{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px}.csWorkTitle{font-size:13px;font-weight:900;color:#F3F4F8}.csWorkState{font-size:10px;color:#F955B6;font-weight:850}.csWorkSub{font-size:11px;color:#9F9DA6;line-height:1.42;margin-top:3px}
 .csWorkEmail{display:grid;gap:7px}.csWorkField{border:1px solid #332B39;background:#0E0B14;border-radius:13px;padding:9px 10px}.csWorkField span{display:block;font-size:9px;color:#817D89;text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px}.csWorkField b,.csWorkField div{font-size:11px;color:#EAE7EF;line-height:1.45;font-weight:700}.csWorkBody{min-height:62px}.csWorkSkeleton{height:8px;border-radius:99px;background:linear-gradient(90deg,#2A2230 25%,#503048 45%,#2A2230 65%);background-size:220% 100%;animation:csWorkLoad 1.1s linear infinite;margin:7px 0}.csWorkSkeleton:nth-child(2){width:88%}.csWorkSkeleton:nth-child(3){width:73%}@keyframes csWorkLoad{to{background-position:-220% 0}}
 .csWorkSteps{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.csWorkStep{border:1px solid #332B39;background:#121019;color:#AAA7B2;border-radius:999px;padding:6px 8px;font-size:9px}.csWorkStep.active{border-color:rgba(249,85,182,.45);color:#F3F4F8}.csWorkStep.done{border-color:#315B43;color:#78DFA4}
 .csWorkResult{border-top:1px solid #2E2935;margin-top:10px;padding-top:9px;font-size:11px;color:#C9C5D0;line-height:1.45}
 @media(max-width:560px){.csCloudyWorkSurface{border-radius:17px;padding:12px}.csWorkTitle{font-size:13px}.csWorkSub,.csWorkField b,.csWorkField div,.csWorkResult{font-size:12px}.csWorkState{font-size:11px}}
 `;document.head.appendChild(s);
}

function verticalDots(){
 const b=document.getElementById('csNativeMoreButton');if(!b)return;
 if(b.dataset.vertical==='1')return;b.dataset.vertical='1';
 b.innerHTML='<span class="csNIcon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></span>';
}

function ensureOrb(){
 const b=document.querySelector('#csNativeBottom .csNCloudy');if(!b)return;
 const h=b.querySelector('.csCloudyHead');if(h){h.removeAttribute('style');h.setAttribute('aria-hidden','true')}
 b.setAttribute('aria-label','Hablar con Cloudy');
}

function voiceClick(ev){
 const b=ev.target.closest?.('#csNativeBottom .csNCloudy');if(!b)return;
 ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
 const mic=document.getElementById('micBtn');
 if(mic){mic.click();return}
}

function intent(text){
 const q=String(text||'').toLowerCase();
 if(/correo|email|e-mail|mail/.test(q))return{page:'inbox',kind:'email',title:'Cloudy está trabajando en el email'};
 if(/campañ|marketing|publicidad|anuncio|contenido|post|social/.test(q))return{page:'marketing',kind:'marketing',title:'Cloudy está trabajando en Marketing'};
 if(/lead|prospect|cliente|contacto/.test(q))return{page:'leads',kind:'leads',title:'Cloudy está trabajando con tus leads'};
 if(/cita|agenda|calendar|reuni/.test(q))return{page:'calendar',kind:'calendar',title:'Cloudy está trabajando en tu agenda'};
 if(/crm|conect|whatsapp|telegram|notion|integr/.test(q))return{page:'connect',kind:'connect',title:'Cloudy está revisando tus conexiones'};
 if(/pipeline|oportunidad|venta/.test(q))return{page:'pipeline',kind:'pipeline',title:'Cloudy está trabajando en tu pipeline'};
 return{page:null,kind:'general',title:'Cloudy está trabajando'};
}

function emailFrom(text){const m=String(text||'').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);return m?m[0]:'Buscando destinatario…'}
function routePage(page){if(!page)return;try{if(typeof window.csNativeRoute==='function'){window.csNativeRoute(page);return}}catch{}try{if(typeof go==='function')go(page)}catch{}}
function targetPage(page){return document.getElementById('page-'+(page||''))||document.querySelector('.page.active')}
function ensureWork(text){
 lastUser=text;const meta=intent(text);if(meta.page)routePage(meta.page);
 clearTimeout(workTimer);workTimer=setTimeout(()=>{
  const page=targetPage(meta.page);if(!page)return;
  page.querySelector('#csCloudyWorkSurface')?.remove();
  const x=document.createElement('section');x.id='csCloudyWorkSurface';x.className='csCloudyWorkSurface';x.dataset.kind=meta.kind;
  if(meta.kind==='email')x.innerHTML=`<div class="csWorkTop"><div><div class="csWorkTitle">${E(meta.title)}</div><div class="csWorkSub">La interfaz es de solo lectura para ti mientras Cloudy ejecuta la tarea.</div></div><div class="csWorkState">Trabajando…</div></div><div class="csWorkEmail"><div class="csWorkField"><span>Para</span><b>${E(emailFrom(text))}</b></div><div class="csWorkField"><span>Asunto</span><div>Preparando asunto…</div></div><div class="csWorkField csWorkBody"><span>Mensaje</span><div class="csWorkSkeleton"></div><div class="csWorkSkeleton"></div><div class="csWorkSkeleton"></div></div></div><div class="csWorkSteps"><span class="csWorkStep done">Entender orden</span><span class="csWorkStep active">Preparar</span><span class="csWorkStep">Validar</span><span class="csWorkStep">Ejecutar</span></div>`;
  else x.innerHTML=`<div class="csWorkTop"><div><div class="csWorkTitle">${E(meta.title)}</div><div class="csWorkSub">${E(text.slice(0,180))}</div></div><div class="csWorkState">Trabajando…</div></div><div class="csWorkSteps"><span class="csWorkStep done">Entender orden</span><span class="csWorkStep active">Revisar contexto</span><span class="csWorkStep">Ejecutar</span><span class="csWorkStep">Confirmar</span></div>`;
  const host=page.querySelector('.csNativeScreen')||page;host.prepend(x);
  x.scrollIntoView({behavior:'smooth',block:'start'});
 },80);
}

function finishWork(reply){
 const x=document.getElementById('csCloudyWorkSurface');if(!x)return;
 const status=x.querySelector('.csWorkState');if(status)status.textContent='Listo';
 x.querySelectorAll('.csWorkStep').forEach(s=>{s.classList.remove('active');s.classList.add('done')});
 if(x.dataset.kind==='email'){
  const body=x.querySelector('.csWorkBody');if(body)body.innerHTML=`<span>Resultado</span><div>${E(String(reply||'').slice(0,700))}</div>`;
 }else{
  const r=document.createElement('div');r.className='csWorkResult';r.textContent=String(reply||'').slice(0,700);x.appendChild(r);
 }
}

function watchConversation(){
 const box=document.getElementById('messages');if(!box||box.dataset.csWorkWatch==='1')return;box.dataset.csWorkWatch='1';
 new MutationObserver(ms=>{for(const m of ms){for(const n of m.addedNodes){if(!(n instanceof HTMLElement)||!n.classList.contains('msg'))continue;const text=(n.textContent||'').trim();if(!text)continue;if(n.classList.contains('user'))ensureWork(text);else if(n.classList.contains('cloudy'))finishWork(text)}}}).observe(box,{childList:true});
}

function centerMore(){const top=document.querySelector('.csNMoreTop h3');if(top)top.textContent='Más herramientas';}
function boot(){css();verticalDots();ensureOrb();centerMore();watchConversation();document.addEventListener('click',voiceClick,true);const mo=new MutationObserver(()=>{verticalDots();ensureOrb();centerMore();watchConversation()});mo.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
