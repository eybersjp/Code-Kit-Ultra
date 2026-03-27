# Event Model

## Event naming
Use dot-delimited domain events.

## Canonical events
- run.created
- run.queued
- run.simulation.started
- run.simulation.completed
- gate.created
- gate.awaiting_approval
- gate.approved
- gate.rejected
- execution.started
- execution.step.started
- execution.step.completed
- execution.failed
- verification.started
- verification.completed
- healing.suggested
- healing.applied
- rollback.started
- rollback.completed
- artifact.created
- audit.recorded

## Event envelope
```json
{
  "eventId": "evt_123",
  "eventType": "run.created",
  "occurredAt": "2026-03-25T10:00:00Z",
  "correlationId": "corr_123",
  "orgId": "org_123",
  "workspaceId": "ws_123",
  "projectId": "proj_123",
  "runId": "run_123",
  "actor": {
    "type": "user",
    "id": "usr_123"
  },
  "payload": {}
}
```

## Realtime channels
- org:{orgId}
- workspace:{workspaceId}
- project:{projectId}
- run:{runId}
- gate:{gateId}

## Replay strategy
Persist all canonical run events to Postgres.
Realtime is a delivery layer, not the source of truth.
