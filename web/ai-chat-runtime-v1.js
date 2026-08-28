(() => {
  'use strict';

  const VERSION = '2026.08.28.1';
  const LABEL = 'AI CHAT';

  function style(){
    if(document.getElementById('cs-ai-chat-css')) return;
    const s=document.createElement('style');
    s.id='cs-ai-chat-css';
    s.textContent=`
      .csAiChatIntro{margin:0 0 16px;border:1px solid #30303e;border-radius:22px;background:linear-gradient(180deg,#13131d,#0d0d14);padding:18px}
      .csAiChatIntroTop{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
      .csAiChatIntro h3{margin:0;font-size:20px;letter-spacing:-.02em}.csAiChatIntro p{margin:6px 0 0;color:#9695a7;font-size:12px;line-height:1.55;max-width:760px}
      .csAiBadge{border:1px solid #4a3653;background:#211624;color:#ff9bd2;border-radius:999px;padding:7px 10px;font-size:9px;font-weight:900;letter-spacing:.08em;white-space:nowrap}
      .csAiChannels{display:flex;gap:7px;flex-wrap:wrap;margin-top:14px}.csAiChannel{border:1px solid #343443;background:#111119;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:800;color:#d8d7e1}
      .csAiPrinciples{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}.csAiPrinciple{border:1px solid #292936;background:#101018;border-radius:14px;padding:11px}.csAiPrinciple b{display:block;font-size:11px}.csAiPrinciple span{display:block;color:#858596;font-size:10px;line-height:1.4;margin-top:4px}
      @media(max-width:800px){.csAiChatIntroTop{flex-direction:column}.csAiPrinciples{grid-template-columns:1fr}.csAiBadge{white-space:normal}}
    `;
    document.head.appendChild(s);
  }

  function renameVisibleUi(){
    document.querySelectorAll('[data-page="inbox"]').forEach(btn=>{
      const icon=btn.querySelector('.navicon')?.outerHTML || (btn.querySelector('b')?.outerHTML || '');
      btn.innerHTML=`${icon}${LABEL}`;
      btn.setAttribute('aria-label',LABEL);
      btn.setAttribute('title','AI CHAT · Omnicanal universal');
    });

    const page=document.getElementById('page-inbox');
    if(page){
      const head=page.querySelector('.sectionHead');
      const h=head?.querySelector('h2');
      const p=head?.querySelector('p');
      if(h) h.textContent=LABEL;
      if(p) p.textContent='Omnicanal universal de conversaciones y mensajería. Unifica WhatsApp, SMS, Email, Instagram, Facebook Messenger, Web Chat y conversaciones de CRM en una sola experiencia operada por IA.';
      page.setAttribute('data-product-name',LABEL);
      page.setAttribute('aria-label',LABEL);
    }

    const title=document.getElementById('pageTitle');
    if(title && document.getElementById('page-inbox')?.classList.contains('active')) title.textContent=LABEL;
  }

  function ensureIntro(){
    const page=document.getElementById('page-inbox');
    if(!page) return;
    let root=document.getElementById('csAiChatIntro');
    if(!root){
      root=document.createElement('div');
      root.id='csAiChatIntro';
      root.className='csAiChatIntro';
      const head=page.querySelector('.sectionHead');
      head?.insertAdjacentElement('afterend',root);
    }
    root.innerHTML=`
      <div class="csAiChatIntroTop">
        <div><h3>Una conversación. Todos los canales.</h3><p>AI CHAT no es una bandeja de entrada. Es la capa universal donde Cloudy y AgentCloud pueden entender el contexto completo de cada contacto, responder por el canal correcto, compartir archivos, calificar, dar seguimiento, escalar a una persona y conectar la conversación con citas y pipeline.</p></div>
        <span class="csAiBadge">UNIVERSAL OMNICHANNEL</span>
      </div>
      <div class="csAiChannels"><span class="csAiChannel">WhatsApp</span><span class="csAiChannel">SMS</span><span class="csAiChannel">Email</span><span class="csAiChannel">Instagram</span><span class="csAiChannel">Facebook Messenger</span><span class="csAiChannel">Web Chat</span><span class="csAiChannel">CRM</span></div>
      <div class="csAiPrinciples">
        <div class="csAiPrinciple"><b>Contexto universal</b><span>Un mismo contacto conserva historial, archivos, intención, calificación y etapa aunque cambie de canal.</span></div>
        <div class="csAiPrinciple"><b>IA + humano</b><span>Cloudy coordina AgentCloud y permite handoff humano sin perder el hilo ni duplicar conversaciones.</span></div>
        <div class="csAiPrinciple"><b>Acción comercial</b><span>La conversación puede enviar documentos, actualizar CRM, mover oportunidades y convertir disponibilidad en citas.</span></div>
      </div>`;
  }

  function bind(){
    document.querySelectorAll('[data-page="inbox"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(()=>{
      renameVisibleUi();
      ensureIntro();
      const title=document.getElementById('pageTitle'); if(title) title.textContent=LABEL;
    },20)));
    const observer=new MutationObserver(()=>{
      const page=document.getElementById('page-inbox');
      if(page?.classList.contains('active')){
        renameVisibleUi(); ensureIntro();
        const title=document.getElementById('pageTitle'); if(title) title.textContent=LABEL;
      }
    });
    const shell=document.getElementById('shell')||document.body;
    observer.observe(shell,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
  }

  function start(){
    style();
    renameVisibleUi();
    ensureIntro();
    bind();
    document.documentElement.dataset.aiChatRuntime=VERSION;
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();