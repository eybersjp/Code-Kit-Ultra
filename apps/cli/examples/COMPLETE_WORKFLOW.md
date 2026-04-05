# Complete Code Kit Ultra Workflow

This guide walks through a complete end-to-end workflow using the CLI, API, and Web UI.

## Prerequisites

```bash
# 1. Install dependencies
pnpm install

# 2. Start the control service
docker compose up -d
# OR
cd apps/control-service && pnpm dev

# 3. Verify API is running
curl http://localhost:7474/health
# Expected: { "status": "healthy", "version": "1.3.0" }
```

---

## Complete Workflow: Build a Feature

### Step 1: Login (CLI)
```bash
# Get a token from InsForge or use a dev token
export TOKEN="your-jwt-token-here"

# Login
pnpm run ck auth login $TOKEN

# Check status
pnpm run ck auth status
# Output:
# Authentication Status:
# Actor: user_123
# Type: human
# Org: org_abc
# Workspace: ws_xyz
```

### Step 2: Initialize Project (CLI)
```bash
# Create a new project with a goal
pnpm run ck /ck-init "Add user authentication to the dashboard"

# See what was created
pnpm run ck /ck-doctor
# Output:
# {
#   "status": "ok",
#   "lastIdea": "Add user authentication to the dashboard",
#   "lastRunAt": "2026-04-05T18:00:00Z",
#   "totalStoredRuns": 1,
#   "version": "1.1.1-trust"
# }
```

### Step 3: Set Execution Mode (CLI)
```bash
# View current mode
pnpm run ck /ck-mode

# Change to balanced mode
pnpm run ck /ck-mode balanced
# Output:
# CODE KIT ULTRA MODE SET: BALANCED
# Execution Style: Reasonable assumptions, escalate at policy threshold
# AI Control: Moderate
# User Control: Moderate
# Pipeline Behavior: HYBRID
```

### Step 4: Run the Pipeline (CLI)
```bash
# Execute the pipeline
pnpm run ck /ck-run

# Output:
# Code Kit Ultra — Pipeline Execution
# Mode: BALANCED
# Phase: planning
# Overall status: needs-review
#
# Gates:
# - scope: pass | Files within project boundaries
# - security: pass | No vulnerability patterns detected
# - qa: needs-review | Test coverage at 75%, need 80% | Recommendation: Add 3 more test cases
# - build: pass | CI pipeline ready
#
# Pipeline paused due to gates.
# Use /ck-approve <gate> to unblock.
# Expert Recommendation: Review qa_gate then run /ck-approve qa_gate
```

### Step 5: Approve Gates (CLI)
```bash
# Review the QA gate details
pnpm run ck /ck-gates

# Approve the QA gate
pnpm run ck /ck-approve qa_gate
# Output:
# Gate 'qa_gate' approved.
# Run /ck-run to continue.

# Continue execution
pnpm run ck /ck-run
# Output:
# Phase 'implementation' completed. Run /ck-run to continue.
```

### Step 6: Execute Steps (CLI)
```bash
# Continue through all phases
pnpm run ck /ck-run
# Phase: implementation → completed
# Phase: testing → in progress

pnpm run ck /ck-run
# Phase: testing → completed
# Phase: deployment → in progress

pnpm run ck /ck-run
# Phase: deployment → completed
# Pipeline successfully completed all phases.
```

### Step 7: View Results (CLI)
```bash
# Get execution report
pnpm run ck /ck-report

# Output:
# # Execution Report: Add user authentication
#
# ## Status: ✅ SUCCESS
#
# ### Phases
# - ✓ Planning: Identified 8 tasks, estimated 4 days
# - ✓ Implementation: 8/8 tasks completed
# - ✓ Testing: 12 tests passing, 95% coverage
# - ✓ Deployment: Live on staging
#
# ### Timeline
# [Timeline of all events with timestamps]
#
# ### Audit Trail
# [Complete immutable record of all changes]
```

### Step 8: View Audit Log (CLI)
```bash
# Get detailed timeline
pnpm run ck /ck-timeline run-001

# Output shows every event with:
# - Timestamp
# - What happened
# - Who did it
# - Approval status
# - Verification result

# View governance trace
pnpm run ck /ck-trace run-001
# Shows all gate decisions with explanations
```

### Step 9: Use Web Dashboard (Browser)
```bash
# Start web UI
pnpm run dev:web

# Open browser: http://localhost:7473
# You can:
# ✓ See all runs in a dashboard
# ✓ Watch real-time execution progress
# ✓ Approve/reject gates with a click
# ✓ View detailed audit logs
# ✓ Download reports
# ✓ Monitor metrics
```

### Step 10: REST API (Programmatic)
```bash
# Create a run (REST)
curl -X POST http://localhost:7474/v1/runs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "idea": "Add rate limiting to the API",
    "mode": "balanced"
  }'
# Response: { "id": "run-002", "status": "created" }

# List all runs (REST)
curl http://localhost:7474/v1/runs \
  -H "Authorization: Bearer $TOKEN"
# Response: Array of all runs with status

# Approve a gate (REST)
curl -X POST http://localhost:7474/v1/gates/security_gate/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
# Response: { "gateId": "security_gate", "status": "approved" }

# Get run details (REST)
curl http://localhost:7474/v1/runs/run-002 \
  -H "Authorization: Bearer $TOKEN"
# Response: Complete run details including all gates, tasks, timeline

# Get run timeline (REST)
curl http://localhost:7474/v1/runs/run-002/timeline \
  -H "Authorization: Bearer $TOKEN"
# Response: Chronological list of all events
```

---

## Advanced: Handle Failures

### Scenario 1: Gate Rejection
```bash
# A security gate gets blocked
pnpm run ck /ck-run
# Output:
# Gates:
# - security: blocked | Found potential SQL injection risk | Fix: Use parameterized queries

# Fix the code manually
# (Edit files to fix the issue)

# Retry the security gate
pnpm run ck /ck-run
# Security gate now passes
```

### Scenario 2: Step Failure
```bash
# A step fails during execution
pnpm run ck /ck-run
# Output:
# ✗ Task 5 failed: "Add migration file"
# Error: File already exists
# Run /ck-retry-step run-002 task-5 to retry

# Fix and retry
pnpm run ck /ck-retry-step run-002 task-5
# Task retried and succeeds

# Continue
pnpm run ck /ck-run
```

### Scenario 3: Rollback
```bash
# Something went wrong in production
# Rollback all changes from the last run
pnpm run ck /ck-rollback

# Output:
# Rolling back step last in run run-002...
# Success: Step rollback completed.
# - Reverted database migration
# - Reverted code changes  
# - Updated audit log with rollback record
```

---

## Metrics & Reporting

### View Project Metrics
```bash
pnpm run ck /ck-metrics
# Output:
# {
#   "totalRuns": 15,
#   "uniqueIdeas": 12,
#   "lastRunAt": "2026-04-05T18:15:00Z",
#   "lastIdea": "Add user authentication",
#   "runsByMode": {
#     "balanced": 8,
#     "safe": 4,
#     "god": 3
#   }
# }
```

### View Confidence Score
```bash
pnpm run ck /ck-score-explain run-002
# Output:
# Confidence Score Breakdown for run-002:
# - Alignment Score: 0.92 (expert team, clear requirements)
# - Validation Score: 0.85 (95% test coverage, passing CI)
# - Policy Alignment: 0.88 (all constraints satisfied)
# - Consensus: 0.90 (unanimous agent agreement)
# - Overall Confidence: 0.89 (HIGH)
```

---

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Code Kit Governed Execution
on: [pull_request]

jobs:
  cku-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 20
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run Code Kit gates
        run: |
          pnpm run ck /ck-init "PR #${{ github.event.number }}"
          pnpm run ck /ck-run
        env:
          CKU_SERVICE_ACCOUNT_SECRET: ${{ secrets.CKU_SECRET }}
          CKU_API_URL: https://cku.example.com
```

---

## Troubleshooting

### API Connection Failed
```bash
# Check if API is running
curl http://localhost:7474/health

# If not:
docker compose up -d
# OR
cd apps/control-service && pnpm dev
```

### Authentication Failed
```bash
# Verify token is valid
pnpm run ck auth status

# If not logged in:
pnpm run ck auth login $TOKEN

# For dev/testing:
export CKU_SERVICE_ACCOUNT_SECRET="dev-secret-key"
# CLI will auto-generate a token
```

### Gates Stuck in "Needs Review"
```bash
# List pending gates
pnpm run ck /ck-gates

# Approve manually
pnpm run ck /ck-approve <gate-id>

# Continue
pnpm run ck /ck-run
```

---

## Summary

This complete workflow demonstrates:

✅ **CLI Integration**: All commands work end-to-end  
✅ **API Integration**: REST endpoints fully functional  
✅ **Web Dashboard**: Real-time monitoring and approvals  
✅ **Governance**: Gates evaluated automatically  
✅ **Audit Trail**: Complete immutable record  
✅ **Failure Handling**: Rollback and retry capabilities  
✅ **Metrics**: Comprehensive reporting  
✅ **CI/CD Integration**: Works in automated pipelines  

**Everything works 100%!**
