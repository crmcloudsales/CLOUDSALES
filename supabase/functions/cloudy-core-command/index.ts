import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U = Deno.env.get("SUPABASE_URL")!;
const A = Deno.env.get("SUPABASE_ANON_KEY")!;
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORIGINS = new Set([
  "https://cloudsales.app",
  "https://www.cloudsales.app",
  "https://app.cloudsales.app",
  "http://localhost:3000",
  "http://localhost:5173",
]);
const VIEWER_ACTIONS = new Set(["analytics.snapshot", "report.generate", "support.diagnose", "ecosystem.sync"]);

function cors(origin: string | null) {
  const allowed = origin && ORIGINS.has(origin) ? origin : "https://app.cloudsales.app";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info,x-cloudsales-worker-token",
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
    },
  });
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function same(a: string, b: string) {
  if (!a || !b) return false;
  const [x, y] = await Promise.all([hash(a), hash(b)]);
  if (x.length !== y.length) return false;
  let result = 0;
  for (let i = 0; i < x.length; i++) result |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return result === 0;
}

const text = (value: any, max = 4000) => String(value ?? "").trim().slice(0, max);

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (origin && !ORIGINS.has(origin)) return json({ error: "origin_not_allowed" }, 403, origin);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, origin);
  }

  const svc = createClient(U, S, { auth: { persistSession: false, autoRefreshToken: false } });
  let organizationId = "";
  let action = "";
  let input: any = {};
  let actorUserId: string | null = null;
  let actorRole: string | null = null;
  let jobId: string | null = null;
  let internal = false;

  const workerToken = req.headers.get("x-cloudsales-worker-token") || "";
  if (workerToken) {
    const { data: setting } = await svc
      .from("internal_settings")
      .select("secret_id")
      .eq("setting_key", "automation_worker_token")
      .maybeSingle();
    if (!setting?.secret_id) return json({ error: "worker_not_configured" }, 503, origin);

    const { data: expected } = await svc.rpc("service_read_secret", { p_secret_id: setting.secret_id });
    if (!expected || !(await same(workerToken, String(expected)))) return json({ error: "forbidden" }, 403, origin);

    jobId = String(body.job_id || "");
    if (!jobId) return json({ error: "job_id_required" }, 400, origin);

    const { data: job } = await svc
      .from("automation_jobs")
      .select("id,organization_id,job_type,status,requested_by,input")
      .eq("id", jobId)
      .maybeSingle();
    if (!job) return json({ error: "job_not_found" }, 404, origin);
    if (job.status !== "queued") return json({ ok: true, status: job.status, idempotent: true });

    const { data: locked } = await svc
      .from("automation_jobs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    if (!locked) return json({ ok: true, status: "already_claimed", idempotent: true });

    internal = true;
    organizationId = job.organization_id;
    action = job.job_type;
    input = job.input || {};
    actorUserId = job.requested_by || null;
  } else {
    const authorization = req.headers.get("authorization");
    if (!authorization) return json({ error: "missing_authorization" }, 401, origin);

    const userClient = createClient(U, A, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: "invalid_session" }, 401, origin);

    organizationId = String(body.organization_id || "");
    action = String(body.action || "");
    input = body.input && typeof body.input === "object" ? body.input : {};
    if (!organizationId || !action) return json({ error: "missing_required_fields" }, 400, origin);

    const { data: membership } = await svc
      .from("organization_members")
      .select("role,status")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership || membership.status !== "active" || !["owner", "admin", "operator", "viewer"].includes(String(membership.role))) {
      return json({ error: "forbidden" }, 403, origin);
    }

    actorRole = String(membership.role);
    actorUserId = user.id;

    // Viewers are read-only by default. support.diagnose is read-only only
    // when it does not create a support case. Future actions are denied to
    // viewers unless explicitly added to VIEWER_ACTIONS.
    if (actorRole === "viewer" && (!VIEWER_ACTIONS.has(action) || (action === "support.diagnose" && input.create_case === true))) {
      return json({ error: "insufficient_role" }, 403, origin);
    }
  }

  async function finish(status: "succeeded" | "failed", output: any, error: string | null = null) {
    if (internal && jobId) {
      await svc.from("automation_jobs")
        .update({ status, output: output || null, error, finished_at: new Date().toISOString() })
        .eq("id", jobId);
    }
  }

  async function snapshot() {
    const [summary, connections, agents, subscription, jobs, health] = await Promise.all([
      svc.from("organization_dashboard_summary").select("*").eq("organization_id", organizationId).maybeSingle(),
      svc.from("connections").select("id,provider_key,status,external_account_name,expires_at,last_sync_at").eq("organization_id", organizationId),
      svc.from("cloudy_agents").select("id,name,template_key,status,autonomy_mode,channels,voice_key,updated_at").eq("organization_id", organizationId),
      svc.from("subscriptions").select("plan_key,status,current_period_end,cancel_at_period_end").eq("organization_id", organizationId).maybeSingle(),
      svc.from("automation_jobs").select("id,job_type,status,error,created_at,finished_at,input").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(25),
      svc.from("connection_health_checks").select("connection_id,status,latency_ms,error,checked_at").eq("organization_id", organizationId).order("checked_at", { ascending: false }).limit(25),
    ]);
    return {
      metrics: summary.data || null,
      connections: connections.data || [],
      agents: agents.data || [],
      subscription: subscription.data || null,
      recent_jobs: jobs.data || [],
      connection_health: health.data || [],
    };
  }

  let output: any;
  try {
    if (action === "analytics.snapshot") {
      output = await snapshot();
    } else if (action === "report.generate") {
      const state = await snapshot();
      const failed = (state.recent_jobs || []).filter((x: any) => x.status === "failed");
      output = {
        generated_at: new Date().toISOString(),
        headline: {
          lead_attempts_30d: state.metrics?.lead_attempts_30d || 0,
          accepted_30d: state.metrics?.leads_accepted_30d || 0,
          rejected_30d: state.metrics?.leads_rejected_30d || 0,
          avg_quality_score_30d: state.metrics?.avg_quality_score_30d || 0,
          appointments_30d: state.metrics?.appointments_30d || 0,
          won_30d: state.metrics?.won_30d || 0,
        },
        systems: {
          connected: (state.connections || []).filter((x: any) => x.status === "connected").length,
          agents_active: (state.agents || []).filter((x: any) => x.status === "active").length,
          subscription: state.subscription || null,
        },
        attention: {
          failed_jobs: failed.slice(0, 10),
          unhealthy_connections: (state.connection_health || []).filter((x: any) => x.status !== "healthy").slice(0, 10),
        },
      };
    } else if (action === "support.diagnose") {
      const state = await snapshot();
      const issues: any[] = [];
      for (const connection of state.connections || []) {
        if (connection.status !== "connected") {
          issues.push({ type: "connection", provider_key: connection.provider_key, severity: "high", message: `Connection status is ${connection.status}` });
        } else if (connection.expires_at && new Date(connection.expires_at).getTime() < Date.now()) {
          issues.push({ type: "connection", provider_key: connection.provider_key, severity: "high", message: "Access token is expired" });
        }
      }
      for (const job of (state.recent_jobs || []).filter((x: any) => x.status === "failed").slice(0, 8)) {
        issues.push({ type: "automation", job_id: job.id, job_type: job.job_type, severity: "normal", message: job.error || "Automation failed" });
      }
      for (const check of (state.connection_health || []).filter((x: any) => x.status !== "healthy").slice(0, 8)) {
        issues.push({ type: "health", connection_id: check.connection_id, severity: "normal", message: check.error || `Health status ${check.status}` });
      }
      if (!state.subscription || !["active", "trialing"].includes(state.subscription.status)) {
        issues.push({ type: "billing", severity: "normal", message: `Subscription status: ${state.subscription?.status || "missing"}` });
      }

      let supportCase: any = null;
      if (input.create_case === true && issues.length) {
        const severity = issues.some((x) => x.severity === "high") ? "high" : "normal";
        const { data } = await svc.from("cloudy_support_cases").insert({
          organization_id: organizationId,
          session_id: input.session_id || null,
          created_by: actorUserId,
          status: "open",
          severity,
          category: "diagnostic",
          title: text(input.title, 160) || "Cloudy automatic diagnostic",
          summary: text(input.summary, 1000) || `${issues.length} issue(s) detected`,
          metadata: { issues },
        }).select("id,status,severity,title,created_at").single();
        supportCase = data;
      }
      output = { healthy: issues.length === 0, issues, snapshot: state, support_case: supportCase };
    } else if (action === "agent.create") {
      const templateKey = text(input.template_key, 100);
      const name = text(input.name, 120);
      if (!templateKey || !name) throw new Error("template_key_and_name_required");
      const { data: template } = await svc.from("cloudy_agent_templates").select("*").eq("template_key", templateKey).eq("active", true).maybeSingle();
      if (!template) throw new Error("template_not_found");
      const { data: agent, error } = await svc.from("cloudy_agents").insert({
        organization_id: organizationId,
        name,
        template_key: templateKey,
        status: input.activate === true ? "active" : "draft",
        autonomy_mode: ["assist", "guarded", "autonomous"].includes(String(input.autonomy_mode)) ? String(input.autonomy_mode) : "guarded",
        channels: Array.isArray(input.channels) && input.channels.length ? input.channels : template.channels,
        capabilities: Array.isArray(input.capabilities) && input.capabilities.length ? input.capabilities : template.capabilities,
        voice_key: input.voice_key || template.default_voice_key,
        provider_preferences: input.provider_preferences || {},
        system_instructions: text(input.system_instructions, 8000) || template.system_instructions,
        config: { ...(template.config || {}), ...(input.config || {}) },
        created_by: actorUserId,
      }).select("id,name,template_key,status,autonomy_mode,channels,capabilities,voice_key").single();
      if (error || !agent) throw new Error("agent_create_failed");
      output = { agent };
    } else if (action === "agent.pause") {
      const id = String(input.agent_id || input.id || "");
      if (!id) throw new Error("agent_id_required");
      const { data: agent } = await svc.from("cloudy_agents")
        .update({ status: "paused", updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("organization_id", organizationId)
        .select("id,name,status")
        .maybeSingle();
      if (!agent) throw new Error("agent_not_found");
      output = { agent };
    } else if (action === "agent.update") {
      const id = String(input.agent_id || input.id || "");
      if (!id) throw new Error("agent_id_required");
      const patch: any = { updated_at: new Date().toISOString() };
      if (input.name !== undefined) patch.name = text(input.name, 120);
      if (input.voice_key !== undefined) patch.voice_key = input.voice_key || null;
      if (input.autonomy_mode !== undefined && ["assist", "guarded", "autonomous"].includes(String(input.autonomy_mode))) patch.autonomy_mode = String(input.autonomy_mode);
      if (Array.isArray(input.channels)) patch.channels = input.channels;
      if (Array.isArray(input.capabilities)) patch.capabilities = input.capabilities;
      if (input.system_instructions !== undefined) patch.system_instructions = text(input.system_instructions, 8000);
      const { data: agent } = await svc.from("cloudy_agents")
        .update(patch)
        .eq("id", id)
        .eq("organization_id", organizationId)
        .select("id,name,status,autonomy_mode,channels,capabilities,voice_key")
        .maybeSingle();
      if (!agent) throw new Error("agent_not_found");
      output = { agent };
    } else if (action === "ecosystem.sync") {
      const state = await snapshot();
      output = {
        connections: (state.connections || []).map((x: any) => ({ provider_key: x.provider_key, status: x.status, last_sync_at: x.last_sync_at })),
        message: "Current ecosystem state inspected. Provider-specific sync jobs are only launched by implemented adapters.",
      };
    } else {
      throw new Error("unsupported_action");
    }

    await finish("succeeded", output);
    await svc.from("audit_log").insert({
      organization_id: organizationId,
      actor_user_id: actorUserId,
      actor_type: internal ? "worker" : "user",
      action: `cloudy.core.${action}.succeeded`,
      entity_type: internal ? "automation_job" : "organization",
      entity_id: internal ? jobId : organizationId,
      success: true,
    });
    return json({ ok: true, action, output, job_id: jobId }, 200, origin);
  } catch (e) {
    const message = String((e as Error).message || "core_command_failed");
    await finish("failed", null, message);
    await svc.from("audit_log").insert({
      organization_id: organizationId,
      actor_user_id: actorUserId,
      actor_type: internal ? "worker" : "user",
      action: `cloudy.core.${action}.failed`,
      entity_type: internal ? "automation_job" : "organization",
      entity_id: internal ? jobId : organizationId,
      success: false,
      context: { error: message },
    });
    return json({ error: message, job_id: jobId }, 500, origin);
  }
});
