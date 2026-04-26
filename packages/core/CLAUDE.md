# Core Package

**Quick Reference:** Foundational utilities, type helpers, and shared constants. Minimal dependencies; widely imported across codebase.

**Workspace:** `packages/core`

---

## Overview

The core package provides essential utilities used throughout the system:

- **Authentication Utilities** — JWT validation, token verification, session management
- **Policy Engine** — Policy evaluation, rule matching, decision logic
- **Audit Logging** — Audit trail recording with hash chain integrity
- **Type Definitions** — Shared types and interfaces
- **Constants** — Configuration defaults, magic numbers, timeouts

### Philosophy

Keep this package lightweight and dependency-light. It's imported by many other packages; adding dependencies here cascades across the entire codebase.

---

## Exported Utilities

### Authentication Module (`auth.ts`)

Provides JWT token validation and session management.

#### Types

```typescript
interface TokenPayload {
  userId: string
  email: string
  roles: string[]
  exp: number              // Expiration timestamp
  iat: number              // Issued-at timestamp
}

interface VerificationResult {
  valid: boolean
  payload?: TokenPayload
  error?: string
}
```

#### Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `verifyToken(token: string, secret: string): VerificationResult` | Validates JWT signature and expiry | Core JWT validation |
| `validateTokenExpiry(payload: TokenPayload): boolean` | Checks if token is not expired | Expiry check |
| `extractPayload(token: string): TokenPayload \| null` | Decodes (without verifying) | Debug/inspection only |
| `createSessionToken(userId: string, secret: string, ttl?: number): string` | Issues new JWT | Session creation |

#### Usage Example

```typescript
import { verifyToken, createSessionToken } from '@packages/core'

// Verify incoming token
const result = verifyToken(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET!)
if (!result.valid) {
  throw new Error(`Invalid token: ${result.error}`)
}
console.log(`User: ${result.payload?.userId}`)

// Create new session token
const token = createSessionToken('user-123', process.env.JWT_SECRET!, 3600) // 1 hour
```

### Policy Engine Module (`policy-engine.ts`)

Evaluates policies and rules against context.

#### Types

```typescript
interface PolicyContext {
  userId: string
  roles: string[]
  mode: 'dev' | 'staging' | 'prod'
  resourceType: string
  action: string
  metadata?: Record<string, unknown>
}

interface PolicyRule {
  id: string
  condition: (ctx: PolicyContext) => boolean
  effect: 'allow' | 'deny'
  reason?: string
}

interface PolicyEvaluationResult {
  allowed: boolean
  appliedRules: string[]
  reason?: string
}
```

#### Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `evaluatePolicy(context: PolicyContext, rules: PolicyRule[]): PolicyEvaluationResult` | Core policy evaluation | Apply rules to context |
| `matchRules(context: PolicyContext, rules: PolicyRule[]): PolicyRule[]` | Filter matching rules | Find applicable rules |
| `createRoleBasedRule(roles: string[], effect: 'allow' \| 'deny'): PolicyRule` | Helper for RBAC rules | Common pattern |
| `createModeBasedRule(modes: string[], effect: 'allow' \| 'deny'): PolicyRule` | Helper for mode-based rules | Environment gating |

#### Usage Example

```typescript
import { evaluatePolicy, createRoleBasedRule } from '@packages/core'

const context = {
  userId: 'user-123',
  roles: ['engineer'],
  mode: 'prod' as const,
  resourceType: 'execution-plan',
  action: 'approve'
}

const rules = [
  createRoleBasedRule(['admin', 'approver'], 'allow'),
  createRoleBasedRule(['viewer'], 'deny')
]

const result = evaluatePolicy(context, rules)
console.log(`Allowed: ${result.allowed}, Applied: ${result.appliedRules.join(', ')}`)
```

### Audit Logger Module (`audit-logger.ts`)

Records audit events with SHA-256 hash chain for integrity.

#### Types

```typescript
interface AuditEvent {
  id: string                    // UUID
  timestamp: string             // ISO 8601
  userId: string
  action: string
  resourceType: string
  resourceId: string
  changes?: Record<string, unknown>
  result: 'success' | 'failure'
  error?: string
  hash: string                  // SHA-256 of this + previous
  previousHash?: string         // Hash chain link
}

interface AuditLogOptions {
  emitToInsForge?: boolean      // Send to external audit store
  insForgeUrl?: string
  insForgeKey?: string
}
```

#### Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `createAuditEvent(userId: string, action: string, resourceType: string, resourceId: string): AuditEvent` | Create event record | Initialize audit entry |
| `computeEventHash(event: AuditEvent, previousHash: string): string` | Generate hash chain link | Ensure integrity |
| `verifyHashChain(events: AuditEvent[]): boolean` | Validate hash chain integrity | Detect tampering |
| `recordAuditEvent(event: AuditEvent, options?: AuditLogOptions): Promise<void>` | Persist event | Store audit trail |
| `getAuditTrail(userId: string, startDate: Date, endDate: Date): Promise<AuditEvent[]>` | Query audit logs | Retrieve history |

#### Usage Example

```typescript
import { createAuditEvent, recordAuditEvent, verifyHashChain } from '@packages/core'

// Create audit entry
const event = createAuditEvent('user-123', 'approve-gate', 'gate', 'gate-456')
event.changes = { decision: 'approved', reason: 'Verified by security team' }
event.result = 'success'

// Record with hash chain
await recordAuditEvent(event, {
  emitToInsForge: true,
  insForgeUrl: process.env.INSFORGE_URL,
  insForgeKey: process.env.INSFORGE_API_KEY
})

// Verify chain integrity
const trail = await getAuditTrail('user-123', new Date('2024-01-01'), new Date())
const isIntact = verifyHashChain(trail)
console.log(`Audit trail integrity: ${isIntact ? 'OK' : 'TAMPERED'}`)
```

### Type Definitions Module (`types.ts`)

Shared types used across packages.

#### Common Types

```typescript
type Mode = 'dev' | 'staging' | 'prod'

interface RunReport {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  output?: string
  error?: string
  metrics?: {
    duration: number      // Milliseconds
    tokensUsed: number
    costEstimate: number
  }
}

interface ExecutionContext {
  runId: string
  userId: string
  mode: Mode
  startTime: Date
  timeout: number        // Milliseconds
}

interface GatedDecision {
  gateId: string
  decision: 'approved' | 'rejected' | 'pending'
  approver?: string
  reason?: string
  decidedAt?: Date
}
```

#### Type Guards

| Function | Signature | Purpose |
|----------|-----------|---------|
| `isValidMode(value: unknown): value is Mode` | Type guard | Runtime mode validation |
| `isValidStatus(value: unknown): value is RunStatus` | Type guard | Runtime status validation |
| `isExecutionContext(value: unknown): value is ExecutionContext` | Type guard | Context validation |

#### Usage Example

```typescript
import type { Mode, ExecutionContext } from '@packages/core'
import { isValidMode, isExecutionContext } from '@packages/core'

// Type-safe mode checking
const mode: Mode | null = process.env.CODEKIT_PROFILE as Mode

if (isValidMode(mode)) {
  console.log(`Running in ${mode} mode`)
} else {
  throw new Error(`Invalid mode: ${mode}`)
}

// Runtime validation
function executeRun(ctx: unknown): void {
  if (!isExecutionContext(ctx)) {
    throw new Error('Invalid execution context')
  }
  // ctx is now typed as ExecutionContext
}
```

---

## Constants & Configuration

### Environment & Mode Constants

```typescript
// Mode defaults
const DEFAULT_MODE = 'dev'
const VALID_MODES = ['dev', 'staging', 'prod'] as const

// Timeouts (milliseconds)
const DEFAULT_TIMEOUT = 30000          // 30 seconds
const API_TIMEOUT = 10000              // 10 seconds
const DB_TIMEOUT = 5000                // 5 seconds
const EXECUTION_TIMEOUT = 300000       // 5 minutes

// Rate limits
const MAX_RETRIES = 3
const BACKOFF_BASE = 1000              // 1 second
const BACKOFF_MULTIPLIER = 2           // Exponential backoff
```

### Crypto Constants

```typescript
const HASH_ALGORITHM = 'sha256'
const TOKEN_ENCODING = 'utf-8'
const SIGNATURE_ALGORITHM = 'HS256'    // JWT default
```

### Permission Defaults

```typescript
const DEFAULT_ROLES = ['viewer']       // Minimal permissions
const ADMIN_ROLE = 'admin'
const APPROVER_ROLE = 'approver'
const ENGINEER_ROLE = 'engineer'
```

---

## Common Usage Patterns

### 1. Validate Execution Context

```typescript
import { isExecutionContext } from '@packages/core'
import type { ExecutionContext } from '@packages/core'

function validateContext(ctx: unknown): ExecutionContext {
  if (!isExecutionContext(ctx)) {
    throw new Error('Invalid context structure')
  }
  return ctx
}
```

### 2. Check Permissions in Middleware

```typescript
import { verifyToken, evaluatePolicy } from '@packages/core'
import type { PolicyContext } from '@packages/core'

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Missing token' })

  const result = verifyToken(token, process.env.JWT_SECRET!)
  if (!result.valid) return res.status(401).json({ error: result.error })

  const context: PolicyContext = {
    userId: result.payload!.userId,
    roles: result.payload!.roles,
    mode: process.env.CODEKIT_PROFILE as any,
    resourceType: 'api-endpoint',
    action: req.method
  }

  // req.user is now available in handlers
  req.user = result.payload
  next()
}
```

### 3. Log Audit Trail

```typescript
import { createAuditEvent, recordAuditEvent, verifyHashChain } from '@packages/core'

// After approving a gate
const event = createAuditEvent(userId, 'gate-approved', 'gate', gateId)
event.changes = { decision: 'approved', riskScore: 0.15 }
event.result = 'success'

await recordAuditEvent(event, {
  emitToInsForge: true,
  insForgeUrl: process.env.INSFORGE_URL,
  insForgeKey: process.env.INSFORGE_API_KEY
})
```

### 4. Evaluate Mode-Based Policy

```typescript
import { evaluatePolicy, createModeBasedRule } from '@packages/core'

const productionOnlyRule = createModeBasedRule(['prod'], 'deny')
const result = evaluatePolicy(context, [productionOnlyRule])

if (!result.allowed) {
  console.log(`Operation denied in ${context.mode}: ${result.reason}`)
}
```

---

## Testing

### Unit Tests for Auth Module

```typescript
import { describe, it, expect } from 'vitest'
import { verifyToken, createSessionToken } from '@packages/core'

describe('Auth Module', () => {
  const secret = 'test-secret-key'

  it('creates and validates token', () => {
    const token = createSessionToken('user-123', secret, 3600)
    const result = verifyToken(token, secret)
    
    expect(result.valid).toBe(true)
    expect(result.payload?.userId).toBe('user-123')
  })

  it('rejects expired token', () => {
    const token = createSessionToken('user-123', secret, -1) // Already expired
    const result = verifyToken(token, secret)
    
    expect(result.valid).toBe(false)
    expect(result.error).toContain('expired')
  })
})
```

### Unit Tests for Policy Engine

```typescript
describe('Policy Engine', () => {
  it('evaluates role-based rules', () => {
    const context = {
      userId: 'user-123',
      roles: ['engineer'],
      mode: 'prod' as const,
      resourceType: 'gate',
      action: 'approve'
    }

    const denyRule = createRoleBasedRule(['viewer'], 'deny')
    const result = evaluatePolicy(context, [denyRule])

    expect(result.allowed).toBe(true) // engineer not in ['viewer']
  })
})
```

---

## Error Handling

### Common Error Scenarios

| Error | Cause | Recovery |
|-------|-------|----------|
| Invalid token | Malformed JWT | Return 401, ask client to re-authenticate |
| Token expired | TTL exceeded | Return 401, client should refresh token |
| Hash chain broken | Audit tampering | Alert security team, quarantine logs |
| Policy evaluation fails | Missing context field | Log error, deny operation as fallback |

### Best Practices

1. **Validate early** — Check context at entry points
2. **Log decisions** — Record all policy evaluations to audit trail
3. **Fail securely** — Deny on ambiguity, not allow
4. **Rotate secrets** — Regularly update JWT secret
5. **Verify chains** — Periodically validate audit hash chain integrity

---

## Gotchas & Known Limitations

1. **JWT Secret Management**
   - Secret stored in environment variable (not secure for sensitive deployments)
   - No key rotation mechanism built-in
   - Compromise of secret invalidates all tokens immediately

2. **Audit Hash Chain**
   - Hash chain validation is O(n); slow for large audit trails
   - No batching/compression of old entries
   - Storage grows linearly with activity

3. **Policy Engine Limits**
   - Rules evaluated in order; no prioritization or optimization
   - No caching of evaluation results
   - Complex rules can become slow with many conditions

4. **Type Guards Performance**
   - Type guards use runtime reflection; not zero-cost
   - Deep object validation can be slow
   - No built-in memoization

5. **Default Timeouts**
   - Hardcoded values may not suit all use cases
   - Network timeouts vary by environment
   - No adaptive timeout adjustment

---

## Cross-References

**Depends on:**
- No internal dependencies (intentionally kept lightweight)
- Node.js built-ins: `crypto`, `jsonwebtoken` (optional)

**Used by:**
- Nearly all packages (auth, policy, audit utilities)
- `apps/control-service` — Authentication, policy evaluation, audit logging
- `apps/cli` — Token validation, policy checks
- `packages/auth` — JWT utilities
- `packages/governance` — Policy evaluation for gates
- `packages/orchestrator` — Execution context validation

**Related Documentation:**
- [Root CLAUDE.md](../../CLAUDE.md) — Project overview
- [Auth Package](../auth/CLAUDE.md) — Extended authentication
- [Policy Package](../policy/CLAUDE.md) — Full policy system
- [Security Runbooks](../../docs/SECURITY_RUNBOOKS.md) — Credential rotation, incident response

---

## File Structure

```
packages/core/
├── src/
│   ├── index.ts                    # Re-exports all modules
│   ├── auth.ts                     # JWT validation, session management
│   ├── auth.test.ts                # Auth unit tests
│   ├── policy-engine.ts            # Policy evaluation, rule matching
│   ├── policy-engine.test.ts       # Policy unit tests
│   ├── audit-logger.ts             # Audit trail, hash chain
│   ├── audit-logger.test.ts        # Audit unit tests
│   └── types.ts                    # Shared types, interfaces, guards
├── package.json
└── README.md
```
