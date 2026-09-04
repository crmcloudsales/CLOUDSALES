const HTML=__HTML_JSON__;
const TURNSTILE_SITEKEY="__TURNSTILE_SITEKEY__";
const GATE_KEY="7ecda8e5-1199-4fad-bc0f-0166c068c17d";
const INTAKE="https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/lead-intake";
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin"}});
const headers={"content-type":"text/html;charset=utf-8","cache-control":"public,max-age=120,stale-while-revalidate=300","x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin","permissions-policy":"camera=(),microphone=(),geolocation=()","x-frame-options":"SAMEORIGIN","strict-transport-security":"max-age=31536000; includeSubDomains","cross-origin-opener-policy":"same-origin","x-permitted-cross-domain-policies":"none","content-security-policy":"default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; font-src 'self' data:; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"};
function clean(v,n=1000){return String(v??"").trim().slice(0,n)}
async function sha(v){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function turnstile(env,token,ip){if(!token||!env.TURNSTILE_SECRET)return false;const f=new FormData();f.set("secret",env.TURNSTILE_SECRET);f.set("response",token);if(ip)f.set("remoteip",ip);const r=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:f});const d=await r.json().catch(()=>({}));return d?.success===true}
function attribution(b){const a=b?.attribution&&typeof b.attribution==="object"?b.attribution:{};const out={source_provider:"meza_cloudsales_site",landing_url:clean(b.landing_url,1200)||"https://meza.cloudsales.app/",referrer:clean(b.referrer,1200)||null};for(const k of ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","fbclid","gclid","ttclid","li_fat_id"]){const v=clean(a[k],500);if(v)out[k]=v}return out}
export default{async fetch(request,env){
 const u=new URL(request.url);
 if(request.method==="GET"&&u.pathname==="/")return new Response(HTML,{status:200,headers});
 if(request.method==="GET"&&u.pathname==="/health")return json({ok:true,service:"meza-real-estate-cloudsales-v2",turnstile:!!TURNSTILE_SITEKEY,lead_journeys:["Buyer","Investor","Seller","Referral"]});
 if(request.method==="GET"&&u.pathname==="/robots.txt")return new Response("User-agent: *\nAllow: /\nSitemap: https://meza.cloudsales.app/sitemap.xml\n",{headers:{"content-type":"text/plain;charset=utf-8","cache-control":"public,max-age=3600"}});
 if(request.method==="GET"&&u.pathname==="/sitemap.xml")return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://meza.cloudsales.app/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>',{headers:{"content-type":"application/xml;charset=utf-8","cache-control":"public,max-age=3600"}});
 if(request.method==="POST"&&u.pathname==="/api/lead"){
  const origin=request.headers.get("origin")||"";if(origin&&origin!=="https://meza.cloudsales.app")return json({error:"origin_forbidden"},403);
  const ctype=(request.headers.get("content-type")||"").toLowerCase();if(!ctype.includes("application/json"))return json({error:"content_type_required"},415);
  const clen=Number(request.headers.get("content-length")||0);if(clen>24576)return json({error:"payload_too_large"},413);
  let b;try{b=await request.json()}catch{return json({error:"invalid_json"},400)}
  const ip=request.headers.get("cf-connecting-ip")||"",ua=request.headers.get("user-agent")||"",honey=!!clean(b.website,80);if(honey)return json({status:"accepted"},202);
  const passed=await turnstile(env,clean(b.turnstile_token,3000),ip);if(!passed)return json({error:"turnstile_failed"},403);
  const candidateName=clean(b.name,160),candidateEmail=clean(b.email,320),candidatePhone=clean(b.phone,40);if(candidateName.length<2||(!candidateEmail&&!candidatePhone))return json({error:"contact_required"},400);if(candidateEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateEmail))return json({error:"invalid_email"},400);
  const name=candidateName,parts=name.split(/\s+/).filter(Boolean),first=parts.shift()||name,last=parts.join(" ");
  const journey=["Buyer","Investor","Seller","Referral"].includes(clean(b.journey,40))?clean(b.journey,40):"Buyer";
  const answers={
   journey_type:journey,
   interest:clean(b.interest,220),
   desired_location:clean(b.desired_location,160),
   budget:clean(b.budget,160),
   bedrooms:clean(b.bedrooms,80),
   financing_status:clean(b.financing_status,120),
   purchase_timeframe:clean(b.timeframe,120),
   preferred_contact_channel:clean(b.preferred_channel,80),
   property_address:clean(b.property_address,500),
   property_type:clean(b.property_type,120),
   target_asking_price:clean(b.target_asking_price,120),
   seller_motivation:clean(b.seller_motivation,1200),
   message:clean(b.message,1500),
   source_content_url:clean(b.landing_url,1200)||"https://meza.cloudsales.app/"
  };
  const reasons=["cloudflare_turnstile_passed","server_validated",`journey_${journey.toLowerCase()}`];if(answers.interest)reasons.push("property_interest_declared");if(answers.purchase_timeframe)reasons.push("timeframe_declared");if(answers.budget)reasons.push("budget_declared");
  const payload={
   gate_key:GATE_KEY,
   idempotency_key:`meza:${journey.toLowerCase()}:${crypto.randomUUID()}`,
   origin_url:"https://meza.cloudsales.app/",
   contact:{first_name:first,last_name:last,email:candidateEmail||null,phone:candidatePhone||null},
   security:{turnstile:true,honeypot:false,quality_score:85,reasons,ip_hash:await sha(ip||"unknown"),user_agent_hash:await sha(ua||"unknown")},
   attribution:attribution(b),
   form_id:journey==="Seller"?"meza_sell_property":"meza_property_inquiry",
   form_name:journey==="Seller"?"MEZA & CO. Seller / Listing Intake":"MEZA & CO. Buyer / Investor Inquiry",
   form_answers:answers
  };
  const r=await fetch(INTAKE,{method:"POST",headers:{"content-type":"application/json","x-cloudsales-edge-token":env.EDGE_TOKEN||""},body:JSON.stringify(payload)});
  const text=await r.text();let data={};try{data=JSON.parse(text)}catch{data={status:"upstream_error"}}return json(data,r.status)
 }
 return json({error:"not_found"},404)
}};