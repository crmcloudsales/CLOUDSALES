import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CF='https://api.cloudflare.com/client/v4';
const ACCOUNT='bd94cb0580e86e7f40b4271a03052426';
const ZONE='44753df079f42f8995124c358b135597';
const HOST='pennyworth.cloudsales.app';
const WORKER='pennyworth-lead-gateway';
const GATE_ID='7639cce3-e0aa-487e-884e-d836fdc149c1';
const ORG_ID='aa710269-ee4b-40f3-ac30-d9c1a44fe3f5';
const SB=Deno.env.get('SUPABASE_URL')!;
const SR=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const svc=createClient(SB,SR,{auth:{persistSession:false,autoRefreshToken:false}});
const out=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});

const TELEMETRY_SCRIPT=String.raw`<script id="pennyworth-telemetry-v1">(()=>{'use strict';
const ENDPOINT='https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/pennyworth-now';
const GATE='69a3dc7f-d733-41b4-aec5-08d7ca521d81';
const HOST='pennyworth.cloudsales.app';
const qs=new URLSearchParams(location.search);
const clean=(v,n=600)=>String(v||'').trim().slice(0,n);
const uuid=()=>{try{return crypto.randomUUID()}catch{return Date.now().toString(36)+Math.random().toString(36).slice(2)}};
const getStore=(s,k)=>{try{return s.getItem(k)||''}catch{return''}};
const setStore=(s,k,v)=>{try{s.setItem(k,v)}catch{}};
let anon=getStore(localStorage,'pw_anon_v1');if(!anon){anon=uuid();setStore(localStorage,'pw_anon_v1',anon)}
let session=getStore(sessionStorage,'pw_session_v1');if(!session){session=uuid();setStore(sessionStorage,'pw_session_v1',session)}
const cookie=name=>{const m=document.cookie.match(new RegExp('(?:^|; )'+name.replace(/[.$?*|{}()\\[\\]\\/+^]/g,'\\$&')+'=([^;]*)'));return m?decodeURIComponent(m[1]):''};
const attrKeys=['fbclid','fbc','fbp','campaign_id','ad_group_id','ad_id','utm_source','utm_medium','utm_campaign','utm_content'];
let attr={};try{attr=JSON.parse(getStore(localStorage,'pw_attr_v1')||'{}')||{}}catch{attr={}}
const take=(key,vals)=>{for(const v of vals){if(clean(v)){attr[key]=clean(v);return}}};
take('fbclid',[qs.get('fbclid')]);take('fbc',[cookie('_fbc')]);take('fbp',[cookie('_fbp')]);
take('campaign_id',[qs.get('campaign_id'),qs.get('utm_id'),qs.get('campaign')]);
take('ad_group_id',[qs.get('adset_id'),qs.get('ad_set_id'),qs.get('adgroup_id')]);
take('ad_id',[qs.get('ad_id'),qs.get('adid')]);
take('utm_source',[qs.get('utm_source')]);take('utm_medium',[qs.get('utm_medium')]);take('utm_campaign',[qs.get('utm_campaign')]);take('utm_content',[qs.get('utm_content')]);
try{setStore(localStorage,'pw_attr_v1',JSON.stringify(attr))}catch{}
const ref=clean(document.referrer,1800);const sourceText=((attr.utm_source||'')+' '+ref).toLowerCase();const isMeta=Boolean(attr.fbclid)||/facebook|instagram|meta|\bfb\b|\big\b/.test(sourceText);
const provider=isMeta?'meta':clean(attr.utm_source||'direct',80);
const metaBase=()=>({page_title:clean(document.title,300),timezone:clean(Intl.DateTimeFormat().resolvedOptions().timeZone,120),viewport:String(innerWidth)+'x'+String(innerHeight)});
const propertyFrom=(el)=>{if(!el)return{};const d=el.dataset||{};return{inventory_id:clean(d.inventoryId||'',180),property_key:clean(d.propertyKey||d.property||'',180)}};
const body=(name,extra={})=>Object.assign({event_name:name,event_id:name.toLowerCase()+':'+uuid(),session_id:session,anonymous_id:anon,landing_url:clean(location.href,1800),referrer:ref,source_provider:provider,campaign_id:clean(attr.campaign_id,180),ad_group_id:clean(attr.ad_group_id,180),ad_id:clean(attr.ad_id,180),fbclid:clean(attr.fbclid,600),fbc:clean(attr.fbc,600),fbp:clean(attr.fbp,600),utm_source:clean(attr.utm_source,180),utm_medium:clean(attr.utm_medium,180),utm_campaign:clean(attr.utm_campaign,300),utm_content:clean(attr.utm_content,300),locale:clean(document.documentElement.lang||navigator.language,80),qa:qs.get('qa')==='1',metadata:metaBase(),occurred_at:new Date().toISOString()},extra);
const send=(name,extra={})=>{try{return fetch(ENDPOINT,{method:'POST',mode:'cors',credentials:'omit',keepalive:true,headers:{'content-type':'application/json','x-pennyworth-gate':GATE},body:JSON.stringify(body(name,extra))}).catch(()=>null)}catch{return Promise.resolve(null)}};
const once=(key,fn)=>{const k='pw_once:'+key+':'+session;if(getStore(sessionStorage,k))return;setStore(sessionStorage,k,'1');fn()};
once('landing',()=>send('LandingView'));if(isMeta)once('meta_landing',()=>send('MetaLandingView'));
const initialProperty={inventory_id:clean(qs.get('inventory_id')||qs.get('property_id'),180),property_key:clean(qs.get('property_key')||qs.get('property'),180)};if(initialProperty.inventory_id||initialProperty.property_key)once('property:'+initialProperty.inventory_id+':'+initialProperty.property_key,()=>send('PropertyView',initialProperty));
document.addEventListener('click',ev=>{const t=ev.target instanceof Element?ev.target:null;if(!t)return;const p=t.closest('[data-inventory-id],[data-property-key],[data-property]');if(p){const x=propertyFrom(p);if(x.inventory_id||x.property_key)send('PropertyView',x)}const a=t.closest('a');const href=(a&&a.getAttribute('href')||'').toLowerCase();if(t.closest('#pwWaLaunch,.wa,[data-channel="whatsapp"]')||href.includes('wa.me')||href.includes('whatsapp'))send('WhatsAppClick');if(t.closest('#pwChatLaunch,[data-channel="chat"]'))send('ChatOpen')},{capture:true,passive:true});
let formStarted=false;const form=()=>document.getElementById('leadForm');const startForm=()=>{if(formStarted)return;formStarted=true;const f=form();const purpose=f&&f.querySelector('[name="purpose"]');const budget=f&&f.querySelector('[name="budget_range"]');const timeframe=f&&f.querySelector('[name="purchase_timeframe"]');send('FormStart',{metadata:Object.assign(metaBase(),{purpose:clean(purpose&&purpose.value,120),budget_range:clean(budget&&budget.value,120),purchase_timeframe:clean(timeframe&&timeframe.value,120)})})};
document.addEventListener('focusin',ev=>{const f=form();if(f&&f.contains(ev.target))startForm()});document.addEventListener('change',ev=>{const f=form();if(f&&f.contains(ev.target))startForm()});document.addEventListener('submit',ev=>{const f=form();if(!f||ev.target!==f)return;startForm();const val=n=>clean((f.querySelector('[name="'+n+'"]')||{}).value,120);send('FormSubmit',{metadata:Object.assign(metaBase(),{purpose:val('purpose'),budget_range:val('budget_range'),purchase_timeframe:val('purchase_timeframe')})})},true);
const originalFetch=window.fetch.bind(window);window.fetch=async function(input,init){const url=typeof input==='string'?input:(input&&input.url)||'';const r=await originalFetch(input,init);try{const u=new URL(url,location.href);if(u.hostname===HOST&&u.pathname==='/lead'){const d=await r.clone().json().catch(()=>null);if(d&&typeof d==='object'){const status=String(d.status||'').toLowerCase(),score=Number(d.quality_score);if(status==='accepted')send('LeadAccepted',{metadata:Object.assign(metaBase(),{decision:'accepted',quality_score:Number.isFinite(score)?score:null})});else if(status==='rejected'||status==='challenge_required')send('LeadRejected',{metadata:Object.assign(metaBase(),{decision:status,quality_score:Number.isFinite(score)?score:null})})}}}catch{}return r};
})();</script>`;

async function cf(token:string,path:string,method='GET',body?:any){
  const r=await fetch(CF+path,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/json','content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const tx=await r.text();
  let d:any={};
  try{d=JSON.parse(tx)}catch{d={raw:tx}}
  return{ok:r.ok&&d?.success!==false,status:r.status,data:d};
}
async function command(id:string){return(await svc.from('internal_command_queue').select('*').eq('id',id).maybeSingle()).data}
async function finish(id:string,status:string,result:any,error:string|null=null){await svc.from('internal_command_queue').update({status,result,error,finished_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id)}
async function readSecret(key:string){const{data:s}=await svc.from('internal_settings').select('secret_id').eq('setting_key',key).maybeSingle();if(!s?.secret_id)return null;const{data}=await svc.rpc('service_read_secret',{p_secret_id:s.secret_id});return data?String(data):null}
async function upload(token:string,code:string,edgeToken:string,challengeSecret:string){
  const metadata={main_module:'main.mjs',compatibility_date:'2026-08-26',bindings:[{type:'secret_text',name:'EDGE_TOKEN',text:edgeToken},{type:'secret_text',name:'CHALLENGE_SECRET',text:challengeSecret}]};
  const f=new FormData();
  f.append('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}));
  f.append('main.mjs',new Blob([code],{type:'application/javascript+module'}),'main.mjs');
  const r=await fetch(`${CF}/accounts/${ACCOUNT}/workers/scripts/${WORKER}`,{method:'PUT',headers:{Authorization:`Bearer ${token}`},body:f});
  const tx=await r.text();
  let d:any={};
  try{d=JSON.parse(tx)}catch{d={raw:tx}}
  return{ok:r.ok&&d?.success!==false,status:r.status,data:d};
}
async function domains(token:string){const r=await cf(token,`/accounts/${ACCOUNT}/workers/domains`);return r.data?.result||[]}
async function attach(token:string){
  const ds=await domains(token),cur=ds.find((x:any)=>x.hostname===HOST);
  if(cur?.service===WORKER)return{ok:true,status:200,current:cur};
  if(cur){const del=await cf(token,`/accounts/${ACCOUNT}/workers/domains/${cur.id}`,'DELETE');if(!del.ok)return{ok:false,status:del.status,errors:del.data?.errors}}
  const a=await cf(token,`/accounts/${ACCOUNT}/workers/domains`,'PUT',{hostname:HOST,service:WORKER,zone_id:ZONE,zone_name:'cloudsales.app'});
  return{ok:a.ok,status:a.status,current:a.data?.result,errors:a.data?.errors};
}
async function smoke(url:string,marker:string,forbid?:string){
  try{
    const r=await fetch(url+(url.includes('?')?'&':'?')+`qa=${Date.now()}`,{redirect:'follow',headers:{'cache-control':'no-cache'}});
    const tx=await r.text();
    return{ok:r.ok&&tx.includes(marker)&&(!forbid||!tx.includes(forbid)),status:r.status,marker:tx.includes(marker),forbidden:forbid?tx.includes(forbid):false,length:tx.length,contentType:r.headers.get('content-type')};
  }catch(e){return{ok:false,status:0,error:String(e)}}
}
async function smokeSingleForm(url:string){
  try{
    const r=await fetch(url+(url.includes('?')?'&':'?')+`qa=${Date.now()}`,{redirect:'follow',headers:{'cache-control':'no-cache'}});
    const tx=await r.text();
    const formCount=(tx.match(/<form\b/gi)||[]).length;
    const leadForm=/<form\b[^>]*\bid=["']leadForm["']/i.test(tx);
    return{ok:r.ok&&formCount===1&&leadForm,status:r.status,form_count:formCount,lead_form:leadForm,length:tx.length,contentType:r.headers.get('content-type')};
  }catch(e){return{ok:false,status:0,error:String(e)}}
}
function stripRuntime(html:string){
  const markers=["<script>(()=>{'use strict';\nconst e=s=>String","<script>(()=>{'use strict';\r\nconst e=s=>String"];
  let cut=-1;
  for(const m of markers){cut=html.indexOf(m);if(cut>=0)break}
  if(cut<0)throw new Error('live_runtime_marker_missing');
  const close=html.lastIndexOf('</body>');
  if(close<cut)throw new Error('live_body_close_missing');
  return html.slice(0,cut)+html.slice(close);
}
function injectTelemetry(html:string){
  if(html.includes('id="pennyworth-telemetry-v1"'))return html;
  const close=html.lastIndexOf('</body>');
  if(close<0)throw new Error('live_body_close_missing_for_telemetry');
  return html.slice(0,close)+TELEMETRY_SCRIPT+html.slice(close);
}

Deno.serve(async req=>{
  if(req.method!=='POST')return out({error:'method_not_allowed'},405);
  const b=await req.json().catch(()=>({})),id=String(b.command_id||''),c=await command(id);
  if(!c||c.command_type!=='pennyworth_provision'||c.status!=='queued'||new Date(c.expires_at).getTime()<Date.now())return out({error:'invalid_command'},403);
  await svc.from('internal_command_queue').update({status:'running',started_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);
  const result:any={host:HOST,worker:WORKER,steps:{}};
  try{
    const token=Deno.env.get('CLOUDFLARE_API_TOKEN_CLOUDSALES')||'';
    if(!token)throw new Error('cloudflare_token_missing');
    const edgeToken=await readSecret('cloudsales_edge_token');
    if(!edgeToken)throw new Error('edge_token_missing');
    const stamp=Date.now();
    const[liveR,tmplR]=await Promise.all([
      fetch(`https://${HOST}/?provision_source=${stamp}`,{headers:{'cache-control':'no-cache'}}),
      fetch(`https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/main/web/clients/pennyworth/worker-edge-template.mjs?v=${stamp}`,{headers:{'cache-control':'no-cache'}})
    ]);
    if(!liveR.ok||!tmplR.ok)throw new Error('source_fetch_failed');
    const liveHtml=await liveR.text(),rawTmpl=await tmplR.text(),baseHtml=stripRuntime(liveHtml),html=injectTelemetry(baseHtml);
    result.steps.source={live_length:liveHtml.length,template_length:rawTmpl.length,has_placeholder:rawTmpl.includes('__HTML_JSON__'),has_single_form_contract:rawTmpl.includes('shared-single-form'),has_chat_grant:rawTmpl.includes('chat_grant'),has_robots:rawTmpl.includes('u.pathname==="/robots.txt"'),has_sitemap:rawTmpl.includes('u.pathname==="/sitemap.xml"'),telemetry_injected:html.includes('pennyworth-telemetry-v1')};
    if(!html.includes('pennyworth-i18n-v1'))throw new Error('live_i18n_missing');
    if(!html.includes('pennyworth-cloudsales-v1'))throw new Error('live_seo_missing');
    if(!html.includes('pennyworth-telemetry-v1'))throw new Error('telemetry_injection_failed');
    if(html.includes('content="noindex'))throw new Error('live_noindex_detected');
    if(!rawTmpl.includes('__HTML_JSON__'))throw new Error('template_placeholder_missing');
    if(!rawTmpl.includes('u.pathname==="/robots.txt"')||!rawTmpl.includes('u.pathname==="/sitemap.xml"'))throw new Error('seo_routes_missing_from_source');
    const code=rawTmpl.replace('__HTML_JSON__',JSON.stringify(html));
    if(code.includes('__HTML_JSON__'))throw new Error('template_replacement_failed');
    result.steps.generated={lines:code.split('\n').slice(68,80)};
    const challengeSecret=crypto.randomUUID()+crypto.randomUUID()+crypto.randomUUID();
    const up=await upload(token,code,edgeToken,challengeSecret);
    result.steps.worker_upload={ok:up.ok,status:up.status,errors:up.data?.errors||null};
    if(!up.ok)throw new Error(`worker_upload_failed_${up.status}`);
    const at=await attach(token);
    result.steps.domain_attach=at;
    if(!at.ok)throw new Error(`domain_attach_failed_${at.status}`);
    const turnstileProbe=await cf(token,`/accounts/${ACCOUNT}/challenges/widgets?page=1&per_page=10`);
    result.steps.turnstile_permission={ok:turnstileProbe.ok,status:turnstileProbe.status,errors:Array.isArray(turnstileProbe.data?.errors)?turnstileProbe.data.errors.slice(0,5):[]};
    const{data:g}=await svc.from('gate_configs').select('config').eq('id',GATE_ID).maybeSingle(),cfg=g?.config||{};
    const turnstileState=turnstileProbe.ok?'available_permission':'pending_permission';
    await svc.from('gate_configs').update({status:'active',hostname:HOST,allowed_origins:[`https://${HOST}`],updated_at:new Date().toISOString(),config:{...cfg,turnstile:turnstileProbe.ok?'permission_available':cfg.turnstile||'pending_token_permission',contact_gates:{chat:'shared_required_form',whatsapp:'shared_required_form',form_strategy:'single_physical_form',anti_bot:'pow_hmac_honeypot_rate_limit_server_validation',chat_entry:'accepted_lead_hmac_one_time_grant',distribution_target:'listia_subscriber_pool'},provisioning:{...(cfg.provisioning||{}),landing:'active',edge_challenge:'active',localization:'active',seo:'active',analytics:'active_first_party_posthog',cloudflare_worker:WORKER,highlevel:'connected',contact_form:'shared-single-form',secure_chat:'hmac-one-time',turnstile:turnstileState,updated_at:new Date().toISOString()}}}).eq('id',GATE_ID);
    await new Promise(r=>setTimeout(r,9000));
    const[s1,s2,s3,s4,s5,s6,s7,s8,s9,s10]=await Promise.all([
      smoke(`https://${HOST}/`,'pennyworth-gateway-v1','content="noindex'),
      smoke(`https://${HOST}/health`,'"edge-5"'),
      smoke(`https://${HOST}/challenge?id=qa-${Date.now()}`,'nonce'),
      smoke(`https://${HOST}/`,'pwUnifiedPanel'),
      smokeSingleForm(`https://${HOST}/`),
      smoke(`https://${HOST}/`,'chat_grant'),
      smoke(`https://${HOST}/`,'pennyworth-i18n-v1'),
      smoke(`https://${HOST}/robots.txt`,'Sitemap: https://pennyworth.cloudsales.app/sitemap.xml'),
      smoke(`https://${HOST}/sitemap.xml`,'https://pennyworth.cloudsales.app/'),
      smoke(`https://${HOST}/`,'pennyworth-telemetry-v1')
    ]);
    result.steps.smoke={page:s1,health:s2,challenge:s3,unified_panel:s4,single_form:s5,chat_grant:s6,i18n:s7,robots:s8,sitemap:s9,telemetry:s10};
    if(!s1.ok||!s2.ok||!s3.ok||!s4.ok||!s5.ok||!s6.ok||!s7.ok||!s8.ok||!s9.ok||!s10.ok)throw new Error('smoke_failed');
    await svc.from('audit_log').insert({organization_id:ORG_ID,actor_type:'system',action:'pennyworth.unified_contact.provisioned',entity_type:'gate_config',entity_id:GATE_ID,success:true,context:{hostname:HOST,worker:WORKER,form_strategy:'single_physical_form',chat_entry:'accepted_lead_hmac_one_time_grant',contact_gates:['chat','whatsapp'],seo_preserved:true,localization_preserved:true,analytics:'first_party_plus_posthog',turnstile_permission:turnstileProbe.ok}});
    await finish(id,'succeeded',result,null);
    return out(result);
  }catch(e){
    const error=String((e as Error).message||e);
    result.error=error;
    await svc.from('gate_configs').update({status:'active',updated_at:new Date().toISOString()}).eq('id',GATE_ID);
    await finish(id,'failed',result,error);
    return out(result,500);
  }
});
