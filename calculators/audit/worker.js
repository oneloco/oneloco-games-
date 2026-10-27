// Cloudflare Worker behind the "Connect HighLevel" button on the Quote Leak Audit page.
// Browsers can't call the HighLevel API directly, so this relays one read-only pull.
// It never stores or logs the token and returns only the anonymized rows from ghl-pull.js.
//
// Deploy: `npx wrangler deploy` with wrangler.toml pointing main = "worker.js".
// Set ALLOWED_ORIGIN to the site hosting the page (for example https://audit.oneloco.io).
import { pullAgencyData } from "./ghl-pull.js";

function cors(env, req) {
  const allowed = env.ALLOWED_ORIGIN || "*";
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": allowed === "*" ? "*" : (origin === allowed ? origin : allowed),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

export default {
  async fetch(req, env) {
    const headers = cors(env, req);
    if (req.method === "OPTIONS") return new Response(null, { headers });
    if (req.method !== "POST") return new Response("Use POST", { status: 405, headers });
    let body;
    try { body = await req.json(); } catch { return Response.json({ error: "Send JSON with token and locationId." }, { status: 400, headers }); }
    const token = String(body.token || "").trim();
    const locationId = String(body.locationId || "").trim();
    if (!/^pit-[\w-]+$/.test(token)) return Response.json({ error: "That doesn't look like a Private Integration token. It starts with pit-." }, { status: 400, headers });
    if (!/^[A-Za-z0-9]{10,40}$/.test(locationId)) return Response.json({ error: "Enter the sub-account's location ID from Settings > Business Profile." }, { status: 400, headers });
    try {
      const data = await pullAgencyData({ token, locationId, days: body.days });
      return Response.json(data, { headers });
    } catch (e) {
      const status = e.status === 401 || e.status === 403 ? 401 : 502;
      const error = status === 401
        ? "HighLevel refused the token. Check that it belongs to this sub-account and has the opportunities and conversation message read scopes."
        : "HighLevel didn't answer the request. Try again in a minute.";
      return Response.json({ error }, { status, headers });
    }
  }
};
