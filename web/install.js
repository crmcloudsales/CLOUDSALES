// CloudSales PWA installer — native prompt first, no custom interstitial.
(() => {
  'use strict';

  let deferredPrompt = null;
  let installInFlight = false;
  const params = new URLSearchParams(location.search);
  const requested = params.get('install');
  const wantsAuto = ['1','auto','android','desktop'].includes(String(requested || '').toLowerCase());

  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function cleanInstallParam() {
    if (!params.has('install')) return;
    const u = new URL(location.href);
    u.searchParams.delete('install');
    history.replaceState({}, '', u.pathname + u.search + u.hash);
  }

  async function requestInstall() {
    if (isStandalone()) {
      cleanInstallParam();
      return { status: 'installed' };
    }
    if (isIOS()) {
      cleanInstallParam();
      window.dispatchEvent(new CustomEvent('cloudsales-install-ios-required'));
      return { status: 'ios_manual' };
    }
    if (!deferredPrompt || installInFlight) {
      return { status: 'unavailable' };
    }

    installInFlight = true;
    const prompt = deferredPrompt;
    deferredPrompt = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice.catch(() => null);
      cleanInstallParam();
      return { status: choice?.outcome === 'accepted' ? 'accepted' : 'dismissed' };
    } finally {
      installInFlight = false;
    }
  }

  function bindButtons() {
    document.querySelectorAll('#installBtn,#installBtn2,[data-cloudsales-install]').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.preventDefault();
        const result = await requestInstall();
        if (result.status === 'ios_manual') {
          alert('En iPhone/iPad, Apple requiere: Safari → Compartir → Agregar a pantalla de inicio.');
        }
      });
    });
  }

  window.CloudSalesInstall = { request: requestInstall, isInstalled: isStandalone, isIOS };

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    document.documentElement.dataset.cloudsalesInstallReady = 'true';
    window.dispatchEvent(new CustomEvent('cloudsales-install-ready'));
    if (wantsAuto) setTimeout(() => requestInstall(), 0);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    localStorage.setItem('cloudsales_pwa_installed', '1');
    document.documentElement.dataset.cloudsalesInstalled = 'true';
    cleanInstallParam();
    window.dispatchEvent(new CustomEvent('cloudsales-app-installed'));
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindButtons, { once: true });
  else bindButtons();

  if (isStandalone()) cleanInstallParam();
})();