#!/usr/bin/env bash
# Builds the three projects, subscribes the dashboard to the relay, runs Playwright, tears down.
#   SCHEDULING_API_DIR / WEBHOOK_RELAY_DIR: checkouts of the other projects (default: sibling folders)
#   KEEP=1 ./e2e/run.sh   leaves the stack running afterwards (for debugging)
#   Extra arguments go to Playwright, e.g. ./e2e/run.sh -g "booking"
set -euo pipefail
E2E_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$E2E_DIR")"
# Always address the compose file explicitly: the cleanup trap runs from whatever directory we are in.
compose() { docker compose --project-directory "$E2E_DIR" -f "$E2E_DIR/docker-compose.yml" "$@"; }

cleanup() {
  compose logs --tail=80 relay scheduling dashboard > "$E2E_DIR/e2e-logs.txt" 2>&1 || true
  if [ "${KEEP:-0}" != "1" ]; then compose --profile tools down --volumes > /dev/null 2>&1 || true; fi
}
trap cleanup EXIT

# Start from scratch: a stack left over from an earlier run would carry its data into this one.
compose --profile tools down --volumes > /dev/null 2>&1 || true

echo "- building and starting SchedulingApi, WebhookRelay and the databases"
compose up --detach --build --wait relay-db relay scheduling-db dashboard-db
compose up --detach --build scheduling

node "$E2E_DIR/setup.mjs"

echo "- migrating and starting the dashboard"
compose --env-file "$E2E_DIR/.env.generated" --profile tools run --rm --build dashboard-migrate
compose --env-file "$E2E_DIR/.env.generated" up --detach --build --wait dashboard

cd "$ROOT"
E2E_BASE_URL=http://localhost:3200 SCHEDULING_URL=http://localhost:8380 npx playwright test "$@"
