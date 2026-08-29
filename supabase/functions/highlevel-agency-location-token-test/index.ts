import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Disabled legacy diagnostic endpoint.
 *
 * The previous implementation read a production HighLevel agency credential
 * from Vault and exchanged it for a location token on every unauthenticated
 * request. Diagnostic endpoints must never perform privileged production
 * credential operations anonymously.
 */

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

Deno.serve(() => new Response(JSON.stringify({
  error: "legacy_test_endpoint_disabled",
  status: "disabled",
  reason: "production_secret_operation_removed",
}), { status: 410, headers }));
