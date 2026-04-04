# Event Model — Code Kit Ultra

**Status:** Authoritative
**Version:** 1.2.0
**Last reviewed:** 2026-04-03
**See also:** `docs/02_architecture/DATA_MODEL.md`, `docs/03_specs/SPEC_REALTIME_STREAM.md`

---

## Overview

Code Kit Ultra operates two parallel event systems with distinct purposes:

| System | Purpose | Consumer | Persistence |
|--------|---------|----------|------------|
| **AuditEvent** | Governance, forensics, non-repudiation | Audit store, compliance | Immutable DB rows |
| **CanonicalEvent** | Realtime UI updates, async processing | Web UI, CLI, SSE stream | DB rows (queryable) |

Every material action in the system emits to **both** systems. They are never conflated.

---

## AuditEvent System

### Purpose

AuditEvents are the governance record. They answer: *"Who did what, when, and with what authority?"* They are immutable once written — no update or delete path exists.

### Shape

```typescript
interface AuditEvent {
  id: string;                        // UUID
  runId?: string;                    // Associated run (nullable for org-level events)
  orgId: string;                     // Always present
  workspaceId?: string;
  projectId?: string;
  actorId: string;                   // User or service account
  actorType: 'human' | 'service-account' | 'system';
  authMode: 'session' | 'service-account' | 'legacy-api-key';
  correlationId: string;             // Ties events within one request lifecycle
  eventType: string;                 // e.g. 'run.created', 'gate.approved'
  payload: Record<string, unknown>;  // Event-specific data
  createdAt: string;                 // ISO 8601
  // Internal integrity field (not in DB column — computed on read):
  previousHash?: string;             // SHA256 of prior event (hash chain)
}
```

### Hash Chain

The audit module maintains a blockchain-style SHA256 hash chain. Each event's hash covers its own content plus the previous event's hash, making tampering detectable.

```typescript
// packages/audit/src/write-audit-event.ts
let lastHash = '0'.repeat(64);  // Genesis hash

export async function writeAuditEvent(event: AuditEventInput): Promise<void> {
  const hash = sha256(JSON.stringify(event) + lastHash);
  lastHash = hash;
  await db.audit.insert({ ...event, previousHash: lastHash });
}
```

> **Known Issue:** `lastHash` is module-level state — it resets on restart and is not thread-safe across replicas. The hash chain must be loaded from the last DB row on startup and use a DB-level sequence or advisory lock for correctness at scale. See `docs/04_tracking/risk-log.md` (R-09).

### Audit Event Taxonomy

| Event Type | Emitted When |
|-----------|-------------|
| `run.created` | A new run is initialised |
| `run.started` | Orchestration begins |
| `run.completed` | Run reaches completed status |
| `run.failed` | Run reaches failed status |
| `run.cancelled` | Operator cancels a run |
| `gate.evaluated` | A gate evaluation completes |
| `gate.paused` | A gate triggers a pause |
| `gate.approved` | A pending gate is approved |
| `gate.rejected` | A pending gate is rejected |
| `action.executed` | A ProviderAdapter executes an action |
| `action.rolled-back` | An action is reversed |
| `session.revoked` | A bearer token is revoked |
| `service-account.created` | A new SA is provisioned |
| `service-account.rotated` | SA token is rotated |
| `outcome.recorded` | A run's outcome is captured |

---

## CanonicalEvent System

### Purpose

CanonicalEvents drive the realtime operator experience. They are published to:
1. The `canonical_events` database table (queryable history)
2. An in-process event bus (for SSE stream delivery)
3. Optionally, InsForge Realtime for cross-surface broadcast

### Shape

```typescript
interface CanonicalEvent {
  id: string;                        // UUID
  runId?: string;
  eventName: string;                 // e.g. 'run.status.changed'
  payload: Record<string, unknown>;  // Rich UI-facing data
  actorId?: string;
  actorType?: string;
  orgId?: string;
  workspaceId?: string;
  projectId?: string;
  authMode?: string;
  correlationId?: string;
  createdAt: string;
}
```

### Event Name Taxonomy

Event names follow a `<domain>.<noun>.<verb>` pattern:

| Domain | Event Name | Trigger |
|--------|-----------|---------|
| Run | `run.created` | Run record created |
| Run | `run.status.changed` | Status transitions (planned→running→completed etc.) |
| Run | `run.phase.advanced` | Phase engine advances to next phase |
| Gate | `gate.evaluated` | Gate evaluation returns a result |
| Gate | `gate.awaiting_approval` | Gate pauses run awaiting human input |
| Gate | `gate.approved` | Gate approved by operator |
| Gate | `gate.rejected` | Gate rejected by operator |
| Task | `task.started` | A plan task begins execution |
| Task | `task.completed` | A plan task completes successfully |
| Task | `task.failed` | A plan task fails |
| Action | `action.simulated` | Simulation result available |
| Action | `action.executed` | Action executed in real world |
| Action | `action.verified` | Verification outcome available |
| Healing | `healing.triggered` | Self-healing loop activated |
| Healing | `healing.resolved` | Healing strategy succeeded |
| Outcome | `outcome.recorded` | Post-run outcome captured |
| Stream | `heartbeat` | SSE keepalive (every 30 seconds) |

### Publishing

All event publication goes through `packages/events/src/publish-event.ts`:

```typescript
// packages/events/src/publish-event.ts

export async function publishEvent(event: CKEventInput): Promise<void> {
  const canonical: CanonicalEvent = {
    id: crypto.randomUUID(),
    ...event,
    createdAt: new Date().toISOString(),
  };

  // 1. Persist to DB
  await db.canonicalEvents.insert(canonical);

  // 2. Emit to in-process bus (for SSE delivery)
  eventBus.emit(canonical.eventName, canonical);

  // 3. Forward to InsForge Realtime if configured
  if (realtimeProvider) {
    await realtimeProvider.publish(canonical);
  }
}
```

**Required fields on every published event:**
- `actorId` — who triggered the action
- `actorType` — human / service-account / system
- `orgId` — tenant root
- `authMode` — session / service-account / legacy-api-key
- `correlationId` — request lifecycle correlation

---

## SSE Realtime Stream

The control service exposes a Server-Sent Events endpoint for realtime operator consumption:

```
GET /v1/events/stream
Authorization: Bearer <token>
Accept: text/event-stream

Optional query params:
  ?runId=<id>        Filter to a specific run
  ?projectId=<id>    Filter to a project
  ?eventName=<name>  Filter by event name
```

The endpoint:
1. Authenticates and authorises the subscriber
2. Sends a `connected` event with subscription metadata
3. Subscribes to the in-process event bus filtered by query params
4. Sends a `heartbeat` every 30 seconds to keep the connection alive
5. On client disconnect, cleans up the subscription

See `docs/03_specs/SPEC_REALTIME_STREAM.md` for full implementation design.

---

## Dual Write Pattern

Every material action writes to **both** systems. The pattern is:

```typescript
// Correct pattern — always both:
await writeAuditEvent({
  eventType: 'gate.approved',
  actor: req.auth.actor,
  tenant: req.auth.tenant,
  authMode: req.auth.authMode,
  correlationId: req.auth.correlationId,
  payload: { gateId, runId, decidedBy: req.auth.actor.id },
});

await publishEvent({
  runId,
  eventName: 'gate.approved',
  payload: { gateId, gateType, runId },
  actorId: req.auth.actor.id,
  actorType: req.auth.actor.type,
  orgId: req.auth.tenant.orgId,
  workspaceId: req.auth.tenant.workspaceId,
  projectId: req.auth.tenant.projectId,
  authMode: req.auth.authMode,
  correlationId: req.auth.correlationId,
});
```

**Anti-pattern:** Writing only to one system, or writing ad-hoc shapes without using `writeAuditEvent()` and `publishEvent()`.

---

## InsForge Realtime Integration

InsForge provides a managed WebSocket/Realtime transport (Supabase Realtime). The `packages/realtime/src/provider.ts` defines the abstraction:

```typescript
interface RealtimeProvider {
  publish(event: CanonicalEvent): Promise<void>;
  subscribe(channel: string, handler: (event: CanonicalEvent) => void): Unsubscribe;
}
```

In production, this is backed by `InsForgeRealtimeProvider`. In local dev without InsForge, events are in-process only.

---

## Querying Events

### Audit events (governance queries)

```sql
-- All events for an org in time range
SELECT * FROM audit_events
WHERE organization_id = $1
  AND created_at BETWEEN $2 AND $3
ORDER BY created_at DESC;

-- All events with a correlation ID (trace one request)
SELECT * FROM audit_events
WHERE correlation_id = $1
ORDER BY created_at ASC;
```

### Canonical events (run timeline)

```sql
-- Full timeline for a run (ascending — for UI rendering)
SELECT * FROM canonical_events
WHERE run_id = $1
ORDER BY created_at ASC;
```

Both tables have indexes covering these access patterns. See `DATA_MODEL.md` for full indexing strategy.
