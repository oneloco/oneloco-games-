#!/usr/bin/env bash
# Assembles dist/ for Cloudflare Pages from the calculators in this repo.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist/missed-revenue dist/trucking dist/audit
cp calculators/missed-revenue.html dist/missed-revenue/index.html
cp calculators/trucking-quote-leak.html dist/trucking/index.html
sed 's|^const WORKER_URL = "";|const WORKER_URL = "/api/ghl";|' calculators/audit/index.html > dist/audit/index.html
grep -q 'const WORKER_URL = "/api/ghl";' dist/audit/index.html
cp site/index.html dist/index.html
cp site/_worker.js calculators/audit/ghl-pull.js dist/
echo "Built dist/"
