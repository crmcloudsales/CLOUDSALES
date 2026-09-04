async function connectionAccessToken(svc:any,organizationId:string,providerKey:string){
  const {data:c}=await svc.from('connections').select('id,status,external_account_id,metadata').eq('organization_id',organizationId).eq('provider_key',providerKey).eq('status','connected').maybeSingle();
  if(!c?.id)return null;
  const {data:s}=await svc.from('connection_secrets').select('access_token_secret_id').eq('connection_id',c.id).maybeSingle();
  if(!s?.access_token_secret_id)return null;
  const {data}=await svc.rpc('service_read_secret',{p_secret_id:s.access_token_secret_id});
  return data?{token:String(data),connection:c}:null;
}

async function googleJson(url:string,token:string,init:RequestInit={}){
  const r=await fetch(url,{...init,headers:{Authorization:`Bearer ${token}`,'content-type':'application/json',...(init.headers||{})}});
  const text=await r.text(); let data:any={}; try{data=text?JSON.parse(text):{}}catch{data={raw:text}}
  if(!r.ok)throw Object.assign(new Error(String(data?.error?.message||data?.error||`google_${r.status}`)),{status:r.status,data});
  return data;
}

export async function googleNativeStatus(svc:any,organizationId:string,providerKey:'youtube'|'google_business_profile'){
  const auth=await connectionAccessToken(svc,organizationId,providerKey);
  return {provider_key:providerKey,configured:Boolean(auth),connection:auth?.connection||null};
}

export async function listGoogleBusinessReviews(svc:any,organizationId:string,input:any){
  const auth=await connectionAccessToken(svc,organizationId,'google_business_profile');
  if(!auth)throw new Error('google_business_profile_not_configured');
  const accountId=String(input?.account_id||auth.connection?.metadata?.account_id||'');
  const locationId=String(input?.location_id||auth.connection?.external_account_id||auth.connection?.metadata?.location_id||'');
  if(!accountId||!locationId)throw new Error('google_business_profile_account_location_required');
  const url=`https://mybusiness.googleapis.com/v4/accounts/${encodeURIComponent(accountId)}/locations/${encodeURIComponent(locationId)}/reviews`;
  return await googleJson(url,auth.token,{method:'GET'});
}

export async function replyGoogleBusinessReview(svc:any,organizationId:string,input:any){
  const auth=await connectionAccessToken(svc,organizationId,'google_business_profile');
  if(!auth)throw new Error('google_business_profile_not_configured');
  const accountId=String(input?.account_id||auth.connection?.metadata?.account_id||'');
  const locationId=String(input?.location_id||auth.connection?.external_account_id||auth.connection?.metadata?.location_id||'');
  const reviewId=String(input?.review_id||'');
  const comment=String(input?.comment||'').trim();
  if(!accountId||!locationId||!reviewId||!comment)throw new Error('google_business_profile_review_reply_fields_required');
  const url=`https://mybusiness.googleapis.com/v4/accounts/${encodeURIComponent(accountId)}/locations/${encodeURIComponent(locationId)}/reviews/${encodeURIComponent(reviewId)}/reply`;
  return await googleJson(url,auth.token,{method:'PUT',body:JSON.stringify({comment})});
}

export async function publishGoogleBusinessPost(svc:any,organizationId:string,input:any){
  const auth=await connectionAccessToken(svc,organizationId,'google_business_profile');
  if(!auth)throw new Error('google_business_profile_not_configured');
  const accountId=String(input?.account_id||auth.connection?.metadata?.account_id||'');
  const locationId=String(input?.location_id||auth.connection?.external_account_id||auth.connection?.metadata?.location_id||'');
  if(!accountId||!locationId)throw new Error('google_business_profile_account_location_required');
  const media=(Array.isArray(input?.assets)?input.assets:[]).filter((a:any)=>String(a?.type||'')==='image'&&String(a?.url||'').startsWith('https://')).map((a:any)=>({mediaFormat:'PHOTO',sourceUrl:String(a.url)}));
  const body:any={languageCode:String(input?.language_code||'es'),summary:String(input?.text||''),topicType:'STANDARD'};
  if(media.length)body.media=media;
  const url=`https://mybusiness.googleapis.com/v4/accounts/${encodeURIComponent(accountId)}/locations/${encodeURIComponent(locationId)}/localPosts`;
  const data=await googleJson(url,auth.token,{method:'POST',body:JSON.stringify(body)});
  return {provider_key:'google_business_profile',external_post_id:String(data?.name||''),status:'published',raw:data};
}

async function fetchPublicVideo(url:string){
  if(!url.startsWith('https://'))throw new Error('youtube_video_requires_public_https_url');
  const r=await fetch(url,{method:'GET',redirect:'follow'});
  if(!r.ok||!r.body)throw new Error(`youtube_video_fetch_failed:${r.status}`);
  const contentType=String(r.headers.get('content-type')||'video/mp4');
  if(!contentType.startsWith('video/'))throw new Error('youtube_asset_is_not_video');
  const contentLength=r.headers.get('content-length');
  return {response:r,contentType,contentLength};
}

// Native YouTube upload. We intentionally require video media: a standalone image must first
// be converted by the CloudSales Content Engine into a video/Short before this adapter is called.
export async function publishYouTube(svc:any,organizationId:string,input:any){
  const auth=await connectionAccessToken(svc,organizationId,'youtube');
  if(!auth)throw new Error('youtube_not_configured');
  const assets=Array.isArray(input?.assets)?input.assets:[];
  const video=assets.find((a:any)=>String(a?.type||'')==='video'&&String(a?.url||'').startsWith('https://'));
  if(!video)throw new Error('youtube_video_asset_required');
  const title=String(input?.title||input?.text||'CloudSales').trim().slice(0,100)||'CloudSales';
  const description=String(input?.description||input?.text||'').slice(0,5000);
  const requestedPrivacy=String(input?.privacy_status||'private').toLowerCase();
  const privacyStatus=['private','unlisted','public'].includes(requestedPrivacy)?requestedPrivacy:'private';
  const source=await fetchPublicVideo(String(video.url));
  const metadata={snippet:{title,description,categoryId:String(input?.category_id||'22')},status:{privacyStatus,selfDeclaredMadeForKids:Boolean(input?.made_for_kids||false)}};
  const initiateUrl='https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
  const initHeaders:Record<string,string>={Authorization:`Bearer ${auth.token}`,'content-type':'application/json; charset=UTF-8','x-upload-content-type':source.contentType};
  if(source.contentLength)initHeaders['x-upload-content-length']=source.contentLength;
  const init=await fetch(initiateUrl,{method:'POST',headers:initHeaders,body:JSON.stringify(metadata)});
  if(!init.ok){const t=await init.text();throw new Error(`youtube_upload_session_failed:${init.status}:${t.slice(0,220)}`)}
  const uploadUrl=String(init.headers.get('location')||'');
  if(!uploadUrl.startsWith('https://'))throw new Error('youtube_resumable_location_missing');
  const uploadHeaders:Record<string,string>={'content-type':source.contentType};
  if(source.contentLength)uploadHeaders['content-length']=source.contentLength;
  const uploaded=await fetch(uploadUrl,{method:'PUT',headers:uploadHeaders,body:source.response.body});
  const text=await uploaded.text();let data:any={};try{data=text?JSON.parse(text):{}}catch{data={raw:text}}
  if(!uploaded.ok)throw new Error(`youtube_upload_failed:${uploaded.status}:${String(data?.error?.message||text).slice(0,220)}`);
  const id=String(data?.id||'');if(!id)throw new Error('youtube_video_id_missing');
  return {provider_key:'youtube',external_post_id:id,external_url:`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,status:'published',privacy_status:String(data?.status?.privacyStatus||privacyStatus),raw:data};
}

export async function youtubeUploadReady(svc:any,organizationId:string,input:any){
  const auth=await connectionAccessToken(svc,organizationId,'youtube');
  if(!auth)throw new Error('youtube_not_configured');
  const assets=Array.isArray(input?.assets)?input.assets:[];
  const video=assets.find((a:any)=>String(a?.type||'')==='video'&&String(a?.url||'').startsWith('https://'));
  if(!video)throw new Error('youtube_video_asset_required');
  return {provider_key:'youtube',ready:true,video_url:String(video.url),connection_id:auth.connection.id,note:'native_resumable_upload_available'};
}
