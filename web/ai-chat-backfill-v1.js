(()=>{
  'use strict';
  const VERSION='2026.08.31.5';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const canonicalPrice={basic:47,pro:97,premium:147};

  function normalizePlanLabels(){
    $$('.planpick[data-plan]').forEach(btn=>{
      const plan=String(btn.dataset.plan||'').toLowerCase();
      const price=canonicalPrice[plan];
      if(price==null)return;
      const label=plan==='basic'?'STARTER':plan.toUpperCase();
      btn.innerHTML=`${label}<br><b>$${price}</b>`;
    });
  }

  function normalizeActivityLabels(){
    const human=v=>String(v||'Actividad').replace(/[._-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    $$('#homeActivity .card h3,#inboxFeed b').forEach(n=>{
      if(/[_.-]/.test(n.textContent||''))n.textContent=human(n.textContent);
    });
  }

  function refreshCompatibility(){
    normalizePlanLabels();
    normalizeActivityLabels();
    document.documentElement.dataset.compatRuntime=VERSION;
  }

  function hookNavigation(){
    $$('[data-page]').forEach(btn=>{
      if(btn.dataset.compatHook)return;
      btn.dataset.compatHook='1';
      btn.addEventListener('click',()=>setTimeout(refreshCompatibility,0));
    });
    window.addEventListener('hashchange',()=>setTimeout(refreshCompatibility,0));
    $('#orgSelect')?.addEventListener('change',()=>setTimeout(refreshCompatibility,150));
  }

  function boot(){
    refreshCompatibility();
    hookNavigation();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
