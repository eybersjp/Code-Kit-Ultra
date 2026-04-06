# SPEC — Realtime Event Stream

**Status:** Approved
**Version:** 1.0
**Linked to:** `docs/02_architecture/EVENT_MODEL.md`
**Implements:** Master spec Section 9.1 — `GET /v1/events/stream`, Section 11.4
**Unblocks:** T2-3 implementation
**Risk refs:** R-15

---

## Objective

Implement `GET /v1/events/stream` as a Server-Sent Events (SSE) endpoint. Clients subscribe to canonical events filtered by runId, projectId, or orgId. The web control plane timeline and VS Code extension status bar must use this stream instead of polling.

---

## Scope

**In scope:**
- `GET /v1/events/stream` SSE endpoint
- Subscription filters: `?runId`, `?projectId`, `?orgId`
- SSE reconnect handling and event ID tracking
- Web control plane `RunDetail.tsx` integration
- VS Code extension status bar integration
- Polling fallback for environments that cannot support SSE

**Out of scope:**
- WebSocket protocol (SSE is sufficient for server-to-client push)
- Client-to-server messaging via stream (use normal REST endpoints)

---

## Protocol

### Server-Sent Events Format

```
GET /v1/events/stream?runId=run_123
Authorization: Bearer <token>
Accept: text/event-stream

HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no

id: evt_001
event: run.planned
data: {"runId":"run_123","status":"planned","actorId":"user_xyz","occurredAt":"2026-04-03T10:00:00Z"}

id: evt_002
event: gate.awaiting_approval
data: {"runId":"run_123","gateId":"gate_abc","gate":"architecture","shouldPause":true}

: keepalive

```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `runId` | string | Subscribe to events for a specific run |
| `projectId` | string | Subscribe to all events in a project |
| `orgId` | string | Subscribe to all events in an org (admin only) |

---

## Implementation

### SSE Route — `apps/control-service/src/routes/events-stream.ts`

```typescript
import type { Request, Response } from 'express';
import { getRealtimeProvider } from '@cku/realtime';

export async function eventsStream(req: Request, res: Response) {
  const { runId, projectId, orgId } = req.query as Record<string, string>;
  const auth = req.auth!;

  // Validate at least one filter provided
  if (!runId && !projectId && !orgId) {
    return res.status(422).json({
      error: 'At least one filter required: runId, projectId, or orgId',
    });
  }

  // Set SSE headers
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // Send initial connection event
  res.write('event: connected\ndata: {"status":"connected"}\n\n');

  // Subscribe to realtime provider
  const provider = getRealtimeProvider();
  const topic = runId ? `run:${runId}` : projectId ? `project:${projectId}` : `org:${orgId}`;

  let eventCounter = 0;
  const unsubscribe = provider.subscribe(topic, (event) => {
    eventCounter++;
    res.write(`id: ${eventCounter}\n`);
    res.write(`event: ${event.eventName}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  // Keepalive every 30 seconds
  const keepalive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30_000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(keepalive);
    unsubscribe();
  });
}
```

### Route Registration — `apps/control-service/src/index.ts`

```typescript
v1Router.get('/events/stream', authenticate, eventsStream);
```

### RealtimeProvider Interface Update — `packages/realtime/src/provider.ts`

Add `subscribe` method:
```typescript
export interface RealtimeProvider {
  broadcast(topic: string, data: unknown): Promise<void>;
  subscribe(topic: string, handler: (event: unknown) => void): () => void;  // returns unsubscribe fn
  status(): 'online' | 'offline' | 'pending';
}
```

---

## Web Control Plane Integration

### `apps/web-control-plane/src/pages/RunDetail.tsx`

Replace polling with EventSource:

```typescript
useEffect(() => {
  const token = auth.getSession()?.token;
  const source = new EventSource(
    `/api/v1/events/stream?runId=${runId}`,
    { withCredentials: true }
  );

  source.addEventListener('gate.awaiting_approval', (e) => {
    const event = JSON.parse(e.data);
    setGates(prev => [...prev, event]);
  });

  source.addEventListener('execution.started', (e) => {
    setRunStatus('running');
  });

  source.addEventListener('run.completed', (e) => {
    setRunStatus('completed');
    source.close();
  });

  source.onerror = () => {
    // Fallback to polling on SSE failure
    startPolling();
  };

  return () => source.close();
}, [runId]);
```

---

## VS Code Extension Integration

`extensions/code-kit-vscode/src/status/statusBar.ts` — Replace 5-second polling interval with SSE subscription when a run is active.

---

## Event Taxonomy (Stream Events)

| Event Name | Trigger | Payload Fields |
|-----------|---------|----------------|
| `run.created` | Run created | runId, mode, status |
| `run.planned` | Plan generated | runId, taskCount, skillCount, gateCount |
| `gate.awaiting_approval` | Gate paused | runId, gateId, gate, shouldPause, reason |
| `gate.approved` | Gate approved | runId, gateId, gate, decidedBy |
| `gate.rejected` | Gate rejected | runId, gateId, gate, decidedBy, note |
| `execution.started` | Execution begun | runId, phase |
| `execution.failed` | Execution failed | runId, taskId, reason |
| `verification.completed` | Verification done | runId, taskId, passed |
| `healing.suggested` | Healing triggered | runId, strategy, confidence |
| `rollback.completed` | Rollback done | runId, result |
| `run.completed` | Run finished | runId, status, qualityScore |

---

## Dependencies

- `SPEC_API_VERSIONING.md` (route must be under `/v1/`)
- `packages/realtime/src/provider.ts` must support `subscribe()` method
- InsForge realtime or in-process event bus for local dev

---

## Edge Cases

- **Client reconnect**: use `Last-Event-ID` header to resume from last received event
- **Long-lived connections**: load balancer timeout must be set > 60s or keepalive used
- **Multiple subscriptions**: same client subscribing twice should receive events once
- **Auth expiry**: if session expires mid-stream, close connection with `event: auth_expired`

---

## Definition of Done

- [ ] `GET /v1/events/stream?runId=<id>` returns SSE stream
- [ ] Events published via realtime provider appear in stream within 1 second
- [ ] Web control plane RunDetail page receives live events (no polling)
- [ ] Connection cleanup occurs on client disconnect (no memory leak)
- [ ] Keepalive sent every 30 seconds to prevent proxy timeout
- [ ] Fallback to polling works when SSE unavailable
- [ ] Logged in `progress-log.md`
- [ ] Validated against `VALIDATION_MASTER.md`
