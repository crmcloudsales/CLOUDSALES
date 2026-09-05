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
const LOCALES = new Set(["en", "es", "fr", "pt", "it", "de", "ar"]);
const CORE = new Set([
  "analytics.snapshot",
  "report.generate",
  "support.diagnose",
  "agent.create",
  "agent.update",
  "agent.pause",
  "ecosystem.sync",
]);
const VIEWER_CORE = new Set([
  "analytics.snapshot",
  "report.generate",
  "support.diagnose",
  "ecosystem.sync",
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
      "content-type": "application/json;charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

const safe = (value: any, max = 10000) => String(value ?? "").trim().slice(0, max);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function fallback(locale: string, kind: string, data: any) {
  const es = locale === "es";
  if (kind === "status") {
    return es
      ? `En 30 días veo ${data.a} intentos de lead, ${data.ok} aceptados, ${data.no} bloqueados y calidad promedio ${data.q}.`
      : `In 30 days I see ${data.a} lead attempts, ${data.ok} accepted, ${data.no} blocked, and average quality ${data.q}.`;
  }
  if (kind === "connections") {
    return es
      ? `Tienes ${data.c} conexiones activas: ${data.names || "ninguna"}.`
      : `You have ${data.c} active connections: ${data.names || "none"}.`;
  }
  if (kind === "agents") {
    return es
      ? `Tienes ${data.agents} AgentCloud creados y ${data.templates} plantillas listas.`
      : `You have ${data.agents} AgentCloud agents and ${data.templates} ready templates.`;
  }
  return es
    ? "Cloudy está conectado a tu workspace. Dime el resultado que quieres obtener y trabajaré con tus datos y herramientas autorizadas."
    : "Cloudy is connected to your workspace. Tell me the outcome you want and I will work with your authorized data and tools.";
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
  const message = safe(body.message, 5000);
  const locale = LOCALES.has(String(body.locale)) ? String(body.locale) : "en";
  const agentId = body.agent_id ? String(body.agent_id) : null;
  let sessionId = body.session_id ? String(body.session_id) : "";
  if (!organizationId || !message) return json({ error: "organization_id_and_message_required" }, 400, origin);

  const svc = createClient(U, S, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: member } = await svc.from("organization_members")
    .select("role,status")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();
  const role = String(member?.role || "");
  if (!member || member.status !== "active" || !["owner", "admin", "operator", "viewer"].includes(role)) {
    return json({ error: "forbidden" }, 403, origin);
  }

  const { data: rateAllowed } = await svc.rpc("consume_rate_limit", {
    p_bucket_key: `cloudy:${organizationId}:${user.id}`,
    p_limit: 120,
    p_window_seconds: 600,
  });
  if (rateAllowed !== true) return json({ error: "rate_limited" }, 429, origin);

  if (sessionId) {
    const { data: session } = await svc.from("cloudy_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!session) return json({ error: "invalid_session_id" }, 404, origin);
  } else {
    const { data: session, error } = await svc.from("cloudy_sessions").insert({
      organization_id: organizationId,
      user_id: user.id,
      locale,
      title: message.slice(0, 70),
      context: { orchestrator: "v3", role },
    }).select("id").single();
    if (error || !session) return json({ error: "session_create_failed" }, 500, origin);
    sessionId = session.id;
  }

  await svc.from("cloudy_messages").insert({
    session_id: sessionId,
    organization_id: organizationId,
    role: "user",
    content: message,
    payload: { locale, agent_id: agentId },
  });

  const [summaryResult, connectionsResult, actionsResult, templatesResult, agentsResult, runtimeResult, accountResult, subscriptionResult] = await Promise.all([
    svc.from("organization_dashboard_summary")
      .select("lead_attempts_30d,leads_accepted_30d,leads_rejected_30d,avg_quality_score_30d,appointments_30d,won_30d,connected_providers")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    svc.from("connections")
      .select("id,provider_key,status,external_account_name,last_sync_at,metadata")
      .eq("organization_id", organizationId)
      .eq("status", "connected"),
    svc.from("cloudy_action_catalog")
      .select("action_key,risk_level,requires_approval,enabled,description")
      .eq("enabled", true),
    svc.from("cloudy_agent_templates").select("template_key,display_name").eq("active", true),
    svc.from("cloudy_agents")
      .select("id,name,template_key,status,autonomy_mode,capabilities,voice_key,system_instructions,config")
      .eq("organization_id", organizationId),
    svc.from("internal_settings").select("value").eq("setting_key", "cloudy_ai_runtime").maybeSingle(),
    svc.from("internal_settings").select("value").eq("setting_key", "cloudflare_cloudsales_account").maybeSingle(),
    svc.from("subscriptions")
      .select("plan_key,status,current_period_end")
      .eq("organization_id", organizationId)
      .eq("brand_key", "cloudsales")
      .maybeSingle(),
  ]);

  const summary: any = summaryResult.data || {};
  const connections: any[] = connectionsResult.data || [];
  const actions: any[] = actionsResult.data || [];
  const agents: any[] = agentsResult.data || [];
  const selectedAgent = agentId ? agents.find((x: any) => x.id === agentId) : null;
  if (agentId && !selectedAgent) return json({ error: "agent_not_found" }, 404, origin);

  const subscription: any = subscriptionResult.data || null;
  let aiEntitled = Boolean(subscription && ["active"].includes(String(subscription.status)));
  if (aiEntitled && subscription.current_period_end && new Date(subscription.current_period_end).getTime() < Date.now()) aiEntitled = false;
  if (aiEntitled) {
    const { data: plan } = await svc.from("subscription_plans")
      .select("active,features")
      .eq("plan_key", subscription.plan_key)
      .maybeSingle();
    aiEntitled = Boolean(plan?.active && plan.features?.cloudy === true);
  }

  const actionMap = new Map(actions.map((x: any) => [x.action_key, x]));
  const connectionMap = new Map(connections.map((x: any) => [x.provider_key, x]));
  const providerKeys = connections.map((x: any) => x.provider_key);
  let capabilities: any[] = [];
  if (providerKeys.length) {
    const { data } = await svc.from("provider_capabilities")
      .select("provider_key,capability_key,support_status,write_capable,requires_provider_review,notes")
      .in("provider_key", providerKeys)
      .in("support_status", ["implemented", "beta"]);
    capabilities = data || [];
  }

  const supported = capabilities.filter((capability: any) =>
    actionMap.has(capability.capability_key) &&
    connectionMap.has(capability.provider_key) &&
    (role !== "viewer" || capability.write_capable !== true)
  );
  const coreActions = actions.filter((action: any) =>
    CORE.has(action.action_key) && (role !== "viewer" || VIEWER_CORE.has(action.action_key))
  );

  const lower = message.toLowerCase();
  const kind = /lead|quality|calidad|junk|status|estado/.test(lower)
    ? "status"
    : /connect|integr|crm|conex/.test(lower)
      ? "connections"
      : /agent|agente/.test(lower)
        ? "agents"
        : "general";

  const fallbackData = {
    a: summary.lead_attempts_30d || 0,
    ok: summary.leads_accepted_30d || 0,
    no: summary.leads_rejected_30d || 0,
    q: Number(summary.avg_quality_score_30d || 0).toFixed(0),
    c: connections.length,
    names: connections.map((x: any) => x.external_account_name || x.provider_key).join(", "),
    agents: agents.length,
    templates: (templatesResult.data || []).length,
  };

  let tokenSetting: any = null;
  if (aiEntitled) {
    for (const key of ["cloudflare_ai_gateway_token_cloudsales", "cloudflare_api_token_cloudsales"]) {
      const { data } = await svc.from("internal_settings").select("secret_id").eq("setting_key", key).maybeSingle();
      if (data?.secret_id) { tokenSetting = data; break; }
    }
  }

  if (!tokenSetting?.secret_id) {
    const reply = fallback(locale, kind, fallbackData);
    await svc.from("cloudy_messages").insert({
      session_id: sessionId,
      organization_id: organizationId,
      role: "assistant",
      content: reply,
      payload: { engine: "cloudy_core_v3", ai_ready: false, ai_entitled: aiEntitled, role },
    });
    return json({
      session_id: sessionId,
      reply,
      ai_ready: false,
      ai_entitled: aiEntitled,
      engine: "cloudy_core_v3",
      metrics: summary,
      connections,
      agents: agents.map((x: any) => ({ id: x.id, name: x.name, status: x.status })),
    }, 200, origin);
  }

  const { data: token } = await svc.rpc("service_read_secret", { p_secret_id: tokenSetting.secret_id });
  const accountId = String(accountResult.data?.value?.account_id || "");
  if (!token || !accountId) return json({ error: "ai_gateway_not_ready" }, 503, origin);

  const runtime = runtimeResult.data?.value || {};
  const routeKey = String(body.route_key || "") || (
    /code|program|debug|api|sql|script/.test(lower)
      ? "cloudy_coding"
      : /analy|analiz|strategy|estrateg|why|por qué|porque|forecast|diagnos/.test(lower)
        ? "cloudy_reasoning"
        : "cloudy_general"
  );

  const { data: routeModels } = await svc.from("ai_route_models")
    .select("model_key,priority,conditions")
    .eq("route_key", routeKey)
    .eq("enabled", true)
    .order("priority");
  let candidates: any[] = [];
  if (routeModels?.length) {
    const keys = routeModels.map((x: any) => x.model_key);
    const { data: models } = await svc.from("ai_model_catalog")
      .select("model_key,provider_key,model_id,display_name,availability,cost_tier,quality_tier,speed_tier")
      .in("model_key", keys)
      .not("availability", "in", "(disabled,deprecated)");
    const modelMap = new Map((models || []).map((x: any) => [x.model_key, x]));
    candidates = routeModels.map((x: any) => ({ ...modelMap.get(x.model_key), priority: x.priority })).filter((x: any) => x.model_id);
  }
  if (!candidates.length) {
    const { data: model } = await svc.from("ai_model_catalog").select("*").eq("model_key", "cf_glm_47_flash").maybeSingle();
    if (model) candidates = [model];
  }

  const { data: historyRows } = await svc.from("cloudy_messages")
    .select("role,content,created_at")
    .eq("session_id", sessionId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: false })
    .limit(Number(runtime.max_history_messages || 24));
  const history = (historyRows || []).reverse().map((x: any) => ({ role: x.role, content: x.content || "" }));

  const systemPrompt = `You are Cloudy, the central AI Business Operator inside CloudSales. Continue the conversation naturally. Answer the user's actual request first; never restart with a generic introduction and never repeat the previous answer unless the user asks. Use the recent conversation as working memory and resolve pronouns and follow-ups from it. Be concise, intelligent, proactive and specific. Never expose secrets or invent capabilities. When the user asks you to perform a supported action, use a tool rather than giving manual instructions. Respect tenant boundaries, role permissions and approval boundaries. The current workspace role is ${role}; never attempt a capability not exposed to this role. Locale=${locale}. ${selectedAgent?.system_instructions ? `Active AgentCloud profile: ${selectedAgent.name}. ${selectedAgent.system_instructions}` : ""}\nMetrics: lead_attempts_30d=${summary.lead_attempts_30d || 0}, accepted=${summary.leads_accepted_30d || 0}, rejected=${summary.leads_rejected_30d || 0}, avg_quality=${summary.avg_quality_score_30d || 0}, appointments=${summary.appointments_30d || 0}, won=${summary.won_30d || 0}. Connected providers=${connections.map((x: any) => x.provider_key).join(",") || "none"}. External executable actions=${supported.map((x: any) => `${x.provider_key}:${x.capability_key}`).join(",") || "none"}. CloudSales core actions=${coreActions.map((x: any) => x.action_key).join(",")}.`;

  const tools: any[] = [];
  if (supported.length) {
    tools.push({
      type: "function",
      function: {
        name: "cloudy_execute_provider",
        description: "Execute an allowed action inside a connected external provider or CRM.",
        parameters: {
          type: "object",
          properties: {
            provider_key: { type: "string", enum: [...new Set(supported.map((x: any) => x.provider_key))] },
            action_key: { type: "string", enum: [...new Set(supported.map((x: any) => x.capability_key))] },
            input: { type: "object", additionalProperties: true },
          },
          required: ["provider_key", "action_key", "input"],
          additionalProperties: false,
        },
      },
    });
  }
  if (coreActions.length) {
    tools.push({
      type: "function",
      function: {
        name: "cloudy_execute_core",
        description: "Execute an allowed CloudSales-native action.",
        parameters: {
          type: "object",
          properties: {
            action_key: { type: "string", enum: coreActions.map((x: any) => x.action_key) },
            input: { type: "object", additionalProperties: true },
          },
          required: ["action_key", "input"],
          additionalProperties: false,
        },
      },
    });
  }

  async function callModel(model: any, modelMessages: any[], withTools = true) {
    const started = Date.now();
    const { data: run } = await svc.from("cloudy_ai_runs").insert({
      organization_id: organizationId,
      session_id: sessionId,
      agent_id: agentId,
      route_key: routeKey,
      model_key: model.model_key,
      model_id: model.model_id,
      provider_key: model.provider_key,
      status: "running",
      metadata: { gateway_id: String(runtime.gateway_id || "default"), role },
    }).select("id").single();

    try {
      const payload: any = {
        model: model.model_id,
        messages: modelMessages,
        max_completion_tokens: 1100,
        temperature: 0.2,
      };
      if (withTools && tools.length) {
        payload.tools = tools;
        payload.tool_choice = "auto";
      }
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "cf-aig-gateway-id": String(runtime.gateway_id || "default"),
          "cf-aig-collect-log-payload": "false",
        },
        body: JSON.stringify(payload),
      });
      const raw = await response.json().catch(() => ({}));
      const data = raw?.result ?? raw;
      if (!response.ok || raw?.success === false || !data?.choices?.length) throw new Error(`ai_request_failed_${response.status}`);
      const usage = data.usage || {};
      if (run?.id) {
        await svc.from("cloudy_ai_runs").update({
          status: "succeeded",
          latency_ms: Date.now() - started,
          input_tokens: usage.prompt_tokens ?? usage.input_tokens ?? null,
          output_tokens: usage.completion_tokens ?? usage.output_tokens ?? null,
          total_tokens: usage.total_tokens ?? null,
          finished_at: new Date().toISOString(),
        }).eq("id", run.id);
      }
      const totalTokens = Number(usage.total_tokens || 0);
      if (totalTokens > 0) {
        await svc.from("usage_ledger").insert({
          organization_id: organizationId,
          usage_type: "ai_tokens",
          quantity: totalTokens,
          unit: "token",
          provider_key: model.provider_key || "cloudflare_ai_gateway",
          cost_amount: null,
          cost_currency: "USD",
          metadata: { user_id: user.id, route_key: routeKey, model_key: model.model_key, role },
        }).catch(() => {});
      }
      return { data, run_id: run?.id, model };
    } catch (error) {
      if (run?.id) {
        await svc.from("cloudy_ai_runs").update({
          status: "failed",
          latency_ms: Date.now() - started,
          error: String((error as Error).message),
          finished_at: new Date().toISOString(),
        }).eq("id", run.id);
      }
      throw error;
    }
  }

  let first: any = null;
  let lastError: any = null;
  for (const model of candidates) {
    try {
      first = await callModel(model, [{ role: "system", content: systemPrompt }, ...history]);
      break;
    } catch (error) { lastError = error; }
  }

  if (!first) {
    const reply = fallback(locale, kind, fallbackData);
    await svc.from("cloudy_messages").insert({
      session_id: sessionId,
      organization_id: organizationId,
      role: "assistant",
      content: reply,
      payload: { engine: "cloudy_core_v3", ai_ready: false, error: String(lastError?.message || "all_models_failed") },
    });
    return json({ session_id: sessionId, reply, ai_ready: false, fallback: true }, 200, origin);
  }

  const assistantMessage = first.data.choices[0]?.message || {};
  const toolCalls = Array.isArray(assistantMessage.tool_calls) ? assistantMessage.tool_calls : [];
  if (!toolCalls.length) {
    const reply = safe(assistantMessage.content) || fallback(locale, "general", {});
    await svc.from("cloudy_messages").insert({
      session_id: sessionId,
      organization_id: organizationId,
      role: "assistant",
      content: reply,
      payload: {
        engine: "cloudflare_ai_gateway",
        ai_ready: true,
        route_key: routeKey,
        model_key: first.model.model_key,
        ai_run_id: first.run_id,
      },
    });
    return json({
      session_id: sessionId,
      reply,
      ai_ready: true,
      route_key: routeKey,
      model: { model_key: first.model.model_key, display_name: first.model.display_name },
    }, 200, origin);
  }

  const toolCall = toolCalls[0];
  const toolName = String(toolCall.function?.name || "");
  let args: any = {};
  try { args = JSON.parse(toolCall.function?.arguments || "{}"); }
  catch { return json({ error: "invalid_tool_arguments" }, 502, origin); }

  let providerKey = "";
  const actionKey = String(args.action_key || "");
  let connection: any = null;
  let capability: any = null;

  if (toolName === "cloudy_execute_core") {
    providerKey = "cloudsales_core";
    if (!CORE.has(actionKey) || !actionMap.has(actionKey)) return json({ error: "core_tool_not_permitted" }, 409, origin);
    if (role === "viewer" && !VIEWER_CORE.has(actionKey)) return json({ error: "insufficient_role" }, 403, origin);
  } else if (toolName === "cloudy_execute_provider") {
    providerKey = String(args.provider_key || "");
    connection = connectionMap.get(providerKey);
    capability = supported.find((x: any) => x.provider_key === providerKey && x.capability_key === actionKey);
    if (!connection || !capability || !actionMap.has(actionKey)) return json({ error: "provider_tool_not_permitted" }, 409, origin);
    if (role === "viewer" && capability.write_capable === true) return json({ error: "insufficient_role" }, 403, origin);
  } else {
    return json({ error: "unknown_tool" }, 409, origin);
  }

  const action: any = actionMap.get(actionKey);
  if (action.risk_level === "prohibited") return json({ error: "action_prohibited" }, 403, origin);
  const needsApproval = Boolean(action.requires_approval || capability?.requires_provider_review || body.force_approval === true);
  const status = needsApproval ? "waiting_approval" : "queued";
  const toolInput = args.input && typeof args.input === "object" ? { ...args.input } : {};
  if (role === "viewer" && actionKey === "support.diagnose") toolInput.create_case = false;

  const jobInput: any = {
    ...toolInput,
    provider_key: providerKey,
    requested_via: "cloudy-orchestrator",
    session_id: sessionId,
    agent_id: agentId,
    requested_role: role,
  };
  if (connection) jobInput.connection_id = connection.id;

  const { data: job, error: jobError } = await svc.from("automation_jobs").insert({
    organization_id: organizationId,
    job_type: actionKey,
    status,
    requested_by: user.id,
    requires_approval: needsApproval,
    input: jobInput,
  }).select("id,status,job_type,requires_approval,created_at").single();
  if (jobError || !job) return json({ error: "job_create_failed" }, 500, origin);

  const { data: toolRun } = await svc.from("cloudy_tool_runs").insert({
    organization_id: organizationId,
    session_id: sessionId,
    agent_id: agentId,
    automation_job_id: job.id,
    provider_key: providerKey,
    action_key: actionKey,
    status: needsApproval ? "waiting_approval" : "requested",
    input: toolInput,
    requested_by: user.id,
  }).select("id").single();

  await svc.from("audit_log").insert({
    organization_id: organizationId,
    actor_user_id: user.id,
    actor_type: "cloudy",
    action: "cloudy.tool.requested",
    entity_type: "automation_job",
    entity_id: job.id,
    connection_id: connection?.id || null,
    success: true,
    context: { provider_key: providerKey, action_key: actionKey, requires_approval: needsApproval, session_id: sessionId, role },
  });

  if (needsApproval) {
    const reply = locale === "es"
      ? `Preparé ${actionKey}. Como esta acción requiere aprobación, quedó lista para que la confirmes dentro de CloudSales.`
      : `I prepared ${actionKey}. Because this action requires approval, it is ready for your confirmation inside CloudSales.`;
    await svc.from("cloudy_messages").insert({
      session_id: sessionId,
      organization_id: organizationId,
      role: "assistant",
      content: reply,
      payload: { job_id: job.id, approval_required: true, provider_key: providerKey, action_key: actionKey },
    });
    return json({ session_id: sessionId, reply, ai_ready: true, job, approval_required: true, tool_run_id: toolRun?.id }, 202, origin);
  }

  let final: any = job;
  for (let index = 0; index < 10; index += 1) {
    await sleep(250);
    const { data: latest } = await svc.from("automation_jobs")
      .select("id,status,output,error,finished_at")
      .eq("id", job.id)
      .maybeSingle();
    if (latest) {
      final = latest;
      if (["succeeded", "failed", "cancelled"].includes(latest.status)) break;
    }
  }

  if (toolRun?.id) {
    await svc.from("cloudy_tool_runs").update({
      status: final.status === "succeeded" ? "succeeded" : final.status === "failed" ? "failed" : "running",
      output: final.output || null,
      error: final.error || null,
      started_at: new Date().toISOString(),
      finished_at: ["succeeded", "failed", "cancelled"].includes(final.status) ? new Date().toISOString() : null,
    }).eq("id", toolRun.id);
  }

  let reply = "";
  try {
    const second = await callModel(first.model, [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "assistant", content: assistantMessage.content || null, tool_calls: toolCalls },
      {
        role: "tool",
        tool_call_id: toolCall.id,
        name: toolName,
        content: JSON.stringify({ status: final.status, output: final.output || null, error: final.error || null, action_key: actionKey, provider_key: providerKey }),
      },
    ], false);
    reply = safe(second.data.choices?.[0]?.message?.content);
  } catch {}

  if (!reply) {
    reply = final.status === "succeeded"
      ? (locale === "es" ? `Listo. Ejecuté ${actionKey}.` : `Done. I executed ${actionKey}.`)
      : final.status === "failed"
        ? (locale === "es" ? `No pude completar ${actionKey}. El error quedó registrado para soporte: ${safe(final.error, 250)}.` : `I could not complete ${actionKey}. The error is logged for support: ${safe(final.error, 250)}.`)
        : (locale === "es" ? `Ya inicié ${actionKey}. Cloudy seguirá su estado.` : `I started ${actionKey}. Cloudy will track its status.`);
  }

  await svc.from("cloudy_messages").insert({
    session_id: sessionId,
    organization_id: organizationId,
    role: "assistant",
    content: reply,
    payload: {
      engine: "cloudflare_ai_gateway",
      job_id: job.id,
      job_status: final.status,
      provider_key: providerKey,
      action_key: actionKey,
      model_key: first.model.model_key,
    },
  });

  return json({
    session_id: sessionId,
    reply,
    ai_ready: true,
    route_key: routeKey,
    model: { model_key: first.model.model_key, display_name: first.model.display_name },
    job: final,
    approval_required: false,
    tool_run_id: toolRun?.id,
  }, 200, origin);
});
