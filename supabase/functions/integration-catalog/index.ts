import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {ensureZernioProfile,startZernioConnect,verifyZernioConnect,zernioConfigured,publishZernio} from './zernio.ts';
import {bufferConfigured,listBufferChannels,publishBuffer} from './buffer.ts';
import {googleNativeStatus,listGoogleBusinessReviews,replyGoogleBusinessReview,publishGoogleBusinessPost,youtubeUploadReady} from './google-native.ts';

const U=Deno.env.get("SUPABASE_URL")!,A=Deno.env.get("SUPABASE_ANON_KEY")!,S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLOUDSALES_ORG='b664b5bb-986b-4fdb-b9f7-4d4d329d6599';
const ORIGINS=new Set(["https://cloudsales.app","https://www.cloudsales.app","https://app.cloudsales.app","http://localhost:3000","http://localhost:5173"]);
const INTERNAL_SOCIAL_PROVIDER:Record<string,string>={instagram:'zernio',facebook:'zernio',linkedin:'buffer',tiktok:'buffer',threads:'buffer',youtube:'youtube',google_business:'google_business_profile'};
function cors(o:string|null){const v=o&&ORIGINS.has(o)?o:"https://app.cloudsales.app";return{"Access-Control-Allow-Origin":v,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"}}
function json(b:unknown,s=200,o:string|null=null){return new Response(JSON.stringify(b),{status:s,headers:{...cors(o),"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}})}

async function syncBufferInternalChannels(svc:any,org:string){
 const r=await listBufferChannels(svc,org); const wanted=new Set(['linkedin','tiktok','threads']); const synced:any[]=[];
 for(const ch of r.channels||[]){
  const network=String(ch?.service||'').toLowerCase(); if(!wanted.has(network))continue;
  const providerChannelId=String(ch?.id||''); if(!providerChannelId)continue;
  const name=String(ch?.displayName||ch?.name||network);
  await svc.from('channel_provider_bindings').upsert({organization_id:org,channel:network,provider_key:'buffer',provider_channel_id:providerChannelId,provider_account_id:String(ch?.serviceId||''),provider_channel_name:name,status:'connected',outbound_enabled:true,inbound_enabled:false,is_primary:true,capabilities:['social.publish','social.schedule','social.read'],metadata:{buffer_organization_id:String(ch?.organizationId||''),synced_at:new Date().toISOString()}},{onConflict:'organization_id,channel,provider_key,provider_channel_id'});
  await svc.from('organization_channel_identities').update({status:'active',provider_identity_id:providerChannelId,metadata:{brand_key:'cloudsales',network,provider_side_connected:true,backend_auth_pending:false,buffer_organization_id:String(ch?.organizationId||''),service_id:String(ch?.serviceId||''),synced_at:new Date().toISOString()},updated_at:new Date().toISOString()}).eq('organization_id',org).eq('channel','social').eq('address',network);
  synced.push({network,provider_channel_id:providerChannelId,name});
 }
 if(synced.length){
  const {data:c}=await svc.from('connections').select('id,metadata').eq('organization_id',org).eq('provider_key','buffer').maybeSingle();
  if(c?.id)await svc.from('connections').update({status:'connected',external_account_name:'CloudSales Buffer account',metadata:{...(c.metadata||{}),setup_state:'connected_and_channels_synced',expected_channels:['linkedin','tiktok','threads'],synced_channels:synced,last_channel_sync_at:new Date().toISOString()},last_sync_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',c.id);
  await svc.from('integration_readiness').update({status:'ready',next_action:'Run a controlled CloudSales test post to LinkedIn, TikTok and Threads.',notes:'Buffer backend credential verified and CloudSales channel IDs synchronized.',updated_at:new Date().toISOString()}).eq('provider_key','buffer');
 }
 return {...r,synced};
}

Deno.serve(async req=>{
 const o=req.headers.get("origin");
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(o)});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405,o);
 if(o&&!ORIGINS.has(o))return json({error:"origin_not_allowed"},403,o);
 const auth=req.headers.get("authorization"); if(!auth)return json({error:"missing_authorization"},401,o);
 const uc=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}}); const {data:ud}=await uc.auth.getUser(); const user=ud.user; if(!user)return json({error:"invalid_session"},401,o);
 let b:any={}; try{b=await req.json()}catch{}
 const org=String(b.organization_id||""); if(!org)return json({error:"organization_id_required"},400,o);
 const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}}); const {data:m}=await svc.from("organization_members").select("role,status").eq("organization_id",org).eq("user_id",user.id).maybeSingle(); if(!m||m.status!=="active")return json({error:"forbidden"},403,o);
 const action=String(b.action||'');
 try{
  if(action==='zernio_status'){const [{data:p},configured]=await Promise.all([svc.from('integration_aggregator_profiles').select('status,external_profile_id,last_error,metadata,updated_at').eq('organization_id',org).eq('provider_key','zernio').maybeSingle(),zernioConfigured(svc)]);return json({provider:'zernio',configured,profile:p||null,connected_accounts:Array.isArray(p?.metadata?.connected_accounts)?p.metadata.connected_accounts:[]},200,o)}
  if(action==='zernio_profile_ensure'){const p=await ensureZernioProfile(svc,org);return json({provider:'zernio',profile_id:p.external_profile_id,status:p.status},200,o)}
  if(action==='zernio_connect_start'){const redirect='https://app.cloudsales.app/?zernio_callback=1';return json(await startZernioConnect(svc,org,String(b.platform||''),redirect),200,o)}
  if(action==='zernio_connect_finalize'){const r=await verifyZernioConnect(svc,org,b);await svc.from('audit_log').insert({organization_id:org,actor_user_id:user.id,actor_type:'user',action:'integration.zernio.account.connected',entity_type:'integration_account',success:true,context:{platform:r.account.platform,account_id:r.account.account_id}});return json(r,200,o)}

  if(action==='cloudsales_social_status'){
   if(org!==CLOUDSALES_ORG)return json({error:'internal_cloudsales_brand_only'},403,o);
   const [bc,zc,yt,gb,{data:identities},{data:readiness}]=await Promise.all([bufferConfigured(svc,org),zernioConfigured(svc),googleNativeStatus(svc,org,'youtube'),googleNativeStatus(svc,org,'google_business_profile'),svc.from('organization_channel_identities').select('address,status,provider_key,provider_identity_id,metadata').eq('organization_id',org).eq('channel','social'),svc.from('integration_readiness').select('provider_key,status,next_action').in('provider_key',['buffer','zernio','youtube','google_business_profile'])]);
   return json({brand:'cloudsales',providers:{buffer:{configured:bc},zernio:{configured:zc},youtube:yt,google_business_profile:gb},channels:identities||[],readiness:readiness||[]},200,o);
  }
  if(action==='buffer_sync_channels'){
   if(org!==CLOUDSALES_ORG||!["owner","admin"].includes(String(m.role)))return json({error:'internal_admin_only'},403,o);
   const configured=await bufferConfigured(svc,org); if(!configured)return json({error:'buffer_not_configured',next_action:'store_buffer_api_key_in_vault'},409,o);
   const r=await syncBufferInternalChannels(svc,org); await svc.from('audit_log').insert({organization_id:org,actor_user_id:user.id,actor_type:'user',action:'social.buffer.channels.synced',entity_type:'integration',success:true,context:{count:r.synced.length,networks:r.synced.map((x:any)=>x.network)}}); return json(r,200,o);
  }
  if(action==='google_business_reviews'){
   if(org!==CLOUDSALES_ORG)return json({error:'internal_cloudsales_brand_only'},403,o); return json(await listGoogleBusinessReviews(svc,org,b),200,o);
  }
  if(action==='google_business_review_reply'){
   if(org!==CLOUDSALES_ORG||!["owner","admin"].includes(String(m.role)))return json({error:'internal_admin_only'},403,o); const r=await replyGoogleBusinessReview(svc,org,b); await svc.from('audit_log').insert({organization_id:org,actor_user_id:user.id,actor_type:'user',action:'social.google_business.review.replied',entity_type:'review',success:true,context:{review_id:String(b.review_id||'')}}); return json(r,200,o);
  }
  if(action==='cloudsales_social_publish'){
   if(org!==CLOUDSALES_ORG||!["owner","admin","operator"].includes(String(m.role)))return json({error:'internal_operator_only'},403,o);
   const network=String(b.network||'').toLowerCase(); const provider=INTERNAL_SOCIAL_PROVIDER[network]; if(!provider)return json({error:'unsupported_internal_social_network'},400,o);
   const {data:id}=await svc.from('organization_channel_identities').select('status,provider_key,provider_identity_id,metadata').eq('organization_id',org).eq('channel','social').eq('address',network).maybeSingle();
   if(!id)return json({error:'channel_identity_missing',network},409,o);
   const input={...b,network,provider_channel_id:String(b.provider_channel_id||id.provider_identity_id||'')}; let r:any;
   if(provider==='zernio')r=await publishZernio(svc,org,input);
   else if(provider==='buffer')r=await publishBuffer(svc,org,input);
   else if(provider==='google_business_profile')r=await publishGoogleBusinessPost(svc,org,input);
   else if(provider==='youtube')r=await youtubeUploadReady(svc,org,input);
   else throw new Error('provider_runtime_missing');
   const {data:post}=await svc.from('social_posts').insert({organization_id:org,content:String(b.text||''),status:String(r.status||'published'),channels:[network],media:Array.isArray(b.assets)?b.assets:[],scheduled_for:b.scheduled_for||null,published_at:String(r.status)==='published'?new Date().toISOString():null,provider_results:{[network]:r},created_by:user.id}).select('id').single();
   await svc.from('audit_log').insert({organization_id:org,actor_user_id:user.id,actor_type:'user',action:'social.publish.executed',entity_type:'social_post',entity_id:post?.id||null,success:true,context:{network,provider,external_post_id:r.external_post_id||null}});
   return json({ok:true,network,provider,post_id:post?.id||null,result:r},200,o);
  }
 }catch(e){const code=String((e as Error).message||e);await svc.from('audit_log').insert({organization_id:org,actor_user_id:user.id,actor_type:'user',action:`integration.${action||'unknown'}.failed`,entity_type:'integration',success:false,context:{error:code.slice(0,180)}});return json({error:code},['buffer_not_configured','zernio_not_configured','youtube_not_configured','google_business_profile_not_configured'].includes(code)?503:400,o)}

 if(action==="resolve_route"){
  const capability=String(b.capability_key||""); if(!capability)return json({error:"capability_key_required"},400,o); const preferred=String(b.preferred_provider||"");
  const [{data:connections},{data:routes},{data:caps},{data:readiness},{data:aggregators}]=await Promise.all([svc.from("connections").select("id,provider_key,status,external_account_id,external_account_name,metadata").eq("organization_id",org).eq("status","connected"),svc.from("integration_provider_routes").select("capability_key,provider_key,route_type,priority,enabled,minimum_support_status,quality_weight,cost_weight,latency_weight,metadata").eq("capability_key",capability).eq("enabled",true).order("priority"),svc.from("provider_capabilities").select("provider_key,capability_key,support_status,write_capable,metadata").eq("capability_key",capability),svc.from("integration_readiness").select("provider_key,status,priority,next_action"),svc.from('integration_aggregator_profiles').select('provider_key,status,external_profile_id,metadata').eq('organization_id',org)]);
  const connBy=new Map((connections||[]).map((c:any)=>[c.provider_key,c])),capBy=new Map((caps||[]).map((c:any)=>[c.provider_key,c])),readyBy=new Map((readiness||[]).map((r:any)=>[r.provider_key,r])),aggBy=new Map((aggregators||[]).map((r:any)=>[r.provider_key,r])),rank:any={implemented:3,beta:2,planned:1,unsupported:0};
  const candidates=(routes||[]).map((r:any)=>{const c:any=capBy.get(r.provider_key),cn:any=connBy.get(r.provider_key),rd:any=readyBy.get(r.provider_key),ag:any=aggBy.get(r.provider_key);const capabilityReady=!!c&&rank[String(c.support_status||"")]>=rank[String(r.minimum_support_status||"beta")];const aggregatorAccounts=Array.isArray(ag?.metadata?.connected_accounts)?ag.metadata.connected_accounts.length:0;const infrastructureReady=r.route_type==="direct"?!!cn:(rd?.status==="ready"&&ag?.status==='ready'&&aggregatorAccounts>0);const usable=capabilityReady&&infrastructureReady;return{...r,support_status:c?.support_status||null,readiness_status:rd?.status||null,write_capable:!!c?.write_capable,connected:!!cn,connection_id:cn?.id||null,aggregator_profile_ready:ag?.status==='ready',aggregator_accounts:aggregatorAccounts,usable,blocked_reason:usable?null:(!capabilityReady?"capability_not_ready":(r.route_type==="direct"?"connection_required":"aggregator_tenant_not_ready")),score:Number(r.priority)+(preferred===r.provider_key?-10000:0)}}).sort((a:any,b:any)=>a.score-b.score);
  const selected=candidates.find((x:any)=>x.usable)||null; await svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action:"integration.route.resolved",entity_type:"integration_route",success:!!selected,context:{capability_key:capability,selected_provider:selected?.provider_key||null,candidate_count:candidates.length}}); return json({organization_id:org,capability_key:capability,selected,candidates},selected?200:409,o);
 }

 const [providers,products,bundles,caps,ready,connections,routes,aiProviders,aiModels,aiRoutes,routeModels,voices,templates]=await Promise.all([svc.from("provider_catalog").select("provider_key,display_name,category,auth_type,availability,sort_order,metadata").neq("availability","disabled").order("sort_order"),svc.from("provider_products").select("provider_key,product_key,display_name,category,availability,capabilities,requested_scopes,metadata,sort_order").neq("availability","disabled").order("sort_order"),svc.from("integration_bundles").select("bundle_key,provider_key,display_name,description,product_keys,requested_scopes,one_click,availability,metadata,sort_order").neq("availability","disabled").order("sort_order"),svc.from("provider_capabilities").select("provider_key,capability_key,support_status,write_capable,requires_provider_review,notes,metadata"),svc.from("integration_readiness").select("provider_key,phase,priority,status,owner,required_items,next_action,notes"),svc.from("connections").select("id,provider_key,status,external_account_name,scopes,expires_at,last_sync_at,metadata").eq("organization_id",org),svc.from("integration_provider_routes").select("capability_key,provider_key,route_type,priority,enabled,minimum_support_status,quality_weight,cost_weight,latency_weight,metadata").eq("enabled",true).order("priority"),svc.from("ai_provider_catalog").select("provider_key,display_name,gateway_mode,availability,modalities,capabilities,sort_order,metadata").neq("availability","disabled").order("sort_order"),svc.from("ai_model_catalog").select("model_key,provider_key,model_id,display_name,availability,modalities,capabilities,context_tokens,cost_tier,quality_tier,speed_tier,metadata").not("availability","in","(disabled,deprecated)"),svc.from("ai_route_catalog").select("route_key,display_name,task_type,primary_provider_key,fallback_provider_keys,selector,max_cost_tier,latency_target_ms,enabled,metadata").eq("enabled",true),svc.from("ai_route_models").select("route_key,model_key,priority,conditions,enabled").eq("enabled",true).order("priority"),svc.from("cloudy_voice_profiles").select("voice_key,locale,display_name,engine,model,native_reference_required,style_prompt,config,active").eq("active",true),svc.from("cloudy_agent_templates").select("template_key,display_name,description,channels,capabilities,default_voice_key,system_instructions,config,active").eq("active",true)]);
 const HIDDEN_INTERNAL=new Set(["highlevel"]),conn=connections.data||[],byProvider=Object.fromEntries(conn.map((x:any)=>[x.provider_key,x])); const providerRows=(providers.data||[]).filter((p:any)=>!HIDDEN_INTERNAL.has(p.provider_key)&&p.metadata?.internal_only!==true).map((p:any)=>({...p,connection:byProvider[p.provider_key]||null,capabilities:(caps.data||[]).filter((c:any)=>c.provider_key===p.provider_key),readiness:(ready.data||[]).find((r:any)=>r.provider_key===p.provider_key)||null,products:(products.data||[]).filter((x:any)=>x.provider_key===p.provider_key)})); const clientBundles=(bundles.data||[]).filter((x:any)=>!HIDDEN_INTERNAL.has(x.provider_key)&&!(providers.data||[]).find((p:any)=>p.provider_key===x.provider_key)?.metadata?.internal_only).map((x:any)=>({...x,connection:byProvider[x.provider_key]||null}));
 return json({organization_id:org,role:m.role,bundles:clientBundles,providers:providerRows,provider_routes:routes.data||[],internal_crm:{provider_key:"highlevel",display_name:"HIGHLEVEL",included:true,status:byProvider.highlevel?.status||"preparing",connection:byProvider.highlevel||null,description:"CRM infrastructure operated by CloudSales through HIGHLEVEL."},ai:{providers:aiProviders.data||[],models:aiModels.data||[],routes:aiRoutes.data||[],route_models:routeModels.data||[]},voice_profiles:voices.data||[],agent_templates:templates.data||[]},200,o);
});
