#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  read -rsp "Paste CLOUDFLARE_API_TOKEN: " CLOUDFLARE_API_TOKEN
  echo
  export CLOUDFLARE_API_TOKEN
fi

if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  read -rp "Paste CLOUDFLARE_ACCOUNT_ID: " CLOUDFLARE_ACCOUNT_ID
  export CLOUDFLARE_ACCOUNT_ID
fi

echo "Installing dependencies..."
npm install

echo "Running checks..."
npm test

echo "Deploying with API token only..."
npx wrangler deploy

echo "Deployment command completed."
