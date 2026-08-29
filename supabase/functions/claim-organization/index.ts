import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")!,A=Deno.env.get("SUPABASE_ANON_KEY")!,S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORIGINS=new Set(["https://cloudsales.app","https://www.cloudsales.app","https://app.cloudsales.app","http://localhost:3000","http://localhost:5173"]);
function cors(o:string|null){const v=o&&ORIGINS.has(o)?o:"https://app.cloudsales.app";return{"Access-Control-Allow-Origin":v,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"}}
function json(b:unknown,s=200,o:string|null=null){return new Response(JSON.stringify(b),{status:s,headers:{...cors(o),"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer"}})}
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}

Deno.serve(async req=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405,origin);
  if(origin&&!ORIGINS.has(origin))return json({error:"origin_not_allowed"},403,origin);
  const auth=req.headers.get("authorization");if(!auth)return json({error:"missing_authorization"},401,origin);
  const uc=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud}=await uc.auth.getUser();const user=ud.user;if(!user)return json({error:"invalid_session"},401,origin);
  let body:any;try{body=await req.json()}catch{return json({error:"invalid_json"},400,origin)}
  const token=String(body.token||"").trim();if(token.length<32||token.length>512)return json({error:"invalid_claim_token"},400,origin);
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}}),tokenHash=await sha(token);
  const {data:claim}=await svc.from("organization_claim_tokens").select("id,organization_id,role,expires_at,consumed_at").eq("token_hash",tokenHash).maybeSingle();
  if(!claim||claim.consumed_at||new Date(claim.expires_at).getTime()<=Date.now())return json({error:"claim_invalid_or_expired"},410,origin);
  const {data:org}=await svc.from("organizations").select("id,name,slug,status,plan_key").eq("id",claim.organization_id).maybeSingle();
  if(!org||org.status!=="active")return json({error:"organization_unavailable"},409,origin);
  const requestedRole=["owner","admin","operator","viewer"].includes(String(claim.role||""))?String(claim.role):"operator";
  const {data:existing}=await svc.from("organization_members").select("user_id,role,status").eq("organization_id",org.id).eq("user_id",user.id).maybeSingle();
  const {data:owners}=await svc.from("organization_members").select("user_id").eq("organization_id",org.id).eq("status","active").eq("role","owner");
  if(requestedRole==="owner"&&(owners||[]).length&&!(owners||[]).some((x:any)=>x.user_id===user.id))return json({error:"organization_owner_already_assigned"},409,origin);
  const role=existing?.status==="active"&&existing?.role?String(existing.role):requestedRole;
  const {error:me}=await svc.from("organization_members").upsert({organization_id:org.id,user_id:user.id,role,status:"active",updated_at:new Date().toISOString()},{onConflict:"organization_id,user_id"});
  if(me)return json({error:"membership_create_failed",detail:me.message},500,origin);
  const {error:ce}=await svc.from("organization_claim_tokens").update({consumed_at:new Date().toISOString(),consumed_by:user.id}).eq("id",claim.id).is("consumed_at",null);
  if(ce)return json({error:"claim_consume_failed"},500,origin);
  await svc.from("audit_log").insert({organization_id:org.id,actor_user_id:user.id,actor_type:"user",action:"organization.claimed",entity_type:"organization",entity_id:org.id,success:true,context:{role,requested_role:requestedRole,existing_member:Boolean(existing)}});
  return json({ok:true,organization:org,role},200,origin);
});