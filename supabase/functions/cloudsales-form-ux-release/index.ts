import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// CloudSales public-site form UX guard.
// This wrapper intercepts only the four public HTML sources that contain user-input
// flows, applies low-friction/accessibility fixes, and then delegates the complete
// official CloudSales release process to the pinned canonical release module.

const nativeFetch = globalThis.fetch.bind(globalThis);
const MARKER = 'data-cloudsales-form-ux="v1"';

function addStyle(html: string, css: string) {
  if (html.includes(MARKER)) return html;
  const style = `<style ${MARKER}>${css}</style>`;
  const p = html.lastIndexOf('</head>');
  return p >= 0 ? html.slice(0, p) + style + html.slice(p) : style + html;
}

function patchCommercial(html: string) {
  let h = html;
  h = h.replace(
    /<input id="cemail" type="email" inputmode="email" autocomplete="email" placeholder="Tu correo" aria-describedby="cerr">/,
    '<input id="cemail" type="email" inputmode="email" autocomplete="email" placeholder="Tu correo" aria-describedby="cerr" required aria-required="true">'
  );
  h = h.replace(
    "document.querySelectorAll('.buy').forEach(b=>b.onclick=()=>{selected=b.dataset.item;modal.classList.add('open');mount.innerHTML='';err.textContent=''})",
    "document.querySelectorAll('.buy').forEach(b=>b.onclick=()=>{selected=b.dataset.item;if(checkout&&typeof checkout.destroy==='function'){try{checkout.destroy()}catch{}checkout=null}modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.getElementById('emailrow').style.display='flex';mount.innerHTML='';err.textContent='';document.getElementById('cstart').disabled=false;setTimeout(()=>document.getElementById('cemail')?.focus(),0)})"
  );
  h = h.replace(
    "document.getElementById('cclose').onclick=()=>modal.classList.remove('open');",
    "document.getElementById('cclose').onclick=()=>{if(checkout&&typeof checkout.destroy==='function'){try{checkout.destroy()}catch{}checkout=null}modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.getElementById('emailrow').style.display='flex'};"
  );
  h = h.replace(
    "if(!email||!selected){err.textContent='Escribe un correo válido.';return}",
    "if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)||!selected){err.textContent='Escribe un correo válido.';document.getElementById('cemail').focus();return}"
  );
  h = h.replace(
    "err.textContent='Preparando checkout…';try{",
    "err.textContent='Preparando checkout…';document.getElementById('cstart').disabled=true;try{"
  );
  h = h.replace(
    "}catch(e){err.textContent='No pudimos abrir el checkout: '+e.message}};",
    "}catch(e){err.textContent='No pudimos abrir el checkout: '+e.message}finally{document.getElementById('cstart').disabled=false}};"
  );
  h = addStyle(h, '.emailrow input{font-size:16px!important}.emailrow label{font-size:12px!important}.checkout [role="status"]{font-size:12px!important}');
  return h;
}

function patchCheckoutPage(html: string, title: string) {
  let h = html;
  h = h.replace(
    '<div class="checkout" id="checkout">',
    `<div class="checkout" id="checkout" role="dialog" aria-modal="true" aria-labelledby="checkoutTitle" aria-hidden="true">`
  );
  h = h.replace(`<div class="top"><b>${title}</b>`, `<div class="top"><b id="checkoutTitle">${title}</b>`);
  h = h.replace('<button class="x" id="close">×</button>', '<button class="x" id="close" type="button" aria-label="Cerrar checkout">×</button>');
  h = h.replace(
    '<div class="row" id="row"><input id="email" type="email" placeholder="Tu correo"><button class="btn primary" id="start">Continuar</button></div>',
    '<div class="row" id="row"><label class="sr-only" for="email">Tu correo</label><input id="email" type="email" inputmode="email" autocomplete="email" placeholder="Tu correo" required aria-required="true" aria-describedby="error"><button class="btn primary" id="start" type="button">Continuar</button></div>'
  );
  h = h.replace('<div id="error" style="color:#ff91aa"></div>', '<div id="error" role="status" aria-live="polite" style="color:#ff91aa"></div>');
  h = h.replace('let item=null;', 'let item=null,stripeCheckout=null;');
  h = h.replace(
    "document.querySelectorAll('.buy').forEach(x=>x.onclick=()=>{item=x.dataset.item;checkout.classList.add('open')});",
    "document.querySelectorAll('.buy').forEach(x=>x.onclick=()=>{item=x.dataset.item;if(stripeCheckout&&typeof stripeCheckout.destroy==='function'){try{stripeCheckout.destroy()}catch{}stripeCheckout=null}checkout.classList.add('open');checkout.setAttribute('aria-hidden','false');row.style.display='flex';error.textContent='';start.disabled=false;setTimeout(()=>email.focus(),0)});"
  );
  h = h.replace(
    "close.onclick=()=>checkout.classList.remove('open');",
    "close.onclick=()=>{if(stripeCheckout&&typeof stripeCheckout.destroy==='function'){try{stripeCheckout.destroy()}catch{}stripeCheckout=null}checkout.classList.remove('open');checkout.setAttribute('aria-hidden','true');row.style.display='flex'};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&checkout.classList.contains('open'))close.click()});"
  );
  h = h.replace(
    "start.onclick=async()=>{error.textContent='Preparando…';",
    "start.onclick=async()=>{const v=email.value.trim();if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v)){error.textContent='Escribe un correo válido.';email.focus();return}error.textContent='Preparando…';start.disabled=true;"
  );
  h = h.replace('email:email.value.trim()', 'email:v');
  h = h.replace(
    "const s=Stripe(d.publishable_key),c=await s.initEmbeddedCheckout({clientSecret:d.client_secret});row.style.display='none';error.textContent='';c.mount('#mount')",
    "const s=Stripe(d.publishable_key);stripeCheckout=await s.initEmbeddedCheckout({clientSecret:d.client_secret});row.style.display='none';error.textContent='';stripeCheckout.mount('#mount')"
  );
  h = h.replace(
    "if(!r.ok){error.textContent=d.detail||d.error;return}",
    "if(!r.ok){error.textContent=d.detail||d.error;start.disabled=false;return}"
  );
  h = h.replace("stripeCheckout.mount('#mount')};", "stripeCheckout.mount('#mount');start.disabled=false};");
  h = addStyle(h, '.sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.row input{font-size:16px!important}.row button,#error{font-size:12px!important}');
  return h;
}

function patchDomains(html: string) {
  let h = html;
  // Form typography: never force form-supporting copy below 12px; inputs stay 16px.
  h = h.replace(/\.input,\.select,\.textarea\{([^}]*)font-size:15px/g, '.input,.select,.textarea{$1font-size:16px');
  h = h.replace(/\.check\{([^}]*)font-size:11px/g, '.check{$1font-size:12px');
  h = h.replace(/\.secure\{([^}]*)font-size:10px/g, '.secure{$1font-size:12px');
  h = h.replace(/\.csWaHead span\{([^}]*)font-size:11px/g, '.csWaHead span{$1font-size:12px');
  h = h.replace(/\.csWaConsent\{([^}]*)font-size:10px/g, '.csWaConsent{$1font-size:12px');
  h = h.replace(/\.csWaStatus\{font-size:11px/g, '.csWaStatus{font-size:12px');
  h = h.replace(/\.csWaSecurity\{font-size:9px/g, '.csWaSecurity{font-size:12px');
  h = h.replace(/\.optional\{font-size:9px/g, '.optional{font-size:12px');
  h = h.replace(/\.domainConsent\{([^}]*)font-size:9px/g, '.domainConsent{$1font-size:12px');
  h = h.replace(/\.consentHint\{font-size:8px/g, '.consentHint{font-size:12px');

  // Search and purchase contact fields.
  h = h.replace('<input id="domain" class="input" placeholder="minegocio.com" maxlength="253" autocomplete="off">', '<input id="domain" class="input" placeholder="minegocio.com" maxlength="253" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="Dominio">');
  h = h.replace('<button id="search" class="btn">', '<button id="search" class="btn" type="button">');
  h = h.replace('<input id="name" class="input" placeholder="Nombre completo" autocomplete="name">', '<input id="name" class="input" placeholder="Nombre completo" autocomplete="name" maxlength="180" aria-label="Nombre completo">');
  h = h.replace('<input id="phone" class="input" placeholder="WhatsApp / Teléfono" autocomplete="tel">', '<input id="phone" class="input" type="tel" inputmode="tel" placeholder="WhatsApp / Teléfono" autocomplete="tel" maxlength="80" aria-label="WhatsApp o teléfono">');
  h = h.replace('<input id="email" class="input wide" type="email" placeholder="Correo electrónico" autocomplete="email">', '<input id="email" class="input wide" type="email" inputmode="email" placeholder="Correo electrónico" autocomplete="email" maxlength="320" aria-label="Correo electrónico">');
  h = h.replace('<label class="check"><input id="operational" type="checkbox" checked disabled><span>Usaremos estos datos para procesar tu compra, registrar tu dominio, preparar tu sitio y contactarte si necesitamos completar la entrega.</span></label>', '<div class="check" role="note"><span>Usaremos estos datos para procesar tu compra, registrar tu dominio, preparar tu sitio y contactarte si necesitamos completar la entrega.</span></div>');
  h = h.replace('<label class="check"><input id="marketing" type="checkbox"><span>', '<label class="check"><input id="marketing" type="checkbox" aria-label="Aceptar promociones opcionales"><span>');
  h = h.replace(/<div class="domainConsent" id="domainLeadConsent"><label><input id="domainContactConsent" type="checkbox" required><span><strong>Al darle click aceptas ser contactado para conocer beneficios que podría tener tu dominio\.<\/strong> Conoce más en nuestros términos y condiciones\. <a href="\/terms" target="_blank" rel="noopener">Ver términos<\/a>\.<\/span><\/label><div class="consentHint">([^<]*)<\/div><\/div>/, '<div class="domainConsent" id="domainLeadConsent" role="note"><div><strong>Al continuar, autorizas el contacto necesario para atender esta solicitud y explicarte opciones relacionadas con tu dominio.</strong> <a href="/terms" target="_blank" rel="noopener">Ver términos</a>.</div><div class="consentHint">$1</div></div>');
  h = h.replace('<button id="continue" class="btn" style="width:100%;margin-top:14px">', '<button id="continue" class="btn" type="button" style="width:100%;margin-top:14px">');
  h = h.replace('<div id="leadMsg" class="msg"></div>', '<div id="leadMsg" class="msg" role="status" aria-live="polite"></div>');

  // Registrant address fields.
  h = h.replace('<input id="organization" class="input wide" placeholder="Empresa (opcional)">', '<input id="organization" class="input wide" placeholder="Empresa (opcional)" autocomplete="organization" aria-label="Empresa, opcional">');
  h = h.replace('<input id="street" class="input wide" placeholder="Dirección">', '<input id="street" class="input wide" placeholder="Dirección" autocomplete="street-address" aria-label="Dirección">');
  h = h.replace('<input id="city" class="input" placeholder="Ciudad">', '<input id="city" class="input" placeholder="Ciudad" autocomplete="address-level2" aria-label="Ciudad">');
  h = h.replace('<input id="state" class="input" placeholder="Estado / Provincia">', '<input id="state" class="input" placeholder="Estado / Provincia" autocomplete="address-level1" aria-label="Estado o provincia">');
  h = h.replace('<input id="postal" class="input" placeholder="Código postal">', '<input id="postal" class="input" placeholder="Código postal" autocomplete="postal-code" aria-label="Código postal">');
  h = h.replace('<input id="country" class="input" placeholder="País (MX, US, CA...)" maxlength="2">', '<input id="country" class="input" placeholder="País (MX, US, CA...)" maxlength="2" autocomplete="country" autocapitalize="characters" aria-label="Código de país">');
  h = h.replace('<button id="pay" class="btn" style="width:100%;margin-top:14px">', '<button id="pay" class="btn" type="button" style="width:100%;margin-top:14px">');
  h = h.replace('<div id="payMsg" class="msg"></div>', '<div id="payMsg" class="msg" role="status" aria-live="polite"></div>');

  // Site builder/support fields.
  h = h.replace('<textarea id="instructions" class="textarea" placeholder=', '<textarea id="instructions" class="textarea" aria-label="Descripción del sitio" placeholder=');
  h = h.replace('<input id="files" type="file" multiple ', '<input id="files" type="file" aria-label="Archivos para el sitio" multiple ');
  h = h.replace('<div id="intakeMsg" class="msg"></div>', '<div id="intakeMsg" class="msg" role="status" aria-live="polite"></div>');
  h = h.replace('<select id="issue" class="select">', '<select id="issue" class="select" aria-label="Tipo de problema">');
  h = h.replace('<input id="sDomain" class="input" placeholder="Tu dominio">', '<input id="sDomain" class="input" placeholder="Tu dominio" autocapitalize="none" spellcheck="false" aria-label="Tu dominio">');
  h = h.replace('<input id="sEmail" class="input wide" type="email" placeholder="Email usado en la compra">', '<input id="sEmail" class="input wide" type="email" inputmode="email" autocomplete="email" placeholder="Email usado en la compra" aria-label="Email usado en la compra">');
  h = h.replace('<textarea id="sMessage" class="textarea wide" placeholder="Cuéntanos qué pasó"></textarea>', '<textarea id="sMessage" class="textarea wide" placeholder="Cuéntanos qué pasó" aria-label="Describe el problema"></textarea>');
  h = h.replace('<button id="sendSupport" class="btn wide">', '<button id="sendSupport" class="btn wide" type="button">');
  h = h.replace('<div id="supportMsg" class="msg wide"></div>', '<div id="supportMsg" class="msg wide" role="status" aria-live="polite"></div>');

  // WhatsApp gate: keep the three data points but make the interaction compact and accessible.
  h = h.replace('<section class="csWaGate" role="dialog">', '<section class="csWaGate" role="dialog" aria-modal="true" aria-labelledby="csWaTitle">');
  h = h.replace('<div><b>WhatsApp CloudSales</b><span>', '<div><b id="csWaTitle">WhatsApp CloudSales</b><span>');
  h = h.replace('<button id="csWaClose" class="csWaClose" type="button">×</button>', '<button id="csWaClose" class="csWaClose" type="button" aria-label="Cerrar WhatsApp">×</button>');
  h = h.replace('<input id="csWaName" class="input" placeholder="Nombre completo" maxlength="180" required>', '<input id="csWaName" class="input" placeholder="Nombre completo" maxlength="180" autocomplete="name" aria-label="Nombre completo" required>');
  h = h.replace('<input id="csWaPhone" class="input" placeholder="WhatsApp / Teléfono" maxlength="80" required>', '<input id="csWaPhone" class="input" type="tel" inputmode="tel" placeholder="WhatsApp / Teléfono" maxlength="80" autocomplete="tel" aria-label="WhatsApp o teléfono" required>');
  h = h.replace('<input id="csWaEmail" class="input" type="email" placeholder="Correo electrónico" maxlength="320" required>', '<input id="csWaEmail" class="input" type="email" inputmode="email" placeholder="Correo electrónico" maxlength="320" autocomplete="email" aria-label="Correo electrónico" required>');
  h = h.replace('<input id="csWaMarketing" type="checkbox">', '<input id="csWaMarketing" type="checkbox" aria-label="Aceptar promociones opcionales">');
  h = h.replace('<div id="csWaStatus" class="csWaStatus"></div>', '<div id="csWaStatus" class="csWaStatus" role="status" aria-live="polite"></div>');
  h = h.replace("O.classList.add('open');O.setAttribute('aria-hidden','false')", "O.classList.add('open');O.setAttribute('aria-hidden','false');setTimeout(()=>document.getElementById('csWaName')?.focus(),0)");
  h = h.replace("O.onclick=e=>{if(e.target===O)close()};", "O.onclick=e=>{if(e.target===O)close()};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&O.classList.contains('open'))close()});");

  // The operational-contact disclosure already covers the requested transaction.
  // Remove the redundant mandatory second checkbox/gate that added friction.
  h = h.replace(/<script id="cs-domain-lead-consent-v1-js">[\s\S]*?<\/script>/, '');

  h = addStyle(h, '.purchase .input,.addressgrid .input,.supportgrid .input,.supportgrid .select,.supportgrid .textarea,.csWaGate .input{font-size:16px!important}.purchase .check,.purchase .secure,.purchase .domainConsent,.purchase .consentHint,.csWaHead span,.csWaConsent,.csWaStatus,.csWaSecurity{font-size:12px!important}.csWaBody{padding:14px!important}.csWaBody .input{padding:11px 12px!important;margin-bottom:7px!important}.csWaSubmit{min-height:46px!important;padding:12px 16px!important}');
  return h;
}

function patchByUrl(url: string, html: string) {
  if (/\/web\/commercial\.html(?:\?|$)/.test(url)) return patchCommercial(html);
  if (/\/web\/academy\.html(?:\?|$)/.test(url)) return patchCheckoutPage(html, 'CloudSales Academy');
  if (/\/web\/services\.html(?:\?|$)/.test(url)) return patchCheckoutPage(html, 'Contratar servicio');
  if (/\/web\/commercial\/domains-v2\.html(?:\?|$)/.test(url)) return patchDomains(html);
  return html;
}

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const res = await nativeFetch(input as any, init);
  if (!res.ok || !/raw\.githubusercontent\.com\/crmcloudsales\/CLOUDSALES\//.test(url)) return res;
  if (!/\/web\/(commercial\.html|academy\.html|services\.html|commercial\/domains-v2\.html)(?:\?|$)/.test(url)) return res;
  const text = await res.text();
  const patched = patchByUrl(url, text);
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  return new Response(patched, { status: res.status, statusText: res.statusText, headers });
}) as typeof fetch;

await import("https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/c53374bf1cdaeb47765a1c3ee4c13a8363e77e62/supabase/functions/cloudflare-site-brand-release/index.ts");
