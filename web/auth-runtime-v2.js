(() => {
  'use strict';

  const VERSION = '2026.08.31.1';
  const CLAIM_KEY = 'cs_pending_claim';
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
      organization_owner_already_assigned:'Este enlace de propietario ya no es válido.', organization_unavailable:'El workspace no está disponible.'
    };
    return map[code] || 'No se pudo completar la operación. Intenta nuevamente.';
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
  async function finishLogin(data){saveSession(data.session);const claimed=await claimPending();await boot();if(claimed?.organization?.name)message(`Acceso activado: ${claimed.organization.name}.`,true)}

  function bind(){
    const button=node('authBtn'); if(!button||typeof direct!=='function')return false;
    captureClaim(); ensureNotice(); const forgot=ensureForgot(); if(forgot)forgot.onclick=forgotPassword;
    if(enterRecovery()){
      button.onclick=doReset; document.documentElement.dataset.authRuntime=VERSION; return true;
    }
    syncUi();
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
    document.documentElement.dataset.authRuntime=VERSION; return true;
  }
  let tries=0;function attempt(){tries++;if(bind()||tries>20)return;setTimeout(attempt,100)}attempt();
})();