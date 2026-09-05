import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")!;
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP="https://app.cloudsales.app/pwa.html";

async function sha(v:string){
  const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));
  return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

function redirect(params:Record<string,string>,status=302){
  const u=new URL(APP);
  for(const[k,v]of Object.entries(params))if(v)u.searchParams.set(k,v);
  u.hash="connect";
  return new Response(null,{status,headers:{Location:u.toString(),"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
}

Deno.serve(async req=>{
  if(!["GET","POST"].includes(req.method))return new Response("method_not_allowed",{status:405});
  let p=new URL(req.url).searchParams;
  if(req.method==="POST"){
    const ct=req.headers.get("content-type")||"";
    try{
      if(ct.includes("application/x-www-form-urlencoded")||ct.includes("multipart/form-data")){
        const f=await req.formData(),q=new URLSearchParams();
        for(const[k,v]of f.entries())if(typeof v==="string")q.set(k,v);
        p=q;
      }else if(ct.includes("application/json")){
        const b=await req.json(),q=new URLSearchParams();
        for(const[k,v]of Object.entries(b||{}))if(v!=null)q.set(k,String(v));
        p=q;
      }
    }catch{return redirect({error:"invalid_callback_payload"});}
  }

  const state=String(p.get("state")||"");
  const code=String(p.get("code")||"");
  const providerError=String(p.get("error")||p.get("error_description")||"").slice(0,500);
  if(!state)return redirect({error:"missing_state"});

  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const stateHash=await sha(state);
  const {data:a}=await svc.from("oauth_states").select("id,provider_key,expires_at,consumed_at,callback_code_secret_id").eq("state_hash",stateHash).maybeSingle();
  if(!a||a.consumed_at||new Date(a.expires_at).getTime()<=Date.now())return redirect({error:"invalid_or_expired_state"});

  if(providerError||!code){
    await svc.from("oauth_states").update({callback_received_at:new Date().toISOString(),callback_error:providerError||"missing_code"}).eq("id",a.id);
    return redirect({provider:a.provider_key,oauth_attempt_id:a.id,state,error:providerError||"missing_code"});
  }

  let sid=a.callback_code_secret_id;
  if(sid){
    await svc.rpc("service_update_secret",{p_secret_id:sid,p_secret:code,p_name:`cloudsales/oauth/${a.id}/code`,p_description:"Temporary OAuth authorization code"});
  }else{
    const {data:id,error}=await svc.rpc("service_store_secret",{p_secret:code,p_name:`cloudsales/oauth/${a.id}/code`,p_description:"Temporary OAuth authorization code"});
    if(error||!id)return redirect({provider:a.provider_key,oauth_attempt_id:a.id,state,error:"callback_storage_failed"});
    sid=id;
  }

  await svc.from("oauth_states").update({callback_code_secret_id:sid,callback_received_at:new Date().toISOString(),callback_error:null}).eq("id",a.id);
  return redirect({provider:a.provider_key,oauth_attempt_id:a.id,state,status:"received"});
});
