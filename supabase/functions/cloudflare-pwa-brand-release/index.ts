import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CF = "https://api.cloudflare.com/client/v4";
const ACCOUNT = "bd94cb0580e86e7f40b4271a03052426";
const ZONE = "44753df079f42f8995124c358b135597";
const HOST = "app.cloudsales.app";
const SERVICE = "cloudsales-pwa-v23";
const VERSION = "2026.08.29.1";
const COMMAND = "cloudsales_pwa_brand_install_v23";
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
  const r = await fetch(CF + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: r.ok && data?.success !== false, status: r.status, data };
}

async function domains(token: string) {
  const r = await cf(token, `/accounts/${ACCOUNT}/workers/domains`);
  return Array.isArray(r.data?.result) ? r.data.result : [];
}

async function attach(token: string) {
  const list = await domains(token);
  const old = list.find((x: any) => x.hostname === HOST && x.zone_id === ZONE) || null;
  if (old?.service === SERVICE) return { ok: true, old };
  if (old) {
    const d = await cf(token, `/accounts/${ACCOUNT}/workers/domains/${old.id}`, "DELETE");
    if (!d.ok) return { ok: false, old, status: d.status };
  }
  const a = await cf(token, `/accounts/${ACCOUNT}/workers/domains`, "PUT", {
    hostname: HOST,
    service: SERVICE,
    zone_id: ZONE,
    zone_name: "cloudsales.app",
  });
  return { ok: a.ok, old, status: a.status, errors: a.data?.errors || [] };
}

async function restore(token: string, old: any) {
  const list = await domains(token);
  const now = list.find((x: any) => x.hostname === HOST && x.zone_id === ZONE);
  if (now) await cf(token, `/accounts/${ACCOUNT}/workers/domains/${now.id}`, "DELETE");
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
  const r = await fetch(url + (url.includes("?") ? "&" : "?") + "release=" + Date.now(), {
    headers: { "cache-control": "no-cache", pragma: "no-cache" },
  });
  if (!r.ok) throw new Error(`fetch_${r.status}_${url}`);
  return await r.text();
}

async function bytes(url: string) {
  const r = await fetch(url + (url.includes("?") ? "&" : "?") + "release=" + Date.now(), {
    headers: { "cache-control": "no-cache" },
  });
  if (!r.ok) throw new Error(`fetch_${r.status}_${url}`);
  return new Uint8Array(await r.arrayBuffer());
}

function b64(data: Uint8Array) {
  let s = "";
  for (let i = 0; i < data.length; i += 32768) s += String.fromCharCode(...data.subarray(i, Math.min(i + 32768, data.length)));
  return btoa(s);
}

function brandPage(source: string) {
  let page = source;
  page = page.replace(/<link rel="icon" href="\/icon\.svg">/gi, `<link rel="icon" type="image/png" href="/favicon.png?v=${VERSION}">`);
  page = page.replace(/<link rel="apple-touch-icon" href="\/icon\.svg">/gi, `<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=${VERSION}">`);
  page = page.replace(/install\.js\?v=[^\"']+/g, `install.js?v=${VERSION}`);
  page = page.replace(/src="\/icon\.svg"/gi, `src="/icon-512.png?v=${VERSION}"`);
  return page;
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

function worker(page: string, manifest: string, sw: string, scripts: Record<string, string>, icon: string) {
  return `const PAGE=${JSON.stringify(page)},MANIFEST=${JSON.stringify(manifest)},SW=${JSON.stringify(sw)},SCRIPTS=${JSON.stringify(scripts)},ICON=${JSON.stringify(icon)},V=${JSON.stringify(VERSION)};\nconst H={'x-cloudsales-release':V,'x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'strict-origin-when-cross-origin','permissions-policy':'camera=(),geolocation=(),payment=(self),microphone=(self)','cross-origin-resource-policy':'same-origin','cross-origin-opener-policy':'same-origin-allow-popups','origin-agent-cluster':'?1','x-permitted-cross-domain-policies':'none','x-robots-tag':'noindex, noarchive, nosnippet'};\nfunction r(b,t='text/html; charset=utf-8',c='no-store',csp=true){return new Response(b,{headers:{...H,'content-type':t,'cache-control':c,...(csp?{'content-security-policy':\"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://storage.googleapis.com; connect-src 'self' https://fkahaqprzgcimgyathqx.supabase.co; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; worker-src 'self' blob:;\"}:{})}})}\nfunction img(){const u=Uint8Array.from(atob(ICON),c=>c.charCodeAt(0));return new Response(u,{headers:{...H,'content-type':'image/png','cache-control':'public,max-age=31536000,immutable'}})}\nexport default{async fetch(req){const u=new URL(req.url),p=u.pathname;if(p==='/__version')return r(V,'text/plain','no-store',false);if(p==='/manifest.webmanifest')return r(MANIFEST,'application/manifest+json','no-cache',false);if(p==='/sw.js')return r(SW,'application/javascript; charset=utf-8','no-cache',false);if(SCRIPTS[p])return r(SCRIPTS[p],'application/javascript; charset=utf-8','no-cache',false);if(['/cloudsales-official-app-icon.png','/cloudsales-official-app-icon-v3.png','/icon-192.png','/icon-512.png','/apple-touch-icon.png','/favicon.png','/favicon.ico'].includes(p))return img();if(p==='/icon.svg'||p==='/favicon.svg')return Response.redirect(u.origin+'/icon-512.png?v='+V,301);return r(PAGE)}};`;
}

async function check(path: string) {
  const r = await fetch(`https://${HOST}${path}${path.includes("?") ? "&" : "?"}qa=${Date.now()}`, { headers: { "cache-control": "no-cache", pragma: "no-cache" } });
  const body = await r.text();
  return { status: r.status, body, type: r.headers.get("content-type") || "", release: r.headers.get("x-cloudsales-release") };
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
  let old: any = null;
  try {
    const pageSource = await text(`${RAW}/pwa.html`);
    const page = brandPage(pageSource);
    const manifest = await text(`${RAW}/manifest.webmanifest`);
    const sw = await text(`${RAW}/sw.js`);
    const scriptPaths = ["/install.js", "/auth-runtime-v2.js", "/app-runtime-v14.js", "/ai-chat-runtime-v2.js", "/ai-chat-backfill-v1.js", "/ai-chat-channels-v1.js", "/calendar-runtime-v1.js", "/ai-chat-calendar-bridge-v1.js"];
    const scripts: Record<string, string> = {};
    for (const p of scriptPaths) scripts[p] = await text(`${RAW}${p}`);
    const icon = await bytes(`${RAW}/assets/cloudsales-isotipo-official-512.png`);

    result.upload = await upload(token, worker(page, manifest, sw, scripts, b64(icon)));
    if (!result.upload.ok) throw new Error("upload_failed");

    const attached = await attach(token);
    old = attached.old;
    if (!attached.ok) throw new Error("attach_failed");
    await new Promise((resolve) => setTimeout(resolve, 7000));

    const root = await check("/");
    const m = await check("/manifest.webmanifest");
    const s = await check("/sw.js");
    const installer = await check("/install.js");
    const i192 = await check("/icon-192.png");
    const i512 = await check("/icon-512.png");
    const apple = await check("/apple-touch-icon.png");
    const favicon = await check("/favicon.png");

    const tests = {
      root: root.status === 200 && root.release === VERSION,
      direct_favicon: root.body.includes(`/favicon.png?v=${VERSION}`),
      direct_apple: root.body.includes(`/apple-touch-icon.png?v=${VERSION}`),
      branded_ui: root.body.includes(`/icon-512.png?v=${VERSION}`),
      manifest_png: m.status === 200 && m.body.includes("/icon-192.png") && m.body.includes("/icon-512.png") && !m.body.includes("icon.svg"),
      sw_release: s.status === 200 && s.body.includes("cloudsales-pwa-2026.08.29.1"),
      installer_png: installer.status === 200 && installer.body.includes("/icon-512.png?v=2026082901"),
      icons: [i192, i512, apple, favicon].every((x) => x.status === 200 && /image\/png/i.test(x.type)),
    };
    result.tests = tests;
    if (Object.values(tests).some((v) => v !== true)) throw new Error("pwa_brand_smoke_failed");

    await db.from("audit_log").insert({ actor_type: "system", action: "cloudsales.pwa.brand_install_v23.promoted", entity_type: "release", entity_id: VERSION, success: true, context: { service: SERVICE, tests } });
    await finish(id, "succeeded", result, null);
    return json(result);
  } catch (e) {
    const error = String((e as Error).message || e).slice(0, 500);
    result.error = error;
    if (old?.service) await restore(token, old);
    await finish(id, "failed", result, error);
    return json(result, 500);
  }
});
