(() => {
  'use strict';

  const INSTALL_TARGETS = new Set(['ios', 'android', 'desktop']);
  const requestedTarget = new URLSearchParams(window.location.search).get('install');
  if (!INSTALL_TARGETS.has(requestedTarget)) return;

  const COPY = {
    title: 'Instala CloudSales en tu dispositivo',
    iosTitle: 'Instala CloudSales en tu iPhone o iPad',
    androidBody: 'Toca Instalar CloudSales para añadir la aplicación a tu pantalla de inicio.',
    desktopBody: 'Toca Instalar CloudSales para abrirla como una aplicación independiente en tu computadora.',
    iosBody: 'CloudSales se instala directamente desde Safari:',
    iosSteps: ['Toca Compartir.', 'Selecciona Agregar a pantalla de inicio.', 'Activa Abrir como app web y toca Agregar.'],
    iosBrowser: 'Si estás en otro navegador, abre esta página en Safari para instalar CloudSales.',
    androidFallback: 'Si no aparece la ventana, abre el menú ⋮ del navegador y elige Instalar aplicación o Agregar a pantalla principal.',
    desktopFallback: 'Usa el icono Instalar de la barra de direcciones o el menú de Chrome o Edge y selecciona Instalar CloudSales.',
    install: 'Instalar CloudSales',
    continue: 'Continuar en CloudSales',
    already: 'CloudSales ya está instalada en este dispositivo.',
    success: 'CloudSales quedó instalada correctamente.'
  };

  let deferredPrompt = null;
  let overlay = null;
  let titleNode = null;
  let bodyNode = null;
  let primaryButton = null;
  let fallbackVisible = false;

  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isSafariOnIOS = () => {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return ios && /WebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua);
  };

  function ensureStyles() {
    if (document.getElementById('cloudsales-install-styles')) return;
    const style = document.createElement('style');
    style.id = 'cloudsales-install-styles';
    style.textContent = `.install-overlay{position:fixed;inset:0;z-index:9999;display:none;place-items:center;padding:22px;background:rgba(5,5,9,.93);backdrop-filter:blur(14px)}.install-overlay.visible{display:grid}.install-card{position:relative;width:min(620px,100%);border:1px solid #343443;border-radius:30px;background:linear-gradient(180deg,#15151f,#0d0d14);padding:38px 34px 32px;box-shadow:0 45px 140px #000c;text-align:center}.install-close{position:absolute;right:20px;top:20px;width:54px;height:54px;border:0;border-radius:50%;background:#20202b;color:#fff;font-size:32px}.install-mark{display:block;width:82px;height:82px;object-fit:contain;border-radius:18px;margin:14px auto 24px}.install-card h2{font-size:clamp(34px,6vw,48px);line-height:1.05;letter-spacing:-.045em;margin:0 0 22px}.install-body{color:#aaa9b8;font-size:18px;line-height:1.55;text-align:left;max-width:500px;margin:0 auto}.install-body p{margin:0 0 14px}.install-body ol{padding-left:24px}.install-note{font-size:14px;color:#858596}.install-primary{width:100%;border:0;border-radius:999px;padding:17px 20px;margin-top:24px;background:linear-gradient(135deg,#ff2b9b,#bd2cff);color:#fff;font-weight:900;font-size:19px}.install-open{overflow:hidden}@media(max-width:560px){.install-card{padding:34px 22px 25px;border-radius:26px}.install-card h2{font-size:36px}.install-body{font-size:16px}}`;
    document.head.appendChild(style);
  }

  function createOverlay() {
    ensureStyles();
    overlay = document.createElement('div');
    overlay.className = 'install-overlay';
    overlay.innerHTML = `<section class="install-card" role="dialog" aria-modal="true" aria-labelledby="installTitle"><button class="install-close" type="button" aria-label="Cerrar">×</button><img class="install-mark" src="/icon-192.png" alt="CloudSales"><h2 id="installTitle"></h2><div class="install-body"></div><button class="install-primary" type="button"></button></section>`;
    document.body.appendChild(overlay);
    titleNode = overlay.querySelector('#installTitle');
    bodyNode = overlay.querySelector('.install-body');
    primaryButton = overlay.querySelector('.install-primary');
    overlay.querySelector('.install-close').addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    primaryButton.addEventListener('click', handlePrimary);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  }

  function close() {
    overlay?.classList.remove('visible');
    document.body.classList.remove('install-open');
  }

  function show() {
    if (!overlay) createOverlay();
    render();
    overlay.classList.add('visible');
    document.body.classList.add('install-open');
    setTimeout(() => primaryButton?.focus(), 50);
  }

  function render() {
    primaryButton.hidden = false;
    if (isStandalone()) {
      titleNode.textContent = COPY.title;
      bodyNode.innerHTML = `<p>${COPY.already}</p>`;
      primaryButton.textContent = COPY.continue;
      return;
    }
    if (requestedTarget === 'ios') {
      titleNode.textContent = COPY.iosTitle;
      bodyNode.innerHTML = `<p>${COPY.iosBody}</p><ol>${COPY.iosSteps.map(step => `<li>${step}</li>`).join('')}</ol>${isSafariOnIOS() ? '' : `<p class="install-note">${COPY.iosBrowser}</p>`}`;
      primaryButton.textContent = COPY.continue;
      return;
    }
    titleNode.textContent = COPY.title;
    const standardBody = requestedTarget === 'android' ? COPY.androidBody : COPY.desktopBody;
    const fallback = requestedTarget === 'android' ? COPY.androidFallback : COPY.desktopFallback;
    bodyNode.innerHTML = `<p>${fallbackVisible ? fallback : standardBody}</p>`;
    primaryButton.textContent = fallbackVisible ? COPY.continue : COPY.install;
  }

  async function handlePrimary() {
    if (isStandalone() || requestedTarget === 'ios' || fallbackVisible) {
      close();
      return;
    }
    if (!deferredPrompt) {
      fallbackVisible = true;
      render();
      return;
    }
    const prompt = deferredPrompt;
    deferredPrompt = null;
    await prompt.prompt();
    const choice = await prompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
    if (choice.outcome === 'accepted') close();
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    fallbackVisible = false;
    if (overlay?.classList.contains('visible')) render();
  });

  window.addEventListener('appinstalled', () => {
    if (!overlay) return;
    titleNode.textContent = COPY.title;
    bodyNode.innerHTML = `<p>${COPY.success}</p>`;
    primaryButton.textContent = COPY.continue;
    setTimeout(close, 1800);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once: true });
  else show();
})();