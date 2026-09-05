import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// CloudSales customer-site form resilience + release gate.
// Security-provider uncertainty must not erase plausible human intent.
// Each site keeps its own business-field requirements; shared lead-intake owns
// the final ACCEPT / REVIEW / REJECT decision.
const nativeFetch=globalThis.fetch.bind(globalThis);
const RAW='/web/clients/';

function patchLanding(x:string){
  x=x.replaceAll("appearance:'always'","appearance:'interaction-only'")
     .replaceAll('appearance:"always"','appearance:"interaction-only"')
     .replace(/data-appearance=["']always["']/gi,'data-appearance="interaction-only"');

  // Remove client-side hard dependency on Turnstile. The token is still sent
  // whenever available and verified server-side.
  x=x.replace("if(!token){statusEl.className='status err';statusEl.textContent='Completa la verificación de seguridad.';btn.disabled=false;return}","");
  x=x.replace("if(!ts){show('Completa la verificación de seguridad.',false);return}","");
  x=x.replace("if(!turnToken){show('Completa la verificación de seguridad.',false);return}","");
  x=x.replace("if(!token){msg(body.classList.contains('es')?'Completa la verificación de seguridad.':'Complete the security verification.',false);return}","");

  // Senzik: REVIEW is a successful durable capture, but do not unlock the
  // optional WhatsApp continuation until ACCEPTED.
  const senzikSuccess="if(!r.ok)throw new Error(d.message||'No pudimos enviar tus datos.');show('Gracias. Recibimos tus datos correctamente.',true);wa.href=d.whatsapp_url||wa.href;wa.classList.add('show');form.reset();turnToken='';if(window.turnstile&&widgetId!==null)window.turnstile.reset(widgetId)";
  const senzikReview="if(!r.ok)throw new Error(d.message||'No pudimos enviar tus datos.');if(d.status==='review'){show(d.message||'Gracias. Recibimos tus datos y los estamos verificando.',true);wa.classList.remove('show');form.reset();turnToken='';if(window.turnstile&&widgetId!==null)window.turnstile.reset(widgetId);return}show('Gracias. Recibimos tus datos correctamente.',true);wa.href=d.whatsapp_url||wa.href;wa.classList.add('show');form.reset();turnToken='';if(window.turnstile&&widgetId!==null)window.turnstile.reset(widgetId)";
  if(x.includes(senzikSuccess))x=x.replace(senzikSuccess,senzikReview);

  return x;
}
function fieldExists(x:string,names:string[]){return names.some(n=>new RegExp(`<input\\b[^>]*(?:id|name)=["']${n}["']`,'i').test(x))}
function assertLandingContract(x:string){
  const hasLeadForm=/id=["']leadForm["']/i.test(x);if(!hasLeadForm)return;
  const checks={
    submit:/<button\b[^>]*type=["']submit["']|<input\b[^>]*type=["']submit["']/i.test(x),
    name_field:fieldExists(x,['name','first','first_name']),
    contact_field:fieldExists(x,['phone','telephone','email']),
    no_turnstile_required:!x.includes('turnstile_required'),
    no_hard_security_copy:!/Completa la verificación de seguridad|Complete the security verification/i.test(x),
    no_appearance_always:!/(?:appearance\s*:\s*['"]always['"]|data-appearance=["']always["'])/i.test(x)
  };
  const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
  if(failed.length)throw new Error('form_qa_contract_failed_'+failed.join(','));
}
function optionalVerifyBlock(kind:'clean'|'string'){
  const tok=kind==='clean'?"clean(b.turnstile_token,2048)":"String(b.turnstile_token||\"\").trim().slice(0,2048)";
  return `const turnstileToken=${tok};let turnstileOk=false,turnstileChecked=false;\n if(turnstileToken){turnstileChecked=true;try{const tr=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:turnstileToken,remoteip:ip})});const td=await tr.json();turnstileOk=td?.success===true&&(!td?.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase())}catch{turnstileOk=false}}`;
}
function patchWorker(x:string){
  x=x.replaceAll("appearance:'always'","appearance:'interaction-only'").replaceAll('appearance:"always"','appearance:"interaction-only"');

  const numa=`const turnstileToken=clean(b.turnstile_token,2048);if(!turnstileToken)return json({message:'Completa la verificación de seguridad.'},422);\n let turnstileOk=false;try{const tr=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:turnstileToken,remoteip:ip})});const td=await tr.json();turnstileOk=td?.success===true&&(!td?.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase())}catch{}\n if(!turnstileOk)return json({message:'No pudimos validar la verificación de seguridad.'},422);`;
  if(x.includes(numa))x=x.replace(numa,optionalVerifyBlock('clean').replaceAll('"',"'"));

  const acanto=`const turnstileToken=clean(b.turnstile_token,2048);if(!turnstileToken)return json({message:'Please complete the security verification.'},422);\n let turnstileOk=false;try{const tr=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:turnstileToken,remoteip:ip})});const td=await tr.json();turnstileOk=td?.success===true&&(!td?.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase())}catch{}\n if(!turnstileOk)return json({message:'Security verification failed.'},422);`;
  if(x.includes(acanto))x=x.replace(acanto,optionalVerifyBlock('clean').replaceAll('"',"'"));

  const senzik=`const token=clean(b.turnstile_token,2048);if(!token)return json({message:'Completa la verificación de seguridad.'},422);\n    let turnstileOk=false;\n    try{const tr=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:token,remoteip:req.headers.get('CF-Connecting-IP')||''})});const td=await tr.json();turnstileOk=td&&td.success===true&&(!td.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase())}catch{}\n    if(!turnstileOk)return json({message:'No pudimos validar la verificación de seguridad.'},422);`;
  if(x.includes(senzik))x=x.replace(senzik,`const turnstileToken=clean(b.turnstile_token,2048);let turnstileOk=false,turnstileChecked=false;\n    if(turnstileToken){turnstileChecked=true;try{const tr=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:turnstileToken,remoteip:req.headers.get('CF-Connecting-IP')||''})});const td=await tr.json();turnstileOk=td&&td.success===true&&(!td.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase())}catch{turnstileOk=false}}`);

  x=x.replace('const passed=await turnstile(env,clean(b.turnstile_token,3000),ip);if(!passed)return json({error:"turnstile_failed"},403);','const turnstileToken=clean(b.turnstile_token,3000),passed=turnstileToken?await turnstile(env,turnstileToken,ip):false;');

  if(!x.includes('siteverify')){
    const a='const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=String(b.website||"").trim()!=="";';
    const bb=' const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=clean(b.website,300)!=="";';
    if(x.includes(a))x=x.replace(a,a+'\n '+optionalVerifyBlock('string'));
    else if(x.includes(bb))x=x.replace(bb,bb+'\n '+optionalVerifyBlock('clean'));
  }

  x=x.replaceAll('turnstile:true','turnstile:(typeof turnstileOk!=="undefined"?turnstileOk:(typeof passed!=="undefined"?passed:false))');

  // Let the shared intake decide REVIEW vs REJECT for contradictory contact data
  // instead of dropping a plausible human at the site Worker.
  x=x.replace('if(candidateName.length<2||(!candidateEmail&&!candidatePhone))return json({error:"contact_required"},400);','if(!candidateEmail&&!candidatePhone)return json({error:"contact_required"},400);');
  x=x.replace('if(candidateEmail&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(candidateEmail))return json({error:"invalid_email"},400);','');
  x=x.replace("if(first.length<2||!validEmail(em))return json({message:'Please check your name and email.'},422);","");
  x=x.replace("if(phone&&phone.replace(/\\D/g,'').length<8)return json({message:'Please check the phone number or leave it blank.'},422);","");

  if(/if\s*\(\s*!\s*(?:turnstileToken|token|turnToken|ts|turnstileOk|passed)\s*\)[\s\S]{0,220}(?:verification|verificación|turnstile_failed|turnstile_required)/i.test(x))throw new Error('server_form_qa_hard_turnstile_gate');
  if(x.includes('turnstile_required'))throw new Error('server_form_qa_turnstile_required');
  return x;
}

globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  let url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  let requestInput:any=input;
  if(url.includes('/web/clients/acanto/landing-edge.html')){url=url.replace('/landing-edge.html','/landing-v2.html');requestInput=url}
  const res=await nativeFetch(requestInput as any,init);
  if(!res.ok||!url.includes(RAW))return res;
  let text=await res.text();
  if(/\/landing-(?:edge|v2)\.html(?:\?|$)/.test(url)){text=patchLanding(text);assertLandingContract(text)}
  else if(/\/worker-edge-template\.mjs(?:\?|$)/.test(url)){text=patchWorker(text)}
  const headers=new Headers(res.headers);headers.delete('content-length');
  return new Response(text,{status:res.status,statusText:res.statusText,headers})
}) as typeof fetch;

await import("https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/eafd8ce3fad9cd93441dc23ddd28bc18af249f99/supabase/functions/customer-site-provision/index.ts");
