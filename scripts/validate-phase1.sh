#!/usr/bin/env bash
set -e

echo "== Validate Phase 1 Implementation =="

files=(
  "docs/PHASE1.md"
  "README.md"
  "apps/cli/src/index.ts"
  "packages/agents"
  "packages/command-engine"
  "packages/security"
  "packages/tools"
)

for f in "${files[@]}"; do
  if [ ! -e "$f" ]; then
    echo "Missing Phase 1 artifact: $f"
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

check_contains "README.md" "/ck-init"
check_contains "README.md" "/ck-run"
check_contains "apps/cli/src/index.ts" "/ck-mode"
check_contains "apps/cli/src/index.ts" "normalizeMode"
check_contains "apps/cli/src/index.ts" ".ck"
check_contains "apps/cli/src/index.ts" "turbo | builder | pro | expert"

echo "Phase 1 validation passed"
