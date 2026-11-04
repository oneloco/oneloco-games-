# globaltlm.com calculators

| Address | Page |
|---|---|
| calc.globaltlm.com | Missed Revenue Calculator (service businesses) |
| trucking.globaltlm.com | Trucking Quote Leak Calculator |
| audit.globaltlm.com | Quote Leak Audit (demo, CSV upload, Connect HighLevel) |
| cpm.globaltlm.com | Trucking Cost Per Mile Calculator (owner-operators) |
| ads.globaltlm.com | Trucking Ad Cost Calculator (ad CPM to cost per bound policy) |

Hosted on Cloudflare Pages (free). DNS stays in Squarespace.
`_worker.js` picks the page from the subdomain and handles `/api/ghl` and `/api/signup`.

## 1. Create the Cloudflare Pages project (once)

Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → pick `oneloco/oneloco-games-`.

- Production branch: the branch holding this folder
- Framework preset: None
- Build command: `bash site/build.sh`
- Build output directory: `dist`
- Project name: `globaltlm-calculators` (the site will be at `globaltlm-calculators.pages.dev`)

Every push to the branch redeploys. To deploy by hand instead: `bash site/build.sh && npx wrangler pages deploy dist --project-name globaltlm-calculators`.

## 2. Add the custom domains in Cloudflare

Pages project → **Custom domains** → **Set up a custom domain**. Add each one:
`calc.globaltlm.com`, `trucking.globaltlm.com`, `audit.globaltlm.com`, `cpm.globaltlm.com`, `ads.globaltlm.com`.
Cloudflare will say the DNS is managed elsewhere and show a CNAME target. Do step 3, then come back and click **Check DNS records** if needed.

## 3. Add the CNAME records in Squarespace

Squarespace → **Domains** → globaltlm.com → **DNS** → **Custom records** → **Add record**:

| Host | Type | Data |
|---|---|---|
| calc | CNAME | globaltlm-calculators.pages.dev |
| trucking | CNAME | globaltlm-calculators.pages.dev |
| audit | CNAME | globaltlm-calculators.pages.dev |
| cpm | CNAME | globaltlm-calculators.pages.dev |
| ads | CNAME | globaltlm-calculators.pages.dev |

If Cloudflare shows a different target in step 2, use that. DNS usually takes minutes, up to 24 hours.
Cloudflare issues the HTTPS certificates on its own once the records resolve.

## 4. Connect signups to HighLevel (optional)

1. In HighLevel, create a workflow with the **Inbound Webhook** trigger and copy its URL.
2. Cloudflare Pages project → **Settings** → **Variables and Secrets** → add a secret `SIGNUP_WEBHOOK_URL` with that URL. Redeploy.
3. Submit one test signup, then map the fields in the workflow (create contact from `email`, `name`, `agency`; tag by `page`).

Until this is set, the signup form shows "couldn't be saved".

## Handoff Nov 4

This repo is now owned by the "GTLM Site" chat. The trucker quote funnel belongs to the "TLM Funnel" chat.

### Current state

- All five domains are live: calc, trucking, audit, cpm and ads `.globaltlm.com`.
- `SIGNUP_WEBHOOK_URL` is set in Cloudflare.
- **Rule: no booking or calendar links anywhere. Booking happens by text bot only.**

### Booking links: removed Nov 4

All booking and calendar links are gone from the built pages:

- calc (`missed-revenue.html`), audit (`audit/index.html`) and ads (`ad-cost-calculator.html`): the booking buttons now link to https://trucking.globaltlm.com/ ("Get the free checklist + playbook"). `BOOKING_URL`, the "booking is being set up" notes and the wiring scripts are deleted.
- cpm (`cost-per-mile.html`): the insurance-review button, its empty `BOOKING_URL` and its note are deleted, with no replacement.
- trucking (`trucking-quote-leak.html`): no booking links. The SMS consent wording ("text me… to schedule") stays, because it fits the text-bot rule.
- `calculators/trucking-book.html` still has the old GHL calendar embed. It isn't copied by `site/build.sh`, so it isn't deployed.

`calculators/audit/ghl-pull.js` calls the HighLevel API host. That's the data pull for the audit, not a booking link.

### What's where

| Path | What it is |
|---|---|
| `GAMES_LINKS.md` | Browser-game links pulled from an Instagram screenshot |
| `index.html` | Game Shelf: click-to-play dashboard for those games (not part of the globaltlm site) |
| `velma/` | Velma kibble GIF and MP4 (added outside this chat) |
| `calculators/missed-revenue.html` | Missed Revenue Calculator for service businesses → calc.globaltlm.com |
| `calculators/trucking-quote-leak.html` | Trucking agency landing page and quote leak calculator → trucking.globaltlm.com |
| `calculators/trucking-thank-you.html` | Thank-you page after the trucking signup → trucking.globaltlm.com/thank-you/ |
| `calculators/trucking-book.html` | Old booking page with GHL calendar embed. Not deployed. |
| `calculators/cost-per-mile.html` | Owner-operator cost per mile calculator → cpm.globaltlm.com |
| `calculators/ad-cost-calculator.html` | Ad CPM to cost per bound policy → ads.globaltlm.com |
| `calculators/audit/index.html` | Quote Leak Audit (demo, CSV upload, Connect HighLevel) → audit.globaltlm.com |
| `calculators/audit/ghl-pull.js` | Read-only HighLevel pull (opportunities + outbound messages → anonymized rows). Used by the worker and the CLI. |
| `calculators/audit/pull-ghl.mjs` | CLI for client audits: `GHL_TOKEN=pit-… node pull-ghl.mjs --location <id>` → CSV for the audit page |
| `calculators/README.md`, `calculators/audit/README.md` | Docs for the calculators and the audit |
| `site/_worker.js` | Cloudflare Pages worker: subdomain → page routing (`SITES`), `/api/ghl` HighLevel relay, `/api/signup` → `SIGNUP_WEBHOOK_URL` |
| `site/build.sh` | Builds `dist/` (Cloudflare build command `bash site/build.sh`, output `dist`). Injects the Meta Pixel ID into the trucking pages. |
| `site/index.html` | Root page listing all calculators (globaltlm-calculators.pages.dev) |
| `site/files/Trucking-Agency-Follow-Up-Playbook.pdf` | Lead magnet PDF, served on calc. and trucking. |
| `site/meta-pixel-id.txt` | Meta Pixel ID used by `build.sh` |
| `site/README.md` | Deploy steps (Cloudflare, Squarespace DNS, signup webhook) and this handoff |
| `dist/` | Build output, git-ignored |

The tag `quote-leak-audit-v1` was created locally but never reached GitHub.
