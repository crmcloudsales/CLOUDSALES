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
  let fallbackMode = false;

  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = () => /Android/i.test(navigator.userAgent);

  function clearInstallQuery() {
    try {
      const u = new URL(location.href);
      u.searchParams.delete('install');
      history.replaceState({}, '', u.pathname + u.search + u.hash);
    } catch {}
  }

  function close() {
    clearTimeout(readyTimer);
    overlay?.classList.remove('visible');
    document.body.classList.remove('install-open');
    clearInstallQuery();
  }

  addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    fallbackMode = false;
    if (overlay?.classList.contains('visible')) render();
  });

  addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (title) title.textContent = 'CloudSales instalada';
    if (body) body.innerHTML = '<p>CloudSales ya está en tu dispositivo.</p>';
    if (primary) {
      primary.disabled = false;
      primary.textContent = 'ABRIR CLOUDSALES';
      primary.onclick = () => close();
    }
    setTimeout(close, 1300);
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
    s.textContent = `.install-overlay{position:fixed;inset:0;z-index:9999;display:none;place-items:center;padding:22px;background:rgba(5,5,9,.94);backdrop-filter:blur(14px)}.install-overlay.visible{display:grid}.install-card{position:relative;width:min(610px,100%);border:1px solid #343443;border-radius:30px;background:linear-gradient(180deg,#15151f,#0d0d14);padding:34px 34px 32px;box-shadow:0 45px 140px #000c;text-align:center}.install-close{position:absolute;right:18px;top:18px;width:54px;height:54px;border:0;border-radius:50%;background:#20202b;color:#fff;font-size:32px;line-height:1;cursor:pointer}.install-mark{display:block;width:104px;height:104px;object-fit:contain;border-radius:24px;margin:8px auto 24px}.install-card h2{font-size:clamp(34px,6vw,48px);line-height:1.05;letter-spacing:-.045em;margin:0 0 18px}.install-body{color:#aaa9b8;font-size:18px;line-height:1.55;text-align:center;max-width:500px;margin:0 auto}.install-body p{margin:0 0 12px}.install-note{font-size:14px;color:#858596;margin-top:10px}.install-primary{width:100%;border:1px solid #fff;border-radius:999px;padding:18px 20px;margin-top:24px;background:linear-gradient(135deg,#ff2b9b,#bd2cff);color:#fff;font-weight:950;font-size:19px;cursor:pointer;box-shadow:0 14px 38px rgba(255,43,155,.22);letter-spacing:.01em}.install-primary:disabled{opacity:.7;cursor:wait}.install-open{overflow:hidden}@media(max-width:560px){.install-card{padding:30px 22px 25px;border-radius:26px}.install-card h2{font-size:36px}.install-body{font-size:16px}.install-mark{width:94px;height:94px}.install-primary{font-size:18px}}`;
    document.head.appendChild(s);
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
    title.textContent = 'Descarga CloudSales';
    primary.disabled = false;
    primary.textContent = 'DESCARGAR CLOUDSALES';

    if (ios()) {
      fallbackMode = true;
      body.innerHTML = `<p>Instálala como una app desde Safari.</p><p class="install-note">Compartir → Agregar a pantalla de inicio → Abrir como app web → Agregar.</p>`;
      return;
    }

    if (deferredPrompt) {
      fallbackMode = false;
      body.innerHTML = `<p>CloudSales está lista para instalarse en tu dispositivo como una aplicación.</p>`;
      return;
    }

    fallbackMode = false;
    body.innerHTML = `<p>Preparando instalación…</p>`;
    primary.disabled = true;

    clearTimeout(readyTimer);
    readyTimer = setTimeout(() => {
      if (deferredPrompt || !primary) return;
      fallbackMode = true;
      primary.disabled = false;
      primary.textContent = 'DESCARGAR CLOUDSALES';
      body.innerHTML = android()
        ? `<p>CloudSales está lista para instalarse.</p><p class="install-note">Si Chrome no abre la ventana automáticamente, toca ⋮ y selecciona <b>Instalar aplicación</b>.</p>`
        : `<p>CloudSales está lista para instalarse.</p><p class="install-note">Usa el icono de instalación de Chrome o Edge en la barra de direcciones.</p>`;
    }, 1300);
  }

  async function install() {
    if (standalone()) { close(); return; }
    if (ios()) {
      body.innerHTML = `<p>En Safari: Compartir → <b>Agregar a pantalla de inicio</b> → Abrir como app web → Agregar.</p>`;
      primary.textContent = 'DESCARGAR CLOUDSALES';
      return;
    }
    if (!deferredPrompt) {
      fallbackMode = true;
      body.innerHTML = android()
        ? `<p>Para terminar la descarga toca el menú ⋮ de Chrome y selecciona <b>Instalar aplicación</b>.</p>`
        : `<p>Para terminar la descarga usa el icono <b>Instalar</b> de Chrome o Edge.</p>`;
      primary.disabled = false;
      primary.textContent = 'DESCARGAR CLOUDSALES';
      return;
    }
    primary.disabled = true;
    primary.textContent = 'DESCARGANDO…';
    const prompt = deferredPrompt;
    deferredPrompt = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === 'accepted') close();
      else {
        primary.disabled = false;
        primary.textContent = 'DESCARGAR CLOUDSALES';
      }
    } catch {
      primary.disabled = false;
      primary.textContent = 'DESCARGAR CLOUDSALES';
    }
  }

  const show = () => {
    if (standalone()) return;
    if (!overlay) create();
    render();
    overlay.classList.add('visible');
    document.body.classList.add('install-open');
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once: true });
  else show();
})();