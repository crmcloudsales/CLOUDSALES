import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizePhone, secretFingerprint, telnyxFetch } from "../_shared/telnyx.ts";

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
    Vary: "Origin",
  };
}
function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "content-type": "application/json;charset=utf-8", "cache-control": "no-store" },
  });
}
function base64Bytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(normalized), (c) => c.charCodeAt(0));
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (origin && !ORIGINS.has(origin)) return json({ error: "origin_not_allowed" }, 403, origin);

  const auth = req.headers.get("authorization");
  if (!auth) return json({ error: "missing_authorization" }, 401, origin);
  const uc = createClient(U, A, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData } = await uc.auth.getUser();
  const user = userData.user;
  if (!user) return json({ error: "invalid_session" }, 401, origin);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400, origin); }
  const organizationId = String(body.organization_id || "");
  const action = String(body.action || "connect");
  if (!organizationId) return json({ error: "organization_id_required" }, 400, origin);

  const svc = createClient(U, S, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: member } = await svc.from("organization_members").select("role,status")
    .eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
  if (!member || member.status !== "active" || !["owner", "admin"].includes(member.role)) {
    return json({ error: "forbidden" }, 403, origin);
  }

  if (action === "connect") {
    const apiKey = String(body.api_key || "").trim();
    if (apiKey.length < 20) return json({ error: "telnyx_api_key_required" }, 400, origin);

    const profiles = await telnyxFetch<any>(apiKey, "/messaging_profiles?page[size]=100");
    if (!profiles.ok) {
      await svc.from("audit_log").insert({ organization_id: organizationId, actor_user_id: user.id, actor_type: "user", action: "connection.telnyx.validation_failed", entity_type: "connection", success: false, context: { status: profiles.status } });
      return json({ error: "telnyx_validation_failed", status: profiles.status }, 422, origin);
    }
    const numbers = await telnyxFetch<any>(apiKey, "/phone_numbers?page[size]=100");
    if (!numbers.ok) return json({ error: "telnyx_phone_numbers_read_failed", status: numbers.status }, 422, origin);

    const fingerprint = await secretFingerprint(apiKey);
    const externalId = `telnyx:${fingerprint}`;
    const phoneRows = Array.isArray(numbers.data?.data) ? numbers.data.data : [];
    const profileRows = Array.isArray(profiles.data?.data) ? profiles.data.data : [];
    const connectionMetadata = {
      auth_mode: "api_key",
      account_fingerprint: fingerprint,
      api_base: "https://api.telnyx.com/v2",
      messaging_profiles: profileRows.map((p: any) => ({ id: String(p.id || ""), name: String(p.name || ""), enabled: p.enabled !== false })),
      phone_numbers: phoneRows.map((n: any) => ({ id: String(n.id || ""), phone_number: normalizePhone(n.phone_number), messaging_profile_id: String(n.messaging_profile_id || ""), status: String(n.status || "") })),
      webhook_signature: "ed25519",
      webhook_public_key_configured: false,
    };

    const { data: existing } = await svc.from("connections").select("id,metadata").eq("organization_id", organizationId)
      .eq("provider_key", "telnyx").eq("external_account_id", externalId).maybeSingle();
    let connectionId = existing?.id as string | undefined;
    if (connectionId) {
      await svc.from("connections").update({ status: "connected", external_account_name: `Telnyx ${fingerprint.slice(-6)}`, last_sync_at: new Date().toISOString(), metadata: { ...(existing.metadata || {}), ...connectionMetadata, webhook_public_key_configured: Boolean(existing.metadata?.webhook_public_key_configured) } }).eq("id", connectionId);
    } else {
      const { data: connection, error } = await svc.from("connections").insert({
        organization_id: organizationId, provider_key: "telnyx", status: "connected", external_account_id: externalId,
        external_account_name: `Telnyx ${fingerprint.slice(-6)}`, scopes: ["messaging"], expires_at: null,
        last_sync_at: new Date().toISOString(), created_by: user.id, metadata: connectionMetadata,
      }).select("id").single();
      if (error || !connection) return json({ error: "connection_create_failed" }, 500, origin);
      connectionId = connection.id;
    }

    const { data: secretRow } = await svc.from("connection_secrets").select("access_token_secret_id,webhook_secret_secret_id").eq("connection_id", connectionId).maybeSingle();
    let apiSecretId = secretRow?.access_token_secret_id;
    if (apiSecretId) {
      const { error } = await svc.rpc("service_update_secret", { p_secret_id: apiSecretId, p_secret: apiKey, p_name: `cloudsales/telnyx/${connectionId}/api_key`, p_description: "Telnyx API key" });
      if (error) return json({ error: "secret_update_failed" }, 500, origin);
    } else {
      const { data: id, error } = await svc.rpc("service_store_secret", { p_secret: apiKey, p_name: `cloudsales/telnyx/${connectionId}/api_key`, p_description: "Telnyx API key" });
      if (error || !id) return json({ error: "secret_storage_failed" }, 500, origin);
      apiSecretId = id;
    }
    await svc.from("connection_secrets").upsert({ connection_id: connectionId, access_token_secret_id: apiSecretId, webhook_secret_secret_id: secretRow?.webhook_secret_secret_id || null, rotated_at: new Date().toISOString() }, { onConflict: "connection_id" });

    const currentPrimary = await svc.from("channel_provider_bindings").select("id").eq("organization_id", organizationId).eq("channel", "sms").eq("is_primary", true).neq("status", "disabled").limit(1).maybeSingle();
    let primaryAssigned = Boolean(currentPrimary.data?.id);
    let bound = 0;
    for (const n of phoneRows) {
      const phone = normalizePhone(n.phone_number);
      if (!phone || !n.messaging_profile_id) continue;
      const isPrimary = !primaryAssigned;
      const { error } = await svc.from("channel_provider_bindings").upsert({
        organization_id: organizationId, channel: "sms", provider_key: "telnyx", connection_id: connectionId,
        provider_account_id: externalId, provider_channel_id: phone, provider_channel_name: phone,
        status: "connected", inbound_enabled: true, outbound_enabled: true, is_primary: isPrimary,
        capabilities: ["sms.send", "sms.receive", "message.status"],
        metadata: { phone_number_id: String(n.id || ""), messaging_profile_id: String(n.messaging_profile_id || "") },
      }, { onConflict: "organization_id,channel,provider_key,provider_channel_id" });
      if (!error) { bound++; if (isPrimary) primaryAssigned = true; }
    }

    await svc.from("audit_log").insert({ organization_id: organizationId, actor_user_id: user.id, actor_type: "user", action: "connection.telnyx.connected", entity_type: "connection", entity_id: connectionId, connection_id: connectionId, success: true, context: { phone_count: phoneRows.length, messaging_profile_count: profileRows.length, sms_bindings: bound } });
    return json({ ok: true, connection: { id: connectionId, provider_key: "telnyx", status: "connected", external_account_name: `Telnyx ${fingerprint.slice(-6)}` }, discovered: { phone_numbers: phoneRows.length, messaging_profiles: profileRows.length, sms_bindings: bound }, next: "configure_webhook_public_key" }, 200, origin);
  }

  const connectionId = String(body.connection_id || "");
  if (!connectionId) return json({ error: "connection_id_required" }, 400, origin);
  const { data: connection } = await svc.from("connections").select("id,organization_id,provider_key,metadata").eq("id", connectionId).eq("organization_id", organizationId).eq("provider_key", "telnyx").maybeSingle();
  if (!connection) return json({ error: "telnyx_connection_not_found" }, 404, origin);

  if (action === "configure_webhook_public_key") {
    const publicKey = String(body.public_key || "").trim();
    try { if (base64Bytes(publicKey).length !== 32) throw new Error(); } catch { return json({ error: "invalid_ed25519_public_key" }, 400, origin); }
    const { data: secretRow } = await svc.from("connection_secrets").select("access_token_secret_id,webhook_secret_secret_id").eq("connection_id", connectionId).maybeSingle();
    let webhookSecretId = secretRow?.webhook_secret_secret_id;
    if (webhookSecretId) {
      const { error } = await svc.rpc("service_update_secret", { p_secret_id: webhookSecretId, p_secret: publicKey, p_name: `cloudsales/telnyx/${connectionId}/webhook_public_key`, p_description: "Telnyx Ed25519 webhook public key" });
      if (error) return json({ error: "webhook_key_update_failed" }, 500, origin);
    } else {
      const { data: id, error } = await svc.rpc("service_store_secret", { p_secret: publicKey, p_name: `cloudsales/telnyx/${connectionId}/webhook_public_key`, p_description: "Telnyx Ed25519 webhook public key" });
      if (error || !id) return json({ error: "webhook_key_storage_failed" }, 500, origin);
      webhookSecretId = id;
    }
    await svc.from("connection_secrets").upsert({ connection_id: connectionId, access_token_secret_id: secretRow?.access_token_secret_id || null, webhook_secret_secret_id: webhookSecretId, rotated_at: new Date().toISOString() }, { onConflict: "connection_id" });
    await svc.from("connections").update({ metadata: { ...(connection.metadata || {}), webhook_public_key_configured: true } }).eq("id", connectionId);
    return json({ ok: true, connection_id: connectionId, webhook_public_key_configured: true }, 200, origin);
  }

  if (action === "bind_whatsapp_number") {
    const phone = normalizePhone(body.phone_number);
    if (!phone) return json({ error: "phone_number_required" }, 400, origin);
    const known = Array.isArray(connection.metadata?.phone_numbers) && connection.metadata.phone_numbers.some((n: any) => normalizePhone(n.phone_number) === phone);
    if (!known) return json({ error: "phone_number_not_owned_by_connection" }, 422, origin);
    const { data: currentPrimary } = await svc.from("channel_provider_bindings").select("id").eq("organization_id", organizationId).eq("channel", "whatsapp").eq("is_primary", true).neq("status", "disabled").limit(1).maybeSingle();
    const status = body.verified === true ? "connected" : "pending";
    const { data: binding, error } = await svc.from("channel_provider_bindings").upsert({
      organization_id: organizationId, channel: "whatsapp", provider_key: "telnyx", connection_id: connectionId,
      provider_account_id: String(connection.metadata?.account_fingerprint || ""), provider_channel_id: phone, provider_channel_name: phone,
      status, inbound_enabled: body.verified === true, outbound_enabled: body.verified === true, is_primary: !currentPrimary?.id,
      capabilities: ["whatsapp.send", "whatsapp.receive", "whatsapp.template.send", "whatsapp.media.send", "message.status"],
      metadata: { waba_id: body.waba_id ? String(body.waba_id) : null, telnyx_whatsapp_enabled: body.verified === true },
    }, { onConflict: "organization_id,channel,provider_key,provider_channel_id" }).select("id,status").single();
    if (error || !binding) return json({ error: "whatsapp_binding_failed" }, 500, origin);
    return json({ ok: true, binding, phone_number: phone }, 200, origin);
  }

  return json({ error: "unsupported_action", supported: ["connect", "configure_webhook_public_key", "bind_whatsapp_number"] }, 400, origin);
});
