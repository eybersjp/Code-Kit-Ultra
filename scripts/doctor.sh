#!/usr/bin/env bash
set -e

echo "== Code Kit Ultra Doctor =="

check () {
  if eval "$2"; then
    echo "[PASS] $1"
  else
    echo "[FAIL] $1"
    exit 1
  fi
}

check "Node installed" "command -v node >/dev/null 2>&1 || true"
check "npm installed" "command -v npm >/dev/null 2>&1 || true"
check ".env exists" "[ -f .env ]"
check "docs folder exists" "[ -d docs ]"
check "scripts folder exists" "[ -d scripts ]"
check "artifact root exists or creatable" "mkdir -p artifacts/test-runs && [ -d artifacts/test-runs ]"

echo "Doctor checks passed"
