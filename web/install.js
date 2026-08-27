// CloudSales install route marker: install=ios | install=android | install=desktop
(() => {
  'use strict';

  const INSTALL_TARGETS = new Set(['ios', 'android', 'desktop']);
  const requestedTarget = new URLSearchParams(window.location.search).get('install');
  if (!INSTALL_TARGETS.has(requestedTarget)) return;

  const COPY = {
    es: {
      title: 'Instala CloudSales en tu dispositivo',
      iosTitle: 'Instala CloudSales en tu iPhone o iPad',
      androidBody: 'Toca Instalar CloudSales para añadir la aplicación a tu pantalla de inicio.',
      desktopBody: 'Toca Instalar CloudSales para abrirla como una aplicación independiente en tu computadora.',
      iosBody: 'CloudSales se instala directamente desde Safari:',
      iosSteps: ['Toca Compartir.', 'Selecciona Agregar a Inicio.', 'Activa Abrir como app web y toca Agregar.'],
      iosBrowser: 'Si estás en otro navegador, abre esta página en Safari para instalar CloudSales.',
      androidFallback: 'Si no aparece la ventana, abre el menú ⋮ del navegador y elige Instalar aplicación o Agregar a pantalla principal.',
      desktopFallback: 'Usa el icono Instalar de la barra de direcciones o el menú de Chrome o Edge y selecciona Instalar CloudSales.',
      install: 'Instalar CloudSales', continue: 'Continuar en CloudSales', close: 'Cerrar',
      already: 'CloudSales ya está instalada en este dispositivo.', success: 'CloudSales quedó instalada correctamente.'
    },
    en: {
      title: 'Install CloudSales on your device', iosTitle: 'Install CloudSales on your iPhone or iPad',
      androidBody: 'Tap Install CloudSales to add the app to your Home Screen.',
      desktopBody: 'Click Install CloudSales to open it as a standalone app on your computer.',
      iosBody: 'Install CloudSales directly from Safari:',
      iosSteps: ['Tap Share.', 'Choose Add to Home Screen.', 'Turn on Open as Web App and tap Add.'],
      iosBrowser: 'If you are using another browser, open this page in Safari to install CloudSales.',
      androidFallback: 'If the window does not appear, open the browser menu ⋮ and choose Install app or Add to Home screen.',
      desktopFallback: 'Use the Install icon in the address bar or the Chrome or Edge menu and choose Install CloudSales.',
      install: 'Install CloudSales', continue: 'Continue in CloudSales', close: 'Close',
      already: 'CloudSales is already installed on this device.', success: 'CloudSales was installed successfully.'
    }
  };

  let deferredPrompt = null, overlay = null, titleNode = null, bodyNode = null, primaryButton = null, closeButton = null, fallbackVisible = false;
  const language = () => (document.documentElement.lang || navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
  const copy = () => COPY[language()] || COPY.es;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isSafariOnIOS = () => { const ua=navigator.userAgent; const ios=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1); return ios&&/WebKit/i.test(ua)&&!/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua); };

  function createOverlay(){
    overlay=document.createElement('div'); overlay.className='install-overlay';
    overlay.innerHTML=`<section class="install-card" role="dialog" aria-modal="true" aria-labelledby="installTitle"><button class="install-close" type="button" aria-label="Cerrar">×</button><img class="install-mark" src="/icon-512.png" alt=""><h2 id="installTitle"></h2><div class="install-body"></div><button class="btn primary install-primary" type="button"></button></section>`;
    document.body.appendChild(overlay); titleNode=overlay.querySelector('#installTitle'); bodyNode=overlay.querySelector('.install-body'); primaryButton=overlay.querySelector('.install-primary'); closeButton=overlay.querySelector('.install-close');
    closeButton.addEventListener('click',close); overlay.addEventListener('click',e=>{if(e.target===overlay)close()}); document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay?.classList.contains('visible'))close()}); primaryButton.addEventListener('click',handlePrimary);
  }
  function close(){overlay?.classList.remove('visible');document.body.classList.remove('install-open')}
  function show(){if(!overlay)createOverlay();render();overlay.classList.add('visible');document.body.classList.add('install-open');setTimeout(()=>primaryButton?.focus(),50);const u=new URL(location.href);u.searchParams.delete('install');history.replaceState({},'',u.pathname+u.search+u.hash)}
  function render(){const t=copy();closeButton?.setAttribute('aria-label',t.close);primaryButton.hidden=false;primaryButton.textContent=t.install;
    if(isStandalone()){titleNode.textContent=t.title;bodyNode.innerHTML=`<p>${t.already}</p>`;primaryButton.textContent=t.continue;return}
    if(requestedTarget==='ios'){titleNode.textContent=t.iosTitle;const note=isSafariOnIOS()?'':`<p class="install-note">${t.iosBrowser}</p>`;bodyNode.innerHTML=`<p>${t.iosBody}</p><ol>${t.iosSteps.map(s=>`<li>${s}</li>`).join('')}</ol>${note}`;primaryButton.textContent=t.continue;return}
    titleNode.textContent=t.title;const standard=requestedTarget==='android'?t.androidBody:t.desktopBody;const fallback=requestedTarget==='android'?t.androidFallback:t.desktopFallback;bodyNode.innerHTML=`<p>${fallbackVisible?fallback:standard}</p>`;primaryButton.textContent=fallbackVisible?t.continue:t.install;
  }
  async function handlePrimary(){if(isStandalone()||requestedTarget==='ios'||fallbackVisible){close();return}if(!deferredPrompt){fallbackVisible=true;render();return}const p=deferredPrompt;deferredPrompt=null;await p.prompt();const choice=await p.userChoice.catch(()=>({outcome:'dismissed'}));if(choice.outcome==='accepted')close()}
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;fallbackVisible=false;if(overlay?.classList.contains('visible'))render()});
  addEventListener('appinstalled',()=>{if(!overlay)return;const t=copy();titleNode.textContent=t.title;bodyNode.innerHTML=`<p>${t.success}</p>`;primaryButton.textContent=t.continue;setTimeout(close,1800)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
})();