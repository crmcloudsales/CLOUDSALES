import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * CLOUDCO EMAIL ENGINE bootstrap dispatcher.
 *
 * The legacy Cloudflare release-control behavior remains permanently removed.
 * This Edge Function slot is reused only for the shared Email Engine while the
 * CloudSales Supabase project remains on its zero-cost Edge Function footprint.
 *
 * Provider routing is data-driven and FREE-FIRST. A provider is only attempted
 * when it is active for the brand/capability and still inside its configured
 * soft free allowance. No paid overage is authorized here.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const svc = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(digest);
}

async function secureEqual(a: string, b: string) {
  if (!a || !b) return false;
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

async function readSecret(settingKey: string): Promise<string | null> {
  const env = Deno.env.get(settingKey);
  if (env && env.trim()) return env.trim();
  const { data, error } = await svc.rpc("email_engine_read_secret", {
    p_setting_key: settingKey,
  });
  if (error || typeof data !== "string" || !data.trim()) return null;
  return data.trim();
}

async function addEvent(
  jobId: string,
  providerKey: string,
  eventType: string,
  payload: Record<string, unknown> = {},
  providerMessageId?: string | null,
) {
  await svc.from("email_engine_events").insert({
    job_id: jobId,
    provider_key: providerKey,
    provider_message_id: providerMessageId || null,
    event_type: eventType,
    occurred_at: new Date().toISOString(),
    payload,
  });
}

function startOfUtcDay() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfUtcMonth() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

async function withinFreeAllowance(provider: any) {
  const daily = provider?.daily_soft_limit == null ? null : Number(provider.daily_soft_limit);
  const monthly = provider?.monthly_soft_limit == null ? null : Number(provider.monthly_soft_limit);

  if (daily != null && Number.isFinite(daily)) {
    const { count } = await svc
      .from("email_engine_jobs")
      .select("id", { count: "exact", head: true })
      .eq("provider_key", provider.provider_key)
      .in("status", ["sent", "delivered"])
      .gte("sent_at", startOfUtcDay());
    if ((count || 0) >= daily) return false;
  }

  if (monthly != null && Number.isFinite(monthly)) {
    const { count } = await svc
      .from("email_engine_jobs")
      .select("id", { count: "exact", head: true })
      .eq("provider_key", provider.provider_key)
      .in("status", ["sent", "delivered"])
      .gte("sent_at", startOfUtcMonth());
    if ((count || 0) >= monthly) return false;
  }

  return true;
}

async function sendWithSender(secret: string, message: any) {
  const res = await fetch("https://api.sender.net/v2/message/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      from: { email: message.fromEmail, name: message.fromName },
      to: { email: message.toEmail, name: message.toName || undefined },
      subject: message.subject,
      text: message.text || undefined,
      html: message.html || undefined,
      headers: { charset: "utf-8" },
    }),
  });
  const text = await res.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
  if (!res.ok || data?.success === false) {
    throw new Error(`sender_http_${res.status}:${String(data?.message || data?.error || text).slice(0, 300)}`);
  }
  return String(data?.emailId || data?.message_id || data?.id || "");
}

async function sendWithBrevo(secret: string, message: any) {
  const body: Record<string, unknown> = {
    sender: { email: message.fromEmail, name: message.fromName },
    to: [{ email: message.toEmail, name: message.toName || undefined }],
    subject: message.subject,
  };
  if (message.html) body.htmlContent = message.html;
  else body.textContent = message.text || " ";
  if (message.replyTo) body.replyTo = { email: message.replyTo, name: message.fromName };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": secret,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
  if (!res.ok) {
    throw new Error(`brevo_http_${res.status}:${String(data?.message || data?.code || text).slice(0, 300)}`);
  }
  return String(data?.messageId || data?.id || "");
}

async function sendWithMailjet(secretValue: string, message: any) {
  let publicKey = secretValue;
  let privateKey = Deno.env.get("MAILJET_API_SECRET_CLOUDSALES") ||
    Deno.env.get("MAILJET_SECRET_KEY_CLOUDSALES") || "";
  if (!privateKey && secretValue.includes(":")) {
    const idx = secretValue.indexOf(":");
    publicKey = secretValue.slice(0, idx);
    privateKey = secretValue.slice(idx + 1);
  }
  if (!publicKey || !privateKey) throw new Error("mailjet_credentials_incomplete");

  const auth = btoa(`${publicKey}:${privateKey}`);
  const res = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      Messages: [{
        From: { Email: message.fromEmail, Name: message.fromName },
        To: [{ Email: message.toEmail, Name: message.toName || undefined }],
        Subject: message.subject,
        TextPart: message.text || undefined,
        HTMLPart: message.html || undefined,
        ReplyTo: message.replyTo ? { Email: message.replyTo, Name: message.fromName } : undefined,
      }],
    }),
  });
  const text = await res.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
  if (!res.ok) {
    throw new Error(`mailjet_http_${res.status}:${String(data?.ErrorMessage || data?.message || text).slice(0, 300)}`);
  }
  return String(data?.Messages?.[0]?.To?.[0]?.MessageID || data?.Messages?.[0]?.To?.[0]?.MessageUUID || "");
}

async function providerSend(providerKey: string, secret: string, message: any) {
  if (providerKey === "sender") return await sendWithSender(secret, message);
  if (providerKey === "brevo") return await sendWithBrevo(secret, message);
  if (providerKey === "mailjet") return await sendWithMailjet(secret, message);
  throw new Error(`unsupported_or_paid_provider:${providerKey}`);
}

async function dispatch(jobId: string) {
  const { data: job, error: jobError } = await svc
    .from("email_engine_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (jobError || !job) return json({ error: "job_not_found" }, 404);
  if (job.status === "sent" || job.status === "delivered") {
    return json({ ok: true, status: job.status, provider: job.provider_key, idempotent: true });
  }
  if (job.status !== "queued" && job.status !== "failed") {
    return json({ error: "job_not_dispatchable", status: job.status }, 409);
  }
  if (new Date(job.scheduled_at).getTime() > Date.now()) {
    return json({ error: "job_not_due" }, 409);
  }

  const allowedAuthorization = new Set([
    "explicit_user",
    "system_transactional",
    "recurring_operational",
  ]);
  if (!allowedAuthorization.has(String(job.authorization_mode))) {
    await svc.from("email_engine_jobs").update({
      status: "failed",
      last_error: "authorization_mode_not_allowed",
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);
    return json({ error: "authorization_mode_not_allowed" }, 403);
  }

  const { data: suppression } = await svc
    .from("email_engine_suppressions")
    .select("email,reason")
    .eq("email", String(job.recipient_email).toLowerCase())
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (suppression) {
    await svc.from("email_engine_jobs").update({
      status: "suppressed",
      last_error: `suppressed:${suppression.reason || "active"}`,
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);
    return json({ error: "recipient_suppressed" }, 409);
  }

  const needsMarketingIdentity = job.category === "marketing" || job.category === "lifecycle";
  let identityQuery = svc
    .from("email_engine_identities")
    .select("from_name,from_email,reply_to,status,transactional_enabled,marketing_enabled")
    .eq("brand_key", job.brand_key)
    .eq("status", "active");
  identityQuery = needsMarketingIdentity
    ? identityQuery.eq("marketing_enabled", true)
    : identityQuery.eq("transactional_enabled", true);
  const { data: identities } = await identityQuery.limit(5);
  const identity = (identities || []).find((x: any) =>
    needsMarketingIdentity ? x.from_email === "info@cloudsales.app" : x.from_email === "noreply@cloudsales.app"
  ) || (identities || [])[0];
  if (!identity) return json({ error: "active_sender_identity_missing" }, 503);

  const { data: brandProviders } = await svc
    .from("email_engine_brand_providers")
    .select("provider_key,secret_setting_key,priority,status,transactional_enabled,lifecycle_enabled,marketing_enabled")
    .eq("brand_key", job.brand_key)
    .eq("status", "active")
    .order("priority", { ascending: true });

  const eligible = (brandProviders || []).filter((p: any) => {
    if (job.category === "marketing") return p.marketing_enabled === true;
    if (job.category === "lifecycle") return p.lifecycle_enabled === true;
    return p.transactional_enabled === true;
  });
  if (!eligible.length) return json({ error: "no_active_free_provider" }, 503);

  const keys = [...new Set(eligible.map((p: any) => p.provider_key))];
  const { data: globalProviders } = await svc
    .from("email_engine_providers")
    .select("provider_key,status,daily_soft_limit,monthly_soft_limit,cost_usd_per_1000,priority")
    .in("provider_key", keys)
    .eq("status", "active");
  const globalMap = new Map((globalProviders || []).map((p: any) => [p.provider_key, p]));

  let ordered = eligible.filter((p: any) => globalMap.has(p.provider_key));
  if (job.provider_key) {
    ordered = [
      ...ordered.filter((p: any) => p.provider_key === job.provider_key),
      ...ordered.filter((p: any) => p.provider_key !== job.provider_key),
    ];
  }

  const message = {
    fromName: identity.from_name,
    fromEmail: identity.from_email,
    replyTo: job.reply_to || identity.reply_to,
    toEmail: job.recipient_email,
    toName: job.recipient_name,
    subject: job.subject,
    html: job.html_body,
    text: job.text_body,
  };

  await svc.from("email_engine_jobs").update({
    status: "processing",
    updated_at: new Date().toISOString(),
  }).eq("id", job.id);

  const failures: string[] = [];
  let attemptCount = Number(job.attempts || 0);

  for (const route of ordered) {
    const providerKey = String(route.provider_key);
    const globalProvider: any = globalMap.get(providerKey);

    // Hard ZERO-SPEND gate: only configured free allowances are consumed.
    if (!(await withinFreeAllowance(globalProvider))) {
      failures.push(`${providerKey}:free_allowance_exhausted`);
      await addEvent(job.id, providerKey, "provider_skipped", { reason: "free_allowance_exhausted" });
      continue;
    }

    const secret = await readSecret(String(route.secret_setting_key || ""));
    if (!secret) {
      failures.push(`${providerKey}:credential_unavailable`);
      await addEvent(job.id, providerKey, "provider_skipped", { reason: "credential_unavailable" });
      continue;
    }

    attemptCount += 1;
    try {
      const providerMessageId = await providerSend(providerKey, secret, message);
      const now = new Date().toISOString();
      await svc.from("email_engine_jobs").update({
        provider_key: providerKey,
        provider_message_id: providerMessageId || null,
        status: "sent",
        attempts: attemptCount,
        last_error: null,
        sent_at: now,
        updated_at: now,
      }).eq("id", job.id);
      await svc.from("email_engine_brand_providers").update({ last_health_at: now, updated_at: now })
        .eq("brand_key", job.brand_key).eq("provider_key", providerKey);
      await svc.from("email_engine_providers").update({ last_health_at: now, updated_at: now })
        .eq("provider_key", providerKey);
      await addEvent(job.id, providerKey, "sent", { free_first: true, zero_spend: true }, providerMessageId);
      return json({ ok: true, status: "sent", provider: providerKey, provider_message_id: providerMessageId || null });
    } catch (error) {
      const reason = String(error instanceof Error ? error.message : error).slice(0, 500);
      failures.push(`${providerKey}:${reason}`);
      await addEvent(job.id, providerKey, "provider_send_failed", { error: reason, free_first: true });
    }
  }

  const lastError = failures.join(" | ").slice(0, 1800) || "no_free_provider_succeeded";
  await svc.from("email_engine_jobs").update({
    status: "failed",
    attempts: attemptCount,
    last_error: lastError,
    updated_at: new Date().toISOString(),
  }).eq("id", job.id);
  return json({ error: "all_free_providers_failed", details: failures }, 502);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supplied = req.headers.get("x-cloudco-email-token") || "";
  const expected = await readSecret("cloudco_email_engine_token");
  if (!expected || !(await secureEqual(supplied, expected))) {
    return json({ error: "forbidden" }, 403);
  }

  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  if (body?.action !== "send" || !body?.job_id) return json({ error: "invalid_action" }, 400);
  return await dispatch(String(body.job_id));
});
