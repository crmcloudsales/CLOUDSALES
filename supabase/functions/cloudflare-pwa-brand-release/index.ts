import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CF = "https://api.cloudflare.com/client/v4";
const ACCOUNT = "bd94cb0580e86e7f40b4271a03052426";
const ZONE = "44753df079f42f8995124c358b135597";
const HOST = "app.cloudsales.app";
const SERVICE = "cloudsales-pwa-v24";
const VERSION = "2026.08.29.2";
const COMMAND = "cloudsales_pwa_auth_v24";
const RAW = "https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/main/web";
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
  await db.from("internal_command_queue").update({
    status,
    result,
    error,
    finished_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id);
}

async function cf(token: string, path: string, method = "GET", body?: unknown) {
  const response = await fetch(CF + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  let data: any = {};
  try { data = JSON.parse(raw); } catch { data = { raw }; }
  return { ok: response.ok && data?.success !== false, status: response.status, data };
}

async function domains(token: string) {
  const response = await cf(token, `/accounts/${ACCOUNT}/workers/domains`);
  return Array.isArray(response.data?.result) ? response.data.result : [];
}

async function attach(token: string) {
  const list = await domains(token);
  const old = list.find((item: any) => item.hostname === HOST && item.zone_id === ZONE) || null;
  if (old?.service === SERVICE) return { ok: true, old };
  if (old) {
    const deleted = await cf(token, `/accounts/${ACCOUNT}/workers/domains/${old.id}`, "DELETE");
    if (!deleted.ok) return { ok: false, old, status: deleted.status };
  }
  const attached = await cf(token, `/accounts/${ACCOUNT}/workers/domains`, "PUT", {
    hostname: HOST,
    service: SERVICE,
    zone_id: ZONE,
    zone_name: "cloudsales.app",
  });
  return { ok: attached.ok, old, status: attached.status, errors: attached.data?.errors || [] };
}

async function restore(token: string, old: any) {
  const list = await domains(token);
  const current = list.find((item: any) => item.hostname === HOST && item.zone_id === ZONE);
  if (current) await cf(token, `/accounts/${ACCOUNT}/workers/domains/${current.id}`, "DELETE");
  if (old?.service) {
    await cf(token, `/accounts/${ACCOUNT}/workers/domains`, "PUT", {
      hostname: HOST,
      service: old.service,
      zone_id: ZONE,
      zone_name: "cloudsales.app",
    });
  }
}

async function text(url: string) {
  const response = await fetch(url + (url.includes("?") ? "&" : "?") + "release=" + Date.now(), {
    headers: { "cache-control": "no-cache", pragma: "no-cache" },
  });
  if (!response.ok) throw new Error(`fetch_${response.status}_${url}`);
  return await response.text();
}

async function bytes(url: string) {
  const response = await fetch(url + (url.includes("?") ? "&" : "?") + "release=" + Date.now(), {
    headers: { "cache-control": "no-cache" },
  });
  if (!response.ok) throw new Error(`fetch_${response.status}_${url}`);
  return new Uint8Array(await response.arrayBuffer());
}

function b64(data: Uint8Array) {
  let output = "";
  for (let index = 0; index < data.length; index += 32768) {
    output += String.fromCharCode(...data.subarray(index, Math.min(index + 32768, data.length)));
  }
  return btoa(output);
}

function brandPage(source: string) {
  let page = source;
  page = page.replace(/<link rel="icon" href="\/icon\.svg">/gi, `<link rel="icon" type="image/png" href="/favicon.png?v=${VERSION}">`);
  page = page.replace(/<link rel="apple-touch-icon" href="\/icon\.svg">/gi, `<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=${VERSION}">`);
  page = page.replace(/install\.js\?v=[^\"']+/g, `install.js?v=${VERSION}`);
  page = page.replace(/src="\/icon\.svg"/gi, `src="/icon-512.png?v=${VERSION}"`);
  return page;
}

async function sha256b64(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  let output = "";
  for (const byte of new Uint8Array(hash)) output += String.fromCharCode(byte);
  return btoa(output);
}

async function cspFor(page: string) {
  const inline = [...page.matchAll(/<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
  const hashes = await Promise.all(inline.map(sha256b64));
  const scriptHashes = hashes.map((hash) => `'sha256-${hash}'`).join(" ");
  return `default-src 'self'; script-src 'self' ${scriptHashes}; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://storage.googleapis.com; connect-src 'self' https://fkahaqprzgcimgyathqx.supabase.co; worker-src 'self' blob:; font-src 'self' data:; media-src 'self' blob: data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`;
}

async function upload(token: string, code: string) {
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify({ main_module: "main.mjs", compatibility_date: "2026-08-29" })], { type: "application/json" }));
  form.append("main.mjs", new Blob([code], { type: "application/javascript+module" }), "main.mjs");
  const response = await fetch(`${CF}/accounts/${ACCOUNT}/workers/scripts/${SERVICE}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const raw = await response.text();
  let data: any = {};
  try { data = JSON.parse(raw); } catch { data = { raw }; }
  return { ok: response.ok && data?.success !== false, status: response.status, errors: data?.errors || [] };
}

function worker(page: string, manifest: string, sw: string, scripts: Record<string, string>, icon: string, csp: string) {
  return `const PAGE=${JSON.stringify(page)},MANIFEST=${JSON.stringify(manifest)},SW=${JSON.stringify(sw)},SCRIPTS=${JSON.stringify(scripts)},ICON=${JSON.stringify(icon)},CSP=${JSON.stringify(csp)},V=${JSON.stringify(VERSION)};\nconst H={'x-cloudsales-release':V,'x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'strict-origin-when-cross-origin','permissions-policy':'camera=(),geolocation=(),payment=(self),microphone=(self)','cross-origin-resource-policy':'same-origin','cross-origin-opener-policy':'same-origin-allow-popups','origin-agent-cluster':'?1','x-permitted-cross-domain-policies':'none','x-robots-tag':'noindex, noarchive, nosnippet'};\nfunction r(b,t='text/html; charset=utf-8',c='no-store',withCsp=true){return new Response(b,{headers:{...H,'content-type':t,'cache-control':c,...(withCsp?{'content-security-policy':CSP}:{})}})}\nfunction img(){const u=Uint8Array.from(atob(ICON),c=>c.charCodeAt(0));return new Response(u,{headers:{...H,'content-type':'image/png','cache-control':'public,max-age=31536000,immutable'}})}\nexport default{async fetch(req){const u=new URL(req.url),p=u.pathname;if(p==='/__version')return r(V,'text/plain','no-store',false);if(p==='/manifest.webmanifest')return r(MANIFEST,'application/manifest+json','no-cache',false);if(p==='/sw.js')return r(SW,'application/javascript; charset=utf-8','no-cache',false);if(SCRIPTS[p])return r(SCRIPTS[p],'application/javascript; charset=utf-8','no-cache',false);if(['/cloudsales-official-app-icon.png','/cloudsales-official-app-icon-v3.png','/icon-192.png','/icon-512.png','/apple-touch-icon.png','/favicon.png','/favicon.ico'].includes(p))return img();if(p==='/icon.svg'||p==='/favicon.svg')return Response.redirect(u.origin+'/icon-512.png?v='+V,301);return r(PAGE)}};`;
}

async function check(path: string) {
  const response = await fetch(`https://${HOST}${path}${path.includes("?") ? "&" : "?"}qa=${Date.now()}`, {
    headers: { "cache-control": "no-cache", pragma: "no-cache" },
  });
  const body = await response.text();
  return {
    status: response.status,
    body,
    type: response.headers.get("content-type") || "",
    release: response.headers.get("x-cloudsales-release"),
    csp: response.headers.get("content-security-policy") || "",
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const body = await req.json().catch(() => ({}));
  const id = String(body.command_id || "");
  const queued = await command(id);
  if (!queued || queued.command_type !== COMMAND || queued.status !== "queued" || new Date(queued.expires_at).getTime() <= Date.now()) {
    return json({ error: "invalid_command" }, 403);
  }

  await db.from("internal_command_queue").update({
    status: "running",
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  const token = Deno.env.get("CLOUDFLARE_API_TOKEN_CLOUDSALES") || "";
  if (!token) {
    await finish(id, "failed", null, "cloudflare_token_missing");
    return json({ error: "cloudflare_token_missing" }, 503);
  }

  const result: any = { version: VERSION, service: SERVICE };
  let old: any = null;
  try {
    const pageSource = await text(`${RAW}/pwa.html`);
    const page = brandPage(pageSource);
    const csp = await cspFor(page);
    const manifest = await text(`${RAW}/manifest.webmanifest`);
    const sw = await text(`${RAW}/sw.js`);
    const scriptPaths = [
      "/install.js",
      "/auth-runtime-v2.js",
      "/app-runtime-v14.js",
      "/ai-chat-runtime-v2.js",
      "/ai-chat-backfill-v1.js",
      "/ai-chat-channels-v1.js",
      "/calendar-runtime-v1.js",
      "/ai-chat-calendar-bridge-v1.js",
    ];
    const scripts: Record<string, string> = {};
    for (const path of scriptPaths) scripts[path] = await text(`${RAW}${path}`);
    const icon = await bytes(`${RAW}/assets/cloudsales-isotipo-official-512.png`);

    result.upload = await upload(token, worker(page, manifest, sw, scripts, b64(icon), csp));
    if (!result.upload.ok) throw new Error("upload_failed");

    const attached = await attach(token);
    old = attached.old;
    if (!attached.ok) throw new Error("attach_failed");
    await new Promise((resolve) => setTimeout(resolve, 7000));

    const root = await check("/");
    const manifestLive = await check("/manifest.webmanifest");
    const swLive = await check("/sw.js");
    const installer = await check("/install.js");
    const authRuntime = await check("/auth-runtime-v2.js");
    const icon192 = await check("/icon-192.png");
    const icon512 = await check("/icon-512.png");
    const apple = await check("/apple-touch-icon.png");
    const favicon = await check("/favicon.png");

    const tests = {
      root: root.status === 200 && root.release === VERSION,
      csp_inline_runtime: root.csp.includes("sha256-") && root.csp.includes("script-src 'self'"),
      direct_favicon: root.body.includes(`/favicon.png?v=${VERSION}`),
      direct_apple: root.body.includes(`/apple-touch-icon.png?v=${VERSION}`),
      branded_ui: root.body.includes(`/icon-512.png?v=${VERSION}`),
      manifest_png: manifestLive.status === 200 && manifestLive.body.includes("/icon-192.png") && manifestLive.body.includes("/icon-512.png") && !manifestLive.body.includes("icon.svg"),
      sw_release: swLive.status === 200 && swLive.body.includes("cloudsales-pwa-2026.08.29.2"),
      installer_png: installer.status === 200 && installer.body.includes("/icon-512.png?v=2026082901"),
      explicit_email_authorization: authRuntime.status === 200 && authRuntime.body.includes("signup_confirmation") && authRuntime.body.includes("authorize_email") && authRuntime.body.includes("signupEmailNotice"),
      icons: [icon192, icon512, apple, favicon].every((asset) => asset.status === 200 && /image\/png/i.test(asset.type)),
    };
    result.tests = tests;
    if (Object.values(tests).some((value) => value !== true)) throw new Error("pwa_auth_smoke_failed");

    await db.from("audit_log").insert({
      actor_type: "system",
      action: "cloudsales.pwa.auth_v24.promoted",
      entity_type: "release",
      entity_id: VERSION,
      success: true,
      context: { service: SERVICE, tests },
    });
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
