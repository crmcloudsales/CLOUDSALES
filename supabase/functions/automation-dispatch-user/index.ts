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
    headers: { ...cors(origin), "content-type": "application/json", "cache-control": "no-store" },
  });
}

const WORKER_BY_PROVIDER: Record<string, string> = {
  highlevel: "automation-worker",
  hubspot: "crm-universal-command",
  pipedrive: "crm-universal-command",
  zoho: "crm-universal-command",
  salesforce: "crm-enterprise-command",
  microsoft_dynamics: "crm-enterprise-command",
  monday_crm: "crm-enterprise-command",
  freshsales: "crm-smb-command",
  close: "crm-smb-command",
  copper: "crm-smb-command",
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (origin && !ORIGINS.has(origin)) return json({ error: "origin_not_allowed" }, 403, origin);

  const auth = req.headers.get("authorization");
  if (!auth) return json({ error: "missing_authorization" }, 401, origin);

  const userClient = createClient(U, A, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) return json({ error: "invalid_session" }, 401, origin);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "invalid_json" }, 400, origin); }

  const organizationId = String(body.organization_id || "");
  const jobId = String(body.job_id || "");
  if (!organizationId || !jobId) return json({ error: "organization_and_job_required" }, 400, origin);

  const svc = createClient(U, S, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: membership } = await svc.from("organization_members")
    .select("role,status")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || membership.status !== "active" || !["owner", "admin", "operator"].includes(String(membership.role))) {
    return json({ error: "forbidden" }, 403, origin);
  }

  const { data: job } = await svc.from("automation_jobs")
    .select("id,organization_id,status,job_type,requires_approval,input")
    .eq("id", jobId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!job) return json({ error: "job_not_found" }, 404, origin);
  if (job.requires_approval && job.status === "waiting_approval") return json({ error: "approval_required" }, 409, origin);
  if (job.status !== "queued") return json({ ok: true, status: job.status, idempotent: true }, 200, origin);

  const connectionId = String(job.input?.connection_id || "");
  if (!connectionId) {
    return json({ error: "connection_id_required_for_crm_job", job_type: job.job_type }, 400, origin);
  }

  const { data: connection } = await svc.from("connections")
    .select("id,provider_key,status")
    .eq("id", connectionId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!connection || connection.status !== "connected") return json({ error: "connection_unavailable" }, 409, origin);

  const providerKey = String(connection.provider_key || "");
  const { data: capability } = await svc.from("provider_capabilities")
    .select("support_status,write_capable,requires_provider_review")
    .eq("provider_key", providerKey)
    .eq("capability_key", job.job_type)
    .maybeSingle();

  if (!capability || !["implemented", "beta"].includes(String(capability.support_status))) {
    return json({
      error: "capability_not_supported",
      provider_key: providerKey,
      capability_key: job.job_type,
      support_status: capability?.support_status || "unregistered",
    }, 409, origin);
  }

  const { data: route } = await svc.from("integration_provider_routes")
    .select("enabled,metadata")
    .eq("provider_key", providerKey)
    .eq("capability_key", job.job_type)
    .maybeSingle();
  if (route && route.enabled === false) return json({ error: "provider_route_disabled", provider_key: providerKey }, 409, origin);

  const worker = String(route?.metadata?.function_slug || WORKER_BY_PROVIDER[providerKey] || "");
  if (!worker) return json({ error: "adapter_not_implemented", provider_key: providerKey }, 409, origin);

  const { data: tokenSetting } = await svc.from("internal_settings")
    .select("secret_id")
    .eq("setting_key", "automation_worker_token")
    .maybeSingle();
  if (!tokenSetting?.secret_id) return json({ error: "worker_token_missing" }, 503, origin);
  const { data: token, error: tokenError } = await svc.rpc("service_read_secret", { p_secret_id: tokenSetting.secret_id });
  if (tokenError || !token) return json({ error: "worker_token_unavailable" }, 503, origin);

  const response = await fetch(`${U}/functions/v1/${worker}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cloudsales-worker-token": String(token),
    },
    body: JSON.stringify({ job_id: jobId }),
  });
  const result = await response.json().catch(() => ({}));

  await svc.from("audit_log").insert({
    organization_id: organizationId,
    actor_user_id: user.id,
    actor_type: "user",
    action: `crm.dispatch.${job.job_type}.${response.ok ? "succeeded" : "failed"}`,
    entity_type: "automation_job",
    entity_id: jobId,
    connection_id: connectionId,
    success: response.ok,
    context: { provider_key: providerKey, worker, worker_status: response.status },
  });

  if (!response.ok) return json({ error: result.error || "worker_failed", detail: result, provider_key: providerKey, worker }, response.status, origin);
  return json({ ok: true, job_id: jobId, job_type: job.job_type, provider_key: providerKey, worker, result }, 200, origin);
});
