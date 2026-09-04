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

// YouTube Data API uploads require video media. A standalone image must first be transformed
// by CloudSales Content Engine into a video/Short; this adapter will never pretend an image is uploadable.
export async function youtubeUploadReady(svc:any,organizationId:string,input:any){
  const auth=await connectionAccessToken(svc,organizationId,'youtube');
  if(!auth)throw new Error('youtube_not_configured');
  const assets=Array.isArray(input?.assets)?input.assets:[];
  const video=assets.find((a:any)=>String(a?.type||'')==='video'&&String(a?.url||'').startsWith('https://'));
  if(!video)throw new Error('youtube_video_asset_required');
  return {provider_key:'youtube',ready:true,video_url:String(video.url),connection_id:auth.connection.id,note:'resumable_upload_runtime_required'};
}
