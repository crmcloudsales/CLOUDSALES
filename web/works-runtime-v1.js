(() => {
  'use strict';

  const VERSION='2026.08.29.2';
  const FN='https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/workspace-api';
  let initializedOrg=null;
  let loading=false;
  let snapshot=null;

  const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const usd=value=>`US$${Number(value||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const qty=value=>Number(value||0).toLocaleString(undefined,{maximumFractionDigits:4});

  function token(){try{return typeof session!=='undefined'?session?.access_token||'':''}catch{return''}}
  function org(){try{return typeof currentOrg!=='undefined'?currentOrg?.id||'':''}catch{return''}}

  async function loadSnapshot(){
    if(!org()||!token()||loading)return;
    loading=true;
    try{
      const r=await fetch(FN,{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token()},body:JSON.stringify({organization_id:org(),action:'works.snapshot'})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||`works_${r.status}`);
      snapshot=d;render();
    }catch(err){renderError(String(err?.message||err));}
    finally{loading=false}
  }

  function ensureStyles(){
    if(document.getElementById('cs-works-css'))return;
    const s=document.createElement('style');s.id='cs-works-css';s.textContent=`
      .csWorksHero{border:1px solid #392d3e;background:radial-gradient(720px 300px at 90% -20%,#4b1b5260,transparent 65%),#111119;border-radius:26px;padding:22px;margin-bottom:16px}.csWorksHero h2{margin:0;font-size:30px;letter-spacing:-.04em}.csWorksHero p{color:#aaa8b8;max-width:760px;line-height:1.55;font-size:13px}.csWorksTotals{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:15px}.csWorksMetric{border:1px solid #30303d;background:#0d0d14;border-radius:17px;padding:14px}.csWorksMetric b{font-size:25px;display:block}.csWorksMetric span{font-size:9px;color:#858596;text-transform:uppercase;letter-spacing:.08em}.csWorksList{display:grid;gap:9px}.csWorkRow{border:1px solid #2c2c38;border-radius:17px;background:#101018;padding:14px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center}.csWorkRow b{font-size:13px}.csWorkRow small{display:block;margin-top:5px;color:#8e8d9d;line-height:1.45}.csWorkAmount{text-align:right;font-weight:900;font-size:16px}.csWorksInfo{border:1px solid #333340;border-radius:16px;padding:13px;color:#aaa9b7;font-size:11px;line-height:1.55;margin:12px 0}.csWorksCatalog{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.csWorkCatalogCard{border:1px solid #2b2b37;border-radius:16px;background:#0f0f17;padding:13px}.csWorkCatalogCard b{display:block;font-size:12px}.csWorkCatalogCard span{font-size:11px;color:#9695a5;line-height:1.45}.csWorksEmpty{border:1px dashed #343443;border-radius:18px;padding:24px;text-align:center;color:#8f8e9f}.csWorksNavBadge{margin-left:auto;font-size:8px;border:1px solid #4b3348;color:#d897c2;border-radius:999px;padding:3px 6px}
      @media(max-width:720px){.csWorksTotals{grid-template-columns:1fr 1fr}.csWorksCatalog{grid-template-columns:1fr}.csWorkRow{grid-template-columns:1fr}.csWorkAmount{text-align:left}}
    `;document.head.appendChild(s);
  }

  function ensurePage(){
    const content=document.querySelector('.content');if(!content)return null;
    let page=document.getElementById('page-works');
    if(!page){page=document.createElement('section');page.id='page-works';page.className='page';content.appendChild(page);}
    return page;
  }

  function ensureNavigation(){
    const sidebar=document.querySelector('.sidebar');
    if(sidebar&&!document.querySelector('.navbtn[data-page="works"]')){
      const button=document.createElement('button');button.className='navbtn';button.dataset.page='works';button.innerHTML='<span class="navicon">¢</span>Works <span class="csWorksNavBadge">Trabajos</span>';
      const affiliate=sidebar.querySelector('.navbtn[data-page="affiliate"]');
      if(affiliate)sidebar.insertBefore(button,affiliate);else sidebar.appendChild(button);
      button.addEventListener('click',()=>openWorks());
    }
    const settings=document.getElementById('page-settings');
    const cards=settings?.querySelector('.cards');
    if(cards&&!document.getElementById('csWorksSettingsCard')){
      const card=document.createElement('div');card.id='csWorksSettingsCard';card.className='card';card.innerHTML='<h3>Works · Trabajos</h3><p>Consulta qué trabajos completó Cloudy, cuántas unidades realizó y cuánto cuesta cada trabajo.</p><button class="btn small" type="button">Ver Works</button>';
      cards.appendChild(card);card.querySelector('button')?.addEventListener('click',openWorks);
    }
  }

  function openWorks(){
    try{if(typeof go==='function')go('works');else activateWorks()}catch{activateWorks()}
    history.replaceState(null,'','#works');
    loadSnapshot();
  }

  function activateWorks(){
    document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id==='page-works'));
    document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page==='works'));
    const title=document.getElementById('pageTitle');if(title)title.textContent='Works';
  }

  function renderError(message){const page=ensurePage();if(page)page.innerHTML=`<div class="csWorksHero"><h2>Works · Trabajos</h2><p>Cloudy registra aquí los trabajos completados.</p></div><div class="csWorksInfo" style="border-color:#613047;color:#ff9fbc">No pudimos cargar Works: ${e(message)}</div>`}

  function render(){
    const page=ensurePage();if(!page||!snapshot)return;
    const totals=snapshot.totals||{},groups=snapshot.groups||[],recent=snapshot.recent||[],catalog=snapshot.catalog||[];
    page.innerHTML=`<div class="csWorksHero"><div style="font-size:10px;color:#ff84c5;font-weight:900;letter-spacing:.08em">CLOUDY · WORKS</div><h2>Cloudy estuvo haciendo estos trabajos.</h2><p>Cada Work es una tarea concreta que Cloudy terminó para tu negocio. Ves la cantidad, el precio por unidad y el total. Los intentos fallidos no se publican como Works cobrables.</p><div class="csWorksTotals"><div class="csWorksMetric"><b>${usd(totals.today_usd)}</b><span>Hoy</span></div><div class="csWorksMetric"><b>${usd(totals.month_usd)}</b><span>Este mes</span></div><div class="csWorksMetric"><b>${Number(totals.posted_count||0).toLocaleString()}</b><span>Works completados</span></div></div></div>
      <div class="csWorksInfo"><b>Works ≠ Ad Spend / inversión publicitaria.</b> El Media spend de Meta y Google se paga directamente a esas plataformas. Aquí aparecen únicamente los trabajos ejecutados por Cloudy/CloudSales.</div>
      <div class="sectionHead"><div><h2>Resumen del mes</h2><p>Precio × cantidad = total por tipo de trabajo.</p></div><button id="csWorksRefresh" class="btn small">Actualizar</button></div>
      <div class="csWorksList">${groups.length?groups.map(g=>`<div class="csWorkRow"><div><b>${e(g.name_es||g.work_key)}</b><small>${usd(g.unit_price_usd)} por ${e(g.unit||'unidad')} × ${qty(g.quantity)}</small></div><div class="csWorkAmount">${usd(g.amount_usd)}</div></div>`).join(''):'<div class="csWorksEmpty">Todavía no hay Works cobrables publicados en este periodo. Cuando Cloudy complete un trabajo configurado, aparecerá aquí automáticamente.</div>'}</div>
      <div class="sectionHead"><div><h2>Works configurados</h2><p>Precios visibles antes de que estos trabajos se acumulen.</p></div></div><div class="csWorksCatalog">${catalog.map(c=>`<div class="csWorkCatalogCard"><b>${e(c.name_es||c.work_key)} · ${usd(c.base_price_usd)} / ${e(c.unit)}</b><span>${e(c.description_es||'')}</span></div>`).join('')||'<div class="csWorksEmpty">No hay Works configurados.</div>'}</div>
      ${recent.length?`<div class="sectionHead"><div><h2>Actividad reciente</h2></div></div><div class="csWorksList">${recent.slice(0,30).map(r=>`<div class="csWorkRow"><div><b>${e(r.catalog?.name_es||r.work_key)}</b><small>${new Date(r.occurred_at).toLocaleString()} · ${e(r.status)}</small></div><div class="csWorkAmount">${usd(r.amount_usd)}</div></div>`).join('')}</div>`:''}`;
    document.getElementById('csWorksRefresh')?.addEventListener('click',()=>{snapshot=null;loadSnapshot()});
  }

  function onOrgChange(){initializedOrg=null;snapshot=null;setTimeout(()=>{if(location.hash==='#works')loadSnapshot()},100)}
  function boot(){
    ensureStyles();ensurePage();ensureNavigation();
    if(initializedOrg!==org()){initializedOrg=org();snapshot=null}
    if(location.hash==='#works'){activateWorks();loadSnapshot()}
    document.getElementById('orgSelect')?.addEventListener('change',onOrgChange);
    window.addEventListener('hashchange',()=>{if(location.hash==='#works'){activateWorks();loadSnapshot()}});
    document.documentElement.dataset.worksRuntime=VERSION;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();