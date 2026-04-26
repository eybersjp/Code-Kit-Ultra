# Testing Guide

Comprehensive testing strategy for Code Kit Ultra, covering unit, integration, and E2E testing across the pnpm monorepo.

## Testing Strategy

Code Kit Ultra employs a **three-tier testing approach**:

1. **Unit Tests** — Individual functions, utilities, components in isolation (mocked dependencies)
2. **Integration Tests** — API endpoints, database operations, real external connections
3. **E2E Tests** — Critical user flows end-to-end (planned with Playwright)

**Coverage Target:** 80%+ overall
- Control-service: 75%+ (integration tests reduce mock burden)
- Packages: 85%+
- Exclusions: migrations, test files, node_modules, generated code

## Test Commands Reference

### Comprehensive Test Command Table

| Command | Scope | Type | Time | Purpose |
|---------|-------|------|------|---------|
| `pnpm run test:unit` | All packages | Unit | ~30s | All unit tests across all packages |
| `pnpm run test:auth` | `packages/auth` | Unit | ~5s | Auth module tests (critical path) |
| `pnpm run test:governance` | `packages/governance` | Unit | ~10s | Governance gates tests |
| `pnpm run test:orchestrator` | `packages/orchestrator` | Unit | ~8s | Orchestrator state machine tests |
| `pnpm run test:session` | `packages/auth` | Unit | ~3s | Session resolution tests only |
| `pnpm run test:rbac` | `packages/auth` | Unit | ~3s | RBAC tests only |
| `pnpm --filter control-service run test` | control-service | Mixed | ~25s | All control-service tests |
| `pnpm run test:integration` | control-service | Integration | ~45s | Real DB/Redis tests |
| `pnpm run test:smoke` | control-service | Smoke | ~5s | Smoke tests only (API startup verification) |
| `pnpm run test:all` | Everything | Mixed | ~90s | All unit + integration + E2E tests |
| `pnpm run test:coverage` | All | Mixed | ~60s | Coverage report with HTML output |
| `pnpm run typecheck` | All workspaces | Type | ~10s | TypeScript type checking (no runtime) |
| `pnpm run preflight` | Critical path | Gate | ~15s | Type check + auth tests (CI blocker) |

### Quick Test Commands

```bash
# Fastest feedback (type + critical auth path)
pnpm run preflight

# Unit tests only (no integration)
pnpm run test:unit

# Full integration + unit
pnpm run test:all

# Coverage report with HTML
pnpm run test:coverage
# Open: coverage/index.html
```

## Test Organization

### File Structure

```
monorepo/
├── packages/
│   ├── auth/
│   │   └── src/
│   │       ├── resolve-session.test.ts       # Unit tests
│   │       ├── rbac.test.ts
│   │       └── session-revocation.test.ts
│   ├── governance/
│   │   └── src/
│   │       ├── gates/gate-manager.test.ts
│   │       └── consensus/voting.test.ts
│   └── [other packages]
│       └── src/
│           └── *.test.ts
│
└── apps/
    └── control-service/
        ├── src/
        │   └── handlers/
        │       └── create-run.test.ts         # Colocated unit tests
        ├── test/                              # Integration tests
        │   ├── setup.ts                       # Global test setup + mocks
        │   ├── smoke.test.ts
        │   ├── create-run.test.ts             # Integration variant
        │   ├── integration-workflows.test.ts
        │   ├── healing-and-rollback.test.ts
        │   └── [other integration tests]
        └── vitest.config.ts                   # Separate config for integration
```

### Naming Conventions

- **Unit tests:** Colocated with source, `*.test.ts` or `*.spec.ts`
- **Integration tests:** In `apps/control-service/test/`, `*.test.ts` or `*.integration.test.ts`
- **Test suites:** Named by feature, e.g., `create-run.test.ts`, `healing-and-rollback.test.ts`

### Test Isolation

- **Unit tests:** Mock all external dependencies (DB, Redis, HTTP calls)
- **Integration tests:** Use real PostgreSQL and Redis (via Docker Compose or manual setup)
- **E2E tests:** Use real running server (planned)

## Unit Test Patterns

### Pattern 1: Testing Functions with Mocks

```typescript
import { describe, it, expect, vi } from 'vitest'
import { calculateGateScore } from './gate-scorer'
import * as policy from '@governance/policy-loader'

describe('Gate Scorer', () => {
  it('returns weighted average of gate votes', () => {
    const votes = {
      security: 0.8,
      quality: 0.9,
      approval: 1.0,
    }

    const result = calculateGateScore(votes)
    expect(result).toBe(0.9) // (0.8 + 0.9 + 1.0) / 3
  })

  it('applies custom weights from policy', () => {
    vi.spyOn(policy, 'loadWeights').mockReturnValue({
      security: 2.0,
      quality: 1.0,
      approval: 1.0,
    })

    const votes = { security: 0.5, quality: 0.9, approval: 1.0 }
    const result = calculateGateScore(votes)

    // (0.5 * 2.0 + 0.9 * 1.0 + 1.0 * 1.0) / 4.0 = 0.725
    expect(result).toBeCloseTo(0.725, 2)
  })

  it('throws on invalid vote range', () => {
    const invalidVotes = { security: 1.5, quality: 0.9 }
    expect(() => calculateGateScore(invalidVotes)).toThrow(
      'Vote must be between 0 and 1'
    )
  })
})
```

### Pattern 2: Testing React Components (if applicable)

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GateApprovalPanel } from './GateApprovalPanel'

interface GatePanelProps {
  gateName: string
  status: 'pending' | 'approved' | 'rejected'
  onApprove: () => void
}

describe('GateApprovalPanel', () => {
  it('renders gate name and status', () => {
    render(
      <GateApprovalPanel
        gateName="security"
        status="pending"
        onApprove={vi.fn()}
      />
    )

    expect(screen.getByText('security')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('calls onApprove when button clicked', async () => {
    const onApprove = vi.fn()
    const user = userEvent.setup()

    render(
      <GateApprovalPanel
        gateName="quality"
        status="pending"
        onApprove={onApprove}
      />
    )

    const approveButton = screen.getByRole('button', { name: /approve/i })
    await user.click(approveButton)

    expect(onApprove).toHaveBeenCalledOnce()
  })

  it('disables button when status is approved', () => {
    render(
      <GateApprovalPanel
        gateName="security"
        status="approved"
        onApprove={vi.fn()}
      />
    )

    const approveButton = screen.getByRole('button', { name: /approve/i })
    expect(approveButton).toBeDisabled()
  })
})
```

### Pattern 3: Testing Database Interactions with Fixtures

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getPool } from '../db/pool'
import { createRunRecord, findRunById } from '../services/run-store'

interface Run {
  id: string
  tenantId: string
  status: 'pending' | 'approved' | 'executing' | 'completed'
  createdAt: Date
}

describe('Run Store (with fixtures)', () => {
  let testRunId: string

  beforeEach(async () => {
    // Create test fixture
    const pool = getPool()
    testRunId = `run-${Date.now()}`
    await pool.query(
      'INSERT INTO runs (id, tenant_id, status) VALUES ($1, $2, $3)',
      [testRunId, 'org-test', 'pending']
    )
  })

  afterEach(async () => {
    // Cleanup
    const pool = getPool()
    await pool.query('DELETE FROM runs WHERE id = $1', [testRunId])
  })

  it('retrieves run by ID', async () => {
    const run = await findRunById(testRunId)
    expect(run).toBeDefined()
    expect(run?.id).toBe(testRunId)
    expect(run?.status).toBe('pending')
  })

  it('creates new run with unique ID', async () => {
    const newRun = await createRunRecord({
      tenantId: 'org-test',
      status: 'pending',
    })

    expect(newRun.id).toMatch(/^run-/)
    expect(newRun.createdAt).toBeInstanceOf(Date)
  })
})
```

### Pattern 4: Testing Async Code (Promises and Timers)

```typescript
import { describe, it, expect, vi } from 'vitest'
import { retryOperation } from './retry-handler'

describe('Retry Handler', () => {
  it('retries on transient failure', async () => {
    let attempts = 0
    const operation = vi.fn(async () => {
      attempts++
      if (attempts < 3) throw new Error('Transient failure')
      return 'success'
    })

    const result = await retryOperation(operation, { maxRetries: 3 })
    expect(result).toBe('success')
    expect(attempts).toBe(3)
  })

  it('fails after max retries exceeded', async () => {
    const operation = vi.fn(async () => {
      throw new Error('Permanent failure')
    })

    await expect(
      retryOperation(operation, { maxRetries: 2 })
    ).rejects.toThrow('Permanent failure')
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('respects exponential backoff timing', async () => {
    vi.useFakeTimers()
    const operation = vi.fn(async () => {
      throw new Error('Failure')
    })

    const promise = retryOperation(operation, {
      maxRetries: 2,
      backoffMs: 100,
    })

    // Fast-forward through backoff delays
    await vi.advanceTimersByTimeAsync(100)
    await vi.advanceTimersByTimeAsync(200)

    await expect(promise).rejects.toThrow()
    vi.useRealTimers()
  })
})
```

## Integration Test Patterns

### Pattern 1: Real Database Connections

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/index'
import { getPool } from '../src/db/pool'

interface RunRecord {
  id: string
  status: string
  output: string
}

describe('Create Run Integration', () => {
  let pool: any

  beforeEach(async () => {
    pool = getPool()
    // Ensure tables exist (migrations should run on startup)
    await pool.query(
      `CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        output TEXT
      )`
    )
  })

  afterEach(async () => {
    // Cleanup test records
    await pool.query('DELETE FROM runs WHERE id LIKE $1', ['test-%'])
  })

  it('creates run in database via POST /runs', async () => {
    const response = await request(app)
      .post('/runs')
      .set('Authorization', 'Bearer admin-token')
      .send({
        tenantId: 'org-test',
        intent: 'Deploy service',
      })

    expect(response.status).toBe(201)
    expect(response.body.data.id).toMatch(/^run-/)

    // Verify persisted in DB
    const result = await pool.query(
      'SELECT * FROM runs WHERE id = $1',
      [response.body.data.id]
    )
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].status).toBe('pending')
  })

  it('handles database errors gracefully', async () => {
    // Simulate database unavailability
    vi.spyOn(pool, 'query').mockRejectedValueOnce(
      new Error('Connection timeout')
    )

    const response = await request(app)
      .post('/runs')
      .set('Authorization', 'Bearer admin-token')
      .send({ tenantId: 'org-test', intent: 'Deploy' })

    expect(response.status).toBe(503)
    expect(response.body.error).toContain('Service unavailable')
  })
})
```

### Pattern 2: Real Redis Connections

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getRedisClient } from '../src/redis/client'
import { cacheApproval } from '../src/cache/approval-cache'

describe('Approval Cache (with Redis)', () => {
  let redis: any

  beforeEach(async () => {
    redis = getRedisClient()
    await redis.connect()
    await redis.flushDb() // Clear test data
  })

  afterEach(async () => {
    await redis.disconnect()
  })

  it('caches approval decisions with TTL', async () => {
    const approvalId = 'approval-123'
    const decision = { status: 'approved', reason: 'Security check passed' }

    await cacheApproval(approvalId, decision, { ttlSeconds: 3600 })

    const cached = await redis.get(`approval:${approvalId}`)
    expect(cached).toBeDefined()
    expect(JSON.parse(cached)).toEqual(decision)
  })

  it('expires cached entries after TTL', async () => {
    vi.useFakeTimers()
    const approvalId = 'approval-456'

    await cacheApproval(approvalId, { status: 'approved' }, {
      ttlSeconds: 2,
    })

    // Fast-forward past TTL
    await vi.advanceTimersByTimeAsync(3000)

    const cached = await redis.get(`approval:${approvalId}`)
    expect(cached).toBeNull()

    vi.useRealTimers()
  })
})
```

### Pattern 3: API Testing with supertest

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/index'

describe('Approval Endpoints', () => {
  const validToken = 'reviewer-token'

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
  })

  it('GET /approvals returns pending approvals', async () => {
    const response = await request(app)
      .get('/approvals')
      .set('Authorization', `Bearer ${validToken}`)
      .query({ status: 'pending' })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('data')
    expect(Array.isArray(response.body.data)).toBe(true)
  })

  it('POST /approvals/:id/approve requires authorization', async () => {
    const response = await request(app)
      .post('/approvals/approval-123/approve')
      .send({ reason: 'Looks good' })
    // No Authorization header

    expect(response.status).toBe(401)
    expect(response.body.error).toContain('unauthorized')
  })

  it('POST /approvals/:id/approve with insufficient permissions returns 403', async () => {
    const viewerToken = 'viewer-token' // Viewer cannot approve

    const response = await request(app)
      .post('/approvals/approval-123/approve')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ reason: 'Looks good' })

    expect(response.status).toBe(403)
    expect(response.body.error).toContain('forbidden')
  })

  it('POST /approvals/:id/approve records decision and emits event', async () => {
    const response = await request(app)
      .post('/approvals/approval-456/approve')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ reason: 'Security review passed' })

    expect(response.status).toBe(200)
    expect(response.body.data.status).toBe('approved')

    // Verify audit was logged
    const { writeAuditEvent } = await import('../src/audit')
    expect(writeAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'approval-recorded',
        approvalId: 'approval-456',
      })
    )
  })
})
```

### Pattern 4: Gate Evaluation with Real GateManager

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { GateManager } from '../../../packages/governance/src/gate-manager'
import { loadPolicy } from '../../../packages/policy/src/policy-loader'

describe('Gate Evaluation Integration', () => {
  let gateManager: GateManager

  beforeEach(async () => {
    const policy = await loadPolicy('config/policy.json')
    gateManager = new GateManager(policy)
  })

  it('evaluates all 9 gates and returns decision', async () => {
    const context = {
      runId: 'run-123',
      tenantId: 'org-test',
      mode: 'staging',
      action: 'Deploy service',
      actor: { roles: ['operator'] },
    }

    const decision = await gateManager.evaluate(context)

    expect(decision).toHaveProperty('approved')
    expect(decision).toHaveProperty('gates')
    expect(decision.gates).toHaveLength(9)
    expect(decision.gates[0]).toHaveProperty('name')
    expect(decision.gates[0]).toHaveProperty('passed')
  })

  it('blocks execution when security gate fails', async () => {
    const context = {
      runId: 'run-124',
      tenantId: 'org-test',
      mode: 'prod',
      action: 'Execute shell script',
      actor: { roles: ['viewer'] }, // Viewer lacks execute permission
    }

    const decision = await gateManager.evaluate(context)

    expect(decision.approved).toBe(false)
    const securityGate = decision.gates.find((g: any) => g.name === 'security')
    expect(securityGate?.passed).toBe(false)
  })
})
```

## Test Fixtures and Seeding

### Fixture Strategy

**Location:** `apps/control-service/test/fixtures/`

```typescript
// test/fixtures/seed-auth.ts
export async function seedAuthTestData(pool: any) {
  await pool.query(
    `INSERT INTO users (id, email, roles, tenant_id)
     VALUES ($1, $2, $3, $4)`,
    [
      'user-admin-1',
      'admin@test.local',
      JSON.stringify(['admin']),
      'org-test',
    ]
  )

  await pool.query(
    `INSERT INTO users (id, email, roles, tenant_id)
     VALUES ($1, $2, $3, $4)`,
    [
      'user-operator-1',
      'operator@test.local',
      JSON.stringify(['operator']),
      'org-test',
    ]
  )
}

// test/fixtures/seed-runs.ts
export async function seedRunTestData(pool: any) {
  await pool.query(
    `INSERT INTO runs (id, tenant_id, status, created_at)
     VALUES ($1, $2, $3, $4)`,
    ['run-pending-1', 'org-test', 'pending', new Date()]
  )

  await pool.query(
    `INSERT INTO runs (id, tenant_id, status, created_at)
     VALUES ($1, $2, $3, $4)`,
    ['run-completed-1', 'org-test', 'completed', new Date()]
  )
}
```

### Per-Test Setup Pattern

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getPool } from '../src/db/pool'
import { seedAuthTestData, seedRunTestData } from './fixtures'

describe('Run Execution (with fixtures)', () => {
  let pool: any

  beforeEach(async () => {
    pool = getPool()
    // Seed minimal test data for this test suite
    await seedAuthTestData(pool)
    await seedRunTestData(pool)
  })

  afterEach(async () => {
    // Cleanup: delete in reverse order of creation (foreign key constraints)
    await pool.query('DELETE FROM runs')
    await pool.query('DELETE FROM users')
  })

  it('executes run and records completion', async () => {
    const result = await executeRun('run-pending-1')
    expect(result.status).toBe('completed')
  })
})
```

### Per-Suite Setup Pattern

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('Approval Workflow Suite', () => {
  beforeAll(async () => {
    // Heavy setup (DB migrations, seed all data)
    await runMigrations()
    await seedAllTestData()
  })

  afterAll(async () => {
    // Heavy cleanup
    await truncateAllTables()
  })

  it('test 1: approval request created', async () => {
    // Uses pre-seeded data
  })

  it('test 2: approval evaluated', async () => {
    // Uses pre-seeded data
  })

  it('test 3: approval executed', async () => {
    // Uses pre-seeded data
  })
})
```

## Coverage Targets

### Enforcement

```bash
# View current coverage
pnpm run test:coverage

# Enforce minimum thresholds (vitest.config.ts)
lines: 80
functions: 80
branches: 80
statements: 80
```

### By Package

| Package | Target | Rationale |
|---------|--------|-----------|
| auth | 90%+ | Security-critical, JWT validation |
| governance | 85%+ | Gate logic, consensus voting |
| policy | 90%+ | RBAC enforcement |
| orchestrator | 85%+ | State machine complexity |
| control-service | 75%+ | Integration tests + some unit mocks |
| Other packages | 85%+ | Standard quality bar |

### Coverage Gaps to Address

If coverage is below target:

1. **Identify untested branches** — `coverage/index.html` highlights gaps
2. **Add tests for error paths** — Not just happy path
3. **Add edge case tests** — Boundary conditions, null handling
4. **Use `test.only()` during development** — Focus on one test at a time

## Debugging Failed Tests

### Enable Debug Logging

```bash
# Show detailed logs during test run
DEBUG=cku:* pnpm run test:unit

# Show logs for specific package
DEBUG=cku:auth pnpm run test:auth
```

### Inspect Database State in Failed Integration Tests

```typescript
import { describe, it, expect, afterEach } from 'vitest'
import { getPool } from '../src/db/pool'

describe('Troubleshooting Integration Test', () => {
  afterEach(async () => {
    // Dump database state before cleanup
    if (process.env.DEBUG_DB) {
      const pool = getPool()
      const result = await pool.query('SELECT * FROM runs LIMIT 5')
      console.log('Final DB state:', result.rows)
    }
  })

  it('test something', async () => {
    // ... test code ...
  })
})
```

Usage:
```bash
DEBUG_DB=1 pnpm run test:integration
```

### Use test.only() and test.skip() for Debugging

```typescript
describe('Approval Flow', () => {
  // Skip all tests in this suite
  describe.skip('Disabled tests', () => {
    it('skipped test', () => {
      // Won't run
    })
  })

  // Run ONLY this test
  it.only('debug this specific case', async () => {
    // ... detailed test ...
  })

  // Run everything except this test
  it.skip('temporarily skip', () => {
    // Won't run
  })
})
```

### Check Docker Logs for Service-Level Errors

```bash
# View control-service logs (if running in Docker)
docker compose logs control-service

# Follow logs in real-time
docker compose logs -f control-service

# View PostgreSQL logs
docker compose logs postgres

# View Redis logs
docker compose logs redis
```

## CI Testing

### Which Tests Run in CI

```yaml
# Example GitHub Actions workflow
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm run preflight        # Type + critical auth
      - run: pnpm run test:unit        # All unit tests
      - run: pnpm run test:coverage    # Coverage enforcement
      - run: pnpm run typecheck       # Full type check
```

### Required Passing Tests (Blockers)

1. **preflight** — Type checking + auth tests (blocks merge)
2. **test:unit** — All unit tests must pass
3. **test:coverage** — Must meet 80% threshold
4. **typecheck** — No type errors across workspaces

### Coverage Threshold Enforcement

```bash
# CI fails if coverage drops below threshold
pnpm run test:coverage
# Exit code non-zero if lines, functions, branches, or statements < 80%
```

### Parallel Test Execution

Vitest runs tests in parallel by default:

```bash
# Disable parallelization (for debugging)
pnpm run test:unit -- --single-thread

# Control thread count
pnpm run test:unit -- --threads 4
```

## Test Mocking Patterns

### Global Mocks (test/setup.ts)

Critical mocks are applied globally in `apps/control-service/test/setup.ts`:

- Database pool (`src/db/pool.js`)
- Redis client (`redis`)
- Session resolution (`packages/auth/src/resolve-session.js`)
- Orchestrator (`packages/orchestrator/src`)
- Audit logger (`packages/audit/src`)
- Event dispatcher (`src/events/dispatcher.js`)

**Purpose:** Prevent tests from making real external calls.

### Per-Test Mocks

```typescript
import { describe, it, expect, vi } from 'vitest'
import { approveGate } from '../src/services/gate-service'
import * as auditModule from '../src/audit'

describe('Gate Approval', () => {
  it('logs approval decision to audit', async () => {
    // Override the global mock for this test
    const auditSpy = vi.spyOn(auditModule, 'writeAuditEvent')

    await approveGate('gate-123', { reason: 'Passed review' })

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'gate-approved',
        gateId: 'gate-123',
      })
    )

    auditSpy.mockRestore() // Reset for next test
  })
})
```

### Mocking External API Calls

```typescript
import { describe, it, expect, vi } from 'vitest'
import { callExternalService } from '../src/services/external'

describe('External Service Integration', () => {
  it('handles API errors gracefully', async () => {
    vi.doMock('../src/services/external', () => ({
      callExternalService: vi.fn().mockRejectedValueOnce(
        new Error('API timeout')
      ),
    }))

    const result = await callExternalService('action-123')

    expect(result.error).toContain('API timeout')
    expect(result.retryable).toBe(true)
  })
})
```

## Test Utilities and Helpers

### Common Helpers

```typescript
// test/helpers/auth.ts
export function createMockToken(roles: string[]) {
  return jwt.sign(
    {
      actor: { actorId: 'user-1', roles },
      tenant: { orgId: 'org-test' },
    },
    'test-secret'
  )
}

// test/helpers/requests.ts
export async function makeAuthenticatedRequest(
  app: any,
  method: string,
  path: string,
  roles: string[] = ['operator']
) {
  const token = createMockToken(roles)
  const req = request(app)[method](path)
  return req.set('Authorization', `Bearer ${token}`)
}

// Usage in tests
const response = await makeAuthenticatedRequest(app, 'post', '/runs', [
  'operator',
])
```

## Continuous Integration

### Running Tests Locally Before Commit

```bash
# Full preflight (required for CI)
pnpm run preflight

# If preflight passes, run full suite
pnpm run test:all

# Check coverage
pnpm run test:coverage
```

### Pre-Commit Hook (Optional)

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
pnpm run preflight
if [ $? -ne 0 ]; then
  echo "Preflight checks failed. Commit blocked."
  exit 1
fi
```

## Troubleshooting Common Issues

### "Cannot find module @shared/..."

**Cause:** Vitest alias configuration missing.

**Fix:** Ensure `vitest.config.ts` has all path aliases:

```typescript
resolve: {
  alias: {
    '@shared': path.resolve(__dirname, 'packages/shared/src'),
    '@governance': path.resolve(__dirname, 'packages/governance/src'),
  }
}
```

### "Connection timeout to database"

**Cause:** PostgreSQL not running or not accessible.

**Fix (Docker):**

```bash
docker compose up -d postgres
# Wait for startup
sleep 5
pnpm run test:integration
```

**Fix (Manual):**

```bash
# macOS
brew services start postgresql@16

# Ubuntu
sudo systemctl start postgresql

# Verify connection
psql -U postgres -c "SELECT 1"
```

### "Mock is not defined"

**Cause:** Test file missing `vi.mock()` or mock is out of scope.

**Fix:** Ensure all mocks are at module top-level:

```typescript
// CORRECT: Mock at top of file, before imports
vi.mock('../src/db/pool', () => ({
  getPool: vi.fn(),
}))

import { getPool } from '../src/db/pool'

describe('Test', () => {
  // Use getPool mock here
})
```

### "Tests timeout after 10s"

**Cause:** Slow database operation or infinite loop.

**Fix:** Increase timeout:

```typescript
it('slow operation', async () => {
  // ... test code ...
}, 30000) // 30 second timeout
```

Or globally in `vitest.config.ts`:

```typescript
test: {
  testTimeout: 30000,
}
```

### "Coverage threshold not met"

**Cause:** Not enough tests or untested code paths.

**Fix:**

1. Generate coverage report: `pnpm run test:coverage`
2. Open `coverage/index.html` in browser
3. Identify red (untested) lines
4. Add tests for those lines
5. Re-run: `pnpm run test:coverage`

## Best Practices

### Do's

- Write tests FIRST (TDD), then implementation
- Keep tests isolated (no dependencies between tests)
- Use descriptive test names: `it('returns 400 when email is invalid')`
- Mock external services consistently
- Cleanup after each test (databases, timers, mocks)
- Test error cases as thoroughly as happy paths
- Use fixtures for common test data

### Don'ts

- Don't hardcode test data in multiple places (use fixtures)
- Don't skip tests without a reason (avoid `.skip()` in commits)
- Don't test implementation details, test behavior
- Don't mix unit and integration tests in same file
- Don't rely on test execution order
- Don't leave `console.log` statements in tests
- Don't make real API calls in unit tests (mock instead)

## Cross-References

- [Root CLAUDE.md](../CLAUDE.md) — Project overview and structure
- [Testing Rules](../.claude/rules/common/testing.md) — Policy and coverage requirements
- [Vitest Documentation](https://vitest.dev) — Test framework reference
- [Supertest Documentation](https://github.com/visionmedia/supertest) — HTTP assertion library
