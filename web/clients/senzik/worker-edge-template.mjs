const HTML_RAW=__HTML_JSON__;
const GATE_KEY="6a5d3fce-7b17-413c-8b0d-010035db3aaa";
const ORIGIN="https://senzikresidences.cloudsales.app";
const INTAKE="https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/lead-intake";
const OFFICIAL_WHATSAPP="https://api.whatsapp.com/send?phone=525512819326&text=Quiero+m%C3%A1s+informaci%C3%B3n+sobre+Senzik";

const headers={"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const clean=(v,n=500)=>String(v??"").trim().slice(0,n);
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const HTML=HTML_RAW;
const page=()=>new Response(HTML,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public,max-age=120","x-frame-options":"DENY","x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin","permissions-policy":"camera=(),microphone=(),geolocation=()"}});

export default {
  async fetch(req,env){
    const u=new URL(req.url);
    const path=u.pathname.replace(/\/+$/g,"")||"/";

    if(req.method==="GET"&&path==="/health")return json({ok:true,service:"senzik-gateway-v1",version:"official-source-only-2026-09-05",content_source:"https://senzikresidences.com/",security:"turnstile+honeypot+server-validation",contact_fields:["first_name","last_name","phone","email","country_state"]});
    if(req.method==="GET"&&path==="/robots.txt")return new Response("User-agent: *\nAllow: /\nSitemap: https://senzikresidences.cloudsales.app/sitemap.xml\n",{headers:{"content-type":"text/plain;charset=utf-8","cache-control":"public,max-age=3600"}});
    if(req.method==="GET"&&path==="/sitemap.xml")return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://senzikresidences.cloudsales.app/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>',{headers:{"content-type":"application/xml;charset=utf-8","cache-control":"public,max-age=3600"}});
    if(req.method==="GET"||req.method==="HEAD")return req.method==="HEAD"?new Response(null,{status:200}):page();
    if(req.method!=="POST"||path!=="/lead")return json({error:"not_found"},404);

    const origin=req.headers.get("Origin")||"";
    if(origin&&origin!==ORIGIN)return json({error:"origin_not_allowed"},403);

    let b;
    try{b=await req.json()}catch{return json({message:"Solicitud inválida."},400)}

    const first=clean(b.first_name,120);
    const last=clean(b.last_name,120);
    const phone=clean(b.phone,40).replace(/[^0-9+]/g,"");
    const email=clean(b.email,320).toLowerCase();
    const countryState=clean(b.country_state,160);
    const honeypot=clean(b.website,300)!=="";

    if(honeypot)return json({status:"accepted"},200);
    if(first.length<2||last.length<2||phone.replace(/\D/g,"").length<8||!emailOk(email)||countryState.length<2)return json({message:"Completa nombre, apellidos, celular/WhatsApp, email y país/estado."},422);

    const token=clean(b.turnstile_token,2048);
    if(!token)return json({message:"Completa la verificación de seguridad."},422);

    let turnstileOk=false;
    try{
      const tr=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:token,remoteip:req.headers.get("CF-Connecting-IP")||""})});
      const td=await tr.json();
      turnstileOk=td?.success===true&&(!td?.hostname||String(td.hostname).toLowerCase()===u.hostname.toLowerCase());
    }catch{}
    if(!turnstileOk)return json({message:"No pudimos validar la verificación de seguridad."},422);

    const att=b.attribution||{};
    const payload={gate_key:GATE_KEY,idempotency_key:clean(b.idempotency_key,180)||crypto.randomUUID(),origin_url:ORIGIN+"/",form_id:"senzik-residences-main",form_name:"Senzik Residences - Contacto",form_answers:{country_state:countryState},contact:{first_name:first,last_name:last,email,phone},attribution:{source_provider:clean(att.utm_source||"direct",80),campaign_id:clean(att.utm_campaign||"senzik-main",180),ad_group_id:clean(att.utm_content||"",180),ad_id:"",landing_url:ORIGIN+"/",referrer:req.headers.get("Referer")||"",fbclid:clean(att.fbclid,300),gclid:clean(att.gclid,300)},security:{quality_score:92,turnstile:true,honeypot:false,reasons:["cloudflare_turnstile","server_validation","required_identity_fields"]}};

    const r=await fetch(INTAKE,{method:"POST",headers:{"content-type":"application/json","x-cloudsales-edge-token":env.EDGE_TOKEN},body:JSON.stringify(payload)});
    const d=await r.json().catch(()=>({}));
    if(r.ok)return json({...d,whatsapp_url:OFFICIAL_WHATSAPP},r.status);
    if(r.status===409)return json({status:"challenge",message:"Necesitamos una verificación adicional. Intenta nuevamente."},409);
    if(r.status===422)return json({status:"rejected",message:"No pudimos validar la solicitud. Revisa tus datos."},422);
    return json({message:"No pudimos procesar la solicitud."},502);
  }
};