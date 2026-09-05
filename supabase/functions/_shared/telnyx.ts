export const TELNYX_API_BASE = "https://api.telnyx.com/v2";

export type TelnyxChannel = "sms" | "whatsapp";

export type TelnyxEventEnvelope = {
  data?: {
    id?: string;
    event_type?: string;
    occurred_at?: string;
    payload?: Record<string, unknown>;
  };
};

function bytesFromBase64(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function verifyTelnyxWebhook(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  publicKey: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!signature || !timestamp || !publicKey) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > toleranceSeconds) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      bytesFromBase64(publicKey.trim()),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const signed = new TextEncoder().encode(`${timestamp}|${rawBody}`);
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      bytesFromBase64(signature),
      signed,
    );
  } catch {
    return false;
  }
}

export async function telnyxFetch<T = unknown>(
  apiKey: string,
  path: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: T | null; text: string }> {
  const response = await fetch(`${TELNYX_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let data: T | null = null;
  try { data = text ? JSON.parse(text) as T : null; } catch { data = null; }
  return { ok: response.ok, status: response.status, data, text };
}

export async function secretFingerprint(secret: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

export function normalizePhone(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("+")) return `+${raw.slice(1).replace(/\D/g, "")}`;
  const digits = raw.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

function phoneFromEndpoint(value: unknown): string {
  if (typeof value === "string") return normalizePhone(value);
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    return normalizePhone(v.phone_number ?? v.phoneNumber ?? v.number);
  }
  return "";
}

export function telnyxMessageFacts(envelope: TelnyxEventEnvelope) {
  const data = envelope.data || {};
  const payload = (data.payload || {}) as Record<string, any>;
  const rawType = String(payload.type || payload.channel || "").toLowerCase();
  const channel: TelnyxChannel = rawType.includes("whatsapp") ? "whatsapp" : "sms";
  const direction = String(payload.direction || "").toLowerCase();
  const from = phoneFromEndpoint(payload.from);
  const toRaw = Array.isArray(payload.to) ? payload.to[0] : payload.to;
  const to = phoneFromEndpoint(toRaw);
  const ownNumber = direction === "inbound" ? to : from;
  const remoteNumber = direction === "inbound" ? from : to;
  const messageId = String(payload.id || "");
  const text = String(payload.text || payload.body || payload.whatsapp_message?.text?.body || "");
  const media = Array.isArray(payload.media) ? payload.media : [];
  const statusRaw = Array.isArray(payload.to) && payload.to[0]?.status
    ? String(payload.to[0].status)
    : String(payload.status || "");
  return {
    eventId: String(data.id || ""),
    eventType: String(data.event_type || "unknown"),
    occurredAt: String(data.occurred_at || new Date().toISOString()),
    payload,
    channel,
    direction,
    ownNumber,
    remoteNumber,
    messageId,
    text,
    media,
    statusRaw,
  };
}

export function telnyxJobStatus(eventType: string, providerStatus: string): string | null {
  const s = providerStatus.toLowerCase();
  if (eventType === "message.received") return "replied";
  if (eventType === "message.sent") return "sent";
  if (eventType === "message.finalized") {
    if (["delivered", "delivery_success", "sent"].includes(s)) return "delivered";
    if (["delivery_failed", "failed", "undelivered", "rejected"].includes(s)) return "failed";
  }
  if (eventType.includes("read")) return "read";
  return null;
}
