#!/usr/bin/env bash
set -euo pipefail

DEMO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_HOST="${HOST:-127.0.0.1}"
DEMO_PORT="${PORT:-3000}"
DEMO_BASE_URL="http://${DEMO_HOST}:${DEMO_PORT}"
DEMO_TEMP_DIR="$(mktemp -d)"
DEMO_SERVER_PID=""

cleanup() {
  if [[ -n "${DEMO_SERVER_PID}" ]] && kill -0 "${DEMO_SERVER_PID}" 2>/dev/null; then
    kill "${DEMO_SERVER_PID}" 2>/dev/null || true
    wait "${DEMO_SERVER_PID}" 2>/dev/null || true
  fi
  rm -rf "${DEMO_TEMP_DIR}"
}

trap cleanup EXIT INT TERM

create_request() {
  local output_file="$1"
  local steps_json="$2"

  node --input-type=module -e '
    import { readFileSync, writeFileSync } from "node:fs";
    const transactions = JSON.parse(readFileSync(process.argv[1], "utf8"));
    const steps = JSON.parse(process.argv[3]);
    writeFileSync(process.argv[2], JSON.stringify({ steps, transactions }));
  ' "${DEMO_ROOT}/sample-transactions.json" "${output_file}" "${steps_json}"
}

submit_run() {
  local request_file="$1"
  curl --silent --show-error --fail-with-body \
    --request POST \
    --header "content-type: application/json" \
    --data-binary "@${request_file}" \
    "${DEMO_BASE_URL}/pipeline/run"
}

cd "${DEMO_ROOT}"
if curl --silent --fail --max-time 1 "${DEMO_BASE_URL}/health" >/dev/null 2>&1; then
  printf 'API address is already in use. Choose another PORT.\n' >&2
  exit 1
fi

HOST="${DEMO_HOST}" PORT="${DEMO_PORT}" \
  node --import tsx src/api/server.ts >"${DEMO_TEMP_DIR}/api.log" 2>&1 &
DEMO_SERVER_PID=$!

healthy=false
for _attempt in $(seq 1 50); do
  if ! kill -0 "${DEMO_SERVER_PID}" 2>/dev/null; then
    printf 'API process stopped before becoming healthy.\n' >&2
    exit 1
  fi
  if curl --silent --fail "${DEMO_BASE_URL}/health" >/dev/null 2>&1; then
    healthy=true
    break
  fi
  sleep 0.2
done

if [[ "${healthy}" != "true" ]]; then
  printf 'API did not become healthy.\n' >&2
  exit 1
fi

canonical_request="${DEMO_TEMP_DIR}/canonical.json"
non_logical_request="${DEMO_TEMP_DIR}/non-logical.json"
create_request "${canonical_request}" '["transaction-validator","fraud-detector","compliance-checker"]'
create_request "${non_logical_request}" '["fraud-detector","transaction-validator","compliance-checker"]'

printf 'Canonical order\n'
submit_run "${canonical_request}"
printf '\n'

printf 'Non-logical order\n'
submit_run "${non_logical_request}"
printf '\n'

printf 'Safe transaction result\n'
curl --silent --show-error --fail-with-body \
  "${DEMO_BASE_URL}/transactions/TXN001"
printf '\n'
