(()=>{
  'use strict';
  const VERSION='2026.08.31.5';
  const BASE='https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/';
  let busy=false,localObserver=null,attachTries=0;

  async function conversations(){
    if(typeof session==='undefined'||!session?.access_token||typeof currentOrg==='undefined'||!currentOrg?.id)throw new Error('session_required');
    const r=await fetch(BASE+'icon-build-diagnose2',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+session.access_token},body:JSON.stringify({organization_id:currentOrg.id,action:'snapshot',input:{limit:300}})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.detail||d.error||'conversation_lookup_failed');
    return d.conversations||[];
  }

  function activeConversationId(){return document.querySelector('#aiChatV2 .a2conv.active[data-id]')?.dataset.id||''}

  async function scheduleFromChat(){
    if(busy)return;
    busy=true;
    const btn=document.getElementById('a2schedule');
    if(btn)btn.disabled=true;
    try{
      const id=activeConversationId();
      if(!id)throw new Error('Selecciona una conversación primero.');
      const conv=(await conversations()).find(x=>String(x.id)===String(id));
      if(!conv?.contact_id)throw new Error('Esta conversación todavía no está vinculada a un contacto de CloudSales.');
      if(typeof go==='function')go('calendar');
      await new Promise(r=>setTimeout(r,60));
      const calendarButton=document.getElementById('csNewAppointment');
      if(!calendarButton)throw new Error('Calendar todavía no está disponible.');
      calendarButton.click();
      setTimeout(()=>{
        const sel=document.getElementById('calContact');
        if(sel){sel.value=conv.contact_id;sel.dispatchEvent(new Event('change',{bubbles:true}))}
      },80);
    }catch(err){alert(err?.message||'No pudimos abrir Calendar.')}finally{
      busy=false;
      if(btn)btn.disabled=false;
    }
  }

  function installButton(){
    const actions=document.querySelector('#aiChatV2 .a2actions');
    if(!actions||document.getElementById('a2schedule'))return false;
    const b=document.createElement('button');
    b.id='a2schedule';b.className='a2btn';b.textContent='◫ Agendar';b.title='Agendar cita con este contacto';b.onclick=scheduleFromChat;
    actions.prepend(b);
    return true;
  }

  function attachLocal(){
    if(installButton()){localObserver?.disconnect();localObserver=null;return}
    const root=document.getElementById('aiChatV2');
    if(root&&!localObserver){
      localObserver=new MutationObserver(()=>{
        if(installButton()){localObserver?.disconnect();localObserver=null}
      });
      localObserver.observe(root,{childList:true,subtree:true});
      return;
    }
    if(!root&&attachTries++<20)setTimeout(attachLocal,250);
  }

  function hooks(){
    attachLocal();
    document.querySelectorAll('[data-page="calendar"],[data-page="inbox"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(attachLocal,80)));
    window.addEventListener('hashchange',()=>setTimeout(attachLocal,80));
    document.getElementById('orgSelect')?.addEventListener('change',()=>{localObserver?.disconnect();localObserver=null;attachTries=0;setTimeout(attachLocal,180)});
    document.documentElement.dataset.calendarBridge=VERSION;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hooks,{once:true});
  else hooks();
})();
