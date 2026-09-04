const HTML=__HTML_JSON__;
const SITEKEY="__TURNSTILE_SITEKEY__";
export default {
  async fetch(req) {
    const u = new URL(req.url);
    if (u.pathname === "/health") {
      return new Response(JSON.stringify({ok:true,service:"senzik-gateway-v1",version:"diagnostic-1"}), {headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store"}});
    }
    if (u.pathname === "/robots.txt") {
      return new Response("User-agent: *\nAllow: /\nSitemap: https://senzikresidences.cloudsales.app/sitemap.xml\n", {headers:{"content-type":"text/plain;charset=utf-8"}});
    }
    if (u.pathname === "/sitemap.xml") {
      return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://senzikresidences.cloudsales.app/</loc></url></urlset>', {headers:{"content-type":"application/xml;charset=utf-8"}});
    }
    if (req.method === "GET" || req.method === "HEAD") {
      return req.method === "HEAD" ? new Response(null,{status:200}) : new Response(HTML,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public,max-age=120","x-content-type-options":"nosniff"}});
    }
    return new Response(JSON.stringify({error:"method_not_allowed"}), {status:405,headers:{"content-type":"application/json"}});
  }
};