import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const U = Deno.env.get("SUPABASE_URL")!;
const A = Deno.env.get("SUPABASE_ANON_KEY")!;
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

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (origin && !ORIGINS.has(origin)) return json({ error: "origin_not_allowed" }, 403, origin);

  const auth = req.headers.get("authorization");
  if (!auth) return json({ error: "missing_authorization" }, 401, origin);

  let raw = "";
  let body: any = {};
  try {
    raw = await req.text();
    body = JSON.parse(raw || "{}");
  } catch {
    return json({ error: "invalid_json" }, 400, origin);
  }

  const organizationId = String(body.organization_id || "");
  const message = String(body.message || "").trim();
  if (!organizationId || !message) return json({ error: "organization_id_and_message_required" }, 400, origin);

  const upstream = await fetch(`${U}/functions/v1/cloudy-orchestrator`, {
    method: "POST",
    headers: {
      authorization: auth,
      apikey: A,
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: raw,
  });

  const upstreamText = await upstream.text();
  let primary: any;
  try { primary = JSON.parse(upstreamText); }
  catch { primary = { error: "orchestrator_bad_response" }; }
  if (!upstream.ok) return json(primary, upstream.status, origin);

  if (primary?.ai_ready !== false || !primary?.reply) return json(primary, upstream.status, origin);

  try {
    const locale = String(body.locale || "es");
    const context = String(primary.reply || "").slice(0, 2500);
    const messages = [
      {
        role: "system",
        content: `You are Cloudy, the AI Business Operator inside CloudSales. Respond naturally in ${locale}. Continue the user's conversation rather than restarting it. Do not repeat the same sentence or generic capability statement. Answer the user's actual request first. Be concise, competent, proactive and business-focused. Never expose secrets. Never claim an action was executed unless CloudSales confirms it. If operational context is useful, use it silently: ${context}`,
      },
      { role: "user", content: message.slice(0, 5000) },
    ];
    const response = await fetch(`${U}/functions/v1/nvidia-nim`, {
      method: "POST",
      headers: { authorization: auth, apikey: A, "content-type": "application/json" },
      body: JSON.stringify({
        organization_id: organizationId,
        messages,
        temperature: 0.25,
        max_tokens: 900,
      }),
    });
    const data = await response.json().catch(() => ({}));
    const reply = data?.choices?.[0]?.message?.content;
    if (response.ok && reply) {
      return json({
        ...primary,
        reply: String(reply),
        ai_ready: true,
        engine: "nvidia_nim_fallback",
        model: {
          model_id: data.model || "nvidia/nemotron-3-nano-30b-a3b",
          provider: "nvidia_nim",
        },
        core_context_preserved: true,
      }, 200, origin);
    }
  } catch {
    // Keep the authenticated Cloudy Core answer if the secondary provider is unavailable.
  }

  return json(primary, 200, origin);
});
