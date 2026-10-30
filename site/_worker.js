// Cloudflare Pages worker for the globaltlm.com calculators.
// - Sends each subdomain to its calculator (see SITES).
// - /api/ghl relays a read-only HighLevel pull for the Quote Leak Audit. The token is never stored or logged.
// - /api/signup forwards calculator email signups to a HighLevel inbound webhook (SIGNUP_WEBHOOK_URL secret).
import { pullAgencyData } from "./ghl-pull.js";

const SITES = {
  calc: "/missed-revenue/",
  trucking: "/trucking/",
  audit: "/audit/"
};

const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function readJson(req) {
  if (req.method !== "POST") return [null, json({ error: "Use POST." }, 405)];
  const len = Number(req.headers.get("Content-Length") || 0);
  if (len > 20000) return [null, json({ error: "Request too large." }, 413)];
  try { return [await req.json(), null]; } catch { return [null, json({ error: "Send JSON." }, 400)]; }
}

async function ghl(req) {
  const [body, err] = await readJson(req);
  if (err) return err;
  const token = String(body.token || "").trim();
  const locationId = String(body.locationId || "").trim();
  if (!/^pit-[\w-]+$/.test(token)) return json({ error: "That doesn't look like a Private Integration token. It starts with pit-." }, 400);
  if (!/^[A-Za-z0-9]{10,40}$/.test(locationId)) return json({ error: "Enter the sub-account's location ID from Settings > Business Profile." }, 400);
  try {
    return json(await pullAgencyData({ token, locationId, days: body.days }));
  } catch (e) {
    if (e.status === 401 || e.status === 403) return json({ error: "HighLevel refused the token. Check that it belongs to this sub-account and has the View Opportunities and View Conversation Messages scopes." }, 401);
    return json({ error: "HighLevel didn't answer the request. Try again in a minute." }, 502);
  }
}

const ATTRIBUTION_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "platform", "fbclid", "landing_page", "referrer", "first_seen"];

async function signup(req, env) {
  const [body, err] = await readJson(req);
  if (err) return err;
  const email = String(body.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return json({ error: "Enter a valid email address." }, 400);
  if (!env.SIGNUP_WEBHOOK_URL) return json({ error: "Signups aren't connected yet." }, 503);
  const clip = v => String(v ?? "").slice(0, 200);
  const payload = {
    email, name: clip(body.name), last_name: clip(body.lastName), agency: clip(body.agency), page: clip(body.page),
    phone: /^\+1\d{10}$/.test(String(body.phone || "")) ? String(body.phone) : undefined,
    sms_consent: body.smsConsent === true ? "yes" : "no",
    estimated_monthly_loss: Number(body.estimatedMonthlyLoss) || undefined,
    estimated_annual_commission_loss: Number(body.estimatedAnnualCommissionLoss) || undefined,
    inputs: body.inputs && typeof body.inputs === "object" ? body.inputs : undefined,
    submitted_at: new Date().toISOString()
  };
  // Ad attribution from the landing page (first-touch UTM + fbclid), passed through flat as strings.
  for (const k of ATTRIBUTION_FIELDS) payload[k] = String(body[k] ?? "").slice(0, 500);
  const res = await fetch(env.SIGNUP_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  return res.ok ? json({ ok: true }) : json({ error: "Signup couldn't be saved." }, 502);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api/ghl") return ghl(req);
    if (url.pathname === "/api/signup") return signup(req, env);
    const dir = SITES[url.hostname.split(".")[0]];
    if (dir && !url.pathname.startsWith(dir)) {
      url.pathname = dir + url.pathname.replace(/^\/+/, "");
      return env.ASSETS.fetch(new Request(url, req));
    }
    return env.ASSETS.fetch(req);
  }
};
