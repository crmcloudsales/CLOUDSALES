from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'web/commercial.html'
s=p.read_text(encoding='utf-8')

# Canonical CloudSales plan policy: PayPal only, no trial concept, generic flow for every customer.
s=re.sub(r'<script\s+src=["\']https://js\.stripe\.com/v3/?["\']\s*></script>\s*','',s,flags=re.I)
s=s.replace('Checkout seguro por Stripe','Pago seguro por PayPal')
s=s.replace('id="stripeMount"','id="paypalMount"')
s=s.replace('https://app.cloudsales.app/#install-ios','https://app.cloudsales.app/?install=ios')
s=s.replace('https://app.cloudsales.app/#install-android','https://app.cloudsales.app/?install=android')
s=s.replace('https://app.cloudsales.app/#install-desktop','https://app.cloudsales.app/?install=desktop')
s=re.sub(r'<script[^>]*id="cs-paypal-plan-registry-v1"[^>]*>[\s\S]*?</script>','',s,flags=re.I)
s=re.sub(r'<script\s+src="/paypal-plan-links-v1\.js[^\"]*"\s*></script>','',s,flags=re.I)

checkout="""<script id=\"cs-paypal-plan-checkout-v3\">(()=>{\nconst PAYPAL_START='https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/cloudflare-release-v4';\nconst modal=document.getElementById('checkout'),mount=document.getElementById('paypalMount'),err=document.getElementById('cerr'),emailInput=document.getElementById('cemail'),start=document.getElementById('cstart');\nlet selected=null;\nconst validEmail=v=>/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(v||'').trim());\nconst validPayPal=v=>typeof v==='string'&&/^https:\\/\\/(?:www\\.)?paypal\\.com\\//i.test(v);\nasync function beginPayPal(item,email){\n  const r=await fetch(PAYPAL_START,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({item_key:item,email})});\n  const d=await r.json().catch(()=>({}));\n  if(!r.ok)throw new Error(d.error||'paypal_checkout_unavailable');\n  if(d.provider!=='paypal'||!validPayPal(d.approval_url))throw new Error('paypal_checkout_invalid');\n  return d;\n}\nfunction afterPay(){\n  mount.innerHTML=`<div style=\"border:1px solid #37323F;background:#17141F;border-radius:16px;padding:16px;margin-top:10px\"><b>Completa tu pago seguro en PayPal.</b><p style=\"color:#AAA7B2;line-height:1.5\">Al terminar el pago, PayPal te regresa a CloudSales para crear tu cuenta. También puedes volver aquí y continuar con el mismo correo.</p><a class=\"btn primary\" style=\"display:block;text-align:center;margin:10px 0\" href=\"https://app.cloudsales.app/?signup=1&payment=paypal\">CREAR MI CUENTA DESPUÉS DE PAGAR</a><div class=\"download\" style=\"margin-top:10px\"><a href=\"https://app.cloudsales.app/?install=ios\"> <span>iPhone / iPad</span></a><a href=\"https://app.cloudsales.app/?install=android\">◉ <span>Android</span></a><a href=\"https://app.cloudsales.app/?install=desktop\">▣ <span>Desktop</span></a></div></div>`;\n}\ndocument.querySelectorAll('.buy[data-item]').forEach(b=>{b.onclick=e=>{e.preventDefault();selected=b.dataset.item;modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';mount.innerHTML='';err.textContent='';document.getElementById('emailrow').style.display='flex';start.disabled=false;setTimeout(()=>emailInput?.focus(),0)}});\ndocument.getElementById('cclose').onclick=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow='';mount.innerHTML='';err.textContent=''};\nstart.onclick=async()=>{\n  const email=emailInput.value.trim();\n  if(!validEmail(email)||!selected){err.textContent='Escribe un correo válido.';return}\n  // Open synchronously so Safari/iPhone do not block the PayPal window after the network await.\n  let payWindow=null;try{payWindow=window.open('about:blank','_blank')}catch(_e){}\n  start.disabled=true;err.textContent='Preparando PayPal…';\n  try{\n    const d=await beginPayPal(selected,email);\n    localStorage.setItem('cloudsales_checkout_email',email);\n    localStorage.setItem('cloudsales_selected_plan',selected);\n    if(payWindow&&!payWindow.closed){payWindow.location.replace(d.approval_url)}else{location.href=d.approval_url;return}\n    err.textContent='';document.getElementById('emailrow').style.display='none';afterPay();\n  }catch(e){try{payWindow?.close()}catch(_e){};const code=String(e?.message||'');err.textContent=code==='paypal_plan_not_configured'||code==='paypal_credentials_missing'?'El pago PayPal de este plan está temporalmente en configuración. No se realizó ningún cargo.':'No pudimos iniciar PayPal. Intenta nuevamente.';start.disabled=false}\n};\n})();</script>"""

legacy_stripe=r"<script>const FN='https://fkahaqprzgcimgyathqx\.supabase\.co/functions/v1/stripe-checkout-start';[\s\S]*?</script>"
s,n=re.subn(legacy_stripe,lambda _m:checkout,s,count=1,flags=re.I)
if n==0:
    s,n=re.subn(r'<script[^>]*id="cs-paypal-plan-checkout-v[123]"[^>]*>[\s\S]*?</script>',lambda _m:checkout,s,count=1,flags=re.I)
if n!=1:
    raise SystemExit('Could not locate commercial checkout block')

for forbidden in [
    'stripe-checkout-start','Stripe(d.publishable_key)','initEmbeddedCheckout','Checkout seguro por Stripe','https://js.stripe.com/v3',
    'aesquer1@gmail.com','7XCN724E73MHKXAV','arturo-pro','SENZIK','Senzik','free trial','prueba gratis','prueba gratuita'
]:
    if forbidden.lower() in s.lower(): raise SystemExit(f'Forbidden public checkout residue remains: {forbidden}')
if 'cs-paypal-plan-checkout-v3' not in s or 'cloudflare-release-v4' not in s:
    raise SystemExit('Canonical PayPal checkout service not wired')

p.write_text(s,encoding='utf-8')
print('CLOUDSALES_CANONICAL_PAYPAL_COMMERCIAL_CHECKOUT_OK')
