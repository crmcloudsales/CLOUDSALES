(() => {
  'use strict';

  const VERSION = '2026.08.28.16';

  function node(id) { return document.getElementById(id); }
  function message(text, ok = false, extra = '') {
    const el = node('authMsg');
    if (!el) return;
    el.className = ok ? 'ok' : 'err';
    el.innerHTML = `${text}${extra}`;
  }

  function friendly(error) {
    const code = String(error?.message || error || '');
    const map = {
      invalid_email: 'Escribe un correo válido.',
      weak_password: 'Usa una contraseña de al menos 8 caracteres.',
      rate_limited: 'Demasiados intentos. Espera unos minutos y vuelve a intentar.',
      confirmation_delivery_failed: 'La cuenta se creó, pero no pudimos enviar el correo de confirmación. Toca Reenviar correo.',
      signup_unavailable: 'No se pudo completar el registro. Si ya comenzaste el registro, revisa tu correo o toca Reenviar correo.',
      signin_unavailable: 'No pudimos iniciar sesión. Revisa tu email y contraseña, y confirma tu correo si la cuenta es nueva.',
      resend_unavailable: 'No se pudo reenviar el correo ahora. Intenta nuevamente en unos minutos.'
    };
    return map[code] || 'No se pudo completar la operación. Intenta nuevamente.';
  }

  async function resend() {
    const email = node('email')?.value?.trim();
    if (!email) return message('Escribe tu correo primero.');
    const button = node('resendConfirmation');
    if (button) { button.disabled = true; button.textContent = 'Enviando…'; }
    try {
      await direct('auth-session', { action: 'resend_confirmation', email }, false);
      message('Correo de confirmación reenviado. Revisa también Spam o Promociones.', true, ` <button id="goSigninAfterResend" class="btn small" type="button" style="margin-left:8px">Ir a Entrar</button>`);
      node('goSigninAfterResend')?.addEventListener('click', () => setMode('signin'));
    } catch (err) {
      message(friendly(err));
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Reenviar correo'; }
    }
  }

  function confirmationActions(text) {
    message(text, true, ` <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button id="resendConfirmation" class="btn small" type="button">Reenviar correo</button><button id="goSignin" class="btn small" type="button">Ya confirmé · Entrar</button></div>`);
    node('resendConfirmation')?.addEventListener('click', resend);
    node('goSignin')?.addEventListener('click', () => setMode('signin'));
  }

  function bind() {
    const button = node('authBtn');
    if (!button || typeof direct !== 'function') return false;

    button.onclick = async () => {
      message('');
      const currentMode = typeof mode !== 'undefined' ? mode : 'signin';
      const email = node('email')?.value?.trim() || '';
      const password = node('password')?.value || '';
      const fullName = node('fullName')?.value?.trim() || '';

      if (!email) return message('Escribe tu correo.');
      if (!password) return message('Escribe tu contraseña.');
      if (currentMode === 'signup' && password.length < 8) return message('Usa una contraseña de al menos 8 caracteres.');

      button.disabled = true;
      const original = button.textContent;
      button.textContent = currentMode === 'signin' ? 'Entrando…' : 'Creando cuenta…';

      try {
        const data = await direct('auth-session', {
          action: currentMode === 'signin' ? 'sign_in' : 'sign_up',
          email,
          password,
          full_name: fullName
        }, false);

        if (data.session) {
          saveSession(data.session);
          await boot();
          return;
        }

        if (currentMode === 'signup' && data.confirmation_required) {
          button.disabled = true;
          button.textContent = 'Cuenta creada';
          if (data.message_code === 'account_exists_or_confirmation_pending') {
            confirmationActions(data.resent
              ? 'La cuenta ya existe o está pendiente de confirmación. Reenviamos el correo; revisa tu bandeja.'
              : 'La cuenta ya existe o está pendiente de confirmación. Revisa tu correo o reenvía la confirmación.');
          } else {
            confirmationActions('Cuenta creada. Revisa tu correo para confirmar y después entra a CloudSales.');
          }
          return;
        }
      } catch (err) {
        message(friendly(err));
      } finally {
        if (!button.disabled || currentMode === 'signin') {
          button.disabled = false;
          button.textContent = original;
        }
      }
    };

    const tabIn = node('tabIn');
    const tabUp = node('tabUp');
    [tabIn, tabUp].forEach(tab => tab?.addEventListener('click', () => {
      const btn = node('authBtn');
      if (btn) btn.disabled = false;
      message('');
    }));

    document.documentElement.dataset.authRuntime = VERSION;
    return true;
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    if (bind() || tries > 20) clearInterval(timer);
  }, 100);
})();