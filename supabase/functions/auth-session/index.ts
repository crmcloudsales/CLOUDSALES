import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U = Deno.env.get("SUPABASE_URL")!;
const A = Deno.env.get("SUPABASE_ANON_KEY")!;
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const allowed = new Set([
  "https://cloudsales.app",
  "https://www.cloudsales.app",
  "https://app.cloudsales.app",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function cors(origin: string | null) {
  const value = origin && allowed.has(origin) ? origin : "https://app.cloudsales.app";
  return {
    "Access-Control-Allow-Origin": value,
    "Access-Control-Allow-Headers": "content-type,authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(origin),
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

const norm = (value: any) => String(value ?? "").trim().toLowerCase().slice(0, 320);
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function sha(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function limited(svc: any, key: string, limit: number, seconds: number) {
  const { data } = await svc.rpc("consume_rate_limit", {
    p_bucket_key: key,
    p_limit: limit,
    p_window_seconds: seconds,
  });
  return data !== true;
}

function authorizedEmailSend(body: any, purpose: string) {
  return body?.authorize_email === true && String(body?.email_purpose || "") === purpose;
}

function safeAuthError(error: any) {
  const raw = String(error?.message || error || "").toLowerCase();
  if (raw.includes("rate") || raw.includes("limit") || raw.includes("seconds")) return "signup_temporarily_limited";
  if (raw.includes("password")) return "weak_password";
  if (raw.includes("email")) return "signup_unavailable";
  return "signup_unavailable";
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (origin && !allowed.has(origin)) return json({ error: "origin_not_allowed" }, 403, origin);
  if (Number(req.headers.get("content-length") || 0) > 16384) return json({ error: "payload_too_large" }, 413, origin);

  let body: any = {};
  try { body = await req.json(); }
  catch { return json({ error: "invalid_json" }, 400, origin); }

  const action = String(body.action || "");
  if (!["sign_up", "sign_in", "refresh", "resend_confirmation"].includes(action)) {
    return json({ error: "unsupported_action" }, 400, origin);
  }

  const ip = String((req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim()).slice(0, 80);
  const svc = createClient(U, S, { auth: { persistSession: false, autoRefreshToken: false } });
  if (await limited(svc, `auth:${ip}`, 40, 3600)) return json({ error: "rate_limited" }, 429, origin);
  const client = createClient(U, A, { auth: { persistSession: false, autoRefreshToken: false } });

  if (action === "sign_in") {
    const email = norm(body.email);
    const password = String(body.password || "");
    if (!email || !password) return json({ error: "signin_unavailable" }, 401, origin);
    const emailHash = await sha(email);
    if (await limited(svc, `auth:signin:${ip}:${emailHash.slice(0, 24)}`, 12, 900)) return json({ error: "rate_limited" }, 429, origin);
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

  if (action === "sign_up") {
    if (!authorizedEmailSend(body, "signup_confirmation")) {
      return json({
        error: "email_authorization_required",
        email_blocked: true,
        policy: "CLOUDCO_EMAIL_EXPLICIT_SINGLE_SEND",
      }, 423, origin);
    }

    const email = norm(body.email);
    const password = String(body.password || "");
    const fullName = String(body.full_name || "").trim().slice(0, 160);
    if (!validEmail(email)) return json({ error: "invalid_email" }, 400, origin);
    if (password.length < 8) return json({ error: "weak_password" }, 400, origin);

    const emailHash = await sha(email);
    if (await limited(svc, `auth:signup:${ip}:${emailHash.slice(0, 24)}`, 5, 3600)) {
      return json({ error: "signup_temporarily_limited" }, 429, origin);
    }

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || null },
        emailRedirectTo: "https://app.cloudsales.app/?auth=confirmed",
      },
    });

    if (error) return json({ error: safeAuthError(error) }, 400, origin);
    if (!data.user) return json({ error: "signup_unavailable" }, 400, origin);

    const identities = Array.isArray((data.user as any).identities) ? (data.user as any).identities : null;
    if (identities && identities.length === 0) {
      return json({ confirmation_required: true, message_code: "account_exists_or_confirmation_pending" }, 200, origin);
    }

    await svc.from("email_send_authorizations").insert({
      organization_id: null,
      user_id: data.user.id,
      recipient: email,
      purpose: "signup_confirmation",
      scope: "single_send",
      approved_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      consumed_at: new Date().toISOString(),
      context: {
        source: "auth-session",
        action: "sign_up",
        authorization: "explicit_create_account_click",
      },
    }).catch(() => {});

    if (data.session) {
      return json({
        user: { id: data.user.id, email: data.user.email },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
        confirmation_required: false,
      }, 200, origin);
    }

    return json({
      user: { id: data.user.id, email: data.user.email },
      confirmation_required: true,
      message_code: "confirmation_sent",
      email_authorization_consumed: true,
    }, 200, origin);
  }

  if (action === "resend_confirmation") {
    if (!authorizedEmailSend(body, "signup_confirmation_resend")) {
      return json({
        error: "email_authorization_required",
        email_blocked: true,
        policy: "CLOUDCO_EMAIL_EXPLICIT_SINGLE_SEND",
      }, 423, origin);
    }

    const email = norm(body.email);
    if (!validEmail(email)) return json({ error: "invalid_email" }, 400, origin);
    const emailHash = await sha(email);
    if (await limited(svc, `auth:resend:${ip}:${emailHash.slice(0, 24)}`, 3, 3600)) {
      return json({ error: "confirmation_wait", retry_after_seconds: 40 }, 429, origin);
    }

    const { error } = await client.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: "https://app.cloudsales.app/?auth=confirmed" },
    });
    if (error) {
      const raw = String(error.message || "").toLowerCase();
      if (raw.includes("rate") || raw.includes("seconds")) return json({ error: "confirmation_wait", retry_after_seconds: 40 }, 429, origin);
      return json({ error: "resend_unavailable" }, 400, origin);
    }
    return json({ ok: true, message_code: "confirmation_resent", email_authorization_consumed: true }, 200, origin);
  }

  const refreshToken = String(body.refresh_token || "");
  if (!refreshToken) return json({ error: "refresh_token_required" }, 400, origin);
  const refreshHash = await sha(refreshToken);
  if (await limited(svc, `auth:refresh:${ip}:${refreshHash.slice(0, 24)}`, 60, 3600)) return json({ error: "rate_limited" }, 429, origin);
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
});
