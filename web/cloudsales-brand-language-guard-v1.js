(()=>{
'use strict';
const VERSION='2026.09.03.2';
const BRAND={purple:'#2D0A4A',pink:'#F955B6',white:'#F3F4F8',canvas:'#08070D',canvasAlt:'#070713',panel:'#121019',panel2:'#17141F',line:'#37323F',muted:'#AAA7B2',violet:'#C13BE4'};
const COPY={
 es:{
  eyebrow:'IA TRABAJANDO POR TI · MEJORES LEADS · TU CRM EN LA PALMA DE TU MANO',
  hero:'La IA trabaja por ti. <span class="grad">Tú mantienes el control.</span>',
  lead:'CloudSales opera sobre tu CRM: Cloudy coordina tareas y prioridades, AgentCloud atiende prospectos y la capa de calidad ayuda a reducir junk leads y priorizar oportunidades reales. Tú revisas, decides y controlas tu operación desde el celular.',
  micro:'No es otro CRM. No es otra app que tienes que administrar. Es la capa de IA que trabaja sobre tu operación.',
  hookKicker:'NO ES OTRA APP MÁS',
  hookTitle:'Tu negocio no necesita más software que administrar. Necesita IA que haga el trabajo.',
  hookLead:'Conecta el CRM que ya utilizas. CloudSales coordina la operación encima de esa infraestructura para ayudarte a conseguir prospectos de mejor calidad, dar seguimiento, mover oportunidades y mantener el control desde la palma de tu mano.',
  setupKicker:'PARTE 1 · CONFIGURACIÓN + PROTECCIÓN',
  setupTitle:'Primero organiza y protege. Después escala.',
  setupLead:'Cloudy ayuda a preparar la operación, conectar lo que ya utilizas y activar controles de calidad antes de pedirte que aumentes inversión.',
  cloudyKicker:'PARTE 2 · CLOUDY',
  cloudyTitle:'Cloudy es tu operador personal de IA.',
  cloudyLead:'Habla o escribe lo que necesitas. Cloudy coordina CRM, marketing, ventas, seguimiento, citas, tareas y prioridades dentro de tus permisos. Tú mantienes la decisión; Cloudy absorbe trabajo operativo.',
  agentsKicker:'PARTE 4 · AGENTCLOUD',
  agentsTitle:'AgentCloud es tu equipo de IA de cara al cliente.',
  agentsLead:'Cloudy coordina la operación. AgentCloud conversa con prospectos: califica, responde, da seguimiento, ayuda a vender, agenda citas y escala a una persona cuando corresponde, usando únicamente información y acciones autorizadas.',
  appKicker:'CONTROL DESDE LA PALMA DE TU MANO',
  appTitle:'Toda tu operación comercial, sin vivir frente a la computadora.',
  appLead:'Revisa prospectos, conversaciones, citas, pipeline, campañas y prioridades desde el celular. Pídele a Cloudy que haga el trabajo y entra al detalle solo cuando necesitas revisar, aprobar o decidir.',
  calm:'Más tranquilidad. Menos trabajo manual. Mejor calidad de prospectos. Más tiempo para vender, dirigir tu negocio o simplemente alejarte de la computadora sin perder el control.',
  finalKicker:'MIRA A LA IA TRABAJAR',
  finalTitle:'Conecta tu operación y deja que Cloudy te demuestre el valor.',
  finalLead:'CloudSales no busca darte otra pantalla que administrar. Busca que la inteligencia artificial haga más trabajo por ti mientras tú conservas el control de tu negocio.',
  bmpKicker:'CLOUDSALES · PLATAFORMA DE GESTIÓN EMPRESARIAL CON IA',
  bmpTitle:'Tu CRM es la infraestructura. CloudSales es la capa de IA que lo opera contigo.',
  bmpIntro:'CloudSales conecta tu CRM, datos, archivos, campañas y agentes de IA en una sola capa operativa. Cloudy ayuda a configurar, coordinar y ejecutar trabajo comercial para que el CRM deje de convertirse en otra herramienta que tú tienes que alimentar manualmente.',
  bmpQuality:'La adquisición no termina cuando llega un formulario. CloudSales conecta validación, scoring, seguimiento y señales de conversión para ayudarte a reducir junk leads y priorizar prospectos con mayor intención.',
  crmCall:'CONECTA TU CRM Y MIRA A CLOUDY TRABAJAR'
 },
 en:{
  eyebrow:'AI WORKING FOR YOU · BETTER LEADS · YOUR CRM IN THE PALM OF YOUR HAND',
  hero:'AI works for you. <span class="grad">You stay in control.</span>',
  lead:'CloudSales operates on top of your CRM: Cloudy coordinates work and priorities, AgentCloud engages prospects, and the lead-quality layer helps reduce junk and prioritize real opportunities. You review, decide, and control the operation from your phone.',
  micro:'Not another CRM. Not another app you have to manage. It is the AI operating layer working on top of your business.',
  hookKicker:'NOT ANOTHER APP',
  hookTitle:'Your business does not need more software to manage. It needs AI that does the work.',
  hookLead:'Connect the CRM you already use. CloudSales coordinates the operation on top of that infrastructure to help you get better-quality prospects, follow up, move opportunities forward, and stay in control from the palm of your hand.',
  setupKicker:'PART 1 · SETUP + PROTECTION',
  setupTitle:'Organize and protect first. Scale second.',
  setupLead:'Cloudy helps prepare the operation, connect what you already use, and activate lead-quality controls before asking you to increase spend.',
  cloudyKicker:'PART 2 · CLOUDY',
  cloudyTitle:'Cloudy is your personal AI operator.',
  cloudyLead:'Speak or type what you need. Cloudy coordinates CRM, marketing, sales, follow-up, appointments, tasks, and priorities within your permissions. You keep the decision; Cloudy absorbs operational work.',
  agentsKicker:'PART 4 · AGENTCLOUD',
  agentsTitle:'AgentCloud is your customer-facing AI team.',
  agentsLead:'Cloudy coordinates the operation. AgentCloud engages prospects: qualifies, answers, follows up, supports sales, books appointments, and hands off to a person when appropriate, using only authorized information and actions.',
  appKicker:'CONTROL FROM THE PALM OF YOUR HAND',
  appTitle:'Your entire commercial operation, without living in front of a computer.',
  appLead:'Review prospects, conversations, appointments, pipeline, campaigns, and priorities from your phone. Ask Cloudy to do the work and go into detail only when you need to review, approve, or decide.',
  calm:'More peace of mind. Less manual work. Better-quality prospects. More time to sell, lead your business, or step away from the computer without losing control.',
  finalKicker:'WATCH AI WORK',
  finalTitle:'Connect your operation and let Cloudy prove the value.',
  finalLead:'CloudSales is not trying to give you another screen to manage. It is designed so AI can do more work for you while you keep control of your business.',
  bmpKicker:'CLOUDSALES · AI BUSINESS MANAGEMENT PLATFORM',
  bmpTitle:'Your CRM is the infrastructure. CloudSales is the AI layer that operates it with you.',
  bmpIntro:'CloudSales connects your CRM, data, files, campaigns, and AI agents in one operating layer. Cloudy helps configure, coordinate, and execute commercial work so the CRM stops becoming another system you have to feed manually.',
  bmpQuality:'Acquisition does not end when a form is submitted. CloudSales connects validation, scoring, follow-up, and conversion signals to help reduce junk and prioritize higher-intent prospects.',
  crmCall:'CONNECT YOUR CRM AND WATCH CLOUDY WORK'
 }
};
function locale(){const raw=(document.documentElement.lang||'').toLowerCase();if(raw.startsWith('es'))return'es';if(raw.startsWith('en'))return'en';return'other'}
function one(s){return document.querySelector(s)}
function setText(s,v){const e=one(s);if(e&&v!=null&&e.textContent!==v)e.textContent=v}
function setHtml(s,v){const e=one(s);if(e&&v!=null&&e.innerHTML!==v)e.innerHTML=v}
function setMeta(n,v){const e=one(`meta[name="${n}"]`);if(e&&e.getAttribute('content')!==v)e.setAttribute('content',v)}
function style(){let s=document.getElementById('cloudsales-canonical-brand-v1');if(!s){s=document.createElement('style');s.id='cloudsales-canonical-brand-v1';document.head.appendChild(s)}const css=`
:root{--cs-brand-purple:${BRAND.purple};--cs-brand-pink:${BRAND.pink};--cs-brand-white:${BRAND.white};--bg:${BRAND.canvas}!important;--bg2:${BRAND.panel}!important;--panel:${BRAND.panel}!important;--panel2:${BRAND.panel2}!important;--line:${BRAND.line}!important;--text:${BRAND.white}!important;--muted:${BRAND.muted}!important;--pink:${BRAND.pink}!important;--violet:${BRAND.violet}!important}
html,body{background:${BRAND.canvas}!important;color:${BRAND.white}!important}body{background-image:radial-gradient(920px 520px at 50% -180px,${BRAND.purple} 0,rgba(45,10,74,.62) 28%,transparent 72%)!important}.nav{background:rgba(8,7,13,.94)!important;border-bottom:1px solid rgba(249,85,182,.12)!important}.brand img{height:39px!important;width:auto!important;max-width:210px!important;object-fit:contain!important;background:transparent!important}.hero h1,.section h2,.csStoryTitle,.csBmp h3{color:${BRAND.white}!important}.grad,.hero h1 .grad,.hero h1 span.grad{background:linear-gradient(90deg,${BRAND.white} 0%,#F7D7EC 34%,${BRAND.pink} 100%)!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important;color:transparent!important;opacity:1!important}.hero p,.lead,.card p,.faq p,.micro,.csStoryLead,.csStoryCard p,.csBmpIntro{color:${BRAND.muted}!important}.btn.primary,.csHeroTrial,.csFinalTrial,.csFooterCrmBtn{background:linear-gradient(135deg,${BRAND.pink} 0%,#E548C9 58%,${BRAND.violet} 100%)!important;border:0!important;box-shadow:0 14px 38px rgba(249,85,182,.27)!important;color:#fff!important}.btn:not(.primary){background:#121019!important;border-color:#3B3442!important;color:${BRAND.white}!important}.card,.crm,.faq details,.included,.mission,.csStoryCard,.csSaving{background:linear-gradient(180deg,#15121B,#0E0C13)!important;border-color:#39323F!important}.csHookPanel,.csFinalBox,.csBmp{background:radial-gradient(520px 250px at 100% 0,rgba(249,85,182,.09),transparent 70%),linear-gradient(145deg,rgba(45,10,74,.54),#100D14)!important;border-color:rgba(249,85,182,.26)!important}.csStoryKicker,.csBmpKicker,.csStoryNum{color:#F6A5D4!important}.csGrowthIndex,.csBmpStep b{background:linear-gradient(135deg,${BRAND.pink},${BRAND.violet})!important}.cs-crm-band{background:#0C0911!important;border-color:#332A39!important}.cs-crm-item{background:#141019!important;border-color:#3A3040!important;color:${BRAND.white}!important}.cs-crm-call{background:linear-gradient(90deg,rgba(249,85,182,.09),rgba(45,10,74,.34))!important;border-color:rgba(249,85,182,.23)!important}.cs-crm-call strong{background:linear-gradient(90deg,${BRAND.white},#F8C9E5,${BRAND.pink})!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important}@media(max-width:620px){.brand img{height:35px!important;max-width:174px!important}.navin{gap:10px!important}.hero h1{letter-spacing:-.055em!important}}
`;if(s.textContent!==css)s.textContent=css}
function showWithheld(){document.querySelectorAll('[data-cs-withheld-untranslated="1"]').forEach(e=>{e.hidden=false;e.removeAttribute('data-cs-withheld-untranslated')})}
function supported(lang){const c=COPY[lang];document.documentElement.dataset.csLanguageIntegrity='strict';document.documentElement.dataset.csBrandCanonical=VERSION;showWithheld();setHtml('section.hero h1,.hero h1',c.hero);setText('section.hero .eyebrow,.hero .eyebrow',c.eyebrow);const hero=one('section.hero,.hero');if(hero){const p=hero.querySelector('p');if(p&&p.textContent!==c.lead)p.textContent=c.lead;const m=hero.querySelector('.micro');if(m&&m.textContent!==c.micro)m.textContent=c.micro}
setText('#cs-story-hook .csStoryKicker',c.hookKicker);setText('#cs-story-hook .csStoryTitle',c.hookTitle);setText('#cs-story-hook .csStoryLead',c.hookLead);setText('#cs-story-setup .csStoryKicker',c.setupKicker);setText('#cs-story-setup .csStoryTitle',c.setupTitle);setText('#cs-story-setup .csStoryLead',c.setupLead);setText('#cs-story-cloudy .csStoryKicker',c.cloudyKicker);setText('#cs-story-cloudy .csStoryTitle',c.cloudyTitle);setText('#cs-story-cloudy .csStoryLead',c.cloudyLead);setText('#cs-story-agents .csStoryKicker',c.agentsKicker);setText('#cs-story-agents .csStoryTitle',c.agentsTitle);setText('#cs-story-agents .csStoryLead',c.agentsLead);setText('#cs-story-app .csStoryKicker',c.appKicker);setText('#cs-story-app .csStoryTitle',c.appTitle);setText('#cs-story-app .csStoryLead',c.appLead);setText('#cs-story-app .csCalm',c.calm);setText('#cs-story-final .csStoryKicker',c.finalKicker);setText('#cs-story-final .csStoryTitle',c.finalTitle);setText('#cs-story-final .csStoryLead',c.finalLead);setText('#business-management-platform .csBmpKicker',c.bmpKicker);setText('#business-management-platform h3',c.bmpTitle);setText('#business-management-platform .csBmpIntro',c.bmpIntro);setText('#business-management-platform .csBmpQuality',c.bmpQuality);document.querySelectorAll('.cs-crm-call strong').forEach(e=>{if(e.textContent!==c.crmCall)e.textContent=c.crmCall});
if(lang==='es'){document.querySelectorAll('*').forEach(e=>{if(e.children.length)return;const t=(e.textContent||'').trim();if(t==='PARTE 1 · SETUP + PROTECCIÓN')e.textContent='PARTE 1 · CONFIGURACIÓN + PROTECCIÓN';else if(t==='Atención y troubleshooting')e.textContent='Atención y resolución de problemas';else if(t==='Lead Quality')e.textContent='Calidad de prospectos'});document.title='CloudSales — IA trabajando por ti, mejores leads y control desde tu celular';setMeta('description','CloudSales opera sobre tu CRM con Cloudy y AgentCloud, ayuda a reducir junk leads, prioriza mejores oportunidades y te permite controlar tu operación desde la palma de tu mano.')}else{document.title='CloudSales — AI working for you, better leads and mobile control';setMeta('description','CloudSales operates on top of your CRM with Cloudy and AgentCloud, helps reduce junk leads, prioritizes better opportunities, and lets you control your operation from the palm of your hand.')}}
function unsupported(){document.documentElement.dataset.csLanguageIntegrity='strict-no-fallback';document.documentElement.dataset.csBrandCanonical=VERSION;document.querySelectorAll('#cs-story-hook,#cs-story-setup,#cs-story-cloudy,#cs-story-growth,#cs-story-agents,#cs-story-app,#cs-story-final,#business-management-platform,.csStoryPricingNote,.csCrmMore,.cs-crm-call').forEach(e=>{e.hidden=true;e.setAttribute('data-cs-withheld-untranslated','1')})}
function apply(){style();const l=locale();if(l==='es'||l==='en')supported(l);else unsupported()}
function boot(){apply();setTimeout(apply,120);setTimeout(apply,420);setTimeout(apply,1100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
new MutationObserver(()=>{setTimeout(apply,40)}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
