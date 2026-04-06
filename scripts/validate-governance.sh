#!/usr/bin/env bash
set -e

echo "== Validate Governance & SaaS Foundation =="

files=(
  "config/policy.json"
  "docs/github/VersioningPolicy.md"
  "apps/control-service/src/middleware/authenticate.ts"
  "apps/control-service/src/handlers/create-run.ts"
  "config/skill-registry.json"
)

for f in "${files[@]}"; do
  if [ ! -f "$f" ]; then
    echo "Missing governance file: $f"
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

check_contains "docs/github/VersioningPolicy.md" "Phase 7-9"
check_contains "apps/control-service/src/middleware/authenticate.ts" "x-api-key"
check_contains "packages/core/src/auth.ts" "CODEKIT_ADMIN_API_KEY"
check_contains "apps/control-service/src/handlers/create-run.ts" "project scope"
check_contains "config/skill-registry.json" "saas-multitenancy"

echo "Governance validation passed"
