#!/bin/bash
# demo-internal-tool.sh: High-visibility Enterprise Ops Demo

echo "🚀 Starting Code Kit Ultra: Internal Ops Demo Journey..."
echo "--------------------------------------------------------"

# 1. Health check
echo "[1/3] Running The Doctor..."
npm run ck -- validate-env

# 2. Initialization
echo "[2/3] Orchestrating Internal Slack/Jira Integration Flow..."
npm run ck -- init "Automate Slack-to-Jira approval workflow for enterprise operations" --dry-run

# 3. Artifact Sweep
echo "[3/3] Demo Complete! Inspect the gates.json for security compliance."
echo "--------------------------------------------------------"
echo "Next Steps: Review docs/CASE_STUDY_INTERNAL_TOOL.md for governance insights."
