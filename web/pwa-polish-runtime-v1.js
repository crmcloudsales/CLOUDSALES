(()=>{
'use strict';
const ID='cs-pwa-native-compat-v3';
const MOBILE=()=>matchMedia('(max-width:860px)').matches;
const LOGO='/cloudsales-logo-official-v2.png';
const EVENT_LABELS={
  pipeline_contacted:'Contactado',
  pipeline_new_lead:'Nuevo lead',
  pipeline_new_leads:'Nuevos leads',
  pipeline_qualified:'Calificado',
  pipeline_appointment:'Cita agendada',
  pipeline_appointment_booked:'Cita agendada',
  pipeline_won:'Ganado',
  pipeline_lost:'Perdido',
  contact_created:'Nuevo lead',
  opportunity_created:'Nueva oportunidad',
  appointment_scheduled:'Cita agendada'
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function css(){if(document.getElementById(ID+'-css'))return;document.querySelectorAll('[id^="cs-pwa-native-compat-v"][id$="-css"]').forEach(x=>x.remove());const s=document.createElement('style');s.id=ID+'-css';s.textContent=`
@media(max-width:860px){
html.cs-native-app .csNativeLegacy{display:none!important}
html.cs-native-app .content,html.cs-native-app .page,html.cs-native-app .csNativeScreen{min-height:0!important}
html.cs-native-app button,html.cs-native-app input,html.cs-native-app textarea,html.cs-native-app select{font-family:inherit}
html.cs-native-app .csNHeader p,html.cs-native-app .csNHero p,html.cs-native-app .csNRow p,html.cs-native-app .csNRow b,html.cs-native-app .csNEmpty,html.cs-native-app .csNCloudyHero p,html.cs-native-app .csNBadge,html.cs-native-app .csNTabs button,html.cs-native-app .csNQuick button,html.cs-native-app .csNBtn,html.cs-native-app .csNKpi span,html.cs-native-app .csNMeta,html.cs-native-app .csNInventoryToolbar input,html.cs-native-app .csNCloudyFallback summary,html.cs-native-app .csNMoreGrid button,html.cs-native-app .csNBottom button,html.cs-native-app .csNBottom small{font-size:12px!important}
html.cs-native-app .csNHero p,html.cs-native-app .csNHeader p{line-height:1.5!important}
html.cs-native-app .csNRow p{line-height:1.42!important}
html.cs-native-app .topbar{height:72px!important;min-height:72px!important;padding:0 18px!important;border-bottom-color:rgba(249,85,182,.16)!important;background:rgba(8,7,13,.96)!important}
html.cs-native-app .pageTitle{display:flex!important;align-items:center!important;min-width:0!important}
html.cs-native-app .pageTitle .csTopLogo{display:block;width:auto!important;height:28px!important;max-width:170px!important;object-fit:contain!important}
html.cs-native-app .topActions{gap:9px!important}
html.cs-native-app .topActions .csTopCloudyDuplicate{display:none!important}
html.cs-native-app .topActions button,html.cs-native-app .topActions select{min-height:42px!important;font-size:12px!important}
html.cs-native-app .content{height:calc(100dvh - 72px - 92px - env(safe-area-inset-bottom))!important;max-height:calc(100dvh - 72px - 92px - env(safe-area-inset-bottom))!important;margin-top:14px!important;margin-bottom:0!important}
html.cs-native-app .csNPane{padding-bottom:30px!important;scroll-padding-bottom:30px!important}
html.cs-native-app .page.active:not(#page-home):not(#page-inventory):not(#page-cloudy):not(#page-marketing){padding-bottom:30px!important;scroll-padding-bottom:30px!important}
html.cs-native-app .csNQuick{gap:9px!important;margin-top:14px!important}
html.cs-native-app .csNQuick button,html.cs-native-app .csNBtn{min-height:42px!important;padding:11px 15px!important;border-color:rgba(193,59,228,.38)!important;background:linear-gradient(180deg,rgba(45,10,74,.78),rgba(23,20,31,.98))!important;color:#F3F4F8!important}
html.cs-native-app .csNQuick button:first-child,html.cs-native-app .csNBtn.primary{min-height:46px!important;padding:12px 18px!important;background:linear-gradient(135deg,#F955B6 0%,#C13BE4 58%,#2D0A4A 125%)!important;border:0!important;box-shadow:0 8px 22px rgba(249,85,182,.20)!important;font-weight:900!important}
html.cs-native-app .csNTabs{gap:8px!important}
html.cs-native-app .csNTabs button{min-height:40px!important;padding:10px 15px!important;background:#17141F!important;border-color:rgba(45,10,74,.9)!important;color:#C9C5D0!important}
html.cs-native-app .csNTabs button.active{background:linear-gradient(135deg,rgba(45,10,74,.96),rgba(249,85,182,.22))!important;border-color:#F955B6!important;color:#F3F4F8!important;box-shadow:inset 0 0 0 1px rgba(249,85,182,.08)!important}
html.cs-native-app .csNKpi,html.cs-native-app .csNRow{background:linear-gradient(145deg,#121019,#17141F)!important;border-color:rgba(193,59,228,.24)!important}
html.cs-native-app .csNKpi span{color:#AAA7B2!important;letter-spacing:.04em!important}
html.cs-native-app .csNRow b{font-weight:850!important;color:#F3F4F8!important}
html.cs-native-app .csNBottom{bottom:max(12px,env(safe-area-inset-bottom))!important;height:76px!important;padding:7px 8px 7px!important;background:rgba(12,9,17,.98)!important;border-color:rgba(193,59,228,.28)!important}
html.cs-native-app .csNBottom button:not(.csNCloudy){height:60px!important;min-height:60px!important;color:#AAA7B2!important}
html.cs-native-app .csNBottom button:not(.csNCloudy).active{background:linear-gradient(180deg,rgba(45,10,74,.9),rgba(23,20,31,.96))!important;color:#F3F4F8!important}
html.cs-native-app .csNBottom .csNCloudy{transform:translateY(-16px)!important;width:68px!important;height:68px!important;background:linear-gradient(135deg,#F955B6,#C13BE4)!important;box-shadow:0 10px 30px rgba(249,85,182,.42),0 0 0 5px rgba(8,7,13,.95)!important}
html.cs-native-app .csNCloudy .csCloudyHead{width:60px!important;height:60px!important;background-size:268%!important;background-position:50% 0%!important;border:2px solid rgba(255,255,255,.86)!important}
html.cs-native-app .csNCloudy small{top:68px!important;font-size:12px!important;color:#F3F4F8!important}
html.cs-native-app .csNBottom button{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
/* Inventory is a live mirror of the sellable website catalog: title, price, description only. */
html.cs-native-app #page-inventory #csNativeInventory>.csNTabs{display:none!important}
html.cs-native-app #page-inventory .csNInventoryToolbar{display:none!important}
html.cs-native-app #page-inventory .csNHeader p{max-width:310px!important}
html.cs-native-app #csWebsiteInventory{display:grid;gap:10px;padding-bottom:34px}
html.cs-native-app .csWebsiteItem{border:1px solid rgba(193,59,228,.24);background:linear-gradient(145deg,#121019,#17141F);border-radius:18px;padding:15px}
html.cs-native-app .csWebsiteItemTop{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
html.cs-native-app .csWebsiteItem h3{margin:0;color:#F3F4F8;font-size:16px;line-height:1.25;letter-spacing:-.02em}
html.cs-native-app .csWebsitePrice{flex:0 0 auto;color:#F955B6;font-size:13px;font-weight:900;white-space:nowrap}
html.cs-native-app .csWebsiteItem p{margin:8px 0 0;color:#AAA7B2;font-size:12px;line-height:1.5}
}
`;document.head.appendChild(s)}
function lang(){const l=document.documentElement.lang||document.documentElement.dataset.csLocale||navigator.language||'es-MX';const m={'es':'es-MX','en':'en-US','fr':'fr-FR','it':'it-IT','pt':'pt-BR','de':'de-DE','ar':'ar-AE','ru':'ru-RU','he':'he-IL','zh':'zh-CN','ja':'ja-JP'};return m[String(l).split('-')[0]]||l}
let wake=null,wakeOn=false,restartTimer=null;
function supported(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function activeUser(){try{return Boolean(session?.access_token&&currentOrg?.id&&!document.hidden&&MOBILE())}catch{return false}}
function startWake(){const SR=supported();if(!SR||wakeOn||!activeUser())return;try{wake=new SR();wake.lang=lang();wake.continuous=true;wake.interimResults=false;wake.maxAlternatives=1;wake.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){const text=String(e.results[i]?.[0]?.transcript||'').toLocaleLowerCase();if(/\bcloudy\b/i.test(text)){try{window.csNativeRoute?.('cloudy')}catch{}setTimeout(()=>document.getElementById('cloudyMic')?.click(),220);break}}};wake.onend=()=>{wakeOn=false;if(activeUser())restartTimer=setTimeout(startWake,1400)};wake.onerror=()=>{};wake.start();wakeOn=true}catch{wakeOn=false}}
function stopWake(){clearTimeout(restartTimer);restartTimer=null;if(wakeOn){try{wake?.stop()}catch{}}wakeOn=false;wake=null}
function syncWake(){if(activeUser())startWake();else stopWake()}
function normalizeHeader(){if(!MOBILE())return;const title=document.querySelector('.topbar .pageTitle,.pageTitle');if(title&&!title.querySelector('.csTopLogo')){title.textContent='';const img=document.createElement('img');img.className='csTopLogo';img.src=LOGO;img.alt='CloudSales';title.appendChild(img)}document.querySelectorAll('.topbar .topActions button,.topbar .topActions a,.topActions button,.topActions a').forEach(el=>{const t=String(el.textContent||'').trim().toLocaleLowerCase();if(t.includes('hablar con cloudy')||t==='talk to cloudy'||t==='speak with cloudy'){el.classList.add('csTopCloudyDuplicate');el.setAttribute('aria-hidden','true');el.tabIndex=-1}})}
function normalizeEvents(){if(!MOBILE())return;document.querySelectorAll('#csHomePane .csNRow b').forEach(el=>{const raw=String(el.textContent||'').trim();const key=raw.toLocaleLowerCase().replace(/[\s.-]+/g,'_');if(EVENT_LABELS[key])el.textContent=EVENT_LABELS[key];else if(/^pipeline_/.test(key)){el.textContent=key.replace(/^pipeline_/,'').split('_').filter(Boolean).map((w,i)=>i? w : w.charAt(0).toUpperCase()+w.slice(1)).join(' ')}})}
function websiteVisible(x){const a=x?.attributes&&typeof x.attributes==='object'?x.attributes:{};return Boolean(x?.public_slug||a.website_url||a.url||a.published===true||a.website_published===true||a.public===true||a.visible_on_website===true)}
function sellableType(x){const t=String(x?.item_type||'').toLowerCase();return !t||/(product|service|property|offer|package|membership|course)/.test(t)}
function priceLabel(x){const c=String(x?.currency||'USD').toUpperCase();const min=x?.price_min==null||x?.price_min===''?null:Number(x.price_min);const max=x?.price_max==null||x?.price_max===''?null:Number(x.price_max);const fmt=n=>Number(n).toLocaleString(lang(),{maximumFractionDigits:2});if(Number.isFinite(min)&&Number.isFinite(max)&&min!==max)return `${c} ${fmt(min)} – ${fmt(max)}`;if(Number.isFinite(min))return `${c} ${fmt(min)}`;if(Number.isFinite(max))return `${c} ${fmt(max)}`;return 'Precio por consultar'}
function briefDescription(x){const raw=String(x?.short_description||x?.description||'').replace(/\s+/g,' ').trim();if(!raw)return 'Sin descripción publicada.';return raw.length>220?raw.slice(0,217).trimEnd()+'…':raw}
let inventoryBusy=false,inventoryOrg='',inventoryAt=0;
async function renderWebsiteInventory(force=false){if(!MOBILE()||inventoryBusy)return;const page=document.getElementById('page-inventory');if(!page?.classList.contains('active'))return;let org=null;try{org=currentOrg?.id||null}catch{}if(!org||typeof api!=='function')return;if(!force&&inventoryOrg===org&&Date.now()-inventoryAt<10000)return;const root=document.getElementById('csNativeInventory');const pane=root?.querySelector('#csInvPane');if(!root||!pane)return;inventoryBusy=true;try{const h=root.querySelector('.csNHeader p');if(h)h.textContent='Productos y servicios publicados en tu sitio web para vender hoy.';pane.innerHTML='<div class="csNEmpty">Actualizando lo que estás vendiendo…</div>';const d=await api('workspace-api',{organization_id:org,action:'inventory.snapshot'});const items=Array.isArray(d?.items)?d.items.filter(x=>websiteVisible(x)&&sellableType(x)):[];const badge=root.querySelector('#csInvBadge');if(badge)badge.textContent=`${items.length} publicados`;pane.innerHTML=items.length?`<div id="csWebsiteInventory">${items.map(x=>`<article class="csWebsiteItem"><div class="csWebsiteItemTop"><h3>${esc(x.name||'Sin título')}</h3><div class="csWebsitePrice">${esc(priceLabel(x))}</div></div><p>${esc(briefDescription(x))}</p></article>`).join('')}</div>`:'<div class="csNEmpty">No detecté productos o servicios publicados en tu sitio web. Cuando publiques uno, aparecerá aquí automáticamente.</div>';inventoryOrg=org;inventoryAt=Date.now()}catch{pane.innerHTML='<div class="csNEmpty">No pude actualizar tu inventario ahora. CloudSales volverá a intentarlo cuando abras esta sección.</div>'}finally{inventoryBusy=false}}
function normalizeLegacy(){if(!MOBILE())return;document.querySelectorAll('.csNativeLegacy').forEach(x=>x.style.display='none');document.querySelectorAll('[data-page="cloudy"] b,.sidebar [data-page="cloudy"] .navicon').forEach(x=>{if(/[☁☂]/.test(x.textContent||''))x.textContent='AI'});normalizeHeader();normalizeEvents();renderWebsiteInventory()}
function normalizeSoon(){setTimeout(normalizeLegacy,40);setTimeout(normalizeLegacy,180);setTimeout(normalizeLegacy,500)}
function boot(){css();normalizeLegacy();normalizeSoon();document.addEventListener('visibilitychange',()=>{syncWake();if(!document.hidden){inventoryAt=0;normalizeSoon()}});window.addEventListener('focus',()=>{syncWake();inventoryAt=0;normalizeSoon()});window.addEventListener('blur',stopWake);document.addEventListener('click',e=>{if(e.target.closest('#csNativeBottom,[data-page],.csNTabs,.csNQuick,.topbar')){if(e.target.closest('[data-csn="inventory"],[data-page="inventory"]'))inventoryAt=0;normalizeSoon()}});setTimeout(syncWake,1200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
