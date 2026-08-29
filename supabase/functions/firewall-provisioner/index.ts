import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MODULE_CHECKS = [
  ['edge','cloudflare_edge'], ['edge','turnstile_waf'],
  ['validation','secure_gateway'], ['validation','payload_validation'], ['validation','dedupe_idempotency'],
  ['crm','highlevel_connection'], ['attribution','attribution_persistence'],
  ['meta','meta_capi'], ['meta','crm_feedback'], ['qa','synthetic_qa'],
] as const

type Status = 'pass'|'fail'|'blocked'|'skipped'

const ORIGINS = new Set([
  'https://app.cloudsales.app',
  'https://cloudsales.app',
  'https://www.cloudsales.app',
  'http://localhost:3000',
  'http://localhost:5173',
])

function cors(origin:string|null) {
  const allowed = origin && ORIGINS.has(origin) ? origin : 'https://app.cloudsales.app'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin)
  if (origin && !ORIGINS.has(origin)) return json({ error: 'origin_not_allowed' }, 403, origin)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: 'server_not_configured' }, 500, origin)

  const authorization = req.headers.get('authorization')
  if (!authorization) return json({ error: 'missing_authorization' }, 401, origin)

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData } = await userClient.auth.getUser()
  const user = userData.user
  if (!user) return json({ error: 'invalid_session' }, 401, origin)

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    const raw = await req.text()
    if (raw.length > 65_536) return json({ error: 'payload_too_large' }, 413, origin)
    let body:any
    try { body = JSON.parse(raw) } catch { return json({ error: 'invalid_json' }, 400, origin) }

    const organizationId = String(body?.organization_id || '').trim()
    const environment = body?.environment === 'sandbox' ? 'sandbox' : 'production'
    if (!organizationId) return json({ error: 'organization_id_required' }, 400, origin)

    const { data: membership } = await db
      .from('organization_members')
      .select('role,status')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership || membership.status !== 'active' || !['owner','admin'].includes(membership.role)) {
      return json({ error: 'forbidden' }, 403, origin)
    }

    const { data: allowed } = await db.rpc('consume_rate_limit', {
      p_bucket_key: `firewall-provision:${organizationId}:${user.id}`,
      p_limit: 30,
      p_window_seconds: 3600,
    })
    if (allowed !== true) return json({ error: 'rate_limited' }, 429, origin)

    const capabilities = sanitizeFlags(body?.capabilities)
    const credentialsStatus = sanitizeFlags(body?.credentials_status)
    const templateKey = 'junk_lead_firewall_v1'

    const { data: deployment, error } = await db.from('firewall_deployments').upsert({
      organization_id: organizationId,
      template_key: templateKey,
      template_version: 1,
      environment,
      desired_state: 'ready',
      actual_state: 'configuring',
      capabilities,
      credentials_status: credentialsStatus,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,template_key,environment' }).select().single()
    if (error) throw error

    const rows = MODULE_CHECKS.map(([module, check_key]) => {
      const state = initialStatus(module, deployment.capabilities ?? {}, deployment.credentials_status ?? {})
      return { deployment_id: deployment.id, module, check_key, ...state, updated_at: new Date().toISOString() }
    })
    const { error: checksError } = await db.from('firewall_deployment_checks').upsert(rows, { onConflict: 'deployment_id,check_key' })
    if (checksError) throw checksError

    const { data: checks, error: readError } = await db.from('firewall_deployment_checks').select('*').eq('deployment_id', deployment.id)
    if (readError) throw readError
    const required = checks ?? []
    const failed = required.some((c:any) => c.status === 'fail')
    const blocked = required.some((c:any) => c.status === 'blocked')
    const ready = required.length === MODULE_CHECKS.length && required.every((c:any) => c.status === 'pass' || c.status === 'skipped')
    const actual_state = failed ? 'failed' : ready ? 'testing' : blocked ? 'blocked' : 'configuring'

    await db.from('firewall_deployments')
      .update({ actual_state, last_error: failed ? { code: 'CHECK_FAILED' } : null, updated_at: new Date().toISOString() })
      .eq('id', deployment.id)
      .eq('organization_id', organizationId)

    await db.from('audit_log').insert({
      organization_id: organizationId,
      actor_user_id: user.id,
      actor_type: 'user',
      action: 'junk_lead_firewall.provision',
      entity_type: 'firewall_deployment',
      entity_id: deployment.id,
      success: true,
      context: { environment, template_key: templateKey, actual_state },
    })

    return json({ deployment_id: deployment.id, template_key: templateKey, environment, actual_state, checks: required }, 200, origin)
  } catch (e) {
    console.error('firewall_provisioning_failed', e)
    return json({ error: 'provisioning_failed' }, 500, origin)
  }
})

function sanitizeFlags(value:any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out:Record<string,boolean> = {}
  for (const [key, raw] of Object.entries(value).slice(0, 30)) {
    if (/^[a-z0-9_:-]{1,80}$/i.test(key) && typeof raw === 'boolean') out[key] = raw
  }
  return out
}

function initialStatus(module:string, capabilities:any, credentials:any): {status:Status, reason_code:string|null, evidence:any} {
  if (module === 'edge' && capabilities.edge === false) return { status:'skipped', reason_code:'EDGE_NOT_REQUIRED', evidence:{} }
  if (module === 'crm' && !credentials.highlevel) return { status:'blocked', reason_code:'HIGHLEVEL_AUTH_REQUIRED', evidence:{} }
  if (module === 'meta' && !credentials.meta) return { status:'blocked', reason_code:'META_AUTH_REQUIRED', evidence:{} }
  if (module === 'qa') return { status:'blocked', reason_code:'QA_PENDING', evidence:{} }
  return { status:'blocked', reason_code:'PROVISIONING_PENDING', evidence:{} }
}

function json(body:unknown, status=200, origin:string|null=null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(origin),
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff',
    },
  })
}
