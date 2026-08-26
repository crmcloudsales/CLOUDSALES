import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")!;
const A=Deno.env.get("SUPABASE_ANON_KEY")!;
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BASE="https://services.leadconnectorhq.com";
const ORIGINS=new Set(["https://cloudsales.app","https://www.cloudsales.app","https://app.cloudsales.app","http://localhost:3000","http://localhost:5173"]);
function cors(o:string|null){const v=o&&ORIGINS.has(o)?o:"https://app.cloudsales.app";return{"Access-Control-Allow-Origin":v,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"}}
function json(b:unknown,s=200,o:string|null=null){return new Response(JSON.stringify(b),{status:s,headers:{...cors(o),"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}})}

Deno.serve(async req=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:cors(origin)});
  if(req.method!=="POST") return json({error:"method_not_allowed"},405,origin);
  if(origin&&!ORIGINS.has(origin)) return json({error:"origin_not_allowed"},403,origin);
  const auth=req.headers.get("authorization");
  if(!auth) return json({error:"missing_authorization"},401,origin);
  const uc=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud}=await uc.auth.getUser(); const user=ud.user;
  if(!user) return json({error:"invalid_session"},401,origin);
  let body:any; try{body=await req.json()}catch{return json({error:"invalid_json"},400,origin)}
  const org=String(body.organization_id||""); const action=String(body.action||"");
  if(!org||!action) return json({error:"organization_id_and_action_required"},400,origin);
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:m}=await svc.from("organization_members").select("role,status").eq("organization_id",org).eq("user_id",user.id).maybeSingle();
  if(!m||m.status!=="active"||!["owner","admin"].includes(m.role)) return json({error:"forbidden"},403,origin);
  const {data:c}=await svc.from("connections").select("id,external_account_id,metadata,status").eq("organization_id",org).eq("provider_key","highlevel").eq("status","connected").maybeSingle();
  if(!c) return json({error:"highlevel_agency_not_connected"},409,origin);
  const userType=String(c.metadata?.user_type||"");
  if(userType!=="Company") return json({error:"agency_token_required",current_user_type:userType||null},409,origin);
  const {data:sec}=await svc.from("connection_secrets").select("access_token_secret_id").eq("connection_id",c.id).maybeSingle();
  if(!sec?.access_token_secret_id) return json({error:"highlevel_token_missing"},503,origin);
  const {data:token}=await svc.rpc("service_read_secret",{p_secret_id:sec.access_token_secret_id});
  if(!token) return json({error:"highlevel_token_unavailable"},503,origin);
  const companyId=String(c.metadata?.company_id||c.external_account_id||"");
  if(!companyId) return json({error:"company_id_missing"},503,origin);
  const headers={Authorization:`Bearer ${token}`,Accept:"application/json","Content-Type":"application/json",Version:"v3"};
  let url="",method="GET",payload:any=undefined;
  if(action==="list_snapshots"){
    url=`${BASE}/snapshots/?companyId=${encodeURIComponent(companyId)}`;
  } else if(action==="create_subaccount"){
    url=`${BASE}/locations/`; method="POST";
    payload={...body.input,companyId};
    if(!payload.name) return json({error:"subaccount_name_required"},400,origin);
  } else if(action==="get_location_token"){
    const locationId=String(body.input?.locationId||""); if(!locationId)return json({error:"locationId_required"},400,origin);
    url=`${BASE}/oauth/locationToken`; method="POST"; payload={companyId,locationId};
  } else if(action==="apply_snapshot"){
    const locationId=String(body.input?.locationId||""); const snapshotId=String(body.input?.snapshotId||"");
    if(!locationId||!snapshotId)return json({error:"locationId_and_snapshotId_required"},400,origin);
    url=`${BASE}/locations/${encodeURIComponent(locationId)}`; method="PUT"; payload={companyId,name:String(body.input?.name||"CloudSales Client"),snapshot:{id:snapshotId,override:Boolean(body.input?.override)}};
  } else return json({error:"unsupported_action"},400,origin);
  const r=await fetch(url,{method,headers,body:payload?JSON.stringify(payload):undefined});
  const text=await r.text(); let data:any={}; try{data=JSON.parse(text)}catch{data={raw:text.slice(0,500)}}
  await svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action:`highlevel.agency.${action}`,entity_type:"highlevel_agency",connection_id:c.id,success:r.ok,context:{status:r.status,location_id:body.input?.locationId||null,snapshot_id:body.input?.snapshotId||null}});
  if(!r.ok){
    const planBlocked=r.status===403 && action==="create_subaccount";
    return json({error:"highlevel_request_failed",status:r.status,plan_blocked:planBlocked,details:data},r.status,origin);
  }
  return json({ok:true,action,data},200,origin);
});
