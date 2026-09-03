from pathlib import Path
import re, json

ROOT=Path('.')
WEB=ROOT/'web'
REL=ROOT/'supabase/functions/cloudflare-site-brand-release/index.ts'

SOCIAL_IMAGE='https://cloudsales.app/cloudsales-app-icon-official-v2.png'


def read(path): return Path(path).read_text(encoding='utf-8')
def write(path,s): Path(path).write_text(s,encoding='utf-8')

def fix_meta_syntax(s,theme=None,scheme=None):
    # Repair historical malformed nested meta tags first.
    s=re.sub(r'<meta\s+name=["\']theme-color["\']\s+content=["\']([^"\']*)["\']\s*<meta\s+name=["\']color-scheme["\']\s+content=["\']([^"\']*)["\']\s*>\s*>',
             lambda m:f'<meta name="theme-color" content="{theme or m.group(1)}"><meta name="color-scheme" content="{scheme or m.group(2)}">',s,flags=re.I)
    if theme:
        if re.search(r'<meta\s+name=["\']theme-color["\'][^>]*>',s,re.I):
            s=re.sub(r'<meta\s+name=["\']theme-color["\'][^>]*>',f'<meta name="theme-color" content="{theme}">',s,count=1,flags=re.I)
        else:s=s.replace('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">','<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="'+theme+'">',1)
    if scheme:
        if re.search(r'<meta\s+name=["\']color-scheme["\'][^>]*>',s,re.I):
            s=re.sub(r'<meta\s+name=["\']color-scheme["\'][^>]*>',f'<meta name="color-scheme" content="{scheme}">',s,count=1,flags=re.I)
        else:s=s.replace('</title>','</title><meta name="color-scheme" content="'+scheme+'">',1)
    return s

def upsert_meta(s,key,val,prop=False):
    attr='property' if prop else 'name'
    pat=rf'<meta\s+{attr}=["\']{re.escape(key)}["\'][^>]*>'
    tag=f'<meta {attr}="{key}" content="{val}">'
    if re.search(pat,s,re.I): return re.sub(pat,tag,s,count=1,flags=re.I)
    # Insert before first style/script/title close area, but always inside head.
    pos=s.lower().find('</head>')
    return s[:pos]+tag+s[pos:] if pos>=0 else s

def upsert_title(s,title):
    if re.search(r'<title>[\s\S]*?</title>',s,re.I):
        return re.sub(r'<title>[\s\S]*?</title>',f'<title>{title}</title>',s,count=1,flags=re.I)
    return s.replace('</head>',f'<title>{title}</title></head>',1)

def upsert_canonical(s,url):
    tag=f'<link rel="canonical" href="{url}">'
    if re.search(r'<link\s+rel=["\']canonical["\'][^>]*>',s,re.I): return re.sub(r'<link\s+rel=["\']canonical["\'][^>]*>',tag,s,count=1,flags=re.I)
    return s.replace('</head>',tag+'</head>',1)

def social(s,title,desc,url,robots='index,follow,max-image-preview:large'):
    s=upsert_title(s,title);s=upsert_canonical(s,url)
    s=upsert_meta(s,'robots',robots)
    s=upsert_meta(s,'description',desc)
    for k,v in [('og:title',title),('og:description',desc),('og:type','website'),('og:url',url),('og:site_name','CloudSales'),('og:image',SOCIAL_IMAGE)]: s=upsert_meta(s,k,v,True)
    for k,v in [('twitter:card','summary_large_image'),('twitter:title',title),('twitter:description',desc),('twitter:image',SOCIAL_IMAGE)]: s=upsert_meta(s,k,v)
    return s

def insert_head(s,markup,marker):
    if marker in s:return s
    return s.replace('</head>',markup+'\n</head>',1)

def replace_once(s,old,new,name):
    if old not in s:
        if new in s:return s
        raise RuntimeError(f'{name}: expected source fragment not found')
    return s.replace(old,new,1)

# ---------------- Main commercial page ----------------
cp=WEB/'commercial.html'; s=read(cp)
s=fix_meta_syntax(s,'#08070D','light dark')
root_title='CloudSales — AI works for you. You stay in control.'
root_desc='CloudSales is the AI operating layer that works on top of your CRM to improve lead quality, follow-up, appointments and sales from your phone.'
s=social(s,root_title,root_desc,'https://cloudsales.app/')
# Replace historical positioning in visible base copy, not the approved hero.
s=s.replace('Cloudy · AI Operator','Cloudy · Operador de IA').replace('AgentCloud · Specialized AI Agents','AgentCloud · Agentes de IA especializados')
# Remove Google favicon dependency in historical repair runtime.
s=s.replace('https://www.google.com/s2/favicons?domain=${domain}&sz=128','/crm-logo?domain=${encodeURIComponent(domain)}')
# Add Dynamics to the historical repair map only when absent.
s=s.replace("'Zoho CRM':'zoho.com','Pipedrive':'pipedrive.com'", "'Zoho CRM':'zoho.com','Microsoft Dynamics 365':'microsoft.com','Pipedrive':'pipedrive.com'")
# Footer: public usage pricing belongs with legal/billing truth.
if 'href="/usage-pricing"' not in s:
    s=s.replace('<a href="/terms">Términos y Condiciones</a>', '<a href="/usage-pricing">Precios de uso</a><a href="/terms">Términos y Condiciones</a>',1)
# Put the core CloudSales conversion before the optional domain/site upsell.
ai=re.search(r'<section class="section" id="ai-websites">[\s\S]*?</section>',s)
pricing=re.search(r'<section class="section" id="pricing">[\s\S]*?</section>',s)
if ai and pricing and ai.start()<pricing.start():
    ai_block=ai.group(0);s=s[:ai.start()]+s[ai.end():]
    pricing=re.search(r'<section class="section" id="pricing">[\s\S]*?</section>',s)
    s=s[:pricing.end()]+'\n'+ai_block+s[pricing.end():]

# A11y: main landmark, checkout semantics, form labels/status.
s=s.replace('<main id="top">','<main id="top" tabindex="-1">',1)
s=s.replace('<div class="checkout" id="checkout"><div class="checkcard">', '<div class="checkout" id="checkout" role="dialog" aria-modal="true" aria-labelledby="checkoutTitle" aria-hidden="true"><div class="checkcard" role="document">',1)
s=s.replace('<div><b>Activar CloudSales</b><div style="color:#9999aa;font-size:12px;margin-top:4px">Checkout seguro por Stripe</div></div><button class="close" id="cclose">×</button>', '<div><b id="checkoutTitle">Activar CloudSales</b><div style="color:#9999aa;font-size:12px;margin-top:4px">Checkout seguro por Stripe</div></div><button class="close" id="cclose" type="button" aria-label="Cerrar checkout">×</button>',1)
s=s.replace('<input id="cemail" type="email" placeholder="Tu correo">','<label class="sr-only" for="cemail">Tu correo</label><input id="cemail" type="email" inputmode="email" autocomplete="email" placeholder="Tu correo" aria-describedby="cerr">',1)
s=s.replace('<div id="cerr" style="color:#ff91aa;margin-top:12px"></div>','<div id="cerr" role="status" aria-live="polite" style="color:#ff91aa;margin-top:12px"></div>',1)

# Mobile navigation + focus + reduced motion. Canonical source, not a disposable runtime.
nav_css='''<style id="cs-professional-nav-a11y-20260903">
.sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.skip-link{position:fixed;left:12px;top:8px;z-index:500;transform:translateY(-150%);background:#F3F4F8;color:#08070D;padding:10px 14px;border-radius:10px;font-weight:900}.skip-link:focus{transform:none}.csMobileMenuBtn{display:none;margin-left:auto;width:46px;height:46px;border:1px solid #403846;border-radius:999px;background:#121019;color:#F3F4F8;font:900 22px/1 system-ui;cursor:pointer}.csMobileNav{display:none;position:fixed;inset:66px 0 auto 0;z-index:90;padding:12px 14px 20px;background:rgba(8,7,13,.985);border-bottom:1px solid rgba(249,85,182,.18);box-shadow:0 24px 70px #000a}.csMobileNav.open{display:block}.csMobileNavInner{width:min(100%,620px);margin:auto;display:grid;grid-template-columns:1fr 1fr;gap:8px}.csMobileNav a{min-height:46px;display:flex;align-items:center;padding:10px 13px;border:1px solid #332d39;border-radius:14px;background:#121019;color:#F3F4F8;font-weight:780;font-size:14px}.csMobileNav a.primary{background:linear-gradient(115deg,#F955B6,#C13BE4);border-color:transparent;color:white}.checkout[aria-hidden="true"]{display:none!important}.checkout[aria-hidden="false"]{display:block!important}.checkout :focus-visible,.nav :focus-visible,.csMobileNav :focus-visible{outline:3px solid #F955B6;outline-offset:3px}@media(max-width:940px){.csMobileMenuBtn{display:inline-grid;place-items:center}.navlinks>a{display:none!important}.navlinks>.csLangDesktop{display:none!important}.csLangMobile{margin-left:0!important}.navin>.csLangMobile{order:2}.csMobileMenuBtn{order:3}.brand{margin-right:auto}.csMobileNavInner{grid-template-columns:1fr 1fr}}@media(max-width:430px){.csMobileNavInner{grid-template-columns:1fr}.csMobileNav{max-height:calc(100vh - 66px);overflow:auto}.brand img{max-width:155px!important}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}}
</style>'''
s=insert_head(s,nav_css,'cs-professional-nav-a11y-20260903')
# Skip link and menu button/panel.
if 'class="skip-link"' not in s:s=s.replace('<body>','<body><a class="skip-link" href="#top">Saltar al contenido</a>',1)
nav_end='</div></div></nav>'
nav_pos=s.find(nav_end)
if nav_pos>=0 and 'id="csMobileMenuBtn"' not in s[:nav_pos+len(nav_end)]:
    # insert button before navin closes (first </div></div></nav>)
    repl='<button class="csMobileMenuBtn" id="csMobileMenuBtn" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="csMobileNav">☰</button></div></div></nav>'
    s=s[:nav_pos]+repl+s[nav_pos+len(nav_end):]
    mobile='''<div class="csMobileNav" id="csMobileNav" aria-hidden="true"><nav class="csMobileNavInner" aria-label="Navegación móvil"><a href="#what">Qué es</a><a href="#cloudy">Cloudy</a><a href="#quality">Calidad de prospectos</a><a href="#connect">Integraciones</a><a href="#pricing">Planes</a><a href="/domains">Dominios</a><a href="/services">Servicios</a><a href="/academy">Academy</a><a href="/affiliate">Afiliados</a><a href="/usage-pricing">Precios de uso</a><a href="https://app.cloudsales.app/">Entrar</a><a class="primary" href="#pricing">Empezar</a></nav></div>'''
    insert_at=s.find('</nav>',s.find('id="csMobileMenuBtn"'))+6
    s=s[:insert_at]+mobile+s[insert_at:]

nav_js='''<script id="cs-professional-nav-a11y-20260903-js">
(()=>{'use strict';const b=document.getElementById('csMobileMenuBtn'),m=document.getElementById('csMobileNav'),modal=document.getElementById('checkout'),close=document.getElementById('cclose');let last=null;function nav(open){if(!b||!m)return;m.classList.toggle('open',open);m.setAttribute('aria-hidden',String(!open));b.setAttribute('aria-expanded',String(open));b.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');if(open)m.querySelector('a')?.focus()}b?.addEventListener('click',()=>nav(!m.classList.contains('open')));m?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav(false)));function syncModal(open){if(!modal)return;modal.setAttribute('aria-hidden',String(!open));if(open){last=document.activeElement;document.body.style.overflow='hidden';setTimeout(()=>document.getElementById('cemail')?.focus(),0)}else{document.body.style.overflow='';if(last&&last.focus)last.focus()}}document.querySelectorAll('.buy').forEach(x=>x.addEventListener('click',()=>syncModal(true)));close?.addEventListener('click',()=>syncModal(false));modal?.addEventListener('click',e=>{if(e.target===modal)syncModal(false)});document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(modal?.classList.contains('open')){modal.classList.remove('open');syncModal(false)}else nav(false)}});window.addEventListener('cloudsales:locale',()=>{document.querySelectorAll('[data-cs-untranslated]').forEach(x=>{if(x.closest('#csMobileNav'))x.removeAttribute('data-cs-untranslated')})});})();
</script>'''
s=insert_head(s,nav_js,'cs-professional-nav-a11y-20260903-js')
# Existing inline checkout opens visually; synchronize aria from its click/close handlers through mutation observer as a final guard.
aria_js='''<script id="cs-checkout-aria-sync-20260903">(()=>{const m=document.getElementById('checkout');if(!m)return;const o=new MutationObserver(()=>m.setAttribute('aria-hidden',String(!m.classList.contains('open'))));o.observe(m,{attributes:true,attributeFilter:['class']});m.setAttribute('aria-hidden',String(!m.classList.contains('open')));})();</script>'''
s=s.replace('</body>',aria_js+'</body>',1) if 'cs-checkout-aria-sync-20260903' not in s else s
# Root structured data, facts only.
jsonld='''<script type="application/ld+json" id="cs-jsonld-software-20260903">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"CloudSales","url":"https://cloudsales.app/","applicationCategory":"BusinessApplication","operatingSystem":"Web, iOS, Android, Windows, macOS","description":"AI operating layer for CRM, lead quality, follow-up, appointments and sales operations.","offers":[{"@type":"Offer","name":"Basic","price":"47","priceCurrency":"USD","url":"https://cloudsales.app/#pricing"},{"@type":"Offer","name":"Pro","price":"97","priceCurrency":"USD","url":"https://cloudsales.app/#pricing"},{"@type":"Offer","name":"Premium","price":"147","priceCurrency":"USD","url":"https://cloudsales.app/#pricing"}]}</script>'''
s=insert_head(s,jsonld,'cs-jsonld-software-20260903')
write(cp,s)

# ---------------- i18n hardening ----------------
ip=WEB/'cloudsales-i18n-v1.js'; i=read(ip)
old_detect="function detect(){const path=(location.pathname||'/').replace(/\\/+$/,'')||'/';const primary=path==='/'||path==='/crm';if(!primary)return canonicalLocale(document.documentElement.lang||'es');const q=new URLSearchParams(location.search).get('lang');if(q)return canonicalLocale(q);try{const s=localStorage.getItem(STORE);if(s)return canonicalLocale(s)}catch{}return canonicalLocale(document.documentElement.lang||'en')}"
new_detect="function detect(){const path=(location.pathname||'/').replace(/\\/+$/,'')||'/';const localized=new Set(['/','/crm','/domains','/services','/academy','/affiliate']);if(!localized.has(path))return canonicalLocale(document.documentElement.lang||'en');const q=new URLSearchParams(location.search).get('lang');if(q)return canonicalLocale(q);try{const s=localStorage.getItem(STORE);if(s)return canonicalLocale(s)}catch{}return 'en'}"
i=replace_once(i,old_detect,new_detect,'i18n detect')
# Metadata must not overwrite route-specific SEO.
old_meta="function meta(locale){const desc={es:'CloudSales mejora la calidad de tus leads, reduce junk leads y te permite controlar tu CRM, conversaciones, citas y pipeline desde la palma de tu mano.',en:'CloudSales improves lead quality, reduces junk leads, and lets you manage your CRM, conversations, appointments, and pipeline from your phone.',fr:'CloudSales améliore la qualité des prospects, réduit les faux leads et vous permet de gérer CRM, conversations, rendez-vous et pipeline depuis votre téléphone.',it:'CloudSales migliora la qualità dei lead, riduce i lead spazzatura e ti permette di gestire CRM, conversazioni, appuntamenti e pipeline dal telefono.','pt-BR':'CloudSales melhora a qualidade dos leads, reduz leads ruins e permite controlar CRM, conversas, reuniões e pipeline pelo celular.',de:'CloudSales verbessert die Lead-Qualität, reduziert Junk-Leads und ermöglicht CRM, Gespräche, Termine und Pipeline vom Smartphone aus.','ar-AE':'يحسن CloudSales جودة العملاء المحتملين ويقلل العملاء غير الصالحين ويتيح إدارة CRM والمحادثات والمواعيد وخط المبيعات من الهاتف.',ru:'CloudSales повышает качество лидов, сокращает мусорные лиды и позволяет управлять CRM, диалогами, встречами и воронкой с телефона.',he:'CloudSales משפר את איכות הלידים, מפחית לידים לא רלוונטיים ומאפשר לנהל CRM, שיחות, פגישות ופייפליין מהטלפון.','zh-CN':'CloudSales 提升销售线索质量、减少垃圾线索，并可通过手机管理 CRM、对话、预约和销售管道。',ja:'CloudSalesはリード品質を高め、無効なリードを減らし、CRM・会話・商談・パイプラインをスマートフォンから管理できます。'};document.querySelector('meta[name=\"description\"]')?.setAttribute('content',desc[locale]||desc.es);document.title=locale==='es'?'CloudSales — IA trabajando por ti, mejores prospectos y control desde tu celular':'CloudSales — AI working for you, better leads and mobile control'}"
new_meta="function meta(locale){const path=(location.pathname||'/').replace(/\\/+$/,'')||'/';if(path!=='/'&&path!=='/crm')return;const desc={es:'CloudSales es la capa de IA que trabaja sobre tu CRM para mejorar la calidad de prospectos, seguimiento, citas y ventas desde tu celular.',en:'CloudSales is the AI operating layer that works on top of your CRM to improve lead quality, follow-up, appointments and sales from your phone.',fr:'CloudSales est la couche d’IA qui travaille au-dessus de votre CRM pour améliorer la qualité des prospects, le suivi, les rendez-vous et les ventes depuis votre téléphone.',it:'CloudSales è il livello di IA che opera sopra il tuo CRM per migliorare qualità dei lead, follow-up, appuntamenti e vendite dal telefono.','pt-BR':'CloudSales é a camada de IA que trabalha sobre seu CRM para melhorar a qualidade dos leads, follow-up, reuniões e vendas pelo celular.',de:'CloudSales ist die KI-Betriebsschicht über Ihrem CRM für bessere Lead-Qualität, Follow-up, Termine und Vertrieb per Smartphone.','ar-AE':'CloudSales هي طبقة تشغيل بالذكاء الاصطناعي تعمل فوق CRM لتحسين جودة العملاء المحتملين والمتابعة والمواعيد والمبيعات من الهاتف.',ru:'CloudSales — это операционный слой ИИ поверх CRM для повышения качества лидов, последующих действий, встреч и продаж с телефона.',he:'CloudSales היא שכבת תפעול AI מעל ה-CRM לשיפור איכות הלידים, המעקב, הפגישות והמכירות מהטלפון.','zh-CN':'CloudSales 是运行在 CRM 之上的 AI 运营层，用于提升线索质量、跟进、预约和移动销售管理。',ja:'CloudSalesはCRM上で動作するAI運用レイヤーで、リード品質、フォローアップ、商談、営業をスマートフォンから改善します。'};document.querySelector('meta[name=\"description\"]')?.setAttribute('content',desc[locale]||desc.en);document.title=locale==='es'?'CloudSales — La IA trabaja por ti. Tú mantienes el control.':'CloudSales — AI works for you. You stay in control.'}"
i=replace_once(i,old_meta,new_meta,'i18n meta')
# Do not mount a language control on legal/usage pages that are not fully localized yet.
old_mount="function mount(locale){document.querySelectorAll('.csLang').forEach(x=>x.remove());const links=document.querySelector('.navlinks');if(links){const d=document.createElement('div');d.className='csLangDesktop';d.innerHTML=menu(locale);links.insertBefore(d,links.firstChild)}const navin=document.querySelector('.navin');if(navin){const m=document.createElement('div');m.className='csLangMobile';m.innerHTML=menu(locale);navin.appendChild(m)}document.querySelectorAll('.csLangBtn').forEach(b=>b.onclick=e=>{e.stopPropagation();b.closest('.csLang')?.classList.toggle('open')});document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>setLocale(b.dataset.lang));if(!document.documentElement.dataset.csLangCloseBound){document.documentElement.dataset.csLangCloseBound='1';document.addEventListener('click',e=>{if(!e.target.closest('.csLang'))document.querySelectorAll('.csLang.open').forEach(x=>x.classList.remove('open'))},true)}}"
new_mount="function mount(locale){document.querySelectorAll('.csLang').forEach(x=>x.remove());const path=(location.pathname||'/').replace(/\\/+$/,'')||'/',localized=new Set(['/','/crm','/domains','/services','/academy','/affiliate']);if(!localized.has(path))return;const links=document.querySelector('.navlinks');if(links){const d=document.createElement('div');d.className='csLangDesktop';d.innerHTML=menu(locale);links.insertBefore(d,links.firstChild)}const navin=document.querySelector('.navin');if(navin){const m=document.createElement('div');m.className='csLangMobile';m.innerHTML=menu(locale);navin.appendChild(m)}document.querySelectorAll('.csLangBtn').forEach(b=>b.onclick=e=>{e.stopPropagation();b.closest('.csLang')?.classList.toggle('open')});document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>setLocale(b.dataset.lang));if(!document.documentElement.dataset.csLangCloseBound){document.documentElement.dataset.csLangCloseBound='1';document.addEventListener('click',e=>{if(!e.target.closest('.csLang'))document.querySelectorAll('.csLang.open').forEach(x=>x.classList.remove('open'))},true)}}"
i=replace_once(i,old_mount,new_mount,'i18n mount')
# Extend strict translations for new canonical labels. Parse the JSON object safely.
m=re.search(r'const CS_FINAL_TRANSLATIONS=(\{[\s\S]*?\});',i)
if not m: raise RuntimeError('CS_FINAL_TRANSLATIONS object not found')
d=json.loads(m.group(1))
adds={
'en':{'Cloudy · Operador de IA':'Cloudy · AI Operator','AgentCloud · Agentes de IA especializados':'AgentCloud · Specialized AI Agents','Precios de uso':'Usage pricing','Saltar al contenido':'Skip to content','Integraciones':'Integrations','Elige y compra tu dominio':'Choose and buy your domain','Construimos tu SITIO WEB EL MISMO DÍA.':'We build your WEBSITE THE SAME DAY!','Busca tu dominio':'Search your domain','Escribe un nombre o un dominio completo. Ejemplo: minegocio o minegocio.com':'Type a name or a complete domain. Example: mybusiness or mybusiness.com','BUSCAR':'SEARCH','Registro / primer año':'Registration / first year','Renovación anual':'Annual renewal'},
'fr':{'Cloudy · Operador de IA':'Cloudy · Opérateur IA','AgentCloud · Agentes de IA especializados':'AgentCloud · Agents IA spécialisés','Precios de uso':'Tarification à l’usage','Saltar al contenido':'Aller au contenu','Integraciones':'Intégrations'},
'it':{'Cloudy · Operador de IA':'Cloudy · Operatore IA','AgentCloud · Agentes de IA especializados':'AgentCloud · Agenti IA specializzati','Precios de uso':'Prezzi a consumo','Saltar al contenido':'Vai al contenuto','Integraciones':'Integrazioni'},
'pt-BR':{'Cloudy · Operador de IA':'Cloudy · Operador de IA','AgentCloud · Agentes de IA especializados':'AgentCloud · Agentes de IA especializados','Precios de uso':'Preços de uso','Saltar al contenido':'Ir para o conteúdo','Integraciones':'Integrações'},
'de':{'Cloudy · Operador de IA':'Cloudy · KI-Operator','AgentCloud · Agentes de IA especializados':'AgentCloud · Spezialisierte KI-Agenten','Precios de uso':'Nutzungspreise','Saltar al contenido':'Zum Inhalt springen','Integraciones':'Integrationen'},
'ar-AE':{'Cloudy · Operador de IA':'Cloudy · مشغّل الذكاء الاصطناعي','AgentCloud · Agentes de IA especializados':'AgentCloud · وكلاء ذكاء اصطناعي متخصصون','Precios de uso':'تسعير الاستخدام','Saltar al contenido':'انتقل إلى المحتوى','Integraciones':'التكاملات'},
'ru':{'Cloudy · Operador de IA':'Cloudy · ИИ-оператор','AgentCloud · Agentes de IA especializados':'AgentCloud · Специализированные ИИ-агенты','Precios de uso':'Тарифы за использование','Saltar al contenido':'Перейти к содержанию','Integraciones':'Интеграции'},
'he':{'Cloudy · Operador de IA':'Cloudy · מפעיל AI','AgentCloud · Agentes de IA especializados':'AgentCloud · סוכני AI מתמחים','Precios de uso':'תמחור לפי שימוש','Saltar al contenido':'דלג לתוכן','Integraciones':'אינטגרציות'},
'zh-CN':{'Cloudy · Operador de IA':'Cloudy · AI 运营助手','AgentCloud · Agentes de IA especializados':'AgentCloud · 专业 AI 智能体','Precios de uso':'用量价格','Saltar al contenido':'跳到内容','Integraciones':'集成'},
'ja':{'Cloudy · Operador de IA':'Cloudy · AIオペレーター','AgentCloud · Agentes de IA especializados':'AgentCloud · 専門AIエージェント','Precios de uso':'従量料金','Saltar al contenido':'コンテンツへスキップ','Integraciones':'連携'}
}
for loc,vals in adds.items(): d.setdefault(loc,{}).update(vals)
newobj=json.dumps(d,ensure_ascii=False,separators=(',',':'))
i=i[:m.start(1)]+newobj+i[m.end(1):]
# Domains dynamic status should respect active locale, never hardcode English into Spanish/RTL pages.
if 'CS_DOMAIN_STATUS_I18N_20260903' not in i:
    marker="const $=id=>document.getElementById(id),input=$('domain'),btn=$('search'),result=$('result'),purchase=$('purchase');"
    status="""const $=id=>document.getElementById(id),input=$('domain'),btn=$('search'),result=$('result'),purchase=$('purchase');\n/* CS_DOMAIN_STATUS_I18N_20260903 */\nconst DS={es:{choose:'ELIGE UNA EXTENSIÓN',valid:'ESCRIBE UN DOMINIO VÁLIDO',searching:'BUSCANDO…',checking:'VERIFICANDO…',not:'NO DISPONIBLE',possible:'POSIBLEMENTE DISPONIBLE',confirm:'POR CONFIRMAR',available:'✓ DISPONIBLE',inconclusive:'RESULTADO NO CONCLUYENTE',temporary:'BÚSQUEDA TEMPORALMENTE NO DISPONIBLE',select:'Selecciona una sugerencia o escribe un dominio completo como minegocio.com.',example:'Ejemplo: minegocio.com',checkingMsg:'Verificando disponibilidad del dominio…',registered:'Este dominio ya está registrado.',appears:'Parece disponible. Confirmaremos disponibilidad y precio antes de cualquier cobro.',registrar:'Disponibilidad confirmada por el registrador.',retry:'Intenta de nuevo en unos segundos.',failed:'No pudimos completar la búsqueda. Intenta nuevamente.',button:'BUSCAR',year:'/año'},en:{choose:'CHOOSE A DOMAIN EXTENSION',valid:'ENTER A VALID DOMAIN',searching:'SEARCHING…',checking:'CHECKING…',not:'NOT AVAILABLE',possible:'POSSIBLY AVAILABLE',confirm:'TO BE CONFIRMED',available:'✓ AVAILABLE',inconclusive:'INCONCLUSIVE RESULT',temporary:'SEARCH TEMPORARILY UNAVAILABLE',select:'Select a suggestion or type a complete domain such as mybusiness.com.',example:'Example: mybusiness.com',checkingMsg:'Checking domain availability…',registered:'This domain is already registered.',appears:'It appears available. We will confirm availability and price before any charge.',registrar:'Availability confirmed by the registrar.',retry:'Try again in a few seconds.',failed:'We could not complete the lookup. Please try again.',button:'SEARCH',year:'/year'}};\nconst dl=()=>((document.documentElement.dataset.csLocale||document.documentElement.lang||'en').toLowerCase().startsWith('es')?'es':'en'),dt=()=>DS[dl()];"""
    i=replace_once(i,marker,status,'domain status insert')
    # Replace status literals in the search go() body with dictionary lookups.
    reps={"'CHOOSE A DOMAIN EXTENSION'":"dt().choose","'Select one of the suggestions above, or type a complete domain such as mybusiness.com.'":"dt().select","'ENTER A VALID DOMAIN'":"dt().valid","'Example: mybusiness.com'":"dt().example","'SEARCHING…'":"dt().searching","'CHECKING…'":"dt().checking","'Checking domain availability…'":"dt().checkingMsg","'NOT AVAILABLE'":"dt().not","'This domain is already registered.'":"dt().registered","'POSSIBLY AVAILABLE'":"dt().possible","'TO BE CONFIRMED'":"dt().confirm","'It appears available. We will confirm availability and price before any charge.'":"dt().appears","'✓ AVAILABLE'":"dt().available","'Availability confirmed by the registrar.'":"dt().registrar","'INCONCLUSIVE RESULT'":"dt().inconclusive","'Try again in a few seconds.'":"dt().retry","'SEARCH TEMPORARILY UNAVAILABLE'":"dt().temporary","'We could not complete the lookup. Please try again.'":"dt().failed","btn.textContent='SEARCH'":"btn.textContent=dt().button","+'/año'":"+dt().year"}
    for a,b in reps.items(): i=i.replace(a,b)
write(ip,i)

# ---------------- Domains source: make the canonical base internally Spanish ----------------
dp=WEB/'commercial/domains-v2.html'; dsrc=read(dp);dsrc=fix_meta_syntax(dsrc,'#08070D','light dark')
dsrc=dsrc.replace('<html lang="en"','<html lang="es"',1)
dsrc=social(dsrc,'CloudSales Domains — Dominio + sitio web con IA','Busca y compra tu dominio con CloudSales. Tu sitio web con IA está incluido con una compra elegible de dominio y puedes revisarlo antes de publicar.','https://cloudsales.app/domains')
for a,b in {
'Choose and buy your domain':'Elige y compra tu dominio','We build your WEBSITE <strong>THE SAME DAY!</strong>':'Construimos tu SITIO WEB <strong>EL MISMO DÍA.</strong>','Search your domain':'Busca tu dominio','Type a name or a complete domain. Example: mybusiness or mybusiness.com':'Escribe un nombre o un dominio completo. Ejemplo: minegocio o minegocio.com','>SEARCH<':'>BUSCAR<','Registration / first year':'Registro / primer año','Annual renewal':'Renovación anual'}.items():dsrc=dsrc.replace(a,b)
# Avoid absolute marketing promise in SEO/body while preserving the same-day selling point.
dsrc=dsrc.replace('puede quedar listo el mismo día','puede quedar listo el mismo día cuando el alcance y los materiales lo permiten')
write(dp,dsrc)

# ---------------- Terms / Usage pricing canonical billing truth ----------------
tp=WEB/'terms.html'; t=read(tp);t=fix_meta_syntax(t,'#08070D','dark')
t=social(t,'CloudSales Terms & Conditions','Terms governing CloudSales subscriptions, AI-assisted operations, connected services, metered usage, domains, billing and acceptable use.','https://cloudsales.app/terms')
t=t.replace('Domains: standard target of actual landed/wholesale cost × 3.00 (200% markup)','Domains: standard target of actual landed/wholesale cost × 2.00 (100% markup)')
t=t.replace('CloudSales generally targets a standard domain registration or renewal price equal to three times the applicable landed/wholesale domain cost.','CloudSales generally targets a standard domain registration or renewal price equal to two times the applicable landed/wholesale domain cost.')
write(tp,t)

up=WEB/'usage-pricing.html'; u=read(up);u=fix_meta_syntax(u,'#08070D','dark')
u=social(u,'CloudSales Usage Pricing — Transparent metered billing','CloudSales usage pricing is based on actual landed provider cost with plan-specific markups: Basic 50%, Pro 35%, Premium 25%, and domains 100%.','https://cloudsales.app/usage-pricing')
u=u.replace('Domains: standard target ×3.00 landed cost','Domains: standard target ×2.00 landed cost')
u=u.replace('three times the applicable landed/wholesale cost','two times the applicable landed/wholesale cost')
u=u.replace('Each CloudSales Member has an individual subscription entitlement, which may be paid directly by the member or sponsored by an organization.','Basic and Pro include one user. Premium includes two users. Additional users, when available, are disclosed through the applicable account, checkout or order flow before billing.')
u=u.replace('href="/pricing"','href="/#pricing"')
write(up,u)

# ---------------- CloudCo source ----------------
ccp=WEB/'cloudco.html'; c=read(ccp);c=fix_meta_syntax(c,'#ffffff','light')
c=social(c,'CloudCo — TheCloudCompany','CloudCo is a Mexican technology company building AI-powered business platforms including CloudSales.','https://cloudsales.app/cloudco')
c=re.sub(r'https://drive\.google\.com/uc\?export=view&id=[A-Za-z0-9_-]+','/cloudco-assets/cloudco-logo-official.webp',c)
write(ccp,c)

# ---------------- Secondary route metadata ----------------
meta_cfg={
 'services.html':('CloudSales Services — Professional execution, optional by design','Optional CloudSales professional services for teams that want help with websites, community management, campaigns or setup.','https://cloudsales.app/services'),
 'academy.html':('CloudSales Academy — Marketing, AI, CRM & Automation','Practical CloudSales Academy training for entrepreneurs, managers and teams in marketing, AI, CRM, automation, campaigns, social media and web.','https://cloudsales.app/academy'),
 'affiliate.html':('CloudSales Affiliate Program — 40% commission','CloudSales affiliate program with 40% commission on eligible attributed sales, subject to program terms and review.','https://cloudsales.app/affiliate'),
 'privacy.html':('CloudSales Privacy Policy','CloudSales privacy policy describing account, customer, AI, connected-platform, billing and service data handling.','https://cloudsales.app/privacy')
}
for fn,(title,desc,url) in meta_cfg.items():
    p=WEB/fn;x=read(p);x=fix_meta_syntax(x,None,'dark');x=social(x,title,desc,url);write(p,x)

# ---------------- Release helper / Worker ----------------
r=read(REL)
r=r.replace('VERSION="2026.09.03.7"','VERSION="2026.09.03.8"')
r=r.replace("ROUTES=['/','/crm','/cloudco','/academy','/services','/affiliate','/terms','/privacy','/domains']", "ROUTES=['/','/crm','/cloudco','/academy','/services','/affiliate','/terms','/privacy','/domains','/usage-pricing']")
r=r.replace("'/domains':'commercial/domains-v2.html'}", "'/domains':'commercial/domains-v2.html','/usage-pricing':'usage-pricing.html'}")
# Marquee: same-origin CRM icons and restore Dynamics 365.
r=r.replace("['Zoho CRM','zoho.com'],['Salesforce','salesforce.com']", "['Zoho CRM','zoho.com'],['Microsoft Dynamics 365','microsoft.com'],['Salesforce','salesforce.com']")
r=r.replace('src="https://www.google.com/s2/favicons?domain=${x[1]}&sz=64"','src="/crm-logo?domain=${encodeURIComponent(x[1])}"')
# Sitemap: no duplicate /crm canonical; add public usage pricing.
r=re.sub(r"sitemap='<\?xml version=\"1\.0\" encoding=\"UTF-8\"\?><urlset xmlns=\"http://www\.sitemaps\.org/schemas/sitemap/0\.9\">[\s\S]*?</urlset>'", "sitemap='<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"><url><loc>https://cloudsales.app/</loc></url><url><loc>https://cloudsales.app/domains</loc></url><url><loc>https://cloudsales.app/academy</loc></url><url><loc>https://cloudsales.app/services</loc></url><url><loc>https://cloudsales.app/affiliate</loc></url><url><loc>https://cloudsales.app/usage-pricing</loc></url><url><loc>https://cloudsales.app/terms</loc></url><url><loc>https://cloudsales.app/privacy</loc></url><url><loc>https://cloudsales.app/cloudco</loc></url></urlset>'",r,count=1)
# Response helper accepts explicit HTTP status for real 404s.
old="function r(b,t='text/html; charset=utf-8',c='no-store',x={},p=null){return new Response(b,{headers:{...H,'content-type':t,'cache-control':c,...x,...(p?{'content-security-policy':p}:{})}})}"
new="function r(b,t='text/html; charset=utf-8',c='no-store',x={},p=null,s=200){return new Response(b,{status:s,headers:{...H,'content-type':t,'cache-control':c,...x,...(p?{'content-security-policy':p}:{})}})}"
r=replace_once(r,old,new,'release response helper')
# Insert restricted same-origin CRM logo proxy before generic APIs.
needle="if(p==='/sitemap.xml')return r(SITEMAP,'application/xml; charset=utf-8','public,max-age=3600');"
crmproxy="""if(p==='/sitemap.xml')return r(SITEMAP,'application/xml; charset=utf-8','public,max-age=3600');if(p==='/crm-logo'){const d=String(u.searchParams.get('domain')||'').toLowerCase(),ok=new Set(['gohighlevel.com','hubspot.com','pipedrive.com','zoho.com','salesforce.com','microsoft.com','monday.com','freshworks.com','close.com','copper.com','twenty.com']);if(!ok.has(d))return r('not found','text/plain','no-store',{'x-robots-tag':'noindex'},null,404);const q=await fetch('https://www.google.com/s2/favicons?domain='+encodeURIComponent(d)+'&sz=128',{headers:{accept:'image/*'}});if(!q.ok)return r('not found','text/plain','no-store',{'x-robots-tag':'noindex'},null,404);return new Response(q.body,{status:200,headers:{...H,'content-type':q.headers.get('content-type')||'image/png','cache-control':'public,max-age=86400,stale-while-revalidate=604800'}})}"""
r=replace_once(r,needle,crmproxy,'crm proxy insertion')
# Redirect historical duplicate paths and provide real 404 instead of homepage soft fallback.
old_tail="const pageKey=['/domain','/dominio','/dominios'].includes(p)?'/domains':p;return r(P[pageKey]||P['/'],'text/html; charset=utf-8','no-store',{},CSP[pageKey]||CSP['/'])"
new_tail="if(['/domain','/dominio','/dominios'].includes(p))return Response.redirect(u.origin+'/domains'+u.search,301);if(p==='/pricing')return Response.redirect(u.origin+'/#pricing',301);const pageKey=p;if(!(pageKey in P)){const notFound='<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow\"><title>404 — CloudSales</title></head><body><main><h1>404</h1><p>Page not found.</p><p><a href=\"/\">CloudSales</a></p></main></body></html>';return r(notFound,'text/html; charset=utf-8','no-store',{'x-robots-tag':'noindex,nofollow'},null,404)}const extra=pageKey==='/crm'?{'x-robots-tag':'noindex,follow'}:{};return r(P[pageKey],'text/html; charset=utf-8','no-store',extra,CSP[pageKey])"
r=replace_once(r,old_tail,new_tail,'real 404 tail')
# Smoke tests: sitemap expected usage-pricing, not /crm.
r=r.replace("sitemapLive.text.includes('<loc>https://cloudsales.app/crm</loc>')", "sitemapLive.text.includes('<loc>https://cloudsales.app/usage-pricing</loc>')&&!sitemapLive.text.includes('<loc>https://cloudsales.app/crm</loc>')")
# Extend live QA fetches with usage/404/terms checks.
old_probe="const lp=await Promise.all(ROUTES.map(x=>tc(`https://cloudsales.app${x}`))),root=lp[0],sitemapLive=await tc('https://cloudsales.app/sitemap.xml'),robotsLive=await tc('https://cloudsales.app/robots.txt'),www=await tc('https://www.cloudsales.app/'),highlevel=await tc('https://cloudsales.app/webhooks/highlevel','POST','{}')"
new_probe="const lp=await Promise.all(ROUTES.map(x=>tc(`https://cloudsales.app${x}`))),root=lp[0],usage=lp[ROUTES.indexOf('/usage-pricing')],terms=lp[ROUTES.indexOf('/terms')],missing=await tc('https://cloudsales.app/__definitely_not_a_real_page_20260903'),sitemapLive=await tc('https://cloudsales.app/sitemap.xml'),robotsLive=await tc('https://cloudsales.app/robots.txt'),www=await tc('https://www.cloudsales.app/'),highlevel=await tc('https://cloudsales.app/webhooks/highlevel','POST','{}')"
r=replace_once(r,old_probe,new_probe,'release live probes')
# Add tests into object before root_premium_truth.
r=r.replace("root_canonical_message:root.text.includes('La IA trabaja por ti.')&&root.text.includes('Tú mantienes el control.'),root_premium_truth", "root_canonical_message:root.text.includes('La IA trabaja por ti.')&&root.text.includes('Tú mantienes el control.'),usage_pricing_live:usage.status===200&&usage.text.includes('×2.00 landed cost')&&usage.text.includes('50%')&&usage.text.includes('35%')&&usage.text.includes('25%'),terms_domain_markup_truth:terms.status===200&&terms.text.includes('× 2.00 (100% markup)')&&!terms.text.includes('× 3.00'),real_404:missing.status===404,root_premium_truth")
write(REL,r)

# ---------------- Source validation ----------------
checks={
 'commercial canonical UI':('web/commercial.html',['#2D0A4A','#F955B6','#F3F4F8','cs-professional-nav-a11y-20260903','role="dialog"','href="/usage-pricing"','Cloudy · Operador de IA','AgentCloud · Agentes de IA especializados']),
 'usage pricing':('web/usage-pricing.html',['×2.00 landed cost','Premium includes two users','https://cloudsales.app/usage-pricing']),
 'terms':('web/terms.html',['× 2.00 (100% markup)','equal to two times','https://cloudsales.app/usage-pricing']),
 'cloudco':('web/cloudco.html',['/cloudco-assets/cloudco-logo-official.webp','content="#ffffff"','content="light"']),
 'release':(str(REL),["VERSION=\"2026.09.03.8\"","'/usage-pricing':'usage-pricing.html'","p==='/crm-logo'","missing.status===404","usage_pricing_live"])
}
for name,(path,need) in checks.items():
    z=read(path)
    for x in need:
        if x not in z: raise RuntimeError(f'{name}: missing {x}')
for bad in ['× 3.00 (200% markup)','standard target ×3.00 landed cost','three times the applicable landed/wholesale domain cost']:
    if bad in read(tp) or bad in read(up): raise RuntimeError('obsolete domain markup remains: '+bad)
if 'https://drive.google.com/uc?' in read(ccp):raise RuntimeError('CloudCo still uses Drive logo')
if 'https://www.google.com/s2/favicons?domain=${domain}' in read(cp):raise RuntimeError('root still injects Google favicon directly')
print('CLOUDSALES_PROFESSIONAL_RELEASE_SOURCE_OK')
