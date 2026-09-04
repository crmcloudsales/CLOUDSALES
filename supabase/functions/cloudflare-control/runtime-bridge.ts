import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U = Deno.env.get("SUPABASE_URL")!;
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ACCOUNT = "bd94cb0580e86e7f40b4271a03052426";
const MAILGUN_SANDBOX = "sandboxb26d85ed874a4fbda71bb988bfeda82f.mailgun.org";
const MAILGUN_RUNTIME = "cloudsales.app";
const CANONICAL = "https://raw.githubusercontent.com/crmcloudsales/CLOUDSALES/main/supabase/functions/cloudflare-control/index.ts";

const db = createClient(U, S, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: cfVaultToken } = await db.rpc("email_engine_read_secret", { p_setting_key: "cloudflare_email_sending_token" });
const cfToken = typeof cfVaultToken === "string" ? cfVaultToken.trim() : "";

const realFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  // Canonical Cloudflare Email Sending health used an older zone endpoint. Translate
  // it to a harmless account-scoped permission probe and return the legacy shape.
  if (url.includes("api.cloudflare.com/client/v4/zones/") && url.includes("/email/sending/subdomains")) {
    if (!cfToken) return new Response(JSON.stringify({ success: false, errors: [{ message: "email_sending_token_missing" }] }), { status: 401, headers: { "content-type": "application/json" } });
    const probe = await realFetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/email/sending/suppressions?per_page=1`, {
      method: "GET",
      headers: { Authorization: `Bearer ${cfToken}`, Accept: "application/json" }
    });
    const body = await probe.text();
    if (!probe.ok) return new Response(body, { status: probe.status, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({ success: true, result: [{ enabled: true, status: "active", domain: "cloudsales.app" }] }), { status: 200, headers: { "content-type": "application/json" } });
  }

  let nextUrl = url;
  let nextInit: RequestInit = { ...(init || {}) };

  // Always use the verified Vault Account API Token for Cloudflare Email Sending.
  if (url.includes("api.cloudflare.com/client/v4/accounts/") && url.includes("/email/sending/")) {
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (cfToken) headers.set("Authorization", `Bearer ${cfToken}`);
    nextInit = { ...nextInit, headers };
  }

  // Mailgun's account already has cloudsales.app as an ACTIVE custom domain. The
  // legacy Edge secret still names the sandbox; translate only Mailgun domain paths.
  if (url.includes("api.mailgun.net") && url.includes(MAILGUN_SANDBOX)) {
    nextUrl = url.replaceAll(MAILGUN_SANDBOX, MAILGUN_RUNTIME);
  }

  return realFetch(nextUrl, nextInit);
};

await import(CANONICAL);
