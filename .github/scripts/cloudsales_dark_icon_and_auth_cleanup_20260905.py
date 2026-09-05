from pathlib import Path
import re
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
BG=(8,7,13,255)  # #08070D canonical CloudSales dark background

# --- PWA/app icon: preserve the official transparent isotipo, center it, never stretch/crop. ---
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

p512=ROOT/'web/assets/cloudsales-isotipo-official-512.png'
p192=ROOT/'web/assets/cloudsales-isotipo-official-192.png'
base=Image.open(p512).convert('RGBA')
if base.getchannel('A').getextrema()==(255,255):
    raise SystemExit('Refusing to reprocess an already flattened icon. Restore transparent canonical isotipo first.')

dark_icon(p512,512).save(p512,'PNG',optimize=True)
dark_icon(p192,192).save(p192,'PNG',optimize=True)

# --- Auth source cleanup: CloudSales has zero free trials. ---
auth=ROOT/'web/auth-runtime-v2.js'
s=auth.read_text(encoding='utf-8')
start=s.find('  const TRIAL_UI_COPY=')
end=s.find('  let resendTimer',start)
if start>=0 and end>start:
    s=s[:start]+'  function ensureTrialUi(){ /* canonical: paid access only; zero free trials */ }\n\n'+s[end:]

repls={
    'Plan ${plan.toUpperCase()} seleccionado para tu suscripción de pago de 7 días.':'Plan ${plan.toUpperCase()} seleccionado para tu suscripción de pago.',
    'Completa los datos del negocio para iniciar tu prueba de CloudSales.':'Completa los datos del negocio para configurar CloudSales.',
    'Tu suscripción de pago de 7 días quedó activada. La primera mensualidad se cobrará al terminar el trial, salvo que canceles antes.':'Tu suscripción pagada quedó activada.',
    'El pago fue realizado con otro correo. Entra con el mismo email utilizado en Stripe.':'El pago fue realizado con otro correo. Entra con el mismo email utilizado para pagar.'
}
for a,b in repls.items(): s=s.replace(a,b)

# Remove any remaining free-trial language that could leak from legacy branches/locales.
subs=[
    (r'free\s*trial','paid subscription'),
    (r'prueba\s+gratuita','suscripción de pago'),
    (r'prueba\s+gratis','suscripción de pago'),
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
for pat,repl in subs:
    s=re.sub(pat,repl,s,flags=re.I)

for pat in [r'free\s*trial',r'prueba\s+gratuita',r'prueba\s+gratis',r'7\s*d[ií]as\s+gratis',r'7\s+days\s+free',r'7\s+jours\s+gratuit',r'7\s+giorni\s+gratis',r'7\s+Tage\s+kostenlos',r'trial\s+ends']:
    if re.search(pat,s,re.I):
        raise SystemExit(f'Forbidden free-trial wording remains: {pat}')

auth.write_text(s,encoding='utf-8')
print('CLOUDSALES_DARK_ICON_AND_AUTH_CLEANUP_OK')
