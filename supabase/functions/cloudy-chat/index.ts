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

const normalized = (value: string) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

function chooseAgent(message: string, agents: any[]) {
  const lower = normalized(message);
  const active = (agents || []).filter((agent: any) => agent.status === "active");
  const byTemplates = (templates: string[]) => templates
    .map((template) => active.find((agent: any) => agent.template_key === template))
    .find(Boolean) || null;

  const rules = [
    {
      match: /\b(cita|citas|appointment|agenda|agendar|reservar|calendario|calendar|reunion|meeting|visita|tour)\b/,
      templates: ["appointment_setter"],
    },
    {
      match: /\b(seguimiento|follow[ -]?up|whatsapp|sms|correo|email|mensaje|message|contactar|llamar|outreach)\b/,
      templates: ["omnichannel_sdr", "sales_copilot"],
    },
    {
      match: /\b(calificar|calificacion|qualif|lead|leads|prospecto|prospectos|inbound|nuevo contacto|new contact)\b/,
      templates: ["inbound_concierge", "sales_copilot"],
    },
    {
      match: /\b(meta|google ads|ads|anuncio|anuncios|campana|campanas|campaign|campaigns|presupuesto|budget|roi|roas|marketing|audiencia|audience)\b/,
      templates: ["ads_operator", "marketing_analyst"],
    },
    {
      match: /\b(pipeline|oportunidad|opportunity|etapa|stage|crm|asignar|assign|contacto|contact)\b/,
      templates: ["sales_copilot", "crm_hygiene"],
    },
    {
      match: /\b(error|falla|fallo|bug|problema tecnico|technical issue|soporte|support|diagnostico|diagnose)\b/,
      templates: ["support_specialist"],
    },
  ];

  for (const rule of rules) {
    if (rule.match.test(lower)) {
      const match = byTemplates(rule.templates);
      if (match) return match;
    }
  }
  return null;
}

function publicAgent(agent: any) {
  return agent ? {
    id: agent.id,
    name: agent.name,
    template_key: agent.template_key,
    autonomy_mode: agent.autonomy_mode,
  } : null;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (origin && !ORIGINS.has(origin)) return json({ error: "origin_not_allowed" }, 403, origin);

  const auth = req.headers.get("authorization");
  if (!auth) return json({ error: "missing_authorization" }, 401, origin);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, origin);
  }

  const organizationId = String(body.organization_id || "");
  const message = String(body.message || "").trim();
  if (!organizationId || !message) return json({ error: "organization_id_and_message_required" }, 400, origin);

  const userClient = createClient(U, A, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) return json({ error: "invalid_session" }, 401, origin);

  const svc = createClient(U, S, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: membership } = await svc.from("organization_members")
    .select("role,status")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || membership.status !== "active") return json({ error: "forbidden" }, 403, origin);

  const { data: agents } = await svc.from("cloudy_agents")
    .select("id,name,template_key,status,autonomy_mode")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  let delegatedAgent: any = null;
  if (body.agent_id) {
    delegatedAgent = (agents || []).find((agent: any) => agent.id === String(body.agent_id)) || null;
  } else {
    delegatedAgent = chooseAgent(message, agents || []);
    if (delegatedAgent) body.agent_id = delegatedAgent.id;
  }

  const forwardedBody = JSON.stringify(body);
  const upstream = await fetch(`${U}/functions/v1/cloudy-orchestrator`, {
    method: "POST",
    headers: {
      authorization: auth,
      apikey: A,
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: forwardedBody,
  });

  const upstreamText = await upstream.text();
  let primary: any;
  try { primary = JSON.parse(upstreamText); }
  catch { primary = { error: "orchestrator_bad_response" }; }
  if (!upstream.ok) return json(primary, upstream.status, origin);

  const decorated = delegatedAgent
    ? { ...primary, delegated_agent: publicAgent(delegatedAgent) }
    : primary;

  if (decorated?.ai_ready !== false || !decorated?.reply) return json(decorated, upstream.status, origin);

  try {
    const locale = String(body.locale || "es");
    const context = String(decorated.reply || "").slice(0, 2500);
    const agentContext = delegatedAgent
      ? ` AgentCloud delegated specialist: ${delegatedAgent.name} (${delegatedAgent.template_key}). Keep Cloudy as the visible conversational identity; use the specialist context silently.`
      : "";
    const messages = [
      {
        role: "system",
        content: `You are Cloudy, the AI Business Operator inside CloudSales. Respond naturally in ${locale}. Continue the user's conversation rather than restarting it. Do not repeat the same sentence or generic capability statement. Answer the user's actual request first. Be concise, competent, proactive and business-focused. Never expose secrets. Never claim an action was executed unless CloudSales confirms it.${agentContext} If operational context is useful, use it silently: ${context}`,
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
        ...decorated,
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

  return json(decorated, 200, origin);
});