(() => {
  'use strict';
  const PRO_RENEW_LINK='https://buy.stripe.com/9B6dR12RWdJa0an3nJ6sw0f';
  const EXTRA_MEMBER_LINK='https://buy.stripe.com/dRmbITgIM6gI9KXbUf6sw0g';
  let overlay=null,lastKey='';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>`US$${Number(v||97).toFixed(0)}`;
  function billing(){
    if(typeof currentOrg==='undefined'||!currentOrg)return null;
    const m=currentOrg.member_access||null;
    if(m&&(m.gate_required||m.payment_required)){
      let entitlementId=m.entitlement_id||null;
      if(!entitlementId&&Array.isArray(currentOrg.members)&&m.member_id){entitlementId=currentOrg.members.find(x=>x.member_id===m.member_id)?.id||null;}
      return {...m,entitlement_id:entitlementId,_kind:'member'};
    }
    const b=currentOrg.billing_access||currentOrg.subscription||null;
    return b?{...b,_kind:'organization'}:null;
  }
  function required(b){return !!(b&&(b.gate_required||b.locked||b.payment_required));}
  function fmtDate(v){if(!v)return'';try{return new Intl.DateTimeFormat('es-MX',{dateStyle:'long',timeStyle:'short',timeZone:'America/Cancun'}).format(new Date(v));}catch{return String(v)}}
  function injectCss(){if(document.getElementById('csBillingGateCss'))return;const s=document.createElement('style');s.id='csBillingGateCss';s.textContent=`
    #csBillingGate{position:fixed;inset:0;z-index:2147483000;background:#08070D;display:grid;place-items:center;padding:18px;overflow:auto;color:#F3F4F8;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
    #csBillingGate .box{width:min(620px,100%);background:linear-gradient(180deg,#121019,#0B0910);border:1px solid #37323F;border-radius:26px;box-shadow:0 40px 120px #000b;overflow:hidden}
    #csBillingGate .accent{height:5px;background:linear-gradient(90deg,#F955B6,#C13BE4)}
    #csBillingGate .inner{padding:28px}#csBillingGate .brand{display:flex;justify-content:center;margin-bottom:22px}#csBillingGate .brand img{width:190px;max-width:70%;height:auto;display:block}
    #csBillingGate .eyebrow{font-size:11px;letter-spacing:.1em;color:#F955B6;font-weight:900;text-transform:uppercase;margin-bottom:8px}
    #csBillingGate h1{font-size:clamp(28px,6vw,40px);line-height:1.04;letter-spacing:-.04em;margin:0 0 14px}#csBillingGate p{color:#C9C6D2;line-height:1.55;margin:0 0 14px;font-size:15px}
    #csBillingGate .notice{border:1px solid #37323F;background:#17141F;border-radius:15px;padding:13px 14px;margin:16px 0;font-size:13px;color:#F3F4F8;line-height:1.5}
    #csBillingGate .cta{width:100%;border:0;border-radius:999px;background:linear-gradient(135deg,#F955B6,#C13BE4);color:#fff;padding:14px 18px;font-size:15px;font-weight:900;cursor:pointer;box-shadow:0 12px 34px #F955B633}
    #csBillingGate .cta[disabled]{opacity:.55;cursor:wait}#csBillingGate .small{font-size:11px;color:#AAA7B2;text-align:center;margin-top:12px}
  `;document.head.appendChild(s)}
  function remove(){overlay?.remove();overlay=null;lastKey=''}
  function ensure(b){
    injectCss();const org=typeof currentOrg!=='undefined'?currentOrg:null;if(!org||!required(b)){remove();return}
    const isAdditional=b._kind==='member'&&b.member_type==='additional';
    const amount=money(isAdditional?(b.price_usd||47):(b.price_usd||b.amount_usd||97)),due=fmtDate(b.current_period_end),key=`${org.id}:${b._kind}:${b.status||''}:${b.member_type||''}:${b.payment_required?1:0}:${b.locked?1:0}:${due}`;
    if(overlay&&key===lastKey)return;remove();lastKey=key;overlay=document.createElement('div');overlay.id='csBillingGate';
    const title=isAdditional?'Activa tu Member ID':'Renueva tu acceso a CloudSales';
    const copy=isAdditional?`Tu Member ID adicional en ${esc(org.name||'CloudSales')} requiere el pago de ${amount} cada 30 días. Puedes pagarlo tú mismo o un administrador puede patrocinar tu membresía.`:`Tu periodo actual terminó. Para continuar usando CloudSales y el CRM de tu organización, completa la renovación de ${amount}. Al pagar, Stripe guardará de forma segura tu método de pago para las siguientes renovaciones.`;
    const button=isAdditional?`Pagar ${amount} y activar mi Member ID`:`Renovar por ${amount}`;
    overlay.innerHTML=`<div class="box"><div class="accent"></div><div class="inner"><div class="brand"><img src="/cloudsales-logo-official-v2.png" alt="CloudSales"></div><div class="eyebrow">${esc(org.name||'CloudSales')} · ${isAdditional?'Member ID adicional':'Membresía principal'}</div><h1>${title}</h1><p>${copy}</p>${due?`<div class="notice"><b>Fecha de renovación:</b> ${esc(due)}</div>`:''}<button class="cta" id="csBillingStart">${button}</button><div class="small">El pago y la tarjeta son procesados de forma segura por Stripe. CloudSales no almacena los datos de tu tarjeta.</div></div></div>`;
    document.body.appendChild(overlay);overlay.querySelector('#csBillingStart').onclick=start;
  }
  function paymentUrl(base,reference){
    const u=new URL(base),email=String((typeof session!=='undefined'&&session?.user?.email)||'').trim();
    if(email)u.searchParams.set('prefilled_email',email);
    if(reference)u.searchParams.set('client_reference_id',reference);
    return u.toString();
  }
  async function start(){
    const b=billing(),org=typeof currentOrg!=='undefined'?currentOrg:null,btn=overlay?.querySelector('#csBillingStart');if(!b||!org)return;
    const isAdditional=b._kind==='member'&&b.member_type==='additional';
    if(btn){btn.disabled=true;btn.textContent='Abriendo Stripe…'}
    if(isAdditional){
      if(!b.entitlement_id){if(btn){btn.disabled=false;btn.textContent=`Pagar ${money(b.price_usd||47)} y activar mi Member ID`}return}
      location.href=paymentUrl(EXTRA_MEMBER_LINK,`csmember:${b.entitlement_id}:self`);return;
    }
    location.href=paymentUrl(PRO_RENEW_LINK,`csorg:${org.id}`);
  }
  async function refreshAfterReturn(){const q=new URL(location.href).searchParams;if(!q.has('billing')&&!q.has('member_billing'))return;for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,i?1800:400));try{if(typeof loadState==='function')await loadState();const b=billing();if(!b||!required(b)){history.replaceState({},'',location.pathname);remove();return}}catch{}}}
  function tick(){const b=billing();if(!b||!required(b)){remove();return}ensure(b)}
  window.addEventListener('load',()=>{setInterval(tick,700);setTimeout(tick,200);refreshAfterReturn()});
})();