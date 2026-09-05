(()=>{
'use strict';
const ID='cs-connect-center-v2';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const tabs={
  social:{
    label:'Redes sociales',
    eyebrow:'REDES SOCIALES',
    title:'Conecta tus redes sociales',
    description:'Autoriza los canales que CloudSales y Cloudy podrán usar para contenido, conversaciones y señales de marketing.',
    items:[
      ['facebook','Facebook','zernio','facebook.com'],
      ['instagram','Instagram','zernio','instagram.com'],
      ['tiktok','TikTok','buffer','tiktok.com'],
      ['youtube','YouTube','youtube','youtube.com'],
      ['linkedin','LinkedIn','buffer','linkedin.com'],
      ['google_business','Google My Business','google_business_profile','business.google.com'],
      ['threads','Threads','buffer','threads.net'],
      ['x','X (Twitter)','buffer','x.com']
    ]
  },
  crm:{
    label:'CRM',
    eyebrow:'CRM',
    title:'Conecta tu CRM',
    description:'Elige tu integración de CRM. CloudSales mantiene cada autorización separada por organización y solo usa los permisos aprobados.',
    items:[
      ['highlevel','HighLevel','highlevel','gohighlevel.com'],
      ['hubspot','HubSpot','hubspot','hubspot.com'],
      ['twenty','Twenty','twenty','twenty.com'],
      ['salesforce','Salesforce','salesforce','salesforce.com'],
      ['zoho','Zoho CRM','zoho','zoho.com'],
      ['pipedrive','Pipedrive','pipedrive','pipedrive.com'],
      ['freshsales','Freshsales','freshsales','freshworks.com'],
      ['monday','Monday CRM','monday_crm','monday.com'],
      ['copper','Copper','copper','copper.com'],
      ['clientify','Clientify','clientify','clientify.com']
    ]
  },
  other:{
    label:'Otros',
    eyebrow:'OTROS',
    title:'Conecta otras herramientas',
    description:'Conecta mensajería y productividad para que CloudSales pueda operar con el contexto autorizado de tu negocio.',
    items:[
      ['whatsapp','WhatsApp','meta_whatsapp','whatsapp.com'],
      ['telegram','Telegram','telegram_messaging','telegram.org'],
      ['notion','Notion','notion','notion.so']
    ]
  }
};

function css(){
  if(document.getElementById(ID+'-css'))return;
  const s=document.createElement('style');
  s.id=ID+'-css';
  s.textContent=`
  .csConnectCenter{display:grid;gap:18px}
  .csConnectShell{border:1px solid #3b3443;background:radial-gradient(620px 260px at 50% -30%,rgba(249,85,182,.11),transparent 74%),#101018;border-radius:26px;padding:18px;box-shadow:0 18px 60px rgba(0,0,0,.22)}
  .csConnectTabs{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:22px}
  .csConnectTab{position:relative;border:1px solid #383341;background:#15131d;color:#b9b6c1;border-radius:15px;min-height:58px;padding:10px 14px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:9px;transition:.16s ease}
  .csConnectTab:hover{border-color:#5a4b5e;color:#fff;transform:translateY(-1px)}
  .csConnectTab[data-tab="social"].active{color:#fff;border-color:#5269d6;background:linear-gradient(135deg,rgba(47,86,191,.78),rgba(48,44,126,.9));box-shadow:0 10px 28px rgba(57,87,210,.15)}
  .csConnectTab[data-tab="crm"].active{color:#fff;border-color:#c448a7;background:linear-gradient(135deg,rgba(105,54,203,.9),rgba(249,85,182,.88));box-shadow:0 10px 28px rgba(249,85,182,.15)}
  .csConnectTab[data-tab="other"].active{color:#fff;border-color:#2e9588;background:linear-gradient(135deg,rgba(21,117,109,.85),rgba(32,88,95,.9));box-shadow:0 10px 28px rgba(46,149,136,.12)}
  .csConnectTabIcon{font-size:18px;line-height:1}.csConnectTabLabel{font-size:13px}
  .csConnectHero{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin:0 3px 15px}
  .csConnectHeroText{min-width:0}.csConnectEyebrow{font-size:9px;letter-spacing:.14em;color:#F955B6;font-weight:950;margin-bottom:7px}
  .csConnectHero h2{font-size:clamp(27px,4vw,42px);letter-spacing:-.045em;line-height:1;margin:0;color:#F3F4F8}.csConnectHero p{max-width:760px;margin:8px 0 0;color:#AAA7B2;font-size:12px;line-height:1.55}
  .csConnectCount{white-space:nowrap;border:1px solid #34303b;background:#17141f;color:#AAA7B2;border-radius:999px;padding:7px 10px;font-size:9px;font-weight:850}
  .csConnectCards{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
  .csConnectCard{position:relative;min-height:155px;border:1px solid #37323F;background:linear-gradient(180deg,#17141F,#121019);border-radius:18px;padding:18px 13px 13px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow:hidden;transition:.16s ease}
  .csConnectCard:hover{border-color:#55445a;transform:translateY(-2px);box-shadow:0 14px 34px rgba(0,0,0,.18)}
  .csConnectCard.isConnected{border-color:#315B43;background:linear-gradient(180deg,rgba(93,230,162,.055),#121019)}
  .csConnectLogo{width:57px;height:57px;border-radius:15px;background:#F3F4F8;display:grid;place-items:center;overflow:hidden;box-shadow:0 7px 20px rgba(0,0,0,.18);margin-bottom:11px}
  .csConnectLogo img{width:36px;height:36px;object-fit:contain}.csConnectName{min-width:0;width:100%}.csConnectName b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#F3F4F8}.csConnectName small{display:block;color:#8f8b99;font-size:9px;margin-top:4px}
  .csConnectStatus{position:absolute;top:8px;right:8px;border:1px solid #37684d;background:#173b29;color:#9af1c2;border-radius:999px;padding:5px 7px;font-size:8px;font-weight:950;line-height:1;box-shadow:0 4px 14px rgba(18,90,55,.22)}
  .csConnectAction{margin-top:10px;border:1px solid #5b3551;background:#1a1520;color:#F3F4F8;border-radius:999px;padding:7px 10px;font-size:9px;font-weight:900;min-width:82px}.csConnectAction:hover{border-color:#F955B6}.csConnectAction:disabled{opacity:.48;cursor:default}
  .csConnectUnavailable{margin-top:10px;color:#777381;font-size:8px;font-weight:800}
  .csAccountConnect{margin-top:10px;width:100%}
  .csHlPrivateWrap{display:none;margin-top:16px}.csHlPrivateWrap.open{display:block}.csHlPrivateWrap .sectionHead{margin-top:0}
  @media(max-width:1040px){.csConnectCards{grid-template-columns:repeat(4,minmax(0,1fr))}}
  @media(max-width:800px){.csConnectCards{grid-template-columns:repeat(2,minmax(0,1fr))}.csConnectHero{align-items:flex-start;flex-direction:column}.csConnectCount{align-self:flex-start}}
  @media(max-width:560px){.csConnectShell{padding:12px;border-radius:21px}.csConnectTabs{gap:6px;margin-bottom:18px}.csConnectTab{min-height:54px;padding:9px 7px;gap:5px}.csConnectTabIcon{font-size:16px}.csConnectTabLabel{font-size:10px}.csConnectCards{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.csConnectCard{min-height:145px;padding:17px 8px 11px}.csConnectLogo{width:52px;height:52px}.csConnectLogo img{width:33px;height:33px}.csConnectStatus{top:6px;right:6px;padding:4px 6px;font-size:7px}}
  `;
  document.head.appendChild(s);
}

function favicon(domain){return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`}
function org(){try{return (typeof currentOrg!=='undefined'&&currentOrg)?currentOrg:window.currentOrg}catch{return window.currentOrg}}
function catalogProviders(){try{return (typeof catalog!=='undefined'&&catalog?.providers)||((typeof state!=='undefined'&&state?.providers)||[]) }catch{return []}}
function connection(provider){return (org()?.connections||[]).find(x=>x.provider_key===provider&&x.status==='connected')}
function providerAvailable(provider){
  if(provider==='highlevel')return true;
  const ps=catalogProviders();
  if(!ps?.length)return true;
  return ps.some(p=>String(p.provider_key||'')===provider);
}
function card(x){
  const [key,name,provider,domain]=x;
  const c=connection(provider),connected=!!c,available=providerAvailable(provider);
  return `<article class="csConnectCard ${connected?'isConnected':''}" data-key="${esc(key)}">
    ${connected?'<span class="csConnectStatus">✓ Conectado</span>':''}
    <span class="csConnectLogo"><img loading="lazy" alt="" src="${favicon(domain)}" onerror="this.style.display='none'"></span>
    <span class="csConnectName"><b>${esc(name)}</b><small>${connected?esc(c.external_account_name||'Cuenta conectada'):'Integración CloudSales'}</small></span>
    ${connected?'':available?`<button class="csConnectAction" data-provider="${esc(provider)}">Conectar</button>`:'<span class="csConnectUnavailable">Próximamente</span>'}
  </article>`;
}

let activeTab='crm';
try{const saved=localStorage.getItem('cs_connect_tab');if(tabs[saved])activeTab=saved}catch{}

function legacyHighLevel(show=false){
  const page=document.getElementById('page-connect');
  if(!page)return;
  const card=document.getElementById('hlLocation')?.closest('.card');
  const head=card?.previousElementSibling;
  if(!card)return;
  let wrap=page.querySelector('.csHlPrivateWrap');
  if(!wrap){
    wrap=document.createElement('div');wrap.className='csHlPrivateWrap';
    if(head)wrap.appendChild(head);wrap.appendChild(card);
    page.appendChild(wrap);
  }
  wrap.classList.toggle('open',!!show);
  if(show)setTimeout(()=>wrap.scrollIntoView({behavior:'smooth',block:'center'}),30);
}

function connect(provider){
  if(provider==='highlevel'&&document.getElementById('hlLocation')){legacyHighLevel(true);return}
  try{
    if(typeof connectProvider==='function'){connectProvider(provider);return}
    if(typeof window.connectProvider==='function'){window.connectProvider(provider);return}
  }catch{}
  alert('Esta integración todavía necesita habilitar su flujo de autorización.');
}

function render(){
  const page=document.getElementById('page-connect'),grid=document.getElementById('connectGrid');
  if(!page||!grid)return;
  css();legacyHighLevel(false);
  const t=tabs[activeTab];
  const connected=t.items.filter(x=>connection(x[2])).length;
  grid.className='csConnectCenter';
  grid.innerHTML=`<div class="csConnectShell">
    <div class="csConnectTabs" role="tablist" aria-label="Tipos de conexión">
      <button class="csConnectTab ${activeTab==='social'?'active':''}" data-tab="social" role="tab" aria-selected="${activeTab==='social'}"><span class="csConnectTabIcon">◫</span><span class="csConnectTabLabel">Redes sociales</span></button>
      <button class="csConnectTab ${activeTab==='crm'?'active':''}" data-tab="crm" role="tab" aria-selected="${activeTab==='crm'}"><span class="csConnectTabIcon">●●</span><span class="csConnectTabLabel">CRM</span></button>
      <button class="csConnectTab ${activeTab==='other'?'active':''}" data-tab="other" role="tab" aria-selected="${activeTab==='other'}"><span class="csConnectTabIcon">•••</span><span class="csConnectTabLabel">Otros</span></button>
    </div>
    <div class="csConnectHero"><div class="csConnectHeroText"><div class="csConnectEyebrow">${esc(t.eyebrow)}</div><h2>${esc(t.title)}</h2><p>${esc(t.description)}</p></div><span class="csConnectCount">${connected}/${t.items.length} conectados</span></div>
    <div class="csConnectCards">${t.items.map(card).join('')}</div>
  </div>`;
  grid.querySelectorAll('.csConnectTab').forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab;try{localStorage.setItem('cs_connect_tab',activeTab)}catch{}render()});
  grid.querySelectorAll('.csConnectAction').forEach(b=>b.onclick=()=>connect(b.dataset.provider));
  const title=document.getElementById('pageTitle');if(page.classList.contains('active')&&title)title.textContent='Conectar';
}

function account(){
  const page=document.getElementById('page-settings');if(!page)return;
  let c=page.querySelector('#csAccountConnect');
  if(!c){
    const cards=page.querySelector('.cards');if(!cards)return;
    c=document.createElement('div');c.className='card';c.id='csAccountConnect';
    c.innerHTML='<h3>Conectar</h3><p>Conecta redes sociales, tu CRM, WhatsApp, Telegram y Notion desde tu cuenta.</p><button class="btn primary csAccountConnect">Administrar conexiones</button>';
    cards.prepend(c);
  }
  const b=c.querySelector('button');if(b)b.onclick=()=>{try{if(typeof go==='function'){go('connect');return}}catch{}location.hash='#connect';document.querySelector('[data-page="connect"]')?.click()};
}

function relabel(){
  document.querySelectorAll('[data-page="connect"]').forEach(el=>{
    if(el.closest('.sidebar')){const icon=el.querySelector('.navicon');el.innerHTML='';if(icon)el.appendChild(icon);el.appendChild(document.createTextNode('Conectar'))}
    else if(el.closest('.bottomnav')){const b=el.querySelector('b');el.innerHTML='';if(b)el.appendChild(b);el.appendChild(document.createTextNode('Conectar'))}
  });
}

function boot(){
  css();relabel();account();render();
  const obs=new MutationObserver(()=>{
    account();relabel();
    const p=document.getElementById('page-connect');
    if(p?.classList.contains('active'))render();
  });
  obs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();