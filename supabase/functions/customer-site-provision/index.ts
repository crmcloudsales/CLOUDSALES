import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CF="https://api.cloudflare.com/client/v4";
const ACCOUNT="bd94cb0580e86e7f40b4271a03052426";
const ZONE="44753df079f42f8995124c358b135597";
const ZONE_NAME="cloudsales.app";
const SB=Deno.env.get("SUPABASE_URL")!;
const SR=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const svc=createClient(SB,SR,{auth:{persistSession:false,autoRefreshToken:false}});
const out=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
function safe(v:unknown,n=300){return String(v??"").trim().slice(0,n)}
function validHost(h:string){return /^[a-z0-9][a-z0-9.-]*\.cloudsales\.app$/.test(h)&&!h.includes('..')}
function validWorker(w:string){return /^[a-z0-9][a-z0-9-]{2,62}$/.test(w)}
async function cf(token:string,path:string,method="GET",body?:unknown){const r=await fetch(CF+path,{method,headers:{Authorization:`Bearer ${token}`,Accept:"application/json",...(body!==undefined?{"content-type":"application/json"}:{})},body:body===undefined?undefined:JSON.stringify(body)});const text=await r.text();let data:any={};try{data=JSON.parse(text)}catch{data={raw:text}}return{ok:r.ok&&data?.success!==false,status:r.status,data}}
async function secret(key:string){const{data:s}=await svc.from("internal_settings").select("secret_id").eq("setting_key",key).maybeSingle();if(!s?.secret_id)return null;const{data,error}=await svc.rpc("service_read_secret",{p_secret_id:s.secret_id});if(error||!data)return null;return String(data)}
async function storeSecret(key:string,value:string,name:string,description:string){const{data:old}=await svc.from("internal_settings").select("secret_id").eq("setting_key",key).maybeSingle();let sid=old?.secret_id;if(sid){const{error}=await svc.rpc("service_update_secret",{p_secret_id:sid,p_secret:value,p_name:name,p_description:description});if(error)throw error}else{const{data,error}=await svc.rpc("service_store_secret",{p_secret:value,p_name:name,p_description:description});if(error||!data)throw error||new Error("secret_storage_failed");sid=data}await svc.from("internal_settings").upsert({setting_key:key,secret_id:sid,value:{configured:true,updated_at:new Date().toISOString()}},{onConflict:"setting_key"});return sid}
async function token(){return Deno.env.get("CLOUDFLARE_API_TOKEN_CLOUDSALES")||await secret("cloudflare_api_token_cloudsales")||""}
async function text(url:string){const r=await fetch(`${url}${url.includes('?')?'&':'?'}v=${Date.now()}`,{headers:{"cache-control":"no-cache",pragma:"no-cache"}});if(!r.ok)throw new Error(`source_fetch_${r.status}`);return await r.text()}
async function domains(t:string){const r=await cf(t,`/accounts/${ACCOUNT}/workers/domains`);return Array.isArray(r.data?.result)?r.data.result:[]}
async function attach(t:string,host:string,worker:string){const list=await domains(t),old=list.find((x:any)=>x.hostname===host&&x.zone_id===ZONE)||null;if(old?.service===worker)return{ok:true,status:200,reused:true,current:old};if(old){const d=await cf(t,`/accounts/${ACCOUNT}/workers/domains/${old.id}`,"DELETE");if(!d.ok)throw new Error(`domain_delete_${d.status}`)}const a=await cf(t,`/accounts/${ACCOUNT}/workers/domains`,"PUT",{hostname:host,service:worker,zone_id:ZONE,zone_name:ZONE_NAME});if(!a.ok)throw new Error(`domain_attach_${a.status}`);return{ok:true,status:a.status,reused:false,current:a.data?.result||null}}
async function upload(t:string,worker:string,code:string,edgeToken:string,challengeSecret:string,turnstileSecret:string){
 const metadata={main_module:"main.mjs",compatibility_date:"2026-08-31"};
 const f=new FormData();f.append("metadata",new Blob([JSON.stringify(metadata)],{type:"application/json"}));f.append("main.mjs",new Blob([code],{type:"application/javascript+module"}),"main.mjs");
 const r=await fetch(`${CF}/accounts/${ACCOUNT}/workers/scripts/${worker}`,{method:"PUT",headers:{Authorization:`Bearer ${t}`},body:f});const data=await r.json().catch(()=>({}));if(!r.ok||data?.success===false)throw new Error(`worker_upload_${r.status}`);
 for(const [name,value] of [["EDGE_TOKEN",edgeToken],["CHALLENGE_SECRET",challengeSecret],["TURNSTILE_SECRET",turnstileSecret]]){const s=await cf(t,`/accounts/${ACCOUNT}/workers/scripts/${worker}/secrets`,"PUT",{name,type:"secret_text",text:value});if(!s.ok)throw new Error(`worker_secret_${name}_${s.status}`)}
 return data
}
async function ensureTurnstile(t:string,gateId:string,host:string,key:string,label:string){const{data:g}=await svc.from("gate_configs").select("config").eq("id",gateId).maybeSingle();if(!g)throw new Error("gate_not_found");const site=String(g?.config?.turnstile_sitekey||"");const sec=await secret(key);if(site&&sec)return{sitekey:site,secret:sec,reused:true};const c=await cf(t,`/accounts/${ACCOUNT}/challenges/widgets`,"POST",{name:`${label} ${crypto.randomUUID().slice(0,8)}`,domains:[host],mode:"managed"});if(!c.ok)throw new Error(`turnstile_${c.status}`);const sitekey=String(c.data?.result?.sitekey||""),turnSecret=String(c.data?.result?.secret||"");if(!sitekey||!turnSecret)throw new Error("turnstile_credentials_missing");await storeSecret(key,turnSecret,`cloudsales/${host}/turnstile-secret`,`${label} Cloudflare Turnstile secret`);await svc.from("gate_configs").update({config:{...(g?.config||{}),turnstile:"active",turnstile_sitekey:sitekey}}).eq("id",gateId);return{sitekey,secret:turnSecret,reused:false}}
function injectCompactLeadForm(html:string){
 const marker='data-cloudsales-compact-lead-form="v1"';if(html.includes(marker))return html;
 const css=`<style ${marker}>\n:where(.form,.form-card,.lead-card,.contact-card,.contact-form):has(#leadForm){padding:20px!important;border-radius:20px!important}\n#leadForm .field{margin-top:7px!important}\n#leadForm label{margin-bottom:4px!important;font-size:11px!important;line-height:1.25!important}\n#leadForm input,#leadForm select,#leadForm textarea{padding:10px 12px!important;border-radius:11px!important;line-height:1.25!important}\n#leadForm textarea{min-height:84px!important}\n#leadForm .submit,#leadForm button[type=submit],#leadForm input[type=submit]{margin-top:10px!important;padding:12px 16px!important;min-height:44px!important}\n#leadForm .fine,#leadForm .legal,#leadForm .consent{font-size:10px!important;line-height:1.4!important;margin-top:9px!important}\n@media(max-width:700px){:where(.form,.form-card,.lead-card,.contact-card,.contact-form):has(#leadForm){padding:16px!important;border-radius:18px!important}#leadForm input,#leadForm select,#leadForm textarea{padding:9px 11px!important;font-size:16px!important}#leadForm .field{margin-top:6px!important}#leadForm textarea{min-height:76px!important}}\n</style>`;
 const head=html.lastIndexOf('</head>');return head>=0?html.slice(0,head)+css+html.slice(head):css+html
}
async function smoke(host:string,marker:string){try{const r=await fetch(`https://${host}/?qa=${Date.now()}`,{redirect:"follow",headers:{"cache-control":"no-cache"}});const t=await r.text();return{ok:r.ok&&t.includes(marker),status:r.status,marker:t.includes(marker),compact_form:t.includes('data-cloudsales-compact-lead-form="v1"'),length:t.length}}catch(e){return{ok:false,status:0,error:String(e)}}}
Deno.serve(async req=>{
 if(req.method!=="POST")return out({error:"method_not_allowed"},405);
 const body=await req.json().catch(()=>({})),id=safe(body.command_id,80);
 const{data:cmd}=await svc.from("internal_command_queue").select("*").eq("id",id).maybeSingle();
 if(!cmd||cmd.command_type!=="customer_site_provision_v1"||cmd.status!=="queued"||new Date(cmd.expires_at).getTime()<=Date.now())return out({error:"invalid_command"},403);
 const i=cmd.input||{},host=safe(i.host,150).toLowerCase(),worker=safe(i.worker,80).toLowerCase(),raw=safe(i.raw_base,500),marker=safe(i.marker,120),gateId=safe(i.gate_id,80),orgId=safe(i.organization_id,80),turnKey=safe(i.turnstile_setting_key,120),label=safe(i.label,120)||host;
 if(!validHost(host)||!validWorker(worker)||!raw.startsWith("https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/")||!marker||!gateId||!orgId||!turnKey)return out({error:"invalid_input"},400);
 await svc.from("internal_command_queue").update({status:"running",started_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id);
 const result:any={host,worker,gate_id:gateId,organization_id:orgId,steps:{}};
 try{
  const t=await token();if(!t)throw new Error("cloudflare_token_missing");const edgeToken=await secret("cloudsales_edge_token");if(!edgeToken)throw new Error("edge_token_missing");
  const turn=await ensureTurnstile(t,gateId,host,turnKey,label);result.steps.turnstile={sitekey:turn.sitekey,reused:turn.reused};
  const[htmlRaw,tmplRaw]=await Promise.all([text(`${raw}/landing-edge.html`),text(`${raw}/worker-edge-template.mjs`)]);
  if(!htmlRaw.includes(marker)||!htmlRaw.includes("__TURNSTILE_SITEKEY__"))throw new Error("landing_contract_failed");if(!tmplRaw.includes("__HTML_JSON__")||!tmplRaw.includes("__TURNSTILE_SITEKEY__"))throw new Error("worker_contract_failed");
  const html=injectCompactLeadForm(htmlRaw.split("__TURNSTILE_SITEKEY__").join(turn.sitekey)),template=tmplRaw.split("__TURNSTILE_SITEKEY__").join(turn.sitekey),code=template.replace("__HTML_JSON__",JSON.stringify(html));
  await upload(t,worker,code,edgeToken,crypto.randomUUID()+crypto.randomUUID(),turn.secret);result.steps.worker={uploaded:true,secrets_bound:true,compact_form:true};result.steps.domain=await attach(t,host,worker);
  await new Promise(r=>setTimeout(r,3000));const sm=await smoke(host,marker);result.steps.smoke=sm;if(!sm.ok||!sm.compact_form)throw new Error(`smoke_failed_${sm.status}`);
  const{data:g}=await svc.from("gate_configs").select("config").eq("id",gateId).maybeSingle();await svc.from("gate_configs").update({status:"active",config:{...(g?.config||{}),provisioning:{seo:"active",landing:"active",turnstile:"active",custom_domain:"enabled",edge_challenge:"active",cloudflare_worker:worker,dns_public_verified:true,worker_runtime_verified:true,compact_lead_form:"v1",updated_at:new Date().toISOString()}}}).eq("id",gateId);
  await svc.from("internal_command_queue").update({status:"succeeded",result,error:null,finished_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id);return out(result);
 }catch(e){const error=String((e as Error)?.message||e).slice(0,500);await svc.from("internal_command_queue").update({status:"failed",result,error,finished_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id);return out({error,result},500)}
});
