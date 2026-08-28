(() => {
  'use strict';

  const targets = new Set(['ios', 'android', 'desktop']);
  const target = new URLSearchParams(location.search).get('install');
  const ICON = '/cloudsales-official-app-icon-v3.png';
  let deferredPrompt = null;
  let overlay = null;
  let title = null;
  let body = null;
  let primary = null;
  let readyTimer = null;

  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safariIOS = () => ios() && /WebKit/i.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(navigator.userAgent);

  addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    if (overlay?.classList.contains('visible')) render();
  });

  addEventListener('appinstalled', () => {
    deferredPrompt = null;
    close();
  });

  window.CloudSalesInstall = {
    async request() {
      if (standalone()) return { status: 'installed' };
      if (ios()) return { status: 'ios_manual' };
      if (!deferredPrompt) return { status: 'unavailable' };
      const prompt = deferredPrompt;
      deferredPrompt = null;
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        return { status: choice?.outcome === 'accepted' ? 'accepted' : 'dismissed' };
      } catch {
        return { status: 'unavailable' };
      }
    }
  };

  if (!targets.has(target)) return;

  function styles() {
    if (document.getElementById('cloudsales-install-styles')) return;
    const s = document.createElement('style');
    s.id = 'cloudsales-install-styles';
    s.textContent = `.install-overlay{position:fixed;inset:0;z-index:9999;display:none;place-items:center;padding:22px;background:rgba(5,5,9,.94);backdrop-filter:blur(14px)}.install-overlay.visible{display:grid}.install-card{position:relative;width:min(610px,100%);border:1px solid #343443;border-radius:30px;background:linear-gradient(180deg,#15151f,#0d0d14);padding:36px 34px 32px;box-shadow:0 45px 140px #000c;text-align:center}.install-close{position:absolute;right:18px;top:18px;width:54px;height:54px;border:0;border-radius:50%;background:#20202b;color:#fff;font-size:32px;line-height:1}.install-mark{display:block;width:92px;height:92px;object-fit:contain;border-radius:22px;margin:10px auto 26px;filter:drop-shadow(0 16px 34px rgba(255,43,155,.22))}.install-card h2{font-size:clamp(34px,6vw,48px);line-height:1.05;letter-spacing:-.045em;margin:0 0 20px}.install-body{color:#aaa9b8;font-size:18px;line-height:1.55;text-align:left;max-width:500px;margin:0 auto}.install-body p{margin:0 0 12px}.install-body ol{padding-left:24px;margin:10px 0}.install-note{font-size:14px;color:#858596;margin-top:12px}.install-primary{width:100%;border:1px solid #fff;border-radius:999px;padding:17px 20px;margin-top:24px;background:linear-gradient(135deg,#ff2b9b,#bd2cff);color:#fff;font-weight:900;font-size:19px;box-shadow:0 14px 38px rgba(255,43,155,.22)}.install-primary:disabled{opacity:.65;cursor:wait}.install-open{overflow:hidden}@media(max-width:560px){.install-card{padding:32px 22px 25px;border-radius:26px}.install-card h2{font-size:36px}.install-body{font-size:16px}.install-mark{width:82px;height:82px}.install-primary{font-size:18px}}`;
    document.head.appendChild(s);
  }

  function close() {
    clearTimeout(readyTimer);
    overlay?.classList.remove('visible');
    document.body.classList.remove('install-open');
  }

  function create() {
    styles();
    overlay = document.createElement('div');
    overlay.className = 'install-overlay';
    overlay.innerHTML = `<section class="install-card" role="dialog" aria-modal="true" aria-labelledby="installTitle"><button class="install-close" type="button" aria-label="Cerrar">×</button><img class="install-mark" src="${ICON}" alt="CloudSales"><h2 id="installTitle"></h2><div class="install-body"></div><button class="install-primary" type="button"></button></section>`;
    document.body.appendChild(overlay);
    title = overlay.querySelector('#installTitle');
    body = overlay.querySelector('.install-body');
    primary = overlay.querySelector('.install-primary');
    overlay.querySelector('.install-close').onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    primary.onclick = install;
  }

  function render() {
    if (standalone()) { close(); return; }
    if (!overlay) create();
    title.textContent = target === 'ios' ? 'Instala CloudSales en tu iPhone o iPad' : 'Instala CloudSales en tu dispositivo';

    if (target === 'ios') {
      body.innerHTML = `<p>CloudSales se instala directamente desde Safari:</p><ol><li>Toca Compartir.</li><li>Selecciona Agregar a pantalla de inicio.</li><li>Activa Abrir como app web y toca Agregar.</li></ol>${safariIOS() ? '' : '<p class="install-note">Abre esta página en Safari para instalar CloudSales.</p>'}`;
      primary.disabled = false;
      primary.textContent = 'Entendido';
      return;
    }

    body.innerHTML = `<p>Toca <b>Instalar CloudSales</b> para añadir la aplicación a tu dispositivo.</p><p id="installHint" class="install-note"></p>`;
    primary.textContent = deferredPrompt ? 'Instalar CloudSales' : 'Preparando instalación…';
    primary.disabled = !deferredPrompt;

    clearTimeout(readyTimer);
    readyTimer = setTimeout(() => {
      if (deferredPrompt || !primary) return;
      primary.disabled = false;
      primary.textContent = 'Instalar CloudSales';
      const hint = document.getElementById('installHint');
      if (hint) hint.textContent = target === 'android'
        ? 'Si Chrome no muestra la instalación, abre el menú ⋮ y elige Instalar aplicación o Agregar a pantalla principal.'
        : 'Si Chrome o Edge no muestran la instalación, usa el icono Instalar de la barra de direcciones.';
    }, 1800);
  }

  async function install() {
    if (standalone()) { close(); return; }
    if (target === 'ios') { close(); return; }
    if (!deferredPrompt) {
      const hint = document.getElementById('installHint');
      if (hint) hint.textContent = target === 'android'
        ? 'Abre el menú ⋮ del navegador y elige Instalar aplicación o Agregar a pantalla principal.'
        : 'Usa el icono Instalar de Chrome o Edge.';
      return;
    }

    primary.disabled = true;
    const prompt = deferredPrompt;
    deferredPrompt = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === 'accepted') close();
      else { primary.disabled = false; primary.textContent = 'Instalar CloudSales'; }
    } catch {
      primary.disabled = false;
      primary.textContent = 'Instalar CloudSales';
    }
  }

  const show = () => {
    if (standalone()) return;
    if (!overlay) create();
    render();
    overlay.classList.add('visible');
    document.body.classList.add('install-open');
    setTimeout(() => primary?.focus(), 60);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once: true });
  else show();
})();