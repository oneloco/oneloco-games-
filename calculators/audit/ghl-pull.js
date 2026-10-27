// Read-only pull of quote-request data from one HighLevel sub-account.
// Used by both the Cloudflare Worker (worker.js) and the audit CLI (pull-ghl.mjs).
// Returns one row per opportunity with only what the calculator needs:
// no names, phone numbers, emails or message text leave this function.

const API = "https://services.leadconnectorhq.com";
const VERSION = "2021-07-28";
const DAY = 86400000;

async function ghl(path, params, { token, fetchImpl }) {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}`, Version: VERSION, Accept: "application/json" } });
    if (res.status === 429 && attempt < 3) { await new Promise(r => setTimeout(r, 1000 * 2 ** attempt)); continue; }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const err = new Error(`HighLevel returned ${res.status} for ${path}${body ? ": " + body.slice(0, 200) : ""}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
}

async function pullOpportunities(ctx, since) {
  const out = [];
  let startAfter, startAfterId;
  for (let page = 0; page < 200; page++) {
    const data = await ghl("/opportunities/search", {
      location_id: ctx.locationId, status: "all", limit: 100, order: "added_desc", startAfter, startAfterId
    }, ctx);
    const items = data.opportunities || [];
    let reachedOld = false;
    for (const o of items) {
      const created = Date.parse(o.createdAt);
      if (created < since) { reachedOld = true; continue; }
      out.push(o);
    }
    const meta = data.meta || {};
    if (reachedOld || !items.length || !meta.startAfterId) break;
    startAfter = meta.startAfter; startAfterId = meta.startAfterId;
  }
  return out;
}

async function pullOutbound(ctx, since, until) {
  // contactId -> { first: epoch ms, count }
  const byContact = new Map();
  for (const channel of [undefined, "Email"]) {
    let cursor;
    for (let page = 0; page < 500; page++) {
      const data = await ghl("/conversations/messages/export", {
        locationId: ctx.locationId, channel, cursor, limit: 1000, sortBy: "createdAt", sortOrder: "asc",
        startDate: new Date(since).toISOString(), endDate: new Date(until).toISOString()
      }, ctx);
      for (const m of data.messages || []) {
        if (m.direction !== "outbound" || !m.contactId) continue;
        const t = Date.parse(m.dateAdded);
        if (!Number.isFinite(t)) continue;
        const cur = byContact.get(m.contactId);
        if (!cur) byContact.set(m.contactId, { first: t, count: 1 });
        else { cur.count++; if (t < cur.first) cur.first = t; }
      }
      if (!data.nextCursor || !(data.messages || []).length) break;
      cursor = data.nextCursor;
    }
  }
  return byContact;
}

function normStatus(s) {
  s = String(s || "").toLowerCase();
  if (s === "won") return "won";
  if (s === "lost" || s === "abandoned") return "lost";
  return "open";
}

export async function pullAgencyData({ token, locationId, days = 90, fetchImpl = fetch, now = Date.now() }) {
  if (!token || !locationId) throw new Error("A HighLevel token and location ID are required.");
  days = Math.min(365, Math.max(14, Number(days) || 90));
  const since = now - days * DAY;
  const ctx = { token, locationId, fetchImpl };
  const opps = await pullOpportunities(ctx, since);
  const outbound = await pullOutbound(ctx, since, now);
  const rows = opps.map(o => {
    const created = Date.parse(o.createdAt);
    const ob = outbound.get(o.contactId);
    // Only count outreach that happened after the request came in.
    const first = ob && ob.first >= created - 60000 ? ob.first : null;
    return {
      created_at: new Date(created).toISOString(),
      status: normStatus(o.status),
      premium: Number(o.monetaryValue) > 0 ? Number(o.monetaryValue) : "",
      first_contact_at: first ? new Date(first).toISOString() : "",
      outbound_count: ob ? ob.count : 0,
      source: o.source || ""
    };
  });
  return { rows, meta: { days, from: new Date(since).toISOString(), to: new Date(now).toISOString(), opportunities: rows.length } };
}

export const CSV_COLUMNS = ["created_at", "status", "premium", "first_contact_at", "outbound_count", "source"];

export function toCsv(rows) {
  const esc = v => { v = String(v ?? ""); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  return [CSV_COLUMNS.join(","), ...rows.map(r => CSV_COLUMNS.map(c => esc(r[c])).join(","))].join("\n") + "\n";
}
