#!/usr/bin/env bash
# Regenerate visual regression baselines in the same Linux image CI uses.
# Review the changed PNGs in e2e/__screenshots__ before committing them.
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(node -p "require('./node_modules/@playwright/test/package.json').version")
docker run --rm --platform linux/amd64 --ipc=host \
  -v "$PWD":/work -v shortkeys-linux-node-modules:/work/node_modules -w /work \
  "mcr.microsoft.com/playwright:v${version}-noble" \
  bash -c "npm ci --no-audit --no-fund && npm run build && npx playwright test --project visual --update-snapshots=all --reporter=line"
