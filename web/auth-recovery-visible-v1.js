(() => {
  'use strict';
  const ENDPOINT = 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/auth-session';
  const byId = id => document.getElementById(id);

  function showMessage(text, ok = false) {
    const el = byId('authMsg');
    if (!el) return;
    el.className = ok ? 'ok' : 'err';
    el.textContent = text;
  }

  async function requestRecovery(button) {
    const email = String(byId('email')?.value || '').trim().toLowerCase();
    if (!email) {
      showMessage('Escribe tu correo y después toca “¿Olvidaste tu contraseña?”.');
      byId('email')?.focus();
      return;
    }

    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Enviando enlace…';

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          action: 'forgot_password',
          email,
          authorize_email: true,
          email_purpose: 'password_recovery'
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'recovery_failed');

      showMessage('Te enviamos un enlace seguro para crear o cambiar tu contraseña. Revisa también Spam o Promociones.', true);
      let seconds = 40;
      button.textContent = `Reenviar en ${seconds}s`;
      const timer = setInterval(() => {
        seconds -= 1;
        if (seconds <= 0) {
          clearInterval(timer);
          button.disabled = false;
          button.textContent = original;
        } else {
          button.textContent = `Reenviar en ${seconds}s`;
        }
      }, 1000);
    } catch (error) {
      const code = String(error?.message || '');
      showMessage(code === 'recovery_wait'
        ? 'Ya se solicitó un enlace recientemente. Revisa tu correo antes de pedir otro.'
        : 'No pudimos enviar el enlace todavía. Intenta nuevamente en un momento.');
      button.disabled = false;
      button.textContent = original;
    }
  }

  function install() {
    const password = byId('password');
    const authButton = byId('authBtn');
    if (!password || !authButton) return;

    const existing = byId('forgotPassword');
    if (existing) {
      existing.style.setProperty('display', 'block', 'important');
      existing.style.setProperty('visibility', 'visible', 'important');
      existing.style.setProperty('opacity', '1', 'important');
      existing.style.setProperty('margin', '8px 0 12px', 'important');
      return;
    }

    if (byId('forgotPasswordVisible')) return;

    const button = document.createElement('button');
    button.id = 'forgotPasswordVisible';
    button.type = 'button';
    button.textContent = '¿Olvidaste tu contraseña?';
    button.setAttribute('aria-label', 'Recuperar contraseña de CloudSales');
    button.style.cssText = 'display:block!important;width:100%;margin:8px 0 12px!important;padding:7px 4px!important;border:0!important;background:transparent!important;color:#F955B6!important;font-size:13px!important;line-height:18px!important;font-weight:800!important;text-align:right!important;cursor:pointer!important;visibility:visible!important;opacity:1!important;';
    button.addEventListener('click', () => requestRecovery(button));

    const field = password.closest('.field');
    if (field?.parentNode) field.insertAdjacentElement('afterend', button);
    else authButton.parentNode?.insertBefore(button, authButton);
  }

  install();
  document.addEventListener('DOMContentLoaded', install, {once: true});
  new MutationObserver(install).observe(document.documentElement, {childList: true, subtree: true});
  setInterval(install, 1200);
})();
