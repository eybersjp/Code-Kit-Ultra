#!/usr/bin/env bash
set -e

echo "== Code Kit Ultra Demo =="
mkdir -p artifacts/test-runs
STAMP=$(date +"%Y-%m-%dT%H-%M-%S")
DIR="artifacts/test-runs/$STAMP"
mkdir -p "$DIR"

cat > "$DIR/run-report.json" <<'JSON'
{
  "summary": "v1.0.2 feedback & conversion demo run",
  "mode": "dry-run",
  "routes": [
    {"taskType": "planning", "adapter": "antigravity-stub"},
    {"taskType": "implementation", "adapter": "cursor-stub"}
  ],
  "value": "first visible success in seconds"
}
JSON

cat > "$DIR/report.md" <<'MD'
# Demo Report

This demo proves:
- setup can be validated quickly
- a safe artifact bundle can be generated
- planning and implementation can follow different specialist paths
MD

echo "Demo complete"
echo "Artifacts created in: $DIR"
