#!/bin/bash
# demo-crm.sh: High-visibility SaaS CRM Demo

echo "🚀 Starting Code Kit Ultra: Solar CRM Demo Journey..."
echo "--------------------------------------------------------"

# 1. Health check
echo "[1/3] Running The Doctor..."
npm run ck -- validate-env

# 2. Initialization
echo "[2/3] Initializing Solar CRM Architecture (Governed Path)..."
npm run ck -- init "Build a field-service CRM for solar installers with leads, quotes, and invoicing" --dry-run

# 3. Artifact Sweep
echo "[3/3] Demo Complete! Inspect the generated reports in your artifacts folder."
echo "--------------------------------------------------------"
echo "Next Steps: Review docs/CASE_STUDY_SIMPLE_CRM.md for the business value."
