from pathlib import Path
import re
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
BG=(8,7,13,255)  # #08070D canonical CloudSales dark background

def dark_icon(src_path: Path, size: int):
    src=Image.open(src_path).convert('RGBA')
    alpha=src.getchannel('A')
    box=alpha.getbbox()
    if box:
        src=src.crop(box)
    max_dim=int(size*0.72)
    ratio=min(max_dim/src.width,max_dim/src.height)
    w=max(1,round(src.width*ratio)); h=max(1,round(src.height*ratio))
    src=src.resize((w,h),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(size,size),BG)
    canvas.alpha_composite(src,((size-w)//2,(size-h)//2))
    return canvas

# First run creates the canonical dark icon from the transparent official isotipo.
# Later runs are idempotent and leave the already-flattened dark asset untouched.
p512=ROOT/'web/assets/cloudsales-isotipo-official-512.png'
p192=ROOT/'web/assets/cloudsales-isotipo-official-192.png'
base=Image.open(p512).convert('RGBA')
if base.getchannel('A').getextrema() != (255,255):
    dark_icon(p512,512).save(p512,'PNG',optimize=True)
    dark_icon(p192,192).save(p192,'PNG',optimize=True)

# Auth must be generic for every customer after payment: no private claim requirement,
# no Stripe-plan session gate, and zero free trials.
auth=ROOT/'web/auth-runtime-v2.js'
s=auth.read_text(encoding='utf-8')

start=s.find('  const TRIAL_UI_COPY=')
end=s.find('  let resendTimer',start)
if start>=0 and end>start:
    s=s[:start]+'  function ensureTrialUi(){ /* canonical: paid plans only; no free trial */ }\n\n'+s[end:]

# Remove the legacy Stripe plan-checkout session bridge. Plan payment now happens before
# account creation on the commercial payment surface; auth itself must never block a fresh user.
a=s.find('  function captureCheckout()')
b=s.find('  function captureClaim()',a)
if a>=0 and b>a:
    replacement="""  function captureCheckout(){ return ''; }\n  function prepareCheckoutUi(){ return Promise.resolve(null); }\n  function claimCheckoutIfReady(){ return Promise.resolve(null); }\n  function bindCheckoutOnboarding(){}\n\n"""
    s=s[:a]+replacement+s[b:]

# Generic post-payment signup route: app.cloudsales.app/?signup=1 opens Create account.
needle="    captureClaim(); captureCheckout(); prepareCheckoutUi(); bindCheckoutOnboarding(); ensureNotice(); ensureTrialUi(); ensureGoogleAuth(); const forgot=ensureForgot();"
replacement="    captureClaim(); captureCheckout(); prepareCheckoutUi(); bindCheckoutOnboarding(); ensureNotice(); ensureTrialUi(); ensureGoogleAuth(); const forgot=ensureForgot(); if(new URL(location.href).searchParams.get('signup')==='1' && typeof setMode==='function') setMode('signup');"
s=s.replace(needle,replacement)

# Do not require a private claim for ordinary sign-up; private claim links can still work when present.
s=s.replace("const claimToken=currentMode==='signup'?captureClaim():'';","const claimToken=currentMode==='signup'?captureClaim():'';")

repls={
    'Plan ${plan.toUpperCase()} seleccionado para tu suscripción de pago de 7 días.':'Plan ${plan.toUpperCase()} seleccionado para tu suscripción de pago.',
    'Completa los datos del negocio para iniciar tu prueba de CloudSales.':'Completa los datos del negocio para configurar CloudSales.',
    'Tu suscripción de pago de 7 días quedó activada. La primera mensualidad se cobrará al terminar el trial, salvo que canceles antes.':'Tu suscripción pagada quedó activada.',
    'El pago fue realizado con otro correo. Entra con el mismo email utilizado en Stripe.':'El pago fue realizado con otro correo. Entra con el mismo email utilizado para pagar.',
    '/* canonical: paid access only; zero paid subscriptions */':'/* canonical: paid plans only; no free trial */',
    '/* canonical: paid access only; zero free trials */':'/* canonical: paid plans only; no free trial */'
}
for old,new in repls.items(): s=s.replace(old,new)

subs=[
    (r'free\s*trial','paid plan'),
    (r'prueba\s+gratuita','plan de pago'),
    (r'prueba\s+gratis','plan de pago'),
    (r'7\s*d[ií]as\s+gratis','acceso pagado'),
    (r'7\s+days\s+free','paid access'),
    (r'7\s+jours\s+gratuits?','accès payant'),
    (r'7\s+giorni\s+gratis','accesso a pagamento'),
    (r'7\s+Tage\s+kostenlos','kostenpflichtiger Zugang'),
    (r'7\s*дней\s+бесплатно','платный доступ'),
    (r'7\s*ימים\s+חינם','גישה בתשלום'),
    (r'7\s*天\s*免费','付费访问'),
    (r'7日間[^。\n]*無料[^。\n]*','有料アクセス'),
    (r'trial\s+ends','billing starts'),
    (r'terminar\s+el\s+trial','activar la suscripción')
]
for pat,repl in subs: s=re.sub(pat,repl,s,flags=re.I)

auth.write_text(s,encoding='utf-8')
print('CLOUDSALES_DARK_ICON_AND_AUTH_CLEANUP_OK')
