#!/usr/bin/env bash
set -e

echo "== Code Kit Ultra Demo =="
mkdir -p artifacts/test-runs
STAMP=$(date +"%Y-%m-%dT%H-%M-%S")
DIR="artifacts/test-runs/$STAMP"
mkdir -p "$DIR"

cat > "$DIR/run-report.json" <<'JSON'
{
  "summary": "v1.0.1 adoption demo run",
  "mode": "dry-run",
  "routes": [
    {"taskType": "planning", "adapter": "antigravity-stub"},
    {"taskType": "implementation", "adapter": "cursor-stub"}
  ]
}
JSON

cat > "$DIR/report.md" <<'MD'
# Demo Report

This is a safe adoption-sprint demo artifact.

- planning routed to Antigravity stub
- implementation routed to Cursor stub
- no destructive actions performed
MD

echo "Demo complete"
echo "Artifacts created in: $DIR"
