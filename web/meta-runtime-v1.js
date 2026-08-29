(() => {
  'use strict';

  const VERSION='2026.08.29.1';
  const FN='https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/';
  let initializedOrg=null;
  let accountsState=null;
  let campaigns=[];
  let busy=false;

  const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=(v,c='USD')=>`${e(c)} ${Number(v||0).toLocaleString(undefined,{maximumFractionDigits:2})}`;
  const n=v=>Number(v||0).toLocaleString();

  async function call(action,input={}){
    if(typeof session==='undefined'||!session?.access_token) throw new Error('session_required');
    if(typeof currentOrg==='undefined'||!currentOrg?.id) throw new Error('organization_required');
    const r=await fetch(FN+'cloudy-core-command',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+session.access_token},body:JSON.stringify({organization_id:currentOrg.id,action,input})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw Object.assign(new Error(d.error||`request_${r.status}`),{status:r.status,data:d});
    return d.output||{};
  }

  function friendly(err){
    const s=String(err?.message||err||'');
    if(s.includes('meta_connection_required'))return 'Meta todavía no está conectado a este workspace.';
    if(s.includes('meta_ad_account_selection_required'))return 'Selecciona primero la cuenta publicitaria de Meta.';
    if(s.includes('meta_ad_account_not_authorized'))return 'La cuenta seleccionada ya no está autorizada por Meta.';
    if(s.includes('meta_budget_multiple_adsets_requires_scope'))return 'Esta campaña usa presupuesto por varios conjuntos de anuncios. Selecciona el conjunto que deseas modificar.';
    if(s.includes('owner_or_admin_required'))return 'Solo un Owner o Admin puede cambiar presupuesto o crear campañas.';
    if(s.includes('insufficient_role'))return 'Tu rol no permite ejecutar esta acción.';
    return s.replace(/^meta_request_failed(?::\d+){0,2}:/,'Meta: ')||'No se pudo completar la operación.';
  }

  function styles(){
    if(document.getElementById('cs-meta-runtime-css'))return;
    const s=document.createElement('style');s.id='cs-meta-runtime-css';s.textContent=`
      .csMeta{margin:18px 0;border:1px solid #34273a;border-radius:24px;background:radial-gradient(600px 240px at 85% -20%,#3d143b55,transparent 70%),linear-gradient(180deg,#12121b,#0c0c13);padding:18px}
      .csMetaTop{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.csMetaTop h3{margin:0;font-size:20px}.csMetaTop p{margin:5px 0 0;color:#9291a2;font-size:12px;line-height:1.45}.csMetaBadge{border:1px solid #403048;border-radius:999px;padding:7px 10px;font-size:10px;color:#e0b7dc;white-space:nowrap}
      .csMetaTools{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.csMetaSelect{min-width:220px;max-width:100%;background:#0d0d14;color:#fff;border:1px solid #383847;border-radius:12px;padding:10px 12px}.csMetaGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:12px 0}.csMetaMetric{border:1px solid #2e2e3b;border-radius:15px;padding:12px;background:#0f0f17}.csMetaMetric b{display:block;font-size:21px}.csMetaMetric span{font-size:9px;color:#8c8b9c;text-transform:uppercase;letter-spacing:.07em}
      .csMetaList{display:grid;gap:9px}.csMetaCampaign{border:1px solid #2e2e3b;border-radius:17px;padding:13px;background:#101018}.csMetaCampaignTop{display:flex;justify-content:space-between;gap:10px}.csMetaCampaign b{font-size:13px}.csMetaCampaign small{display:block;color:#8d8c9c;margin-top:4px;line-height:1.45}.csMetaActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.csMetaStatus{font-size:9px;border:1px solid #333342;border-radius:999px;padding:5px 7px;height:max-content}.csMetaStatus.active{color:#8fe5af;border-color:#255b3a}.csMetaStatus.paused{color:#f2cf8b;border-color:#665226}.csMetaNotice{border:1px solid #333342;border-radius:14px;padding:11px;color:#a5a4b3;font-size:11px;line-height:1.5;margin-top:10px}.csMetaError{border-color:#6a2e46;color:#ff9fbc}.csMetaBudgetInput{width:130px;max-width:100%;background:#090910;color:#fff;border:1px solid #383847;border-radius:10px;padding:9px}
      @media(max-width:760px){.csMetaGrid{grid-template-columns:1fr 1fr}.csMetaTop{flex-direction:column}.csMetaCampaignTop{flex-direction:column}.csMetaSelect{width:100%}}
    `;document.head.appendChild(s);
  }

  function root(){
    const page=document.getElementById('page-marketing');if(!page)return null;
    let r=document.getElementById('csMetaControl');
    if(!r){r=document.createElement('section');r.id='csMetaControl';r.className='csMeta';const anchor=document.getElementById('csMarketingOps');if(anchor)anchor.insertAdjacentElement('afterend',r);else page.prepend(r);}
    return r;
  }

  function statusClass(v){return String(v||'').toLowerCase()==='active'?'active':'paused'}

  function render(){
    const r=root();if(!r)return;
    if(!accountsState){r.innerHTML='<div class="csMetaNotice">Cargando Meta Ads…</div>';return;}
    const selected=accountsState.selected_ad_account_id||'';
    const account=accountsState.accounts?.find(x=>x.id===selected)||null;
    const totalSpend=campaigns.reduce((a,x)=>a+Number(x.spend||0),0),totalLeads=campaigns.reduce((a,x)=>a+Number(x.leads||0),0),active=campaigns.filter(x=>x.status==='active').length;
    r.innerHTML=`<div class="csMetaTop"><div><h3>Meta Ads</h3><p>Cuenta, campañas, presupuesto y estado real del proveedor desde CloudSales.</p></div><span class="csMetaBadge">${e(accountsState.connected?'Connected':'Not connected')}</span></div>
      <div class="csMetaTools"><select class="csMetaSelect" id="csMetaAccount"><option value="">Selecciona cuenta publicitaria</option>${(accountsState.accounts||[]).map(a=>`<option value="${e(a.id)}" ${a.id===selected?'selected':''}>${e(a.name||a.id)} · ${e(a.currency||'')}</option>`).join('')}</select><button class="btn small" id="csMetaSync" ${selected?'':'disabled'}>Sincronizar Meta</button><button class="btn primary small" id="csMetaCreate" ${selected?'':'disabled'}>+ Crear campaña</button></div>
      <div class="csMetaGrid"><div class="csMetaMetric"><b>${n(campaigns.length)}</b><span>Campañas Meta</span></div><div class="csMetaMetric"><b>${n(active)}</b><span>Activas</span></div><div class="csMetaMetric"><b>${account?money(totalSpend,account.currency):'—'}</b><span>Gasto 30d</span></div><div class="csMetaMetric"><b>${n(totalLeads)}</b><span>Leads 30d</span></div><div class="csMetaMetric"><b>${account?e(account.currency):'—'}</b><span>Moneda</span></div><div class="csMetaMetric"><b>${account?e(account.timezone_name||'—'):'—'}</b><span>Zona horaria</span></div></div>
      ${!selected?'<div class="csMetaNotice">PENNYWORTH tiene más de una cuenta publicitaria disponible. Selecciona la correcta una sola vez; CloudSales la recordará para Gerardo y Luis.</div>':''}
      <div class="csMetaList">${campaigns.length?campaigns.map(c=>campaignCard(c,account)).join(''):`<div class="csMetaNotice">${selected?'Toca “Sincronizar Meta” para traer las campañas reales.':'Selecciona una cuenta para continuar.'}</div>`}</div>
      <div id="csMetaMessage"></div>`;
    bind(account);
  }

  function campaignCard(c,account){
    const meta=c.metadata||{},scope=meta.meta_budget_scope||'none',budget=c.daily_budget!=null?`${money(c.daily_budget,c.currency)} / día`:c.lifetime_budget!=null?`${money(c.lifetime_budget,c.currency)} total`:'Sin presupuesto directo';
    const multiple=scope==='multiple_adsets';
    const adsets=Array.isArray(meta.meta_adsets)?meta.meta_adsets:[];
    return `<article class="csMetaCampaign" data-id="${e(c.id)}"><div class="csMetaCampaignTop"><div><b>${e(c.name)}</b><small>${e(c.objective||'')} · ${e(budget)} · ${money(c.spend,c.currency)} gastado · ${n(c.leads)} leads</small></div><span class="csMetaStatus ${statusClass(c.status)}">${e(c.status)}</span></div>
      <div class="csMetaActions"><button class="btn small csMetaToggle" data-id="${e(c.id)}" data-status="${e(c.status)}">${c.status==='active'?'Pausar':'Activar'}</button>${!multiple?`<button class="btn small csMetaBudget" data-id="${e(c.id)}">Presupuesto</button>`:''}${multiple?`<select class="csMetaSelect csMetaAdset" data-id="${e(c.id)}"><option value="">Presupuesto por conjunto…</option>${adsets.filter(a=>a.daily_budget!=null||a.lifetime_budget!=null).map(a=>`<option value="${e(a.id)}">${e(a.name)} · ${a.daily_budget!=null?money(a.daily_budget,c.currency)+'/día':money(a.lifetime_budget,c.currency)}</option>`).join('')}</select><button class="btn small csMetaAdsetBudget" data-id="${e(c.id)}">Cambiar conjunto</button>`:''}</div></article>`;
  }

  function note(text,error=false){const x=document.getElementById('csMetaMessage');if(x)x.innerHTML=`<div class="csMetaNotice ${error?'csMetaError':''}">${e(text)}</div>`;}

  function bind(account){
    const a=document.getElementById('csMetaAccount');if(a)a.onchange=async()=>{if(!a.value)return;await act(async()=>{await call('ads.meta.account.select',{account_id:a.value});accountsState=await call('ads.meta.accounts');campaigns=[];render();note('Cuenta publicitaria guardada. Toca Sincronizar Meta.');});};
    document.getElementById('csMetaSync')?.addEventListener('click',()=>act(sync));
    document.getElementById('csMetaCreate')?.addEventListener('click',createCampaign);
    document.querySelectorAll('.csMetaToggle').forEach(b=>b.addEventListener('click',()=>act(async()=>{const action=b.dataset.status==='active'?'ads.meta.pause':'ads.meta.resume';const out=await call(action,{id:b.dataset.id});note(`Meta confirmó: ${out.provider_status}.`);await sync();})));
    document.querySelectorAll('.csMetaBudget').forEach(b=>b.addEventListener('click',()=>budgetPrompt(b.dataset.id,null,account)));
    document.querySelectorAll('.csMetaAdsetBudget').forEach(b=>b.addEventListener('click',()=>{const sel=document.querySelector(`.csMetaAdset[data-id="${CSS.escape(b.dataset.id)}"]`);if(!sel?.value)return note('Selecciona primero el conjunto de anuncios.',true);budgetPrompt(b.dataset.id,sel.value,account);}));
  }

  async function act(fn){if(busy)return;busy=true;try{await fn();}catch(err){note(friendly(err),true);}finally{busy=false;}}

  async function sync(){
    note('Leyendo campañas, presupuesto y resultados directamente de Meta…');
    const out=await call('ads.meta.sync',{});campaigns=out.campaigns||[];render();note(`Meta sincronizado: ${campaigns.length} campaña(s).`);
  }

  function budgetPrompt(id,budgetObjectId,account){
    const campaign=campaigns.find(x=>x.id===id),current=campaign?.daily_budget||'';
    const value=prompt(`Nuevo presupuesto diario en ${account?.currency||campaign?.currency||'USD'}:`,String(current||''));if(value===null)return;
    const amount=Number(value);if(!Number.isFinite(amount)||amount<=0)return note('Escribe un presupuesto válido mayor que cero.',true);
    if(!confirm(`CloudSales cambiará el presupuesto REAL en Meta a ${amount} ${account?.currency||campaign?.currency||'USD'} por día y verificará el resultado. ¿Continuar?`))return;
    act(async()=>{note('Actualizando presupuesto real en Meta…');const out=await call('ads.meta.budget',{id,daily_budget:amount,...(budgetObjectId?{budget_object_id:budgetObjectId}:{})});note(`Confirmado por Meta: ${money(out.provider?.daily_budget,out.provider?.currency)} / día.`);await sync();});
  }

  function createCampaign(){
    const name=prompt('Nombre de la nueva campaña en Meta:','PENNYWORTH | Leads | Website');if(!name?.trim())return;
    if(!confirm('Se creará únicamente la campaña contenedora en Meta en estado PAUSED. No gastará dinero hasta completar conjunto de anuncios, creativo y anuncio. ¿Continuar?'))return;
    act(async()=>{note('Creando campaña pausada en Meta…');const out=await call('ads.meta.create_campaign',{name:name.trim(),objective:'OUTCOME_LEADS'});note(`Meta confirmó la campaña “${out.provider_campaign?.name||name}” en estado ${out.provider_campaign?.status||'PAUSED'}.`);await sync();});
  }

  async function load(){
    if(typeof currentOrg==='undefined'||!currentOrg?.id||typeof session==='undefined'||!session?.access_token)return;
    if(initializedOrg!==currentOrg.id){initializedOrg=currentOrg.id;accountsState=null;campaigns=[];}
    const r=root();if(!r)return;
    if(!accountsState){render();try{accountsState=await call('ads.meta.accounts');render();}catch(err){r.innerHTML=`<div class="csMetaTop"><div><h3>Meta Ads</h3><p>Control de campañas y presupuesto.</p></div></div><div class="csMetaNotice csMetaError">${e(friendly(err))}</div>`;}}
  }

  function hook(){
    document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.page==='marketing')setTimeout(load,80)}));
    window.addEventListener('hashchange',()=>{if(location.hash.includes('marketing'))setTimeout(load,80)});
    document.getElementById('orgSelect')?.addEventListener('change',()=>{initializedOrg=null;setTimeout(load,120)});
    window.addEventListener('focus',()=>{if(location.hash.includes('marketing'))setTimeout(load,80)});
  }

  function boot(attempt=0){
    if(typeof currentOrg!=='undefined'&&currentOrg?.id&&typeof session!=='undefined'&&session?.access_token){load();return;}
    if(attempt<40)setTimeout(()=>boot(attempt+1),250);
  }

  function start(){styles();hook();boot();document.documentElement.dataset.metaRuntime=VERSION;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();