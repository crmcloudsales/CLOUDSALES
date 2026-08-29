import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Disabled legacy Cloudflare source-audit endpoint.
 *
 * The previous implementation anonymously used the production Cloudflare API
 * token to download Worker source and returned source excerpts. Production
 * diagnostics must not expose privileged infrastructure reads publicly.
 */

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

Deno.serve(() => new Response(JSON.stringify({
  error: "legacy_audit_endpoint_disabled",
  status: "disabled",
  reason: "anonymous_cloudflare_source_access_removed",
}), { status: 410, headers }));
