# Test Coverage Report — Code Kit Ultra

**Status:** Active
**Version:** 1.2.0
**Last reviewed:** 2026-04-03
**Purpose:** Track testing gaps and coverage for critical paths. All Tier 1 and Tier 2 features require test coverage before release.

---

## Overall Coverage Status

```
Current state:  ~40% overall (estimated from file inspection)
Target for v1.3.0: 80% critical paths
Target for v2.0:   90% overall

Critical gaps:
  - Auth & session flow: 20% (needs comprehensive)
  - Gate approval/rejection: 10% (missing RBAC variants)
  - Run lifecycle: 50% (created, but not multi-tenant rejection)
  - Cross-tenant isolation: 0% (no explicit tests)
  - Error paths: ~5% (happy path focused)
```

---

## Test Inventory

### Authentication & Authorization

| Test | File | Status | Gap |
|------|------|--------|-----|
| InsForge JWT signature verification | `packages/auth/__tests__/verify-jwt.test.ts` | 🟢 Present | None |
| Service account JWT issuance | `packages/auth/__tests__/service-account.test.ts` | 🟢 Present | No rotation test |
| Session resolution normalization | `packages/auth/__tests__/resolve-session.test.ts` | 🟡 Partial | Missing edge cases (no jti) |
| Execution token scoping | `packages/auth/__tests__/issue-execution-token.test.ts` | 🟡 Partial | Missing expiry enforcement |
| Permission matrix (RBAC) | `packages/policy/__tests__/role-mapping.test.ts` | 🟢 Present | None |
| Tenant scope enforcement in authorize middleware | `apps/control-service/__tests__/authorize.test.ts` | 🔴 Missing | **CRITICAL** |
| Cross-tenant request rejection | `apps/control-service/__tests__/cross-tenant.test.ts` | 🔴 Missing | **CRITICAL** |
| Session revocation (jti blacklist) | `packages/auth/__tests__/revocation.test.ts` | 🔴 Missing | **CRITICAL** |
| Legacy API key disable behavior | `packages/auth/__tests__/legacy-api-key.test.ts` | 🔴 Missing | **CRITICAL** |

**Auth Test Gap Summary:** Tier 1 priority — all missing tests must be added before v1.3.0.

---

### Run Creation & Lifecycle

| Test | File | Status | Gap |
|------|------|--------|-----|
| POST /v1/runs creates run in planned state | `apps/control-service/__tests__/create-run.test.ts` | 🟢 Present | None |
| Run scope validates projectId | `apps/control-service/__tests__/create-run.test.ts` | 🟡 Partial | No cross-tenant test |
| Run status transitions: planned → running | `packages/orchestrator/__tests__/execution-engine.test.ts` | 🟡 Partial | No full lifecycle |
| Run status transitions: running → completed | `packages/orchestrator/__tests__/execution-engine.test.ts` | 🟡 Partial | No full lifecycle |
| Run status transitions: any → cancelled | `apps/control-service/__tests__/cancel-run.test.ts` | 🔴 Missing | **CRITICAL** |
| Run creation audit event emitted | `packages/audit/__tests__/write-audit-event.test.ts` | 🟢 Present | None |
| Run created canonical event published | `packages/events/__tests__/publish-event.test.ts` | 🟢 Present | None |
| Run with timeout cancels automatically | `packages/orchestrator/__tests__/execution-engine.test.ts` | 🔴 Missing | **Important** |

---

### Gate Evaluation & Decision

| Test | File | Status | Gap |
|------|------|--------|-----|
| All 9 governance gates evaluate correctly | `packages/orchestrator/__tests__/gate-manager.test.ts` | 🔴 Missing | **CRITICAL** |
| All 5 quality gates evaluate correctly | `packages/orchestrator/__tests__/gate-manager.test.ts` | 🔴 Missing | **CRITICAL** |
| Gate pause enforced per mode policy | `packages/orchestrator/__tests__/mode-policy.test.ts` | 🔴 Missing | **CRITICAL** |
| Gate approval transitions to approved | `apps/control-service/__tests__/approve-gate.test.ts` | 🟡 Partial | Missing RBAC variants |
| Gate rejection transitions to rejected | `apps/control-service/__tests__/reject-gate.test.ts` | 🔴 Missing | **CRITICAL** |
| Gate rejection cascades to run cancellation | `apps/control-service/__tests__/reject-gate.test.ts` | 🔴 Missing | **CRITICAL** |
| Double-approve returns 409 Conflict | `apps/control-service/__tests__/approve-gate.test.ts` | 🟡 Partial | Exists but not comprehensive |
| Double-reject returns 409 Conflict | `apps/control-service/__tests__/reject-gate.test.ts` | 🔴 Missing | **CRITICAL** |
| Only gate:approve permission can approve | `apps/control-service/__tests__/authorize.test.ts` | 🔴 Missing | **CRITICAL** |
| Only gate:reject permission can reject | `apps/control-service/__tests__/authorize.test.ts` | 🔴 Missing | **CRITICAL** |

---

### Adapter Execution

| Test | File | Status | Gap |
|------|------|--------|-----|
| FileSystemAdapter simulation assesses risk | `packages/adapters/__tests__/file-system-adapter.test.ts` | 🟡 Partial | Missing path sensitivity tests |
| FileSystemAdapter execute writes file | `packages/adapters/__tests__/file-system-adapter.test.ts` | 🟢 Present | None |
| FileSystemAdapter verify checks content hash | `packages/adapters/__tests__/file-system-adapter.test.ts` | 🟡 Partial | None |
| FileSystemAdapter rollback restores snapshot | `packages/adapters/__tests__/file-system-adapter.test.ts` | 🟡 Partial | None |
| TerminalAdapter blocks non-allowlisted commands | `packages/adapters/__tests__/terminal-adapter.test.ts` | 🟡 Partial | None |
| TerminalAdapter allows allowlisted commands | `packages/adapters/__tests__/terminal-adapter.test.ts` | 🟡 Partial | None |
| TerminalAdapter timeout enforced | `packages/adapters/__tests__/terminal-adapter.test.ts` | 🟡 Partial | None |
| GitHubAdapter creates commit | `packages/adapters/__tests__/github-adapter.test.ts` | 🔴 Missing | Requires GH token |
| GitHubAdapter opens PR | `packages/adapters/__tests__/github-adapter.test.ts` | 🔴 Missing | Requires GH token |

---

### Observability

| Test | File | Status | Gap |
|------|------|--------|-----|
| Pino logger factory creates child loggers | `packages/logger/__tests__/logger.test.ts` | 🟡 Partial | None |
| Audit events written to DB | `packages/audit/__tests__/write-audit-event.test.ts` | 🟡 Partial | Hash chain restart-safety not tested |
| Canonical events published to SSE | `packages/events/__tests__/publish-event.test.ts` | 🟡 Partial | None |
| SSE subscription filters by runId | `apps/control-service/__tests__/events-stream.test.ts` | 🔴 Missing | **CRITICAL** |
| SSE heartbeat every 30s | `apps/control-service/__tests__/events-stream.test.ts` | 🔴 Missing | **Important** |
| Prometheus metrics endpoint | `apps/control-service/__tests__/metrics.test.ts` | 🔴 Missing | **Important** |

---

### Database Persistence

| Test | File | Status | Gap |
|------|------|--------|-----|
| DB connection pool initialises | `apps/control-service/__tests__/db.test.ts` | 🔴 Missing | **CRITICAL** |
| Migrations applied on startup | `apps/control-service/__tests__/db.test.ts` | 🔴 Missing | **CRITICAL** |
| Runs persisted to runs table | `apps/control-service/__tests__/db.test.ts` | 🔴 Missing | **CRITICAL** |
| Gate decisions persisted to gate_decisions | `apps/control-service/__tests__/db.test.ts` | 🔴 Missing | **CRITICAL** |
| Service accounts persisted to service_accounts | `apps/control-service/__tests__/db.test.ts` | 🔴 Missing | **CRITICAL** |
| Audit events persisted to audit_events | `apps/control-service/__tests__/db.test.ts` | 🔴 Missing | **CRITICAL** |
| Canonical events persisted to canonical_events | `apps/control-service/__tests__/db.test.ts` | 🔴 Missing | **CRITICAL** |

---

## Test Implementation Roadmap

### Phase 1 — Blocking Issues (Required for v1.3.0 release)

Priority: Must have before merge to main

1. **Auth & Tenant Isolation** (2 days)
   - Cross-tenant request rejection (authorize.test.ts)
   - Session revocation (revocation.test.ts)
   - Legacy API key disable enforcement
   - Run scope tenant validation

2. **Gate Testing** (3 days)
   - All 9 governance gates (gate-manager.test.ts)
   - All 5 quality gates
   - Gate rejection path (reject-gate.test.ts, double-reject case)
   - Cascade to run cancellation
   - Mode-aware pause rules per gate
   - RBAC permission enforcement (authorize.test.ts)

3. **Run Lifecycle** (1 day)
   - Run cancellation (cancel-run.test.ts)
   - Status transition rules

4. **Database** (2 days)
   - Connection pool (db.test.ts)
   - Migrations on startup
   - All CRUD table persistence

**Estimated effort:** 8 dev-days

### Phase 2 — High Value (After v1.3.0, before v2.0)

1. **Realtime SSE** (1 day)
   - Stream filtering by runId, projectId, eventName
   - Heartbeat timing

2. **Metrics & Observability** (1 day)
   - Prometheus endpoint
   - Log level configuration

3. **Adapter Edge Cases** (2 days)
   - Path sensitivity in FileSystemAdapter
   - GitHub adapter integration (requires token)

4. **Error Paths** (3 days)
   - Malformed requests
   - Database constraint violations
   - Timeout scenarios
   - Partial action failure + rollback

**Estimated effort:** 7 dev-days

---

## Test Infrastructure Requirements

Before tests can be written, the following test infrastructure must be in place:

| Item | Status | Notes |
|------|--------|-------|
| Test database (Docker Postgres in CI) | 🔴 Missing | `docker-compose.test.yml` |
| Test database seeding | 🔴 Missing | Script to reset schema between test runs |
| Service account token factory for tests | 🔴 Missing | Generates valid test JWTs |
| InsForge JWKS mock | 🔴 Missing | Nock or similar for JWKS fetch |
| GitHub API mock | 🔴 Missing | Nock for GitHub adapter tests |
| Test data builders (org/workspace/project) | 🔴 Missing | Fixtures for common test scenarios |

---

## Coverage Goals by Feature

| Feature | Current | v1.3.0 Target | v2.0 Target |
|---------|---------|---|---|
| Authentication | 40% | 95% | 99% |
| Authorization (RBAC) | 60% | 95% | 99% |
| Run Lifecycle | 50% | 85% | 95% |
| Gates | 20% | 90% | 95% |
| Adapters | 50% | 75% | 90% |
| Database | 0% | 85% | 95% |
| Observability | 30% | 75% | 85% |
| **Overall** | **40%** | **80%** | **90%** |

---

## Running Tests Locally

```bash
# Install test dependencies
pnpm install

# Run all tests
pnpm test

# Run specific suite
pnpm test packages/auth

# Watch mode
pnpm test --watch

# Coverage report
pnpm test --coverage
```

See `CONTRIBUTING.md` for detailed test development guidelines (not yet written).
