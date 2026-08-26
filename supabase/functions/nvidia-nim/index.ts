import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const U=Deno.env.get("SUPABASE_URL")!;
const A=Deno.env.get("SUPABASE_ANON_KEY")!;
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"}});
Deno.serve(async(req)=>{
  if(req.method!=="POST") return json({error:"method_not_allowed"},405);
  const auth=req.headers.get("authorization"); if(!auth) return json({error:"missing_authorization"},401);
  const uc=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud}=await uc.auth.getUser(); if(!ud.user) return json({error:"invalid_session"},401);
  let body:any; try{body=await req.json()}catch{return json({error:"invalid_json"},400)}
  const messages=Array.isArray(body.messages)?body.messages.slice(-24):[]; if(!messages.length) return json({error:"messages_required"},400);
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:setting}=await svc.from("internal_settings").select("secret_id").eq("setting_key","nvidia_api_key_cloudsales").maybeSingle();
  if(!setting?.secret_id) return json({error:"nvidia_not_configured"},503);
  const {data:key,error}=await svc.rpc("service_read_secret",{p_secret_id:setting.secret_id});
  if(error||!key) return json({error:"nvidia_secret_unavailable"},503);
  const model=String(body.model||"nvidia/nemotron-3-nano-30b-a3b");
  const payload:any={model,messages,max_tokens:Math.min(Math.max(Number(body.max_tokens||900),1),2000),temperature:Math.min(Math.max(Number(body.temperature??0.2),0),1)};
  if(Array.isArray(body.tools)&&body.tools.length){payload.tools=body.tools;payload.tool_choice=body.tool_choice||"auto"}
  const started=Date.now();
  const r=await fetch("https://integrate.api.nvidia.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"content-type":"application/json",Accept:"application/json"},body:JSON.stringify(payload)});
  const raw=await r.json().catch(()=>({}));
  if(!r.ok) return json({error:"nvidia_request_failed",provider_status:r.status},502);
  return json({ok:true,provider:"nvidia_nim",model:raw.model||model,latency_ms:Date.now()-started,choices:raw.choices||[],usage:raw.usage||null});
});
