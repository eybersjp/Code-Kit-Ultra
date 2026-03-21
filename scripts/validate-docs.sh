#!/usr/bin/env bash
set -e

for f in README.md CHANGELOG.md RELEASE.md SECURITY.md SUPPORT.md docs/QUICKSTART.md docs/ARCHITECTURE.md docs/RELEASE_CHECKLIST.md docs/RUNBOOK.md docs/ROLLBACK.md docs/DISASTER_RECOVERY.md docs/KNOWN_FAILURE_MODES.md; do
  if [ ! -f "$f" ]; then
    echo "Missing doc: $f"
    exit 1
  fi
done

echo "Docs validation passed"