import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")!;
const A=Deno.env.get("SUPABASE_ANON_KEY")!;
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED=new Set(["https://app.cloudsales.app","https://cloudsales.app","https://www.cloudsales.app","http://localhost:3000","http://localhost:5173"]);
function cors(o:string|null){const v=o&&ALLOWED.has(o)?o:"https://app.cloudsales.app";return{"Access-Control-Allow-Origin":v,"Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"}}
function j(body:unknown,status=200,o:string|null=null){return new Response(JSON.stringify(body),{status,headers:{...cors(o),"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}})}
const t=(v:unknown,n=500)=>{const s=String(v??"").trim();return s?s.slice(0,n):null};
const num=(v:unknown)=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};

Deno.serve(async req=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
  if(req.method!=="POST")return j({error:"method_not_allowed"},405,origin);
  if(origin&&!ALLOWED.has(origin))return j({error:"origin_not_allowed"},403,origin);
  const auth=req.headers.get("authorization");
  if(!auth)return j({error:"missing_authorization"},401,origin);
  const userClient=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud}=await userClient.auth.getUser();
  const user=ud.user;
  if(!user)return j({error:"invalid_session"},401,origin);
  const body=await req.json().catch(()=>null) as any;
  if(!body)return j({error:"invalid_json"},400,origin);
  const org=String(body.organization_id||"");
  const action=String(body.action||"snapshot");
  if(!org)return j({error:"organization_id_required"},400,origin);
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:member}=await svc.from("organization_members").select("role,status").eq("organization_id",org).eq("user_id",user.id).maybeSingle();
  if(!member||member.status!=="active")return j({error:"forbidden"},403,origin);
  const canWrite=["owner","admin","operator"].includes(String(member.role||""));

  if(action==="snapshot"){
    const {data,error}=await svc.from("inventory_items")
      .select("id,item_type,sku,name,status,short_description,price_min,price_max,currency,public_slug,attributes,media,created_at,updated_at")
      .eq("organization_id",org).order("updated_at",{ascending:false}).limit(500);
    if(error)return j({error:"inventory_read_failed"},500,origin);
    const items=data||[];
    const byType:Record<string,number>={},byStatus:Record<string,number>={};
    for(const x of items){const ty=String(x.item_type||"other"),st=String(x.status||"unknown");byType[ty]=(byType[ty]||0)+1;byStatus[st]=(byStatus[st]||0)+1}
    return j({generated_at:new Date().toISOString(),items,summary:{total:items.length,by_type:byType,by_status:byStatus,active:Number(byStatus.active||0),inactive:items.length-Number(byStatus.active||0)}},200,origin);
  }

  if(!canWrite)return j({error:"read_only_role"},403,origin);

  if(action==="create"){
    const input=body.input||{};
    const name=t(input.name,180),itemType=t(input.item_type,60)||"product",status=t(input.status,60)||"active";
    if(!name)return j({error:"name_required"},400,origin);
    const pmin=num(input.price_min),pmax=num(input.price_max);
    if((pmin!==null&&pmin<0)||(pmax!==null&&pmax<0))return j({error:"invalid_price"},400,origin);
    const payload:any={organization_id:org,item_type:itemType,sku:t(input.sku,120),name,status,short_description:t(input.short_description,500),description:t(input.description,5000),price_min:pmin,price_max:pmax,currency:(t(input.currency,3)||"USD")!.toUpperCase(),public_slug:t(input.public_slug,180),attributes:input.attributes&&typeof input.attributes==="object"&&!Array.isArray(input.attributes)?input.attributes:{},media:Array.isArray(input.media)?input.media:[],created_by:user.id};
    const {data,error}=await svc.from("inventory_items").insert(payload).select("*").single();
    if(error)return j({error:"inventory_create_failed"},500,origin);
    await svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action:"inventory.created",entity_type:"inventory_item",entity_id:data.id,success:true});
    return j({item:data},201,origin);
  }

  if(action==="update"){
    const input=body.input||{},id=String(input.id||"");
    if(!id)return j({error:"id_required"},400,origin);
    const patch:any={updated_at:new Date().toISOString()};
    for(const [k,n] of [["item_type",60],["sku",120],["name",180],["status",60],["short_description",500],["description",5000],["currency",3],["public_slug",180]] as [string,number][]){if(input[k]!==undefined)patch[k]=t(input[k],n)}
    if(patch.currency)patch.currency=String(patch.currency).toUpperCase();
    for(const k of ["price_min","price_max"]){if(input[k]!==undefined){const v=num(input[k]);if(v!==null&&v<0)return j({error:"invalid_price"},400,origin);patch[k]=v}}
    if(input.attributes&&typeof input.attributes==="object"&&!Array.isArray(input.attributes))patch.attributes=input.attributes;
    if(Array.isArray(input.media))patch.media=input.media;
    const {data,error}=await svc.from("inventory_items").update(patch).eq("id",id).eq("organization_id",org).select("*").maybeSingle();
    if(error)return j({error:"inventory_update_failed"},500,origin);
    if(!data)return j({error:"inventory_item_not_found"},404,origin);
    await svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action:"inventory.updated",entity_type:"inventory_item",entity_id:id,success:true});
    return j({item:data},200,origin);
  }

  return j({error:"unsupported_action",supported:["snapshot","create","update"]},400,origin);
});
