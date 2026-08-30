import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")!;
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const te=new TextEncoder();
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer"}});

async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",te.encode(v));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function same(a:string,b:string){if(!a||!b)return false;const[x,y]=await Promise.all([sha(a),sha(b)]);if(x.length!==y.length)return false;let r=0;for(let i=0;i<x.length;i++)r|=x.charCodeAt(i)^y.charCodeAt(i);return r===0}
function randomToken(bytes=32){const b=new Uint8Array(bytes);crypto.getRandomValues(b);let s="";for(const x of b)s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}

Deno.serve(async req=>{
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const supplied=req.headers.get("x-cloudsales-worker-token")||"";
  const {data:setting}=await svc.from("internal_settings").select("secret_id").eq("setting_key","automation_worker_token").maybeSingle();
  if(!setting?.secret_id)return json({error:"issuer_not_configured"},503);
  const {data:expected}=await svc.rpc("service_read_secret",{p_secret_id:setting.secret_id});
  if(!expected||!(await same(supplied,String(expected))))return json({error:"forbidden"},403);

  let body:any={};try{body=await req.json()}catch{return json({error:"invalid_json"},400)}
  const purpose=String(body.purpose||"cloudsales_platform_integrations").trim().replace(/[^a-z0-9_.-]/gi,"_").slice(0,80)||"cloudsales_platform_integrations";
  const requested=Number(body.ttl_minutes||30);
  const ttl=Math.min(60,Math.max(5,Number.isFinite(requested)?Math.round(requested):30));
  const token=randomToken(36),hash=await sha(token),expiresAt=new Date(Date.now()+ttl*60_000).toISOString();

  await svc.from("admin_setup_tokens").update({revoked_at:new Date().toISOString()}).eq("purpose",purpose).is("revoked_at",null).gt("expires_at",new Date().toISOString());
  const {error}=await svc.from("admin_setup_tokens").insert({token_hash:hash,purpose,expires_at:expiresAt,use_count:0});
  if(error)return json({error:"setup_token_create_failed"},500);

  await svc.from("audit_log").insert({actor_type:"system",action:"admin.setup.link.issued",entity_type:"admin_setup_token",entity_id:hash.slice(0,24),success:true,context:{purpose,ttl_minutes:ttl,expires_at:expiresAt}});
  return json({setup_url:`${U}/functions/v1/admin-secrets-setup?token=${encodeURIComponent(token)}`,expires_at:expiresAt,purpose,ttl_minutes:ttl},200);
});
