(() => {
  'use strict';
  const BASE='https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/';
  let installed=false,busy=false,observer=null,attachTries=0;

  async function universalSnapshot(){
    if(typeof session==='undefined'||!session?.access_token||typeof currentOrg==='undefined'||!currentOrg?.id)throw new Error('session_required');
    const r=await fetch(BASE+'icon-build-diagnose2',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+session.access_token},body:JSON.stringify({organization_id:currentOrg.id,action:'snapshot',input:{limit:300}})});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.error||'conversation_lookup_failed');return d.conversations||[];
  }

  function activeConversationId(){return document.querySelector('#aiChatV2 .a2conv.active[data-id]')?.dataset.id||''}

  async function scheduleFromChat(){
    if(busy)return;busy=true;
    const btn=document.getElementById('a2schedule');if(btn)btn.disabled=true;
    try{
      const id=activeConversationId();if(!id)throw new Error('Selecciona una conversación primero.');
      const list=await universalSnapshot();
      const conv=list.find(x=>String(x.id)===String(id));
      if(!conv?.contact_id)throw new Error('Esta conversación todavía no está vinculada a un contacto de CloudSales.');
      const calendarButton=document.getElementById('csNewAppointment');
      if(!calendarButton)throw new Error('Calendar todavía no está disponible.');
      if(typeof go==='function')go('calendar');
      calendarButton.click();
      setTimeout(()=>{const sel=document.getElementById('calContact');if(sel){sel.value=conv.contact_id;sel.dispatchEvent(new Event('change',{bubbles:true}))}},40);
    }catch(err){alert(err?.message||'No pudimos abrir Calendar.')}finally{busy=false;if(btn)btn.disabled=false}
  }

  function install(){
    const actions=document.querySelector('#aiChatV2 .a2actions');
    if(!actions||document.getElementById('a2schedule'))return false;
    const b=document.createElement('button');b.id='a2schedule';b.className='a2btn';b.textContent='◫ Agendar';b.title='Agendar cita con este contacto';b.onclick=scheduleFromChat;actions.prepend(b);installed=true;return true;
  }

  function attach(){
    if(installed||install()){observer?.disconnect();observer=null;return;}
    const root=document.getElementById('aiChatV2');
    if(root){
      observer?.disconnect();
      observer=new MutationObserver(()=>{if(!installed&&install()){observer?.disconnect();observer=null}});
      observer.observe(root,{childList:true,subtree:true});
      return;
    }
    if(attachTries++<20)setTimeout(attach,250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
  else attach();
})();