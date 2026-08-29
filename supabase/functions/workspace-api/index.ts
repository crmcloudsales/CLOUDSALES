import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")!,A=Deno.env.get("SUPABASE_ANON_KEY")!,S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const origins=new Set(["https://cloudsales.app","https://www.cloudsales.app","https://app.cloudsales.app","http://localhost:3000","http://localhost:5173"]);

function cors(o:string|null){const v=o&&origins.has(o)?o:"https://app.cloudsales.app";return{"Access-Control-Allow-Origin":v,"Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"}}
function j(b:unknown,s=200,o:string|null=null){return new Response(JSON.stringify(b),{status:s,headers:{...cors(o),"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}})}
function text(v:any,n=300){const s=String(v??"").trim();return s?s.slice(0,n):null}
function finite(v:any){const n=Number(v);return Number.isFinite(n)?n:null}
function money(v:any){const n=Number(v||0);return Number.isFinite(n)?Math.round(n*10000)/10000:0}

Deno.serve(async req=>{
  const o=req.headers.get("origin");
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(o)});
  if(req.method!=="POST")return j({error:"method_not_allowed"},405,o);
  if(o&&!origins.has(o))return j({error:"origin_not_allowed"},403,o);
  const auth=req.headers.get("authorization");if(!auth)return j({error:"missing_authorization"},401,o);
  const uc=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud}=await uc.auth.getUser();const user=ud.user;if(!user)return j({error:"invalid_session"},401,o);
  let b:any;try{b=await req.json()}catch{return j({error:"invalid_json"},400,o)}
  const org=String(b.organization_id||""),action=String(b.action||"");if(!org||!action)return j({error:"missing_required_fields"},400,o);
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:m}=await svc.from("organization_members").select("role,status").eq("organization_id",org).eq("user_id",user.id).maybeSingle();
  if(!m||m.status!=="active")return j({error:"forbidden"},403,o);
  const canWrite=["owner","admin","operator"].includes(m.role);
  const readActions=new Set(["snapshot","works.snapshot"]);
  if(!readActions.has(action)&&!canWrite)return j({error:"read_only_role"},403,o);

  if(action==="snapshot"){
    const [c,op,ap,ev]=await Promise.all([
      svc.from("contacts").select("id,first_name,last_name,email,phone_e164,lifecycle_stage,quality_status,quality_score,primary_source_provider,created_at").eq("organization_id",org).order("created_at",{ascending:false}).limit(100),
      svc.from("opportunities").select("id,contact_id,name,stage,status,value,currency,expected_close_date,created_at").eq("organization_id",org).order("created_at",{ascending:false}).limit(100),
      svc.from("appointments").select("id,contact_id,starts_at,ends_at,status,provider_key,external_id,metadata,created_at,updated_at").eq("organization_id",org).order("starts_at",{ascending:true}).limit(100),
      svc.from("commercial_events").select("id,contact_id,opportunity_id,appointment_id,event_type,source,occurred_at,value,currency,metadata").eq("organization_id",org).order("occurred_at",{ascending:false}).limit(50)
    ]);
    return j({contacts:c.data||[],opportunities:op.data||[],appointments:ap.data||[],events:ev.data||[]},200,o)
  }

  if(action==="works.snapshot"){
    const now=new Date();
    const monthStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString();
    const dayStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())).toISOString();
    const [catalogResult,ledgerResult]=await Promise.all([
      svc.from("work_catalog").select("work_key,category,name_en,name_es,description_en,description_es,unit,pricing_mode,base_price_usd,active,metadata").eq("active",true).order("category").order("work_key"),
      svc.from("work_ledger").select("id,work_key,quantity,unit_price_usd,amount_usd,status,source_type,source_id,occurred_at,metadata").eq("organization_id",org).gte("occurred_at",monthStart).order("occurred_at",{ascending:false}).limit(500)
    ]);
    if(catalogResult.error)return j({error:"works_catalog_read_failed"},500,o);
    if(ledgerResult.error)return j({error:"works_ledger_read_failed"},500,o);
    const catalog=catalogResult.data||[],rows=ledgerResult.data||[];
    const catalogMap=new Map(catalog.map((x:any)=>[x.work_key,x]));
    const posted=rows.filter((x:any)=>x.status==="posted");
    const groups=new Map<string,any>();
    for(const row of posted){
      const key=String(row.work_key);const item:any=catalogMap.get(key)||{};
      const current=groups.get(key)||{work_key:key,name_en:item.name_en||key,name_es:item.name_es||key,unit:item.unit||"unit",quantity:0,amount_usd:0,unit_price_usd:Number(row.unit_price_usd||item.base_price_usd||0),count:0};
      current.quantity+=Number(row.quantity||0);current.amount_usd+=Number(row.amount_usd||0);current.count+=1;groups.set(key,current);
    }
    const today=posted.filter((x:any)=>String(x.occurred_at)>=dayStart);
    return j({
      currency:"USD",
      generated_at:new Date().toISOString(),
      period:{month_start:monthStart,day_start:dayStart},
      totals:{today_usd:money(today.reduce((a:number,x:any)=>a+Number(x.amount_usd||0),0)),month_usd:money(posted.reduce((a:number,x:any)=>a+Number(x.amount_usd||0),0)),posted_count:posted.length},
      groups:[...groups.values()].map((x:any)=>({...x,quantity:money(x.quantity),amount_usd:money(x.amount_usd)})).sort((a:any,b:any)=>b.amount_usd-a.amount_usd),
      recent:rows.slice(0,80).map((x:any)=>({...x,catalog:catalogMap.get(String(x.work_key))||null})),
      catalog,
      note:"Media spend is billed directly by advertising platforms and is not included in Works."
    },200,o)
  }

  if(action==="contact.create"){
    const email=text(b.input?.email,320)?.toLowerCase()||null;
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return j({error:"invalid_email"},400,o);
    const payload={organization_id:org,first_name:text(b.input?.first_name,100),last_name:text(b.input?.last_name,100),email,phone_e164:text(b.input?.phone,40),lifecycle_stage:text(b.input?.lifecycle_stage,60)||"lead",quality_status:"new",primary_source_provider:"cloudsales",metadata:{created_via:"cloudsales_app"}};
    if(!payload.first_name&&!payload.email&&!payload.phone_e164)return j({error:"contact_identity_required"},400,o);
    const {data,error}=await svc.from("contacts").insert(payload).select("*").single();if(error)return j({error:"contact_create_failed"},500,o);
    await Promise.all([svc.from("commercial_events").insert({organization_id:org,contact_id:data.id,event_type:"contact.created",source:"cloudsales",idempotency_key:`contact-created:${data.id}`,metadata:{via:"app"}}),svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action:"contact.created",entity_type:"contact",entity_id:data.id,success:true})]);return j({contact:data},201,o)
  }

  if(action==="contact.update"){
    const id=String(b.input?.id||"");if(!id)return j({error:"contact_id_required"},400,o);const patch:any={};
    for(const [k,max] of [["first_name",100],["last_name",100],["email",320],["phone_e164",40],["lifecycle_stage",60],["quality_status",60]] as any[]){if(b.input?.[k]!==undefined)patch[k]=text(b.input[k],max)}
    if(patch.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email))return j({error:"invalid_email"},400,o);
    if(b.input?.quality_score!==undefined){const q=finite(b.input.quality_score);if(q===null)return j({error:"invalid_quality_score"},400,o);patch.quality_score=Math.max(0,Math.min(100,Math.round(q)))}
    patch.updated_at=new Date().toISOString();const {data,error}=await svc.from("contacts").update(patch).eq("id",id).eq("organization_id",org).select("*").maybeSingle();if(error)return j({error:"contact_update_failed"},500,o);if(!data)return j({error:"contact_not_found"},404,o);await svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action:"contact.updated",entity_type:"contact",entity_id:id,success:true});return j({contact:data},200,o)
  }

  if(action==="opportunity.create"){
    const input=b.input||{},contactId=text(input.contact_id,80),name=text(input.name,160);if(!name)return j({error:"opportunity_name_required"},400,o);
    if(contactId){const {data:c}=await svc.from("contacts").select("id").eq("id",contactId).eq("organization_id",org).maybeSingle();if(!c)return j({error:"contact_not_found"},404,o)}
    let value:any=null;if(input.value!==""&&input.value!=null){value=finite(input.value);if(value===null||value<0)return j({error:"invalid_opportunity_value"},400,o)}
    const payload={organization_id:org,contact_id:contactId,name,stage:text(input.stage,80)||"new",status:["open","won","lost","abandoned"].includes(String(input.status))?String(input.status):"open",value,currency:text(input.currency,3)?.toUpperCase()||"USD",expected_close_date:text(input.expected_close_date,20),metadata:{created_via:"cloudsales_app"}};
    const {data,error}=await svc.from("opportunities").insert(payload).select("*").single();if(error)return j({error:"opportunity_create_failed"},500,o);
    await Promise.all([svc.from("commercial_events").insert({organization_id:org,contact_id:contactId,opportunity_id:data.id,event_type:"opportunity.created",source:"cloudsales",idempotency_key:`opportunity-created:${data.id}`,value:data.value,currency:data.currency,metadata:{via:"app"}}),svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action:"opportunity.created",entity_type:"opportunity",entity_id:data.id,success:true})]);return j({opportunity:data},201,o)
  }

  if(action==="opportunity.update"){
    const input=b.input||{},id=String(input.id||"");if(!id)return j({error:"opportunity_id_required"},400,o);const patch:any={};
    for(const [k,max] of [["name",160],["stage",80],["currency",3],["expected_close_date",20]] as any[]){if(input[k]!==undefined)patch[k]=text(input[k],max)}
    if(input.status!==undefined&&["open","won","lost","abandoned"].includes(String(input.status)))patch.status=String(input.status);
    if(input.value!==undefined){if(input.value==="")patch.value=null;else{const v=finite(input.value);if(v===null||v<0)return j({error:"invalid_opportunity_value"},400,o);patch.value=v}}
    patch.updated_at=new Date().toISOString();const {data,error}=await svc.from("opportunities").update(patch).eq("id",id).eq("organization_id",org).select("*").maybeSingle();if(error)return j({error:"opportunity_update_failed"},500,o);if(!data)return j({error:"opportunity_not_found"},404,o);await svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action:"opportunity.updated",entity_type:"opportunity",entity_id:id,success:true,context:{status:data.status,stage:data.stage}});return j({opportunity:data},200,o)
  }

  if(action==="appointment.create"){
    const input=b.input||{},starts=text(input.starts_at,80),contactId=text(input.contact_id,80);if(!starts||Number.isNaN(Date.parse(starts)))return j({error:"invalid_starts_at"},400,o);
    if(contactId){const {data:c}=await svc.from("contacts").select("id").eq("id",contactId).eq("organization_id",org).maybeSingle();if(!c)return j({error:"contact_not_found"},404,o)}
    const ends=text(input.ends_at,80);if(ends&&Number.isNaN(Date.parse(ends)))return j({error:"invalid_ends_at"},400,o);if(ends&&Date.parse(ends)<=Date.parse(starts))return j({error:"ends_at_must_be_after_starts_at"},400,o);
    const payload={organization_id:org,contact_id:contactId,starts_at:starts,ends_at:ends,status:"scheduled",provider_key:"cloudsales",metadata:{title:text(input.title,160)||"CloudSales Appointment",created_via:"cloudsales_app"}};
    const {data,error}=await svc.from("appointments").insert(payload).select("*").single();if(error)return j({error:"appointment_create_failed"},500,o);
    await Promise.all([svc.from("commercial_events").insert({organization_id:org,contact_id:data.contact_id,appointment_id:data.id,event_type:"appointment.scheduled",source:"cloudsales",idempotency_key:`appointment-scheduled:${data.id}`,metadata:{via:"app"}}),svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action:"appointment.created",entity_type:"appointment",entity_id:data.id,success:true})]);return j({appointment:data},201,o)
  }

  if(action==="appointment.update"){
    const input=b.input||{},id=String(input.id||"");if(!id)return j({error:"appointment_id_required"},400,o);
    const {data:existing}=await svc.from("appointments").select("id,status,provider_key,external_id,metadata").eq("id",id).eq("organization_id",org).maybeSingle();if(!existing)return j({error:"appointment_not_found"},404,o);
    const patch:any={updated_at:new Date().toISOString()};
    if(input.status!==undefined){const s=String(input.status);if(!["scheduled","confirmed","completed","cancelled","no_show"].includes(s))return j({error:"invalid_appointment_status"},400,o);patch.status=s}
    if(input.provider_key!==undefined)patch.provider_key=text(input.provider_key,80);if(input.external_id!==undefined)patch.external_id=text(input.external_id,180);if(input.metadata&&typeof input.metadata==='object'&&!Array.isArray(input.metadata))patch.metadata={...(existing.metadata||{}),...input.metadata};
    const {data,error}=await svc.from("appointments").update(patch).eq("id",id).eq("organization_id",org).select("*").maybeSingle();if(error)return j({error:"appointment_update_failed"},500,o);await svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action:"appointment.updated",entity_type:"appointment",entity_id:id,success:true,context:{provider_key:data?.provider_key||null,external_id:Boolean(data?.external_id)}});return j({appointment:data},200,o)
  }

  return j({error:"unsupported_action",supported:["snapshot","works.snapshot","contact.create","contact.update","opportunity.create","opportunity.update","appointment.create","appointment.update"]},400,o)
});
