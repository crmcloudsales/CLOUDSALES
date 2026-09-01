from pathlib import Path

# 1) Commercial Stripe return -> PWA bridge
p = Path('web/cloudsales-i18n-v1.js')
s = p.read_text()
if 'function checkoutReturnBridge()' not in s:
    marker = 'style();const locale=detect();'
    if marker not in s:
        raise SystemExit('i18n startup marker missing')
    bridge = """function checkoutReturnBridge(){try{const u=new URL(location.href),sid=u.searchParams.get('session_id')||'';if(u.searchParams.get('checkout')==='return'&&/^cs_(?:test|live)_/.test(sid)){const saved=localStorage.getItem(STORE)||'',lang=u.searchParams.get('lang')||saved,d=new URL('https://app.cloudsales.app/');d.searchParams.set('checkout','return');d.searchParams.set('session_id',sid);if(lang)d.searchParams.set('lang',lang);location.replace(d.toString());return true}}catch{}return false}\n"""
    s = s.replace(marker, bridge + 'style();if(checkoutReturnBridge())return;const locale=detect();', 1)
p.write_text(s)

# 2) Auth/PWA automatic checkout claim
p = Path('web/auth-runtime-v2.js')
s = p.read_text()
s = s.replace("const VERSION = '2026.08.31.1';", "const VERSION = '2026.09.01.5';")
if "const CHECKOUT_KEY = 'cs_pending_checkout';" not in s:
    s = s.replace("const CLAIM_KEY = 'cs_pending_claim';", "const CLAIM_KEY = 'cs_pending_claim';\n  const CHECKOUT_KEY = 'cs_pending_checkout';", 1)
if 'async function claimCheckoutIfReady' not in s:
    marker = '  function captureClaim() {'
    if marker not in s:
        raise SystemExit('auth captureClaim marker missing')
    block = r'''  function captureCheckout() {
    const u = new URL(location.href), sid = u.searchParams.get('session_id') || '';
    if (u.searchParams.get('checkout') === 'return' && /^cs_(?:test|live)_/.test(sid)) localStorage.setItem(CHECKOUT_KEY, sid);
    return (/^cs_(?:test|live)_/.test(sid) ? sid : '') || localStorage.getItem(CHECKOUT_KEY) || '';
  }
  function clearCheckout() {
    localStorage.removeItem(CHECKOUT_KEY);
    const u = new URL(location.href); u.searchParams.delete('checkout'); u.searchParams.delete('session_id');
    history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
  }
  async function checkoutStatus(sid) {
    const r = await fetch(`https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/checkout-status?session_id=${encodeURIComponent(sid)}`, {cache:'no-store'});
    const d = await r.json().catch(()=>({}));
    if (!r.ok && r.status !== 202) throw Error(d.error || 'checkout_status_failed');
    return d;
  }
  function checkoutPlan(itemKey) {
    return ({plan_basic:'basic',plan_pro:'pro',plan_premium:'premium'})[String(itemKey||'')] || '';
  }
  async function prepareCheckoutUi() {
    const sid = captureCheckout(); if (!sid) return null;
    try {
      const st = await checkoutStatus(sid), plan = checkoutPlan(st.item_key);
      if (plan && typeof selectedPlan !== 'undefined') {
        selectedPlan = plan;
        document.querySelectorAll('.planpick').forEach(x=>{
          const on=x.dataset.plan===plan; x.classList.toggle('active',on); x.disabled=true; x.style.opacity=on?'1':'.45';
        });
        const box=node('onboard')?.querySelector('.onbox');
        if (box && !node('checkoutPaidNotice')) {
          const n=document.createElement('div'); n.id='checkoutPaidNotice'; n.className='notice'; n.style.margin='12px 0';
          n.innerHTML=`<b>Plan ${plan.toUpperCase()} seleccionado por tu compra.</b><br>Completa los datos del negocio para activar CloudSales.`;
          box.insertBefore(n,box.querySelector('.plans'));
        }
      }
      return st;
    } catch { return null; }
  }
  async function claimCheckoutIfReady(wait=false) {
    const sid=captureCheckout();
    if (!sid || typeof session==='undefined' || !session?.access_token || typeof currentOrg==='undefined' || !currentOrg?.id) return null;
    let st=null, attempts=wait?6:1;
    for (let i=0;i<attempts;i++) {
      st=await checkoutStatus(sid).catch(()=>null);
      if (st && ['complete','claimed'].includes(String(st.status))) break;
      if (i<attempts-1) await new Promise(r=>setTimeout(r,1200));
    }
    if (!st || !['complete','claimed'].includes(String(st.status))) return null;
    try {
      const r=await direct('claim-checkout',{organization_id:currentOrg.id,session_id:sid},true);
      clearCheckout();
      if (typeof loadState==='function') await loadState();
      message('Pago confirmado. CloudSales quedó activado con tu plan.',true);
      return r;
    } catch(err) {
      const code=String(err?.message||'');
      if (code==='checkout_email_mismatch') message('El pago fue realizado con otro correo. Entra con el mismo email utilizado en Stripe.');
      else if (code!=='checkout_not_complete') message(friendly(err));
      return null;
    }
  }
  function bindCheckoutOnboarding() {
    const btn=node('createBiz'); if(!btn || btn.dataset.checkoutWrapped==='1') return;
    const original=btn.onclick; btn.dataset.checkoutWrapped='1';
    btn.onclick=async function(...args){
      const r=original?await original.apply(this,args):null;
      try {
        const c=await claimCheckoutIfReady(true);
        if(c && typeof renderAll==='function') {
          if(typeof loadState==='function') await loadState();
          if(typeof showApp==='function') showApp();
          renderAll();
        }
      } catch {}
      return r;
    };
  }

'''
    s = s.replace(marker, block + marker, 1)

old_finish = "async function finishLogin(data){saveSession(data.session);const claimed=await claimPending();await boot();if(claimed?.organization?.name)message(`Acceso activado: ${claimed.organization.name}.`,true)}"
new_finish = "async function finishLogin(data){saveSession(data.session);const claimed=await claimPending();await boot();await claimCheckoutIfReady(true);if(claimed?.organization?.name)message(`Acceso activado: ${claimed.organization.name}.`,true)}"
if old_finish in s:
    s = s.replace(old_finish, new_finish, 1)

old_bind = "captureClaim(); ensureNotice(); const forgot=ensureForgot();"
new_bind = "captureClaim(); captureCheckout(); prepareCheckoutUi(); bindCheckoutOnboarding(); ensureNotice(); const forgot=ensureForgot();"
if old_bind in s:
    s = s.replace(old_bind, new_bind, 1)

old_pending = "if(captureClaim()&&typeof session!=='undefined'&&session?.access_token)setTimeout(async()=>{try{const r=await claimPending();if(r)await boot()}catch(err){message(friendly(err))}},0);"
checkout_pending = "if(captureCheckout()&&typeof session!=='undefined'&&session?.access_token)setTimeout(async()=>{try{await prepareCheckoutUi();await claimCheckoutIfReady(true)}catch{}},0);"
if checkout_pending not in s:
    if old_pending not in s:
        raise SystemExit('auth pending claim marker missing')
    s = s.replace(old_pending, old_pending + '\n    ' + checkout_pending, 1)

if "checkout_email_mismatch:'El pago fue realizado con otro correo.'" not in s:
    s = s.replace("organization_unavailable:'El workspace no está disponible.'", "organization_unavailable:'El workspace no está disponible.', checkout_email_mismatch:'El pago fue realizado con otro correo.'")

for guard in ['cs_pending_checkout','claim-checkout','checkout-status','claimCheckoutIfReady','prepareCheckoutUi']:
    if guard not in s:
        raise SystemExit('missing auth guard '+guard)
p.write_text(s)

# 3) Rotate installed-PWA cache
p = Path('web/sw.js')
s = p.read_text().replace("const CACHE='cloudsales-pwa-2026.09.01.2';", "const CACHE='cloudsales-pwa-2026.09.01.3';")
if "cloudsales-pwa-2026.09.01.3" not in s:
    raise SystemExit('sw cache not updated')
p.write_text(s)

# 4) Canonical PWA release version
p = Path('supabase/functions/cloudflare-pwa-brand-release/index.ts')
s = p.read_text().replace('const VERSION="2026.09.01.4";', 'const VERSION="2026.09.01.5";')
if 'const VERSION="2026.09.01.5";' not in s:
    raise SystemExit('release version not updated')
p.write_text(s)
