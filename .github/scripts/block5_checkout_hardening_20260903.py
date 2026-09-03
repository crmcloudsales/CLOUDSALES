from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[2]
FILES=['web/academy.html','web/services.html']
SCRIPT=r'''<script id="cs-secondary-checkout-20260903">(()=>{
'use strict';
const FN='https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/stripe-checkout-start';
const modal=document.getElementById('checkout'),closeBtn=document.getElementById('close'),startBtn=document.getElementById('start'),emailInput=document.getElementById('email'),row=document.getElementById('row'),mount=document.getElementById('mount'),errorBox=document.getElementById('error');
if(!modal||!closeBtn||!startBtn||!emailInput||!row||!mount||!errorBox)return;
let item='',checkout=null;
const params=new URL(location.href).searchParams;
const queryRef=params.get('ref')||'';
if(queryRef)try{localStorage.setItem('cloudsales_ref',queryRef)}catch{}
const affiliateRef=()=>queryRef||(()=>{try{return localStorage.getItem('cloudsales_ref')||''}catch{return''}})();
function closeModal(){modal.classList.remove('open');document.body.style.overflow='';errorBox.textContent=''}
document.querySelectorAll('.buy[data-item]').forEach(btn=>btn.addEventListener('click',()=>{item=btn.dataset.item||'';modal.classList.add('open');document.body.style.overflow='hidden';row.style.display='flex';mount.innerHTML='';errorBox.textContent='';startBtn.disabled=false;emailInput.focus()}));
closeBtn.addEventListener('click',closeModal);modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))closeModal()});
startBtn.addEventListener('click',async()=>{
  const email=emailInput.value.trim();
  if(!item||!/^\S+@\S+\.\S+$/.test(email)){errorBox.textContent='Escribe un correo válido.';return}
  errorBox.textContent='Preparando checkout…';startBtn.disabled=true;
  try{
    const r=await fetch(FN,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({item_key:item,email,affiliate_code:affiliateRef()})});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.detail||d.error||'checkout_error');
    if(d.checkout_url){location.assign(d.checkout_url);return}
    if(!d.publishable_key||!d.client_secret||typeof Stripe!=='function')throw Error('checkout_not_available');
    checkout=await Stripe(d.publishable_key).initEmbeddedCheckout({clientSecret:d.client_secret});
    row.style.display='none';errorBox.textContent='';checkout.mount('#mount');
  }catch(e){errorBox.textContent='No pudimos abrir el checkout: '+(e?.message||'error');startBtn.disabled=false}
});
})();</script>'''

for f in FILES:
    p=ROOT/f;s=p.read_text(encoding='utf-8')
    # Replace the legacy id-global checkout script, preserving the rest of the page verbatim.
    pattern=r'<script>const F=[\s\S]*?</script>(?=</body>)'
    if re.search(pattern,s): s=re.sub(pattern,SCRIPT,s,count=1)
    elif 'cs-secondary-checkout-20260903' not in s: raise SystemExit('checkout script marker missing in '+f)
    s=s.replace('<link rel="icon" href="/icon.svg">','<link rel="icon" type="image/png" href="/assets/cloudsales-app-icon-official-v4.png">')
    p.write_text(s,encoding='utf-8')

for f in FILES:
    s=(ROOT/f).read_text(encoding='utf-8')
    assert s.count('id="cs-secondary-checkout-20260903"')==1,f
    for marker in ['stripe-checkout-start','d.checkout_url','d.publishable_key','d.client_secret','affiliate_code:affiliateRef()','Escribe un correo válido.','Preparando checkout…','No pudimos abrir el checkout: ']: assert marker in s,(f,marker)
    assert '/assets/cloudsales-app-icon-official-v4.png' in s,f
    assert 'const F=' not in s,f
print('BLOCK5_CHECKOUT_HARDENING_OK')
