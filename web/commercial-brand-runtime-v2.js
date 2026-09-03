(()=>{
'use strict';
/*
 CloudSales compatibility runtime.
 Canonical branding now lives in web/commercial.html and canonical localization
 lives in web/cloudsales-i18n-v1.js. This file intentionally performs no color,
 typography, trial-copy, pricing-copy or language mutations. It remains only so
 cached HTML or release layers that still request the historical URL do not 404.
*/
const VERSION='2026.09.03.6';
function normalizeHighLevel(){
  document.querySelectorAll('*').forEach(el=>{
    if(el.children.length===0 && /^highlevel$/i.test((el.textContent||'').trim())) el.textContent='HighLevel';
  });
}
function mark(){
  normalizeHighLevel();
  document.documentElement.dataset.commercialCompatibilityRuntime=VERSION;
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mark,{once:true});
else mark();
window.addEventListener('cloudsales:locale',()=>setTimeout(mark,0));
})();
