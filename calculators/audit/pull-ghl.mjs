#!/usr/bin/env node
// Client audit: pull a sub-account's quote requests into a CSV the Quote Leak Audit page can load.
//
//   GHL_TOKEN=pit-xxxx node pull-ghl.mjs --location <locationId> [--days 90] [--out agency.csv]
//
// The token needs only these read scopes: opportunities.readonly, conversations/message.readonly.
import { writeFileSync } from "node:fs";
import { pullAgencyData, toCsv } from "./ghl-pull.js";

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1]]);
  return acc;
}, []));
const token = process.env.GHL_TOKEN;
if (!token || !args.location) {
  console.error("Usage: GHL_TOKEN=pit-xxxx node pull-ghl.mjs --location <locationId> [--days 90] [--out agency.csv]");
  process.exit(1);
}
try {
  const { rows, meta } = await pullAgencyData({ token, locationId: args.location, days: args.days });
  const out = args.out || `quote-leak-${args.location}.csv`;
  writeFileSync(out, toCsv(rows));
  const contacted = rows.filter(r => r.first_contact_at).length;
  console.error(`Wrote ${rows.length} quote requests (${meta.from.slice(0, 10)} to ${meta.to.slice(0, 10)}) to ${out}. ${contacted} had outbound follow-up.`);
  console.error("Load the file in the Quote Leak Audit page under Upload CSV.");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
