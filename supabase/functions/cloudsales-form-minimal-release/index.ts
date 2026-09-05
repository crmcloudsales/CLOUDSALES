import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// CloudSales minimal-form release guard.
// Runs outside the canonical release helper and only simplifies user-input surfaces.
// It does not change pricing, billing, legal requirements, products, or backend APIs.
const nativeFetch = globalThis.fetch.bind(globalThis);
const MARKER = 'data-cloudsales-form-minimal="v2"';
const BASE_WRAPPER = 'https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/6c3ab755a31f063203035f194c5148d8821f93fc/supabase/functions/cloudsales-form-ux-release/index.ts';

function inject(html:string, css:string, js=''){
  if(html.includes(MARKER)) return html;
  const style=`<style ${MARKER}>${css}</style>`;
  const script=js?`<script data-cloudsales-form-minimal-js="v2">${js}</script>`:'';
  let h=html;
  const hp=h.lastIndexOf('</head>');
  h=hp>=0?h.slice(0,hp)+style+h.slice(hp):style+h;
  if(script){const bp=h.lastIndexOf('</body>');h=bp>=0?h.slice(0,bp)+script+h.slice(bp):h+script}
  return h;
}

function commercial(html:string){
  const css=`
.checkout{padding:12px!important}.checkcard{width:min(680px,100%)!important;margin:12px auto!important;padding:16px!important;border-radius:20px!important}.checktop{min-height:38px!important}.emailrow{margin:10px 0!important;gap:8px!important}.emailrow input{min-height:46px!important;padding:11px 13px!important}.emailrow .btn{min-height:46px!important;padding:11px 16px!important}.trialCheckout{margin:8px 0!important;padding:9px 11px!important}.close{width:36px!important;height:36px!important}@media(max-width:540px){.checkout{padding:7px!important}.checkcard{margin:6px auto!important;padding:13px!important;border-radius:17px!important}.emailrow{margin:7px 0!important}.emailrow input,.emailrow .btn{min-height:45px!important}}
`;
  const js=`(()=>{const e=document.getElementById('cemail'),b=document.getElementById('cstart'),c=document.getElementById('cclose'),m=document.getElementById('checkoutModal');e?.addEventListener('keydown',x=>{if(x.key==='Enter'){x.preventDefault();b?.click()}});document.addEventListener('keydown',x=>{if(x.key==='Escape'&&m?.classList.contains('open'))c?.click()})})();`;
  return inject(html,css,js);
}

function simpleCheckout(html:string){
  const css=`
.checkout{padding:10px!important}.box{width:min(620px,100%)!important;margin:10px auto!important;padding:16px!important;border-radius:20px!important}.top{align-items:center!important;min-height:38px!important}.row{margin:10px 0!important;gap:8px!important}.row input{min-height:46px!important;padding:11px 13px!important}.row .btn{min-height:46px!important;padding:11px 16px!important}.x{width:36px!important;height:36px!important}@media(max-width:760px){.checkout{padding:7px!important}.box{margin:6px auto!important;padding:13px!important;border-radius:17px!important}.row{margin:7px 0!important}}
`;
  const js=`(()=>{const e=document.getElementById('email'),b=document.getElementById('start');e?.addEventListener('keydown',x=>{if(x.key==='Enter'){x.preventDefault();b?.click()}})})();`;
  return inject(html,css,js);
}

function domains(html:string){
  const css=`
.hero{padding:34px 0 18px!important}.hero h1{font-size:clamp(38px,7vw,60px)!important;margin:10px auto 12px!important}.hero h2{font-size:clamp(21px,3.5vw,30px)!important}.hero p{font-size:clamp(15px,2vw,19px)!important}.free{margin-top:12px!important;padding:8px 14px!important}.card#buy{max-width:760px!important;margin-left:auto!important;margin-right:auto!important;padding:18px!important;border-radius:22px!important}.searchrow{gap:8px!important}.input,.select,.textarea{padding:11px 13px!important;border-radius:12px!important}.btn{min-height:46px!important;padding:11px 16px!important;border-radius:12px!important}.result,.purchase,.checkout,.afterpay,.helpbox{margin-top:12px!important;padding:14px!important;border-radius:16px!important}.leadgrid,.addressgrid{gap:8px!important}.purchase h3{font-size:17px!important}.purchase>.note{margin-bottom:9px!important}.check[role="note"],label:has(#marketing),#purchase .secure,.consentHint{display:none!important}.domainConsent{margin:7px 0 0!important;padding:6px 0!important;border:0!important;background:transparent!important;font-size:12px!important}.domainConsent strong{font-weight:700!important}.pricing{gap:7px!important}.pricebox{padding:10px!important}.ads-title,.ads,.steps{display:none!important}.support{margin:20px 0 50px!important}.support:not([open]){opacity:.72!important}.csWaGate{width:min(380px,calc(100vw - 18px))!important;border-radius:18px!important}.csWaBody{padding:12px!important}.csWaBody .input{margin-bottom:7px!important}.csWaHead{padding:13px!important}.csWaHead b{font-size:18px!important}#csDomainWa{padding:10px 13px!important;font-size:12px!important;right:12px!important;bottom:12px!important}.sitebrief{padding:13px!important}.textarea{min-height:94px!important}@media(max-width:760px){.hero{padding:22px 0 12px!important}.hero h1{font-size:38px!important}.hero .kicker{font-size:11px!important}.free{margin-top:9px!important}.card#buy{padding:13px!important;border-radius:18px!important;margin-bottom:16px!important}.result,.purchase,.checkout,.afterpay,.helpbox{padding:11px!important}.searchrow{grid-template-columns:1fr!important}.searchrow .btn{width:100%!important}.leadgrid,.addressgrid{grid-template-columns:1fr!important}.domainline{gap:10px!important}.pricing{grid-template-columns:1fr 1fr!important}.support{margin-bottom:30px!important}}
`;
  const js=`(()=>{const $=id=>document.getElementById(id);const consent=$('domainLeadConsent');if(consent)consent.innerHTML='<div>Al continuar aceptas los <a href="/terms" target="_blank" rel="noopener">Términos</a> y la <a href="/privacy" target="_blank" rel="noopener">Política de Privacidad</a>.</div>';const op=document.querySelector('#purchase .check[role="note"]');if(op)op.style.display='none';const mk=$('marketing');if(mk){mk.checked=false;const l=mk.closest('label');if(l)l.style.display='none'}const sec=document.querySelector('#purchase .secure');if(sec)sec.style.display='none';const org=$('organization');if(org){org.type='hidden';org.value='';org.classList.remove('input','wide')}const country=$('country');if(country&&!country.value){const m=(navigator.language||'').match(/-([A-Z]{2})$/i);if(m)country.value=m[1].toUpperCase()}$('domain')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('search')?.click()}});$('email')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('continue')?.click()}});$('country')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('pay')?.click()}})})();`;
  return inject(html,css,js);
}

globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const reqUrl=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  const res=await nativeFetch(input as any,init);
  if(!res.ok || (init?.method&&String(init.method).toUpperCase()!=='GET')) return res;
  let kind='';
  if(/\/web\/commercial\.html(?:\?|$)/.test(reqUrl)) kind='commercial';
  else if(/\/web\/(?:academy|services)\.html(?:\?|$)/.test(reqUrl)) kind='simple';
  else if(/\/web\/commercial\/domains-v2\.html(?:\?|$)/.test(reqUrl)) kind='domains';
  if(!kind) return res;
  const text=await res.text();
  const patched=kind==='commercial'?commercial(text):kind==='simple'?simpleCheckout(text):domains(text);
  const headers=new Headers(res.headers);headers.delete('content-length');
  return new Response(patched,{status:res.status,statusText:res.statusText,headers});
}) as typeof fetch;

await import(BASE_WRAPPER);
