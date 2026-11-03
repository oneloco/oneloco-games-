# Lead calculators

Two standalone pages. Open either file in a browser or host it anywhere.

| File | Audience | What it estimates |
|---|---|---|
| `missed-revenue.html` | Service businesses | Monthly and yearly revenue lost to inquiries that never get follow-up |
| `trucking-quote-leak.html` | Trucking insurance agencies | Commission lost to unworked quote requests and renewals lost for lack of outreach |
| `cost-per-mile.html` | Owner-operators (lead magnet for trucking agencies) | True cost per mile by category, break-even rate per loaded mile, profit, and insurance's share of every mile |
| `ad-cost-calculator.html` | Trucking insurance agencies | CPM solver, plus ad spend → clicks → quote requests → bound policies, cost per bind and commission payback |

## Before sharing

- **Booking button:** set `BOOKING_URL` near the top of each page's script to your calendar link. While it's empty, the button shows a "booking is being set up" note.
- **Email signup:** the form saves to the Claude artifact database and only works when the page runs as a Claude artifact. When hosting the file elsewhere, connect the form to a GoHighLevel form or webhook instead.

All results are labeled as estimates. The assumptions are listed on each page.
