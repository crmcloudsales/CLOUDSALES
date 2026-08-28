import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U=Deno.env.get('SUPABASE_URL')!;
const A=Deno.env.get('SUPABASE_ANON_KEY')!;
const S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ORIGINS=new Set(['https://app.cloudsales.app','https://cloudsales.app','https://www.cloudsales.app','http://localhost:3000','http://localhost:5173']);
const cors=(o:string|null)=>({'Access-Control-Allow-Origin':o&&ORIGINS.has(o)?o:'https://app.cloudsales.app','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'});
const json=(b:unknown,s=200,o:string|null=null)=>new Response(JSON.stringify(b),{status:s,headers:{...cors(o),'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const clamp=(v:any,min:number,max:number,fallback:number)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.floor(n))):fallback};

Deno.serve(async req=>{
  const origin=req.headers.get('origin');
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
  if(req.method!=='POST')return json({error:'method_not_allowed'},405,origin);
  if(origin&&!ORIGINS.has(origin))return json({error:'origin_not_allowed'},403,origin);
  const auth=req.headers.get('authorization');
  if(!auth)return json({error:'missing_authorization'},401,origin);
  const uc=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud}=await uc.auth.getUser();const user=ud.user;
  if(!user)return json({error:'invalid_session'},401,origin);
  let body:any;try{body=await req.json()}catch{return json({error:'invalid_json'},400,origin)}
  const org=String(body.organization_id||''),action=String(body.action||'snapshot'),input=body.input&&typeof body.input==='object'?body.input:{};
  if(!org)return json({error:'organization_required'},400,origin);
  const db=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:m}=await db.from('organization_members').select('role,status').eq('organization_id',org).eq('user_id',user.id).maybeSingle();
  if(!m||m.status!=='active')return json({error:'forbidden'},403,origin);
  const canWrite=['owner','admin','operator'].includes(m.role);

  if(action==='snapshot'){
    let q=db.from('universal_conversations').select('id,organization_id,contact_id,source_provider,external_conversation_id,primary_channel,status,unread_count,starred,assigned_to,last_message_at,last_message_preview,metadata,created_at,updated_at,contact:contacts(id,first_name,last_name,email,phone_e164,lifecycle_stage,quality_status)').eq('organization_id',org).neq('status','archived').order('last_message_at',{ascending:false,nullsFirst:false}).limit(clamp(input.limit,1,200,100));
    if(input.channel)q=q.eq('primary_channel',String(input.channel));
    if(input.unread_only===true)q=q.gt('unread_count',0);
    if(input.starred===true)q=q.eq('starred',true);
    const {data,error}=await q;if(error)return json({error:'snapshot_failed',detail:error.message},500,origin);
    return json({conversations:data||[],total:(data||[]).length},200,origin);
  }
  if(action==='messages'){
    const conversationId=String(input.conversation_id||'');if(!conversationId)return json({error:'conversation_id_required'},400,origin);
    const {data:c}=await db.from('universal_conversations').select('id').eq('id',conversationId).eq('organization_id',org).maybeSingle();if(!c)return json({error:'conversation_not_found'},404,origin);
    const {data,error}=await db.from('universal_messages').select('id,conversation_id,contact_id,source_provider,external_message_id,direction,channel,message_type,body,content_type,attachments,status,sender_identifier,recipient_identifier,occurred_at,metadata').eq('conversation_id',conversationId).eq('organization_id',org).order('occurred_at',{ascending:true}).limit(clamp(input.limit,1,500,200));
    if(error)return json({error:'messages_failed',detail:error.message},500,origin);
    return json({messages:data||[]},200,origin);
  }
  if(action==='mark_read'){
    if(!canWrite)return json({error:'read_only_role'},403,origin);const id=String(input.conversation_id||'');if(!id)return json({error:'conversation_id_required'},400,origin);
    const {data,error}=await db.from('universal_conversations').update({unread_count:0}).eq('id',id).eq('organization_id',org).select('id,unread_count').maybeSingle();if(error||!data)return json({error:'conversation_not_found'},404,origin);return json({conversation:data},200,origin);
  }
  if(action==='star'){
    if(!canWrite)return json({error:'read_only_role'},403,origin);const id=String(input.conversation_id||'');if(!id)return json({error:'conversation_id_required'},400,origin);
    const {data,error}=await db.from('universal_conversations').update({starred:Boolean(input.starred)}).eq('id',id).eq('organization_id',org).select('id,starred').maybeSingle();if(error||!data)return json({error:'conversation_not_found'},404,origin);return json({conversation:data},200,origin);
  }
  return json({error:'unsupported_action',supported:['snapshot','messages','mark_read','star']},400,origin);
});