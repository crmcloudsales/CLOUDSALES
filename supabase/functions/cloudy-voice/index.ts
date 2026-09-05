import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")!;
const A=Deno.env.get("SUPABASE_ANON_KEY")!;
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORIGINS=new Set(["https://cloudsales.app","https://www.cloudsales.app","https://app.cloudsales.app","http://localhost:3000","http://localhost:5173"]);
const VOICES=[
  {match:["es"],base:"es",key:"cloudy_es_mx"},
  {match:["fr"],base:"fr",key:"cloudy_fr_fr"},
  {match:["pt"],base:"pt",key:"cloudy_pt_br"},
  {match:["it"],base:"it",key:"cloudy_it_it"},
  {match:["de"],base:"de",key:"cloudy_de_de"},
  {match:["ar"],base:"ar",key:"cloudy_ar_ae"},
  {match:["ru"],base:"ru",key:"cloudy_ru_ru"},
  {match:["he","iw"],base:"he",key:"cloudy_he_il"},
  {match:["zh","cmn"],base:"zh",key:"cloudy_zh_cn"},
  {match:["ja"],base:"ja",key:"cloudy_ja_jp"},
  {match:["en"],base:"en",key:"cloudy_en_us"}
];
function cors(o:string|null){const v=o&&ORIGINS.has(o)?o:"https://app.cloudsales.app";return{"Access-Control-Allow-Origin":v,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info,x-organization-id,x-cloudy-locale","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Expose-Headers":"content-type,x-cloudy-engine,x-cloudy-voice-key","Vary":"Origin"}}
function json(b:unknown,s=200,o:string|null=null){return new Response(JSON.stringify(b),{status:s,headers:{...cors(o),"content-type":"application/json;charset=utf-8","cache-control":"no-store"}})}
function voice(locale:string){const x=String(locale||"en-US").toLowerCase();return VOICES.find(v=>v.match.some(m=>x.startsWith(m)))||VOICES[VOICES.length-1]}
Deno.serve(async req=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
  if(origin&&!ORIGINS.has(origin))return json({error:"origin_not_allowed"},403,origin);
  const auth=req.headers.get("authorization");if(!auth)return json({error:"missing_authorization"},401,origin);
  const uc=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud}=await uc.auth.getUser();const user=ud.user;if(!user)return json({error:"invalid_session"},401,origin);
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const url=new URL(req.url);
  let mode=url.searchParams.get("mode")||"profile";
  let org=String(req.headers.get("x-organization-id")||url.searchParams.get("organization_id")||"");
  let locale=String(req.headers.get("x-cloudy-locale")||url.searchParams.get("locale")||"en-US");
  let parsed:any=null;
  if(req.method==="POST"&&req.headers.get("content-type")?.includes("application/json")){
    try{parsed=await req.clone().json();if(parsed.organization_id)org=String(parsed.organization_id);if(parsed.locale)locale=String(parsed.locale);if(parsed.mode)mode=String(parsed.mode)}catch{}
  }
  if(req.method==="GET")mode="profile";
  if(!org)return json({error:"organization_id_required"},400,origin);
  const {data:m}=await svc.from("organization_members").select("status").eq("organization_id",org).eq("user_id",user.id).maybeSingle();
  if(!m||m.status!=="active")return json({error:"forbidden"},403,origin);
  const selected=voice(locale);
  const [{data:profile},{data:runtimeRow},{data:acct}]=await Promise.all([
    svc.from("cloudy_voice_profiles").select("voice_key,locale,display_name,engine,model,native_reference_required,reference_asset_uri,style_prompt,config,active").eq("voice_key",selected.key).eq("active",true).maybeSingle(),
    svc.from("internal_settings").select("value").eq("setting_key","cloudy_voice_runtime").maybeSingle(),
    svc.from("internal_settings").select("value").eq("setting_key","cloudflare_cloudsales_account").maybeSingle()
  ]);
  const runtime=runtimeRow?.value||{};
  const profileConfig=profile?.config||{};
  const forbidden=Array.isArray(profileConfig.forbidden_personas)?profileConfig.forbidden_personas.map((x:any)=>String(x).toLowerCase()):[];
  const identity=`${String(profile?.display_name||"")} ${String(profileConfig.persona||"")}`.toLowerCase();
  if(forbidden.some((name:string)=>name&&identity.includes(name)))return json({error:"forbidden_voice_identity",voice_key:selected.key},409,origin);
  if(selected.key==="cloudy_es_mx"&&String(profileConfig.gender||"").toLowerCase()!=="male")return json({error:"cloudy_spanish_voice_must_be_male",voice_key:selected.key},409,origin);
  let tokenSetting:any=null;
  for(const k of ["cloudflare_ai_gateway_token_cloudsales","cloudflare_api_token_cloudsales"]){const {data}=await svc.from("internal_settings").select("secret_id").eq("setting_key",k).maybeSingle();if(data?.secret_id){tokenSetting=data;break}}
  const accountId=String(acct?.value?.account_id||"");
  const cloudflareReady=Boolean(tokenSetting?.secret_id&&accountId);
  const clientMaleTtsRequired=selected.key==="cloudy_es_mx"&&!Boolean(runtime.preferred_identity_ready&&profile?.reference_asset_uri);
  if(mode==="profile")return json({voice_profile:profile||null,voice_ready:cloudflareReady,fallback_tts_ready:cloudflareReady,preferred_identity_ready:Boolean(runtime.preferred_identity_ready&&profile?.reference_asset_uri),preferred_identity_engine:runtime.preferred_identity_engine||"chatterbox_v3",client_male_tts_required:clientMaleTtsRequired,voice_persona_target:profileConfig.persona||null,voice_identity_policy:profileConfig.identity_policy||null,asr_ready:cloudflareReady,asr_model:runtime.asr_model||"@cf/openai/whisper",fallback_tts_model:runtime.tts_fallback_model||"@cf/myshell-ai/melotts",supported_locales:VOICES.map(v=>v.key)},200,origin);
  if(!cloudflareReady)return json({error:"cloudflare_ai_not_authorized",voice_ready:false,voice_profile:profile||null},503,origin);
  const {data:token}=await svc.rpc("service_read_secret",{p_secret_id:tokenSetting.secret_id});if(!token)return json({error:"cloudflare_ai_secret_unavailable"},503,origin);
  const headers:any={Authorization:`Bearer ${token}`,"cf-aig-gateway-id":String(runtime.gateway_id||"default")};
  if(mode==="tts"){
    if(clientMaleTtsRequired)return json({error:"preferred_male_voice_not_ready",client_male_tts_required:true,voice_key:selected.key,voice_policy:"male_only_no_listia_fallback"},503,origin);
    let b=parsed; if(!b){try{b=await req.json()}catch{return json({error:"invalid_json"},400,origin)}}
    const text=String(b.text||"").trim();if(!text)return json({error:"text_required"},400,origin);if(text.length>Number(runtime.max_tts_chars||3000))return json({error:"text_too_long"},413,origin);
    const model=String(runtime.tts_fallback_model||"@cf/myshell-ai/melotts");
    const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,{method:"POST",headers:{...headers,"content-type":"application/json","accept":"audio/mpeg"},body:JSON.stringify({prompt:text,lang:selected.base})});
    if(!r.ok){const detail=await r.text();return json({error:"tts_failed",status:r.status,detail:detail.slice(0,500)},502,origin)}
    const ct=r.headers.get("content-type")||"audio/mpeg";
    if(ct.includes("audio"))return new Response(r.body,{status:200,headers:{...cors(origin),"content-type":ct,"cache-control":"no-store","x-cloudy-engine":"melotts_fallback","x-cloudy-voice-key":selected.key}});
    const raw=await r.json().catch(()=>null);const audio=raw?.result?.audio||raw?.audio||raw?.result;
    if(typeof audio==="string"){const normalized=audio.includes(",")?audio.split(",").pop()!:audio;const bytes=Uint8Array.from(atob(normalized),c=>c.charCodeAt(0));return new Response(bytes,{status:200,headers:{...cors(origin),"content-type":"audio/mpeg","cache-control":"no-store","x-cloudy-engine":"melotts_fallback","x-cloudy-voice-key":selected.key}})}
    return json({error:"tts_unexpected_response"},502,origin);
  }
  if(mode==="transcribe"){
    let audio:Uint8Array;const ct=req.headers.get("content-type")||"";
    if(ct.includes("multipart/form-data")){const fd=await req.formData();const file=fd.get("audio");if(!(file instanceof File))return json({error:"audio_required"},400,origin);if(file.size>Number(runtime.max_audio_bytes||15728640))return json({error:"audio_too_large"},413,origin);audio=new Uint8Array(await file.arrayBuffer())}
    else{const ab=await req.arrayBuffer();if(!ab.byteLength)return json({error:"audio_required"},400,origin);if(ab.byteLength>Number(runtime.max_audio_bytes||15728640))return json({error:"audio_too_large"},413,origin);audio=new Uint8Array(ab)}
    const model=String(runtime.asr_model||"@cf/openai/whisper");
    const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,{method:"POST",headers:{...headers,"content-type":"application/octet-stream","accept":"application/json"},body:audio});
    const raw=await r.json().catch(()=>null);if(!r.ok)return json({error:"transcription_failed",status:r.status,detail:raw},502,origin);const data=raw?.result??raw;
    return json({text:data?.text||"",word_count:data?.word_count??null,words:data?.words??[],vtt:data?.vtt??null,locale,voice_key:selected.key,model,engine:"workers_ai_whisper"},200,origin);
  }
  return json({error:"unsupported_mode",supported:["profile","tts","transcribe"]},400,origin);
});