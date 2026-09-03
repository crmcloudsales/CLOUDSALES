(() => {
  'use strict';

  const VERSION = '2026.08.28.2';
  let mounted = false;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString([], {weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
  };
  const sameDay = (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();

  function injectStyles(){
    if(document.getElementById('cs-calendar-v1-css')) return;
    const s=document.createElement('style');
    s.id='cs-calendar-v1-css';
    s.textContent=`
      .calMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0 22px}.calMetric{border:1px solid #2c2c39;background:#101018;border-radius:17px;padding:15px}.calMetric b{display:block;font-size:26px}.calMetric span{font-size:10px;color:#8d8c9d;text-transform:uppercase;letter-spacing:.06em}
      .calLayout{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(270px,.6fr);gap:14px}.calPanel{border:1px solid #2c2c39;background:#101018;border-radius:20px;padding:16px}.calPanel h3{margin:0 0 12px;font-size:17px}.calList{display:grid;gap:9px}.calItem{border:1px solid #2a2a37;background:#12121a;border-radius:15px;padding:13px;display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.calItem strong{display:block;font-size:13px}.calItem small{display:block;color:#858596;margin-top:4px;line-height:1.45}.calMeta{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.calTag{border:1px solid #343443;border-radius:999px;padding:5px 8px;font-size:9px;color:#aaa9b8}.calTag.hl{border-color:#39526f;color:#8ec7ff}.calTag.ok{border-color:#26533e;color:#8ff0ba}.calEmpty{border:1px dashed #333342;border-radius:15px;padding:20px;color:#858596;text-align:center;font-size:12px}.calContact{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #272733;padding:10px 0}.calContact:first-of-type{border-top:0}.calContact b{font-size:12px}.calContact small{display:block;color:#858596;margin-top:3px}.calQuick{border:1px solid #30303e;background:#121019;color:#fff;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:800}.calSync{margin-top:12px;border:1px solid #293e51;background:#0e1822;border-radius:14px;padding:11px;color:#8fb7db;font-size:11px;line-height:1.45}.calSync.local{border-color:#3a3340;background:#15131a;color:#9c98a4}
      @media(max-width:820px){.calMetrics{grid-template-columns:1fr 1fr}.calLayout{grid-template-columns:1fr}.bottomnav{grid-template-columns:repeat(6,1fr)!important}.bottomnav button{font-size:8px}.bottomnav b{font-size:16px}}
    `;
    document.head.appendChild(s);
  }

  function contactName(id){
    const c=(typeof snapshot!=='undefined' && snapshot?.contacts||[]).find(x=>x.id===id);
    if(!c) return 'Sin contacto';
    return [c.first_name,c.last_name].filter(Boolean).join(' ') || c.email || c.phone_e164 || 'Contacto';
  }

  function highLevelConfig(){
    const con=(typeof currentOrg!=='undefined' && currentOrg?.connections||[]).find(x=>x.provider_key==='highlevel' && x.status==='connected');
    if(!con) return null;
    const calendarId=con.metadata?.sales_calendar_id || con.metadata?.calendar_id || null;
    return calendarId ? {connectionId:con.id,calendarId,account:con.external_account_name||'HIGHLEVEL'} : null;
  }

  function ensurePage(){
    if(mounted) return document.getElementById('page-calendar');
    injectStyles();
    const content=document.querySelector('.content');
    if(!content) return null;
    const page=document.createElement('section');
    page.id='page-calendar';
    page.className='page';
    page.innerHTML=`<div class="sectionHead"><div><h2>Calendar</h2><p>Citas del negocio, sincronizadas con HIGHLEVEL cuando hay un calendario conectado.</p></div><button class="btn primary" id="csNewAppointment">+ Cita</button></div><div id="csCalendarRoot"></div>`;
    const files=document.getElementById('page-files');
    if(files) content.insertBefore(page,files); else content.appendChild(page);
    const sidebar=document.querySelector('.sidebar');
    if(sidebar && !sidebar.querySelector('[data-page="calendar"]')){
      const btn=document.createElement('button');btn.className='navbtn';btn.dataset.page='calendar';btn.innerHTML='<span class="navicon">◫</span>Calendar';
      const filesBtn=sidebar.querySelector('[data-page="files"]');if(filesBtn)sidebar.insertBefore(btn,filesBtn);else sidebar.appendChild(btn);btn.onclick=()=>openCalendar();
    }
    const bottom=document.querySelector('.bottomnav');
    if(bottom && !bottom.querySelector('[data-page="calendar"]')){
      const btn=document.createElement('button');btn.dataset.page='calendar';btn.innerHTML='<b>◫</b>Calendar';const connect=bottom.querySelector('[data-page="connect"]');if(connect)bottom.insertBefore(btn,connect);else bottom.appendChild(btn);btn.onclick=()=>openCalendar();
    }
    page.querySelector('#csNewAppointment').onclick=()=>openAppointmentModal();
    mounted=true;return page;
  }

  function openCalendar(){ensurePage();if(typeof go==='function')go('calendar');renderCalendar()}
  async function refreshSnapshot(){if(typeof currentOrg==='undefined'||!currentOrg?.id)return;if(typeof loadWorkspace==='function')await loadWorkspace();else if(typeof api==='function')snapshot=await api('workspace-api',{organization_id:currentOrg.id,action:'snapshot'})}

  function renderCalendar(){
    const page=ensurePage(),root=page?.querySelector('#csCalendarRoot');if(!root||typeof currentOrg==='undefined'||!currentOrg)return;
    const appointments=[...(typeof snapshot!=='undefined'&&snapshot?.appointments||[])].sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
    const now=new Date(),today=appointments.filter(x=>sameDay(new Date(x.starts_at),now)),in7=new Date(now.getTime()+7*86400000),next7=appointments.filter(x=>{const d=new Date(x.starts_at);return d>=now&&d<=in7}),upcoming=appointments.filter(x=>new Date(x.starts_at)>=new Date(now.getTime()-3600000)).slice(0,30),confirmed=appointments.filter(x=>['confirmed','completed'].includes(String(x.status))).length,hl=highLevelConfig(),contacts=(typeof snapshot!=='undefined'&&snapshot?.contacts||[]).slice(0,8);
    root.innerHTML=`<div class="calMetrics"><div class="calMetric"><b>${today.length}</b><span>Hoy</span></div><div class="calMetric"><b>${next7.length}</b><span>Próximos 7 días</span></div><div class="calMetric"><b>${confirmed}</b><span>Confirmadas</span></div><div class="calMetric"><b>${appointments.length}</b><span>Total</span></div></div><div class="calLayout"><div class="calPanel"><h3>Próximas citas</h3><div class="calList">${upcoming.length?upcoming.map(a=>`<div class="calItem"><div><strong>${esc(a.metadata?.title||'Cita')}</strong><small>${esc(contactName(a.contact_id))}<br>${esc(fmt(a.starts_at))}${a.ends_at?' → '+esc(new Date(a.ends_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})):''}</small></div><div class="calMeta"><span class="calTag ${a.provider_key==='highlevel'?'hl':''}">${esc(a.provider_key==='highlevel'?'HIGHLEVEL':'CloudSales')}</span><span class="calTag ${a.status==='confirmed'?'ok':''}">${esc(a.status||'scheduled')}</span>${a.external_id?'<span class="calTag ok">Synced</span>':''}</div></div>`).join(''):`<div class="calEmpty">No hay citas próximas. Crea una desde Calendar o desde AI CHAT.</div>`}</div></div><aside class="calPanel"><h3>Agendar rápido</h3>${contacts.length?contacts.map(c=>`<div class="calContact"><div><b>${esc(contactName(c.id))}</b><small>${esc(c.email||c.phone_e164||'Lead')}</small></div><button class="calQuick" data-contact="${esc(c.id)}">Agendar</button></div>`).join(''):`<div class="calEmpty">Crea un lead para poder agendar una cita.</div>`}<div class="calSync ${hl?'':'local'}">${hl?`Sincronización disponible con <b>HIGHLEVEL</b>. Las nuevas citas se enviarán al calendario conectado.`:`Calendar funciona dentro de CloudSales. Cuando conectes HIGHLEVEL y un calendario, la sincronización se activa automáticamente.`}</div></aside></div>`;
    root.querySelectorAll('.calQuick').forEach(b=>b.onclick=()=>openAppointmentModal(b.dataset.contact));
  }

  function localDateTimeValue(d){const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`}
  function openAppointmentModal(contactId=''){
    if(typeof currentOrg==='undefined'||!currentOrg?.id)return;const contacts=(typeof snapshot!=='undefined'&&snapshot?.contacts||[]),start=new Date(Date.now()+24*3600000);start.setMinutes(Math.ceil(start.getMinutes()/15)*15,0,0);const options=contacts.map(c=>`<option value="${esc(c.id)}" ${c.id===contactId?'selected':''}>${esc(contactName(c.id))}</option>`).join('');
    const html=`<h2>Nueva cita</h2><div class="field"><label>Contacto</label><select id="calContact"><option value="">Selecciona un contacto</option>${options}</select></div><div class="field"><label>Título</label><input id="calTitle" value="Sales Consultation"></div><div class="field"><label>Fecha y hora</label><input id="calStart" type="datetime-local" value="${localDateTimeValue(start)}"></div><div class="field"><label>Duración</label><select id="calDuration"><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60" selected>60 minutos</option><option value="90">90 minutos</option></select></div><div class="notice">CloudSales guardará la cita y, si HIGHLEVEL tiene un calendario conectado, la sincronizará automáticamente.</div>`;
    if(typeof openModal!=='function')return;openModal(html,async()=>{const cid=document.getElementById('calContact').value,title=document.getElementById('calTitle').value.trim()||'Sales Consultation',startValue=document.getElementById('calStart').value,duration=Number(document.getElementById('calDuration').value||60);if(!cid)throw new Error('Selecciona un contacto.');if(!startValue)throw new Error('Selecciona fecha y hora.');const starts=new Date(startValue);if(Number.isNaN(starts.getTime()))throw new Error('Fecha inválida.');const ends=new Date(starts.getTime()+duration*60000),created=await api('workspace-api',{organization_id:currentOrg.id,action:'appointment.create',input:{contact_id:cid,title,starts_at:starts.toISOString(),ends_at:ends.toISOString()}}),appointment=created.appointment,hl=highLevelConfig();let syncError=null;
      if(appointment?.id&&hl){try{const sync=await direct('highlevel-command',{organization_id:currentOrg.id,connection_id:hl.connectionId,action:'crm.appointment.create',input:{appointment_id:appointment.id,calendar_id:hl.calendarId}});const externalId=sync?.result?.external_id||null;if(externalId)await api('workspace-api',{organization_id:currentOrg.id,action:'appointment.update',input:{id:appointment.id,provider_key:'highlevel',external_id:externalId,metadata:{highlevel:{connection_id:hl.connectionId,calendar_id:hl.calendarId,synced_at:new Date().toISOString()}}}})}catch(err){syncError=err?.message||'highlevel_sync_failed'}}
      await refreshSnapshot();renderCalendar();if(syncError)setTimeout(()=>alert('La cita quedó guardada en CloudSales, pero HIGHLEVEL no pudo sincronizarla todavía: '+syncError),80);
    });
  }
  async function bootCalendar(){ensurePage();if(location.hash.replace('#','').split('-')[0]==='calendar')openCalendar()}
  window.addEventListener('hashchange',()=>{if(location.hash.replace('#','').split('-')[0]==='calendar')openCalendar()});document.addEventListener('cloudsales-calendar-refresh',()=>renderCalendar());if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootCalendar,{once:true});else bootCalendar();setInterval(()=>{if(document.getElementById('page-calendar')?.classList.contains('active'))renderCalendar()},5000);
})();