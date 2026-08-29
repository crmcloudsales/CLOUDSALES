import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U = Deno.env.get("SUPABASE_URL")!;
const A = Deno.env.get("SUPABASE_ANON_KEY")!;
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORIGINS = new Set([
  "https://app.cloudsales.app",
  "https://cloudsales.app",
  "https://www.cloudsales.app",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function cors(origin: string | null) {
  const value = origin && ORIGINS.has(origin) ? origin : "https://app.cloudsales.app";
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
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (origin && !ORIGINS.has(origin)) return json({ error: "origin_not_allowed" }, 403, origin);

  const authorization = req.headers.get("authorization");
  if (!authorization) return json({ error: "missing_authorization" }, 401, origin);
  const userClient = createClient(U, A, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) return json({ error: "invalid_session" }, 401, origin);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "invalid_json" }, 400, origin); }

  const organizationId = String(body.organization_id || "");
  const campaignId = String(body.campaign_id || "");
  const limit = Math.max(1, Math.min(25, Number(body.limit || 10)));
  if (!organizationId || !campaignId) return json({ error: "organization_and_campaign_required" }, 400, origin);

  const svc = createClient(U, S, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: membership } = await svc.from("organization_members")
    .select("role,status")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || membership.status !== "active" || !["owner", "admin", "operator"].includes(membership.role)) {
    return json({ error: "forbidden" }, 403, origin);
  }

  const { data: campaign } = await svc.from("outbound_campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!campaign) return json({ error: "campaign_not_found" }, 404, origin);

  if (String(campaign.channel || "").toLowerCase() === "email") {
    await svc.from("audit_log").insert({
      organization_id: organizationId,
      actor_user_id: user.id,
      actor_type: "user",
      action: "email.send.blocked",
      entity_type: "outbound_campaign",
      entity_id: campaignId,
      success: true,
      context: {
        policy: "CLOUDCO_EMAIL_DEFAULT_DENY",
        reason: "explicit_user_authorization_required",
      },
    }).catch(() => {});
    return json({
      error: "email_send_blocked_requires_explicit_user_authorization",
      email_blocked: true,
      policy: "CLOUDCO_EMAIL_DEFAULT_DENY",
    }, 423, origin);
  }

  if (!["queued", "running", "scheduled"].includes(campaign.status)) {
    return json({ error: "campaign_not_ready", status: campaign.status }, 409, origin);
  }
  if (campaign.scheduled_for && new Date(campaign.scheduled_for).getTime() > Date.now()) {
    return json({ ok: true, status: "scheduled", scheduled_for: campaign.scheduled_for }, 200, origin);
  }

  const { data: connection } = await svc.from("connections")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("provider_key", "highlevel")
    .eq("status", "connected")
    .limit(1)
    .maybeSingle();
  if (!connection) return json({ error: "highlevel_not_connected" }, 409, origin);

  const { data: setting } = await svc.from("internal_settings")
    .select("secret_id")
    .eq("setting_key", "automation_worker_token")
    .maybeSingle();
  if (!setting?.secret_id) return json({ error: "worker_token_missing" }, 503, origin);
  const { data: workerToken } = await svc.rpc("service_read_secret", { p_secret_id: setting.secret_id });
  if (!workerToken) return json({ error: "worker_token_unavailable" }, 503, origin);

  await svc.from("outbound_campaigns").update({ status: "running" }).eq("id", campaignId);
  const { data: recipients } = await svc.from("outbound_campaign_recipients")
    .select("id,contact_id,status")
    .eq("organization_id", organizationId)
    .eq("campaign_id", campaignId)
    .eq("status", "queued")
    .order("created_at")
    .limit(limit);

  if (!(recipients || []).length) {
    const { count: remaining } = await svc.from("outbound_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .in("status", ["queued", "processing"]);
    if (!remaining) await svc.from("outbound_campaigns").update({ status: "completed" }).eq("id", campaignId);
    const { count: sent } = await svc.from("outbound_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .in("status", ["sent", "delivered", "replied"]);
    const { count: failed } = await svc.from("outbound_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "failed");
    await svc.from("outbound_campaigns").update({ sent_count: sent || 0, failed_count: failed || 0 }).eq("id", campaignId);
    return json({ ok: true, processed: 0, remaining: remaining || 0, completed: !remaining }, 200, origin);
  }

  const ids = (recipients || []).map((x: any) => x.id);
  await svc.from("outbound_campaign_recipients").update({ status: "processing" }).in("id", ids);
  const type = campaign.channel === "whatsapp" ? "WhatsApp" : "SMS";
  let sent = 0;
  let failed = 0;
  const results: any[] = [];

  for (const recipient of recipients || []) {
    try {
      const input: any = {
        connection_id: connection.id,
        contact_id: recipient.contact_id,
        type,
        message: campaign.content,
      };
      if (Array.isArray(campaign.attachments)) input.attachments = campaign.attachments.slice(0, 5).map(String);

      const { data: job, error: jobError } = await svc.from("automation_jobs").insert({
        organization_id: organizationId,
        job_type: "conversation.send",
        status: "queued",
        requested_by: user.id,
        requires_approval: false,
        input,
      }).select("id").single();
      if (jobError || !job) throw new Error("job_create_failed");

      await svc.from("outbound_campaign_recipients").update({ provider_job_id: job.id }).eq("id", recipient.id);
      const workerResponse = await fetch(`${U}/functions/v1/automation-worker`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-cloudsales-worker-token": String(workerToken),
        },
        body: JSON.stringify({ job_id: job.id }),
      });
      const workerData = await workerResponse.json().catch(() => ({}));
      if (!workerResponse.ok || workerData.error) throw new Error(workerData.error || `worker_${workerResponse.status}`);

      const messageId = String(workerData.output?.message?.messageId || workerData.output?.message?.id || workerData.result?.output?.message?.messageId || "");
      await svc.from("outbound_campaign_recipients").update({
        status: "sent",
        provider_message_id: messageId || null,
        error: null,
        metadata: { sent_at: new Date().toISOString(), channel: campaign.channel },
      }).eq("id", recipient.id);
      sent += 1;
      results.push({ recipient_id: recipient.id, status: "sent", job_id: job.id });
    } catch (error) {
      failed += 1;
      const message = String((error as Error).message || error);
      await svc.from("outbound_campaign_recipients").update({ status: "failed", error: message }).eq("id", recipient.id);
      results.push({ recipient_id: recipient.id, status: "failed", error: message });
    }
  }

  const { count: remaining } = await svc.from("outbound_campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .in("status", ["queued", "processing"]);
  const { count: sentTotal } = await svc.from("outbound_campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .in("status", ["sent", "delivered", "replied"]);
  const { count: failedTotal } = await svc.from("outbound_campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "failed");

  await svc.from("outbound_campaigns").update({
    status: remaining ? "queued" : "completed",
    sent_count: sentTotal || 0,
    failed_count: failedTotal || 0,
    provider_results: {
      ...(campaign.provider_results || {}),
      last_dispatch_at: new Date().toISOString(),
      last_batch: { sent, failed },
    },
  }).eq("id", campaignId);

  return json({
    ok: true,
    processed: (recipients || []).length,
    sent,
    failed,
    remaining: remaining || 0,
    completed: !remaining,
    results,
  }, 200, origin);
});
