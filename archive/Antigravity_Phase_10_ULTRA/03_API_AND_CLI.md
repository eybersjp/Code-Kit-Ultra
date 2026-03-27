# Phase 10 APIs and CLI

## Control Service APIs

### POST /v1/outcomes
Capture a completed run outcome.

Payload:
```json
{
  "runId": "run_123",
  "qualityScore": 0.91,
  "retryCount": 1,
  "durationMs": 124000,
  "failureTypes": ["permission_denied"],
  "verificationStatus": "passed",
  "operatorRating": 5,
  "operatorComment": "Recovered cleanly after one retry."
}
```

### GET /v1/learning/patterns
List patterns by scope, adapter, task type, confidence, or recency.

### GET /v1/reliability
Return reliability scores for adapters and task classes.

### POST /v1/policy-adaptations
Create a proposed adaptation from learning insights.

### POST /v1/policy-adaptations/:id/approve
Approve a bounded policy change.

### POST /v1/policy-adaptations/:id/reject
Reject a proposed change.

### POST /v1/optimization/simulate
Preview optimized plan decisions before execution.

## CLI Additions
- `ck outcome submit --run <id> --score 0.91 --rating 5`
- `ck learning patterns --project <id>`
- `ck reliability list`
- `ck policy-adaptations list`
- `ck policy-adaptations approve <id>`
- `ck optimize simulate --run <id>`
