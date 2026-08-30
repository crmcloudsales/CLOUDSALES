import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U = Deno.env.get("SUPABASE_URL")!;
const A = Deno.env.get("SUPABASE_ANON_KEY")!;
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VERSION = "2026.08.30.1";
const POLICY = "CLOUDCO_EMAIL_EXPLICIT_SINGLE_SEND";
const APP_URL = "https://app.cloudsales.app/";
const ORIGINS = new Set([
  "https://cloudsales.app",
  "https://www.cloudsales.app",
  "https://app.cloudsales.app",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function cors(origin: string | null) {
  const value = origin && ORIGINS.has(origin) ? origin : APP_URL.slice(0, -1);
  return {
    "Access-Control-Allow-Origin": value,
    "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Vary": "Origin",
  };
}
function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(origin),
      "content-type": "application/json;charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}
const normalizeEmail = (value: any) => String(value ?? "").trim().toLowerCase().slice(0, 320);
const safeText = (value: any, max = 200) => String(value ?? "").trim().slice(0, max);
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
async function sha(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function rateLimited(svc: any, key: string, limit: number, seconds: number) {
  const { data } = await svc.rpc("consume_rate_limit", {
    p_bucket_key: key,
    p_limit: limit,
    p_window_seconds: seconds,
  });
  return data !== true;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (origin && !ORIGINS.has(origin)) return json({ error: "origin_not_allowed" }, 403, origin);
  if (Number(req.headers.get("content-length") || 0) > 16384) return json({ error: "payload_too_large" }, 413, origin);

  let body: any = {};
  try { body = await req.json(); }
  catch { return json({ error: "invalid_json" }, 400, origin); }

  const action = String(body.action || "");
  if (!["sign_up", "sign_in", "refresh", "resend_confirmation"].includes(action)) {
    return json({ error: "unsupported_action" }, 400, origin);
  }

  const ip = String((req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim()).slice(0, 80);
  const ipHash = await sha(ip);
  const svc = createClient(U, S, { auth: { persistSession: false, autoRefreshToken: false } });
  if (await rateLimited(svc, `auth:${ipHash.slice(0, 24)}`, 40, 3600)) {
    return json({ error: "rate_limited" }, 429, origin);
  }
  const client = createClient(U, A, { auth: { persistSession: false, autoRefreshToken: false } });

  if (action === "sign_in") {
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    if (!email || !password) return json({ error: "signin_unavailable" }, 401, origin);
    const emailHash = await sha(email);
    if (await rateLimited(svc, `auth:signin:${ipHash.slice(0, 16)}:${emailHash.slice(0, 20)}`, 12, 900)) {
      return json({ error: "rate_limited" }, 429, origin);
    }
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session) return json({ error: "signin_unavailable" }, 401, origin);
    return json({
      user: { id: data.user.id, email: data.user.email },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    }, 200, origin);
  }

  if (action === "refresh") {
    const refreshToken = String(body.refresh_token || "");
    if (!refreshToken) return json({ error: "refresh_token_required" }, 400, origin);
    const refreshHash = await sha(refreshToken);
    if (await rateLimited(svc, `auth:refresh:${ipHash.slice(0, 16)}:${refreshHash.slice(0, 24)}`, 60, 3600)) {
      return json({ error: "rate_limited" }, 429, origin);
    }
    const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) return json({ error: "refresh_failed" }, 401, origin);
    return json({
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    }, 200, origin);
  }

  const email = normalizeEmail(body.email);
  if (!validEmail(email)) return json({ error: "invalid_email" }, 400, origin);
  const expectedPurpose = action === "sign_up" ? "signup_confirmation" : "signup_confirmation_resend";
  if (body.authorize_email !== true || String(body.email_purpose || "") !== expectedPurpose) {
    return json({
      error: "email_authorization_required",
      email_blocked: true,
      policy: POLICY,
      required_purpose: expectedPurpose,
    }, 423, origin);
  }

  const emailHash = await sha(email);
  const perRecipientLimit = action === "sign_up" ? 5 : 4;
  if (await rateLimited(svc, `auth:${action}:${ipHash.slice(0, 16)}:${emailHash.slice(0, 20)}`, perRecipientLimit, 3600)) {
    return json({ error: "rate_limited" }, 429, origin);
  }

  // The authorization row is written BEFORE any API call capable of sending email.
  // It authorizes exactly one signup confirmation operation and nothing else.
  const { data: authorization, error: authorizationError } = await svc
    .from("email_send_authorizations")
    .insert({
      organization_id: null,
      user_id: null,
      recipient: email,
      purpose: expectedPurpose,
      scope: "single_send",
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      context: {
        policy: POLICY,
        source: "auth-session",
        action,
        version: VERSION,
        origin: origin || "direct",
        ip_hash: ipHash,
        explicit_user_action: true,
      },
    })
    .select("id")
    .single();
  if (authorizationError || !authorization?.id) {
    return json({ error: "email_authorization_audit_failed" }, 503, origin);
  }

  if (action === "sign_up") {
    const password = String(body.password || "");
    if (password.length < 8) return json({ error: "weak_password" }, 400, origin);
    const fullName = safeText(body.full_name, 160);
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: APP_URL,
        data: fullName ? { full_name: fullName } : {},
      },
    });
    if (error) {
      const message = String(error.message || "").toLowerCase();
      if (message.includes("rate") || error.status === 429) return json({ error: "signup_temporarily_limited" }, 429, origin);
      return json({ error: "signup_unavailable" }, 400, origin);
    }

    await svc.from("email_send_authorizations").update({
      user_id: data.user?.id || null,
      consumed_at: new Date().toISOString(),
      context: {
        policy: POLICY,
        source: "auth-session",
        action,
        version: VERSION,
        origin: origin || "direct",
        ip_hash: ipHash,
        explicit_user_action: true,
        provider_call_completed: true,
      },
    }).eq("id", authorization.id);

    if (data.session) {
      return json({
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      }, 200, origin);
    }

    const identities = Array.isArray(data.user?.identities) ? data.user.identities : null;
    return json({
      confirmation_required: true,
      message_code: identities && identities.length === 0
        ? "account_exists_or_confirmation_pending"
        : "confirmation_sent",
      policy: POLICY,
    }, 200, origin);
  }

  const { data, error } = await client.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: APP_URL },
  });
  if (error) {
    const message = String(error.message || "").toLowerCase();
    if (message.includes("rate") || error.status === 429) {
      return json({ error: "confirmation_wait" }, 429, origin);
    }
    return json({ error: "resend_unavailable" }, 400, origin);
  }

  await svc.from("email_send_authorizations").update({
    user_id: data.user?.id || null,
    consumed_at: new Date().toISOString(),
    context: {
      policy: POLICY,
      source: "auth-session",
      action,
      version: VERSION,
      origin: origin || "direct",
      ip_hash: ipHash,
      explicit_user_action: true,
      provider_call_completed: true,
    },
  }).eq("id", authorization.id);

  return json({
    ok: true,
    confirmation_required: true,
    message_code: "confirmation_resent",
    policy: POLICY,
  }, 200, origin);
});
