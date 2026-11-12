// Cloudflare Pages worker for the globaltlm.com calculators.
// - Sends each subdomain to its calculator (see SITES).
// - /api/ghl relays a read-only HighLevel pull for the Quote Leak Audit. The token is never stored or logged.
// - /api/signup forwards calculator email signups to a HighLevel inbound webhook (SIGNUP_WEBHOOK_URL secret).
// - www.globaltlm.com and globaltlm.com get the Global TLM home page at "/" (see HOME_HOSTS). The Pages
//   address shows it at /home-preview/ with a noindex header.
import { pullAgencyData } from "./ghl-pull.js";

const SITES = {
  calc: "/missed-revenue/",
  trucking: "/trucking/",
  audit: "/audit/",
  cpm: "/cpm/",
  ads: "/ads/"
};

// Hosts that get the home page. DNS doesn't point them here yet, so this is ready for go-live only.
const HOME_HOSTS = new Set(["globaltlm.com", "www.globaltlm.com"]);
const noindex = res => { const r = new Response(res.body, res); r.headers.set("X-Robots-Tag", "noindex"); return r; };

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
    if (HOME_HOSTS.has(url.hostname)) {
      if (url.pathname === "/" || url.pathname === "/index.html") url.pathname = "/home/";
      else if (url.pathname === "/thank-you/" || url.pathname === "/thank-you") url.pathname = "/trucking/thank-you/";
      else {
        // Any other path on www/bare gets the Global TLM not-found page with a real 404.
        url.pathname = "/home/not-found/";
        const page = await env.ASSETS.fetch(new Request(url, req));
        return new Response(page.body, { status: 404, headers: page.headers });
      }
      return env.ASSETS.fetch(new Request(url, req));
    }
    // Home page preview on the Pages address only, marked noindex. /thank-you/ there is the trucking
    // thank-you page, so a preview signup lands where a live one will.
    if (!dir) {
      if (url.pathname === "/home-preview/" || url.pathname === "/home-preview") {
        url.pathname = "/home/";
        return noindex(await env.ASSETS.fetch(new Request(url, req)));
      }
      if (url.pathname.startsWith("/home/")) return noindex(await env.ASSETS.fetch(req));
      if (url.pathname === "/thank-you/") {
        url.pathname = "/trucking/thank-you/";
        return noindex(await env.ASSETS.fetch(new Request(url, req)));
      }
    }
    return env.ASSETS.fetch(req);
  }
};
