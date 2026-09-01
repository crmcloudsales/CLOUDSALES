from pathlib import Path
p=Path('web/cloudsales-i18n-v1.js')
s=p.read_text()
if 'function patchHostedCheckout()' not in s:
    marker='function checkoutReturnBridge()'
    if marker not in s: raise SystemExit('checkoutReturnBridge missing')
    block=r'''function patchHostedCheckout(){
  const start=document.getElementById('cstart'),email=document.getElementById('cemail'),mount=document.getElementById('stripeMount'),err=document.getElementById('cerr');
  if(!start||!email||!mount||!err||start.dataset.csHostedPatched==='1')return;
  let item='';
  document.querySelectorAll('.buy[data-item]').forEach(b=>b.addEventListener('click',()=>{item=b.dataset.item||''}));
  start.dataset.csHostedPatched='1';
  start.onclick=async()=>{
    const mail=email.value.trim();if(!mail||!item){err.textContent='Escribe un correo válido.';return}
    err.textContent='Preparando checkout…';start.disabled=true;
    try{
      const ref=new URL(location.href).searchParams.get('ref')||localStorage.getItem('cloudsales_ref')||'';if(ref)localStorage.setItem('cloudsales_ref',ref);
      const r=await fetch('https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/stripe-checkout-start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({item_key:item,email:mail,affiliate_code:ref})});
      const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.detail||d.error||'checkout_error');
      if(d.checkout_url){location.assign(d.checkout_url);return}
      if(!d.client_secret||!d.publishable_key)throw Error('checkout_not_available');
      const stripe=Stripe(d.publishable_key),instance=await stripe.initEmbeddedCheckout({clientSecret:d.client_secret});
      document.getElementById('emailrow').style.display='none';err.textContent='';instance.mount('#stripeMount');
    }catch(e){err.textContent='No pudimos abrir el checkout: '+(e?.message||'error');start.disabled=false}
  };
}
'''
    s=s.replace(marker,block+marker,1)
# run after DOM exists; commercial runtime is loaded at body end
old="style();if(checkoutReturnBridge())return;const locale=detect();"
new="style();if(checkoutReturnBridge())return;patchHostedCheckout();const locale=detect();"
if old in s:s=s.replace(old,new,1)
if 'patchHostedCheckout();const locale=detect();' not in s: raise SystemExit('hosted checkout init missing')
p.write_text(s)
