(() => {
  'use strict';

  const VERSION = '2026.09.02.5';
  const CLAIM_KEY = 'cs_pending_claim';
  const CHECKOUT_KEY = 'cs_pending_checkout';

  function ensureTrialUi(){ /* canonical: paid access only; zero paid subscriptions */ }

  let resendTimer = null;
  let recoveryMode = false;

  const node = id => document.getElementById(id);
  function message(text, ok = false, extra = '') {
    const el = node('authMsg'); if (!el) return;
    el.className = ok ? 'ok' : 'err'; el.innerHTML = `${text}${extra}`;
  }
  function friendly(error) {
    const code = String(error?.message || error || '');
    const map = {
      invalid_email:'Escribe un correo válido.', weak_password:'Usa una contraseña de al menos 8 caracteres.',
      signin_unavailable:'No pudimos iniciar sesión. Revisa tu email y contraseña.', rate_limited:'Demasiados intentos. Espera unos minutos y vuelve a intentar.',
      recovery_wait:'Ya solicitaste un enlace recientemente. Revisa tu correo antes de pedir otro.', recovery_temporarily_unavailable:'El correo de recuperación todavía no está disponible. Intenta nuevamente en unos minutos.',
      invalid_recovery_session:'El enlace de recuperación no es válido.', invalid_or_expired_recovery_link:'El enlace de recuperación expiró o ya fue utilizado. Solicita uno nuevo.', password_update_failed:'No pudimos cambiar la contraseña. Solicita un nuevo enlace e intenta otra vez.',
      email_authorization_required:'CloudSales necesita tu autorización para enviar este único correo.', email_authorization_audit_failed:'No pudimos registrar de forma segura la autorización del correo.',
      signup_temporarily_limited:'El servicio de confirmación está ocupado. Intenta nuevamente en unos minutos.', signup_unavailable:'No se pudo completar el registro.',
      confirmation_wait:'El correo ya fue solicitado. Espera antes de reenviarlo.', resend_unavailable:'No se pudo reenviar el correo ahora.',
      invalid_claim_token:'El enlace de acceso no es válido.', claim_invalid_or_expired:'Este acceso ya fue utilizado o expiró.', claim_not_email_bound:'Este enlace no cumple la política de acceso seguro.',
      claim_email_mismatch:'Este enlace fue asignado a otro correo.', claim_signup_unavailable:'No pudimos activar esta cuenta con el enlace privado.',
      claim_signup_signin_required:'La cuenta fue creada. Entra con el mismo correo y contraseña.', account_exists_use_signin:'Esta cuenta ya existe. Entra con tu correo y contraseña.',
      organization_owner_already_assigned:'Este enlace de propietario ya no es válido.', organization_unavailable:'El workspace no está disponible.', checkout_email_mismatch:'El pago fue realizado con otro correo.'
    };
    return map[code] || 'No se pudo completar la operación. Intenta nuevamente.';
  }

  function captureCheckout() {
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
          n.innerHTML=`<b>Plan ${plan.toUpperCase()} seleccionado para tu suscripción de pago.</b><br>Completa los datos del negocio para configurar CloudSales.`;
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
      message('Tu suscripción pagada quedó activada.',true);
      return r;
    } catch(err) {
      const code=String(err?.message||'');
      if (code==='checkout_email_mismatch') message('El pago fue realizado con otro correo. Entra con el mismo email utilizado para pagar.');
      else if (code!=='checkout_not_complete') message(friendly(err));
      return null;
    }
  }
  function bindCheckoutOnboarding() {
    const btn=node('createBiz'); if(!btn || btn.dataset.checkoutWrapped==='1') return;
    const original=btn.onclick; btn.dataset.checkoutWrapped='1';
    btn.onclick=async function(...args){
      try{await prepareCheckoutUi()}catch{}
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

  function captureClaim() {
    const token = new URL(location.href).searchParams.get('claim');
    if (token && token.length >= 32 && token.length <= 512) localStorage.setItem(CLAIM_KEY, token);
    return token || localStorage.getItem(CLAIM_KEY) || '';
  }
  function clearClaim() {
    localStorage.removeItem(CLAIM_KEY);
    const url = new URL(location.href); url.searchParams.delete('claim');
    history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
  }
  async function claimPending() {
    const token = captureClaim();
    if (!token || typeof direct !== 'function' || typeof session === 'undefined' || !session?.access_token) return null;
    message('Activando tu acceso al workspace…', true);
    try {
      const result = await direct('claim-organization', { token }, true);
      if (result?.organization?.id) localStorage.setItem('cs_org', result.organization.id);
      clearClaim(); return result;
    } catch (err) {
      if (['claim_invalid_or_expired','organization_owner_already_assigned'].includes(String(err?.message || ''))) clearClaim();
      throw err;
    }
  }

  function ensureNotice() {
    let el = node('signupEmailNotice'); if (el) return el;
    const btn = node('authBtn'); if (!btn?.parentNode) return null;
    el = document.createElement('div'); el.id='signupEmailNotice'; el.className='notice hidden'; el.style.cssText='margin:10px 0 12px;font-size:11px';
    btn.parentNode.insertBefore(el, btn); return el;
  }
  function ensureGoogleAuth() {
    let wrap=node('googleAuthWrap'); if(wrap) return wrap;
    const tabs=node('tabIn')?.parentElement; if(!tabs?.parentNode) return null;
    wrap=document.createElement('div'); wrap.id='googleAuthWrap'; wrap.style.cssText='display:grid;gap:10px;margin:0 0 16px';
    wrap.innerHTML='<button id="googleAuthBtn" type="button" class="btn block" style="display:flex;align-items:center;justify-content:center;gap:10px;background:#fff;color:#1f1f1f;border:1px solid #dadce0;font-weight:850"><span aria-hidden="true" style="font-size:18px;font-weight:900;color:#4285f4">G</span><span id="googleAuthLabel">Continuar con Google</span></button><button id="microsoftAuthBtn" type="button" class="btn block" style="display:flex;align-items:center;justify-content:center;gap:10px;background:#fff;color:#1f1f1f;border:1px solid #dadce0;font-weight:850"><span aria-hidden="true" style="display:grid;grid-template-columns:repeat(2,7px);grid-template-rows:repeat(2,7px);gap:2px;width:16px;height:16px"><i style="background:#f25022"></i><i style="background:#7fba00"></i><i style="background:#00a4ef"></i><i style="background:#ffb900"></i></span><span id="microsoftAuthLabel">Continuar con Microsoft</span></button><div style="display:flex;align-items:center;gap:10px;color:#777;font-size:10px"><span style="height:1px;background:#2a2a38;flex:1"></span><span>o usa tu email</span><span style="height:1px;background:#2a2a38;flex:1"></span></div>';
    tabs.insertAdjacentElement('afterend',wrap); node('googleAuthBtn').onclick=startGoogleAuth; node('microsoftAuthBtn').onclick=startMicrosoftAuth; return wrap;
  }
  function consumeOAuthError(){
    const h=new URLSearchParams(location.hash.replace(/^#/,''));
    const code=h.get('error_code')||h.get('error')||'';
    const desc=h.get('error_description')||'';
    if(!code) return false;
    history.replaceState(null,'',location.pathname+location.search);
    const text=String(desc||code).replace(/\+/g,' ');
    if(/cancel|access_denied/i.test(text)) message('Inicio de sesión cancelado. Puedes elegir otra cuenta e intentarlo nuevamente.');
    else if(/expired|otp_expired/i.test(text)) message('El enlace de acceso expiró. Solicita uno nuevo e inténtalo nuevamente.');
    else message('No pudimos completar el acceso con ese proveedor. Elige otra cuenta o intenta nuevamente.');
    return true;
  }
  function oauthSessionFromHash(){
    const h=new URLSearchParams(location.hash.replace(/^#/,''));
    if(!h.get('access_token')||h.get('type')==='recovery') return null;
    return {access_token:h.get('access_token'),refresh_token:h.get('refresh_token')||'',token_type:h.get('token_type')||'bearer',expires_in:Number(h.get('expires_in')||3600),expires_at:Number(h.get('expires_at')||0),provider_token:h.get('provider_token')||null,provider_refresh_token:h.get('provider_refresh_token')||null};
  }
  async function consumeGoogleCallback(){
    const s=oauthSessionFromHash(); if(!s) return false;
    const intent=localStorage.getItem('cs_oauth_intent')||'signin';
    localStorage.removeItem('cs_oauth_intent');
    try{
      history.replaceState(null,'',location.pathname+location.search);
      message('Acceso seguro confirmado. Preparando CloudSales…',true);
      await finishLogin({session:s});
      if(intent==='signin' && (typeof currentOrg==='undefined' || !currentOrg?.id)){
        try{clearSession?.()}catch{}
        try{if(typeof showAuth==='function')showAuth()}catch{}
        message('Esta cuenta no existe, intenta con otro método.');
        return false;
      }
      return true;
    }catch(err){message(friendly(err));return false}
  }
  async function oauthProviderReady(provider){
    try{
      const r=await fetch('https://fkahaqprzgcimgyathqx.supabase.co/auth/v1/settings',{cache:'no-store',headers:{Accept:'application/json'}});
      if(!r.ok)return null;
      const d=await r.json();
      return Boolean(d?.external?.[provider]);
    }catch{return null}
  }
  function resetOAuthButton(kind){
    const isMs=kind==='azure',btn=node(isMs?'microsoftAuthBtn':'googleAuthBtn'),label=node(isMs?'microsoftAuthLabel':'googleAuthLabel');
    if(btn)btn.disabled=false;if(label)label.textContent=isMs?'Continuar con Microsoft':'Continuar con Google';
  }
  async function startOAuth(kind){
    const currentMode=typeof mode!=='undefined'?mode:'signin';
    localStorage.setItem('cs_oauth_intent',currentMode==='signup'?'signup':'signin');
    const isMs=kind==='azure',btn=node(isMs?'microsoftAuthBtn':'googleAuthBtn'),label=node(isMs?'microsoftAuthLabel':'googleAuthLabel');
    if(btn)btn.disabled=true;if(label)label.textContent=isMs?'Comprobando Microsoft…':'Comprobando Google…';
    const ready=await oauthProviderReady(kind);
    if(ready===false){
      resetOAuthButton(kind);
      message(`${isMs?'Microsoft':'Google'} todavía no está habilitado para acceso en CloudSales. Puedes entrar con email mientras terminamos la conexión.`,false);
      return;
    }
    if(label)label.textContent=isMs?'Abriendo Microsoft…':'Abriendo Google…';
    const redirect=`${location.origin}${location.pathname}${location.search}`;
    const url=isMs
      ?`https://fkahaqprzgcimgyathqx.supabase.co/auth/v1/authorize?provider=azure&redirect_to=${encodeURIComponent(redirect)}&scopes=${encodeURIComponent('email')}&prompt=select_account`
      :`https://fkahaqprzgcimgyathqx.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}&prompt=select_account`;
    location.assign(url);
  }
  function startGoogleAuth(){return startOAuth('google')}
  function startMicrosoftAuth(){return startOAuth('azure')}
  function ensureForgot() {
    let btn = node('forgotPassword'); if (btn) return btn;
    const pass = node('password'); const field = pass?.closest('.field'); if (!field?.parentNode) return null;
    btn = document.createElement('button'); btn.id='forgotPassword'; btn.type='button'; btn.textContent='¿Olvidaste tu contraseña?';
    btn.style.cssText='display:block;margin:-4px 0 14px auto;border:0;background:transparent;color:#c78cff;font-size:12px;font-weight:800;padding:3px 0';
    field.insertAdjacentElement('afterend', btn); return btn;
  }
  function syncUi() {
    const notice = ensureNotice(), forgot = ensureForgot();
    const currentMode = typeof mode !== 'undefined' ? mode : 'signin';
    if (forgot) forgot.style.display = (!recoveryMode && currentMode === 'signin') ? 'block' : 'none';
    if (!notice) return;
    if (recoveryMode) { notice.classList.remove('hidden'); notice.innerHTML='<b>Elige una contraseña nueva.</b> Debe tener al menos 8 caracteres.'; return; }
    notice.classList.toggle('hidden', currentMode !== 'signup');
    if (currentMode === 'signup') notice.innerHTML = captureClaim()
      ? 'Este es un <b>acceso privado asignado a tu correo</b>. Elige tu contraseña y CloudSales activará tu workspace sin enviar confirmación.'
      : 'Al tocar <b>Crear cuenta</b> autorizas un único correo de confirmación. Esto no autoriza marketing.';
  }

  async function forgotPassword() {
    const email = node('email')?.value?.trim() || '';
    if (!email) return message('Escribe tu correo y después toca “¿Olvidaste tu contraseña?”.');
    const btn = node('forgotPassword'); if (btn) { btn.disabled=true; btn.textContent='Enviando…'; }
    try {
      await direct('auth-session',{action:'forgot_password',email,authorize_email:true,email_purpose:'password_recovery'},false);
      message('Si la cuenta existe, recibirás un correo de CloudSales con un botón seguro para cambiar tu contraseña. Revisa también Spam o Promociones.',true);
    } catch (err) { message(friendly(err)); }
    finally { if (btn) { btn.disabled=false; btn.textContent='¿Olvidaste tu contraseña?'; } }
  }

  function recoveryInfo() {
    const url = new URL(location.href);
    const branded = url.searchParams.get('reset_token') || '';
    if (branded) return { token: branded, kind: 'branded' };
    const h = new URLSearchParams(location.hash.replace(/^#/,''));
    const legacy = h.get('type') === 'recovery' ? (h.get('access_token') || '') : '';
    return legacy ? { token: legacy, kind: 'legacy' } : { token:'', kind:'' };
  }
  function leaveRecovery() {
    recoveryMode=false;
    const url=new URL(location.href); url.searchParams.delete('reset_token'); url.searchParams.delete('reset');
    history.replaceState(null,'',url.pathname+(url.search||''));
    node('tabIn')?.parentElement?.classList.remove('hidden');
    node('email')?.closest('.field')?.classList.remove('hidden');
    node('nameField')?.classList.add('hidden');
    const pass=node('password'); if(pass){pass.value='';pass.autocomplete='current-password';const label=pass.closest('.field')?.querySelector('label');if(label)label.textContent='Contraseña';}
    node('resetConfirmField')?.remove(); if(typeof setMode==='function')setMode('signin'); syncUi(); message('Contraseña actualizada. Ahora entra con tu nueva contraseña.',true);
  }
  function enterRecovery() {
    const info=recoveryInfo(); if(!info.token) return false;
    recoveryMode=true;
    node('tabIn')?.parentElement?.classList.add('hidden'); node('email')?.closest('.field')?.classList.add('hidden'); node('nameField')?.classList.add('hidden');
    const pass=node('password'); if(!pass) return false; pass.value=''; pass.autocomplete='new-password'; const label=pass.closest('.field')?.querySelector('label'); if(label)label.textContent='Nueva contraseña';
    if(!node('resetConfirmField')){const f=document.createElement('div');f.id='resetConfirmField';f.className='field';f.innerHTML='<label>Confirmar nueva contraseña</label><input id="resetConfirm" type="password" autocomplete="new-password">';pass.closest('.field')?.insertAdjacentElement('afterend',f);}
    const btn=node('authBtn'); if(btn){btn.disabled=false;btn.textContent='Cambiar contraseña';}
    syncUi(); message('Define tu nueva contraseña. Este enlace es de un solo uso.',true); return true;
  }
  async function doReset() {
    const info=recoveryInfo(),p=node('password')?.value||'',c=node('resetConfirm')?.value||'';
    if(!info.token)return message('El enlace de recuperación no es válido.'); if(p.length<8)return message('Usa una contraseña de al menos 8 caracteres.'); if(p!==c)return message('Las contraseñas no coinciden.');
    const btn=node('authBtn'); btn.disabled=true; btn.textContent='Guardando…';
    try {
      const payload={action:'reset_password',password:p};
      if(info.kind==='branded') payload.recovery_token=info.token; else payload.access_token=info.token;
      await direct('auth-session',payload,false); clearSession?.(); leaveRecovery();
    } catch(err){message(friendly(err));btn.disabled=false;btn.textContent='Cambiar contraseña';}
  }

  function startCooldown(seconds=40){clearTimeout(resendTimer);let n=seconds;const tick=()=>{const b=node('resendConfirmation');if(!b)return;b.disabled=n>0;b.textContent=n>0?`Reenviar en ${n}s`:'Reenviar correo';if(n-- >0)resendTimer=setTimeout(tick,1000)};tick()}
  async function resend(){const email=node('email')?.value?.trim();if(!email)return message('Escribe tu correo primero.');try{await direct('auth-session',{action:'resend_confirmation',email,authorize_email:true,email_purpose:'signup_confirmation_resend'},false);message('Correo de confirmación reenviado. Revisa Spam o Promociones.',true)}catch(err){message(friendly(err))}}
  function confirmationActions(text){message(text,true,' <div style="margin-top:10px"><button id="resendConfirmation" class="btn small" type="button">Autorizar y reenviar correo</button></div>');node('resendConfirmation')?.addEventListener('click',resend);startCooldown(40)}
  function existingAccount(text='Esta cuenta ya existe. Entra con tu correo y contraseña.'){message(text,true);if(typeof setMode==='function')setMode('signin')}
  async function finishLogin(data){saveSession(data.session);const claimed=await claimPending();await boot();await claimCheckoutIfReady(true);if(claimed?.organization?.name)message(`Acceso activado: ${claimed.organization.name}.`,true)}

  window.addEventListener('cloudsales:locale',ensureTrialUi);

  function bind(){
    const button=node('authBtn'); if(!button||typeof direct!=='function')return false;
    captureClaim(); captureCheckout(); prepareCheckoutUi(); bindCheckoutOnboarding(); ensureNotice(); ensureTrialUi(); ensureGoogleAuth(); const forgot=ensureForgot(); if(forgot)forgot.onclick=forgotPassword;
    if(enterRecovery()){
      button.onclick=doReset; document.documentElement.dataset.authRuntime=VERSION; return true;
    }
    syncUi();
    if(consumeOAuthError()){document.documentElement.dataset.authRuntime=VERSION;return true;}
    if(oauthSessionFromHash()){consumeGoogleCallback();document.documentElement.dataset.authRuntime=VERSION;return true;}
    button.onclick=async()=>{
      message(''); const currentMode=typeof mode!=='undefined'?mode:'signin',email=node('email')?.value?.trim()||'',password=node('password')?.value||'',fullName=node('fullName')?.value?.trim()||'',claimToken=currentMode==='signup'?captureClaim():'';
      if(!email)return message('Escribe tu correo.'); if(!password)return message('Escribe tu contraseña.'); if(currentMode==='signup'&&password.length<8)return message('Usa una contraseña de al menos 8 caracteres.');
      button.disabled=true;const original=button.textContent;button.textContent=currentMode==='signin'?'Entrando…':'Creando cuenta…';
      try{
        const payload={action:currentMode==='signin'?'sign_in':(claimToken?'claim_sign_up':'sign_up'),email,password,full_name:fullName};
        if(currentMode==='signup'&&claimToken)payload.claim_token=claimToken;
        if(currentMode==='signup'&&!claimToken){payload.authorize_email=true;payload.email_purpose='signup_confirmation';}
        const data=await direct('auth-session',payload,false);
        if(data.session){await finishLogin(data);return}
        if(currentMode==='signup'&&data.confirmation_required){button.textContent='Cuenta creada';confirmationActions('Cuenta creada. Confirma tu email y después entra a CloudSales.');return}
      }catch(err){const code=String(err?.message||'');if(code==='account_exists_use_signin'||code==='claim_signup_signin_required')existingAccount();else message(friendly(err))}
      finally{if(currentMode==='signin'||!button.disabled){button.disabled=false;button.textContent=original}}
    };
    [node('tabIn'),node('tabUp')].forEach(tab=>tab?.addEventListener('click',()=>{clearTimeout(resendTimer);resendTimer=null;const b=node('authBtn');if(b)b.disabled=false;message('');setTimeout(syncUi,0)}));
    if(captureClaim()&&typeof session!=='undefined'&&session?.access_token)setTimeout(async()=>{try{const r=await claimPending();if(r)await boot()}catch(err){message(friendly(err))}},0);
    if(captureCheckout()&&typeof session!=='undefined'&&session?.access_token)setTimeout(async()=>{try{await prepareCheckoutUi();await claimCheckoutIfReady(true)}catch{}},0);
    document.documentElement.dataset.authRuntime=VERSION; return true;
  }
  let tries=0;function attempt(){tries++;if(bind()||tries>20)return;setTimeout(attempt,100)}attempt();
})();