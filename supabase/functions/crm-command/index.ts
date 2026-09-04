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

const DEFAULT_ENDPOINTS: Record<string, string> = {
  highlevel: "highlevel-command",
  hubspot: "crm-universal-command",
  pipedrive: "crm-universal-command",
  zoho: "crm-universal-command",
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (origin && !ORIGINS.has(origin)) return json({ error: "origin_not_allowed" }, 403, origin);

  const auth = req.headers.get("authorization");
  if (!auth) return json({ error: "missing_authorization" }, 401, origin);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "invalid_json" }, 400, origin); }

  const organizationId = String(body.organization_id || "");
  const connectionId = String(body.connection_id || "");
  const action = String(body.action || "");
  if (!organizationId || !connectionId || !action) {
    return json({ error: "missing_required_fields" }, 400, origin);
  }

  const userClient = createClient(U, A, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) return json({ error: "invalid_session" }, 401, origin);

  const svc = createClient(U, S, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: member } = await svc.from("organization_members")
    .select("role,status")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member || member.status !== "active" || !["owner", "admin", "operator"].includes(String(member.role))) {
    return json({ error: "forbidden" }, 403, origin);
  }

  const { data: connection } = await svc.from("connections")
    .select("id,provider_key,status")
    .eq("id", connectionId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!connection || connection.status !== "connected") {
    return json({ error: "connection_unavailable" }, 409, origin);
  }

  const providerKey = String(connection.provider_key || "");
  const { data: capability } = await svc.from("provider_capabilities")
    .select("support_status,write_capable,requires_provider_review,notes")
    .eq("provider_key", providerKey)
    .eq("capability_key", action)
    .maybeSingle();

  if (!capability || !["implemented", "beta"].includes(String(capability.support_status))) {
    return json({
      error: "capability_not_supported",
      provider_key: providerKey,
      action,
      support_status: capability?.support_status || "unregistered",
    }, 409, origin);
  }

  const { data: route } = await svc.from("integration_provider_routes")
    .select("route_type,enabled,minimum_support_status,metadata")
    .eq("provider_key", providerKey)
    .eq("capability_key", action)
    .maybeSingle();

  if (route && route.enabled === false) {
    return json({ error: "provider_route_disabled", provider_key: providerKey, action }, 409, origin);
  }

  const endpoint = String(route?.metadata?.function_slug || DEFAULT_ENDPOINTS[providerKey] || "");
  if (!endpoint) {
    return json({ error: "adapter_not_implemented", provider_key: providerKey, action }, 409, origin);
  }

  const upstream = await fetch(`${U}/functions/v1/${endpoint}`, {
    method: "POST",
    headers: {
      authorization: auth,
      apikey: A,
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify({
      organization_id: organizationId,
      connection_id: connectionId,
      action,
      input: body.input && typeof body.input === "object" ? body.input : {},
    }),
  });

  const text = await upstream.text();
  let payload: any;
  try { payload = JSON.parse(text); }
  catch { payload = { error: "adapter_bad_response" }; }

  await svc.from("audit_log").insert({
    organization_id: organizationId,
    actor_user_id: user.id,
    actor_type: "user",
    action: `crm.router.${action}.${upstream.ok ? "succeeded" : "failed"}`,
    entity_type: "connection",
    entity_id: connectionId,
    connection_id: connectionId,
    success: upstream.ok,
    context: {
      provider_key: providerKey,
      endpoint,
      support_status: capability.support_status,
      upstream_status: upstream.status,
    },
  });

  return json({
    ...payload,
    routed_by: "crm-command",
    provider_key: providerKey,
    capability: {
      support_status: capability.support_status,
      write_capable: capability.write_capable,
      requires_provider_review: capability.requires_provider_review,
    },
  }, upstream.status, origin);
});
