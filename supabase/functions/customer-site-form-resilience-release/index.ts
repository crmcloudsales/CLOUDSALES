import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// CloudSales customer-site form resilience + release gate.
// Turnstile is an additional verified signal, never a single point of failure.
// Any lead page using the common provisioner must satisfy the form contract before
// its source is allowed to reach the deployment function.
const nativeFetch=globalThis.fetch.bind(globalThis);
const RAW='/web/clients/';

function patchLanding(x:string){
  x=x.replaceAll("appearance:'always'","appearance:'interaction-only'")
     .replaceAll('appearance:"always"','appearance:"interaction-only"')
     .replace(/data-appearance=["']always["']/gi,'data-appearance="interaction-only"');

  x=x.replace(
    "if(!token){statusEl.className='status err';statusEl.textContent='Completa la verificación de seguridad.';btn.disabled=false;return}",
    ""
  );
  x=x.replace("if(!ts){show('Completa la verificación de seguridad.',false);return}","");
  x=x.replace("if(!turnToken){show('Completa la verificación de seguridad.',false);return}","");

  // Standard identity contract for every customer lead form.
  x=x.replace(/(<input\b[^>]*(?:id|name)=["'](?:name|first|first_name)["'][^>]*)(>)/gi,(m,a,b)=>/\brequired\b/i.test(a)?m:a+' required'+b);
  x=x.replace(/(<input\b[^>]*(?:id|name)=["'](?:phone|telephone)["'][^>]*)(>)/gi,(m,a,b)=>/\brequired\b/i.test(a)?m:a+' required'+b);
  x=x.replace(/(<input\b[^>]*(?:id|name)=["']email["'][^>]*)(>)/gi,(m,a,b)=>/\brequired\b/i.test(a)?m:a+' required'+b);
  x=x.replace(/Phone\s*\/\s*Teléfono\s*\(optional\)/gi,'Phone / Teléfono');
  return x;
}

function fieldRequired(x:string,names:string[]){
  return names.some(n=>new RegExp(`<input\\b[^>]*(?:id|name)=["']${n}["'][^>]*\\brequired\\b|<input\\b[^>]*\\brequired\\b[^>]*(?:id|name)=["']${n}["']`,'i').test(x));
}

function assertLandingContract(x:string){
  const hasLeadForm=/id=["']leadForm["']/i.test(x);
  if(!hasLeadForm)return;
  const checks={
    submit:/<button\b[^>]*type=["']submit["']|<input\b[^>]*type=["']submit["']/i.test(x),
    name_required:fieldRequired(x,['name','first','first_name']),
    phone_required:fieldRequired(x,['phone','telephone']),
    email_required:fieldRequired(x,['email']),
    no_turnstile_required:!x.includes('turnstile_required'),
    no_hard_security_copy:!/Completa la verificación de seguridad|Complete the security verification/i.test(x),
    no_appearance_always:!/(?:appearance\s*:\s*['"]always['"]|data-appearance=["']always["'])/i.test(x)
  };
  const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
  if(failed.length)throw new Error('form_qa_contract_failed_'+failed.join(','));
}

function optionalVerifyBlock(kind:'clean'|'string'){
  const tok=kind==='clean'?"clean(b.turnstile_token,2048)":"String(b.turnstile_token||\"\").trim().slice(0,2048)";
  return `const turnstileToken=${tok};let turnstileOk=false,turnstileChecked=false;\n if(turnstileToken){turnstileChecked=true;try{const tr=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:turnstileToken,remoteip:ip})});const td=await tr.json();turnstileOk=td?.success===true&&(!td?.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase())}catch{}if(!turnstileOk)return json({message:"No pudimos validar la seguridad. Intenta nuevamente."},422);}`;
}

function patchWorker(x:string){
  x=x.replaceAll("appearance:'always'","appearance:'interaction-only'")
     .replaceAll('appearance:"always"','appearance:"interaction-only"');

  const numa=`const turnstileToken=clean(b.turnstile_token,2048);if(!turnstileToken)return json({message:'Completa la verificación de seguridad.'},422);\n let turnstileOk=false;try{const tr=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:turnstileToken,remoteip:ip})});const td=await tr.json();turnstileOk=td?.success===true&&(!td?.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase())}catch{}\n if(!turnstileOk)return json({message:'No pudimos validar la verificación de seguridad.'},422);`;
  if(x.includes(numa))x=x.replace(numa,optionalVerifyBlock('clean').replaceAll('"',"'"));

  const senzik=`const token=clean(b.turnstile_token,2048);if(!token)return json({message:'Completa la verificación de seguridad.'},422);\n    let turnstileOk=false;\n    try{const tr=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:token,remoteip:req.headers.get('CF-Connecting-IP')||''})});const td=await tr.json();turnstileOk=td&&td.success===true&&(!td.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase())}catch{}\n    if(!turnstileOk)return json({message:'No pudimos validar la verificación de seguridad.'},422);`;
  if(x.includes(senzik))x=x.replace(senzik,`const turnstileToken=clean(b.turnstile_token,2048);let turnstileOk=false,turnstileChecked=false;\n    if(turnstileToken){turnstileChecked=true;try{const tr=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:turnstileToken,remoteip:req.headers.get('CF-Connecting-IP')||''})});const td=await tr.json();turnstileOk=td&&td.success===true&&(!td.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase())}catch{}if(!turnstileOk)return json({message:'No pudimos validar la seguridad. Intenta nuevamente.'},422);}`);

  x=x.replace(
    'const passed=await turnstile(env,clean(b.turnstile_token,3000),ip);if(!passed)return json({error:"turnstile_failed"},403);',
    'const turnstileToken=clean(b.turnstile_token,3000),passed=turnstileToken?await turnstile(env,turnstileToken,ip):false;if(turnstileToken&&!passed)return json({error:"turnstile_failed"},403);'
  );

  if(!x.includes('siteverify')){
    const a='const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=String(b.website||"").trim()!=="";';
    const b=' const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=clean(b.website,300)!=="";';
    if(x.includes(a))x=x.replace(a,a+'\n '+optionalVerifyBlock('string'));
    else if(x.includes(b))x=x.replace(b,b+'\n '+optionalVerifyBlock('clean'));
  }

  x=x.replaceAll('turnstile:true','turnstile:(typeof turnstileOk!=="undefined"?turnstileOk:(typeof passed!=="undefined"?passed:false))');
  x=x.replace(
    'if(candidateName.length<2||(!candidateEmail&&!candidatePhone))return json({error:"contact_required"},400);',
    'if(candidateName.length<2||candidatePhone.replace(/\\D/g,"").length<8||!candidateEmail)return json({error:"contact_required"},400);'
  );

  // Server contract: no missing-token hard gate may survive the patch.
  if(/if\s*\(\s*!\s*(?:turnstileToken|token|turnToken|ts)\s*\)[\s\S]{0,180}(?:verification|verificación|turnstile_required)/i.test(x))throw new Error('server_form_qa_hard_turnstile_gate');
  if(x.includes('turnstile_required'))throw new Error('server_form_qa_turnstile_required');
  return x;
}

globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  const res=await nativeFetch(input as any,init);
  if(!res.ok||!url.includes(RAW))return res;
  let text=await res.text();
  if(/\/landing-edge\.html(?:\?|$)/.test(url)){
    text=patchLanding(text);
    assertLandingContract(text);
  }else if(/\/worker-edge-template\.mjs(?:\?|$)/.test(url)){
    text=patchWorker(text);
  }
  const headers=new Headers(res.headers);headers.delete('content-length');
  return new Response(text,{status:res.status,statusText:res.statusText,headers});
}) as typeof fetch;

await import("https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/eafd8ce3fad9cd93441dc23ddd28bc18af249f99/supabase/functions/customer-site-provision/index.ts");
