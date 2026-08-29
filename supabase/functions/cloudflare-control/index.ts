import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Legacy Cloudflare production-control endpoint.
 *
 * This function previously promoted a hard-coded CloudSales PWA release
 * (2026.08.25.1) and reassigned app.cloudsales.app to the legacy
 * `cloudsales-pwa` Worker. Production was later documented on the v4 release
 * path (2026.08.27.2), so leaving the old promotion routine executable creates
 * a rollback risk.
 *
 * Keep this endpoint fail-closed until Cloudflare deployment control is rebuilt
 * around an explicit, versioned release artifact with commit/release matching,
 * staging smoke tests and rollback metadata.
 */

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

Deno.serve(async () =>
  new Response(
    JSON.stringify({
      error: "legacy_cloudflare_control_disabled",
      status: "disabled",
      reason: "unsafe_hard_coded_release_promotion",
    }),
    { status: 410, headers },
  )
);
