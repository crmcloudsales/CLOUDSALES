import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const API = "https://api.cloudflare.com/client/v4";
const ACCOUNT = "bd94cb0580e86e7f40b4271a03052426";
const SB = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APPROVED_ZONES = ["cloudsales.app", "cloudsalescrm.com"] as const;

const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  },
});

async function getCommand(id: string) {
  const r = await fetch(`${SB}/rest/v1/internal_command_queue?id=eq.${encodeURIComponent(id)}&select=*`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}` },
  });
  return (await r.json())?.[0] || null;
}

async function patchCommand(id: string, patch: Record<string, unknown>) {
  await fetch(`${SB}/rest/v1/internal_command_queue?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
      "content-type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}

async function cf(token: string, path: string) {
  const r = await fetch(API + path, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok && data?.success !== false, status: r.status, data };
}

function safeErrors(data: any) {
  return Array.isArray(data?.errors)
    ? data.errors.slice(0, 10).map((e: any) => ({ code: e?.code ?? null, message: String(e?.message ?? "").slice(0, 300) }))
    : [];
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return out({ error: "method_not_allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const id = String(body?.command_id || "");
  const command = await getCommand(id);
  if (!command || command.command_type !== "cloudflare_inspect" || command.status !== "queued" || new Date(command.expires_at).getTime() <= Date.now()) {
    return out({ error: "invalid_or_expired_command" }, 403);
  }

  await patchCommand(id, { status: "running", started_at: new Date().toISOString() });
  const token = Deno.env.get("CLOUDFLARE_API_TOKEN_CLOUDSALES") || "";
  if (!token) {
    await patchCommand(id, { status: "failed", error: "cloudflare_token_missing", finished_at: new Date().toISOString() });
    return out({ error: "cloudflare_token_missing" }, 503);
  }

  try {
    const zones: any[] = [];
    for (const name of APPROVED_ZONES) {
      const zr = await cf(token, `/zones?name=${encodeURIComponent(name)}&per_page=20`);
      const visible = Array.isArray(zr.data?.result) ? zr.data.result.filter((z: any) => String(z?.name || "").toLowerCase() === name) : [];
      const zoneRows: any[] = [];

      for (const z of visible) {
        const dns = await cf(token, `/zones/${encodeURIComponent(String(z.id))}/dns_records?per_page=100`);
        zoneRows.push({
          id: String(z.id),
          name: String(z.name),
          status: z.status ?? null,
          paused: Boolean(z.paused),
          type: z.type ?? null,
          account_id: z.account?.id ?? null,
          account_name: z.account?.name ?? null,
          name_servers: Array.isArray(z.name_servers) ? z.name_servers : [],
          dns: {
            status: dns.status,
            ok: dns.ok,
            errors: safeErrors(dns.data),
            records: Array.isArray(dns.data?.result) ? dns.data.result.map((r: any) => ({
              id: r.id ?? null,
              type: r.type ?? null,
              name: r.name ?? null,
              content: r.content ?? null,
              proxied: r.proxied ?? null,
              ttl: r.ttl ?? null,
            })) : [],
          },
        });
      }

      zones.push({ requested_name: name, status: zr.status, ok: zr.ok, errors: safeErrors(zr.data), zones: zoneRows });
    }

    const domains = await cf(token, `/accounts/${ACCOUNT}/workers/domains`);
    const result = {
      checked_at: new Date().toISOString(),
      approved_zones: zones,
      worker_domains: {
        status: domains.status,
        ok: domains.ok,
        errors: safeErrors(domains.data),
        result: Array.isArray(domains.data?.result) ? domains.data.result
          .filter((d: any) => APPROVED_ZONES.some((z) => String(d?.hostname || "").toLowerCase() === z || String(d?.hostname || "").toLowerCase().endsWith(`.${z}`)))
          .map((d: any) => ({ id: d.id, hostname: d.hostname, service: d.service, zone_id: d.zone_id, zone_name: d.zone_name })) : [],
      },
    };

    await patchCommand(id, { status: "succeeded", result, error: null, finished_at: new Date().toISOString() });
    return out(result);
  } catch (e) {
    const error = String((e as Error)?.message || "cloudflare_inspect_failed").slice(0, 500);
    await patchCommand(id, { status: "failed", error, finished_at: new Date().toISOString() });
    return out({ error: "cloudflare_inspect_failed" }, 500);
  }
});
