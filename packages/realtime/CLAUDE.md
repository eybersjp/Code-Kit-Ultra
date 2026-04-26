# Realtime Package — WebSocket Event Bus

> **Quick Start:** Event broadcast provider for real-time updates. Supports pluggable backends (local, InsForge, Redis pubsub). Core abstraction: `RealtimeProvider` interface with `broadcast(topic, data)` and `status()` methods.

## Overview

The `@cku/realtime` package provides a pluggable event broadcasting system for real-time updates across the system. It abstracts away the underlying transport (local simulation, InsForge realtime channels, Redis pubsub) behind a clean `RealtimeProvider` interface.

**Key characteristics:**
- **Provider-agnostic:** Switch implementations without changing caller code
- **Topic-based broadcasting:** Emit events to named topics (e.g., `"run-123"`, `"tenant-acme"`)
- **Status tracking:** Know if realtime is online, offline, or pending
- **Feature-flagged:** Local dev mode uses null provider (no-op); production uses InsForge or custom backend

## Architecture

### RealtimeProvider Interface

```typescript
export interface RealtimeProvider {
  broadcast(topic: string, data: any): Promise<void>
  status(): 'online' | 'offline' | 'pending'
}
```

**Methods:**
- `broadcast(topic, data)` — Emit `data` to all subscribers of `topic`
  - Returns a Promise (async operation)
  - Safe to call even if provider is offline (gracefully degrades)
- `status()` — Return current connection state
  - `'online'` — Ready to broadcast
  - `'offline'` — Not connected; broadcasts are no-op
  - `'pending'` — Connecting; broadcasts may queue

### Default Provider (Null Provider)

When no provider is explicitly set, `getRealtimeProvider()` returns a null provider that:
- Accepts broadcasts but does nothing
- Reports status as `'offline'`
- Useful for local development (no external dependencies)

### InsForge Provider

```typescript
export class InsForgeRealtimeProvider implements RealtimeProvider {
  constructor(options: { apiKey?: string; env?: string })
}
```

Wraps the InsForge realtime SDK for production deployments:
- Accepts InsForge API key and environment
- Broadcasts to InsForge realtime channels (when apiKey is provided)
- Falls back to null provider if no apiKey (feature-flagged for dev)
- Manages InsForge connection lifecycle

## Usage Patterns

### Setting Up a Provider

```typescript
import { setRealtimeProvider, InsForgeRealtimeProvider } from '@cku/realtime'

// Configure for production (InsForge)
const provider = new InsForgeRealtimeProvider({
  apiKey: process.env.INSFORGE_REALTIME_KEY,
  env: process.env.NODE_ENV
})
setRealtimeProvider(provider)

// Get provider and check status
const realtime = getRealtimeProvider()
console.log('Status:', realtime.status()) // 'online' or 'offline'
```

### Broadcasting Events

```typescript
import { getRealtimeProvider } from '@cku/realtime'

const realtime = getRealtimeProvider()

// Broadcast run event to subscribers of "run-123"
await realtime.broadcast('run-123', {
  eventType: 'step-completed',
  stepId: 'step-456',
  duration: 1200,
  result: 'success'
})

// Broadcast tenant-level event
await realtime.broadcast('tenant-acme', {
  eventType: 'audit-log-recorded',
  runId: 'run-123',
  entry: { hash: 'abc123...', timestamp: Date.now() }
})
```

### Handling Status Changes

```typescript
const realtime = getRealtimeProvider()

if (realtime.status() === 'offline') {
  // Gracefully degrade: log locally or retry later
  logger.warn('Realtime offline; events may not be delivered')
} else if (realtime.status() === 'online') {
  // Safe to broadcast
  await realtime.broadcast(topic, data)
}
```

## Topic Namespacing

Recommended topic patterns:

| Topic Pattern | Purpose | Example |
|---------------|---------|---------|
| `run-{runId}` | Run-specific events | `"run-123"` → step completed, gate approved |
| `tenant-{tenantId}` | Tenant-level events | `"tenant-acme"` → audit log, policy updated |
| `user-{userId}` | User-specific events | `"user-jp@example.com"` → run assigned, approval needed |
| `global` | System-wide events | `"global"` → service health, feature flags |

Clients subscribe to topics they care about (e.g., UI for `"run-123"` to show live progress).

## Distributed Deployment

For multi-server deployments, use **Redis pubsub** backend:

```typescript
import redis from 'redis'

class RedisPubsubProvider implements RealtimeProvider {
  private client = redis.createClient({ url: process.env.REDIS_URL })

  async broadcast(topic: string, data: any): Promise<void> {
    await this.client.publish(topic, JSON.stringify(data))
  }

  status(): 'online' | 'offline' | 'pending' {
    return this.client.isOpen ? 'online' : 'offline'
  }
}

setRealtimeProvider(new RedisPubsubProvider())
```

Redis ensures events published on one server are seen by all subscribers (including on other servers).

## Event Structures

Events broadcast on topics follow a loose convention:

```typescript
interface RealtimeEvent {
  eventType: string           // e.g., 'step-completed', 'gate-approved'
  timestamp: number           // ms since epoch
  runId?: string              // Associated run (if any)
  data: Record<string, any>   // Event-specific payload
}
```

**Examples:**

```typescript
// Gate approved
{
  eventType: 'gate-approved',
  timestamp: 1234567890,
  runId: 'run-123',
  data: { gateName: 'security', decision: 'pass', confidence: 0.95 }
}

// Step completed
{
  eventType: 'step-completed',
  timestamp: 1234567890,
  runId: 'run-123',
  data: { stepId: 'step-456', status: 'success', duration: 2500 }
}

// Run finished
{
  eventType: 'run-finished',
  timestamp: 1234567890,
  runId: 'run-123',
  data: { finalStatus: 'success', totalDuration: 15000, outcome: 'completed' }
}
```

## Integration Points

### Control Service

The control-service broadcasts events after key actions:

```typescript
// In control-service handlers
const realtime = getRealtimeProvider()

// After gate evaluation
await realtime.broadcast(`run-${runId}`, {
  eventType: 'gate-evaluated',
  data: { gateName, decision, reason }
})

// After step execution
await realtime.broadcast(`run-${runId}`, {
  eventType: 'step-completed',
  data: { stepId, result, duration }
})
```

### Web Control Plane

The UI subscribes to `run-{runId}` and renders real-time progress:

```typescript
// Pseudocode: WebSocket subscription in UI
const ws = new WebSocket(`ws://control-service/realtime?topic=run-123`)
ws.onmessage = (event) => {
  const { eventType, data } = JSON.parse(event.data)
  
  if (eventType === 'step-completed') {
    updateStepUI(data.stepId, data.result)
  } else if (eventType === 'gate-approved') {
    showGateDecision(data.gateName, data.decision)
  }
}
```

## Testing

### Unit Tests

Mock the provider:

```typescript
import { setRealtimeProvider } from '@cku/realtime'

describe('Event broadcasting', () => {
  it('should broadcast gate approval', async () => {
    const broadcasts: any[] = []
    setRealtimeProvider({
      broadcast: async (topic, data) => broadcasts.push({ topic, data }),
      status: () => 'online'
    })

    const realtime = getRealtimeProvider()
    await realtime.broadcast('run-123', {
      eventType: 'gate-approved',
      data: { gateName: 'security', decision: 'pass' }
    })

    expect(broadcasts).toHaveLength(1)
    expect(broadcasts[0].topic).toBe('run-123')
    expect(broadcasts[0].data.eventType).toBe('gate-approved')
  })
})
```

### Integration Tests

Use a real Redis instance (Docker):

```typescript
import redis from 'redis'

describe('Redis pubsub integration', () => {
  let publisher: redis.RedisClient
  let subscriber: redis.RedisClient

  beforeAll(async () => {
    publisher = redis.createClient({ url: 'redis://localhost:6379' })
    subscriber = redis.createClient({ url: 'redis://localhost:6379' })
    await subscriber.connect()
  })

  it('should deliver messages to subscribers', async () => {
    const messages: any[] = []
    await subscriber.subscribe('test-topic', (message) => {
      messages.push(JSON.parse(message))
    })

    await publisher.publish('test-topic', JSON.stringify({
      eventType: 'test',
      data: { value: 42 }
    }))

    // Small delay for pubsub delivery
    await new Promise(r => setTimeout(r, 100))
    expect(messages).toHaveLength(1)
  })
})
```

## Gotchas

### 1. **Connection Drops and Message Loss**

- Realtime is **best-effort**, not guaranteed delivery
- If the InsForge connection drops, broadcasts are silently discarded
- **Mitigation:** Use audit logs (hash-chain + InsForge) for critical events; realtime is for UI updates only

### 2. **Message Ordering**

- Single-server: messages delivered in order
- Multi-server with Redis: order depends on publish timing; no strict ordering guarantee
- **Mitigation:** Include timestamps in events; clients can detect and ignore out-of-order updates

### 3. **Distributed Sync**

- Multiple control-service instances all broadcast to the same topic
- All connected UI clients see all events (duplication is possible if not deduplicated)
- **Mitigation:** Include unique event IDs; clients deduplicate using `Set<eventId>`

### 4. **Feature Flag Gotcha**

- Local dev mode (no API key) silently disables realtime
- Code must not assume realtime is always available
- **Mitigation:** Always check `realtime.status()` before relying on delivery; log warnings if offline

### 5. **Type Safety with `any`**

- Broadcast data is typed as `any` for flexibility
- No compile-time validation of event structure
- **Mitigation:** Document event schemas; consider adding Zod validators for critical topics

### 6. **Provider Swap During Runtime**

- Calling `setRealtimeProvider()` mid-flight can drop in-flight broadcasts
- **Mitigation:** Set provider once at startup; avoid runtime swaps

## Related Documentation

- [System Architecture](../../docs/ARCHITECTURE.md) — Overall system layers
- [Control Service CLAUDE.md](../../apps/control-service/CLAUDE.md) — Broadcasting integration
- [Audit Package](../audit/CLAUDE.md) — Durable event logging (complements realtime)
- [Root CLAUDE.md](../../CLAUDE.md) — Monorepo overview

## Cross-References

**Depends on:**
- `@cku/shared` — Logger, types

**Used by:**
- `apps/control-service` — Broadcasts gate and step events
- `apps/web-control-plane` — Receives realtime updates via WebSocket

**Related:**
- [Audit package](../audit/CLAUDE.md) — Durable hash-chain logging
- [Observability package](../observability/CLAUDE.md) — Prometheus metrics (can use realtime events as metric sources)
