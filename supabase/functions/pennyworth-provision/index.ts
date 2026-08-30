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
    const liveHtml=await liveR.text(),rawTmpl=await tmplR.text(),html=stripRuntime(liveHtml);
    result.steps.source={live_length:liveHtml.length,template_length:rawTmpl.length,has_placeholder:rawTmpl.includes('__HTML_JSON__'),has_single_form_contract:rawTmpl.includes('shared-single-form'),has_chat_grant:rawTmpl.includes('chat_grant'),has_robots:rawTmpl.includes('u.pathname==="/robots.txt"'),has_sitemap:rawTmpl.includes('u.pathname==="/sitemap.xml"')};
    if(!html.includes('pennyworth-i18n-v1'))throw new Error('live_i18n_missing');
    if(!html.includes('pennyworth-cloudsales-v1'))throw new Error('live_seo_missing');
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
    const{data:g}=await svc.from('gate_configs').select('config').eq('id',GATE_ID).maybeSingle(),cfg=g?.config||{};
    await svc.from('gate_configs').update({status:'active',hostname:HOST,allowed_origins:[`https://${HOST}`],updated_at:new Date().toISOString(),config:{...cfg,contact_gates:{chat:'shared_required_form',whatsapp:'shared_required_form',form_strategy:'single_physical_form',anti_bot:'pow_hmac_honeypot_rate_limit_server_validation',chat_entry:'accepted_lead_hmac_one_time_grant',distribution_target:'listia_subscriber_pool'},provisioning:{...(cfg.provisioning||{}),landing:'active',edge_challenge:'active',localization:'active',seo:'active',cloudflare_worker:WORKER,highlevel:'connected',contact_form:'shared-single-form',secure_chat:'hmac-one-time',updated_at:new Date().toISOString()}}}).eq('id',GATE_ID);
    await new Promise(r=>setTimeout(r,9000));
    const[s1,s2,s3,s4,s5,s6,s7,s8,s9]=await Promise.all([
      smoke(`https://${HOST}/`,'pennyworth-gateway-v1','content="noindex'),
      smoke(`https://${HOST}/health`,'"edge-5"'),
      smoke(`https://${HOST}/challenge?id=qa-${Date.now()}`,'nonce'),
      smoke(`https://${HOST}/`,'pwUnifiedPanel'),
      smokeSingleForm(`https://${HOST}/`),
      smoke(`https://${HOST}/`,'chat_grant'),
      smoke(`https://${HOST}/`,'pennyworth-i18n-v1'),
      smoke(`https://${HOST}/robots.txt`,'Sitemap: https://pennyworth.cloudsales.app/sitemap.xml'),
      smoke(`https://${HOST}/sitemap.xml`,'https://pennyworth.cloudsales.app/')
    ]);
    result.steps.smoke={page:s1,health:s2,challenge:s3,unified_panel:s4,single_form:s5,chat_grant:s6,i18n:s7,robots:s8,sitemap:s9};
    if(!s1.ok||!s2.ok||!s3.ok||!s4.ok||!s5.ok||!s6.ok||!s7.ok||!s8.ok||!s9.ok)throw new Error('smoke_failed');
    await svc.from('audit_log').insert({organization_id:ORG_ID,actor_type:'system',action:'pennyworth.unified_contact.provisioned',entity_type:'gate_config',entity_id:GATE_ID,success:true,context:{hostname:HOST,worker:WORKER,form_strategy:'single_physical_form',chat_entry:'accepted_lead_hmac_one_time_grant',contact_gates:['chat','whatsapp'],seo_preserved:true,localization_preserved:true}});
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
