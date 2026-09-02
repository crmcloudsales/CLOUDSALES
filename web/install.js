(() => {
  'use strict';

  const targets = new Set(['ios', 'android', 'desktop']);
  const target = new URLSearchParams(location.search).get('install');
  const ICON = '/cloudsales-app-icon-official-v2.png?v=2026082903';
  const HL_CLAIM_KEY = 'cs_highlevel_marketplace_claim';
  let deferredPrompt = null;
  let overlay = null;
  let title = null;
  let body = null;
  let primary = null;
  let readyTimer = null;

  function marketplaceMessage(text, ok = true) {
    const apply = () => {
      const el = document.getElementById('authMsg');
      if (!el) return;
      el.className = ok ? 'ok' : 'err';
      el.textContent = text;
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
    else apply();
  }
  function cleanMarketplaceUrl() {
    try {
      const u = new URL(location.href);
      ['oauth','code','state','scope','user_type','userType','appId','app_id','versionId','version_id'].forEach(k => u.searchParams.delete(k));
      history.replaceState({}, '', u.pathname + (u.search || '') + u.hash);
    } catch {}
  }
  function pendingHighLevelClaim() { return localStorage.getItem(HL_CLAIM_KEY) || ''; }
  async function claimHighLevelMarketplace() {
    const claim = pendingHighLevelClaim();
    if (!claim || typeof direct !== 'function' || typeof session === 'undefined' || !session?.access_token) return false;
    try {
      const organizationId = localStorage.getItem('cs_org') || null;
      const data = await direct('highlevel-private-connect', { action:'marketplace_claim', claim_token:claim, organization_id:organizationId }, true);
      localStorage.removeItem(HL_CLAIM_KEY);
      if (data?.organization_id) localStorage.setItem('cs_org', data.organization_id);
      marketplaceMessage(data?.permissions?.complete === false ? 'HighLevel conectado. CloudSales detectó permisos faltantes; puedes ampliarlos desde la instalación de CloudSales en HighLevel.' : 'HighLevel conectado correctamente con CloudSales.', true);
      try { if (typeof boot === 'function') await boot(); } catch {}
      return true;
    } catch (err) {
      const code = String(err?.message || '');
      if (['claim_invalid_or_used','claim_expired'].includes(code)) localStorage.removeItem(HL_CLAIM_KEY);
      return false;
    }
  }
  async function retryHighLevelClaim(attempt = 0) {
    if (!pendingHighLevelClaim() || attempt >= 150) return;
    if (await claimHighLevelMarketplace()) return;
    setTimeout(() => retryHighLevelClaim(attempt + 1), 4000);
  }
  async function runHighLevelIntake(u, code, attempt = 0) {
    if (typeof direct !== 'function') {
      if (attempt < 40) setTimeout(() => runHighLevelIntake(u, code, attempt + 1), 250);
      return;
    }
    try {
      marketplaceMessage('Conectando HighLevel con CloudSales…', true);
      const result = await direct('highlevel-private-connect', {
        action:'marketplace_intake', code,
        user_type:u.searchParams.get('user_type') || u.searchParams.get('userType') || 'Location',
        app_id:u.searchParams.get('appId') || u.searchParams.get('app_id') || null,
        version_id:u.searchParams.get('versionId') || u.searchParams.get('version_id') || null
      }, false);
      if (!result?.claim_token) throw new Error('marketplace_intake_failed');
      localStorage.setItem(HL_CLAIM_KEY, result.claim_token);
      cleanMarketplaceUrl();
      marketplaceMessage('HighLevel autorizado. Entra o crea tu cuenta CloudSales para terminar la conexión.', true);
      if (!(await claimHighLevelMarketplace())) retryHighLevelClaim();
    } catch {
      marketplaceMessage('No pudimos completar la conexión con HighLevel. Intenta instalar CloudSales nuevamente desde HighLevel.', false);
    }
  }
  async function captureHighLevelMarketplace() {
    let u; try { u = new URL(location.href); } catch { return; }
    const isHighLevel = u.searchParams.get('oauth') === 'highlevel';
    const code = u.searchParams.get('code') || '';
    const providerError = u.searchParams.get('error') || '';
    if (isHighLevel && providerError) {
      marketplaceMessage('HighLevel canceló o no pudo completar la autorización.', false);
      cleanMarketplaceUrl();
      return;
    }
    if (!isHighLevel || !code) {
      if (pendingHighLevelClaim()) retryHighLevelClaim();
      return;
    }
    runHighLevelIntake(u, code);
  }
  captureHighLevelMarketplace();

  function patchCanonicalPricing() {
    const apply = () => {
      document.querySelectorAll('.planpick[data-plan="basic"]').forEach(el => {
        el.innerHTML = 'BASIC<br><b>$47</b><div style="font-size:9px;color:#9695a7;margin-top:4px">1 usuario · uso: costo +50%</div><span class="trialPlanNote">7 días gratis</span>';
        el.setAttribute('aria-label', 'BASIC 47 USD al mes, 1 usuario, uso variable a costo real más 50 por ciento');
      });
      document.querySelectorAll('.planpick[data-plan="pro"]').forEach(el => {
        el.innerHTML = 'PRO<br><b>$97</b><div style="font-size:9px;color:#9695a7;margin-top:4px">1 usuario · uso: costo +35%</div><span class="trialPlanNote">7 días gratis</span>';
        el.setAttribute('aria-label', 'PRO 97 USD al mes, 1 usuario, uso variable a costo real más 35 por ciento');
      });
      document.querySelectorAll('.planpick[data-plan="premium"]').forEach(el => {
        el.innerHTML = 'PREMIUM<br><b>$147</b><div style="font-size:9px;color:#9695a7;margin-top:4px">2 usuarios · extra $47 · uso: costo +25%</div><span class="trialPlanNote">7 días gratis</span>';
        el.setAttribute('aria-label', 'PREMIUM 147 USD al mes, 2 usuarios incluidos, asiento extra 47 USD, uso variable a costo real más 25 por ciento');
      });

      const plans = document.querySelector('.plans');
      if (plans && !document.getElementById('csUsagePricingNotice')) {
        const notice = document.createElement('div');
        notice.id = 'csUsagePricingNotice';
        notice.className = 'trialOnboard';
        notice.innerHTML = '<b>Uso variable transparente.</b> Basic: costo real ×1.50 · Pro: ×1.35 · Premium: ×1.25 · Dominios: ×2. <a href="https://cloudsales.app/usage-pricing" target="_blank" rel="noopener" style="color:#ff9dcc;text-decoration:underline">Ver Usage Pricing</a>';
        plans.insertAdjacentElement('afterend', notice);
      }

      document.querySelectorAll('#page-settings .card').forEach(card => {
        const h = card.querySelector('h3');
        if (!h || h.textContent.trim() !== 'Legal & Privacy' || card.querySelector('[data-cs-usage-pricing]')) return;
        const a = document.createElement('a');
        a.className = 'btn small';
        a.href = 'https://cloudsales.app/usage-pricing';
        a.target = '_blank';
        a.rel = 'noopener';
        a.dataset.csUsagePricing = '1';
        a.textContent = 'Usage Pricing';
        card.append(' ', a);
      });
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