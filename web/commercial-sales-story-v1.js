(()=>{
'use strict';
const VERSION='2026.09.02.1';
const COPY={
  es:{
    eyebrow:'CLOUDY · MEJORES LEADS · MENOS DESPERDICIO · MÁS CONTROL',
    hero:'Deja de administrar herramientas. <span class="grad">Deja que la IA opere contigo.</span>',
    heroLead:'CloudSales conecta marketing, CRM, seguimiento, citas y señales de conversión. Cloudy coordina la operación y AgentCloud atiende a tus prospectos para que puedas enfocarte en crecer.',
    micro:'Menos junk leads. Menos trabajo manual. Más prospectos reales, más citas y más control desde tu celular.',
    hookKicker:'NO NECESITAS OTRA HERRAMIENTA',
    hookTitle:'Necesitas que tu operación comercial trabaje todos los días.',
    hookLead:'CloudSales convierte sistemas dispersos en una operación coordinada por inteligencia artificial: primero configura, después protege tu inversión publicitaria, luego ejecuta y finalmente aprende de los resultados para mejorar.',
    setupKicker:'PARTE 1 · CONFIGURACIÓN + PROTECCIÓN',
    setupTitle:'Cloudy prepara la máquina antes de pedirte que gastes más.',
    setupLead:'Conecta lo que ya usas. Cloudy organiza la estructura, configura el flujo comercial y activa protección de calidad de leads antes de escalar campañas.',
    setupCards:[
      ['Conecta','CRM, Drive, calendarios, canales y activos autorizados. Si ya tienes herramientas, CloudSales trabaja encima de ellas en lugar de obligarte a empezar de cero.'],
      ['Configura','Pipelines, etapas, campos, asignaciones, calendarios, automatizaciones, seguimiento y reglas operativas para que cada lead tenga un siguiente paso.'],
      ['Protege','Landing o sitio de campaña + Junk Lead Firewall con validación, scoring, anti-bot, deduplicación, rate limiting y controles de seguridad para reducir tráfico basura antes del CRM.'],
      ['Mide','Atribución, eventos web, eventos CRM y señales de conversión para distinguir un formulario barato de un lead que realmente avanza hacia cita y venta.']
    ],
    pricingTitle:'Empieza pequeño. Escala cuando dé resultados.',
    pricingLead:'Todos los planes incluyen 7 días de prueba. Elige el nivel que encaja hoy; Cloudy te ayuda a crecer sin obligarte a comprar una torre de herramientas desde el primer día.',
    cloudyKicker:'PARTE 2 · CLOUDY',
    cloudyTitle:'Cloudy es el operador de IA de tu negocio.',
    cloudyLead:'No es un chatbot decorativo. Cloudy coordina marketing, ventas, operación y prioridades usando las conexiones y permisos que tú autorizas.',
    cloudyCards:[
      ['Marketing','Prepara campañas, usa tus activos, propone creativos y mensajes, crea contenido, coordina publicaciones y analiza qué fuentes generan leads de mejor calidad.'],
      ['Ventas','Prioriza oportunidades, ayuda a calificar, vigila el pipeline, detecta leads sin atender, coordina seguimiento y empuja cada oportunidad hacia un siguiente paso.'],
      ['Operación','Revisa conexiones, automatizaciones, tareas, excepciones y salud de la ejecución para reducir trabajo repetitivo y detectar problemas antes de que se conviertan en pérdidas.'],
      ['Dirección','Resume qué pasó, qué cambió, qué requiere atención y qué conviene hacer después. Tú decides; Cloudy ejecuta dentro de tus permisos.']
    ],
    growthKicker:'PARTE 3 · MEJORA CONTINUA',
    growthTitle:'Publica. Aprende. Mejora. Repite.',
    growthLead:'Cuando autorizas tus canales y reglas, Cloudy convierte una idea en un ciclo de crecimiento continuo en lugar de campañas aisladas.',
    growthSteps:[
      ['1','Blog + SEO','Publica contenido útil y mantiene el sitio actualizado con información aprobada, productos, servicios, inventario y nuevas oportunidades.'],
      ['2','Redes sociales','Adapta el contenido a los canales conectados y prepara o publica piezas de forma recurrente según la cadencia autorizada.'],
      ['3','Campañas','Convierte los mejores ángulos en variaciones publicitarias y coordina pruebas sin confundir clics baratos con resultados reales.'],
      ['4','Calidad','Compara calidad de prospectos, costo por prospecto calificado, citas y avance del pipeline para saber qué campaña merece más presupuesto y cuál debe corregirse.'],
      ['5','Aprendizaje','Devuelve señales de conversión, actualiza prioridades y usa los resultados para que el siguiente ciclo empiece con más información que el anterior.']
    ],
    agentsKicker:'PARTE 4 · AGENTCLOUD',
    agentsTitle:'Tus agentes de IA trabajan de cara al cliente.',
    agentsLead:'Cloudy coordina. AgentCloud conversa. Cada agente tiene una función concreta y utiliza únicamente información, archivos, inventario, calendarios y acciones autorizadas.',
    agentCards:[
      ['Calificación','Responde rápido, entiende la necesidad, recopila datos útiles, identifica intención y separa conversaciones reales de oportunidades que todavía no están listas.'],
      ['Ventas y seguimiento','Mantiene contexto, responde preguntas, maneja objeciones con información aprobada, envía materiales permitidos y ejecuta seguimiento autorizado sin perder el hilo.'],
      ['Citas','Consulta disponibilidad real, propone horarios, agenda en calendarios conectados, confirma datos y ayuda a mover la oportunidad a la etapa correcta.'],
      ['Atención y resolución de problemas','Resuelve dudas frecuentes, guía al usuario paso a paso, utiliza la base de conocimiento disponible y escala a una persona únicamente cuando hace falta.']
    ],
    appKicker:'¿QUÉ HACE LA APP?',
    appTitle:'Te devuelve el control de tu negocio.',
    appLead:'CloudSales te ayuda a llevar mejor control de tu negocio o emprendimiento, reducir dependencia de agencias y equipos operativos, evitar desperdiciar presupuesto en anuncios que consumen dinero sin producir oportunidades útiles y reemplazar una colección de herramientas desconectadas por una sola capa de control.',
    calm:'Y lo más importante para nosotros: te da una tranquilidad absoluta. Dejas el estrés operativo y puedes manejar tu negocio desde la palma de tu mano, gracias a la inteligencia artificial.',
    boundaries:'Cloudy y AgentCloud trabajan dentro de tus conexiones, permisos y reglas. Acciones sensibles como gasto publicitario, precios, contratos, seguridad o cambios destructivos pueden requerir aprobación.',
    finalKicker:'PRUÉBALO EN TU NEGOCIO',
    finalTitle:'No compres otra promesa. Mira a Cloudy trabajar durante 7 días.',
    finalLead:'Conecta tu operación, deja que Cloudy te muestre qué puede organizar, proteger y mejorar, y decide con datos si CloudSales merece quedarse.',
    trial:'7 DÍAS CLOUDY GRATIS',
    plans:'VER PLANES'
  },
  en:{
    eyebrow:'CLOUDY · BETTER LEADS · LESS WASTE · MORE CONTROL',
    hero:'Stop managing tools. <span class="grad">Let AI operate with you.</span>',
    heroLead:'CloudSales connects marketing, CRM, follow-up, appointments and conversion signals. Cloudy coordinates the operation while AgentCloud engages prospects so you can focus on growth.',
    micro:'Less junk. Less manual work. More real prospects, more appointments and more control from your phone.',
    hookKicker:'YOU DO NOT NEED ANOTHER TOOL',
    hookTitle:'You need your commercial operation working every day.',
    hookLead:'CloudSales turns scattered systems into an AI-coordinated operation: first it sets up the structure, then protects ad spend, then executes, and finally learns from outcomes to improve.',
    setupKicker:'PART 1 · SETUP + PROTECTION',
    setupTitle:'Cloudy prepares the machine before asking you to spend more.',
    setupLead:'Connect what you already use. Cloudy organizes the structure, configures the commercial flow and activates lead-quality protection before campaigns scale.',
    setupCards:[
      ['Connect','CRM, Drive, calendars, channels and authorized assets. If you already use tools, CloudSales works on top of them instead of forcing a rebuild.'],
      ['Configure','Pipelines, stages, fields, assignments, calendars, automations, follow-up and operating rules so every lead has a next step.'],
      ['Protect','Campaign landing/site + Junk Lead Firewall with validation, scoring, anti-bot controls, deduplication, rate limiting and security checks to reduce junk before the CRM.'],
      ['Measure','Attribution, web events, CRM events and conversion signals so you can distinguish a cheap form fill from a lead that actually moves toward an appointment and sale.']
    ],
    pricingTitle:'Start small. Scale when it produces results.',
    pricingLead:'Every plan includes a 7-day trial. Choose the level that fits today; Cloudy helps you grow without forcing you to buy a tower of tools on day one.',
    cloudyKicker:'PART 2 · CLOUDY',
    cloudyTitle:'Cloudy is your AI business operator.',
    cloudyLead:'It is not a decorative chatbot. Cloudy coordinates marketing, sales, operations and priorities through the connections and permissions you authorize.',
    cloudyCards:[
      ['Marketing','Prepares campaigns, uses your assets, proposes creative and messaging, creates content, coordinates publishing and analyzes which sources produce better-quality leads.'],
      ['Sales','Prioritizes opportunities, supports qualification, watches the pipeline, detects unattended leads, coordinates follow-up and pushes each opportunity toward a clear next step.'],
      ['Operations','Checks connections, automations, tasks, exceptions and execution health to reduce repetitive work and catch problems before they become losses.'],
      ['Executive control','Summarizes what happened, what changed, what needs attention and what to do next. You decide; Cloudy executes within your permissions.']
    ],
    growthKicker:'PART 3 · CONTINUOUS IMPROVEMENT',
    growthTitle:'Publish. Learn. Improve. Repeat.',
    growthLead:'When you authorize channels and operating rules, Cloudy turns one idea into a continuous growth cycle instead of isolated campaigns.',
    growthSteps:[
      ['1','Blog + SEO','Publishes useful content and keeps the site current with approved information, products, services, inventory and new opportunities.'],
      ['2','Social media','Adapts content for connected channels and prepares or publishes recurring pieces according to the cadence you authorize.'],
      ['3','Campaigns','Turns winning angles into ad variations and coordinates testing without confusing cheap clicks with real business results.'],
      ['4','Quality','Compares lead quality, qualified CPL, appointments and pipeline movement to decide what deserves more budget and what needs correction.'],
      ['5','Learning','Feeds conversion signals back, updates priorities and uses results so the next cycle starts with more information than the previous one.']
    ],
    agentsKicker:'PART 4 · AGENTCLOUD',
    agentsTitle:'Your AI agents work on the customer-facing front line.',
    agentsLead:'Cloudy coordinates. AgentCloud converses. Each agent has a clear job and uses only approved information, files, inventory, calendars and actions.',
    agentCards:[
      ['Qualification','Responds quickly, understands the need, captures useful information, identifies intent and separates real conversations from opportunities that are not ready yet.'],
      ['Sales & follow-up','Keeps context, answers questions, handles objections with approved information, sends permitted materials and executes authorized follow-up without losing the thread.'],
      ['Appointments','Checks real availability, proposes times, books connected calendars, confirms details and helps move the opportunity into the correct stage.'],
      ['Customer service & troubleshooting','Resolves common questions, guides users step by step, uses available knowledge and escalates to a person only when needed.']
    ],
    appKicker:'WHAT DOES THE APP DO?',
    appTitle:'It gives you control of your business back.',
    appLead:'CloudSales helps you control your business, reduce dependence on agencies and operating teams, avoid wasting ad budget on activity that produces no useful opportunities, and replace a collection of disconnected tools with one control layer.',
    calm:'Most importantly for us: it gives you real peace of mind. You leave operational stress behind and can manage your business from the palm of your hand, powered by artificial intelligence.',
    boundaries:'Cloudy and AgentCloud operate within your connections, permissions and rules. Sensitive actions such as ad spend, pricing, contracts, security or destructive changes may require approval.',
    finalKicker:'TRY IT IN YOUR BUSINESS',
    finalTitle:'Do not buy another promise. Watch Cloudy work for 7 days.',
    finalLead:'Connect your operation, let Cloudy show you what it can organize, protect and improve, and decide with real data whether CloudSales earns its place.',
    trial:'7 DAYS OF CLOUDY FREE',
    plans:'SEE PLANS'
  }
};
function lang(){const l=(document.documentElement.lang||'').toLowerCase();if(l.startsWith('es'))return'es';if(l.startsWith('en'))return'en';return''}
function c(){const l=lang();return l?COPY[l]:null}
function esc(s){return String(s)}
function cards(items,klass='csStoryGrid'){return `<div class="${klass}">${items.map((x,i)=>`<article class="csStoryCard"><div class="csStoryNum">${String(i+1).padStart(2,'0')}</div><h3>${esc(x[0])}</h3><p>${esc(x[1])}</p></article>`).join('')}</div>`}
function css(){if(document.getElementById('cs-sales-story-v1-css'))return;const s=document.createElement('style');s.id='cs-sales-story-v1-css';s.textContent=`
.csStorySection{padding:88px 0;border-top:1px solid #1b1922;position:relative;overflow:hidden}.csStorySection:before{content:"";position:absolute;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,#da33c717,transparent 68%);right:-240px;top:-180px;pointer-events:none}.csStoryKicker{font-size:11px;font-weight:950;letter-spacing:.14em;color:#e3a6e0;text-transform:uppercase}.csStoryTitle{font-size:clamp(38px,5.4vw,68px);line-height:.98;letter-spacing:-.055em;margin:12px 0 16px;max-width:920px}.csStoryLead{max-width:850px;color:#aaa6b1;font-size:18px;line-height:1.62}.csHookPanel{border:1px solid #453244;background:linear-gradient(145deg,#1d101e,#0c0b11);border-radius:30px;padding:34px;box-shadow:0 35px 100px #0006}.csStoryGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:30px}.csStoryCard{border:1px solid #32303a;background:linear-gradient(180deg,#13111a,#0c0b11);border-radius:22px;padding:22px;min-height:230px}.csStoryCard h3{font-size:20px;margin:12px 0 8px}.csStoryCard p{margin:0;color:#aaa6b1;font-size:14px;line-height:1.58}.csStoryNum{font-size:11px;font-weight:950;color:#F955B6;letter-spacing:.1em}.csGrowth{display:grid;gap:10px;margin-top:28px}.csGrowthRow{display:grid;grid-template-columns:52px 170px 1fr;gap:14px;align-items:start;padding:16px;border:1px solid #302e38;background:#0f0e15;border-radius:18px}.csGrowthIndex{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;background:linear-gradient(135deg,#F955B6,#C13BE4);font-weight:950}.csGrowthRow b{padding-top:9px}.csGrowthRow span{color:#aaa6b1;line-height:1.55;padding-top:7px}.csAgentShell{display:grid;grid-template-columns:1.15fr .85fr;gap:26px;align-items:center}.csAgentArt{min-height:390px;position:relative;display:grid;place-items:end center}.csAgentArt img{max-width:100%;max-height:380px;object-fit:contain;filter:drop-shadow(0 28px 40px #0009)}.csTrialBridge{margin:0 0 18px;border:1px solid #5b3454;background:linear-gradient(135deg,#241225,#111019);border-radius:20px;padding:18px 20px;color:#f3deea;font-weight:800;line-height:1.5}.csTrialBridge strong{color:#fff}.csTrialChip{display:inline-flex;border:1px solid #613451;background:#251323;color:#F955B6;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:950;letter-spacing:.08em;margin-bottom:8px}.csCalm{font-size:clamp(26px,4vw,44px);line-height:1.1;letter-spacing:-.04em;font-weight:900;max-width:950px;margin:25px 0 14px}.csBoundary{font-size:12px;color:#7f7b88;line-height:1.55;max-width:900px}.csFinal{padding:100px 0;border-top:1px solid #201c25;background:radial-gradient(700px 320px at 50% 0,#da33c722,transparent 70%)}.csFinalBox{border:1px solid #56374f;background:linear-gradient(145deg,#241126,#0c0b11);border-radius:34px;padding:42px;text-align:center}.csFinalBox .csStoryTitle,.csFinalBox .csStoryLead{margin-left:auto;margin-right:auto}.csFinalActions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:26px}.csFinalTrial{font-size:15px;padding:16px 25px!important;box-shadow:0 18px 50px #F955B63d!important}.csStoryPricingNote{margin:18px 0 4px}.plan .csTrialMini{display:inline-flex;margin:7px 0 3px;border:1px solid #50314b;background:#211323;color:#F955B6;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:900}.plan .btn[data-cs-trial-button="1"]{min-height:46px}.hero .actions .csHeroTrial{background:linear-gradient(135deg,#F955B6,#C13BE4);border:0}.csSavings{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin:28px 0}.csSaving{padding:18px;border:1px solid #32303a;border-radius:18px;background:#100f16}.csSaving b{display:block;margin-bottom:7px}.csSaving span{font-size:12px;color:#9692a0;line-height:1.45}@media(max-width:900px){.csStoryGrid,.csSavings{grid-template-columns:1fr 1fr}.csAgentShell{grid-template-columns:1fr}.csAgentArt{min-height:280px}.csAgentArt img{max-height:300px}.csGrowthRow{grid-template-columns:46px 140px 1fr}}@media(max-width:620px){.csStorySection{padding:64px 0}.csHookPanel,.csFinalBox{padding:24px;border-radius:24px}.csStoryGrid,.csSavings{grid-template-columns:1fr}.csStoryCard{min-height:auto}.csGrowthRow{grid-template-columns:42px 1fr}.csGrowthRow span{grid-column:2}.csFinal{padding:72px 0}.csStoryLead{font-size:16px}}
`;document.head.appendChild(s)}
function section(id,kicker,title,lead,body){return `<section class="csStorySection" id="${id}"><div class="wrap"><div class="csStoryKicker">${kicker}</div><h2 class="csStoryTitle">${title}</h2><p class="csStoryLead">${lead}</p>${body||''}</div></section>`}
function storyMarkup(){const x=c();const hook=`<section class="csStorySection" id="cs-story-hook"><div class="wrap"><div class="csHookPanel"><div class="csStoryKicker">${x.hookKicker}</div><h2 class="csStoryTitle">${x.hookTitle}</h2><p class="csStoryLead">${x.hookLead}</p></div></div></section>`;
const setup=section('cs-story-setup',x.setupKicker,x.setupTitle,x.setupLead,cards(x.setupCards));
const cloudy=section('cs-story-cloudy',x.cloudyKicker,x.cloudyTitle,x.cloudyLead,cards(x.cloudyCards));
const growth=`<section class="csStorySection" id="cs-story-growth"><div class="wrap"><div class="csStoryKicker">${x.growthKicker}</div><h2 class="csStoryTitle">${x.growthTitle}</h2><p class="csStoryLead">${x.growthLead}</p><div class="csGrowth">${x.growthSteps.map(v=>`<div class="csGrowthRow"><div class="csGrowthIndex">${v[0]}</div><b>${v[1]}</b><span>${v[2]}</span></div>`).join('')}</div></div></section>`;
const agents=`<section class="csStorySection" id="cs-story-agents"><div class="wrap"><div class="csAgentShell"><div><div class="csStoryKicker">${x.agentsKicker}</div><h2 class="csStoryTitle">${x.agentsTitle}</h2><p class="csStoryLead">${x.agentsLead}</p>${cards(x.agentCards)}</div><div class="csAgentArt"><img src="/assets/marketing/agentcloud-official.webp" alt="AgentCloud" loading="lazy"></div></div></div></section>`;
const savings=`<div class="csSavings"><div class="csSaving"><b>${lang()==='es'?'Menos agencias':'Less agency dependency'}</b><span>${lang()==='es'?'Automatiza trabajo repetitivo y conserva ayuda humana para lo que sí la necesita.':'Automate repetitive work and keep human help for the work that truly needs it.'}</span></div><div class="csSaving"><b>${lang()==='es'?'Menos herramientas':'Fewer tools'}</b><span>${lang()==='es'?'Centraliza control, conversaciones, pipeline, citas, campañas y señales.':'Centralize control, conversations, pipeline, appointments, campaigns and signals.'}</span></div><div class="csSaving"><b>${lang()==='es'?'Menos presupuesto perdido':'Less wasted ad spend'}</b><span>${lang()==='es'?'Mide calidad y avance real, no solo formularios y clics baratos.':'Measure lead quality and real progression, not just cheap clicks and form fills.'}</span></div><div class="csSaving"><b>${lang()==='es'?'Más tiempo para dirigir':'More time to lead'}</b><span>${lang()==='es'?'Cloudy absorbe coordinación operativa y te devuelve contexto y prioridades.':'Cloudy absorbs operational coordination and returns context and priorities.'}</span></div></div>`;
const app=section('cs-story-app',x.appKicker,x.appTitle,x.appLead,`${savings}<div class="csCalm">${x.calm}</div><p class="csBoundary">${x.boundaries}</p>`);
const final=`<section class="csFinal" id="cs-story-final"><div class="wrap"><div class="csFinalBox"><div class="csStoryKicker">${x.finalKicker}</div><h2 class="csStoryTitle">${x.finalTitle}</h2><p class="csStoryLead">${x.finalLead}</p><div class="csFinalActions"><a class="btn primary csFinalTrial" href="#pricing">${x.trial}</a><a class="btn" href="#pricing">${x.plans}</a></div></div></div></section>`;
return {hook,setup,cloudy,growth,agents,app,final}}
function findHero(){return document.querySelector('section.hero,.hero')}
function findPricing(){const plans=document.querySelector('.plans');return plans?plans.closest('section')||plans.parentElement:null}
function enhancePricing(){const x=c(),pricing=findPricing();if(!pricing)return null;pricing.id='pricing';const plans=pricing.querySelector('.plans');let note=pricing.querySelector('.csStoryPricingNote');if(!note&&plans){note=document.createElement('div');note.className='csStoryPricingNote csTrialBridge';note.innerHTML=`<div class="csTrialChip">${x.trial}</div><div><strong>${x.pricingTitle}</strong><br>${x.pricingLead}</div>`;plans.insertAdjacentElement('beforebegin',note)}pricing.querySelectorAll('.plan').forEach(card=>{if(!card.querySelector('.csTrialMini')){const h=card.querySelector('h3');if(h){const m=document.createElement('div');m.className='csTrialMini';m.textContent=x.trial;h.insertAdjacentElement('afterend',m)}}const b=card.querySelector('.btn');if(b){b.dataset.csTrialButton='1';const label=(card.querySelector('h3')?.textContent||'').trim().toUpperCase();b.textContent=lang()==='es'?`PROBAR ${label} 7 DÍAS`:`TRY ${label} FREE FOR 7 DAYS`}});return pricing}
function enhanceHero(){const x=c(),hero=findHero();if(!hero)return;const eye=hero.querySelector('.eyebrow');if(eye)eye.textContent=x.eyebrow;const h=hero.querySelector('h1');if(h)h.innerHTML=x.hero;const p=hero.querySelector('p');if(p)p.textContent=x.heroLead;const m=hero.querySelector('.micro');if(m)m.textContent=x.micro;const actions=hero.querySelector('.actions');if(actions&&!actions.querySelector('.csHeroTrial')){const a=document.createElement('a');a.className='btn primary csHeroTrial';a.href='#pricing';a.textContent=x.trial;actions.prepend(a)}else if(actions?.querySelector('.csHeroTrial'))actions.querySelector('.csHeroTrial').textContent=x.trial}
function updateMeta(){const x=c();document.title=lang()==='es'?'CloudSales — Cloudy opera marketing, ventas y calidad de leads':'CloudSales — Cloudy operates marketing, sales and lead quality';let m=document.querySelector('meta[name="description"]');if(m)m.content=lang()==='es'?'CloudSales conecta tu CRM, campañas y agentes de IA. Cloudy configura, protege la calidad de leads, coordina seguimiento, mejora marketing y te da control desde tu celular.':'CloudSales connects your CRM, campaigns and AI agents. Cloudy configures, protects lead quality, coordinates follow-up, improves marketing and gives you control from your phone.'}
function render(){const current=c();if(!current){document.querySelectorAll('[id^="cs-story-"],.csFinal,.csStoryPricingNote').forEach(n=>n.remove());return}css();enhanceHero();updateMeta();document.querySelectorAll('[id^="cs-story-"] ,.csFinal').forEach(n=>n.remove());const hero=findHero();if(!hero)return;const p=findPricing();const mk=storyMarkup();hero.insertAdjacentHTML('afterend',mk.hook+mk.setup);const setup=document.getElementById('cs-story-setup');if(p&&setup){enhancePricing();setup.insertAdjacentElement('afterend',p);p.insertAdjacentHTML('afterend',mk.cloudy+mk.growth+mk.agents+mk.app+mk.final)}else{setup.insertAdjacentHTML('afterend',mk.cloudy+mk.growth+mk.agents+mk.app+mk.final);enhancePricing()}}
let last='';function run(){const l=lang();if(last===l&&document.getElementById('cs-story-final'))return;last=l;render()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
new MutationObserver(()=>{const l=lang();if(l!==last){setTimeout(run,30)}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
document.documentElement.dataset.csSalesStory=VERSION;
})();
