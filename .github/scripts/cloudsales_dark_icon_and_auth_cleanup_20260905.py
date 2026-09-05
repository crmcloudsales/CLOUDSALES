from pathlib import Path
import re
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
BG=(8,7,13,255)

def dark_icon(src_path: Path, size: int):
    src=Image.open(src_path).convert('RGBA')
    alpha=src.getchannel('A'); box=alpha.getbbox()
    if box: src=src.crop(box)
    max_dim=int(size*0.72); ratio=min(max_dim/src.width,max_dim/src.height)
    w=max(1,round(src.width*ratio)); h=max(1,round(src.height*ratio))
    src=src.resize((w,h),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(size,size),BG)
    canvas.alpha_composite(src,((size-w)//2,(size-h)//2))
    return canvas

p512=ROOT/'web/assets/cloudsales-isotipo-official-512.png'
p192=ROOT/'web/assets/cloudsales-isotipo-official-192.png'
base=Image.open(p512).convert('RGBA')
if base.getchannel('A').getextrema() != (255,255):
    dark_icon(p512,512).save(p512,'PNG',optimize=True)
    dark_icon(p192,192).save(p192,'PNG',optimize=True)

# Generic auth for every new customer after payment. No legacy Stripe-plan session gate.
auth=ROOT/'web/auth-runtime-v2.js'
s=auth.read_text(encoding='utf-8')
start=s.find('  const TRIAL_UI_COPY='); end=s.find('  let resendTimer',start)
if start>=0 and end>start:
    s=s[:start]+'  function ensureTrialUi(){ /* canonical: paid plans only */ }\n\n'+s[end:]
a=s.find('  function captureCheckout()'); b=s.find('  function captureClaim()',a)
if a>=0 and b>a:
    s=s[:a]+"  function captureCheckout(){ return ''; }\n  function prepareCheckoutUi(){ return Promise.resolve(null); }\n  function claimCheckoutIfReady(){ return Promise.resolve(null); }\n  function bindCheckoutOnboarding(){}\n\n"+s[b:]
needle="    captureClaim(); captureCheckout(); prepareCheckoutUi(); bindCheckoutOnboarding(); ensureNotice(); ensureTrialUi(); ensureGoogleAuth(); const forgot=ensureForgot();"
repl="    captureClaim(); captureCheckout(); prepareCheckoutUi(); bindCheckoutOnboarding(); ensureNotice(); ensureTrialUi(); ensureGoogleAuth(); const forgot=ensureForgot(); if(new URL(location.href).searchParams.get('signup')==='1' && typeof setMode==='function') setMode('signup');"
s=s.replace(needle,repl)
for old,new in {
    'Plan ${plan.toUpperCase()} seleccionado para tu suscripción de pago de 7 días.':'Plan ${plan.toUpperCase()} seleccionado para tu suscripción de pago.',
    'Completa los datos del negocio para iniciar tu prueba de CloudSales.':'Completa los datos del negocio para configurar CloudSales.',
    'Tu suscripción de pago de 7 días quedó activada. La primera mensualidad se cobrará al terminar el trial, salvo que canceles antes.':'Tu suscripción pagada quedó activada.',
    'El pago fue realizado con otro correo. Entra con el mismo email utilizado en Stripe.':'El pago fue realizado con otro correo. Entra con el mismo email utilizado para pagar.',
    '/* canonical: paid access only; zero paid subscriptions */':'/* canonical: paid plans only */',
    '/* canonical: paid access only; zero free trials */':'/* canonical: paid plans only */',
    '/* canonical: paid plans only; no free trial */':'/* canonical: paid plans only */'
}.items(): s=s.replace(old,new)
subs=[
    (r'free\s*trial','paid plan'),(r'prueba\s+gratuita','plan de pago'),(r'prueba\s+gratis','plan de pago'),
    (r'7\s*d[ií]as\s+gratis','acceso pagado'),(r'7\s+days\s+free','paid access'),
    (r'7\s+jours\s+gratuits?','accès payant'),(r'7\s+giorni\s+gratis','accesso a pagamento'),
    (r'7\s+Tage\s+kostenlos','kostenpflichtiger Zugang'),(r'7\s*дней\s+бесплатно','платный доступ'),
    (r'7\s*ימים\s+חינם','גישה בתשלום'),(r'7\s*天\s*免费','付费访问'),(r'7日間[^。\n]*無料[^。\n]*','有料アクセス'),
    (r'trial\s+ends','billing starts'),(r'terminar\s+el\s+trial','activar la suscripción')
]
for pat,replacement in subs: s=re.sub(pat,replacement,s,flags=re.I)
auth.write_text(s,encoding='utf-8')

# Canonical subscription gate: no person-specific logic and no Stripe checkout for plans.
# If a plan payment is required, send the customer to the commercial plan surface.
billing=ROOT/'web/billing-runtime-v1.js'
billing.write_text(r'''(() => {
  'use strict';
  const PLANS_URL='https://cloudsales.app/#pricing';
  let overlay=null,lastKey='';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>`US$${Number(v||97).toFixed(0)}`;
  function billing(){if(typeof currentOrg==='undefined'||!currentOrg)return null;const m=currentOrg.member_access||null;if(m&&(m.gate_required||m.payment_required||m.card_required))return {...m,_kind:'member'};const b=currentOrg.billing_access||currentOrg.subscription||null;return b?{...b,_kind:'organization'}:null}
  function required(b){return !!(b&&(b.gate_required||b.locked||b.payment_required))}
  function injectCss(){if(document.getElementById('csBillingGateCss'))return;const s=document.createElement('style');s.id='csBillingGateCss';s.textContent=`#csBillingGate{position:fixed;inset:0;z-index:2147483000;background:#08070D;display:grid;place-items:center;padding:18px;overflow:auto;color:#F3F4F8;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}#csBillingGate .box{width:min(620px,100%);background:linear-gradient(180deg,#121019,#0B0910);border:1px solid #37323F;border-radius:26px;box-shadow:0 40px 120px #000b;overflow:hidden}#csBillingGate .accent{height:5px;background:linear-gradient(90deg,#F955B6,#C13BE4)}#csBillingGate .inner{padding:28px}#csBillingGate .brand{display:flex;justify-content:center;margin-bottom:22px}#csBillingGate .brand img{width:190px;max-width:70%;height:auto;display:block}#csBillingGate h1{font-size:clamp(28px,6vw,40px);line-height:1.04;letter-spacing:-.04em;margin:0 0 14px}#csBillingGate p{color:#C9C6D2;line-height:1.55;margin:0 0 14px;font-size:15px}#csBillingGate .cta{width:100%;border:0;border-radius:999px;background:linear-gradient(135deg,#F955B6,#C13BE4);color:#fff;padding:14px 18px;font-size:15px;font-weight:900;cursor:pointer}#csBillingGate .small{font-size:11px;color:#AAA7B2;text-align:center;margin-top:12px}#csBillingSettings{border:1px solid #37323F;background:#121019;border-radius:20px;padding:18px}#csBillingSettings p{color:#AAA7B2;font-size:13px;line-height:1.5}`;document.head.appendChild(s)}
  function remove(){overlay?.remove();overlay=null;lastKey=''}
  function ensure(b){injectCss();const org=typeof currentOrg!=='undefined'?currentOrg:null;if(!org||!required(b)){remove();return}const amount=money(b.price_usd||b.amount_usd||97),key=`${org.id}:${b.status||''}:${amount}`;if(overlay&&key===lastKey)return;remove();lastKey=key;overlay=document.createElement('div');overlay.id='csBillingGate';overlay.innerHTML=`<div class="box"><div class="accent"></div><div class="inner"><div class="brand"><img src="/assets/cloudsales-logo-official-v2.png" alt="CloudSales"></div><h1>Activa tu plan CloudSales</h1><p>Completa el pago de tu plan en la página oficial de CloudSales. Después podrás continuar con tu cuenta normalmente.</p><button class="cta" id="csBillingStart">VER PLANES Y PAGAR</button><div class="small">Pago seguro procesado por PayPal.</div></div></div>`;document.body.appendChild(overlay);overlay.querySelector('#csBillingStart').onclick=()=>location.assign(PLANS_URL)}
  function ensureSettingsBilling(){injectCss();const org=typeof currentOrg!=='undefined'?currentOrg:null,page=document.getElementById('page-settings');if(!page||!org)return;const cards=page.querySelector('.cards');if(!cards)return;let root=document.getElementById('csBillingSettings');if(!root){root=document.createElement('div');root.id='csBillingSettings';root.className='card';cards.appendChild(root)}const sub=org.subscription||org.billing_access||{},provider=String(sub.billing_provider||'').toLowerCase();root.innerHTML=provider==='paypal'?`<h3>Facturación</h3><p>Plan administrado con PayPal.</p>`:`<h3>Facturación</h3><p>Los planes CloudSales se pagan mediante PayPal.</p>`}
  function tick(){ensureSettingsBilling();const b=billing();if(!b||!required(b)){remove();return}ensure(b)}
  window.addEventListener('load',()=>{setInterval(tick,900);setTimeout(tick,200)});
})();
''',encoding='utf-8')

print('CLOUDSALES_DARK_ICON_AUTH_BILLING_CLEANUP_OK')
