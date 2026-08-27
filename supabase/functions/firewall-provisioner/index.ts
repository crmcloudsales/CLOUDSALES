import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MODULE_CHECKS = [
  ['edge','cloudflare_edge'], ['edge','turnstile_waf'],
  ['validation','secure_gateway'], ['validation','payload_validation'], ['validation','dedupe_idempotency'],
  ['crm','highlevel_connection'], ['attribution','attribution_persistence'],
  ['meta','meta_capi'], ['meta','crm_feedback'], ['qa','synthetic_qa'],
] as const

type Status = 'pass'|'fail'|'blocked'|'skipped'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (!supabaseUrl || !serviceKey) return json({ error: 'server_not_configured' }, 500)
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  try {
    const body = await req.json()
    const organizationId = body.organization_id
    const environment = body.environment === 'sandbox' ? 'sandbox' : 'production'
    if (!organizationId) return json({ error: 'organization_id_required' }, 400)

    const templateKey = 'junk_lead_firewall_v1'
    const { data: deployment, error } = await db.from('firewall_deployments').upsert({
      organization_id: organizationId,
      template_key: templateKey,
      template_version: 1,
      environment,
      desired_state: 'ready',
      actual_state: 'configuring',
      capabilities: body.capabilities ?? {},
      credentials_status: body.credentials_status ?? {},
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,template_key,environment' }).select().single()
    if (error) throw error

    const capabilities = deployment.capabilities ?? {}
    const credentials = deployment.credentials_status ?? {}
    const rows = MODULE_CHECKS.map(([module, check_key]) => {
      const state = initialStatus(module, capabilities, credentials)
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

    await db.from('firewall_deployments').update({ actual_state, last_error: failed ? { code: 'CHECK_FAILED' } : null, updated_at: new Date().toISOString() }).eq('id', deployment.id)
    return json({ deployment_id: deployment.id, template_key: templateKey, environment, actual_state, checks: required })
  } catch (e) {
    console.error(e)
    return json({ error: 'provisioning_failed', detail: String(e?.message ?? e) }, 500)
  }
})

function initialStatus(module:string, capabilities:any, credentials:any): {status:Status, reason_code:string|null, evidence:any} {
  if (module === 'edge' && capabilities.edge === false) return { status:'skipped', reason_code:'EDGE_NOT_REQUIRED', evidence:{} }
  if (module === 'crm' && !credentials.highlevel) return { status:'blocked', reason_code:'HIGHLEVEL_AUTH_REQUIRED', evidence:{} }
  if (module === 'meta' && !credentials.meta) return { status:'blocked', reason_code:'META_AUTH_REQUIRED', evidence:{} }
  if (module === 'qa') return { status:'blocked', reason_code:'QA_PENDING', evidence:{} }
  return { status:'blocked', reason_code:'PROVISIONING_PENDING', evidence:{} }
}

function json(body:unknown, status=200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type':'application/json' } })
}
