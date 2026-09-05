from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'web/commercial.html'
s=p.read_text(encoding='utf-8')

# Subscription plans are PayPal-only. Remove Stripe plan checkout from public commercial site.
s=re.sub(r'<script\s+src=["\']https://js\.stripe\.com/v3/?["\']\s*></script>\s*','',s,flags=re.I)
s=s.replace('Checkout seguro por Stripe','Pago seguro por PayPal')
s=s.replace('id="stripeMount"','id="paypalMount"')
s=s.replace('https://app.cloudsales.app/#install-ios','https://app.cloudsales.app/?install=ios')
s=s.replace('https://app.cloudsales.app/#install-android','https://app.cloudsales.app/?install=android')
s=s.replace('https://app.cloudsales.app/#install-desktop','https://app.cloudsales.app/?install=desktop')

old_pat=r"<script>const FN='https://fkahaqprzgcimgyathqx\.supabase\.co/functions/v1/stripe-checkout-start';[\s\S]*?</script>"
new="""<script src=\"/paypal-plan-links-v1.js?v=20260905\"></script><script id=\"cs-paypal-plan-checkout-v1\">(()=>{\nconst modal=document.getElementById('checkout'),mount=document.getElementById('paypalMount'),err=document.getElementById('cerr'),emailInput=document.getElementById('cemail'),start=document.getElementById('cstart');\nlet selected=null;\nconst validEmail=v=>/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(v||'').trim());\nfunction paymentLink(){\n  const links=window.CLOUDSALES_PAYPAL_PLAN_LINKS||{};\n  const q=new URL(location.href).searchParams;\n  // One-time transition path for the already-issued Arturo PRO invoice only. Never exposed as the public reusable PRO link.\n  if(selected==='plan_pro'&&q.get('payment')==='arturo-pro') return 'https://www.paypal.com/invoice/p/#7XCN724E73MHKXAV';\n  const link=links[selected];\n  return typeof link==='string'&&/^https:\\/\\/(?:www\\.)?paypal\\.com\\//i.test(link)?link:'';\n}\nfunction afterPay(){\n  mount.innerHTML=`<div style=\"border:1px solid #37323F;background:#17141F;border-radius:16px;padding:16px;margin-top:10px\"><b>PayPal se abrió para completar tu pago.</b><p style=\"color:#AAA7B2;line-height:1.5\">Después de pagar, crea tu cuenta CloudSales. Puedes usar Google, Microsoft o email + contraseña y después instalar la app en tu dispositivo.</p><a class=\"btn primary\" style=\"display:block;text-align:center;margin:10px 0\" href=\"https://app.cloudsales.app/?signup=1\">CREAR MI CUENTA</a><div class=\"download\" style=\"margin-top:10px\"><a href=\"https://app.cloudsales.app/?install=ios\"> <span>iPhone / iPad</span></a><a href=\"https://app.cloudsales.app/?install=android\">◉ <span>Android</span></a><a href=\"https://app.cloudsales.app/?install=desktop\">▣ <span>Desktop</span></a></div></div>`;\n}\ndocument.querySelectorAll('.buy[data-item]').forEach(b=>{b.onclick=e=>{e.preventDefault();selected=b.dataset.item;modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';mount.innerHTML='';err.textContent='';document.getElementById('emailrow').style.display='flex';start.disabled=false;setTimeout(()=>emailInput?.focus(),0)}});\ndocument.getElementById('cclose').onclick=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow='';mount.innerHTML='';err.textContent=''};\nstart.onclick=()=>{\n  const email=emailInput.value.trim();\n  if(!validEmail(email)||!selected){err.textContent='Escribe un correo válido.';return}\n  const link=paymentLink();\n  if(!link){err.textContent='El enlace reutilizable de PayPal para este plan todavía no está configurado. No se realizará ningún cargo.';return}\n  localStorage.setItem('cloudsales_checkout_email',email);\n  localStorage.setItem('cloudsales_selected_plan',selected);\n  err.textContent='Abriendo PayPal…';\n  const w=window.open(link,'_blank','noopener,noreferrer');\n  if(!w){location.href=link;return}\n  err.textContent='';document.getElementById('emailrow').style.display='none';afterPay();\n};\n})();</script>"""
s,n=re.subn(old_pat,lambda _m:new,s,count=1,flags=re.I)
if n!=1:
    raise SystemExit('Could not locate legacy Stripe commercial checkout script')

for forbidden in ['stripe-checkout-start','Stripe(d.publishable_key)','initEmbeddedCheckout','Checkout seguro por Stripe']:
    if forbidden in s: raise SystemExit(f'Forbidden Stripe plan checkout remains: {forbidden}')
if '/paypal-plan-links-v1.js' not in s: raise SystemExit('PayPal registry not wired')

p.write_text(s,encoding='utf-8')
print('CLOUDSALES_PAYPAL_COMMERCIAL_CHECKOUT_PATCH_OK')
