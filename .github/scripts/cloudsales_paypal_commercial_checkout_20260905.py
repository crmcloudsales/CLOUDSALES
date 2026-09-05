from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'web/commercial.html'
s=p.read_text(encoding='utf-8')

# Canonical CloudSales plan policy: PayPal only, zero free trials, generic flow for every customer.
s=re.sub(r'<script\s+src=["\']https://js\.stripe\.com/v3/?["\']\s*></script>\s*','',s,flags=re.I)
s=s.replace('Checkout seguro por Stripe','Pago seguro por PayPal')
s=s.replace('id="stripeMount"','id="paypalMount"')
s=s.replace('https://app.cloudsales.app/#install-ios','https://app.cloudsales.app/?install=ios')
s=s.replace('https://app.cloudsales.app/#install-android','https://app.cloudsales.app/?install=android')
s=s.replace('https://app.cloudsales.app/#install-desktop','https://app.cloudsales.app/?install=desktop')

# Remove all legacy client-side registries and any person-specific transition code.
s=re.sub(r'<script[^>]*id="cs-paypal-plan-registry-v1"[^>]*>[\s\S]*?</script>','',s,flags=re.I)
s=re.sub(r'<script\s+src="/paypal-plan-links-v1\.js[^\"]*"\s*></script>','',s,flags=re.I)

checkout="""<script id=\"cs-paypal-plan-checkout-v2\">(()=>{\nconst CATALOG='https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/cloudsales-web/api/catalog';\nconst modal=document.getElementById('checkout'),mount=document.getElementById('paypalMount'),err=document.getElementById('cerr'),emailInput=document.getElementById('cemail'),start=document.getElementById('cstart');\nlet selected=null;\nconst validEmail=v=>/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(v||'').trim());\nconst validPayPal=v=>typeof v==='string'&&/^https:\\/\\/(?:www\\.)?paypal\\.com\\//i.test(v);\nasync function paymentLink(item){\n  const r=await fetch(CATALOG,{cache:'no-store',headers:{accept:'application/json'}});\n  if(!r.ok)throw new Error('billing_config_unavailable');\n  const rows=await r.json();\n  const row=Array.isArray(rows)?rows.find(x=>String(x.item_key||'')===item):null;\n  const link=row?.metadata?.paypal_payment_link_url||row?.metadata?.payment_link_url||null;\n  return validPayPal(link)?link:'';\n}\nfunction afterPay(){\n  mount.innerHTML=`<div style=\"border:1px solid #37323F;background:#17141F;border-radius:16px;padding:16px;margin-top:10px\"><b>PayPal se abrió para completar tu pago.</b><p style=\"color:#AAA7B2;line-height:1.5\">Después de pagar, crea tu cuenta CloudSales. Puedes usar Google, Microsoft o email + contraseña y después instalar la app en tu dispositivo.</p><a class=\"btn primary\" style=\"display:block;text-align:center;margin:10px 0\" href=\"https://app.cloudsales.app/?signup=1\">CREAR MI CUENTA</a><div class=\"download\" style=\"margin-top:10px\"><a href=\"https://app.cloudsales.app/?install=ios\"> <span>iPhone / iPad</span></a><a href=\"https://app.cloudsales.app/?install=android\">◉ <span>Android</span></a><a href=\"https://app.cloudsales.app/?install=desktop\">▣ <span>Desktop</span></a></div></div>`;\n}\ndocument.querySelectorAll('.buy[data-item]').forEach(b=>{b.onclick=e=>{e.preventDefault();selected=b.dataset.item;modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';mount.innerHTML='';err.textContent='';document.getElementById('emailrow').style.display='flex';start.disabled=false;setTimeout(()=>emailInput?.focus(),0)}});\ndocument.getElementById('cclose').onclick=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow='';mount.innerHTML='';err.textContent=''};\nstart.onclick=async()=>{\n  const email=emailInput.value.trim();\n  if(!validEmail(email)||!selected){err.textContent='Escribe un correo válido.';return}\n  start.disabled=true;err.textContent='Preparando PayPal…';\n  try{\n    const link=await paymentLink(selected);\n    if(!link){err.textContent='El enlace reutilizable de PayPal para este plan todavía no está configurado. No se realizará ningún cargo.';start.disabled=false;return}\n    localStorage.setItem('cloudsales_checkout_email',email);\n    localStorage.setItem('cloudsales_selected_plan',selected);\n    const w=window.open(link,'_blank','noopener,noreferrer');\n    if(!w){location.href=link;return}\n    err.textContent='';document.getElementById('emailrow').style.display='none';afterPay();\n  }catch(_e){err.textContent='No pudimos cargar el enlace de pago. Intenta nuevamente.';start.disabled=false}\n};\n})();</script>"""

legacy_stripe=r"<script>const FN='https://fkahaqprzgcimgyathqx\.supabase\.co/functions/v1/stripe-checkout-start';[\s\S]*?</script>"
s,n=re.subn(legacy_stripe,lambda _m:checkout,s,count=1,flags=re.I)
if n==0:
    # Replace any previously generated PayPal checkout version in place.
    s,n=re.subn(r'<script[^>]*id="cs-paypal-plan-checkout-v[12]"[^>]*>[\s\S]*?</script>',lambda _m:checkout,s,count=1,flags=re.I)
if n!=1:
    raise SystemExit('Could not locate commercial checkout block')

# Hard guarantees: no Stripe subscription checkout and no customer-specific code/data in public source.
for forbidden in [
    'stripe-checkout-start','Stripe(d.publishable_key)','initEmbeddedCheckout','Checkout seguro por Stripe','https://js.stripe.com/v3',
    'aesquer1@gmail.com','7XCN724E73MHKXAV','arturo-pro','SENZIK','Senzik'
]:
    if forbidden.lower() in s.lower(): raise SystemExit(f'Forbidden public checkout residue remains: {forbidden}')
if 'cs-paypal-plan-checkout-v2' not in s or 'cloudsales-web/api/catalog' not in s:
    raise SystemExit('Generic PayPal checkout not wired')

p.write_text(s,encoding='utf-8')
print('CLOUDSALES_GENERIC_PAYPAL_COMMERCIAL_CHECKOUT_OK')
