#!/usr/bin/env bash
set -e

echo "== Validate Phase 9 Implementation =="

files=(
  "docs/PHASE9.md"
  "config/policy.json"
  "apps/control-service/src/middleware/authenticate.ts"
  "packages/core/src/auth.ts"
  "packages/core/src/audit-logger.ts"
)

for f in "${files[@]}"; do
  if [ ! -f "$f" ]; then
    echo "Missing Phase 9 file: $f"
    exit 1
  fi
done

check_contains() {
  local file="$1"
  local pattern="$2"
  if ! grep -qF "$pattern" "$file"; then
    echo "Expected '$pattern' in $file"
    exit 1
  fi
}

check_contains "apps/control-service/src/middleware/authenticate.ts" "x-api-key"
check_contains "packages/core/src/auth.ts" "CODEKIT_ADMIN_API_KEY"
check_contains "packages/core/src/audit-logger.ts" "prevHash"
check_contains "packages/core/src/audit-logger.ts" "hashEventBody"
check_contains "docs/PHASE9.md" "x-api-key"
check_contains "docs/PHASE9.md" ".codekit/audit/events.ndjson"
check_contains "docs/PHASE9.md" "audit-log.json"

echo "Phase 9 validation passed"
