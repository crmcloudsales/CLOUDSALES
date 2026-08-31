(() => {
  'use strict';

  const targets = new Set(['ios', 'android', 'desktop']);
  const target = new URLSearchParams(location.search).get('install');
  const ICON = '/cloudsales-app-icon-official-v2.png?v=2026082903';
  let deferredPrompt = null;
  let overlay = null;
  let title = null;
  let body = null;
  let primary = null;
  let readyTimer = null;

  function patchCanonicalPricing() {
    const apply = () => {
      document.querySelectorAll('.planpick[data-plan="basic"]').forEach(el => { el.innerHTML = 'STARTER<br><b>$47</b>'; el.setAttribute('aria-label', 'STARTER 47 USD al mes'); });
      document.querySelectorAll('.planpick[data-plan="pro"]').forEach(el => { el.innerHTML = 'PRO<br><b>$97</b>'; el.setAttribute('aria-label', 'PRO 97 USD al mes'); });
      document.querySelectorAll('.planpick[data-plan="premium"]').forEach(el => { el.innerHTML = 'PREMIUM<br><b>$147</b><div style="font-size:9px;color:#9695a7;margin-top:4px">2 usuarios · asiento extra $47</div>'; el.setAttribute('aria-label', 'PREMIUM 147 USD al mes, 2 usuarios incluidos, asiento extra 47 USD'); });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
    else apply();
  }
  patchCanonicalPricing();

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

  async function promptInstall() {
    if (!deferredPrompt) return false;
    const prompt = deferredPrompt;
    deferredPrompt = null;
    primary.disabled = true;
    primary.textContent = 'INSTALANDO…';
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === 'accepted') {
        body.innerHTML = '<p>Instalando CloudSales…</p>';
        return true;
      }
    } catch {}
    primary.disabled = false;
    primary.textContent = 'DESCARGAR CLOUDSALES';
    return false;
  }

  addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    if (overlay?.classList.contains('visible')) renderReady();
  });

  addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (title) title.textContent = 'CloudSales instalada';
    if (body) body.innerHTML = '<p>CloudSales ya está instalada con el branding oficial.</p>';
    if (primary) {
      primary.disabled = false;
      primary.textContent = 'LISTO';
      primary.onclick = close;
    }
    setTimeout(close, 1400);
  });

  window.CloudSalesInstall = {
    async request() {
      if (standalone()) return { status: 'installed' };
      if (ios()) return { status: 'ios_manual' };
      if (!deferredPrompt) return { status: 'unavailable' };
      return { status: (await promptInstall()) ? 'accepted' : 'dismissed' };
    }
  };

  if (!targets.has(target)) return;

  function styles() {
    if (document.getElementById('cloudsales-install-styles')) return;
    const s = document.createElement('style');
    s.id = 'cloudsales-install-styles';
    s.textContent = `.install-overlay{position:fixed;inset:0;z-index:9999;display:none;place-items:center;padding:22px;background:rgba(5,5,9,.94);backdrop-filter:blur(14px)}.install-overlay.visible{display:grid}.install-card{position:relative;width:min(610px,100%);border:1px solid #343443;border-radius:30px;background:linear-gradient(180deg,#15151f,#0d0d14);padding:34px 34px 32px;box-shadow:0 45px 140px #000c;text-align:center}.install-close{position:absolute;right:18px;top:18px;width:54px;height:54px;border:0;border-radius:50%;background:#20202b;color:#fff;font-size:32px;line-height:1;cursor:pointer}.install-mark{display:block;width:112px;height:112px;object-fit:contain;border-radius:25px;margin:8px auto 24px}.install-card h2{font-size:clamp(34px,6vw,48px);line-height:1.05;letter-spacing:-.045em;margin:0 0 18px}.install-body{color:#aaa9b8;font-size:18px;line-height:1.55;text-align:center;max-width:500px;margin:0 auto}.install-body p{margin:0 0 12px}.install-note{font-size:14px;color:#858596;margin-top:10px}.install-primary{width:100%;border:1px solid #fff;border-radius:999px;padding:18px 20px;margin-top:24px;background:linear-gradient(135deg,#ff2b9b,#bd2cff);color:#fff;font-weight:950;font-size:19px;cursor:pointer;box-shadow:0 14px 38px rgba(255,43,155,.22);letter-spacing:.01em}.install-primary:disabled{opacity:.68;cursor:wait}.install-open{overflow:hidden}@media(max-width:560px){.install-card{padding:30px 22px 25px;border-radius:26px}.install-card h2{font-size:36px}.install-body{font-size:16px}.install-mark{width:100px;height:100px}.install-primary{font-size:18px}}`;
    document.head.appendChild(s);
  }

  function create() {
    styles();
    overlay = document.createElement('div');
    overlay.className = 'install-overlay';
    overlay.innerHTML = `<section class="install-card" role="dialog" aria-modal="true" aria-labelledby="installTitle"><button class="install-close" type="button" aria-label="Cerrar">×</button><img class="install-mark" src="${ICON}" alt="CloudSales"><h2 id="installTitle">Descarga CloudSales</h2><div class="install-body"></div><button class="install-primary" type="button">DESCARGAR CLOUDSALES</button></section>`;
    document.body.appendChild(overlay);
    title = overlay.querySelector('#installTitle');
    body = overlay.querySelector('.install-body');
    primary = overlay.querySelector('.install-primary');
    overlay.querySelector('.install-close').onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    primary.onclick = () => promptInstall();
  }

  function renderReady() {
    clearTimeout(readyTimer);
    if (!body || !primary) return;
    body.innerHTML = '<p>CloudSales está lista para instalarse como una aplicación.</p>';
    primary.disabled = false;
    primary.textContent = 'DESCARGAR CLOUDSALES';
    primary.onclick = () => promptInstall();
  }

  function render() {
    if (standalone()) { close(); return; }
    if (!overlay) create();

    if (ios()) {
      body.innerHTML = '<p>En iPhone/iPad, Safari requiere el flujo del sistema.</p><p class="install-note">Compartir → Agregar a pantalla de inicio → Agregar.</p>';
      primary.disabled = false;
      primary.textContent = 'ENTENDIDO';
      primary.onclick = close;
      return;
    }

    if (deferredPrompt) {
      renderReady();
      return;
    }

    body.innerHTML = '<p>Preparando la instalación nativa de CloudSales…</p>';
    primary.disabled = true;
    primary.textContent = 'PREPARANDO…';
    clearTimeout(readyTimer);
    readyTimer = setTimeout(() => {
      if (deferredPrompt) return renderReady();
      primary.disabled = false;
      primary.textContent = 'REINTENTAR INSTALACIÓN';
      primary.onclick = () => location.reload();
      body.innerHTML = android()
        ? '<p>Chrome todavía no habilitó el instalador nativo.</p><p class="install-note">Toca Reintentar. Si existe una instalación antigua de CloudSales, la nueva identidad del PWA permite instalar la versión oficial como una app nueva.</p>'
        : '<p>El navegador todavía no habilitó el instalador nativo.</p><p class="install-note">Toca Reintentar instalación.</p>';
    }, 9000);
  }

  const show = () => {
    if (standalone()) return;
    if (!overlay) create();
    overlay.classList.add('visible');
    document.body.classList.add('install-open');
    render();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once: true });
  else show();
})();