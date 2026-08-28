import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });

// HighLevel public verification keys. X-GHL-Signature / Ed25519 is the canonical path.
// X-WH-Signature / RSA-SHA256 remains only as a temporary migration fallback.
const ED25519_PUBLIC_KEY_SPKI = "MCowBQYDK2VwAyEAi2HR1srL4o18O8BRa7gVJY7G7bupbN3H9AwJrHCDiOg=";
const LEGACY_RSA_PUBLIC_KEY_SPKI = "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAokvo/r9tVgcfZ5DysOSCFrm602qYV0MaAiNnX9O8KxMbiyRKWeL9JpCpVpt4XHIcBOK4u3cLSqJGOLaPuXw6dO0t6Q/ZVdAV5Phz+ZtzPL16iCGeK9po6D6JHBpbi989mmzMryUnQJezlYJ3DVfBcsedpinheNnyYeFXolrJvcsjDtfAeRx5ByHQmTnSdFUzuAnC9/GepgLT9SM4nCpvuxmZMxrJt5Rw+VUaQ9B8JSvbMPpez4peKaJPZHBbU3OdeCVx5klVXXZQGNHOs8gF3kvoV5rTnXV0IknLBXlcKKAQLZcY/Q9rG6Ifi9c+5vqlvHPCUJFT5XUGG5RKgOKUJ062fRtN+rLYZUV+BjafxQauvC8wSWeYja63VSUruvmNj8xkx2zE/Juc+yjLjTXpIocmaiFeAO6fUtNjDeFVkhf5LNb59vECyrHD2SQIrhgXpO4Q3dVNA5rw576PwTzNh/AMfHKIjE4xQA1SZuYJmNnmVZLIZBlQAF9Ntd03rfadZ+yDiOXCCs9FkHibELhCHULgCsnuDJHcrGNd5/Ddm5hxGQ0ASitgHeMZ0kcIOwKDOzOU53lDza6/Y09T7sYJPQe7z0cvj7aE4B+Ax1ZoZGPzpJlZtGXCsu9aTEGEnKzmsFqwcSsnw3JB31IGKAykT1hhTiaCeIY/OwwwNUY2yvcCAwEAAQ==";

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" },
});

function decodeBase64(value: string) {
  let normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  while (normalized.length % 4) normalized += "=";
  return Uint8Array.from(atob(normalized), (c) => c.charCodeAt(0));
}

async function sha256(value: string) {
  const data = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(data)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function verifySignature(rawBody: string, req: Request) {
  const ed = req.headers.get("x-ghl-signature");
  const legacy = req.headers.get("x-wh-signature");
  const bytes = new TextEncoder().encode(rawBody);
  try {
    if (ed && ed !== "N/A") {
      const key = await crypto.subtle.importKey("spki", decodeBase64(ED25519_PUBLIC_KEY_SPKI), { name: "Ed25519" }, false, ["verify"]);
      return { ok: await crypto.subtle.verify({ name: "Ed25519" }, key, decodeBase64(ed), bytes), algorithm: "ed25519" };
    }
    if (legacy && legacy !== "N/A") {
      const key = await crypto.subtle.importKey("spki", decodeBase64(LEGACY_RSA_PUBLIC_KEY_SPKI), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
      return { ok: await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, decodeBase64(legacy), bytes), algorithm: "rsa-sha256" };
    }
    return { ok: false, algorithm: "missing" };
  } catch {
    return { ok: false, algorithm: ed ? "ed25519" : "rsa-sha256" };
  }
}

const clean = (value: unknown, max = 500) => {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
};

async function linkedEntity(connectionId: string, type: string, externalId: string) {
  return (await db.from("external_object_links")
    .select("entity_id")
    .eq("connection_id", connectionId)
    .eq("external_object_type", type)
    .eq("external_object_id", externalId)
    .maybeSingle()).data?.entity_id || null;
}

async function saveLink(org: string, connectionId: string, type: string, entityId: string, externalId: string) {
  await db.from("external_object_links").upsert({
    organization_id: org,
    connection_id: connectionId,
    entity_type: type,
    entity_id: entityId,
    external_object_type: type,
    external_object_id: externalId,
    metadata: { provider: "highlevel" },
  }, { onConflict: "connection_id,external_object_type,external_object_id" });
}

async function syncContact(org: string, connectionId: string, data: any) {
  const externalId = clean(data.id || data.contactId, 180);
  if (!externalId) return null;
  let id = await linkedEntity(connectionId, "contact", externalId);
  const patch: any = {
    first_name: clean(data.firstName || data.first_name, 100),
    last_name: clean(data.lastName || data.last_name, 100),
    email: clean(data.email, 320)?.toLowerCase() || null,
    phone_e164: clean(data.phone, 40),
    primary_source_provider: "highlevel",
    primary_source_id: externalId,
    metadata: { highlevel: { source: clean(data.source, 180), tags: Array.isArray(data.tags) ? data.tags.slice(0, 50) : [], synced_at: new Date().toISOString() } },
  };
  if (id) {
    await db.from("contacts").update(patch).eq("id", id).eq("organization_id", org);
  } else {
    let existing: any = null;
    if (patch.email) existing = (await db.from("contacts").select("id").eq("organization_id", org).eq("email", patch.email).limit(1).maybeSingle()).data;
    if (!existing && patch.phone_e164) existing = (await db.from("contacts").select("id").eq("organization_id", org).eq("phone_e164", patch.phone_e164).limit(1).maybeSingle()).data;
    if (existing?.id) {
      id = existing.id;
      await db.from("contacts").update(patch).eq("id", id);
    } else {
      const { data: created, error } = await db.from("contacts").insert({ organization_id: org, ...patch, lifecycle_stage: "lead", quality_status: "new" }).select("id").single();
      if (error || !created) throw new Error("contact_sync_failed");
      id = created.id;
    }
    await saveLink(org, connectionId, "contact", id, externalId);
  }
  return id;
}

async function stageName(connectionId: string, stageId: string | null) {
  if (!stageId) return "New Lead";
  const { data } = await db.from("connection_mappings").select("config")
    .eq("connection_id", connectionId).eq("mapping_type", "pipeline").eq("mapping_key", "cloudsales_sales").maybeSingle();
  const stages = data?.config?.stages || {};
  return Object.entries(stages).find(([, value]) => String(value) === stageId)?.[0] || stageId;
}

async function commercialEvent(org: string, webhookId: string, type: string, ids: any = {}, metadata: any = {}) {
  await db.from("commercial_events").upsert({
    organization_id: org,
    contact_id: ids.contact_id || null,
    opportunity_id: ids.opportunity_id || null,
    appointment_id: ids.appointment_id || null,
    event_type: type,
    source: "highlevel",
    source_event_id: webhookId,
    idempotency_key: `highlevel:${webhookId}:${type}`,
    occurred_at: new Date().toISOString(),
    value: ids.value ?? null,
    currency: ids.currency || null,
    metadata,
  }, { onConflict: "idempotency_key", ignoreDuplicates: true });
}

async function syncOpportunity(org: string, connectionId: string, data: any, webhookId: string) {
  const externalId = clean(data.id, 180);
  if (!externalId) return;
  let id = await linkedEntity(connectionId, "opportunity", externalId);
  const contactId = data.contactId ? await linkedEntity(connectionId, "contact", String(data.contactId)) : null;
  const stage = await stageName(connectionId, clean(data.pipelineStageId, 180));
  const rawStatus = String(data.status || "open").toLowerCase();
  const status = ["open", "won", "lost", "abandoned"].includes(rawStatus) ? rawStatus : "open";
  const patch: any = {
    contact_id: contactId || null,
    name: clean(data.name, 180) || `HighLevel ${externalId.slice(0, 8)}`,
    stage,
    status,
    value: Number.isFinite(Number(data.monetaryValue)) ? Number(data.monetaryValue) : null,
    currency: "USD",
    metadata: { highlevel: { pipeline_id: clean(data.pipelineId, 180), pipeline_stage_id: clean(data.pipelineStageId, 180), assigned_to: clean(data.assignedTo, 180), synced_at: new Date().toISOString() } },
  };
  if (id) await db.from("opportunities").update(patch).eq("id", id).eq("organization_id", org);
  else {
    const { data: created, error } = await db.from("opportunities").insert({ organization_id: org, ...patch }).select("id").single();
    if (error || !created) throw new Error("opportunity_sync_failed");
    id = created.id;
    await saveLink(org, connectionId, "opportunity", id, externalId);
  }
  const lower = String(stage).toLowerCase();
  if (status === "won") await commercialEvent(org, webhookId, "won", { contact_id: contactId, opportunity_id: id, value: patch.value, currency: "USD" }, { stage });
  else if (status === "lost" || status === "abandoned") await commercialEvent(org, webhookId, "lost", { contact_id: contactId, opportunity_id: id }, { stage });
  else if (lower.includes("qualified")) await commercialEvent(org, webhookId, "qualified", { contact_id: contactId, opportunity_id: id }, { stage });
}

async function syncAppointment(org: string, connectionId: string, payload: any, webhookId: string, deleted = false) {
  const data = payload.appointment && typeof payload.appointment === "object" ? payload.appointment : payload;
  const externalId = clean(data.id, 180);
  if (!externalId) return;
  const contactId = data.contactId ? await linkedEntity(connectionId, "contact", String(data.contactId)) : null;
  const { data: existing } = await db.from("appointments").select("id").eq("organization_id", org).eq("provider_key", "highlevel").eq("external_id", externalId).maybeSingle();
  const raw = String(data.appointmentStatus || data.status || "scheduled").toLowerCase().replace(/\s+/g, "_");
  const normalized = deleted ? "cancelled" : (["scheduled", "confirmed", "completed", "cancelled", "no_show"].includes(raw) ? raw : (raw === "new" ? "scheduled" : "scheduled"));
  const patch: any = {
    contact_id: contactId || null,
    starts_at: data.startTime || new Date().toISOString(),
    ends_at: data.endTime || null,
    status: normalized,
    provider_key: "highlevel",
    external_id: externalId,
    metadata: { highlevel: { title: clean(data.title, 300), calendar_id: clean(data.calendarId, 180), synced_at: new Date().toISOString() } },
  };
  let id = existing?.id;
  if (id) await db.from("appointments").update(patch).eq("id", id);
  else {
    const { data: created, error } = await db.from("appointments").insert({ organization_id: org, ...patch }).select("id").single();
    if (error || !created) throw new Error("appointment_sync_failed");
    id = created.id;
  }
  if (!deleted) await commercialEvent(org, webhookId, "appointment", { contact_id: contactId, appointment_id: id }, { status: normalized });
}

async function process(org: string, connectionId: string, payload: any, webhookId: string) {
  const type = String(payload.type || "");
  const data = payload.data && typeof payload.data === "object" ? payload.data : payload;
  if (["ContactCreate", "ContactUpdate"].includes(type)) { await syncContact(org, connectionId, data); return "processed"; }
  if (["OpportunityCreate", "OpportunityUpdate", "OpportunityStageUpdate", "OpportunityStatusUpdate", "OpportunityMonetaryValueUpdate"].includes(type)) { await syncOpportunity(org, connectionId, data, webhookId); return "processed"; }
  if (["AppointmentCreate", "AppointmentUpdate"].includes(type)) { await syncAppointment(org, connectionId, payload, webhookId, false); return "processed"; }
  if (type === "AppointmentDelete") { await syncAppointment(org, connectionId, payload, webhookId, true); return "processed"; }
  return "ignored";
}

Deno.serve(async (req) => {
  if (req.method === "GET") return response({ ok: true, service: "cloudsales-highlevel-webhook", signature: "X-GHL-Signature/Ed25519" });
  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 1_048_576) return response({ error: "payload_too_large" }, 413);
  const raw = await req.text();
  if (!raw || raw.length > 1_048_576) return response({ error: "invalid_payload" }, 400);
  const signature = await verifySignature(raw, req);
  if (!signature.ok) return response({ error: "invalid_signature", algorithm: signature.algorithm }, 401);

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return response({ error: "invalid_json" }, 400); }
  const webhookId = clean(payload.webhookId || req.headers.get("x-webhook-id"), 240) || await sha256(raw);
  const locationId = clean(payload.locationId || payload.data?.locationId || payload.location?.id, 180);

  let organizationId: string | null = null;
  let connectionId: string | null = null;
  if (locationId) {
    const { data: connection } = await db.from("connections").select("id,organization_id")
      .eq("provider_key", "highlevel").eq("external_account_id", locationId).eq("status", "connected").limit(1).maybeSingle();
    if (connection) { organizationId = connection.organization_id; connectionId = connection.id; }
  }

  const { data: webhook, error } = await db.from("webhook_events").insert({
    organization_id: organizationId,
    provider_key: "highlevel",
    external_event_id: webhookId,
    status: "received",
    payload,
  }).select("id").maybeSingle();
  if (error) {
    if (String(error.code) === "23505") return response({ ok: true, duplicate: true, webhook_id: webhookId });
    return response({ error: "persist_failed" }, 500);
  }

  let status = "ignored";
  let processingError: string | null = null;
  try {
    if (organizationId && connectionId) status = await process(organizationId, connectionId, payload, webhookId);
  } catch (err) {
    status = "failed";
    processingError = String((err as Error).message || err);
  }
  await db.from("webhook_events").update({ status, error: processingError, processed_at: new Date().toISOString() }).eq("id", webhook!.id);
  return response({ ok: true, webhook_id: webhookId, status, signature: signature.algorithm });
});