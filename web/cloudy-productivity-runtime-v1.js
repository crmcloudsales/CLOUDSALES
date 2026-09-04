(()=>{
'use strict';
const ID='cs-cloudy-productivity-v1';
const CLOUDY_IMG='/assets/marketing/cloudy-official.webp';
const WAKE_ALIASES=['cloudy','claudy','claudi','clody','clowdy'];
let wakeRec=null,wakeArmed=false,wakeRestartTimer=null;
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function firstName(){
 try{const n=String(state?.user?.full_name||session?.user?.user_metadata?.full_name||session?.user?.user_metadata?.name||'').trim();if(n)return n.split(/\s+/)[0]}catch{}
 try{const e=String(state?.user?.email||session?.user?.email||'').trim();if(e)return e.split('@')[0].replace(/[._-]+/g,' ').split(/\s+/)[0]}catch{}
 return '';
}
function org(){try{return currentOrg||null}catch{return null}}
function snap(){try{return snapshot||{}}catch{return {}}}
function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function dateOf(x){return String(x?.start_at||x?.start_time||x?.scheduled_for||x?.date||x?.created_at||'')}
function counts(){
 const s=snap(),today=todayISO();
 const ap=Array.isArray(s.appointments)?s.appointments:[];
 const op=Array.isArray(s.opportunities)?s.opportunities:[];
 const ev=Array.isArray(s.events)?s.events:[];
 const appointmentsToday=ap.filter(x=>dateOf(x).slice(0,10)===today).length;
 const openOpps=op.filter(x=>!['won','lost','closed'].includes(String(x?.status||x?.stage||'').toLowerCase())).length;
 let pending=0,activeJobs=0,approvals=0;
 try{const c=(state?.organizations||[]).find(x=>x.id===org()?.id)?.cloudy;pending=Number(c?.counts?.open_support_cases||0)+Number(c?.recent_failures?.length||0);activeJobs=Number(c?.counts?.active_jobs||0);approvals=Number(c?.counts?.pending_approvals||0)}catch{}
 return {appointmentsToday,openOpps,pending,activeJobs,approvals,recentEvents:ev.length};
}
function css(){if(document.getElementById(ID+'-css'))return;const s=document.createElement('style');s.id=ID+'-css';s.textContent=`
#page-cloudy .messages,#page-cloudy .composer textarea,#page-cloudy #sendCloudy,#page-cloudy .csCloudyHint{display:none!important}
#page-cloudy .cloudyPanel{display:block!important;height:auto!important;min-height:calc(100vh - 130px)!important;background:transparent!important;border:0!important;overflow:visible!important}
#page-cloudy .cloudyTop{display:none!important}
.cpWrap{display:grid;gap:14px;padding:2px 0 28px}.cpHero{position:relative;overflow:hidden;border:1px solid #382c42;border-radius:26px;padding:22px;background:radial-gradient(620px 300px at 82% -5%,#7b285b55,transparent 67%),linear-gradient(145deg,#17131d,#0d0d14)}
.cpTop{display:flex;align-items:center;gap:14px}.cpFace{width:76px;height:76px;border-radius:50%;overflow:hidden;border:1px solid #8e4e83;background:#15131a;box-shadow:0 0 0 7px #f955b60c,0 10px 38px #0008;flex:0 0 auto}.cpFace img{width:112%;height:112%;object-fit:cover;object-position:center 38%;transform:translate(-5%,-6%) scale(1.04);display:block}.cpTitle{min-width:0}.cpEyebrow{font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#ff78c5}.cpTitle h1{margin:5px 0 5px;font-size:clamp(25px,5vw,42px);letter-spacing:-.045em;line-height:1}.cpTitle p{margin:0;color:#aaa6b4;font-size:12px;line-height:1.45}.cpMicRow{display:flex;align-items:center;gap:11px;margin-top:18px;flex-wrap:wrap}.cpTalk{width:72px;height:72px;border:0;border-radius:50%;background:linear-gradient(145deg,#C13BE4,#F955B6);color:#fff;font-size:28px;box-shadow:0 0 0 7px #f955b615,0 14px 34px #c13a9b45;cursor:pointer}.cpTalk[data-live="1"]{animation:cpPulse 1.15s ease-in-out infinite}.cpWake{font-size:11px;color:#9c98a5;line-height:1.5}.cpWake b{color:#fff}.cpWakeState{display:inline-block;margin-top:4px;color:#f48ac8;font-size:10px}.cpGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:9px}.cpMetric,.cpCard{border:1px solid #292836;background:#111019;border-radius:18px;padding:14px}.cpMetric b{display:block;font-size:25px;letter-spacing:-.04em}.cpMetric span{display:block;margin-top:4px;color:#8f8b99;font-size:10px}.cpCards{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:9px}.cpCard h3{margin:0 0 5px;font-size:13px}.cpCard p{margin:0;color:#8d8998;font-size:10px;line-height:1.45}.cpActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}.cpAction{border:1px solid #403446;background:#17131c;color:#eee;border-radius:999px;padding:8px 10px;font-size:10px;font-weight:800;cursor:pointer}.cpAction.primary{background:#F955B6;border-color:#F955B6;color:#fff}.cpNote{border:1px solid #2a2835;background:#0e0e15;border-radius:18px;padding:14px}.cpNote b{font-size:12px}.cpNote div{margin-top:6px;color:#8d8998;font-size:10px;line-height:1.45}.csCloudyNav img,.cpNavFace{width:34px;height:34px;border-radius:50%;object-fit:cover;object-position:center 37%;transform:translateY(-3px) scale(1.09);display:block;margin:auto}
@keyframes cpPulse{50%{transform:scale(1.06);box-shadow:0 0 0 13px #f955b617,0 14px 38px #c13a9b66}}
@media(max-width:820px){.cpGrid{grid-template-columns:repeat(3,1fr)}.cpCards{grid-template-columns:1fr 1fr}.cpCards .cpCard:first-child{grid-column:1/-1}}
@media(max-width:560px){.cpHero{padding:17px;border-radius:21px}.cpFace{width:66px;height:66px}.cpGrid{grid-template-columns:1fr 1fr}.cpCards{grid-template-columns:1fr}.cpCards .cpCard:first-child{grid-column:auto}.cpTalk{width:78px;height:78px}.cpTitle h1{font-size:28px}}
`;document.head.appendChild(s)}
function nativeSpeak(text){
 if(!('speechSynthesis' in window))return false;
 try{window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(text));u.lang=(document.documentElement.lang||'es-MX').startsWith('es')?'es-MX':document.documentElement.lang||'es-MX';u.rate=.98;u.pitch=.92;const voices=speechSynthesis.getVoices();const preferred=voices.find(v=>/es[-_](MX|US)/i.test(v.lang)&&/male|jorge|diego|raul|carlos|pablo/i.test(v.name))||voices.find(v=>/^es/i.test(v.lang));if(preferred)u.voice=preferred;speechSynthesis.speak(u);return true}catch{return false}
}
function greeting(){const n=firstName();return n?`${n}, ¿cómo estás? ¿Ya listo para seguir dándole? Dime, ¿en qué te ayudo?`:'¿Cómo estás? ¿Ya listo para seguir dándole? Dime, ¿en qué te ayudo?'}
function clickMic(){const m=document.getElementById('micBtn');if(m){m.click();const b=$('.cpTalk');if(b)b.dataset.live='1';setTimeout(()=>{if(b)b.dataset.live='0'},1800);return true}return false}
function command(text){
 try{if(typeof go==='function')go('cloudy')}catch{}
 setTimeout(()=>{const input=document.getElementById('cloudyInput'),send=document.getElementById('sendCloudy');if(input&&send){input.value=text;send.click()}},70)
}
function lastCloudyNote(){
 try{const k=`cs_cloudy_transcript:${org()?.id||''}`,rows=JSON.parse(localStorage.getItem(k)||'[]');const last=[...rows].reverse().find(x=>x.role!=='user');return last?.content||'Las notas de voz y decisiones de Cloudy se conservan por organización.'}catch{return 'Las notas de voz y decisiones de Cloudy se conservan por organización.'}
}
function render(){
 const page=document.getElementById('page-cloudy');if(!page)return false;css();
 let root=document.getElementById(ID);if(!root){root=document.createElement('div');root.id=ID;root.className='cpWrap';page.insertBefore(root,page.firstChild)}
 const c=counts(),n=firstName();root.innerHTML=`
 <section class="cpHero"><div class="cpTop"><div class="cpFace"><img src="${CLOUDY_IMG}" alt="Cloudy"></div><div class="cpTitle"><div class="cpEyebrow">Cloudy · Tu centro de control</div><h1>${esc(n?`Vamos con todo, ${n}.`:'Vamos con todo.')}</h1><p>Qué importa hoy, qué está pendiente, dónde están las oportunidades y cuál es el siguiente paso.</p></div></div><div class="cpMicRow"><button class="cpTalk" type="button" aria-label="Hablar con Cloudy">◉</button><div class="cpWake"><b>Habla con Cloudy.</b><br>Toca una vez o, después de autorizar el micrófono, di “Cloudy”.<br><span class="cpWakeState" id="cpWakeState">Activación por voz en primer plano: lista para habilitar.</span></div></div></section>
 <section class="cpGrid"><div class="cpMetric"><b>${c.appointmentsToday}</b><span>Citas hoy</span></div><div class="cpMetric"><b>${c.openOpps}</b><span>Oportunidades abiertas</span></div><div class="cpMetric"><b>${c.approvals}</b><span>Esperando aprobación</span></div><div class="cpMetric"><b>${c.activeJobs}</b><span>Trabajos en curso</span></div><div class="cpMetric"><b>${c.pending}</b><span>Atención requerida</span></div></section>
 <section class="cpCards"><div class="cpCard"><h3>Qué hacemos hoy</h3><p>Cloudy revisa operación, ventas, marketing, citas y pendientes y te devuelve la ruta de mayor impacto.</p><div class="cpActions"><button class="cpAction primary" data-cp-command="Dame mi brief ejecutivo de hoy. Dime qué cambió, qué requiere atención, mis citas, oportunidades, pendientes y las cinco acciones de mayor impacto. Ejecuta lo seguro que esté permitido y marca claramente lo que necesite mi aprobación.">Mi brief de hoy</button><button class="cpAction" data-cp-command="¿Cuál es la acción más importante que debo hacer ahora mismo y por qué? Revisa mis datos actuales antes de responder.">¿Qué hago ahora?</button></div></div><div class="cpCard"><h3>Oportunidades</h3><p>${c.openOpps?`Hay ${c.openOpps} oportunidades abiertas registradas.`:'No hay oportunidades abiertas visibles en el snapshot actual.'}</p><div class="cpActions"><button class="cpAction" data-cp-command="Revisa mis oportunidades abiertas. Ordénalas por probabilidad e impacto y dime cuáles debo mover hoy.">Priorizar</button></div></div><div class="cpCard"><h3>Citas y pendientes</h3><p>${c.appointmentsToday?`Tienes ${c.appointmentsToday} cita(s) registrada(s) para hoy.`:'No hay citas de hoy visibles en el snapshot actual.'}</p><div class="cpActions"><button class="cpAction" data-cp-command="Revisa mi agenda de hoy, mis pendientes y seguimientos. Organízalos por hora, urgencia e impacto.">Organizar mi día</button></div></div></section>
 <section class="cpNote"><b>Última nota de Cloudy</b><div>${esc(lastCloudyNote()).slice(0,460)}</div></section>`;
 root.querySelector('.cpTalk')?.addEventListener('click',async()=>{nativeSpeak(greeting());localStorage.setItem('cs_cloudy_wake_consent','1');setTimeout(()=>clickMic(),650);startWakeWord()});
 root.querySelectorAll('[data-cp-command]').forEach(b=>b.addEventListener('click',()=>command(b.dataset.cpCommand)));
 patchNav();return true
}
function patchNav(){document.querySelectorAll('[data-page="cloudy"],[data-go="cloudy"]').forEach(b=>{if(b.dataset.cpFace)return;b.dataset.cpFace='1';const bold=b.querySelector('b');if(bold)bold.innerHTML=`<img class="cpNavFace" src="${CLOUDY_IMG}" alt="">`;b.addEventListener('click',()=>setTimeout(render,40))})}
function normalized(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z ]/g,' ')}
function startWakeWord(){
 if(wakeArmed||localStorage.getItem('cs_cloudy_wake_consent')!=='1')return;
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){const el=$('#cpWakeState');if(el)el.textContent='Este navegador no ofrece activación por palabra; usa el botón de voz.';return}
 wakeArmed=true;wakeRec=new SR();wakeRec.continuous=true;wakeRec.interimResults=true;wakeRec.lang=(document.documentElement.lang||'es-MX').startsWith('es')?'es-MX':document.documentElement.lang||'en-US';
 wakeRec.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){const t=normalized(e.results[i][0]?.transcript);if(WAKE_ALIASES.some(a=>t.split(/\s+/).includes(a))){try{wakeRec.stop()}catch{};nativeSpeak(greeting());try{if(typeof go==='function')go('cloudy')}catch{};setTimeout(()=>clickMic(),850);break}}};
 wakeRec.onerror=e=>{if(['not-allowed','service-not-allowed'].includes(String(e.error))){localStorage.removeItem('cs_cloudy_wake_consent');wakeArmed=false;const el=$('#cpWakeState');if(el)el.textContent='Autoriza el micrófono tocando Cloudy para activar la palabra de llamada.'}};
 wakeRec.onend=()=>{if(!wakeArmed)return;clearTimeout(wakeRestartTimer);wakeRestartTimer=setTimeout(()=>{try{wakeRec.start()}catch{}},700)};
 try{wakeRec.start();const el=$('#cpWakeState');if(el)el.textContent='Escuchando “Cloudy” mientras CloudSales está abierto.'}catch{}
}
function boot(){let tries=0;const timer=setInterval(()=>{tries++;const ok=render();patchNav();if(ok&&localStorage.getItem('cs_cloudy_wake_consent')==='1')startWakeWord();if(ok||tries>50)clearInterval(timer)},140);window.addEventListener('focus',()=>{render();startWakeWord()});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){render();startWakeWord()}})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();