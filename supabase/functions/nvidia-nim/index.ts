import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U = Deno.env.get("SUPABASE_URL")!;
const A = Deno.env.get("SUPABASE_ANON_KEY")!;
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  },
});

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const authorization = req.headers.get("authorization");
  if (!authorization) return json({ error: "missing_authorization" }, 401);

  const userClient = createClient(U, A, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) return json({ error: "invalid_session" }, 401);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "invalid_json" }, 400); }

  const organizationId = String(body.organization_id || "");
  if (!organizationId) return json({ error: "organization_id_required" }, 400);
  const messages = Array.isArray(body.messages) ? body.messages.slice(-24) : [];
  if (!messages.length) return json({ error: "messages_required" }, 400);

  const svc = createClient(U, S, { auth: { persistSession: false, autoRefreshToken: false } });
  const [{ data: membership }, { data: subscription }] = await Promise.all([
    svc.from("organization_members")
      .select("role,status")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle(),
    svc.from("subscriptions")
      .select("plan_key,status,current_period_end")
      .eq("organization_id", organizationId)
      .eq("brand_key", "cloudsales")
      .maybeSingle(),
  ]);

  if (!membership || membership.status !== "active") return json({ error: "forbidden" }, 403);
  if (!subscription || !["active", "trialing"].includes(String(subscription.status))) {
    return json({ error: "subscription_required" }, 402);
  }
  if (subscription.current_period_end && new Date(subscription.current_period_end).getTime() < Date.now()) {
    return json({ error: "subscription_expired" }, 402);
  }

  const { data: plan } = await svc.from("subscription_plans")
    .select("active,features")
    .eq("plan_key", subscription.plan_key)
    .maybeSingle();
  if (!plan?.active || plan.features?.cloudy !== true) return json({ error: "ai_not_in_plan" }, 403);

  const { data: rateAllowed } = await svc.rpc("consume_rate_limit", {
    p_bucket_key: `nvidia:${organizationId}:${user.id}`,
    p_limit: 60,
    p_window_seconds: 600,
  });
  if (rateAllowed !== true) return json({ error: "rate_limited" }, 429);

  const { data: setting } = await svc.from("internal_settings")
    .select("secret_id")
    .eq("setting_key", "nvidia_api_key_cloudsales")
    .maybeSingle();
  if (!setting?.secret_id) return json({ error: "nvidia_not_configured" }, 503);
  const { data: key, error: secretError } = await svc.rpc("service_read_secret", { p_secret_id: setting.secret_id });
  if (secretError || !key) return json({ error: "nvidia_secret_unavailable" }, 503);

  const model = String(body.model || "nvidia/nemotron-3-nano-30b-a3b").slice(0, 180);
  const payload: any = {
    model,
    messages,
    max_tokens: Math.min(Math.max(Number(body.max_tokens || 900), 1), 2000),
    temperature: Math.min(Math.max(Number(body.temperature ?? 0.2), 0), 1),
  };
  if (Array.isArray(body.tools) && body.tools.length) {
    payload.tools = body.tools.slice(0, 40);
    payload.tool_choice = body.tool_choice || "auto";
  }

  const started = Date.now();
  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  const raw = await response.json().catch(() => ({}));
  if (!response.ok) return json({ error: "nvidia_request_failed", provider_status: response.status }, 502);

  const usage = raw.usage || null;
  const totalTokens = Number(usage?.total_tokens ?? 0);
  if (Number.isFinite(totalTokens) && totalTokens > 0) {
    await svc.from("usage_ledger").insert({
      organization_id: organizationId,
      usage_type: "ai_tokens",
      quantity: totalTokens,
      unit: "token",
      provider_key: "nvidia",
      cost_amount: null,
      cost_currency: "USD",
      metadata: {
        user_id: user.id,
        model: raw.model || model,
        plan_key: subscription.plan_key,
        endpoint: "nvidia-nim",
      },
    }).catch(() => {});
  }

  return json({
    ok: true,
    provider: "nvidia_nim",
    model: raw.model || model,
    latency_ms: Date.now() - started,
    choices: raw.choices || [],
    usage,
  });
});
