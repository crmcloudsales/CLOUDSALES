(() => {
  'use strict';

  const RUNTIME = '2026.08.28.1';
  const FN = 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/';
  let ops = null;
  let loading = false;
  let initializedOrg = null;

  const e = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n = (v) => Number(v || 0).toLocaleString();
  const money = (v, cur='USD') => `${e(cur)} ${Number(v || 0).toLocaleString(undefined,{maximumFractionDigits:2})}`;

  function injectStyles(){
    if(document.getElementById('cs-runtime-v14-css')) return;
    const s=document.createElement('style');
    s.id='cs-runtime-v14-css';
    s.textContent=`
      .csOps{margin-top:18px;border:1px solid #323241;border-radius:24px;background:linear-gradient(180deg,#12121b,#0d0d14);padding:20px}
      .csOpsTop{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.csOpsTop h3{margin:0;font-size:20px}.csOpsTop p{margin:5px 0 0;color:#9291a2;font-size:12px}
      .csOpsGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.csOpsMetric{border:1px solid #2d2d3b;border-radius:16px;background:#101018;padding:14px}.csOpsMetric b{display:block;font-size:25px}.csOpsMetric span{font-size:10px;color:#898899;text-transform:uppercase;letter-spacing:.06em}
      .csOpsList{display:grid;gap:8px;margin-top:12px}.csOpsRow{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #292936;border-radius:14px;background:#111119;padding:12px}.csOpsRow b{font-size:12px}.csOpsRow small{display:block;color:#858596;margin-top:3px}.csOpsActions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
      .csToolBar{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.csPill{border:1px solid #343443;border-radius:999px;padding:8px 11px;background:#12121a;color:#d9d8e2;font-size:11px;font-weight:800}
      .csMarketingGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:12px}.csPanel{border:1px solid #2b2b39;border-radius:18px;background:#101018;padding:15px}.csPanel h3{margin:0 0 10px;font-size:16px}.csPanel .empty{color:#858596;font-size:12px;line-height:1.5}
      .csMini{border-top:1px solid #262633;padding:10px 0}.csMini:first-of-type{border-top:0}.csMini b{font-size:12px}.csMini span{display:block;color:#858596;font-size:10px;margin-top:4px;line-height:1.45}
      .csDealSelect{width:100%;margin-top:8px;border:1px solid #363645;background:#0d0d14;color:#fff;border-radius:10px;padding:8px;font-size:11px}
      .csRuntimeBadge{position:fixed;right:10px;bottom:calc(74px + env(safe-area-inset-bottom));z-index:45;border:1px solid #2e2e3c;background:#0d0d15dd;color:#77778b;border-radius:999px;padding:5px 8px;font-size:8px;pointer-events:none}
      @media(max-width:800px){.csOpsGrid{grid-template-columns:1fr 1fr}.csMarketingGrid{grid-template-columns:1fr}.csOpsRow{align-items:flex-start;flex-direction:column}.csOpsActions{justify-content:flex-start}}
    `;
    document.head.appendChild(s);
  }

  async function call(fn,body={}){
    if(typeof session==='undefined' || !session?.access_token) throw new Error('session_required');
    const r=await fetch(FN+fn,{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+session.access_token},body:JSON.stringify(body)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw Object.assign(new Error(d.detail||d.error||`request_${r.status}`),{status:r.status,data:d});
    return d;
  }

  async function loadOps(force=false){
    if(typeof currentOrg==='undefined' || !currentOrg?.id || loading) return ops;
    if(!force && ops?.organization_id===currentOrg.id) return ops;
    loading=true;
    try{
      const d=await call('tenant-ops-api',{organization_id:currentOrg.id,action:'snapshot'});
      ops={...d,organization_id:currentOrg.id,loaded_at:Date.now()};
      return ops;
    } finally { loading=false; }
  }

  function orgCloudy(){ return (typeof currentOrg!=='undefined' && currentOrg?.cloudy) || {pending_approvals:[],active_jobs:[],recent_failures:[],counts:{}}; }

  function ensureHome(){
    const page=document.getElementById('page-home'); if(!page) return null;
    let root=document.getElementById('csOpsCenter');
    if(!root){
      root=document.createElement('div'); root.id='csOpsCenter'; root.className='csOps';
      const anchor=page.querySelector('.metrics'); (anchor||page).insertAdjacentElement('afterend',root);
    }
    return root;
  }

  function renderHomeOps(){
    const root=ensureHome(); if(!root || typeof currentOrg==='undefined' || !currentOrg) return;
    const c=orgCloudy(), con=(currentOrg.connections||[]).filter(x=>x.status==='connected').length;
    const approvals=c.pending_approvals||[], active=c.active_jobs||[], failures=c.recent_failures||[];
    root.innerHTML=`<div class="csOpsTop"><div><h3>Operational Center</h3><p>Cloudy, AgentCloud, conexiones y acciones que requieren tu atención.</p></div><button class="btn small" id="csRefreshOps">Actualizar</button></div>
      <div class="csOpsGrid"><div class="csOpsMetric"><b>${con}</b><span>Conexiones</span></div><div class="csOpsMetric"><b>${n(c.counts?.agents_active)}</b><span>AgentCloud activos</span></div><div class="csOpsMetric"><b>${approvals.length}</b><span>Por aprobar</span></div><div class="csOpsMetric"><b>${failures.length}</b><span>Alertas</span></div></div>
      <div class="csOpsList">${approvals.slice(0,5).map(j=>`<div class="csOpsRow"><div><b>${e(j.job_type)}</b><small>Cloudy solicita autorización antes de ejecutar esta acción.</small></div><div class="csOpsActions"><button class="btn small csApprove" data-id="${e(j.id)}">Aprobar</button><button class="btn small csReject" data-id="${e(j.id)}">Rechazar</button></div></div>`).join('') || (active.length?`<div class="csOpsRow"><div><b>${active.length} tarea(s) en ejecución</b><small>Cloudy está trabajando. No necesitas intervenir.</small></div></div>`:`<div class="csOpsRow"><div><b>Todo bajo control</b><small>No hay aprobaciones pendientes ni tareas bloqueadas.</small></div></div>`)}</div>`;
    root.querySelector('#csRefreshOps').onclick=refreshEverything;
    root.querySelectorAll('.csApprove').forEach(b=>b.onclick=()=>decide(b.dataset.id,'approve'));
    root.querySelectorAll('.csReject').forEach(b=>b.onclick=()=>decide(b.dataset.id,'reject'));
  }

  async function decide(jobId,decision){
    try{
      await call('automation-approval',{organization_id:currentOrg.id,job_id:jobId,decision});
      if(decision==='approve') await call('automation-dispatch-user',{organization_id:currentOrg.id,job_id:jobId}).catch(()=>null);
      if(typeof loadState==='function') await loadState();
      renderHomeOps(); renderInboxOps();
    }catch(err){ alert(err.message); }
  }

  function ensureMarketing(){
    const page=document.getElementById('page-marketing'); if(!page) return null;
    let root=document.getElementById('csMarketingOps');
    if(!root){
      root=document.createElement('div'); root.id='csMarketingOps';
      const existing=page.querySelector('#marketingConnections');
      (existing?.parentElement||page).insertAdjacentElement('beforebegin',root);
    }
    return root;
  }

  function mini(items,mapper,empty='Sin actividad todavía.'){
    return items?.length ? items.slice(0,8).map(mapper).join('') : `<div class="empty">${e(empty)}</div>`;
  }

  async function renderMarketingOps(force=false){
    const root=ensureMarketing(); if(!root || typeof currentOrg==='undefined' || !currentOrg) return;
    root.innerHTML='<div class="sectionHead"><div><h2>Operación de marketing</h2><p>Campañas, contenido, outbound y activos del negocio dentro de CloudSales.</p></div></div><div class="notice">Cargando operación…</div>';
    try{
      const d=await loadOps(force);
      root.innerHTML=`<div class="sectionHead"><div><h2>Operación de marketing</h2><p>Gestiona borradores y ejecución desde CloudSales. Acciones con costo siguen las reglas de aprobación.</p></div></div>
        <div class="csToolBar"><button class="btn primary small" id="csNewSocial">+ Publicación</button><button class="btn small" id="csNewOutbound">+ Email / WhatsApp / SMS</button><button class="btn small" id="csRefreshMarketing">Actualizar</button></div>
        <div class="csOpsGrid"><div class="csOpsMetric"><b>${n(d.campaigns?.length)}</b><span>Campañas</span></div><div class="csOpsMetric"><b>${n(d.social_posts?.length)}</b><span>Publicaciones</span></div><div class="csOpsMetric"><b>${n(d.outbound_campaigns?.length)}</b><span>Outbound</span></div><div class="csOpsMetric"><b>${n(d.landing_pages?.filter(x=>x.status==='published').length)}</b><span>Landings activas</span></div></div>
        <div class="csMarketingGrid">
          <div class="csPanel"><h3>Campañas</h3>${mini(d.campaigns,x=>`<div class="csMini"><b>${e(x.name)}</b><span>${e(x.provider_key)} · ${e(x.status)} · ${money(x.spend,x.currency)} gastado · ${n(x.qualified_leads)} qualified</span></div>`,'Aún no hay campañas sincronizadas o creadas.')}</div>
          <div class="csPanel"><h3>Contenido</h3>${mini(d.social_posts,x=>`<div class="csMini"><b>${e((x.channels||[]).join(', ')||'Draft')}</b><span>${e(x.status)} · ${e(String(x.content||'').slice(0,130))}</span></div>`,'Crea la primera publicación desde CloudSales.')}</div>
          <div class="csPanel"><h3>Outbound</h3>${mini(d.outbound_campaigns,x=>`<div class="csMini"><b>${e(x.name)}</b><span>${e(x.channel)} · ${e(x.status)} · ${n(x.sent_count)}/${n(x.total_recipients)} enviados</span>${['draft','queued','running'].includes(x.status)?`<button class="btn small csQueueOutbound" data-id="${e(x.id)}" style="margin-top:8px">${x.status==='draft'?'Preparar envío':'Continuar envío'}</button>`:''}</div>`,'Crea campañas de email, WhatsApp o SMS.')}</div>
          <div class="csPanel"><h3>Activos</h3><div class="csMini"><b>${n(d.inventory?.length)} productos / servicios</b><span>Catálogo operativo disponible para Cloudy.</span></div><div class="csMini"><b>${n(d.landing_pages?.length)} landing(s)</b><span>${n(d.landing_pages?.filter(x=>x.status==='published').length)} publicadas.</span></div><div class="csMini"><b>${n(d.imports?.length)} importación(es)</b><span>Historial de cargas de contactos.</span></div></div>
        </div>`;
      root.querySelector('#csNewSocial').onclick=newSocial;
      root.querySelector('#csNewOutbound').onclick=newOutbound;
      root.querySelector('#csRefreshMarketing').onclick=()=>renderMarketingOps(true);
      root.querySelectorAll('.csQueueOutbound').forEach(b=>b.onclick=()=>queueOutbound(b.dataset.id));
    }catch(err){ root.innerHTML=`<div class="notice">No se pudo cargar la operación de marketing: ${e(err.message)}</div>`; }
  }

  function modal(html,save){
    if(typeof openModal==='function'){ openModal(html,save); return; }
    alert('Actualiza CloudSales y vuelve a intentar.');
  }

  function newSocial(){
    modal(`<h2>Nueva publicación</h2><div class="field"><label>Contenido</label><textarea id="csSocialContent" placeholder="Mensaje"></textarea></div><div class="field"><label>Canales</label><input id="csSocialChannels" placeholder="facebook, instagram, linkedin"></div><div class="notice">Se guarda como borrador. Cloudy puede adaptar el contenido antes de publicarlo.</div>`,async()=>{
      const content=document.getElementById('csSocialContent').value.trim();
      const channels=document.getElementById('csSocialChannels').value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
      if(!content) throw new Error('Escribe el contenido.');
      await call('tenant-ops-api',{organization_id:currentOrg.id,action:'social.create',input:{content,channels}});
      ops=null; await renderMarketingOps(true);
    });
  }

  function newOutbound(){
    modal(`<h2>Nueva campaña outbound</h2><div class="field"><label>Canal</label><select id="csOutChannel"><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option></select></div><div class="field"><label>Nombre</label><input id="csOutName" placeholder="Seguimiento agosto"></div><div class="field"><label>Asunto (email)</label><input id="csOutSubject"></div><div class="field"><label>Mensaje</label><textarea id="csOutContent"></textarea></div><div class="notice">Primero se crea el borrador. Preparar envío valida destinatarios y conexiones antes de ejecutar.</div>`,async()=>{
      const channel=document.getElementById('csOutChannel').value, name=document.getElementById('csOutName').value.trim(), subject=document.getElementById('csOutSubject').value.trim(), content=document.getElementById('csOutContent').value.trim();
      if(!name||!content) throw new Error('Nombre y mensaje son obligatorios.');
      await call('tenant-ops-api',{organization_id:currentOrg.id,action:'outbound.create',input:{channel,name,subject,content}});
      ops=null; await renderMarketingOps(true);
    });
  }

  async function queueOutbound(id){
    if(!confirm('CloudSales validará destinatarios y conexión antes de preparar el envío. ¿Continuar?')) return;
    try{
      const q=await call('tenant-ops-api',{organization_id:currentOrg.id,action:'outbound.queue',input:{id}});
      if(q.ready) await call('outbound-dispatch',{organization_id:currentOrg.id,campaign_id:id,limit:10});
      ops=null; await renderMarketingOps(true);
    }catch(err){ alert(err.message); }
  }

  function renderInboxOps(){
    const page=document.getElementById('page-inbox'); if(!page || typeof currentOrg==='undefined' || !currentOrg) return;
    let root=document.getElementById('csInboxOps');
    if(!root){ root=document.createElement('div'); root.id='csInboxOps'; page.querySelector('.sectionHead')?.insertAdjacentElement('afterend',root); }
    const c=orgCloudy(), active=c.active_jobs||[], fail=c.recent_failures||[];
    root.innerHTML=`<div class="csMarketingGrid" style="margin-bottom:14px"><div class="csPanel"><h3>Cloudy trabajando</h3>${mini(active,x=>`<div class="csMini"><b>${e(x.job_type)}</b><span>${e(x.status)} · ${new Date(x.created_at).toLocaleString()}</span></div>`,'No hay tareas activas.')}</div><div class="csPanel"><h3>Alertas recientes</h3>${mini(fail,x=>`<div class="csMini"><b>${e(x.job_type)}</b><span>${e(x.error||'No completado')}</span></div>`,'No hay errores pendientes.')}</div></div>`;
  }

  function matchStage(value,stages){
    const v=String(value||'').toLowerCase();
    return stages.find(s=>String(s.name).toLowerCase()===v || String(s.stage_key).toLowerCase()===v) || stages[0];
  }

  async function renderPipelineOps(){
    if(typeof currentOrg==='undefined'||!currentOrg || typeof snapshot==='undefined') return;
    const board=document.getElementById('pipelineBoard'); if(!board) return;
    try{
      const d=await loadOps(false), stages=d?.stages||[]; if(!stages.length) return;
      const opportunities=snapshot.opportunities||[];
      board.innerHTML=stages.map(s=>{
        const list=opportunities.filter(o=>matchStage(o.stage,stages)?.stage_key===s.stage_key);
        return `<div class="stage"><h3>${e(s.name)} · ${list.length}</h3>${list.map(o=>`<div class="deal"><b>${e(o.name)}</b><div>${o.value!=null?money(o.value,o.currency):'Sin valor'} · ${e(o.status)}</div><select class="csDealSelect" data-id="${e(o.id)}">${stages.map(t=>`<option value="${e(t.stage_key)}" ${t.stage_key===s.stage_key?'selected':''}>Mover a ${e(t.name)}</option>`).join('')}</select></div>`).join('')}</div>`;
      }).join('');
      board.querySelectorAll('.csDealSelect').forEach(sel=>sel.onchange=async()=>{
        sel.disabled=true;
        try{await call('tenant-ops-api',{organization_id:currentOrg.id,action:'opportunity.move',input:{opportunity_id:sel.dataset.id,stage_key:sel.value}});if(typeof loadWorkspace==='function')await loadWorkspace();ops=null;await renderPipelineOps();if(typeof renderHome==='function')renderHome();}
        catch(err){alert(err.message)} finally{sel.disabled=false}
      });
    }catch{}
  }

  function renderSettingsOps(){
    const page=document.getElementById('page-settings'); if(!page || typeof currentOrg==='undefined' || !currentOrg) return;
    let root=document.getElementById('csSecurityCard');
    if(!root){ root=document.createElement('div'); root.id='csSecurityCard'; root.className='csOps'; page.querySelector('.cards')?.insertAdjacentElement('afterend',root); }
    const c=orgCloudy(), con=(currentOrg.connections||[]).filter(x=>x.status==='connected');
    root.innerHTML=`<div class="csOpsTop"><div><h3>Security & Control</h3><p>CloudSales ejecuta bajo conexiones autorizadas y reserva acciones sensibles para aprobación.</p></div><span class="tag connected">Protected</span></div><div class="csOpsGrid"><div class="csOpsMetric"><b>${con.length}</b><span>Conexiones autorizadas</span></div><div class="csOpsMetric"><b>${n(c.counts?.agents_active)}</b><span>Agentes activos</span></div><div class="csOpsMetric"><b>${n(c.counts?.pending_approvals)}</b><span>Aprobaciones</span></div><div class="csOpsMetric"><b>${n(c.counts?.open_support_cases)}</b><span>Incidentes</span></div></div>`;
  }

  async function refreshEverything(){
    try{
      if(typeof loadState==='function') await loadState();
      ops=null; await loadOps(true).catch(()=>null);
      renderHomeOps(); renderInboxOps(); renderSettingsOps(); await renderMarketingOps(false); await renderPipelineOps();
    }catch(err){ console.warn('CloudSales runtime refresh',err); }
  }

  function hookNavigation(){
    document.querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(()=>{
      const p=btn.dataset.page;
      if(p==='marketing') renderMarketingOps(false);
      if(p==='pipeline') renderPipelineOps();
      if(p==='inbox') renderInboxOps();
      if(p==='settings') renderSettingsOps();
      if(p==='home') renderHomeOps();
    },40)));
    window.addEventListener('hashchange',()=>setTimeout(refreshVisible,80));
  }

  function refreshVisible(){
    const h=location.hash.replace('#','').split('-')[0];
    if(h==='marketing')renderMarketingOps(false);else if(h==='pipeline')renderPipelineOps();else if(h==='inbox')renderInboxOps();else if(h==='settings')renderSettingsOps();else if(h==='home'||!h)renderHomeOps();
  }

  async function detect(){
    if(typeof currentOrg==='undefined'||!currentOrg?.id||typeof session==='undefined'||!session?.access_token) return;
    if(initializedOrg!==currentOrg.id){ initializedOrg=currentOrg.id; ops=null; await loadOps(true).catch(()=>null); }
    renderHomeOps(); renderInboxOps(); renderSettingsOps(); refreshVisible();
  }

  function start(){
    injectStyles();
    const badge=document.createElement('div'); badge.className='csRuntimeBadge'; badge.textContent='CloudSales '+RUNTIME; document.body.appendChild(badge);
    hookNavigation();
    setInterval(detect,1800);
    setTimeout(detect,500);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();