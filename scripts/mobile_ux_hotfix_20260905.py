from pathlib import Path
import re

# Public commercial site: make hamburger controller DOM-ready and accessible.
p=Path("web/commercial.html")
s=p.read_text()
script_pat=re.compile(r'<script id="cs-professional-nav-a11y-20260903-js">.*?</script>', re.S)
matches=script_pat.findall(s)
if len(matches)!=1:
    raise SystemExit(f"commercial mobile-nav script anchor count={len(matches)}")
nav_script = r'''<script id="cs-professional-nav-a11y-20260903-js">
(()=>{'use strict';
function init(){
  const b=document.getElementById('csMobileMenuBtn');
  const m=document.getElementById('csMobileNav');
  const modal=document.getElementById('checkout');
  const close=document.getElementById('cclose');
  if(!b||!m)return;
  let last=null;
  function nav(open){
    m.classList.toggle('open',open);
    m.setAttribute('aria-hidden',String(!open));
    b.setAttribute('aria-expanded',String(open));
    b.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');
    document.documentElement.classList.toggle('cs-mobile-menu-open',open);
    if(open)requestAnimationFrame(()=>m.querySelector('a')?.focus());
  }
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();nav(!m.classList.contains('open'))});
  m.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav(false)));
  document.addEventListener('pointerdown',e=>{if(m.classList.contains('open')&&!m.contains(e.target)&&!b.contains(e.target))nav(false)});
  function syncModal(open){
    if(!modal)return;
    modal.setAttribute('aria-hidden',String(!open));
    if(open){last=document.activeElement;document.documentElement.classList.add('cs-checkout-open');setTimeout(()=>document.getElementById('cemail')?.focus(),0)}
    else{document.documentElement.classList.remove('cs-checkout-open');if(last&&last.focus)last.focus()}
  }
  document.querySelectorAll('.buy').forEach(x=>x.addEventListener('click',()=>syncModal(true)));
  close?.addEventListener('click',()=>syncModal(false));
  modal?.addEventListener('click',e=>{if(e.target===modal)syncModal(false)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(modal?.classList.contains('open')){modal.classList.remove('open');syncModal(false)}else nav(false)}});
  window.addEventListener('resize',()=>{if(innerWidth>940)nav(false)},{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
</script>'''
s=script_pat.sub(nav_script,s,count=1)

if 'id="cs-mobile-nav-runtime-fix-20260905"' not in s:
    mobile_css = r'''<style id="cs-mobile-nav-runtime-fix-20260905">
html.cs-mobile-menu-open,html.cs-mobile-menu-open body,html.cs-checkout-open,html.cs-checkout-open body{overflow:hidden!important}
@media(max-width:940px){
  .csMobileNav{inset:64px 0 0 0!important;max-height:none!important;height:calc(100dvh - 64px)!important;overflow:auto!important;padding:14px 14px calc(24px + env(safe-area-inset-bottom))!important;background:#08070D!important;border-bottom:0!important;box-shadow:none!important}
  .csMobileNavInner{width:min(100%,620px)!important;margin:0 auto!important;align-content:start!important}
  .csMobileNav a{min-height:52px!important}
}
</style>'''
    anchor='<script id="cs-professional-nav-a11y-20260903-js">'
    if anchor not in s:
        raise SystemExit("commercial nav insertion anchor missing")
    s=s.replace(anchor,mobile_css+anchor,1)

# Successful Stripe return: turn the public root into a dedicated access/install page.
# This stays on a route the public Worker already serves, so it cannot fall through to a 404.
return_router = r'''<script id="cs-checkout-return-router-20260905">(()=>{try{
const q=new URLSearchParams(location.search);if(q.get('checkout')!=='return'||!q.get('session_id'))return;
const show=()=>{
  document.documentElement.lang='es-MX';document.title='CloudSales — Tu acceso está listo';
  const style=document.createElement('style');style.id='cs-post-checkout-access-v1';style.textContent=`
  html,body{min-height:100%;background:radial-gradient(760px 420px at 50% -120px,#2D0A4A 0,transparent 72%),#08070D!important;color:#F3F4F8!important}body{margin:0!important;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif!important}.csPcWrap{width:min(930px,calc(100% - 28px));margin:auto;padding:28px 0 42px}.csPcHero{padding:26px;border:1px solid #37323F;border-radius:28px;background:linear-gradient(145deg,#17141F,#0b0910);box-shadow:0 28px 90px #0008}.csPcLogo{width:210px;max-width:62vw;height:auto}.csPcKicker{margin-top:26px;color:#F955B6;font-size:12px;font-weight:900;letter-spacing:.09em}.csPcTrial{display:inline-flex;margin-top:10px;padding:7px 11px;border:1px solid #5b3454;border-radius:999px;background:#211323;color:#F955B6;font-size:12px;font-weight:900}.csPcHero h1{font-size:clamp(38px,8vw,64px);line-height:.98;letter-spacing:-.05em;margin:12px 0}.csPcLead{max-width:760px;color:#AAA7B2;font-size:17px;line-height:1.6}.csPcGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:13px;margin-top:25px}.csPcCard{display:block;padding:20px;border:1px solid #37323F;border-radius:20px;background:#121019;color:#F3F4F8;text-decoration:none;min-height:118px;transition:.16s}.csPcCard:hover,.csPcCard:focus-visible{border-color:#F955B6;transform:translateY(-1px);outline:none}.csPcCard b{display:block;font-size:19px;margin-bottom:7px}.csPcCard span{display:block;color:#AAA7B2;line-height:1.45;font-size:14px}.csPcNext{margin-top:18px;padding:21px;border:1px solid #2f2a34;border-radius:20px;background:#100e15}.csPcNext h2{margin:0 0 7px;font-size:21px}.csPcBtn{display:inline-flex;margin-top:10px;align-items:center;justify-content:center;padding:14px 20px;border-radius:999px;background:linear-gradient(135deg,#F955B6,#C13BE4);color:#fff!important;text-decoration:none;font-weight:900}.csPcFine{margin-top:13px;color:#85808d;font-size:12px;line-height:1.5}@media(max-width:680px){.csPcWrap{padding-top:16px}.csPcHero{padding:20px;border-radius:22px}.csPcGrid{grid-template-columns:1fr}.csPcCard{min-height:0;padding:18px}}`;
  document.head.appendChild(style);
  document.body.innerHTML=`<main class="csPcWrap" id="csPostCheckoutAccess"><section class="csPcHero"><img class="csPcLogo" src="/cloudsales-logo-official-v2.png" alt="CloudSales"><div class="csPcKicker">TU CLOUDSALES ESTÁ LISTO</div><div class="csPcTrial">✓ 7 días gratis</div><h1>Elige cómo quieres usar CloudSales.</h1><p class="csPcLead">Tu cuenta funciona en todos tus dispositivos. Puedes instalar la app o entrar desde el navegador. Después, continúa con Cloudy para completar el onboarding de tu negocio.</p><div class="csPcGrid"><a class="csPcCard" href="https://app.cloudsales.app/?welcome=1"><b>🌐 Entrar desde tu navegador</b><span>Usa CloudSales Web ahora. No necesitas instalar nada.</span></a><a class="csPcCard" href="https://app.cloudsales.app/?install=desktop" target="_blank" rel="noopener"><b>💻 Escritorio</b><span>Instala CloudSales como aplicación en tu computadora.</span></a><a class="csPcCard" href="https://app.cloudsales.app/?install=ios" target="_blank" rel="noopener"><b>📱 iPhone / iPad</b><span>Instala CloudSales en tu dispositivo Apple.</span></a><a class="csPcCard" href="https://app.cloudsales.app/?install=android" target="_blank" rel="noopener"><b>🤖 Android</b><span>Instala CloudSales en tu teléfono o tablet Android.</span></a></div></section><section class="csPcNext"><h2>Siguiente: onboarding con Cloudy</h2><p class="csPcLead">Cuando estés listo, continúa con el mismo correo que usaste en el checkout. Cloudy te guiará para conectar tu CRM, canales, equipo y automatizaciones.</p><a class="csPcBtn" href="https://app.cloudsales.app/?welcome=1">Continuar con Cloudy</a><p class="csPcFine">Tu prueba gratuita dura 7 días. Tu método de pago queda asociado a la suscripción y el cobro mensual comienza al terminar la prueba, salvo cancelación conforme a los términos aplicables.</p></section></main>`;
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
}catch(e){console.error('post_checkout_access',e)}})();</script>'''
old_return=re.compile(r'<script id="cs-checkout-return-router-20260905">.*?</script>',re.S)
if old_return.search(s):
    s=old_return.sub(return_router,s,count=1)
else:
    head_anchor='<head>'
    if head_anchor not in s:
        raise SystemExit("commercial head anchor missing")
    s=s.replace(head_anchor,head_anchor+return_router,1)
p.write_text(s)

# PWA: reserve a real app region for bottom navigation and confine scrolling to content.
p=Path("web/native-shell-runtime-v1.js")
s=p.read_text()
marker="/* Native viewport/nav integration 2026-09-05 */"
if marker not in s:
    css=r'''
/* Native viewport/nav integration 2026-09-05 */
@media(max-width:860px){
:root{--csNavReserve:108px}
html.cs-native-app,html.cs-native-app body{height:100dvh!important;max-height:100dvh!important;overflow:hidden!important}
html.cs-native-app body{overscroll-behavior:none!important;position:relative!important}
html.cs-native-app body::after{content:'';position:fixed;left:0;right:0;bottom:0;height:calc(100px + env(safe-area-inset-bottom));background:#08070D;z-index:10030;pointer-events:none}
html.cs-native-app .shell:not(.hidden),html.cs-native-app .app{height:100dvh!important;max-height:100dvh!important;min-height:100dvh!important;overflow:hidden!important;padding-bottom:0!important}
html.cs-native-app .main{height:100dvh!important;max-height:100dvh!important;min-height:0!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;padding-bottom:0!important}
html.cs-native-app .topbar{flex:0 0 auto!important;position:relative!important;top:auto!important}
html.cs-native-app .content{flex:1 1 auto!important;min-height:0!important;height:auto!important;max-height:none!important;width:min(calc(100% - 22px),1180px)!important;margin:14px auto var(--csNavReserve)!important;overflow:hidden!important;position:relative!important;padding:0!important}
html.cs-native-app .page,html.cs-native-app .page.active{height:100%!important;max-height:100%!important;min-height:0!important;overflow:hidden!important;margin:0!important;padding-bottom:0!important}
html.cs-native-app .page.active:not(#page-home):not(#page-inventory):not(#page-cloudy):not(#page-marketing){overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain!important;padding-bottom:14px!important}
html.cs-native-app .csNativeScreen{height:100%!important;max-height:100%!important;min-height:0!important;overflow:hidden!important}
html.cs-native-app .csNPane{min-height:0!important;max-height:100%!important;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain!important;padding-bottom:14px!important;scroll-padding-bottom:14px!important}
.csNBottom{z-index:10040!important;bottom:max(8px,env(safe-area-inset-bottom))!important}
.csNMoreFloat{z-index:10055!important}
}
'''
    anchor='`;document.head.appendChild(s)}'
    if anchor not in s:
        raise SystemExit("native shell CSS anchor missing")
    s=s.replace(anchor,css+anchor,1)
p.write_text(s)

# Bump service-worker cache so installed PWA receives the shell fix.
p=Path("web/sw.js")
s=p.read_text()
s=re.sub(r"const CACHE='[^']+';","const CACHE='cloudsales-pwa-2026.09.05.1010-mobile-shell-hotfix';",s,count=1)
p.write_text(s)

# Static assertions
c=Path("web/commercial.html").read_text()
n=Path("web/native-shell-runtime-v1.js").read_text()
sw=Path("web/sw.js").read_text()
checks={
    "hamburger_dom_ready": "DOMContentLoaded',init" in c and "csMobileMenuBtn" in c and "csMobileNav" in c,
    "mobile_menu_full_sheet": "cs-mobile-nav-runtime-fix-20260905" in c and "height:calc(100dvh - 64px)" in c,
    "trial_visible": c.count("7 días gratis") >= 3 and "trialPricingBanner" in c,
    "checkout_return_access_page": "csPostCheckoutAccess" in c and "install=desktop" in c and "install=ios" in c and "install=android" in c and "Continuar con Cloudy" in c and "welcome.html" not in c,
    "native_reserved_region": marker in n and "--csNavReserve:108px" in n,
    "native_no_behind_nav": "body::after" in n and "margin:14px auto var(--csNavReserve)" in n,
    "cache_bumped": "1010-mobile-shell-hotfix" in sw,
}
bad=[k for k,v in checks.items() if not v]
if bad:
    raise SystemExit("hotfix assertions failed: "+",".join(bad))
print("HOTFIX_PASS",checks)
