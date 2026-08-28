(() => {
'use strict';
const BASE='https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/';
async function post(body){if(typeof session==='undefined'||!session?.access_token)throw Error('session_required');const r=await fetch(BASE+'icon-build-diagnose2',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+session.access_token},body:JSON.stringify(body)}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`request_${r.status}`);return d}
function native(){return /cloudsales_webchat/i.test(document.getElementById('a2meta')?.textContent||'')}
async function sendLocal(){const active=document.querySelector('.a2conv.active[data-id]'),text=document.getElementById('a2text')?.value.trim();if(!active||!text||typeof currentOrg==='undefined'||!currentOrg?.id)return;const btn=document.getElementById('a2send');btn.disabled=true;btn.textContent='Enviando…';try{await post({organization_id:currentOrg.id,action:'send_local',input:{conversation_id:active.dataset.id,message:text}});document.getElementById('a2text').value='';setTimeout(()=>active.click(),250)}catch(e){alert(e.message)}finally{btn.disabled=false;btn.textContent='Enviar'}}
document.addEventListener('click',e=>{if(e.target.closest?.('#a2send')&&native()){e.preventDefault();e.stopImmediatePropagation();sendLocal()}},true);
document.addEventListener('keydown',e=>{if(e.target?.id==='a2text'&&e.key==='Enter'&&!e.shiftKey&&native()){e.preventDefault();e.stopImmediatePropagation();sendLocal()}},true);
})();