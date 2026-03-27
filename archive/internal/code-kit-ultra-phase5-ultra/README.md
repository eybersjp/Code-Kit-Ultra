# Code Kit Ultra — Phase 5 ULTRA

Specialist agent voting + adaptive consensus.

## What this pack adds
- specialist agent roles
- adaptive consensus engine
- vote weighting by risk and historical reliability
- reviewer/security veto support
- explainable consensus traces
- CLI handlers for testing and inspection

## Included commands
- `/ck-vote <json>`
- `/ck-consensus-adaptive <json>`
- `/ck-agent-profile <json>`
- `/ck-consensus-sim <json>`

## Example
```bash
npx tsx apps/cli/src/index.ts /ck-consensus-adaptive '{
  "runId": "run-001",
  "summary": "Create quote generator",
  "riskLevel": "medium",
  "votes": [
    {"agent":"planner","decision":"approve","confidence":0.84,"reason":"Plan is coherent"},
    {"agent":"builder","decision":"approve","confidence":0.79,"reason":"Implementation is feasible"},
    {"agent":"reviewer","decision":"needs-review","confidence":0.68,"reason":"Needs stronger tests"},
    {"agent":"security","decision":"approve","confidence":0.81,"reason":"No unsafe mutations detected"}
  ]
}'
```
