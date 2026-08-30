(() => {
  'use strict';

  const VERSION = '2026.08.30.2';
  const CLAIM_KEY = 'cs_pending_claim';
  let resendTimer = null;

  function node(id) { return document.getElementById(id); }
  function message(text, ok = false, extra = '') {
    const el = node('authMsg');
    if (!el) return;
    el.className = ok ? 'ok' : 'err';
    el.innerHTML = `${text}${extra}`;
  }
  function captureClaim() {
    const token = new URL(location.href).searchParams.get('claim');
    if (token && token.length >= 32 && token.length <= 512) localStorage.setItem(CLAIM_KEY, token);
    return token || localStorage.getItem(CLAIM_KEY) || '';
  }
  function clearClaim() {
    localStorage.removeItem(CLAIM_KEY);
    const url = new URL(location.href);
    if (url.searchParams.has('claim')) {
      url.searchParams.delete('claim');
      history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
    }
  }
  async function claimPending() {
    const token = captureClaim();
    if (!token || typeof direct !== 'function' || typeof session === 'undefined' || !session?.access_token) return null;
    message('Activando tu acceso al workspace…', true);
    try {
      const result = await direct('claim-organization', { token }, true);
      if (result?.organization?.id) localStorage.setItem('cs_org', result.organization.id);
      clearClaim();
      return result;
    } catch (err) {
      const code = String(err?.message || '');
      if (['claim_invalid_or_expired', 'organization_owner_already_assigned'].includes(code)) clearClaim();
      throw err;
    }
  }

  function friendly(error) {
    const code = String(error?.message || error || '');
    const map = {
      invalid_email: 'Escribe un correo válido.',
      weak_password: 'Usa una contraseña de al menos 8 caracteres.',
      rate_limited: 'Demasiados intentos. Espera unos minutos y vuelve a intentar.',
      signup_temporarily_limited: 'El servicio de confirmación está ocupado. Espera unos minutos y vuelve a intentar.',
      confirmation_wait: 'El correo ya fue solicitado. Espera unos segundos antes de reenviarlo.',
      confirmation_delivery_failed: 'No pudimos enviar el correo de confirmación. Intenta nuevamente en unos minutos.',
      signup_unavailable: 'No se pudo completar el registro. Intenta nuevamente.',
      signin_unavailable: 'No pudimos iniciar sesión. Revisa tu email y contraseña.',
      resend_unavailable: 'No se pudo reenviar el correo ahora. Intenta nuevamente en unos minutos.',
      email_authorization_required: 'CloudSales necesita tu autorización explícita para enviar este único correo de confirmación.',
      email_authorization_audit_failed: 'No pudimos registrar de forma segura tu autorización de correo. Intenta nuevamente.',
      invalid_claim_token: 'El enlace de acceso no es válido.',
      claim_invalid_or_expired: 'Este acceso ya fue utilizado o expiró. Solicita un nuevo enlace de acceso.',
      claim_not_email_bound: 'Este enlace no cumple la política de acceso seguro de CloudSales.',
      claim_email_mismatch: 'Este enlace fue asignado a otro correo. Usa exactamente el correo autorizado para este acceso.',
      claim_signup_unavailable: 'No pudimos activar esta cuenta con el enlace privado. Intenta nuevamente.',
      claim_signup_signin_required: 'La cuenta fue creada. Toca Entrar y usa la misma contraseña para terminar de activar el workspace.',
      account_exists_use_signin: 'Esta cuenta ya existe. Entra con tu correo y contraseña para activar el acceso pendiente.',
      organization_owner_already_assigned: 'Este enlace de propietario ya no es válido porque el workspace ya tiene propietario.',
      organization_unavailable: 'El workspace no está disponible en este momento.'
    };
    return map[code] || 'No se pudo completar la operación. Intenta nuevamente.';
  }

  function ensureEmailNotice() {
    let notice = node('signupEmailNotice');
    if (notice) return notice;
    const button = node('authBtn');
    if (!button?.parentNode) return null;
    notice = document.createElement('div');
    notice.id = 'signupEmailNotice';
    notice.className = 'notice hidden';
    notice.style.margin = '10px 0 12px';
    notice.style.fontSize = '11px';
    button.parentNode.insertBefore(notice, button);
    return notice;
  }
  function syncEmailNotice() {
    const notice = ensureEmailNotice();
    if (!notice) return;
    const currentMode = typeof mode !== 'undefined' ? mode : 'signin';
    const invited = Boolean(captureClaim());
    notice.classList.toggle('hidden', currentMode !== 'signup');
    if (currentMode !== 'signup') return;
    notice.innerHTML = invited
      ? 'Este es un <b>acceso privado asignado a tu correo</b>. Elige tu contraseña y CloudSales activará tu workspace sin enviarte un correo de confirmación.'
      : 'Al tocar <b>Crear cuenta</b> autorizas a CloudSales a enviarte <b>un único correo de confirmación</b> a la dirección que escribiste. Esto no autoriza campañas, promociones ni otros correos.';
  }

  function startCooldown(seconds = 40) {
    clearTimeout(resendTimer);
    let remaining = Math.max(1, Number(seconds || 40));
    const update = () => {
      const button = node('resendConfirmation');
      if (!button) { resendTimer = null; return; }
      button.disabled = remaining > 0;
      button.textContent = remaining > 0 ? `Reenviar en ${remaining}s` : 'Reenviar correo';
      if (remaining <= 0) { resendTimer = null; return; }
      remaining -= 1;
      resendTimer = setTimeout(update, 1000);
    };
    update();
  }

  async function resend() {
    const email = node('email')?.value?.trim();
    if (!email) return message('Escribe tu correo primero.');
    const button = node('resendConfirmation');
    if (button) { button.disabled = true; button.textContent = 'Enviando…'; }
    try {
      const result = await direct('auth-session', {
        action: 'resend_confirmation',
        email,
        authorize_email: true,
        email_purpose: 'signup_confirmation_resend'
      }, false);
      if (result?.message_code === 'account_already_confirmed') {
        existingAccount('Esta cuenta ya está confirmada. Entra con tu correo y contraseña.');
        return;
      }
      message('Correo de confirmación reenviado con tu autorización. Revisa también Spam o Promociones.', true, ` <button id="goSigninAfterResend" class="btn small" type="button" style="margin-left:8px">Ir a Entrar</button>`);
      node('goSigninAfterResend')?.addEventListener('click', () => setMode('signin'));
    } catch (err) {
      if (String(err?.message || '') === 'confirmation_wait') confirmationActions('La cuenta ya está creada. El correo de confirmación se solicitó recientemente.', 40);
      else message(friendly(err));
    } finally {
      if (button && !button.disabled) button.textContent = 'Reenviar correo';
    }
  }

  function confirmationActions(text, cooldown = 0) {
    message(text, true, ` <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button id="resendConfirmation" class="btn small" type="button">Autorizar y reenviar correo</button><button id="goSignin" class="btn small" type="button">Ya confirmé · Entrar</button></div><div style="margin-top:7px;font-size:10px;color:#aaa">Reenviar autoriza solamente ese correo de confirmación.</div>`);
    node('resendConfirmation')?.addEventListener('click', resend);
    node('goSignin')?.addEventListener('click', () => setMode('signin'));
    if (cooldown > 0) startCooldown(cooldown);
  }

  function existingAccount(text = 'Esta cuenta ya existe. Entra con tu correo y contraseña.') {
    message(text, true, ` <button id="goSigninExisting" class="btn small" type="button" style="margin-left:8px">Entrar</button>`);
    node('goSigninExisting')?.addEventListener('click', () => setMode('signin'));
    const btn = node('authBtn');
    if (btn) { btn.disabled = false; btn.textContent = 'Crear cuenta'; }
  }

  async function finishLogin(data) {
    saveSession(data.session);
    const claimed = await claimPending();
    await boot();
    if (claimed?.organization?.name) message(`Acceso activado: ${claimed.organization.name}.`, true);
  }

  function bind() {
    const button = node('authBtn');
    if (!button || typeof direct !== 'function') return false;
    captureClaim();
    ensureEmailNotice();
    syncEmailNotice();

    button.onclick = async () => {
      message('');
      const currentMode = typeof mode !== 'undefined' ? mode : 'signin';
      const email = node('email')?.value?.trim() || '';
      const password = node('password')?.value || '';
      const fullName = node('fullName')?.value?.trim() || '';
      const claimToken = currentMode === 'signup' ? captureClaim() : '';
      if (!email) return message('Escribe tu correo.');
      if (!password) return message('Escribe tu contraseña.');
      if (currentMode === 'signup' && password.length < 8) return message('Usa una contraseña de al menos 8 caracteres.');

      button.disabled = true;
      const original = button.textContent;
      button.textContent = currentMode === 'signin' ? 'Entrando…' : 'Creando cuenta…';
      try {
        const payload = {
          action: currentMode === 'signin' ? 'sign_in' : (claimToken ? 'claim_sign_up' : 'sign_up'),
          email,
          password,
          full_name: fullName
        };
        if (currentMode === 'signup' && claimToken) payload.claim_token = claimToken;
        if (currentMode === 'signup' && !claimToken) {
          payload.authorize_email = true;
          payload.email_purpose = 'signup_confirmation';
        }
        const data = await direct('auth-session', payload, false);
        if (data.session) { await finishLogin(data); return; }
        if (currentMode === 'signup' && data.message_code === 'account_exists') { existingAccount(); return; }
        if (currentMode === 'signup' && data.confirmation_required) {
          button.disabled = true;
          button.textContent = 'Cuenta creada';
          if (data.message_code === 'confirmation_pending_wait') confirmationActions('La cuenta ya está creada y el correo de confirmación ya fue enviado. Revisa tu bandeja, Spam o Promociones.', Number(data.retry_after_seconds || 40));
          else if (data.message_code === 'confirmation_delivery_failed_pending') confirmationActions('La cuenta quedó creada, pero el correo no pudo enviarse. Espera un momento y toca Reenviar correo.', 40);
          else if (data.message_code === 'account_exists_or_confirmation_pending') confirmationActions('La cuenta ya existe o está pendiente de confirmación. Revisa tu correo o autoriza un reenvío si lo necesitas.', 40);
          else confirmationActions('Cuenta creada. Te enviamos el único correo de confirmación que autorizaste. Confirma tu email y después entra a CloudSales.', 40);
          return;
        }
      } catch (err) {
        const code = String(err?.message || '');
        if (code === 'account_exists_use_signin') existingAccount('Esta cuenta ya existe. Entra con la misma cuenta para activar este acceso privado.');
        else if (code === 'claim_signup_signin_required') existingAccount('La cuenta quedó creada. Entra con el mismo correo y contraseña para terminar de activar el workspace.');
        else message(friendly(err));
      } finally {
        if (!button.disabled || currentMode === 'signin') { button.disabled = false; button.textContent = original; }
      }
    };

    [node('tabIn'), node('tabUp')].forEach(tab => tab?.addEventListener('click', () => {
      clearTimeout(resendTimer); resendTimer = null;
      const btn = node('authBtn'); if (btn) btn.disabled = false;
      message('');
      setTimeout(syncEmailNotice, 0);
    }));

    if (captureClaim() && typeof session !== 'undefined' && session?.access_token) {
      setTimeout(async () => {
        try { const result = await claimPending(); if (result) await boot(); }
        catch (err) { message(friendly(err)); }
      }, 0);
    }
    document.documentElement.dataset.authRuntime = VERSION;
    return true;
  }

  let tries = 0;
  function attemptBind() {
    tries += 1;
    if (bind() || tries > 20) return;
    setTimeout(attemptBind, 100);
  }
  attemptBind();
})();