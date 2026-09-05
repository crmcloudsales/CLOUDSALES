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
    eyebrow:'MENSAJERÍA Y PRODUCTIVIDAD',
    title:'Conecta mensajería y otras herramientas',
    description:'Conecta WhatsApp Business y productividad para que CloudSales pueda operar con el contexto y los permisos autorizados de tu negocio.',
    items:[
      ['whatsapp','WhatsApp','telnyx','whatsapp.com'],
      ['google_workspace','Google Workspace','google_workspace','google.com'],
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
  .csConnectCard.isPending{border-color:#69583a;background:linear-gradient(180deg,rgba(240,190,80,.04),#121019)}
  .csConnectLogo{width:57px;height:57px;border-radius:15px;background:#F3F4F8;display:grid;place-items:center;overflow:hidden;box-shadow:0 7px 20px rgba(0,0,0,.18);margin-bottom:11px}
  .csConnectLogo img{width:36px;height:36px;object-fit:contain}.csConnectName{min-width:0;width:100%}.csConnectName b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#F3F4F8}.csConnectName small{display:block;color:#8f8b99;font-size:9px;margin-top:4px}
  .csConnectStatus{position:absolute;top:8px;right:8px;border:1px solid #37684d;background:#173b29;color:#9af1c2;border-radius:999px;padding:5px 7px;font-size:8px;font-weight:950;line-height:1;box-shadow:0 4px 14px rgba(18,90,55,.22)}
  .csConnectStatus.pending{border-color:#6b5832;background:#2d2517;color:#f2cf80}
  .csConnectAction{margin-top:10px;border:1px solid #5b3551;background:#1a1520;color:#F3F4F8;border-radius:999px;padding:7px 10px;font-size:9px;font-weight:900;min-width:82px}.csConnectAction:hover{border-color:#F955B6}.csConnectAction:disabled{opacity:.48;cursor:default}
  .csConnectUnavailable{margin-top:10px;color:#777381;font-size:8px;font-weight:800}
  .csAccountConnect{margin-top:10px;width:100%}
  .csHlPrivateWrap{display:none;margin-top:16px}.csHlPrivateWrap.open{display:block}.csHlPrivateWrap .sectionHead{margin-top:0}
  .csTelnyxBackdrop{position:fixed;inset:0;z-index:180;background:rgba(4,3,8,.86);display:grid;place-items:center;padding:18px;backdrop-filter:blur(12px)}
  .csTelnyxModal{width:min(620px,100%);max-height:min(760px,calc(100dvh - 30px));overflow:auto;border:1px solid #43384a;background:#121019;border-radius:24px;padding:22px;box-shadow:0 30px 90px rgba(0,0,0,.55)}
  .csTelnyxHead{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.csTelnyxHead h2{margin:4px 0 7px;font-size:28px;letter-spacing:-.04em}.csTelnyxHead p{margin:0;color:#AAA7B2;font-size:12px;line-height:1.5}
  .csTelnyxClose{border:1px solid #37323F;background:#17141F;color:#fff;border-radius:999px;width:34px;height:34px}
  .csTelnyxField{display:grid;gap:6px;margin:15px 0}.csTelnyxField label{font-size:10px;color:#aaa}.csTelnyxField input{width:100%;border:1px solid #343443;border-radius:13px;background:#09090f;color:white;padding:13px;outline:none}.csTelnyxField input:focus{border-color:#72506f}
  .csTelnyxActions{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px}.csTelnyxActions button,.csTelnyxActions a{border:1px solid #44394a;background:#18151f;color:#fff;border-radius:999px;padding:10px 14px;font-size:11px;font-weight:900;text-decoration:none}.csTelnyxActions .primary{border:0;background:linear-gradient(135deg,#F955B6,#C13BE4)}
  .csTelnyxNote{border:1px solid #38303d;background:#17131b;border-radius:14px;padding:11px 12px;color:#bcb7c4;font-size:10px;line-height:1.5;margin-top:14px}.csTelnyxMsg{min-height:18px;margin-top:10px;font-size:11px}.csTelnyxMsg.ok{color:#9af1c2}.csTelnyxMsg.err{color:#ff98aa}
  @media(max-width:1040px){.csConnectCards{grid-template-columns:repeat(4,minmax(0,1fr))}}
  @media(max-width:800px){.csConnectCards{grid-template-columns:repeat(2,minmax(0,1fr))}.csConnectHero{align-items:flex-start;flex-direction:column}.csConnectCount{align-self:flex-start}}
  @media(max-width:560px){.csConnectShell{padding:12px;border-radius:21px}.csConnectTabs{gap:6px;margin-bottom:18px}.csConnectTab{min-height:54px;padding:9px 7px;gap:5px}.csConnectTabIcon{font-size:16px}.csConnectTabLabel{font-size:10px}.csConnectCards{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.csConnectCard{min-height:145px;padding:17px 8px 11px}.csConnectLogo{width:52px;height:52px}.csConnectLogo img{width:33px;height:33px}.csConnectStatus{top:6px;right:6px;padding:4px 6px;font-size:7px}.csTelnyxModal{padding:18px;border-radius:20px}}
  `;
  document.head.appendChild(s);
}

function favicon(domain){return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`}
function org(){try{return (typeof currentOrg!=='undefined'&&currentOrg)?currentOrg:window.currentOrg}catch{return window.currentOrg}}
function catalogProviders(){try{return (typeof catalog!=='undefined'&&catalog?.providers)||((typeof state!=='undefined'&&state?.providers)||[]) }catch{return []}}
function connection(provider){return (org()?.connections||[]).find(x=>x.provider_key===provider&&x.status==='connected')}
function providerAvailable(provider){
  if(provider==='highlevel'||provider==='telnyx')return true;
  const ps=catalogProviders();
  if(!ps?.length)return true;
  return ps.some(p=>String(p.provider_key||'')===provider);
}
function card(x){
  const [key,name,provider,domain]=x;
  const c=connection(provider),connected=!!c,available=providerAvailable(provider),isWhatsApp=key==='whatsapp'&&provider==='telnyx';
  const telnyxPending=provider==='telnyx'&&connected&&!c?.metadata?.webhook_public_key_configured;
  const telnyxConfigured=provider==='telnyx'&&connected&&c?.metadata?.webhook_public_key_configured;
  const cardClass=isWhatsApp&&connected?'isPending':telnyxPending?'isPending':connected?'isConnected':'';
  const status=isWhatsApp&&connected?'<span class="csConnectStatus pending">API conectada</span>':telnyxPending?'<span class="csConnectStatus pending">API conectada</span>':connected?'<span class="csConnectStatus">✓ Conectado</span>':'';
  const subtitle=isWhatsApp?(connected?'Continúa el alta de WhatsApp Business':'WhatsApp Business vía Telnyx'):connected?esc(c.external_account_name||'Cuenta conectada'):provider==='telnyx'?'SMS · WhatsApp · Voice':'Integración CloudSales';
  let action='';
  if(provider==='telnyx'&&connected)action=`<button class="csConnectAction" data-provider="telnyx" data-key="${esc(key)}">${isWhatsApp?'Continuar WhatsApp':telnyxConfigured?'Administrar':'Terminar configuración'}</button>`;
  else if(!connected)action=available?`<button class="csConnectAction" data-provider="${esc(provider)}" data-key="${esc(key)}">${isWhatsApp?'Conectar WhatsApp':'Conectar'}</button>`:'<span class="csConnectUnavailable">Próximamente</span>';
  return `<article class="csConnectCard ${cardClass}" data-key="${esc(key)}">
    ${status}
    <span class="csConnectLogo"><img loading="lazy" alt="" src="${favicon(domain)}" onerror="this.style.display='none'"></span>
    <span class="csConnectName"><b>${esc(name)}</b><small>${subtitle}</small></span>
    ${action}
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

async function ensureLegal(provider){
  if(typeof api!=='function')throw new Error('CloudSales API no disponible');
  let legal=await api('legal-api',{organization_id:org().id,action:'status'});
  if(!legal.required_complete){
    if(!confirm('Para conectar sistemas debes aceptar los Terms, Privacy y documentos de procesamiento requeridos. ¿Aceptar y continuar?'))return false;
    legal=await api('legal-api',{organization_id:org().id,action:'accept_required',accept:true});
  }
  const authz=legal.provider_authorizations?.find(x=>x.provider_key===provider&&!x.revoked_at);
  if(!authz){
    if(!confirm('Confirmo que tengo autoridad para conectar esta cuenta, autorizo el procesamiento de datos y el uso de IA/automatización bajo mis permisos.'))return false;
    await api('legal-api',{organization_id:org().id,action:'authorize_provider',provider_key:provider,authority_confirmed:true,data_processing_confirmed:true,ai_automation_confirmed:true,messaging_compliance_confirmed:true,advertising_policy_confirmed:true});
  }
  return true;
}

function closeTelnyx(){document.querySelector('.csTelnyxBackdrop')?.remove()}
function openTelnyx(mode='telnyx'){
  closeTelnyx();
  const isWhatsApp=mode==='whatsapp',c=connection('telnyx'),configured=!!c?.metadata?.webhook_public_key_configured;
  const el=document.createElement('div');el.className='csTelnyxBackdrop';
  el.innerHTML=`<div class="csTelnyxModal" role="dialog" aria-modal="true" aria-label="${isWhatsApp?'Conectar WhatsApp':'Conectar Telnyx'}">
    <div class="csTelnyxHead"><div><div class="csConnectEyebrow">CLOUDSALES COMMUNICATIONS</div><h2>${isWhatsApp?'Conectar WhatsApp':c?'Administrar Telnyx':'Conectar Telnyx'}</h2><p>${isWhatsApp?'CloudSales conecta WhatsApp Business mediante Telnyx. Conecta la API y después completa el Embedded Signup de Meta.':c?'La API de Telnyx ya está conectada. Termina o actualiza la verificación de webhooks.':'Conecta SMS, WhatsApp y, después del E2E, voz dentro del Communications Engine.'}</p></div><button class="csTelnyxClose" aria-label="Cerrar">×</button></div>
    ${c?'':`<div class="csTelnyxField"><label>Telnyx API Key</label><input id="csTelnyxApiKey" type="password" autocomplete="off" spellcheck="false" placeholder="KEY..."></div>`}
    <div class="csTelnyxField"><label>Telnyx Public Key (Ed25519) ${configured?'— ya configurada; déjala vacía si no quieres cambiarla':''}</label><input id="csTelnyxPublicKey" type="password" autocomplete="off" spellcheck="false" placeholder="Public Key de Keys & Credentials"></div>
    <div class="csTelnyxNote">${isWhatsApp?'Después de guardar la API, abre Telnyx Mission Control → Messaging → WhatsApp → Connect WhatsApp Business Account. Meta te pedirá iniciar sesión, elegir tu Business Manager/WABA y verificar el número. ':''}La API key se guarda en Vault y no se vuelve a mostrar. CloudSales usa la Public Key únicamente para validar la firma Ed25519 de los webhooks. El proveedor permanece desactivado para tráfico de producción hasta pasar las pruebas E2E.</div>
    <div id="csTelnyxMsg" class="csTelnyxMsg"></div>
    <div class="csTelnyxActions">
      <button id="csTelnyxSave" class="primary">${c?'Guardar configuración':isWhatsApp?'Conectar API de WhatsApp':'Conectar Telnyx'}</button>
      ${isWhatsApp?'<a href="https://portal.telnyx.com" target="_blank" rel="noopener">Abrir Embedded Signup de Meta</a>':'<a href="https://telnyx.com/agent-signup.md" target="_blank" rel="noopener">Crear cuenta / API key</a>'}
      <button id="csTelnyxCopyWebhook" type="button">Copiar webhook URL</button>
    </div>
  </div>`;
  document.body.appendChild(el);
  el.querySelector('.csTelnyxClose').onclick=closeTelnyx;
  el.addEventListener('click',e=>{if(e.target===el)closeTelnyx()});
  const msg=el.querySelector('#csTelnyxMsg'),save=el.querySelector('#csTelnyxSave');
  el.querySelector('#csTelnyxCopyWebhook').onclick=async()=>{
    const url='https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/connection-secret-setup';
    try{await navigator.clipboard.writeText(url);msg.className='csTelnyxMsg ok';msg.textContent='Webhook URL copiada.'}catch{msg.className='csTelnyxMsg err';msg.textContent=url}
  };
  save.onclick=async()=>{
    save.disabled=true;msg.className='csTelnyxMsg';msg.textContent='Validando con Telnyx y guardando de forma segura…';
    try{
      let conn=c;
      if(!conn){
        const key=String(el.querySelector('#csTelnyxApiKey')?.value||'').trim();
        if(!key)throw new Error('Pega la Telnyx API Key.');
        const d=await direct('connection-secret-setup',{organization_id:org().id,provider_key:'telnyx',action:'connect',api_key:key});
        el.querySelector('#csTelnyxApiKey').value='';
        conn=d.connection;
      }
      const publicKey=String(el.querySelector('#csTelnyxPublicKey')?.value||'').trim();
      if(publicKey){
        await direct('connection-secret-setup',{organization_id:org().id,provider_key:'telnyx',action:'configure_webhook_public_key',connection_id:conn.id,public_key:publicKey});
        el.querySelector('#csTelnyxPublicKey').value='';
      }
      if(typeof loadState==='function')await loadState();
      if(typeof loadCatalog==='function')await loadCatalog();
      msg.className='csTelnyxMsg ok';msg.textContent=isWhatsApp?'API lista. Ahora completa el Embedded Signup de Meta en Telnyx para registrar tu WABA y número.':publicKey?'Telnyx conectado y firma de webhooks configurada.':'Telnyx API conectada. Falta la Public Key para habilitar webhooks firmados.';
      if(!isWhatsApp)setTimeout(()=>{closeTelnyx();render()},650);else render();
    }catch(e){msg.className='csTelnyxMsg err';msg.textContent=e?.message||String(e)}
    finally{save.disabled=false}
  };
}

async function connect(provider,key=''){
  if(provider==='highlevel'&&document.getElementById('hlLocation')){legacyHighLevel(true);return}
  if(provider==='telnyx'){
    try{if(!connection('telnyx')&&!(await ensureLegal('telnyx')))return;openTelnyx(key==='whatsapp'?'whatsapp':'telnyx')}catch(e){alert(e?.message||String(e))}
    return;
  }
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
  if(grid.className!=='csConnectCenter')grid.className='csConnectCenter';
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
  grid.querySelectorAll('.csConnectAction').forEach(b=>b.onclick=()=>connect(b.dataset.provider,b.dataset.key||''));
  const title=document.getElementById('pageTitle');if(page.classList.contains('active')&&title)title.textContent='Conectar';
}

function account(){
  const page=document.getElementById('page-settings');if(!page)return;
  let c=page.querySelector('#csAccountConnect');
  if(!c){
    const cards=page.querySelector('.cards');if(!cards)return;
    c=document.createElement('div');c.className='card';c.id='csAccountConnect';
    c.innerHTML='<h3>Conectar</h3><p>Conecta redes sociales, CRM, WhatsApp, Google Workspace, Telegram y Notion desde tu cuenta.</p><button class="btn primary csAccountConnect">Administrar conexiones</button>';
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
  const page=document.getElementById('page-connect');
  if(!page)return;
  const obs=new MutationObserver(mutations=>{
    const grid=document.getElementById('connectGrid');
    let needsRender=false;
    for(const m of mutations){
      if(m.type==='attributes'&&m.target===page&&m.attributeName==='class')needsRender=true;
      if(m.type==='childList'&&grid&&(m.target===grid||grid.contains(m.target))&&!grid.querySelector('.csConnectShell'))needsRender=true;
    }
    if(needsRender&&page.classList.contains('active'))render();
  });
  obs.observe(page,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();