import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CF = "https://api.cloudflare.com/client/v4";
const ACCOUNT = "bd94cb0580e86e7f40b4271a03052426";
const ZONE = "44753df079f42f8995124c358b135597";
const SERVICE = "cloudsales-site-v15";
const VERSION = "2026.08.29.1";
const COMMAND = "cloudsales_site_brand_v15";
const RAW = "https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/main/web";
const SUPA = "https://fkahaqprzgcimgyathqx.supabase.co";
const U = Deno.env.get("SUPABASE_URL")!;
const K = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(U, K, { auth: { persistSession: false, autoRefreshToken: false } });

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
});

async function command(id: string) {
  const { data } = await db.from("internal_command_queue").select("*").eq("id", id).maybeSingle();
  return data;
}

async function finish(id: string, status: string, result: unknown, error: string | null = null) {
  await db.from("internal_command_queue").update({ status, result, error, finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
}

async function cf(token: string, path: string, method = "GET", body?: unknown) {
  const r = await fetch(CF + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const t = await r.text();
  let data: any = {};
  try { data = JSON.parse(t); } catch { data = { raw: t }; }
  return { ok: r.ok && data?.success !== false, status: r.status, data };
}

async function domains(token: string) {
  const r = await cf(token, `/accounts/${ACCOUNT}/workers/domains`);
  return Array.isArray(r.data?.result) ? r.data.result : [];
}

async function attach(token: string, host: string) {
  const list = await domains(token);
  const old = list.find((x: any) => x.hostname === host && x.zone_id === ZONE) || null;
  if (old?.service === SERVICE) return { ok: true, old };
  if (old) {
    const d = await cf(token, `/accounts/${ACCOUNT}/workers/domains/${old.id}`, "DELETE");
    if (!d.ok) return { ok: false, old, status: d.status };
  }
  const a = await cf(token, `/accounts/${ACCOUNT}/workers/domains`, "PUT", { hostname: host, service: SERVICE, zone_id: ZONE, zone_name: "cloudsales.app" });
  return { ok: a.ok, old, status: a.status, errors: a.data?.errors || [] };
}

async function restore(token: string, host: string, old: any) {
  const list = await domains(token);
  const now = list.find((x: any) => x.hostname === host && x.zone_id === ZONE);
  if (now) await cf(token, `/accounts/${ACCOUNT}/workers/domains/${now.id}`, "DELETE");
  if (old?.service) await cf(token, `/accounts/${ACCOUNT}/workers/domains`, "PUT", { hostname: host, service: old.service, zone_id: ZONE, zone_name: "cloudsales.app" });
}

async function text(url: string) {
  const r = await fetch(url + (url.includes("?") ? "&" : "?") + "release=" + Date.now(), { headers: { "cache-control": "no-cache", pragma: "no-cache" } });
  if (!r.ok) throw new Error(`fetch_${r.status}_${url}`);
  return await r.text();
}

async function bytes(url: string) {
  const r = await fetch(url + (url.includes("?") ? "&" : "?") + "release=" + Date.now(), { headers: { "cache-control": "no-cache" } });
  if (!r.ok) throw new Error(`fetch_${r.status}_${url}`);
  return new Uint8Array(await r.arrayBuffer());
}

function b64(data: Uint8Array) {
  let s = "";
  for (let i = 0; i < data.length; i += 32768) s += String.fromCharCode(...data.subarray(i, Math.min(i + 32768, data.length)));
  return btoa(s);
}

function brand(source: string, isRoot = false) {
  let html = source;
  html = html.replace(/CloudSales CRM/g, "CloudSales");
  html = html.replace(/<link\s+rel=["']icon["'][^>]*href=["']\/icon\.svg["'][^>]*>/gi, `<link rel="icon" type="image/png" href="/favicon.png?v=${VERSION}">`);
  if (!/rel=["']apple-touch-icon["']/i.test(html)) html = html.replace("</head>", `<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=${VERSION}"></head>`);
  else html = html.replace(/<link\s+rel=["']apple-touch-icon["'][^>]*>/gi, `<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=${VERSION}">`);
  html = html.replace(/src=["']\/icon\.svg["']/gi, `src="/cloudsales-official-icon-v3.png?v=${VERSION}"`);
  html = html.replace(/https:\/\/app\.cloudsales\.app\/#install-ios/g, "https://app.cloudsales.app/?install=ios");
  html = html.replace(/https:\/\/app\.cloudsales\.app\/#install-android/g, "https://app.cloudsales.app/?install=android");
  html = html.replace(/https:\/\/app\.cloudsales\.app\/#install-desktop/g, "https://app.cloudsales.app/?install=desktop");
  html = html.replace(/>Probar CloudSales</g, ">Descargar la app<");
  html = html.replace(/<li>\s*14 días de prueba\s*<\/li>/gi, "");
  html = html.replace(/Los planes de suscripción actualmente incluyen una prueba de 14 días con método de pago y pueden cancelarse antes de que finalice la prueba para evitar el siguiente cargo\./gi, "Puedes cancelar de acuerdo con los términos de tu suscripción.");
  html = html.replace(/Los planes de suscripción incluyen actualmente una prueba de 14 días con método de pago\. Puedes cancelar antes de que termine la prueba para evitar el siguiente cargo\./gi, "Puedes cancelar de acuerdo con los términos de tu suscripción.");
  html = html.replace(/\b14 días de prueba\b/gi, "");
  html = html.replace(/target=["']_blank["'](?![^>]*\brel=)/gi, 'target="_blank" rel="noopener noreferrer"');
  html = html.replace(/\s+onerror=("[^"]*"|'[^']*')/gi, "");
  if (isRoot) {
    html = html.replace(/<section class="section"><div class="wrap"><h2>Descarga CloudSales\./, '<section class="section" id="download"><div class="wrap"><h2>Descarga CloudSales.');
    html = html.replace(/href=["']#pricing["']>Descargar la app</gi, 'href="#download">Descargar la app<');
  }
  return html;
}

async function sha256b64(s: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  let x = "";
  for (const n of new Uint8Array(h)) x += String.fromCharCode(n);
  return btoa(x);
}

async function cspFor(html: string) {
  const inline = [...html.matchAll(/<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const hashes = await Promise.all(inline.map(sha256b64));
  const hs = hashes.map((x) => `'sha256-${x}'`).join(" ");
  return `default-src 'self'; script-src 'self' https://js.stripe.com https://*.stripe.com https://*.stripe.network ${hs}; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://storage.googleapis.com https://*.stripe.com https://*.stripe.network; connect-src 'self' ${SUPA} https://*.stripe.com https://*.stripe.network; frame-src https://js.stripe.com https://hooks.stripe.com https://*.stripe.com; child-src https://js.stripe.com https://*.stripe.com blob:; worker-src 'self' blob:; font-src 'self' data:; media-src 'self' blob: data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://*.stripe.com; upgrade-insecure-requests;`;
}

async function upload(token: string, code: string) {
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify({ main_module: "main.mjs", compatibility_date: "2026-08-29" })], { type: "application/json" }));
  form.append("main.mjs", new Blob([code], { type: "application/javascript+module" }), "main.mjs");
  const r = await fetch(`${CF}/accounts/${ACCOUNT}/workers/scripts/${SERVICE}`, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: form });
  const t = await r.text();
  let data: any = {};
  try { data = JSON.parse(t); } catch { data = { raw: t }; }
  return { ok: r.ok && data?.success !== false, status: r.status, errors: data?.errors || [] };
}

function worker(pages: Record<string, string>, csps: Record<string, string>, icon: string, widget: string) {
  return `const P=${JSON.stringify(pages)},CSP=${JSON.stringify(csps)},ICON=${JSON.stringify(icon)},WIDGET=${JSON.stringify(widget)},V=${JSON.stringify(VERSION)};\nconst H={'x-cloudsales-release':V,'x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'strict-origin-when-cross-origin','permissions-policy':'camera=(),geolocation=(),microphone=(),payment=(self)','cross-origin-opener-policy':'same-origin-allow-popups','origin-agent-cluster':'?1','x-permitted-cross-domain-policies':'none'};\nfunction r(b,t='text/html; charset=utf-8',c='no-store',extra={},csp=null){return new Response(b,{headers:{...H,'content-type':t,'cache-control':c,...extra,...(csp?{'content-security-policy':csp}:{})}})}\nfunction img(){const u=Uint8Array.from(atob(ICON),c=>c.charCodeAt(0));return new Response(u,{headers:{...H,'content-type':'image/png','cache-control':'public,max-age=31536000,immutable'}})}\nexport default{async fetch(req){const u=new URL(req.url),p=u.pathname.replace(/\\\/+$/,'')||'/';if(u.hostname==='www.cloudsales.app')return Response.redirect('https://cloudsales.app'+u.pathname+u.search,301);if(p==='/__version')return r(V,'text/plain');if(p==='/webchat.js')return r(WIDGET,'application/javascript; charset=utf-8','public,max-age=300,stale-while-revalidate=3600',{'access-control-allow-origin':'*','cross-origin-resource-policy':'cross-origin'});if(['/cloudsales-official-icon-v3.png','/icon-192.png','/icon-512.png','/apple-touch-icon.png','/favicon.png','/favicon.ico'].includes(p))return img();if(p==='/icon.svg'||p==='/favicon.svg')return Response.redirect(u.origin+'/favicon.png?v='+V,301);if(p==='/robots.txt')return r('User-agent: *\\nAllow: /\\nDisallow: /webhooks/\\nSitemap: https://cloudsales.app/sitemap.xml\\n','text/plain');if(p==='/sitemap.xml')return r('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/sitemap/0.9"><url><loc>https://cloudsales.app/</loc></url><url><loc>https://cloudsales.app/cloudco</loc></url><url><loc>https://cloudsales.app/academy</loc></url><url><loc>https://cloudsales.app/services</loc></url><url><loc>https://cloudsales.app/affiliate</loc></url><url><loc>https://cloudsales.app/terms</loc></url><url><loc>https://cloudsales.app/privacy</loc></url></urlset>','application/xml');return r(P[p]||P['/'],'text/html; charset=utf-8','no-store',{},CSP[p]||CSP['/'])}};`;
}

async function check(url: string) {
  const r = await fetch(url + (url.includes("?") ? "&" : "?") + "qa=" + Date.now(), { redirect: "manual", headers: { "cache-control": "no-cache", pragma: "no-cache" } });
  return { status: r.status, text: await r.text(), type: r.headers.get("content-type") || "", release: r.headers.get("x-cloudsales-release"), location: r.headers.get("location") };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const body = await req.json().catch(() => ({}));
  const id = String(body.command_id || "");
  const c = await command(id);
  if (!c || c.command_type !== COMMAND || c.status !== "queued" || new Date(c.expires_at).getTime() <= Date.now()) return json({ error: "invalid_command" }, 403);

  await db.from("internal_command_queue").update({ status: "running", started_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
  const token = Deno.env.get("CLOUDFLARE_API_TOKEN_CLOUDSALES") || "";
  if (!token) { await finish(id, "failed", null, "cloudflare_token_missing"); return json({ error: "cloudflare_token_missing" }, 503); }

  const result: any = { version: VERSION, service: SERVICE };
  const old: Record<string, any> = {};
  try {
    const pages: Record<string, string> = {};
    const csps: Record<string, string> = {};
    const routes = ["/", "/cloudco", "/academy", "/services", "/affiliate", "/terms", "/privacy"];
    for (const route of routes) {
      const source = await text(`https://cloudsales.app${route}`);
      const html = brand(source, route === "/");
      pages[route] = html;
      csps[route] = await cspFor(html);
    }
    const icon = await bytes(`${RAW}/assets/cloudsales-isotipo-official-512.png`);
    const widget = await text(`${RAW}/webchat.js`);

    result.upload = await upload(token, worker(pages, csps, b64(icon), widget));
    if (!result.upload.ok) throw new Error("upload_failed");

    const before = await domains(token);
    for (const host of ["cloudsales.app", "www.cloudsales.app"]) old[host] = before.find((x: any) => x.hostname === host && x.zone_id === ZONE) || null;
    const a = await attach(token, "cloudsales.app");
    const w = await attach(token, "www.cloudsales.app");
    if (!a.ok || !w.ok) throw new Error("attach_failed");
    await new Promise((resolve) => setTimeout(resolve, 6500));

    const root = await check("https://cloudsales.app/");
    const www = await check("https://www.cloudsales.app/");
    const favicon = await check("https://cloudsales.app/favicon.png");
    const tests = {
      release: root.status === 200 && root.release === VERSION,
      official_favicon: root.text.includes(`/favicon.png?v=${VERSION}`) && favicon.status === 200 && /image\/png/i.test(favicon.type),
      official_brand_icon: root.text.includes(`/cloudsales-official-icon-v3.png?v=${VERSION}`),
      download_cta: root.text.includes("Descargar la app") && root.text.includes('id="download"'),
      install_links: ["?install=ios", "?install=android", "?install=desktop"].every((x) => root.text.includes(x)),
      no_trial: !/14 días de prueba/i.test(root.text),
      no_legacy_cta: !/Probar CloudSales/i.test(root.text),
      www_redirect: www.status === 301 && String(www.location || "").startsWith("https://cloudsales.app"),
    };
    result.tests = tests;
    if (Object.values(tests).some((v) => v !== true)) throw new Error("site_brand_smoke_failed");

    await db.from("audit_log").insert({ actor_type: "system", action: "cloudsales.site.brand_v15.promoted", entity_type: "release", entity_id: VERSION, success: true, context: { service: SERVICE, tests } });
    await finish(id, "succeeded", result, null);
    return json(result);
  } catch (e) {
    const error = String((e as Error).message || e).slice(0, 500);
    result.error = error;
    for (const host of ["cloudsales.app", "www.cloudsales.app"]) if (old[host]?.service) await restore(token, host, old[host]);
    await finish(id, "failed", result, error);
    return json(result, 500);
  }
});
