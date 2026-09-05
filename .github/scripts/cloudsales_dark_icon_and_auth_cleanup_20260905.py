from pathlib import Path
import re
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
BG=(8,7,13,255)  # #08070D canonical CloudSales dark background

# --- PWA/app icon: preserve the official transparent isotipo, center it, never stretch/crop. ---
def dark_icon(src_path: Path, size: int):
    src=Image.open(src_path).convert('RGBA')
    # Trim only transparent outer whitespace, never crop visible pixels.
    alpha=src.getchannel('A')
    box=alpha.getbbox()
    if box:
        src=src.crop(box)
    max_dim=int(size*0.72)
    ratio=min(max_dim/src.width,max_dim/src.height)
    w=max(1,round(src.width*ratio)); h=max(1,round(src.height*ratio))
    src=src.resize((w,h),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(size,size),BG)
    x=(size-w)//2; y=(size-h)//2
    canvas.alpha_composite(src,(x,y))
    return canvas

p512=ROOT/'web/assets/cloudsales-isotipo-official-512.png'
p192=ROOT/'web/assets/cloudsales-isotipo-official-192.png'
base=Image.open(p512).convert('RGBA')
# If prior run already flattened the source, recover transparent mark from the legacy 64/official logo source only when available.
# Current source is expected to be transparent; idempotence guard prevents repeated shrinking.
if base.getchannel('A').getextrema()==(255,255):
    raise SystemExit('Refusing to reprocess an already flattened icon. Restore transparent canonical isotipo first.')

dark_icon(p512,512).save(p512,'PNG',optimize=True)
dark_icon(p192,192).save(p192,'PNG',optimize=True)

# --- Auth source cleanup: no free trials, no stale pre-payment Arturo/Stripe-return language. ---
auth=ROOT/'web/auth-runtime-v2.js'
s=auth.read_text(encoding='utf-8')
# Replace the entire legacy trial-copy map with a paid-access no-op. This prevents any locale from reintroducing free-trial text.
s=re.sub(r"\n\s*const TRIAL_UI_COPY=\{[\s\S]*?\n\s*function ensureTrialUi\(\)\{[\s\S]*?\}\n", "\n  function ensureTrialUi(){ /* canonical: CloudSales has zero free trials */ }\n", s, count=1)
repls={
    'Plan ${plan.toUpperCase()} seleccionado para tu suscripción de pago de 7 días.':'Plan ${plan.toUpperCase()} seleccionado para tu suscripción de pago.',
    'Completa los datos del negocio para iniciar tu prueba de CloudSales.':'Completa los datos del negocio para configurar CloudSales.',
    'Tu suscripción de pago de 7 días quedó activada. La primera mensualidad se cobrará al terminar el trial, salvo que canceles antes.':'Tu suscripción pagada quedó activada.',
    'El pago fue realizado con otro correo. Entra con el mismo email utilizado en Stripe.':'El pago fue realizado con otro correo. Entra con el mismo email utilizado para pagar.'
}
for a,b in repls.items(): s=s.replace(a,b)
# Hard fail if any actual free-trial wording remains in auth runtime.
for pat in [r'free\s*trial',r'prueba\s+gratuita',r'prueba\s+gratis',r'7\s*d[ií]as\s+gratis',r'7\s+days\s+free',r'7\s*d[ií]as\s+gratuit',r'7\s+jours\s+gratuit',r'trial\s+ends']:
    if re.search(pat,s,re.I):
        raise SystemExit(f'Forbidden free-trial wording remains: {pat}')
auth.write_text(s,encoding='utf-8')

print('CLOUDSALES_DARK_ICON_AND_AUTH_CLEANUP_OK')
