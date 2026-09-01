import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CF="https://api.cloudflare.com/client/v4";
const ACCOUNT="bd94cb0580e86e7f40b4271a03052426";
const ZONE="44753df079f42f8995124c358b135597";
const HOST="numa.cloudsales.app";
const WORKER="numa-hotel-gateway";
const GATE_ID="72d0c381-dcc6-4054-8394-fc10d305fcde";
const ORG_ID="13b81dd8-1966-4b46-ad5c-b5694b5f8581";
const RAW="https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/main/web/clients/numa";
const SB=Deno.env.get("SUPABASE_URL")!;
const SR=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const svc=createClient(SB,SR,{auth:{persistSession:false,autoRefreshToken:false}});
const out=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer"}});

async function cf(token:string,path:string,method="GET",body?:unknown){const r=await fetch(CF+path,{method,headers:{Authorization:`Bearer ${token}`,Accept:"application/json",...(body!==undefined?{"content-type":"application/json"}:{})},body:body===undefined?undefined:JSON.stringify(body)});const text=await r.text();let data:any={};try{data=JSON.parse(text)}catch{data={raw:text}}return{ok:r.ok&&data?.success!==false,status:r.status,data}}
async function command(id:string){return(await svc.from("internal_command_queue").select("*").eq("id",id).maybeSingle()).data}
async function finish(id:string,status:string,result:unknown,error:string|null=null){await svc.from("internal_command_queue").update({status,result,error,finished_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id)}
async function readSecret(key:string){const{data:s}=await svc.from("internal_settings").select("secret_id").eq("setting_key",key).maybeSingle();if(!s?.secret_id)return null;const{data,error}=await svc.rpc("service_read_secret",{p_secret_id:s.secret_id});if(error||!data)return null;return String(data)}
async function storeSecret(key:string,value:string,name:string,description:string){const{data:old}=await svc.from("internal_settings").select("secret_id").eq("setting_key",key).maybeSingle();let sid=old?.secret_id;if(sid){const{error}=await svc.rpc("service_update_secret",{p_secret_id:sid,p_secret:value,p_name:name,p_description:description});if(error)throw error}else{const{data,error}=await svc.rpc("service_store_secret",{p_secret:value,p_name:name,p_description:description});if(error||!data)throw error||new Error("secret_storage_failed");sid=data}await svc.from("internal_settings").upsert({setting_key:key,secret_id:sid,value:{configured:true,updated_at:new Date().toISOString()}},{onConflict:"setting_key"});return sid}
async function cloudflareToken(){const env=Deno.env.get("CLOUDFLARE_API_TOKEN_CLOUDSALES")||"";if(env)return env;return await readSecret("cloudflare_api_token_cloudsales")||""}
async function txt(url:string){const r=await fetch(`${url}?v=${Date.now()}`,{headers:{"cache-control":"no-cache",pragma:"no-cache"}});if(!r.ok)throw new Error(`source_fetch_${r.status}`);return await r.text()}
async function domains(token:string){const r=await cf(token,`/accounts/${ACCOUNT}/workers/domains`);return Array.isArray(r.data?.result)?r.data.result:[]}
async function attach(token:string){const list=await domains(token),old=list.find((x:any)=>x.hostname===HOST&&x.zone_id===ZONE)||null;if(old?.service===WORKER)return{ok:true,status:200,reused:true,current:old};if(old){const del=await cf(token,`/accounts/${ACCOUNT}/workers/domains/${old.id}`,"DELETE");if(!del.ok)return{ok:false,status:del.status,errors:del.data?.errors||[]}}const a=await cf(token,`/accounts/${ACCOUNT}/workers/domains`,"PUT",{hostname:HOST,service:WORKER,zone_id:ZONE,zone_name:"cloudsales.app"});return{ok:a.ok,status:a.status,reused:false,current:a.data?.result||null,errors:a.data?.errors||[]}}
async function upload(token:string,code:string,edgeToken:string,challengeSecret:string,turnstileSecret:string){const metadata={main_module:"main.mjs",compatibility_date:"2026-08-31",bindings:[{type:"secret_text",name:"EDGE_TOKEN",text:edgeToken},{type:"secret_text",name:"CHALLENGE_SECRET",text:challengeSecret},{type:"secret_text",name:"TURNSTILE_SECRET",text:turnstileSecret}]};const f=new FormData();f.append("metadata",new Blob([JSON.stringify(metadata)],{type:"application/json"}));f.append("main.mjs",new Blob([code],{type:"application/javascript+module"}),"main.mjs");const r=await fetch(`${CF}/accounts/${ACCOUNT}/workers/scripts/${WORKER}`,{method:"PUT",headers:{Authorization:`Bearer ${token}`},body:f});const text=await r.text();let data:any={};try{data=JSON.parse(text)}catch{data={raw:text}}return{ok:r.ok&&data?.success!==false,status:r.status,errors:data?.errors||[]}}
async function ensureTurnstile(token:string){const{data:g}=await svc.from("gate_configs").select("config").eq("id",GATE_ID).maybeSingle();const existingSitekey=String(g?.config?.turnstile_sitekey||"");const existingSecret=await readSecret("numa_turnstile_secret");if(existingSitekey&&existingSecret)return{sitekey:existingSitekey,secret:existingSecret,reused:true};const name=`NUMA Hotel Boutique ${new Date().toISOString().slice(0,10)} ${crypto.randomUUID().slice(0,8)}`;const created=await cf(token,`/accounts/${ACCOUNT}/challenges/widgets`,"POST",{name,domains:[HOST],mode:"managed"});if(!created.ok)throw new Error(`turnstile_create_failed_${created.status}`);const sitekey=String(created.data?.result?.sitekey||""),secret=String(created.data?.result?.secret||"");if(!sitekey||!secret)throw new Error("turnstile_credentials_missing");await storeSecret("numa_turnstile_secret",secret,"cloudsales/numa/turnstile-secret","NUMA Hotel Boutique Cloudflare Turnstile secret");return{sitekey,secret,reused:false}}
async function smoke(url:string,marker:string){try{const r=await fetch(`${url}${url.includes('?')?'&':'?'}qa=${Date.now()}`,{redirect:"follow",headers:{"cache-control":"no-cache"}});const text=await r.text();return{ok:r.ok&&text.includes(marker),status:r.status,marker:text.includes(marker),length:text.length,type:r.headers.get("content-type")||""}}catch(e){return{ok:false,status:0,error:String(e)}}}
async function formCount(url:string){try{const r=await fetch(`${url}?qa=${Date.now()}`,{headers:{"cache-control":"no-cache"}}),text=await r.text(),count=(text.match(/<form\b/gi)||[]).length;return{ok:r.ok&&count===1&&text.includes('id="leadForm"'),status:r.status,count,leadForm:text.includes('id="leadForm"')}}catch(e){return{ok:false,status:0,error:String(e)}}}

Deno.serve(async req=>{
 if(req.method!=="POST")return out({error:"method_not_allowed"},405);
 const body=await req.json().catch(()=>({})),id=String(body.command_id||""),cmd=await command(id);
 if(!cmd||cmd.command_type!=="numa_provision"||cmd.status!=="queued"||new Date(cmd.expires_at).getTime()<=Date.now())return out({error:"invalid_command"},403);
 await svc.from("internal_command_queue").update({status:"running",started_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id);
 const result:any={host:HOST,worker:WORKER,organization_id:ORG_ID,gate_id:GATE_ID,steps:{}};
 try{
  const token=await cloudflareToken();if(!token)throw new Error("cloudflare_token_missing");
  const edgeToken=await readSecret("cloudsales_edge_token");if(!edgeToken)throw new Error("edge_token_missing");
  const turnstile=await ensureTurnstile(token);result.steps.turnstile={sitekey:turnstile.sitekey,reused:turnstile.reused};
  const[htmlRaw,tmplRaw]=await Promise.all([txt(`${RAW}/landing-edge.html`),txt(`${RAW}/worker-edge-template.mjs`)]);
  if(!htmlRaw.includes("numa-hotel-cloudsales-v1")||!htmlRaw.includes("__TURNSTILE_SITEKEY__"))throw new Error("landing_contract_failed");
  if(!tmplRaw.includes("__HTML_JSON__")||!tmplRaw.includes("__TURNSTILE_SITEKEY__"))throw new Error("worker_contract_failed");
  const html=htmlRaw.split("__TURNSTILE_SITEKEY__").join(turnstile.sitekey),template=tmplRaw.split("__TURNSTILE_SITEKEY__").join(turnstile.sitekey),code=template.replace("__HTML_JSON__",JSON.stringify(html));
  const challengeSecret=crypto.randomUUID()+crypto.randomUUID()+crypto.randomUUID();
  const uploaded=await upload(token,code,edgeToken,challengeSecret,turnstile.secret);result.steps.worker_upload=uploaded;if(!uploaded.ok)throw new Error(`worker_upload_failed_${uploaded.status}`);
  const attached=await attach(token);result.steps.domain_attach=attached;if(!attached.ok)throw new Error(`domain_attach_failed_${attached.status}`);
  await new Promise(r=>setTimeout(r,8000));
  const[page,health,robots,sitemap,form]=await Promise.all([smoke(`https://${HOST}/`,"numa-hotel-cloudsales-v1"),smoke(`https://${HOST}/health`,"cloudflare-managed"),smoke(`https://${HOST}/robots.txt`,`Sitemap: https://${HOST}/sitemap.xml`),smoke(`https://${HOST}/sitemap.xml`,`https://${HOST}/`),formCount(`https://${HOST}/`)]);
  result.steps.smoke={page,health,robots,sitemap,form};if(!Object.values(result.steps.smoke).every((x:any)=>x.ok))throw new Error("smoke_failed");
  const now=new Date().toISOString();const{data:g}=await svc.from("gate_configs").select("config").eq("id",GATE_ID).maybeSingle(),cfg=g?.config||{};
  await svc.from("gate_configs").update({status:"active",hostname:HOST,allowed_origins:[`https://${HOST}`],updated_at:now,config:{...cfg,turnstile:"active",turnstile_sitekey:turnstile.sitekey,anti_bot:true,server_validation:true,edge_challenge:"pow_hmac",contact_gates:{form_strategy:"single_physical_form",anti_bot:"turnstile_pow_hmac_honeypot_server_validation"},provisioning:{...(cfg.provisioning||{}),landing:"active",cloudflare_worker:WORKER,turnstile:"active",edge_challenge:"active",seo:"active",updated_at:now}}}).eq("id",GATE_ID);
  await svc.from("audit_log").insert({organization_id:ORG_ID,actor_type:"system",action:"numa.hotel_site.provisioned",entity_type:"gate_config",entity_id:GATE_ID,success:true,context:{hostname:HOST,worker:WORKER,security:"turnstile_pow_hmac_honeypot_server_validation",seo:"index_follow"}});
  await finish(id,"succeeded",result,null);return out(result);
 }catch(e){const error=String((e as Error).message||e).slice(0,700);result.error=error;await finish(id,"failed",result,error);return out(result,500)}
});
