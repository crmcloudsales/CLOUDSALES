import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CF = "https://api.cloudflare.com/client/v4";
const ACCOUNT = "bd94cb0580e86e7f40b4271a03052426";
const ZONE = "44753df079f42f8995124c358b135597";
const HOST = "app.cloudsales.app";
const SERVICE = "cloudsales-pwa-v25";
const VERSION = "2026.08.29.3";
const COMMAND = "cloudsales_pwa_official_brand_v25";
const RAW = "https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/main/web";
const U = Deno.env.get("SUPABASE_URL")!;
const K = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(U, K, { auth: { persistSession: false, autoRefreshToken: false } });

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
async function command(id: string) { return (await db.from("internal_command_queue").select("*").eq("id", id).maybeSingle()).data; }
async function finish(id: string, status: string, result: unknown, error: string | null = null) { await db.from("internal_command_queue").update({ status, result, error, finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id); }

async function cf(token: string, path: string, method = "GET", body?: unknown) {
  const response = await fetch(CF + path, { method, headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const raw = await response.text();
  let data: any = {};
  try { data = JSON.parse(raw); } catch { data = { raw }; }
  return { ok: response.ok && data?.success !== false, status: response.status, data };
}
async function domains(token: string) { const response = await cf(token, `/accounts/${ACCOUNT}/workers/domains`); return Array.isArray(response.data?.result) ? response.data.result : []; }
async function attach(token: string) {
  const list = await domains(token);
  const old = list.find((item: any) => item.hostname === HOST && item.zone_id === ZONE) || null;
  if (old?.service === SERVICE) return { ok: true, old };
  if (old) { const deleted = await cf(token, `/accounts/${ACCOUNT}/workers/domains/${old.id}`, "DELETE"); if (!deleted.ok) return { ok: false, old }; }
  const attached = await cf(token, `/accounts/${ACCOUNT}/workers/domains`, "PUT", { hostname: HOST, service: SERVICE, zone_id: ZONE, zone_name: "cloudsales.app" });
  return { ok: attached.ok, old, errors: attached.data?.errors || [] };
}
async function restore(token: string, old: any) {
  const list = await domains(token);
  const current = list.find((item: any) => item.hostname === HOST && item.zone_id === ZONE);
  if (current) await cf(token, `/accounts/${ACCOUNT}/workers/domains/${current.id}`, "DELETE");
  if (old?.service) await cf(token, `/accounts/${ACCOUNT}/workers/domains`, "PUT", { hostname: HOST, service: old.service, zone_id: ZONE, zone_name: "cloudsales.app" });
}
async function text(url: string) { const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}release=${Date.now()}`, { headers: { "cache-control": "no-cache", pragma: "no-cache" } }); if (!response.ok) throw new Error(`fetch_${response.status}_${url}`); return await response.text(); }
async function bytes(url: string) { const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}release=${Date.now()}`, { headers: { "cache-control": "no-cache" } }); if (!response.ok) throw new Error(`fetch_${response.status}_${url}`); return new Uint8Array(await response.arrayBuffer()); }
function b64(data: Uint8Array) { let output = ""; for (let i = 0; i < data.length; i += 32768) output += String.fromCharCode(...data.subarray(i, Math.min(i + 32768, data.length))); return btoa(output); }
async function digest(data: Uint8Array) { const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data)); return [...hash].map((x) => x.toString(16).padStart(2, "0")).join(""); }

function brandPage(source: string) {
  let page = source;
  page = page.replace(/<link rel="manifest"[^>]*>/i, `<link rel="manifest" href="/manifest.webmanifest?v=${VERSION}">`);
  page = page.replace(/<link rel="icon"[^>]*>/gi, "");
  page = page.replace(/<link rel="apple-touch-icon"[^>]*>/gi, "");
  page = page.replace("</head>", `<link rel="icon" type="image/png" sizes="512x512" href="/cloudsales-favicon-official-v2.png?v=${VERSION}"><link rel="shortcut icon" type="image/png" href="/cloudsales-favicon-official-v2.png?v=${VERSION}"><link rel="apple-touch-icon" sizes="512x512" href="/cloudsales-app-icon-official-v2.png?v=${VERSION}"></head>`);
  page = page.replace(/install\.js\?v=[^\"']+/g, `install.js?v=${VERSION}`);
  page = page.replace(/<div class="logo"><img src="\/icon\.svg" alt="">CloudSales<\/div>/gi, `<div class="logo official-logo"><img src="/cloudsales-logo-official-v2.png?v=${VERSION}" alt="CloudSales"></div>`);
  page = page.replace(/<div class="brandrow"><img src="\/icon\.svg" alt="">CloudSales<\/div>/gi, `<div class="brandrow official-brandrow"><img src="/cloudsales-logo-official-v2.png?v=${VERSION}" alt="CloudSales"></div>`);
  page = page.replace(/src="\/icon\.svg"/gi, `src="/cloudsales-app-icon-official-v2.png?v=${VERSION}"`);
  page = page.replace("</style>", `.official-logo img{width:min(250px,80vw)!important;height:auto!important;max-width:none!important}.official-brandrow img{width:185px!important;height:auto!important;max-width:100%!important}</style>`);
  return page;
}
async function sha256b64(value: string) { const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); let output = ""; for (const byte of new Uint8Array(hash)) output += String.fromCharCode(byte); return btoa(output); }
async function cspFor(page: string) { const inline = [...page.matchAll(/<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]); const hashes = await Promise.all(inline.map(sha256b64)); return `default-src 'self'; script-src 'self' ${hashes.map((h) => `'sha256-${h}'`).join(" ")}; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://storage.googleapis.com; connect-src 'self' https://fkahaqprzgcimgyathqx.supabase.co; worker-src 'self' blob:; font-src 'self' data:; media-src 'self' blob: data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`; }
async function upload(token: string, code: string) { const form = new FormData(); form.append("metadata", new Blob([JSON.stringify({ main_module: "main.mjs", compatibility_date: "2026-08-29" })], { type: "application/json" })); form.append("main.mjs", new Blob([code], { type: "application/javascript+module" }), "main.mjs"); const response = await fetch(`${CF}/accounts/${ACCOUNT}/workers/scripts/${SERVICE}`, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: form }); const raw = await response.text(); let data: any = {}; try { data = JSON.parse(raw); } catch { data = { raw }; } return { ok: response.ok && data?.success !== false, status: response.status, errors: data?.errors || [] }; }

function worker(page: string, manifest: string, sw: string, scripts: Record<string, string>, icon512: string, icon192: string, logo: string, csp: string) {
  return `const PAGE=${JSON.stringify(page)},MANIFEST=${JSON.stringify(manifest)},SW=${JSON.stringify(sw)},SCRIPTS=${JSON.stringify(scripts)},I512=${JSON.stringify(icon512)},I192=${JSON.stringify(icon192)},LOGO=${JSON.stringify(logo)},CSP=${JSON.stringify(csp)},V=${JSON.stringify(VERSION)};\nconst H={'x-cloudsales-release':V,'x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'strict-origin-when-cross-origin','permissions-policy':'camera=(),geolocation=(),payment=(self),microphone=(self)','cross-origin-resource-policy':'same-origin','cross-origin-opener-policy':'same-origin-allow-popups','origin-agent-cluster':'?1','x-permitted-cross-domain-policies':'none','x-robots-tag':'noindex, noarchive, nosnippet'};\nfunction r(b,t='text/html; charset=utf-8',c='no-store',withCsp=true){return new Response(b,{headers:{...H,'content-type':t,'cache-control':c,...(withCsp?{'content-security-policy':CSP}:{})}})}\nfunction bin(x){const u=Uint8Array.from(atob(x),c=>c.charCodeAt(0));return new Response(u,{headers:{...H,'content-type':'image/png','cache-control':'public,max-age=31536000,immutable'}})}\nexport default{async fetch(req){const u=new URL(req.url),p=u.pathname;if(p==='/__version')return r(V,'text/plain','no-store',false);if(p==='/manifest.webmanifest')return r(MANIFEST,'application/manifest+json','no-store',false);if(p==='/sw.js')return r(SW,'application/javascript; charset=utf-8','no-cache',false);if(SCRIPTS[p])return r(SCRIPTS[p],'application/javascript; charset=utf-8','no-cache',false);if(p==='/cloudsales-logo-official-v2.png')return bin(LOGO);if(p==='/cloudsales-app-icon-official-v2-192.png'||p==='/icon-192.png')return bin(I192);if(['/cloudsales-app-icon-official-v2.png','/cloudsales-favicon-official-v2.png','/favicon.png','/favicon.ico','/apple-touch-icon.png','/icon-512.png'].includes(p))return bin(I512);if(p==='/icon.svg'||p==='/favicon.svg')return Response.redirect(u.origin+'/cloudsales-favicon-official-v2.png?v='+V,301);return r(PAGE)}};`;
}
async function checkText(path: string) { const response = await fetch(`https://${HOST}${path}${path.includes("?") ? "&" : "?"}qa=${Date.now()}`, { headers: { "cache-control": "no-cache", pragma: "no-cache" } }); return { status: response.status, body: await response.text(), type: response.headers.get("content-type") || "", release: response.headers.get("x-cloudsales-release"), csp: response.headers.get("content-security-policy") || "" }; }
async function checkBytes(path: string) { const response = await fetch(`https://${HOST}${path}?qa=${Date.now()}`, { headers: { "cache-control": "no-cache" } }); const data = new Uint8Array(await response.arrayBuffer()); return { status: response.status, type: response.headers.get("content-type") || "", hash: await digest(data), size: data.length }; }

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const body = await req.json().catch(() => ({}));
  const id = String(body.command_id || "");
  const queued = await command(id);
  if (!queued || queued.command_type !== COMMAND || queued.status !== "queued" || new Date(queued.expires_at).getTime() <= Date.now()) return json({ error: "invalid_command" }, 403);
  await db.from("internal_command_queue").update({ status: "running", started_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
  const token = Deno.env.get("CLOUDFLARE_API_TOKEN_CLOUDSALES") || "";
  if (!token) { await finish(id, "failed", null, "cloudflare_token_missing"); return json({ error: "cloudflare_token_missing" }, 503); }

  const result: any = { version: VERSION, service: SERVICE };
  let old: any = null;
  try {
    const page = brandPage(await text(`${RAW}/pwa.html`));
    const csp = await cspFor(page);
    const manifest = await text(`${RAW}/manifest.webmanifest`);
    const sw = await text(`${RAW}/sw.js`);
    const scripts: Record<string, string> = {};
    for (const path of ["/install.js", "/auth-runtime-v2.js", "/app-runtime-v14.js", "/ai-chat-runtime-v2.js", "/ai-chat-backfill-v1.js", "/ai-chat-channels-v1.js", "/calendar-runtime-v1.js", "/ai-chat-calendar-bridge-v1.js"]) scripts[path] = await text(`${RAW}${path}`);
    const [icon512, icon192, logo] = await Promise.all([
      bytes(`${RAW}/assets/cloudsales-app-icon-official-v2.png`),
      bytes(`${RAW}/assets/cloudsales-app-icon-official-v2-192.png`),
      bytes(`${RAW}/assets/cloudsales-logo-official-v2.png`),
    ]);
    const expected = { icon512: await digest(icon512), icon192: await digest(icon192), logo: await digest(logo) };
    result.upload = await upload(token, worker(page, manifest, sw, scripts, b64(icon512), b64(icon192), b64(logo), csp));
    if (!result.upload.ok) throw new Error("upload_failed");
    const attached = await attach(token); old = attached.old; if (!attached.ok) throw new Error("attach_failed");
    await new Promise((resolve) => setTimeout(resolve, 7000));

    const root = await checkText("/");
    const manifestLive = await checkText("/manifest.webmanifest");
    const installer = await checkText("/install.js");
    const live512 = await checkBytes("/cloudsales-app-icon-official-v2.png");
    const live192 = await checkBytes("/cloudsales-app-icon-official-v2-192.png");
    const liveLogo = await checkBytes("/cloudsales-logo-official-v2.png");
    const tests = {
      release: root.status === 200 && root.release === VERSION,
      exact_logo_visible: root.body.includes(`/cloudsales-logo-official-v2.png?v=${VERSION}`),
      exact_favicon: root.body.includes(`/cloudsales-favicon-official-v2.png?v=${VERSION}`),
      no_legacy_icon: !root.body.includes('/icon.svg'),
      manifest_new_identity: manifestLive.body.includes('"id": "/cloudsales-app-v2"'),
      manifest_exact_assets: manifestLive.body.includes('/cloudsales-app-icon-official-v2-192.png') && manifestLive.body.includes('/cloudsales-app-icon-official-v2.png'),
      installer_native_prompt: installer.body.includes('beforeinstallprompt') && installer.body.includes('/cloudsales-app-icon-official-v2.png'),
      exact_icon512_bytes: live512.hash === expected.icon512,
      exact_icon192_bytes: live192.hash === expected.icon192,
      exact_logo_bytes: liveLogo.hash === expected.logo,
    };
    result.tests = tests;
    if (Object.values(tests).some((value) => value !== true)) throw new Error("official_brand_smoke_failed");
    await db.from("audit_log").insert({ actor_type: "system", action: "cloudsales.pwa.official_brand_v25.promoted", entity_type: "release", entity_id: VERSION, success: true, context: { service: SERVICE, tests, hashes: expected } });
    await finish(id, "succeeded", result, null);
    return json(result);
  } catch (error) {
    const message = String((error as Error).message || error).slice(0, 500);
    result.error = message;
    if (old?.service) await restore(token, old);
    await finish(id, "failed", result, message);
    return json(result, 500);
  }
});