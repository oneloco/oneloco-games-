# globaltlm.com calculators

| Address | Page |
|---|---|
| calc.globaltlm.com | Missed Revenue Calculator (service businesses) |
| trucking.globaltlm.com | Trucking Quote Leak Calculator |
| audit.globaltlm.com | Quote Leak Audit (demo, CSV upload, Connect HighLevel) |

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
`calc.globaltlm.com`, `trucking.globaltlm.com`, `audit.globaltlm.com`.
Cloudflare will say the DNS is managed elsewhere and show a CNAME target. Do step 3, then come back and click **Check DNS records** if needed.

## 3. Add the CNAME records in Squarespace

Squarespace → **Domains** → globaltlm.com → **DNS** → **Custom records** → **Add record**:

| Host | Type | Data |
|---|---|---|
| calc | CNAME | globaltlm-calculators.pages.dev |
| trucking | CNAME | globaltlm-calculators.pages.dev |
| audit | CNAME | globaltlm-calculators.pages.dev |

If Cloudflare shows a different target in step 2, use that. DNS usually takes minutes, up to 24 hours.
Cloudflare issues the HTTPS certificates on its own once the records resolve.

## 4. Connect signups to HighLevel (optional)

1. In HighLevel, create a workflow with the **Inbound Webhook** trigger and copy its URL.
2. Cloudflare Pages project → **Settings** → **Variables and Secrets** → add a secret `SIGNUP_WEBHOOK_URL` with that URL. Redeploy.
3. Submit one test signup, then map the fields in the workflow (create contact from `email`, `name`, `agency`; tag by `page`).

Until this is set, the signup form shows "couldn't be saved" and asks people to use the booking button.

## 5. Booking links

Set `BOOKING_URL` near the top of the script in each page under `calculators/` and push.
