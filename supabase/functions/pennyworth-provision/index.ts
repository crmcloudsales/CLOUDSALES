import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CF='https://api.cloudflare.com/client/v4';
const ACCOUNT='bd94cb0580e86e7f40b4271a03052426';
const ZONE='44753df079f42f8995124c358b135597';
const HOST='pennyworth.cloudsales.app';
const WORKER='pennyworth-lead-gateway';
const GATE_ID='7639cce3-e0aa-487e-884e-d836fdc149c1';
const ORG_ID='aa710269-ee4b-40f3-ac30-d9c1a44fe3f5';
const TURNSTILE_SITEKEY='0x4AAAAAAEiK97f4nFyAgMYx';
const SB=Deno.env.get('SUPABASE_URL')!;
const SR=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const svc=createClient(SB,SR,{auth:{persistSession:false,autoRefreshToken:false}});
const out=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});

async function cf(token:string,path:string,method='GET',body?:any){const r=await fetch(CF+path,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/json',...(body?{'content-type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});const tx=await r.text();let d:any={};try{d=JSON.parse(tx)}catch{d={raw:tx}}return{ok:r.ok&&d?.success!==false,status:r.status,data:d}}
async function command(id:string){return(await svc.from('internal_command_queue').select('*').eq('id',id).maybeSingle()).data}
async function finish(id:string,status:string,result:any,error:string|null=null){await svc.from('internal_command_queue').update({status,result,error,finished_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id)}
async function readSecret(key:string){const{data:s}=await svc.from('internal_settings').select('secret_id').eq('setting_key',key).maybeSingle();if(!s?.secret_id)return null;const{data}=await svc.rpc('service_read_secret',{p_secret_id:s.secret_id});return data?String(data):null}
async function upload(token:string,code:string,edgeToken:string,challengeSecret:string,turnstileSecret:string){const metadata={main_module:'main.mjs',compatibility_date:'2026-08-26',bindings:[{type:'secret_text',name:'EDGE_TOKEN',text:edgeToken},{type:'secret_text',name:'CHALLENGE_SECRET',text:challengeSecret},{type:'secret_text',name:'TURNSTILE_SECRET',text:turnstileSecret}]};const f=new FormData();f.append('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}));f.append('main.mjs',new Blob([code],{type:'application/javascript+module'}),'main.mjs');const r=await fetch(`${CF}/accounts/${ACCOUNT}/workers/scripts/${WORKER}`,{method:'PUT',headers:{Authorization:`Bearer ${token}`},body:f});const tx=await r.text();let d:any={};try{d=JSON.parse(tx)}catch{d={raw:tx}}return{ok:r.ok&&d?.success!==false,status:r.status,data:d}}
async function domains(token:string){const r=await cf(token,`/accounts/${ACCOUNT}/workers/domains`);return r.data?.result||[]}
async function attach(token:string){const ds=await domains(token),cur=ds.find((x:any)=>x.hostname===HOST);if(cur?.service===WORKER)return{ok:true,status:200,current:cur};if(cur){const del=await cf(token,`/accounts/${ACCOUNT}/workers/domains/${cur.id}`,'DELETE');if(!del.ok)return{ok:false,status:del.status,errors:del.data?.errors}}const a=await cf(token,`/accounts/${ACCOUNT}/workers/domains`,'PUT',{hostname:HOST,service:WORKER,zone_id:ZONE,zone_name:'cloudsales.app'});return{ok:a.ok,status:a.status,current:a.data?.result,errors:a.data?.errors}}
async function smoke(url:string,marker:string,forbid?:string){try{const r=await fetch(url+(url.includes('?')?'&':'?')+`qa=${Date.now()}`,{redirect:'follow',headers:{'cache-control':'no-cache'}});const tx=await r.text();return{ok:r.ok&&tx.includes(marker)&&(!forbid||!tx.includes(forbid)),status:r.status,marker:tx.includes(marker),forbidden:forbid?tx.includes(forbid):false,length:tx.length,contentType:r.headers.get('content-type')}}catch(e){return{ok:false,status:0,error:String(e)}}}
async function smokeSingleForm(url:string){try{const r=await fetch(url+(url.includes('?')?'&':'?')+`qa=${Date.now()}`,{redirect:'follow',headers:{'cache-control':'no-cache'}});const tx=await r.text(),formCount=(tx.match(/<form\b/gi)||[]).length,leadForm=/<form\b[^>]*\bid=["']leadForm["']/i.test(tx);return{ok:r.ok&&formCount===1&&leadForm,status:r.status,form_count:formCount,lead_form:leadForm,length:tx.length}}catch(e){return{ok:false,status:0,error:String(e)}}}
function stripRuntime(html:string){const markers=["<script>(()=>{'use strict';\nconst e=s=>String","<script>(()=>{'use strict';\r\nconst e=s=>String"];let cut=-1;for(const m of markers){cut=html.indexOf(m);if(cut>=0)break}if(cut<0)throw new Error('live_runtime_marker_missing');const close=html.lastIndexOf('</body>');if(close<cut)throw new Error('live_body_close_missing');return html.slice(0,cut)+html.slice(close)}
function injectTelemetry(html:string,js:string){const marker='<script id="pennyworth-telemetry-v1">';let base=html,start=base.indexOf(marker);if(start>=0){const end=base.indexOf('</script>',start);if(end<0)throw new Error('telemetry_close_missing');base=base.slice(0,start)+base.slice(end+9)}const close=base.lastIndexOf('</body>');if(close<0)throw new Error('live_body_close_missing_for_telemetry');return base.slice(0,close)+marker+js+'</script>'+base.slice(close)}
function patchTurnstileTemplate(raw:string){let x=raw;
 if(!x.includes('turnstile_token:turnstileToken')){
  const clientChallenge='const ch=await challenge(id),a=qp();';
  if(!x.includes(clientChallenge))throw new Error('turnstile_client_challenge_marker_missing');
  x=x.replace(clientChallenge,"const turnstileToken=String(new FormData(form).get('cf-turnstile-response')||'');if(!turnstileToken)throw new Error('turnstile_required');const ch=await challenge(id),a=qp();");
  const clientPayload='idempotency_key:id,challenge:ch,form_id:formId';
  if(!x.includes(clientPayload))throw new Error('turnstile_client_payload_marker_missing');
  x=x.replace(clientPayload,'idempotency_key:id,challenge:ch,turnstile_token:turnstileToken,form_id:formId');
 }
 x=x.replaceAll('while(n<900000)','while(n<100000)').replace('prefix:"000"','prefix:"00"').replace('startsWith("000")','startsWith("00")');const ip=' const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=clean(b.website,300)!=="";';const verify=` const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=clean(b.website,300)!="";\n const turnstileToken=clean(b.turnstile_token,2048);if(!turnstileToken)return json({message:"Completa la verificación de seguridad."},422);\n let turnstileOk=false;try{const tr=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:turnstileToken,remoteip:ip})});const td=await tr.json();turnstileOk=td?.success===true&&(!td?.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase())}catch{}\n if(!turnstileOk)return json({message:"No pudimos validar la verificación de seguridad."},422);`;if(!x.includes(ip))throw new Error('turnstile_patch_ip_marker_missing');x=x.replace(ip,verify);const sec='security:{quality_score:Math.max(0,Math.min(100,score)),turnstile:true,honeypot:honey';if(!x.includes(sec))throw new Error('turnstile_patch_security_marker_missing');x=x.replace(sec,'security:{quality_score:Math.max(0,Math.min(100,score)),turnstile:turnstileOk,honeypot:honey');x=x.replace('const reasons=["edge_pow_hmac"];','const reasons=["edge_pow_hmac","cloudflare_turnstile"];');x=x.replace('challenge:"pow-hmac",inventory:','challenge:"pow-hmac+turnstile",turnstile:"cloudflare-managed",inventory:').replace('challenge:"light-pow-hmac",inventory:','challenge:"light-pow-hmac+turnstile",turnstile:"cloudflare-managed",inventory:');return x}

Deno.serve(async req=>{
 if(req.method!=='POST')return out({error:'method_not_allowed'},405);
 const b=await req.json().catch(()=>({})),id=String(b.command_id||''),c=await command(id);
 if(!c||c.command_type!=='pennyworth_provision'||c.status!=='queued'||new Date(c.expires_at).getTime()<Date.now())return out({error:'invalid_command'},403);
 await svc.from('internal_command_queue').update({status:'running',started_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);
 const result:any={host:HOST,worker:WORKER,steps:{}};
 try{
  const token=Deno.env.get('CLOUDFLARE_API_TOKEN_CLOUDSALES')||'';if(!token)throw new Error('cloudflare_token_missing');
  const edgeToken=await readSecret('cloudsales_edge_token');if(!edgeToken)throw new Error('edge_token_missing');
  const turnstileSecret=await readSecret('pennyworth_turnstile_secret');if(!turnstileSecret)throw new Error('turnstile_secret_missing');
  const stamp=Date.now();const[liveR,tmplR,telR]=await Promise.all([fetch(`https://${HOST}/?provision_source=${stamp}`,{headers:{'cache-control':'no-cache'}}),fetch(`https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/main/web/clients/pennyworth/worker-edge-template.mjs?v=${stamp}`,{headers:{'cache-control':'no-cache'}}),fetch(`https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/main/web/clients/pennyworth/telemetry-v1.js?v=${stamp}`,{headers:{'cache-control':'no-cache'}})]);
  if(!liveR.ok||!tmplR.ok||!telR.ok)throw new Error('source_fetch_failed');
  const liveHtml=await liveR.text(),rawTmpl=patchTurnstileTemplate(await tmplR.text()),telemetry=await telR.text(),html=injectTelemetry(stripRuntime(liveHtml),telemetry);
  result.steps.source={live_length:liveHtml.length,template_length:rawTmpl.length,telemetry_length:telemetry.length,telemetry_injected:html.includes('pennyworth-telemetry-v1'),turnstile_client:html.includes(TURNSTILE_SITEKEY),turnstile_server:rawTmpl.includes('TURNSTILE_SECRET')};
  if(!html.includes('pennyworth-i18n-v1')||!html.includes('pennyworth-cloudsales-v1')||html.includes('content="noindex'))throw new Error('live_contract_failed');
  if(!rawTmpl.includes('__HTML_JSON__'))throw new Error('template_placeholder_missing');
  if(!rawTmpl.includes('turnstile_token:turnstileToken'))throw new Error('turnstile_client_submit_missing');
  if(!rawTmpl.includes('pennyworth_turnstile_lifecycle_v2')||!rawTmpl.includes('remountTurnstile'))throw new Error('turnstile_lifecycle_missing');
  if(!rawTmpl.includes('pennyworth_chat_ux_v3')||!rawTmpl.includes('ensureTurnstileToken')||!rawTmpl.includes('pwChoiceButton'))throw new Error('chat_ux_v3_missing');
  const code=rawTmpl.split('__HTML_JSON__').join(JSON.stringify(html)),challengeSecret=crypto.randomUUID()+crypto.randomUUID()+crypto.randomUUID();
  const up=await upload(token,code,edgeToken,challengeSecret,turnstileSecret);result.steps.worker_upload={ok:up.ok,status:up.status,errors:up.data?.errors||[]};if(!up.ok)throw new Error(`worker_upload_failed_${up.status}`);
  const at=await attach(token);result.steps.domain_attach=at;if(!at.ok)throw new Error(`domain_attach_failed_${at.status}`);
  const probe=await cf(token,`/accounts/${ACCOUNT}/challenges/widgets/${encodeURIComponent(TURNSTILE_SITEKEY)}`);result.steps.turnstile={ok:probe.ok,status:probe.status,mode:probe.data?.result?.mode||null,domains:probe.data?.result?.domains||[]};if(!probe.ok)throw new Error(`turnstile_widget_unavailable_${probe.status}`);
  const{data:g}=await svc.from('gate_configs').select('config').eq('id',GATE_ID).maybeSingle(),cfg=g?.config||{},now=new Date().toISOString();
  await svc.from('gate_configs').update({status:'active',hostname:HOST,allowed_origins:[`https://${HOST}`],updated_at:now,config:{...cfg,turnstile:'active',turnstile_sitekey:TURNSTILE_SITEKEY,contact_gates:{chat:'shared_required_form',whatsapp:'shared_required_form',form_strategy:'single_physical_form',anti_bot:'turnstile_honeypot_rate_limit_server_validation_light_pow',chat_entry:'accepted_lead_hmac_one_time_grant',distribution_target:'listia_subscriber_pool'},provisioning:{...(cfg.provisioning||{}),landing:'active',edge_challenge:'active',localization:'active',seo:'active',analytics:'active_first_party_posthog',cloudflare_worker:WORKER,highlevel:'connected',meta:'direct_capi_active',contact_form:'shared-single-form',secure_chat:'hmac-one-time',turnstile:'active',updated_at:now}}}).eq('id',GATE_ID);
  await new Promise(r=>setTimeout(r,9000));
  const[s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11]=await Promise.all([smoke(`https://${HOST}/`,'pennyworth-gateway-v1','content="noindex'),smoke(`https://${HOST}/health`,'"cloudflare-managed"'),smoke(`https://${HOST}/challenge?id=qa-${Date.now()}`,'nonce'),smoke(`https://${HOST}/`,'pwUnifiedPanel'),smokeSingleForm(`https://${HOST}/`),smoke(`https://${HOST}/`,'chat_grant'),smoke(`https://${HOST}/`,'pennyworth-i18n-v1'),smoke(`https://${HOST}/robots.txt`,'Sitemap: https://pennyworth.cloudsales.app/sitemap.xml'),smoke(`https://${HOST}/sitemap.xml`,'https://pennyworth.cloudsales.app/'),smoke(`https://${HOST}/`,'pennyworth-telemetry-v1'),smoke(`https://${HOST}/`,TURNSTILE_SITEKEY)]);
  result.steps.smoke={page:s1,health:s2,challenge:s3,unified_panel:s4,single_form:s5,chat_grant:s6,i18n:s7,robots:s8,sitemap:s9,telemetry:s10,turnstile:s11};if(!Object.values(result.steps.smoke).every((x:any)=>x.ok))throw new Error('smoke_failed');
  await svc.from('audit_log').insert({organization_id:ORG_ID,actor_type:'system',action:'pennyworth.security_analytics.provisioned',entity_type:'gate_config',entity_id:GATE_ID,success:true,context:{hostname:HOST,worker:WORKER,analytics:'first_party_plus_posthog',turnstile:'cloudflare_managed_siteverify',pow_hmac:true,honeypot:true,rate_limit:true,direct_capi:true}});
  await finish(id,'succeeded',result,null);return out(result);
 }catch(e){const error=String((e as Error).message||e).slice(0,700);result.error=error;await finish(id,'failed',result,error);return out(result,500)}
});
