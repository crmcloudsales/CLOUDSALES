// CloudSales install route: install=ios | install=android | install=desktop
(() => {
  'use strict';

  const INSTALL_TARGETS = new Set(['ios', 'android', 'desktop']);
  const requestedTarget = new URLSearchParams(window.location.search).get('install');
  if (!INSTALL_TARGETS.has(requestedTarget)) return;

  const COPY = {
    es: {
      title: 'Instalar app',
      iosTitle: 'Instalar CloudSales',
      androidBody: 'Instala CloudSales en tu dispositivo.',
      desktopBody: 'Instala CloudSales en tu computadora.',
      iosBody: 'En iPhone o iPad, toca Compartir y después Agregar a pantalla de inicio.',
      install: 'Instalar app',
      close: 'Cerrar',
      already: 'CloudSales ya está instalada en este dispositivo.'
    },
    en: {
      title: 'Install app',
      iosTitle: 'Install CloudSales',
      androidBody: 'Install CloudSales on your device.',
      desktopBody: 'Install CloudSales on your computer.',
      iosBody: 'On iPhone or iPad, tap Share and then Add to Home Screen.',
      install: 'Install app',
      close: 'Close',
      already: 'CloudSales is already installed on this device.'
    }
  };

  let deferredPrompt = null;
  let overlay = null;
  let primaryButton = null;
  let closeButton = null;
  let titleNode = null;
  let bodyNode = null;
  let shown = false;
  let waitTimer = null;

  const language = () => (document.documentElement.lang || navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
  const copy = () => COPY[language()] || COPY.es;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function cleanInstallParam() {
    const u = new URL(location.href);
    u.searchParams.delete('install');
    history.replaceState({}, '', u.pathname + u.search + u.hash);
  }

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'install-overlay';
    overlay.innerHTML = `<section class="install-card" role="dialog" aria-modal="true" aria-labelledby="installTitle">
      <button class="install-close" type="button" aria-label="Cerrar">×</button>
      <img class="install-mark" src="/icon-512.png" alt="CloudSales">
      <h2 id="installTitle"></h2>
      <div class="install-body"></div>
      <button class="btn primary install-primary" type="button"></button>
    </section>`;
    document.body.appendChild(overlay);
    titleNode = overlay.querySelector('#installTitle');
    bodyNode = overlay.querySelector('.install-body');
    primaryButton = overlay.querySelector('.install-primary');
    closeButton = overlay.querySelector('.install-close');
    closeButton.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay?.classList.contains('visible')) close(); });
    primaryButton.addEventListener('click', install);
  }

  function close() {
    if (waitTimer) clearTimeout(waitTimer);
    overlay?.classList.remove('visible');
    document.body.classList.remove('install-open');
    cleanInstallParam();
  }

  function show() {
    if (shown) return;
    shown = true;
    if (!overlay) createOverlay();
    const t = copy();
    closeButton.setAttribute('aria-label', t.close);
    titleNode.textContent = requestedTarget === 'ios' ? t.iosTitle : t.title;
    bodyNode.innerHTML = `<p>${requestedTarget === 'ios' ? t.iosBody : requestedTarget === 'desktop' ? t.desktopBody : t.androidBody}</p>`;
    primaryButton.textContent = t.install;
    primaryButton.disabled = requestedTarget !== 'ios' && !deferredPrompt;
    overlay.classList.add('visible');
    document.body.classList.add('install-open');
    setTimeout(() => primaryButton?.focus(), 50);
  }

  async function install() {
    if (isStandalone()) { close(); return; }

    if (requestedTarget === 'ios') {
      // iOS does not expose beforeinstallprompt; the single CloudSales screen stays simple.
      close();
      return;
    }

    if (!deferredPrompt) return;

    const prompt = deferredPrompt;
    deferredPrompt = null;
    primaryButton.disabled = true;
    try {
      await prompt.prompt();
      await prompt.userChoice.catch(() => null);
    } finally {
      close();
    }
  }

  addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    if (!shown) show();
    if (primaryButton) primaryButton.disabled = false;
  });

  addEventListener('appinstalled', close);

  function start() {
    if (isStandalone()) { cleanInstallParam(); return; }

    if (requestedTarget === 'ios' || isIOS()) {
      show();
      return;
    }

    // Android/Desktop: do not show a fake second step. Wait for the native install prompt.
    waitTimer = setTimeout(() => {
      if (deferredPrompt) show();
      else cleanInstallParam();
    }, 3500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();