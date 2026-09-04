import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CF="https://api.cloudflare.com/client/v4";
const ACCOUNT="bd94cb0580e86e7f40b4271a03052426";
const HOST="pennyworth.cloudsales.app";
const WORKER="pennyworth-lead-gateway";
const SITEKEY="0x4AAAAAAEiK97f4nFyAgMYx";
const U=Deno.env.get("SUPABASE_URL")!,S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const out=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"}});
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

async function settingSecret(key:string){const{data:s}=await svc.from("internal_settings").select("secret_id").eq("setting_key",key).maybeSingle();if(!s?.secret_id)throw new Error(`${key}_missing`);const{data}=await svc.rpc("service_read_secret",{p_secret_id:s.secret_id});if(!data)throw new Error(`${key}_unavailable`);return String(data)}
async function hmac(secret:string,v:string){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const sig=await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(v));return[...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function stripRuntime(html:string){const markers=["<script>(()=>{'use strict';\nconst e=s=>String","<script>(()=>{'use strict';\r\nconst e=s=>String"];let cut=-1;for(const m of markers){cut=html.indexOf(m);if(cut>=0)break}if(cut<0)throw new Error("live_runtime_marker_missing");const close=html.lastIndexOf("</body>");if(close<cut)throw new Error("live_body_close_missing");return html.slice(0,cut)+html.slice(close)}
function injectTelemetry(html:string,js:string){const marker='<script id="pennyworth-telemetry-v1">';let base=html,start=base.indexOf(marker);if(start>=0){const end=base.indexOf("</script>",start);if(end<0)throw new Error("telemetry_close_missing");base=base.slice(0,start)+base.slice(end+9)}const close=base.lastIndexOf("</body>");if(close<0)throw new Error("body_close_missing");return base.slice(0,close)+marker+js+"</script>"+base.slice(close)}
function patch(raw:string){let x=raw;
  // Browser must send the same Turnstile token the Worker verifies.
  if(!x.includes("turnstile_token:turnstileToken")){
    const a="const ch=await challenge(id),a=qp();";
    if(!x.includes(a))throw new Error("client_challenge_marker_missing");
    x=x.replace(a,"const turnstileToken=String(new FormData(form).get('cf-turnstile-response')||'');if(!turnstileToken)throw new Error('turnstile_required');const ch=await challenge(id),a=qp();");
    const b="idempotency_key:id,challenge:ch,form_id:formId";
    if(!x.includes(b))throw new Error("client_payload_marker_missing");
    x=x.replace(b,"idempotency_key:id,challenge:ch,turnstile_token:turnstileToken,form_id:formId");
    const c="show(err?.message==='secure_chat_grant_missing'?'No pudimos iniciar el chat seguro. Intenta nuevamente.':'No pudimos validar la solicitud. Intenta nuevamente.',false)";
    if(x.includes(c))x=x.replace(c,"show(err?.message==='secure_chat_grant_missing'?'No pudimos iniciar el chat seguro. Intenta nuevamente.':err?.message==='turnstile_required'?'Completa la verificación de seguridad.':'No pudimos validar la solicitud. Intenta nuevamente.',false);if(window.turnstile)turnstile.reset()");
  }
  // Remove the expensive 000 proof-of-work. Keep only a lightweight secondary signal.
  x=x.replaceAll("while(n<900000)","while(n<100000)").replace('prefix:"000"','prefix:"00"').replace('startsWith("000")','startsWith("00")').replace('challenge:"pow-hmac"','challenge:"light-pow-hmac"');
  // Server-side Turnstile verification, fail closed.
  if(!x.includes("const turnstileToken=clean(b.turnstile_token,2048)")){
    const ip=' const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=clean(b.website,300)!=="";';
    if(!x.includes(ip))throw new Error("server_ip_marker_missing");
    const verify=` const ip=req.headers.get("CF-Connecting-IP")||"",ua=req.headers.get("User-Agent")||"",honey=clean(b.website,300)!="";\n const turnstileToken=clean(b.turnstile_token,2048);if(!turnstileToken)return json({message:"Completa la verificación de seguridad."},422);\n let turnstileOk=false;try{const tr=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:turnstileToken,remoteip:ip})});const td=await tr.json();turnstileOk=td?.success===true&&(!td?.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase())}catch{}\n if(!turnstileOk)return json({message:"No pudimos validar la verificación de seguridad."},422);`;
    x=x.replace(ip,verify);
    const sec='security:{quality_score:Math.max(0,Math.min(100,score)),turnstile:true,honeypot:honey';
    if(!x.includes(sec))throw new Error("server_security_marker_missing");
    x=x.replace(sec,'security:{quality_score:Math.max(0,Math.min(100,score)),turnstile:turnstileOk,honeypot:honey');
    x=x.replace('const reasons=["edge_pow_hmac"];','const reasons=["edge_pow_hmac","cloudflare_turnstile"];');
  }
  x=x.replace('challenge:"light-pow-hmac",inventory:','challenge:"light-pow-hmac+turnstile",turnstile:"cloudflare-managed",inventory:');
  if(!x.includes("turnstile_token:turnstileToken")||!x.includes("TURNSTILE_SECRET")||!x.includes('prefix:"00"'))throw new Error("repaired_contract_incomplete");
  return x;
}
async function upload(token:string,code:string,edgeToken:string,challengeSecret:string,turnstileSecret:string){const metadata={main_module:"main.mjs",compatibility_date:"2026-08-26",bindings:[{type:"secret_text",name:"EDGE_TOKEN",text:edgeToken},{type:"secret_text",name:"CHALLENGE_SECRET",text:challengeSecret},{type:"secret_text",name:"TURNSTILE_SECRET",text:turnstileSecret}]};const f=new FormData();f.append("metadata",new Blob([JSON.stringify(metadata)],{type:"application/json"}));f.append("main.mjs",new Blob([code],{type:"application/javascript+module"}),"main.mjs");const r=await fetch(`${CF}/accounts/${ACCOUNT}/workers/scripts/${WORKER}`,{method:"PUT",headers:{Authorization:`Bearer ${token}`},body:f});const text=await r.text();let data:any={};try{data=JSON.parse(text)}catch{data={raw:text.slice(0,500)}}return{ok:r.ok&&data?.success!==false,status:r.status,data}}
async function solve(id:string,ch:any){for(let n=0;n<100000;n++){if((await sha(`${id}.${ch.nonce}.${ch.ts}.${ch.sig}.${n}`)).startsWith(ch.prefix))return n}throw new Error("light_pow_failed")}

Deno.serve(async req=>{if(req.method!=="POST")return out({error:"method_not_allowed"},405);const body=await req.json().catch(()=>({})),commandId=String(body.command_id||"");const{data:cmd}=await svc.from("internal_command_queue").select("*").eq("id",commandId).maybeSingle();if(!cmd||cmd.command_type!=="pennyworth_form_repair"||cmd.status!=="queued"||new Date(cmd.expires_at).getTime()<Date.now())return out({error:"invalid_command"},403);await svc.from("internal_command_queue").update({status:"running",started_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",commandId);const result:any={host:HOST,worker:WORKER,steps:{}};try{
  const cfToken=Deno.env.get("CLOUDFLARE_API_TOKEN_CLOUDSALES")||"";if(!cfToken)throw new Error("cloudflare_token_missing");const edgeToken=await settingSecret("cloudsales_edge_token"),turnstileSecret=await settingSecret("pennyworth_turnstile_secret");
  const stamp=Date.now();const[liveR,tmplR,telR]=await Promise.all([fetch(`https://${HOST}/?repair_source=${stamp}`,{headers:{"cache-control":"no-cache"}}),fetch(`https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/main/web/clients/pennyworth/worker-edge-template.mjs?v=${stamp}`),fetch(`https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/main/web/clients/pennyworth/telemetry-v1.js?v=${stamp}`)]);if(!liveR.ok||!tmplR.ok||!telR.ok)throw new Error("source_fetch_failed");const live=await liveR.text(),raw=patch(await tmplR.text()),telemetry=await telR.text();if(!live.includes(SITEKEY)||!live.includes("cf-turnstile"))throw new Error("live_turnstile_widget_missing");const html=injectTelemetry(stripRuntime(live),telemetry),code=raw.split("__HTML_JSON__").join(JSON.stringify(html));if(!code.includes("turnstile_token:turnstileToken"))throw new Error("compiled_client_token_missing");result.steps.contract={client_token:true,server_turnstile:true,light_pow:true,honeypot:code.includes("honeypot:honey")};
  const up=await upload(cfToken,code,edgeToken,crypto.randomUUID()+crypto.randomUUID()+crypto.randomUUID(),turnstileSecret);result.steps.upload={ok:up.ok,status:up.status,errors:up.data?.errors||[]};if(!up.ok)throw new Error(`worker_upload_${up.status}`);await sleep(2500);
  const pageR=await fetch(`https://${HOST}/?repair_verify=${Date.now()}`,{headers:{"cache-control":"no-cache"}}),page=await pageR.text();const healthR=await fetch(`https://${HOST}/health?repair_verify=${Date.now()}`,{headers:{"cache-control":"no-cache"}}),health:any=await healthR.json().catch(()=>({}));const id=`qa-security-${crypto.randomUUID()}`,challengeR=await fetch(`https://${HOST}/challenge?id=${encodeURIComponent(id)}`,{headers:{"cache-control":"no-cache"}}),ch:any=await challengeR.json();result.steps.live={page_status:pageR.status,client_token:page.includes("turnstile_token:turnstileToken"),widget:page.includes(SITEKEY),health_status:healthR.status,turnstile:health.turnstile||null,challenge_prefix:ch.prefix||null};if(!pageR.ok||!result.steps.live.client_token||!result.steps.live.widget||health.turnstile!=="cloudflare-managed"||ch.prefix!=="00")throw new Error("live_contract_failed");
  const n=await solve(id,ch);const botR=await fetch(`https://${HOST}/lead`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({first_name:"QA",last_name:"Bot rejection",phone:"+529841111111",email:"qa-security@example.invalid",website:"",started_at:Date.now()-3000,idempotency_key:id,challenge:{...ch,n},form_id:"pennyworth_security_probe",form_answers:{channel:"qa",interest:"security"}})}),bot:any=await botR.json().catch(()=>({}));result.steps.bot_gate={status:botR.status,rejected:botR.status===422,message:String(bot.message||"").slice(0,120)};if(botR.status!==422||!/verificaci/i.test(String(bot.message||"")))throw new Error("bot_gate_failed");
  result.ok=true;await svc.from("internal_command_queue").update({status:"succeeded",result,error:null,finished_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",commandId);return out(result);
 }catch(e){const error=String((e as Error).message||e).slice(0,500);result.error=error;await svc.from("internal_command_queue").update({status:"failed",result,error,finished_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",commandId);return out(result,500)}});
