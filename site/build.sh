#!/usr/bin/env bash
# Assembles dist/ for Cloudflare Pages from the calculators in this repo.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist/missed-revenue dist/trucking/thank-you dist/audit dist/cpm dist/ads dist/home dist/home/not-found
cp calculators/missed-revenue.html dist/missed-revenue/index.html
cp calculators/trucking-quote-leak.html dist/trucking/index.html
cp calculators/trucking-thank-you.html dist/trucking/thank-you/index.html
cp calculators/cost-per-mile.html dist/cpm/index.html
cp calculators/ad-cost-calculator.html dist/ads/index.html
# Global TLM home page: www./bare globaltlm.com at "/" and /home-preview/ on the Pages address (see _worker.js).
cp calculators/home.html dist/home/index.html
cp calculators/home-404.html dist/home/not-found/index.html
# Lead magnet PDF, served at /Trucking-Agency-Follow-Up-Playbook.pdf on calc. and trucking.
cp site/files/Trucking-Agency-Follow-Up-Playbook.pdf dist/missed-revenue/
cp site/files/Trucking-Agency-Follow-Up-Playbook.pdf dist/trucking/
sed 's|^const WORKER_URL = "";|const WORKER_URL = "/api/ghl";|' calculators/audit/index.html > dist/audit/index.html
grep -q 'const WORKER_URL = "/api/ghl";' dist/audit/index.html
cp site/index.html dist/index.html
cp site/_worker.js calculators/audit/ghl-pull.js dist/
# Meta Pixel ID for the trucking pages (empty = no pixel).
PIXEL_ID="$(tr -cd '0-9' < site/meta-pixel-id.txt 2>/dev/null || true)"
sed -i "s/__META_PIXEL_ID__/${PIXEL_ID}/" dist/trucking/index.html dist/trucking/thank-you/index.html dist/home/index.html
echo "Built dist/ (pixel: ${PIXEL_ID:-none})"
