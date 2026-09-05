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
const VIEWER_ACTIONS = new Set([
  "analytics.snapshot", "report.generate", "support.diagnose", "ecosystem.sync",
  "ads.meta.accounts", "ads.meta.sync",
]);
const META_MANAGE_ACTIONS = new Set([
  "ads.meta.account.select", "ads.meta.pause", "ads.meta.resume", "ads.meta.budget", "ads.meta.create_campaign",
]);
const META_ZERO_DECIMAL = new Set(["BIF","CLP","DJF","GNF","JPY","KMF","KRW","MGA","PYG","RWF","UGX","VND","VUV","XAF","XOF","XPF"]);

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
const numeric = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const now = () => new Date().toISOString();
const metaMinorFactor = (currency: string) => META_ZERO_DECIMAL.has(String(currency || "USD").toUpperCase()) ? 1 : 100;
const metaMajor = (value: any, currency: string) => {
  const n = numeric(value);
  return n === null ? null : n / metaMinorFactor(currency);
};
const metaMinor = (value: any, currency: string) => {
  const n = numeric(value);
  if (n === null || n <= 0) throw new Error("meta_budget_must_be_positive");
  return Math.round(n * metaMinorFactor(currency));
};
const metaLocalStatus = (value: any) => {
  const s = String(value || "").toUpperCase();
  if (s === "ACTIVE") return "active";
  if (s === "PAUSED") return "paused";
  if (["DELETED", "ARCHIVED"].includes(s)) return "archived";
  if (["COMPLETED", "ENDED"].includes(s)) return "completed";
  return "draft";
};
function metaGraphError(data: any, fallback = "meta_request_failed") {
  const e = data?.error || {};
  const message = text(e.message, 500) || fallback;
  const code = e.code ? `:${e.code}` : "";
  const sub = e.error_subcode ? `:${e.error_subcode}` : "";
  return `${fallback}${code}${sub}:${message}`;
}

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
      .update({ status: "running", started_at: now() })
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

    if (actorRole === "viewer" && (!VIEWER_ACTIONS.has(action) || (action === "support.diagnose" && input.create_case === true))) {
      return json({ error: "insufficient_role" }, 403, origin);
    }
    if (META_MANAGE_ACTIONS.has(action) && !["owner", "admin", "operator"].includes(actorRole)) {
      return json({ error: "insufficient_role" }, 403, origin);
    }
    if (["ads.meta.account.select", "ads.meta.budget", "ads.meta.create_campaign"].includes(action) && !["owner", "admin"].includes(actorRole)) {
      return json({ error: "owner_or_admin_required" }, 403, origin);
    }
  }

  async function finish(status: "succeeded" | "failed", output: any, error: string | null = null) {
    if (internal && jobId) {
      await svc.from("automation_jobs")
        .update({ status, output: output || null, error, finished_at: now() })
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

  async function metaConnection() {
    const { data: connection } = await svc.from("connections")
      .select("id,status,external_account_id,external_account_name,scopes,metadata,last_sync_at")
      .eq("organization_id", organizationId)
      .eq("provider_key", "meta")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();
    if (!connection) throw new Error("meta_connection_required");
    const { data: secret } = await svc.from("connection_secrets")
      .select("access_token_secret_id")
      .eq("connection_id", connection.id)
      .maybeSingle();
    if (!secret?.access_token_secret_id) throw new Error("meta_access_token_missing");
    const { data: token } = await svc.rpc("service_read_secret", { p_secret_id: secret.access_token_secret_id });
    if (!token) throw new Error("meta_access_token_unavailable");
    return { connection, token: String(token), version: String(connection.metadata?.graph_api_version || "v24.0") };
  }

  async function graph(version: string, token: string, path: string, method = "GET", params: Record<string, any> = {}) {
    const url = new URL(`https://graph.facebook.com/${version}/${String(path).replace(/^\/+/, "")}`);
    const values = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      values.set(key, typeof value === "string" ? value : JSON.stringify(value));
    }
    if (method === "GET") url.search = values.toString();
    const response = await fetch(url.toString(), {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...(method === "GET" ? {} : { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" }) },
      body: method === "GET" ? undefined : values.toString(),
    });
    const raw = await response.text();
    let data: any = {};
    try { data = JSON.parse(raw); } catch { data = { raw: raw.slice(0, 800) }; }
    if (!response.ok || data?.error) throw new Error(metaGraphError(data));
    return data;
  }

  async function metaAccountsState() {
    const state = await metaConnection();
    const data = await graph(state.version, state.token, "me/adaccounts", "GET", {
      fields: "id,name,account_status,currency,timezone_name,business,amount_spent",
      limit: 100,
    });
    const accounts = Array.isArray(data?.data) ? data.data.map((x: any) => ({
      id: String(x.id || ""), name: text(x.name, 200), account_status: x.account_status ?? null,
      currency: String(x.currency || "USD"), timezone_name: text(x.timezone_name, 120),
      business: x.business ? { id: x.business.id || null, name: text(x.business.name, 200) } : null,
      amount_spent: x.amount_spent ?? null,
    })).filter((x: any) => x.id.startsWith("act_")) : [];
    const selected = String(state.connection.metadata?.selected_ad_account_id || "");
    return { ...state, accounts, selected_ad_account_id: accounts.some((x: any) => x.id === selected) ? selected : null };
  }

  async function requireMetaAccount(requested?: string) {
    const state = await metaAccountsState();
    const wanted = String(requested || state.selected_ad_account_id || "");
    if (!wanted) {
      if (state.accounts.length === 1) return { ...state, account: state.accounts[0] };
      throw new Error("meta_ad_account_selection_required");
    }
    const account = state.accounts.find((x: any) => x.id === wanted);
    if (!account) throw new Error("meta_ad_account_not_authorized");
    return { ...state, account };
  }

  async function discoverMetaBudget(state: any, campaign: any) {
    const currency = String(state.account.currency || "USD");
    if (campaign.daily_budget != null || campaign.lifetime_budget != null) {
      return {
        scope: "campaign", object_id: campaign.id,
        daily_budget: metaMajor(campaign.daily_budget, currency),
        lifetime_budget: metaMajor(campaign.lifetime_budget, currency),
        adsets: [],
      };
    }
    const data = await graph(state.version, state.token, `${campaign.id}/adsets`, "GET", {
      fields: "id,name,status,effective_status,daily_budget,lifetime_budget",
      limit: 100,
    });
    const adsets = (data?.data || []).map((x: any) => ({
      id: x.id, name: text(x.name, 200), status: x.status, effective_status: x.effective_status,
      daily_budget: metaMajor(x.daily_budget, currency), lifetime_budget: metaMajor(x.lifetime_budget, currency),
    }));
    const budgeted = adsets.filter((x: any) => x.daily_budget != null || x.lifetime_budget != null);
    if (budgeted.length === 1) return { scope: "adset", object_id: budgeted[0].id, daily_budget: budgeted[0].daily_budget, lifetime_budget: budgeted[0].lifetime_budget, adsets };
    if (budgeted.length > 1) return { scope: "multiple_adsets", object_id: null, daily_budget: null, lifetime_budget: null, adsets };
    return { scope: "none", object_id: null, daily_budget: null, lifetime_budget: null, adsets };
  }

  async function syncMetaCampaignRow(state: any, campaign: any, budget: any, insight: any = null) {
    const currency = String(state.account.currency || "USD");
    const actions = Array.isArray(insight?.actions) ? insight.actions : [];
    const leads = actions.reduce((sum: number, a: any) => /lead/i.test(String(a.action_type || "")) ? sum + (Number(a.value) || 0) : sum, 0);
    const existing = await svc.from("marketing_campaigns")
      .select("id,qualified_leads,revenue,metadata")
      .eq("organization_id", organizationId).eq("provider_key", "meta").eq("external_campaign_id", String(campaign.id)).maybeSingle();
    const metadata = {
      ...(existing.data?.metadata || {}),
      meta_effective_status: campaign.effective_status || null,
      meta_buying_type: campaign.buying_type || null,
      meta_budget_scope: budget.scope,
      meta_budget_object_id: budget.object_id,
      meta_adsets: budget.adsets || [],
      meta_account_id: state.account.id,
      meta_account_name: state.account.name,
      provider_confirmed_at: now(),
    };
    const row: any = {
      organization_id: organizationId, provider_key: "meta", external_campaign_id: String(campaign.id),
      name: text(campaign.name, 180) || `Meta ${campaign.id}`, objective: text(campaign.objective, 180),
      status: metaLocalStatus(campaign.status || campaign.effective_status),
      daily_budget: budget.daily_budget, lifetime_budget: budget.lifetime_budget, currency,
      spend: numeric(insight?.spend) ?? 0, leads: Math.max(0, Math.round(leads)),
      last_sync_at: now(), metadata, updated_at: now(),
    };
    if (existing.data?.id) {
      const { data, error } = await svc.from("marketing_campaigns").update(row).eq("id", existing.data.id).select("*").single();
      if (error) throw new Error("meta_campaign_local_sync_failed");
      return data;
    }
    row.qualified_leads = 0; row.revenue = 0; row.created_by = actorUserId;
    const { data, error } = await svc.from("marketing_campaigns").insert(row).select("*").single();
    if (error) throw new Error("meta_campaign_local_insert_failed");
    return data;
  }

  async function metaCampaignByLocal(id: string) {
    const { data } = await svc.from("marketing_campaigns")
      .select("*").eq("id", id).eq("organization_id", organizationId).eq("provider_key", "meta").maybeSingle();
    if (!data) throw new Error("meta_campaign_not_found");
    if (!data.external_campaign_id) throw new Error("meta_campaign_not_linked");
    return data;
  }

  let output: any;
  try {
    if (action === "analytics.snapshot") {
      output = await snapshot();
    } else if (action === "report.generate") {
      const state = await snapshot();
      const failed = (state.recent_jobs || []).filter((x: any) => x.status === "failed");
      output = {
        generated_at: now(),
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
      if (!state.subscription || !["active"].includes(state.subscription.status)) {
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
        .update({ status: "paused", updated_at: now() })
        .eq("id", id)
        .eq("organization_id", organizationId)
        .select("id,name,status")
        .maybeSingle();
      if (!agent) throw new Error("agent_not_found");
      output = { agent };
    } else if (action === "agent.update") {
      const id = String(input.agent_id || input.id || "");
      if (!id) throw new Error("agent_id_required");
      const patch: any = { updated_at: now() };
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
    } else if (action === "ads.meta.accounts") {
      const state = await metaAccountsState();
      output = {
        connected: true,
        scopes: state.connection.scopes || [],
        selected_ad_account_id: state.selected_ad_account_id,
        accounts: state.accounts,
        graph_api_version: state.version,
      };
    } else if (action === "ads.meta.account.select") {
      const state = await requireMetaAccount(String(input.account_id || ""));
      const metadata = { ...(state.connection.metadata || {}), selected_ad_account_id: state.account.id, selected_ad_account_name: state.account.name, selected_ad_account_currency: state.account.currency, ad_account_selected_at: now() };
      const { error } = await svc.from("connections").update({ metadata, last_sync_at: now() }).eq("id", state.connection.id);
      if (error) throw new Error("meta_ad_account_selection_save_failed");
      output = { selected: state.account };
    } else if (action === "ads.meta.sync") {
      const state = await requireMetaAccount(String(input.account_id || ""));
      const data = await graph(state.version, state.token, `${state.account.id}/campaigns`, "GET", {
        fields: "id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,buying_type,created_time,updated_time",
        limit: Math.min(200, Math.max(1, Number(input.limit || 100))),
      });
      const synced: any[] = [];
      for (const campaign of (data?.data || [])) {
        const budget = await discoverMetaBudget(state, campaign);
        let insight: any = null;
        try {
          const insightData = await graph(state.version, state.token, `${campaign.id}/insights`, "GET", { fields: "spend,actions", date_preset: "last_30d", limit: 1 });
          insight = insightData?.data?.[0] || null;
        } catch { insight = null; }
        synced.push(await syncMetaCampaignRow(state, campaign, budget, insight));
      }
      const metadata = { ...(state.connection.metadata || {}), selected_ad_account_id: state.account.id, selected_ad_account_name: state.account.name, selected_ad_account_currency: state.account.currency, meta_campaigns_last_sync_at: now() };
      await svc.from("connections").update({ metadata, last_sync_at: now() }).eq("id", state.connection.id);
      output = { account: state.account, campaigns: synced, count: synced.length, synced_at: now() };
    } else if (action === "ads.meta.pause" || action === "ads.meta.resume") {
      const local = await metaCampaignByLocal(String(input.id || input.campaign_id || ""));
      const state = await requireMetaAccount(String(local.metadata?.meta_account_id || input.account_id || ""));
      const requested = action === "ads.meta.pause" ? "PAUSED" : "ACTIVE";
      await graph(state.version, state.token, String(local.external_campaign_id), "POST", { status: requested });
      const confirmed = await graph(state.version, state.token, String(local.external_campaign_id), "GET", { fields: "id,name,status,effective_status,objective,daily_budget,lifetime_budget,buying_type,updated_time" });
      const budget = await discoverMetaBudget(state, confirmed);
      const row = await syncMetaCampaignRow(state, confirmed, budget, null);
      if (String(confirmed.status || "").toUpperCase() !== requested) throw new Error("meta_status_confirmation_failed");
      output = { campaign: row, provider_status: confirmed.status, confirmed: true, confirmed_at: now() };
    } else if (action === "ads.meta.budget") {
      const local = await metaCampaignByLocal(String(input.id || input.campaign_id || ""));
      const state = await requireMetaAccount(String(local.metadata?.meta_account_id || input.account_id || ""));
      const campaign = await graph(state.version, state.token, String(local.external_campaign_id), "GET", { fields: "id,name,status,effective_status,objective,daily_budget,lifetime_budget,buying_type" });
      const discovered = await discoverMetaBudget(state, campaign);
      const objectId = String(input.budget_object_id || discovered.object_id || "");
      const scope = input.budget_object_id ? "adset" : discovered.scope;
      if (!objectId) {
        if (discovered.scope === "multiple_adsets") throw new Error("meta_budget_multiple_adsets_requires_scope");
        throw new Error("meta_budget_object_not_found");
      }
      const currency = String(state.account.currency || local.currency || "USD");
      const params: any = {};
      if (input.daily_budget !== undefined) params.daily_budget = metaMinor(input.daily_budget, currency);
      if (input.lifetime_budget !== undefined) params.lifetime_budget = metaMinor(input.lifetime_budget, currency);
      if (!Object.keys(params).length) throw new Error("meta_budget_value_required");
      await graph(state.version, state.token, objectId, "POST", params);
      const confirmedObject = await graph(state.version, state.token, objectId, "GET", { fields: "id,name,daily_budget,lifetime_budget,status,effective_status" });
      if (params.daily_budget !== undefined && Number(confirmedObject.daily_budget) !== Number(params.daily_budget)) throw new Error("meta_daily_budget_confirmation_failed");
      if (params.lifetime_budget !== undefined && Number(confirmedObject.lifetime_budget) !== Number(params.lifetime_budget)) throw new Error("meta_lifetime_budget_confirmation_failed");
      const metadata = {
        ...(local.metadata || {}), meta_budget_scope: scope, meta_budget_object_id: objectId,
        budget_sync_status: "confirmed", budget_provider_confirmed_at: now(),
      };
      const patch: any = { metadata, last_sync_at: now(), updated_at: now() };
      if (confirmedObject.daily_budget != null) patch.daily_budget = metaMajor(confirmedObject.daily_budget, currency);
      if (confirmedObject.lifetime_budget != null) patch.lifetime_budget = metaMajor(confirmedObject.lifetime_budget, currency);
      const { data: updated, error } = await svc.from("marketing_campaigns").update(patch).eq("id", local.id).select("*").single();
      if (error) throw new Error("meta_budget_local_confirmation_save_failed");
      output = { campaign: updated, provider: { object_id: objectId, scope, daily_budget: patch.daily_budget ?? null, lifetime_budget: patch.lifetime_budget ?? null, currency }, confirmed: true, confirmed_at: now() };
    } else if (action === "ads.meta.create_campaign") {
      const state = await requireMetaAccount(String(input.account_id || ""));
      const localId = String(input.local_campaign_id || input.id || "");
      let local: any = null;
      if (localId) {
        const result = await svc.from("marketing_campaigns").select("*").eq("id", localId).eq("organization_id", organizationId).maybeSingle();
        local = result.data;
        if (!local) throw new Error("campaign_not_found");
        if (local.external_campaign_id) throw new Error("campaign_already_linked_to_provider");
      }
      const name = text(input.name || local?.name, 180);
      if (!name) throw new Error("campaign_name_required");
      const requestedObjective = String(input.objective || local?.objective || "OUTCOME_LEADS").toUpperCase();
      const objective = ["OUTCOME_LEADS","OUTCOME_SALES","OUTCOME_TRAFFIC","OUTCOME_ENGAGEMENT","OUTCOME_AWARENESS","OUTCOME_APP_PROMOTION"].includes(requestedObjective) ? requestedObjective : "OUTCOME_LEADS";
      const created = await graph(state.version, state.token, `${state.account.id}/campaigns`, "POST", {
        name, objective, status: "PAUSED", buying_type: "AUCTION", special_ad_categories: [],
      });
      if (!created?.id) throw new Error("meta_campaign_create_missing_id");
      const confirmed = await graph(state.version, state.token, String(created.id), "GET", { fields: "id,name,status,effective_status,objective,daily_budget,lifetime_budget,buying_type,created_time,updated_time" });
      const budget = await discoverMetaBudget(state, confirmed);
      let row: any;
      if (local) {
        const metadata = { ...(local.metadata || {}), meta_account_id: state.account.id, meta_account_name: state.account.name, provider_confirmed_at: now(), provider_creation_mode: "paused_container_only", meta_budget_scope: budget.scope, meta_budget_object_id: budget.object_id };
        const { data, error } = await svc.from("marketing_campaigns").update({ external_campaign_id: String(created.id), name: confirmed.name || name, objective: confirmed.objective || objective, status: "paused", currency: state.account.currency, last_sync_at: now(), metadata, updated_at: now() }).eq("id", local.id).select("*").single();
        if (error) throw new Error("meta_campaign_link_local_failed");
        row = data;
      } else {
        row = await syncMetaCampaignRow(state, confirmed, budget, null);
      }
      output = { campaign: row, provider_campaign: { id: confirmed.id, name: confirmed.name, status: confirmed.status, objective: confirmed.objective }, confirmed: String(confirmed.status).toUpperCase() === "PAUSED", publish_state: "paused_container_only", next_required: ["adset", "creative", "ad"] };
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
      context: action.startsWith("ads.meta.") ? { provider: "meta", confirmed: Boolean(output?.confirmed), account_id: output?.account?.id || output?.provider?.account_id || null } : {},
    });
    return json({ ok: true, action, output, job_id: jobId }, 200, origin);
  } catch (e) {
    const message = String((e as Error).message || "core_command_failed").slice(0, 900);
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