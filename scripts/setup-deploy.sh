#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is required. Install it first."
  exit 1
fi

if [ -z "${GITHUB_REPOSITORY:-}" ]; then
  echo "Error: Set GITHUB_REPOSITORY to your repo slug, e.g. owner/GGD-DEXEX"
  echo "Example: export GITHUB_REPOSITORY=calliotuya33-coder/GGD-DEXEX"
  exit 1
fi

SECRETS=(VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID)
for secret in "${SECRETS[@]}"; do
  if [ -z "${!secret:-}" ]; then
    echo "Skipping $secret: environment variable not set"
  else
    echo "Setting GitHub secret: $secret"
    gh secret set "$secret" --body "${!secret}" --repo "$GITHUB_REPOSITORY"
  fi
done

echo "\nDeployment helper complete."

echo "If you also want to set Vercel environment variables, use the Vercel dashboard or the Vercel CLI." 
if command -v vercel >/dev/null 2>&1; then
  echo "Vercel CLI is installed. You can use 'vercel env add' after login."
else
  echo "Vercel CLI is not installed in this environment. Install it to set Vercel env vars from the command line."
fi
