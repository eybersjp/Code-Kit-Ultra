# Audit Package — SHA-256 Hash-Chain Logging

## Quick Overview

The audit package provides **immutable, tamper-evident audit logging** using SHA-256 hash-chains stored in PostgreSQL. Every execution event (gate approval, step completion, failure) is recorded sequentially with cryptographic hashes linking each entry to the previous one. This creates an **append-only, verifiable ledger** of all system actions.

**Key capabilities:**
- SHA-256 hash-chain (sequential immutability)
- PostgreSQL-backed persistent storage
- Advisory locking (prevents concurrent write conflicts)
- Audit trail retrieval by organization and resource
- Cryptographic integrity verification

## Architecture

### Hash-Chain Construction

Each audit event includes:
- **Event data** — action, actor, result, payload
- **Hash** — SHA-256(previousHash + eventData)
- **PreviousHash** — hash of preceding event

This creates an unbroken chain: if any prior event is tampered with, the hash changes, breaking all subsequent hashes.

```
Genesis Block (hash="0")
  ↓
Event 1: action="gate-approved"
  hash = SHA-256("0" + eventData)
  ↓
Event 2: action="step-executed"
  hash = SHA-256(hash₁ + eventData)
  ↓
Event 3: action="run-completed"
  hash = SHA-256(hash₂ + eventData)
```

### Event Structure

All audit events follow the `AuditEvent` interface:

```typescript
interface AuditEvent {
  id: string;                           // Unique event ID
  orgId: string;                        // Organization context
  actor: string;                        // Who performed the action
  action: string;                       // Action type (e.g., 'gate-approved')
  resourceType: string;                 // Resource category (e.g., 'run', 'step')
  resourceId: string;                   // Specific resource identifier
  result: 'success' | 'failure';        // Outcome of the action
  payload: Record<string, any>;         // Action details (gate name, decision, etc.)
  hash: string;                         // SHA-256 hash of event + previousHash
  previousHash: string;                 // Hash of preceding event
  createdAt: Date;                      // Timestamp
}
```

### Example Event

```typescript
const event = {
  id: 'aud-123abc',
  orgId: 'org-456def',
  actor: 'security-agent',
  action: 'gate-approved',
  resourceType: 'run',
  resourceId: 'run-789ghi',
  result: 'success',
  payload: { 
    gate: 'security', 
    decision: 'pass',
    confidence: 0.95 
  },
  hash: 'abc123def456...',
  previousHash: 'xyz789uvw012...',
  createdAt: 2026-04-26T12:34:56.000Z
}
```

## AuditLogger API

### emit(event)

Record an audit event with hash-chain continuation.

```typescript
import { AuditLogger } from '@cku/audit'

await AuditLogger.emit({
  orgId: 'org-123',
  actor: 'api-user-456',
  action: 'run-created',
  resourceType: 'run',
  resourceId: 'run-789',
  result: 'success',
  payload: { intent: 'Deploy service to prod' }
})
// Transaction-safe: uses pg_advisory_xact_lock to prevent concurrent writes
// Returns: void (event stored, hash computed and persisted)
```

**Process:**
1. Acquire PostgreSQL advisory lock (org-level, prevents race conditions)
2. Fetch last hash for organization
3. Compute new hash: SHA-256(previousHash + JSON.stringify(event))
4. Insert event with new hash and previousHash
5. Commit transaction
6. Release lock

**Failure handling:**
- If INSERT fails, transaction rolls back and error is logged
- If hash computation fails, error is propagated (do not silence)

### getLastHash(orgId)

Retrieve the most recent event hash for an organization.

```typescript
const lastHash = await AuditLogger.getLastHash('org-123')
// Returns: string (SHA-256 hash)
// Used internally by emit() to compute the next hash
```

### computeHash(data, previousHash)

Compute SHA-256 hash for event data given previous hash.

```typescript
const hash = AuditLogger.computeHash(
  JSON.stringify(eventData),
  'xyz789uvw012...'
)
// Returns: string (SHA-256 hex digest)
// Static method; used in tests for verification
```

### getAuditTrail(orgId, resourceId?)

Retrieve audit history for an organization or specific resource.

```typescript
const allEvents = await AuditLogger.getAuditTrail('org-123')
// Returns: AuditEvent[] (all events for org, most recent first)

const runEvents = await AuditLogger.getAuditTrail('org-123', 'run-789')
// Returns: AuditEvent[] (events for specific run)
// Limited to 1000 most recent events
```

## Key Patterns

### Appending Records

Always use `AuditLogger.emit()` to add events. **Never insert directly into the database** — this would bypass hash-chain integrity.

```typescript
// CORRECT: Use emit() - maintains hash chain
await AuditLogger.emit({
  orgId,
  actor: 'control-service',
  action: 'gate-evaluated',
  resourceType: 'run',
  resourceId: runId,
  result: decision === 'approved' ? 'success' : 'failure',
  payload: { gate: gateName, decision, confidence }
})

// WRONG: Direct insert breaks hash chain
pool.query('INSERT INTO audit_events ...')
```

### Verifying Chain Integrity

To verify an audit trail has not been tampered with:

```typescript
const events = await AuditLogger.getAuditTrail(orgId)

let previousHash = 'GENESIS_HASH'
for (const event of events.reverse()) { // Process oldest first
  const expectedHash = AuditLogger.computeHash(
    JSON.stringify({
      orgId: event.orgId,
      actor: event.actor,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      result: event.result,
      payload: event.payload,
      createdAt: event.createdAt
    }),
    previousHash
  )
  
  if (expectedHash !== event.hash) {
    throw new Error(`Chain broken at event ${event.id}`)
  }
  
  previousHash = event.hash
}

console.log('✓ Audit trail verified')
```

### Immutability Enforcement

**Advisory Lock Strategy:** The `pg_advisory_xact_lock(1)` call ensures only one writer per organization at a time. If two writes attempt simultaneously:

1. First writer acquires lock
2. Second writer waits (blocks in BEGIN)
3. First writer commits, releases lock
4. Second writer acquires lock, fetches last hash (which now includes first writer's event), computes next hash

Result: **Sequential writes; no hash collisions or race conditions.**

```typescript
// Thread-safe append:
BEGIN
  SELECT pg_advisory_xact_lock(1)  -- Serialize writes
  SELECT hash FROM audit_events ... -- Get last hash
  INSERT audit_events ...           -- Insert new event with hash
COMMIT
```

## Testing

### Unit Tests

Test hash computation and chain integrity:

```typescript
describe('AuditLogger.computeHash', () => {
  it('produces consistent SHA-256 hashes', () => {
    const data = '{"action":"test"}'
    const prevHash = 'abc123'
    
    const hash1 = AuditLogger.computeHash(data, prevHash)
    const hash2 = AuditLogger.computeHash(data, prevHash)
    
    expect(hash1).toBe(hash2)
  })

  it('changes hash when data differs', () => {
    const prevHash = 'abc123'
    const hash1 = AuditLogger.computeHash('{"a":1}', prevHash)
    const hash2 = AuditLogger.computeHash('{"a":2}', prevHash)
    
    expect(hash1).not.toBe(hash2)
  })

  it('changes hash when previousHash differs', () => {
    const data = '{"action":"test"}'
    const hash1 = AuditLogger.computeHash(data, 'abc123')
    const hash2 = AuditLogger.computeHash(data, 'xyz789')
    
    expect(hash1).not.toBe(hash2)
  })
})
```

### Integration Tests

Test full emit flow with real PostgreSQL:

```typescript
describe('AuditLogger.emit', () => {
  beforeEach(async () => {
    // Setup test database with audit_events table
    await setupTestDb()
  })

  it('appends event with computed hash', async () => {
    await AuditLogger.emit({
      orgId: 'test-org',
      actor: 'test-actor',
      action: 'test-action',
      resourceType: 'test',
      resourceId: 'test-123',
      result: 'success',
      payload: { test: true }
    })

    const trail = await AuditLogger.getAuditTrail('test-org')
    expect(trail.length).toBe(1)
    expect(trail[0].action).toBe('test-action')
    expect(trail[0].hash).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hex
  })

  it('chains hashes sequentially', async () => {
    const orgId = 'chain-test'
    
    // Event 1
    await AuditLogger.emit({
      orgId,
      actor: 'a1',
      action: 'action1',
      resourceType: 'test',
      resourceId: 'res1',
      result: 'success',
      payload: {}
    })

    // Event 2
    await AuditLogger.emit({
      orgId,
      actor: 'a2',
      action: 'action2',
      resourceType: 'test',
      resourceId: 'res2',
      result: 'success',
      payload: {}
    })

    const trail = await AuditLogger.getAuditTrail(orgId)
    expect(trail.length).toBe(2)
    
    // Event 2 should have Event 1's hash as previousHash
    expect(trail[0].previousHash).toBe(trail[1].hash)
  })

  it('enforces immutability via advisory lock', async () => {
    const orgId = 'lock-test'
    
    // Simulate concurrent writes
    const promises = Array.from({ length: 5 }, (_, i) =>
      AuditLogger.emit({
        orgId,
        actor: `actor-${i}`,
        action: `action-${i}`,
        resourceType: 'test',
        resourceId: `res-${i}`,
        result: 'success',
        payload: {}
      })
    )

    await Promise.all(promises)
    
    const trail = await AuditLogger.getAuditTrail(orgId)
    expect(trail.length).toBe(5)
    
    // Verify chain integrity
    for (let i = 1; i < trail.length; i++) {
      expect(trail[i].previousHash).toBe(trail[i - 1].hash)
    }
  })
})
```

## Gotchas

### 1. Immutability is Cryptographic, Not Operational

The hash-chain prevents **detection** of tampering, not **prevention**. If someone has database write access, they can:
- Modify an event
- Recompute all subsequent hashes
- Update the database

**Mitigation:** Restrict audit table writes to the AuditLogger service, use read-only replicas for verification, send events to external system (InsForge) for cryptographic timestamping.

### 2. Clock Skew Affects Ordering

If events are logged from multiple servers with unsynchronized clocks, `createdAt` timestamps may not reflect logical order. The hash-chain order is correct (via lock), but timestamps might be misleading.

**Mitigation:** Use PostgreSQL `NOW()` on the server (not client timestamp), ensure all servers run NTP.

```typescript
// CORRECT: Server generates timestamp
INSERT INTO audit_events (..., created_at) VALUES (..., NOW())

// RISKY: Client provides timestamp
INSERT INTO audit_events (..., created_at) VALUES (..., ?)
```

### 3. Advisory Lock Contention on High-Volume Writes

If many concurrent clients try to emit events for the same `orgId`, they serialize behind the lock. For organizations with very high audit volume (>1000 events/sec), this may become a bottleneck.

**Mitigation:** Shard `orgId` across multiple lock IDs, or use event batching (accumulate events in memory, flush in batches).

```typescript
// Example: Shard lock by orgId hash
const lockId = parseInt(crypto.createHash('md5').update(orgId).digest('hex').slice(0, 8), 16) % 1000
await client.query('SELECT pg_advisory_xact_lock($1)', [lockId])
```

### 4. getAuditTrail Limits to 1000 Recent Events

For organizations with millions of audit events, `getAuditTrail` returns only the 1000 most recent. For full history, pagination is needed.

**Mitigation:** Add optional `offset` and `limit` parameters, or export audit trail to external system (InsForge, S3).

### 5. Transaction Rollback on Failure Leaves No Trace

If `emit()` throws an error and the transaction rolls back, **no event is recorded**. This is correct for maintaining hash-chain integrity, but means some failures are not logged.

**Mitigation:** Wrap `emit()` in retry logic with exponential backoff, or pre-allocate audit slots to guarantee space.

```typescript
async function emitWithRetry(event, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await AuditLogger.emit(event)
    } catch (err) {
      if (attempt === maxRetries - 1) throw err
      
      const delay = Math.pow(2, attempt) * 100 // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
```

## Cross-References

**Depends on:**
- `@cku/shared` — Database pool, logger, ID generator

**Used by:**
- `@cku/governance` — Logs gate decisions to audit trail
- `@cku/orchestrator` — Logs step execution events
- `apps/control-service` — Logs all API actions to audit trail

**Related:**
- [Root CLAUDE.md](../../CLAUDE.md) — Monorepo overview
- [System Architecture](../../docs/ARCHITECTURE.md) — How audit fits in execution pipeline
- [Governance Package](../governance/CLAUDE.md) — Gate evaluation and decision logging
- [Orchestrator Package](../orchestrator/CLAUDE.md) — Step execution and healing/rollback logging
