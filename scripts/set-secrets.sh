#!/usr/bin/env bash
# Example helper script to set GitHub secrets and Vercel env vars locally.
# WARNING: This script only illustrates commands. Do NOT store secrets in plain files.

set -e

echo "---- Set GitHub repository secrets (requires gh CLI and auth) ----"
echo "Run:
# export GITHUB_REPOSITORY=owner/repo
# gh secret set VERCEL_TOKEN --body \"your_vercel_token\"
# gh secret set VERCEL_ORG_ID --body \"your_vercel_org_id\"
# gh secret set VERCEL_PROJECT_ID --body \"your_vercel_project_id\"
"

echo "---- Set Vercel environment variables (requires vercel CLI and login) ----"
echo "Run example commands (interactive for some values):
# vercel login
# vercel env add RPC_URL production
# vercel env add BOT_PRIVATE_KEY production
# vercel env add FLASHBOTS_SIGNING_KEY production
# vercel env add ARBITRAGE_CONTRACT production
# vercel env add TOKEN_ADDRESS production
# vercel env add ETHERSCAN_API_KEY production
"

echo "If you prefer non-interactive, use 'gh secret set' for GitHub and 'vercel env pull/push' workflows or API calls."

echo "Done. Review and run the commands above with your real secret values."
