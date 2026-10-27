# Quote Leak Audit

Loads real quote requests and fills in the trucking calculator from data instead of guesses:
requests per month, % never followed up, time to first response, bind rate and average premium.
Commission rate and renewals are still entered by hand.

## Three ways to load data

| Mode | Who it's for | How |
|---|---|---|
| Demo agency | Sales calls, content, walkthroughs | Built in. A fictional agency with 90 days of generated data. |
| Upload CSV | Any agency, any CRM or AMS | Export leads/opportunities, drop the file on the page. Parsed in the browser, never uploaded. |
| Connect HighLevel | Agencies on GHL | Paste a read-only Private Integration token + location ID. Works on the hosted site. |

## Client audits (One Loco)

```
GHL_TOKEN=pit-xxxx node pull-ghl.mjs --location <locationId> --days 90 --out client.csv
```

Then open `index.html`, choose **Upload CSV** and load `client.csv`.
The token only needs **View Opportunities** and **View Conversation Messages**.
The CSV holds dates, statuses and premium values only. No names, phones, emails or message text.

## Turning on "Connect HighLevel"

The hosted site (see `site/README.md`) serves this page at audit.globaltlm.com with the HighLevel relay at `/api/ghl`, so the button works there with no extra setup.

## Files

- `index.html` – the audit page (standalone)
- `ghl-pull.js` – shared HighLevel pull (opportunities + outbound messages → anonymized rows)
- `pull-ghl.mjs` – CLI for client audits
- The relay for the Connect HighLevel button lives in `site/_worker.js`

## How the numbers are measured

- **Quote request:** an opportunity created in the window.
- **Follow-up:** the first outbound SMS, call, email, WhatsApp, Facebook or Instagram message to that contact after the request came in.
  Calls from personal cell phones that aren't logged in GHL won't count.
- **Bind rate:** won ÷ (won + lost) among requests that got a follow-up. Open requests are left out. GHL "abandoned" counts as lost.
- **Average premium:** mean `monetaryValue` of won opportunities that have one.

Not yet tested against a live HighLevel sub-account.
