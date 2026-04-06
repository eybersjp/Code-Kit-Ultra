#!/usr/bin/env bash
set -e

echo "== Validate Phase 8 Implementation =="

files=(
  "docs/PHASE8.md"
  "docs/PHASE8_1.md"
  "packages/adapters/src/providers/github-adapter.ts"
  "apps/control-service/src/index.ts"
  "apps/cli/src/index.ts"
)

for f in "${files[@]}"; do
  if [ ! -f "$f" ]; then
    echo "Missing Phase 8 file: $f"
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

check_contains "docs/PHASE8_1.md" "GITHUB_TOKEN"
check_contains "apps/control-service/src/index.ts" "/runs/:id/retry-step"
check_contains "apps/control-service/src/index.ts" "/runs/:id/rollback-step"
check_contains "apps/cli/src/index.ts" "/ck-retry-step"
check_contains "apps/cli/src/index.ts" "/ck-rollback-step"
check_contains "packages/adapters/src/providers/github-adapter.ts" "create-pr"
check_contains "packages/adapters/src/providers/github-adapter.ts" "commit-and-pr"

echo "Phase 8 validation passed"
