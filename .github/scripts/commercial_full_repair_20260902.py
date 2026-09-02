from pathlib import Path
import re

ROOT=Path('.')

def must(s, needle, name):
    if needle not in s:
        raise SystemExit(f'missing marker: {name}')

# --- commercial.html ---
p=ROOT/'web/commercial.html'
s=p.read_text()
s=s.replace('<html lang="es">','<html lang="en">',1)
s=s.replace('content="CloudSales mejora la calidad de tus leads, reduce junk leads y te permite controlar tu CRM, conversaciones, citas y pipeline desde la palma de tu mano."','content="CloudSales improves lead quality, reduces junk leads, and lets you run your CRM, conversations, appointments, marketing, and pipeline from your phone."',1)
repair_css=r'''<style id="cs-commercial-repair-20260902">
.crm{display:flex!important;align-items:center;justify-content:center;gap:10px;min-height:66px}.crm img{width:28px;height:28px;object-fit:contain;border-radius:7px;background:#fff;padding:2px;flex:none}.download a .deviceIcon{width:34px;height:34px;display:grid;place-items:center;flex:none}.download a .deviceIcon svg{width:30px;height:30px;display:block;fill:currentColor}.person{isolation:isolate}.personText{z-index:3}.person img{z-index:1}.cs-plan-price-summary{display:none!important}
@media(max-width:700px){
.navin{height:64px!important;gap:7px!important;min-width:0}.brand{min-width:0;flex:1}.brand img{width:min(42vw,168px)!important;max-width:168px!important;height:auto!important}.navlinks{gap:6px!important;margin-left:0!important;flex:none}.navlinks .btn{padding:9px 11px!important;font-size:12px!important;white-space:nowrap}.navlinks .btn.primary{display:none!important}.csLangBtn{padding:8px 9px!important;min-width:46px!important}.csLangMenu{position:fixed!important;top:68px!important;right:10px!important;left:auto!important;width:min(260px,calc(100vw - 20px))!important;max-height:70vh!important}
.person{min-height:0!important;padding:24px 22px 0!important;display:flex!important;flex-direction:column!important}.personText{max-width:100%!important;width:100%!important}.personText h3{font-size:32px!important;line-height:1.06!important}.person img{position:relative!important;right:auto!important;bottom:auto!important;display:block!important;margin:16px auto -8px!important;width:auto!important;height:auto!important;max-width:92%!important;max-height:285px!important;object-fit:contain!important}.flow{position:relative;z-index:4;margin-top:16px!important}.crmgrid{grid-template-columns:1fr 1fr!important}.crm{min-height:62px!important;padding:12px 8px!important;font-size:12px!important}.download a{min-height:84px!important}.footlinks{gap:12px!important}
}
@media(max-width:390px){.brand img{width:min(39vw,145px)!important}.navlinks .btn{padding:8px 9px!important;font-size:11px!important}.crmgrid{grid-template-columns:1fr!important}}
</style>'''
if 'cs-commercial-repair-20260902' not in s:
    s=s.replace('</head>',repair_css+'</head>',1)
repair_js=r'''<script id="cs-commercial-repair-20260902-js">
(()=>{const CRM={
'HighLevel':'gohighlevel.com','Salesforce':'salesforce.com','HubSpot':'hubspot.com','Zoho CRM':'zoho.com','Dynamics 365':'microsoft.com','Pipedrive':'pipedrive.com','monday CRM':'monday.com','Freshsales':'freshworks.com','Close':'close.com','Copper':'copper.com','Twenty':'twenty.com'};
const logo=(name,domain)=>`<img loading="lazy" alt="${name} logo" src="https://www.google.com/s2/favicons?domain=${domain}&sz=128"><span>${name}</span>`;
function repair(){
 const checkout=document.getElementById('checkout');document.querySelectorAll('.buy[data-item]').forEach(b=>{if(b.dataset.csBuyBound)return;b.dataset.csBuyBound='1';b.addEventListener('click',e=>{e.preventDefault();checkout?.classList.add('open');document.body.style.overflow='hidden';});});
 document.querySelectorAll('.crm').forEach(c=>{const name=(c.textContent||'').trim();if(CRM[name]&&!c.querySelector('img'))c.innerHTML=logo(name,CRM[name]);});
 const grid=document.querySelector('.crmgrid');if(grid&&![...grid.querySelectorAll('.crm')].some(x=>(x.textContent||'').trim()==='Twenty')){const d=document.createElement('div');d.className='crm';d.innerHTML=logo('Twenty','twenty.com');grid.appendChild(d)}
 document.querySelectorAll('.download a').forEach(a=>{if(!/iPhone\s*\/\s*iPad/i.test(a.textContent||''))return;a.innerHTML=`<span class="deviceIcon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.33.07 2.25.73 3.03.78 1.17-.24 2.29-.93 3.54-.84 1.5.12 2.63.71 3.38 1.8-3.09 1.85-2.36 5.92.48 7.06-.57 1.5-1.31 2.99-2.43 4.17ZM12.03 7.25C11.88 5.02 13.69 3.18 15.77 3c.29 2.58-2.34 4.5-3.74 4.25Z"/></svg></span><span>iPhone / iPad</span>`;});
 document.querySelectorAll('body *').forEach(el=>{const t=(el.textContent||'').trim();if(t.startsWith('Planes vigentes:')&&el.children.length<8){const box=el.closest('.card,.mission,.included,div');if(box&&box!==document.body){box.classList.add('cs-plan-price-summary');box.remove();}}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',repair,{once:true});else repair();
})();
</script>'''
if 'cs-commercial-repair-20260902-js' not in s:
    s=s.replace('</body>',repair_js+'</body>',1)
p.write_text(s)

# --- commercial i18n + domain suggestions ---
p=ROOT/'web/cloudsales-i18n-v1.js'
s=p.read_text()
s=s.replace("return LANGS.find(v=>v[0].toLowerCase().split('-')[0]===short)?.[0]||'es'","return LANGS.find(v=>v[0].toLowerCase().split('-')[0]===short)?.[0]||'en'",1)
s=s.replace("return canonicalLocale(navigator.language||'es')","return 'en'",1)
s=s.replace("?.[1]||'ES'","?.[1]||'EN'",1)
# English domain runtime and suggestions
s=s.replace("const $=id=>document.getElementById(id),input=$('domain'),btn=$('search'),result=$('result'),purchase=$('purchase');", "const $=id=>document.getElementById(id),input=$('domain'),btn=$('search'),result=$('result'),purchase=$('purchase');\nconst SUG_TLDS=['.com','.ai','.co','.io','.app','.net'];\nlet suggest=document.getElementById('domainSuggestions');if(!suggest){suggest=document.createElement('div');suggest.id='domainSuggestions';suggest.style.cssText='display:none;gap:8px;flex-wrap:wrap;margin-top:10px';(document.querySelector('.searchrow')||input.parentElement).insertAdjacentElement('afterend',suggest)}\nfunction suggestions(v){const q=norm(v).replace(/\\..*$/,'').replace(/[^a-z0-9-]/g,'');if(!q||String(v).includes('.')){suggest.style.display='none';suggest.innerHTML='';return}suggest.innerHTML=SUG_TLDS.map(t=>`<button type=\"button\" data-domain=\"${q+t}\" style=\"border:1px solid #3b3345;background:#12101a;color:#eee;border-radius:999px;padding:9px 12px;font:800 12px Inter,system-ui;cursor:pointer\">${q+t}</button>`).join('');suggest.style.display='flex';suggest.querySelectorAll('[data-domain]').forEach(x=>x.onclick=()=>{input.value=x.dataset.domain;suggest.style.display='none';go()})}\ninput.addEventListener('input',()=>suggestions(input.value));")
s=s.replace("if(!valid(d)){set(d,'ESCRIBE UN DOMINIO VÁLIDO','unavailable','—','—','Ejemplo: minegocio.com');return;}","if(!valid(d)){if(d&&!d.includes('.')){suggestions(d);set(d,'CHOOSE A DOMAIN EXTENSION','available','—','—','Select one of the suggestions above, or type a complete domain such as mybusiness.com.');return;}set(d,'ENTER A VALID DOMAIN','unavailable','—','—','Example: mybusiness.com');return;}")
repls={
"'BUSCANDO…'":"'SEARCHING…'","'CONSULTANDO…'":"'CHECKING…'","'Buscando disponibilidad del dominio…'":"'Checking domain availability…'","'NO DISPONIBLE'":"'NOT AVAILABLE'","'Este dominio ya está registrado.'":"'This domain is already registered.'","'POSIBLEMENTE DISPONIBLE'":"'POSSIBLY AVAILABLE'","'POR CONFIRMAR'":"'TO BE CONFIRMED'","'Parece disponible. Confirmaremos disponibilidad y precio antes de cualquier cobro.'":"'It appears available. We will confirm availability and price before any charge.'","'✓ DISPONIBLE'":"'✓ AVAILABLE'","'Disponibilidad confirmada por el registrador.'":"'Availability confirmed by the registrar.'","'RESULTADO NO CONCLUYENTE'":"'INCONCLUSIVE RESULT'","'Intenta nuevamente en unos segundos.'":"'Try again in a few seconds.'","'NO PUDIMOS CONSULTAR AHORA'":"'SEARCH TEMPORARILY UNAVAILABLE'","'No pudimos completar la consulta. Intenta nuevamente.'":"'We could not complete the lookup. Please try again.'","'BUSCAR'":"'SEARCH'"}
for a,b in repls.items(): s=s.replace(a,b)
p.write_text(s)

# --- PWA English default ---
p=ROOT/'web/pwa-i18n-runtime-v1.js'
s=p.read_text()
s=s.replace("return LANGS.find(v=>v[0].toLowerCase().split('-')[0]===short)?.[0]||'es'","return LANGS.find(v=>v[0].toLowerCase().split('-')[0]===short)?.[0]||'en'",1)
s=s.replace("return locale(navigator.language||'es')","return 'en'",1)
s=s.replace("?.[1]||'ES'","?.[1]||'EN'",1)
p.write_text(s)

# --- domains base language + English primary copy ---
p=ROOT/'web/domains.html'
s=p.read_text()
s=s.replace('<html lang="es">','<html lang="en">',1)
s=s.replace('<title>Sitio web con IA gratis | Compra tu dominio | CloudSales</title>','<title>Free AI Website | Buy Your Domain | CloudSales</title>',1)
s=s.replace('Busca tu dominio','Search your domain')
s=s.replace('Escribe el dominio completo que quieres, por ejemplo: minegocio.com','Type a name or a complete domain. Example: mybusiness or mybusiness.com')
s=s.replace('>BUSCAR<','>SEARCH<')
s=s.replace('Registro / primer año','Registration / first year').replace('Renovación anual','Annual renewal').replace('Ejemplo: minegocio.com','Example: mybusiness.com')
s=s.replace('Elige y compra tu dominio','Choose and buy your domain').replace('Nosotros te hacemos el sitio WEB','We build your WEBSITE').replace('¡EL MISMO DÍA!','THE SAME DAY!')
p.write_text(s)
# mirrored canonical domain source
(ROOT/'web/commercial/domains-v2.html').write_text(s)

# --- release: language on every route, CRM logos/Twenty, CSP ---
p=ROOT/'supabase/functions/cloudflare-site-brand-release/index.ts'
s=p.read_text()
s=re.sub(r'VERSION="[^"]+"','VERSION="2026.09.02.4"',s,count=1)
s=s.replace("['Copper','copper.com']]","['Copper','copper.com'],['Twenty','twenty.com']]",1)
s=s.replace('CONECTA TU CRM Y MIRA A CLOUDY TRABAJAR','CONNECT YOUR CRM AND WATCH CLOUDY WORK')
s=s.replace("https://www.google.com https://*.stripe.com", "https://www.google.com https://*.gstatic.com https://*.googleusercontent.com https://*.stripe.com")
# inject i18n for every commercial route, not only root
needle="if(isRoot){if(!h.includes('cs-crm-marquee-v1'))"
must(s,needle,'root brand')
# add global injection just before return h
s=s.replace("if(!/id=[\"']download[\"']/i.test(h))h=h.replace(/<h2>\\s*Descarga CloudSales\\.\\s*<\\/h2>/i,'<span id=\"download\"></span><h2>Descarga CloudSales.</h2>');h=h.replace(/href=[\"']#pricing[\"'](?=[^>]*>\\s*Descargar la app\\s*<)/gi,'href=\"#download\"')}return h}","if(!/id=[\"']download[\"']/i.test(h))h=h.replace(/<h2>\\s*Descarga CloudSales\\.\\s*<\\/h2>/i,'<span id=\"download\"></span><h2>Descarga CloudSales.</h2>');h=h.replace(/href=[\"']#pricing[\"'](?=[^>]*>\\s*Descargar la app\\s*<)/gi,'href=\"#download\"')}if(!h.includes('/cloudsales-i18n-v1.js'))h=h.replace('</body>',`<script src=\"/cloudsales-i18n-v1.js?v=${VERSION}\"></script></body>`);return h}")
p.write_text(s)

# --- guards ---
checks={
'commercial english':'<html lang="en">' in (ROOT/'web/commercial.html').read_text(),
'mobile repair':'cs-commercial-repair-20260902' in (ROOT/'web/commercial.html').read_text(),
'twenty':'Twenty' in (ROOT/'supabase/functions/cloudflare-site-brand-release/index.ts').read_text(),
'english default commercial':"return 'en'" in (ROOT/'web/cloudsales-i18n-v1.js').read_text(),
'domain suggestions':'SUG_TLDS' in (ROOT/'web/cloudsales-i18n-v1.js').read_text(),
'english default pwa':"return 'en'" in (ROOT/'web/pwa-i18n-runtime-v1.js').read_text(),
'domains english':'<html lang="en">' in (ROOT/'web/domains.html').read_text(),
'release version':'2026.09.02.4' in (ROOT/'supabase/functions/cloudflare-site-brand-release/index.ts').read_text(),
}
for k,v in checks.items():
    if not v: raise SystemExit('guard failed: '+k)
print('OK',checks)
