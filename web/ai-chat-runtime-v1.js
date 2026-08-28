(() => {
  'use strict';

  const VERSION = '2026.08.28.5';
  const BASE = 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/';
  let conversations = [];
  let currentConversation = null;
  let currentMessages = [];
  let activeChannel = 'all';
  let selectedFileId = null;
  let refreshTimer = null;
  let busy = false;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const when = (v) => {
    const d = v ? new Date(Number.isFinite(Number(v)) ? Number(v) : v) : null;
    if (!d || Number.isNaN(d.getTime())) return '';
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    return d.toLocaleDateString([], {month:'short', day:'numeric'});
  };

  function style(){
    if(document.getElementById('cs-ai-chat-css')) return;
    const s = document.createElement('style');
    s.id='cs-ai-chat-css';
    s.textContent = `
      #page-inbox>.sectionHead,#inboxFeed,#csInboxOps{display:none!important}
      .aiChat{display:grid;grid-template-columns:330px minmax(0,1fr);height:calc(100vh - 132px);min-height:600px;border:1px solid #292936;border-radius:24px;overflow:hidden;background:#0d0d14}
      .aiSide{border-right:1px solid #272734;background:#0b0b12;display:flex;flex-direction:column;min-width:0}.aiSideTop{padding:18px;border-bottom:1px solid #252531}.aiTitle{display:flex;align-items:center;justify-content:space-between;gap:10px}.aiTitle h2{margin:0;font-size:24px;letter-spacing:-.04em}.aiTitle small{color:#77778b}.aiSearch{width:100%;margin-top:13px;border:1px solid #30303e;background:#111119;color:#fff;border-radius:12px;padding:11px 12px;font-size:12px}.aiChannels{display:flex;gap:6px;overflow:auto;padding:10px 12px;border-bottom:1px solid #22222d}.aiChip{white-space:nowrap;border:1px solid #30303d;background:#101018;color:#a8a7b5;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:900}.aiChip.active{background:#fff;color:#090910;border-color:#fff}.aiList{overflow:auto;flex:1}.aiConv{width:100%;border:0;border-bottom:1px solid #20202b;background:transparent;color:#fff;text-align:left;padding:14px;display:grid;grid-template-columns:42px 1fr auto;gap:10px;cursor:pointer}.aiConv:hover,.aiConv.active{background:#15151e}.aiAvatar{width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,#ff2b9b,#873cff);display:grid;place-items:center;font-weight:950}.aiConvMain{min-width:0}.aiConvTop{display:flex;gap:8px;align-items:center}.aiConvTop b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px}.aiConvBody{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#858596;font-size:10px;margin-top:4px}.aiChannel{font-size:9px;color:#b0afbd;margin-top:5px}.aiUnread{min-width:20px;height:20px;border-radius:999px;background:#ff2b9b;display:grid;place-items:center;font-size:9px;font-weight:900}.aiTime{font-size:9px;color:#737283}.aiMain{display:grid;grid-template-rows:auto 1fr auto;min-width:0;background:radial-gradient(circle at 50% -10%,#181827 0,#0c0c13 38%,#09090f 100%)}.aiHead{padding:15px 18px;border-bottom:1px solid #292936;display:flex;align-items:center;justify-content:space-between;gap:12px}.aiContact b{display:block;font-size:14px}.aiContact span{font-size:10px;color:#858596}.aiHeadBtns{display:flex;gap:7px}.aiIconBtn{border:1px solid #30303d;background:#111119;color:#eee;border-radius:10px;padding:8px 10px;font-size:11px}.aiMessages{overflow:auto;padding:20px;display:flex;flex-direction:column;gap:10px}.aiBubble{max-width:min(76%,700px);border-radius:18px;padding:11px 13px;font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-word}.aiBubble.in{align-self:flex-start;background:#171720;border:1px solid #292936}.aiBubble.out{align-self:flex-end;background:linear-gradient(135deg,#8e2cff,#ff2b9b);color:#fff}.aiMeta{font-size:8px;opacity:.65;margin-top:6px}.aiAttach{display:inline-flex;margin-top:7px;padding:7px 9px;border-radius:9px;background:#ffffff14;color:inherit;text-decoration:none;font-size:9px}.aiEmpty{margin:auto;text-align:center;max-width:440px;color:#818092;padding:30px}.aiEmpty b{display:block;font-size:28px;color:#fff;margin-bottom:10px}.aiComposer{border-top:1px solid #292936;padding:12px 14px;background:#0d0d14}.aiComposeTop{display:flex;align-items:center;gap:7px;margin-bottom:9px;overflow:auto}.aiSelect{border:1px solid #30303d;background:#111119;color:#fff;border-radius:10px;padding:8px;font-size:10px}.aiDraft{border:1px solid #4a2d56;background:#1b1320;color:#ff9cd4;border-radius:10px;padding:8px 10px;font-size:10px;font-weight:900}.aiFileBtn{border:1px solid #30303d;background:#111119;color:#fff;border-radius:10px;padding:8px 10px;font-size:10px}.aiFileState{font-size:9px;color:#9a99a8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.aiComposeRow{display:grid;grid-template-columns:1fr auto;gap:8px}.aiText{min-height:46px;max-height:140px;resize:none;border:1px solid #333342;background:#111119;color:#fff;border-radius:14px;padding:12px;font:inherit;font-size:12px}.aiSend{border:0;border-radius:14px;background:linear-gradient(135deg,#ff2b9b,#8e2cff);color:#fff;font-weight:950;padding:0 18px}.aiSend:disabled{opacity:.5}.aiSubject{display:none;width:100%;margin-bottom:8px;border:1px solid #30303d;background:#111119;color:#fff;border-radius:10px;padding:9px;font-size:11px}.aiStatusBar{padding:7px 12px;border-top:1px solid #20202b;color:#727182;font-size:9px;display:flex;justify-content:space-between;gap:8px}.aiMobileBack{display:none}.aiFileMenu{position:absolute;z-index:90;width:min(330px,90vw);max-height:320px;overflow:auto;background:#13131c;border:1px solid #353544;border-radius:16px;padding:8px;box-shadow:0 20px 70px #000b}.aiFileChoice{display:block;width:100%;border:0;border-bottom:1px solid #252530;background:transparent;color:#fff;text-align:left;padding:10px;border-radius:8px}.aiFileChoice:hover{background:#1d1d28}
      @media(max-width:800px){.aiChat{grid-template-columns:1fr;height:calc(100vh - 120px);border-radius:18px}.aiSide{border-right:0}.aiMain{display:none}.aiChat.openThread .aiSide{display:none}.aiChat.openThread .aiMain{display:grid}.aiMobileBack{display:inline-block}.aiBubble{max-width:88%}}
    `;
    document.head.appendChild(s);
  }

  function rename(){
    document.querySelectorAll('[data-page="inbox"]').forEach(btn=>{
      const icon = btn.querySelector('.navicon');
      if(icon){ while(icon.nextSibling) icon.nextSibling.remove(); btn.append(document.createTextNode('AI CHAT')); }
      else btn.innerHTML='<b>✦</b>AI CHAT';
      btn.setAttribute('aria-label','AI CHAT');
    });
    const page=document.getElementById('page-inbox');
    if(page){ const h=page.querySelector('.sectionHead h2'); if(h) h.textContent='AI CHAT'; }
    if(location.hash.startsWith('#inbox') && window.pageTitle) pageTitle.textContent='AI CHAT';
    let bottom=document.querySelector('.bottomnav');
    if(bottom && !bottom.querySelector('[data-ai-chat-mobile]')){
      const connect=bottom.querySelector('[data-page="connect"]');
      const b=document.createElement('button'); b.dataset.page='inbox'; b.dataset.aiChatMobile='1'; b.innerHTML='<b>✦</b>AI CHAT';
      b.onclick=()=>{ if(typeof go==='function') go('inbox'); setTimeout(()=>{if(window.pageTitle)pageTitle.textContent='AI CHAT';render();},20); };
      if(connect) connect.replaceWith(b); else bottom.appendChild(b);
    }
  }

  function highLevel(){
    const arr = (typeof currentOrg!=='undefined' && currentOrg?.connections) || [];
    return arr.find(x=>x.provider_key==='highlevel' && x.status==='connected') || null;
  }

  async function post(fn, body){
    if(typeof session==='undefined' || !session?.access_token) throw new Error('session_required');
    const r=await fetch(BASE+fn,{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+session.access_token},body:JSON.stringify(body)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.provider?.message||d.detail||d.error||`request_${r.status}`);
    return d;
  }

  async function hl(action,input={}){
    const c=highLevel();
    if(!c) throw new Error('Conecta HighLevel para sincronizar las conversaciones universales.');
    return post('highlevel-command',{organization_id:currentOrg.id,connection_id:c.id,action,input});
  }

  function channelFromType(t){
    t=String(t||'').toUpperCase();
    if(t.includes('WHATSAPP')) return 'whatsapp';
    if(t.includes('INSTAGRAM')||t==='IG') return 'instagram';
    if(t.includes('FACEBOOK')||t==='FB') return 'facebook';
    if(t.includes('EMAIL')) return 'email';
    if(t.includes('WEBCHAT')||t.includes('LIVE_CHAT')||t.includes('WEB_CHAT')) return 'webchat';
    if(t.includes('GMB')) return 'gmb';
    if(t.includes('CALL')) return 'call';
    return 'sms';
  }
  function channelLabel(c){return ({all:'Todos',whatsapp:'WhatsApp',sms:'SMS',email:'Email',instagram:'Instagram',facebook:'Facebook',webchat:'Web Chat',gmb:'Google',call:'Llamada'})[c]||c;}
  function sendType(c){return ({whatsapp:'WhatsApp',sms:'SMS',email:'Email',instagram:'IG',facebook:'FB',webchat:'Live_Chat'})[c]||'SMS';}
  function initials(c){const n=String(c.fullName||c.contactName||c.name||c.email||c.phone||'?').trim();return n.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'?';}
  function convName(c){return c.fullName||c.contactName||[c.firstName,c.lastName].filter(Boolean).join(' ')||c.email||c.phone||'Contacto';}

  function root(){
    const page=document.getElementById('page-inbox'); if(!page) return null;
    let r=document.getElementById('aiChatRoot');
    if(!r){ r=document.createElement('div'); r.id='aiChatRoot'; r.className='aiChat'; page.appendChild(r); }
    return r;
  }

  function shell(){
    const r=root(); if(!r) return null;
    if(!r.dataset.built){
      r.dataset.built='1';
      r.innerHTML=`<aside class="aiSide"><div class="aiSideTop"><div class="aiTitle"><div><h2>AI CHAT</h2><small>Una conversación. Todos los canales.</small></div><button class="aiIconBtn" id="aiRefresh">↻</button></div><input class="aiSearch" id="aiSearch" placeholder="Buscar persona o conversación"></div><div class="aiChannels" id="aiChannels"></div><div class="aiList" id="aiList"></div><div class="aiStatusBar"><span id="aiCount">0 conversaciones</span><span>Universal Omnichannel</span></div></aside><main class="aiMain"><header class="aiHead"><button class="aiIconBtn aiMobileBack" id="aiBack">←</button><div class="aiContact"><b id="aiContactName">Selecciona una conversación</b><span id="aiContactMeta">WhatsApp · SMS · Email · Social · Web Chat</span></div><div class="aiHeadBtns"><button class="aiIconBtn" id="aiStar" title="Destacar">☆</button><button class="aiIconBtn" id="aiCloudy" title="Pedir a Cloudy que analice la conversación">✦ Cloudy</button></div></header><div class="aiMessages" id="aiMessages"><div class="aiEmpty"><b>AI CHAT</b>Concentra la conversación del cliente en un solo lugar aunque cambie de WhatsApp a email, SMS, Instagram, Facebook o Web Chat.</div></div><footer class="aiComposer"><input class="aiSubject" id="aiSubject" placeholder="Asunto del email"><div class="aiComposeTop"><select class="aiSelect" id="aiSendChannel"><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="email">Email</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="webchat">Web Chat</option></select><button class="aiDraft" id="aiDraft">✦ AI Reply</button><button class="aiFileBtn" id="aiFile">▤ Archivo</button><span class="aiFileState" id="aiFileState">Sin archivo</span></div><div class="aiComposeRow"><textarea class="aiText" id="aiText" placeholder="Escribe una respuesta..."></textarea><button class="aiSend" id="aiSend">Enviar</button></div></footer></main>`;
      bind(r);
    }
    return r;
  }

  function bind(r){
    r.querySelector('#aiRefresh').onclick=()=>loadConversations(true);
    let t; r.querySelector('#aiSearch').oninput=()=>{clearTimeout(t);t=setTimeout(()=>paintList(),180)};
    r.querySelector('#aiBack').onclick=()=>r.classList.remove('openThread');
    r.querySelector('#aiSendChannel').onchange=()=>{r.querySelector('#aiSubject').style.display=r.querySelector('#aiSendChannel').value==='email'?'block':'none'};
    r.querySelector('#aiSend').onclick=send;
    r.querySelector('#aiDraft').onclick=draft;
    r.querySelector('#aiCloudy').onclick=analyze;
    r.querySelector('#aiStar').onclick=toggleStar;
    r.querySelector('#aiFile').onclick=chooseFile;
    r.querySelector('#aiText').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
  }

  function paintChannels(){
    const el=document.getElementById('aiChannels'); if(!el) return;
    const items=['all','whatsapp','sms','email','instagram','facebook','webchat'];
    el.innerHTML=items.map(c=>`<button class="aiChip ${c===activeChannel?'active':''}" data-c="${c}">${channelLabel(c)}</button>`).join('');
    el.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{activeChannel=b.dataset.c;paintChannels();paintList();});
  }

  function visibleConversations(){
    const q=(document.getElementById('aiSearch')?.value||'').trim().toLowerCase();
    return conversations.filter(c=>{
      const ch=channelFromType(c.lastMessageType||c.type);
      if(activeChannel!=='all'&&ch!==activeChannel)return false;
      if(!q)return true;
      return [convName(c),c.email,c.phone,c.lastMessageBody].some(v=>String(v||'').toLowerCase().includes(q));
    });
  }

  function paintList(){
    paintChannels();
    const el=document.getElementById('aiList'); if(!el)return;
    const list=visibleConversations();
    document.getElementById('aiCount').textContent=`${conversations.length} conversaciones`;
    if(!highLevel()){el.innerHTML='<div class="aiEmpty"><b>Conecta tus canales</b>AI CHAT unifica mensajería cuando HighLevel o los proveedores compatibles están conectados desde Connect.</div>';return;}
    el.innerHTML=list.map(c=>{const ch=channelFromType(c.lastMessageType||c.type),un=Number(c.unreadCount||0);return `<button class="aiConv ${currentConversation?.id===c.id?'active':''}" data-id="${esc(c.id)}"><span class="aiAvatar">${esc(initials(c))}</span><span class="aiConvMain"><span class="aiConvTop"><b>${esc(convName(c))}</b></span><span class="aiConvBody">${esc(c.lastMessageBody||'Sin mensajes')}</span><span class="aiChannel">${esc(channelLabel(ch))}${c.email?` · ${esc(c.email)}`:''}</span></span><span><span class="aiTime">${esc(when(c.lastMessageDate||c.dateUpdated))}</span>${un?`<span class="aiUnread">${un>99?'99+':un}</span>`:''}</span></button>`}).join('')||'<div class="aiEmpty"><b>Sin conversaciones</b>No hay conversaciones para este filtro.</div>';
    el.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>openConversation(b.dataset.id));
  }

  function extractMessages(raw){
    const a=raw?.result?.messages;
    if(Array.isArray(a))return a;
    if(Array.isArray(a?.messages))return a.messages;
    if(Array.isArray(a?.data))return a.data;
    if(Array.isArray(a?.messages?.messages))return a.messages.messages;
    return [];
  }

  function paintMessages(){
    const box=document.getElementById('aiMessages'); if(!box)return;
    if(!currentConversation){box.innerHTML='<div class="aiEmpty"><b>AI CHAT</b>Selecciona una conversación para ver el historial unificado.</div>';return;}
    const sorted=[...currentMessages].sort((a,b)=>new Date(a.dateAdded||a.createdAt||0)-new Date(b.dateAdded||b.createdAt||0));
    box.innerHTML=sorted.map(m=>{const out=String(m.direction||'').toLowerCase()==='outbound';const at=Array.isArray(m.attachments)?m.attachments:[];return `<div class="aiBubble ${out?'out':'in'}">${esc(m.body||m.message||m.text||'')}${at.map((u,i)=>`<a class="aiAttach" href="${esc(u)}" target="_blank" rel="noopener">Archivo ${i+1}</a>`).join('')}<div class="aiMeta">${esc(channelLabel(channelFromType(m.messageType||m.type)))} · ${esc(when(m.dateAdded||m.createdAt))}${m.status?` · ${esc(m.status)}`:''}</div></div>`}).join('')||'<div class="aiEmpty">Esta conversación todavía no tiene mensajes visibles.</div>';
    box.scrollTop=box.scrollHeight;
  }

  async function loadConversations(force=false){
    shell(); rename();
    if(!highLevel()){conversations=[];paintList();return;}
    if(busy&&!force)return; busy=true;
    try{
      const d=await hl('conversation.search',{limit:50,status:'all',sort:'desc',sort_by:'last_message_date'});
      conversations=d.result?.conversations||[];
      if(currentConversation){currentConversation=conversations.find(x=>x.id===currentConversation.id)||currentConversation;}
      paintList();
    }catch(err){const el=document.getElementById('aiList');if(el)el.innerHTML=`<div class="aiEmpty"><b>No pude sincronizar</b>${esc(err.message)}</div>`;}
    finally{busy=false;}
  }

  async function openConversation(id){
    const c=conversations.find(x=>String(x.id)===String(id)); if(!c)return;
    currentConversation=c; selectedFileId=null; document.getElementById('aiFileState').textContent='Sin archivo';
    const r=shell(); r.classList.add('openThread');
    document.getElementById('aiContactName').textContent=convName(c);
    document.getElementById('aiContactMeta').textContent=[channelLabel(channelFromType(c.lastMessageType||c.type)),c.phone,c.email].filter(Boolean).join(' · ');
    document.getElementById('aiSendChannel').value=channelFromType(c.lastMessageType||c.type);
    document.getElementById('aiSubject').style.display=document.getElementById('aiSendChannel').value==='email'?'block':'none';
    document.getElementById('aiStar').textContent=c.starred?'★':'☆';
    document.getElementById('aiMessages').innerHTML='<div class="aiEmpty">Cargando historial…</div>';
    paintList();
    try{
      const d=await hl('conversation.messages',{conversation_id:c.id,limit:100});
      currentMessages=extractMessages(d);
      paintMessages();
      if(Number(c.unreadCount||0)>0){hl('conversation.update',{conversation_id:c.id,unread_count:0}).catch(()=>{});c.unreadCount=0;paintList();}
    }catch(err){document.getElementById('aiMessages').innerHTML=`<div class="aiEmpty"><b>Error</b>${esc(err.message)}</div>`;}
  }

  async function send(){
    if(!currentConversation)return;
    const text=document.getElementById('aiText').value.trim();
    const channel=document.getElementById('aiSendChannel').value;
    const subject=document.getElementById('aiSubject').value.trim();
    if(!text && !selectedFileId)return;
    const btn=document.getElementById('aiSend');btn.disabled=true;btn.textContent='Enviando…';
    try{
      let attachments=[];
      if(selectedFileId){const f=await post('workspace-files',{organization_id:currentOrg.id,action:'download',file_id:selectedFileId});if(f.url)attachments=[f.url];}
      await hl('conversation.send_by_conversation',{conversation_id:currentConversation.id,type:sendType(channel),message:text,subject:channel==='email'?(subject||'Mensaje de CloudSales'):undefined,attachments});
      document.getElementById('aiText').value='';document.getElementById('aiSubject').value='';selectedFileId=null;document.getElementById('aiFileState').textContent='Sin archivo';
      setTimeout(()=>openConversation(currentConversation.id),900);
    }catch(err){alert(err.message);}finally{btn.disabled=false;btn.textContent='Enviar';}
  }

  async function draft(){
    if(!currentConversation)return;
    const btn=document.getElementById('aiDraft');btn.disabled=true;btn.textContent='Pensando…';
    try{
      const recent=[...currentMessages].slice(-10).map(m=>`${String(m.direction).toLowerCase()==='outbound'?'Negocio':'Cliente'}: ${m.body||m.message||''}`).join('\n');
      const prompt=`Redacta UNA respuesta breve, humana y útil para enviar al cliente ${convName(currentConversation)}. Mantén el idioma de la conversación. No inventes información. Devuelve únicamente el texto listo para enviar. Conversación reciente:\n${recent}`;
      const d=await post('cloudy-chat',{organization_id:currentOrg.id,message:prompt,locale:'es'});
      document.getElementById('aiText').value=String(d.reply||'').trim();
      document.getElementById('aiText').focus();
    }catch(err){alert(err.message);}finally{btn.disabled=false;btn.textContent='✦ AI Reply';}
  }

  async function analyze(){
    if(!currentConversation)return;
    const recent=[...currentMessages].slice(-15).map(m=>`${String(m.direction).toLowerCase()==='outbound'?'Negocio':'Cliente'}: ${m.body||m.message||''}`).join('\n');
    try{
      const d=await post('cloudy-chat',{organization_id:currentOrg.id,message:`Analiza esta conversación con ${convName(currentConversation)}. Resume intención, urgencia, siguiente mejor acción y si parece lead calificado. No envíes nada al cliente.\n${recent}`,locale:'es'});
      alert(d.reply||'Análisis listo.');
    }catch(err){alert(err.message);}
  }

  async function toggleStar(){
    if(!currentConversation)return;
    const next=!Boolean(currentConversation.starred);
    try{await hl('conversation.update',{conversation_id:currentConversation.id,starred:next});currentConversation.starred=next;document.getElementById('aiStar').textContent=next?'★':'☆';paintList();}catch(err){alert(err.message);}
  }

  async function chooseFile(ev){
    document.querySelectorAll('.aiFileMenu').forEach(x=>x.remove());
    try{
      const d=await post('workspace-files',{organization_id:currentOrg.id,action:'list'});const files=(d.files||[]).slice(0,100);
      const menu=document.createElement('div');menu.className='aiFileMenu';
      menu.innerHTML=files.map(f=>`<button class="aiFileChoice" data-id="${esc(f.id)}"><b>${esc(f.file_name)}</b><br><small>${esc(f.category||'general')}</small></button>`).join('')||'<div class="aiEmpty">No hay archivos en este workspace.</div>';
      document.body.appendChild(menu);const r=ev.currentTarget.getBoundingClientRect();menu.style.left=Math.min(r.left,innerWidth-menu.offsetWidth-12)+'px';menu.style.top=Math.max(12,r.top-menu.offsetHeight-8)+'px';
      menu.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{selectedFileId=b.dataset.id;document.getElementById('aiFileState').textContent=b.querySelector('b').textContent;menu.remove();});
      setTimeout(()=>document.addEventListener('click',function close(e){if(!menu.contains(e.target)&&e.target!==ev.currentTarget){menu.remove();document.removeEventListener('click',close)}},{capture:true}),0);
    }catch(err){alert(err.message);}
  }

  function render(){
    rename();style();shell();
    if(location.hash.startsWith('#inbox')){if(window.pageTitle)pageTitle.textContent='AI CHAT';loadConversations(false);if(!refreshTimer)refreshTimer=setInterval(()=>{if(location.hash.startsWith('#inbox'))loadConversations(true)},30000);}
  }

  function boot(){
    style();rename();shell();
    document.addEventListener('click',e=>{const b=e.target.closest?.('[data-page="inbox"]');if(b)setTimeout(render,30)});
    window.addEventListener('hashchange',()=>setTimeout(render,40));
    new MutationObserver(rename).observe(document.body,{childList:true,subtree:true});
    setInterval(()=>{rename();if(location.hash.startsWith('#inbox'))render();},2500);
    if(location.hash.startsWith('#inbox'))render();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();