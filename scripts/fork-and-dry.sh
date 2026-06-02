#!/usr/bin/env bash
set -euo pipefail

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required. Install Node.js/npm first."
  exit 1
fi

export HARDHAT_HOST=127.0.0.1
export HARDHAT_PORT=8545
LOCAL_RPC_URL="http://$HARDHAT_HOST:$HARDHAT_PORT"

if [ -f .env ]; then
  set -o allexport
  source .env
  set +o allexport
fi

if [ -z "${FORK_URL:-}" ] && [ -z "${RPC_URL:-}" ] && [ -z "${ALCHEMY_API_KEY:-}" ]; then
  echo "Missing fork source. Set FORK_URL, RPC_URL, or ALCHEMY_API_KEY in .env to use for Hardhat forking."
  exit 1
fi

echo "Starting Hardhat local fork on $LOCAL_RPC_URL"

if lsof -iTCP:"$HARDHAT_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Hardhat node is already running on port $HARDHAT_PORT, reusing existing node."
  trap 'echo "Nothing to stop (existing Hardhat node)"' EXIT
else
  npx hardhat node --hostname "$HARDHAT_HOST" --port "$HARDHAT_PORT" &
  HARDHAT_PID=$!
  trap 'echo "Stopping Hardhat fork..."; kill "$HARDHAT_PID" >/dev/null 2>&1 || true' EXIT
  sleep 5
fi

echo "Running dry-run against local fork"
RPC_URL="$LOCAL_RPC_URL" node bot-dry.js
