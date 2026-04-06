# Test Strategy — Code-Kit-Ultra

**Version**: 2.0.0
**Date**: 2026-04-04
**Status**: Active
**Owner**: Platform Engineering

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Test Pyramid](#2-test-pyramid)
3. [Coverage Targets](#3-coverage-targets)
4. [Test Naming Convention](#4-test-naming-convention)
5. [Test Categories and Owners](#5-test-categories-and-owners)
6. [Test Infrastructure Requirements](#6-test-infrastructure-requirements)
7. [Environment Setup](#7-environment-setup)
8. [CI Integration](#8-ci-integration)
9. [Flakiness Policy](#9-flakiness-policy)
10. [Coverage Reporting](#10-coverage-reporting)
11. [Phase-Based Rollout](#11-phase-based-rollout)
12. [Definition of Done](#12-definition-of-done)

---

## 1. Testing Philosophy

Code-Kit-Ultra is a multi-tenant AI orchestration platform where a single defect in auth, gating, or
tenancy isolation can silently expose one customer's data to another. Our testing philosophy reflects
that risk profile directly.

### Contract-First

Every public interface — HTTP routes, token verification, gate evaluation, permission resolution —
is tested against its stated contract before any implementation detail is examined. If the contract
changes, the tests must change first. This ensures:

- Consumers of a package can rely on documented behaviour.
- Refactors that preserve the contract do not break tests.
- Breaking changes are always visible as red tests before a PR is merged.

### Behavior-Driven

Tests describe *observable system behaviour* from the perspective of the caller, not internal
implementation steps. A test for `verifyInsForgeToken` asserts "given an expired token, the caller
receives a `TokenExpiredError`" — not "the `jwt.verify` callback received an error object with
message `jwt expired`". This means:

- Tests survive implementation refactors.
- Failure messages communicate user-visible regressions.
- Mocks are used only at system boundaries (HTTP, DB, external APIs).

### Security-Aware

Security properties — cross-tenant isolation, token revocation, permission enforcement — are treated
as first-class test requirements, not afterthoughts. Each security invariant has at least one
dedicated test case. Security tests are labelled `@security` and always run on every PR regardless
of which files changed.

---

## 2. Test Pyramid

```
                    ┌──────────────┐
                    │   E2E (10%)  │  Full pipeline runs against a real DB and JWKS mock
                    ├──────────────┤
                    │ Integration  │  Cross-package flows, real DB queries, HTTP layer
                    │    (20%)     │
                    ├──────────────┤
                    │  Unit (70%)  │  Pure functions, mocked I/O, fast feedback
                    └──────────────┘
```

### Unit Tests (70%)

Unit tests cover a single function or class with all I/O mocked. They run in under 10 ms each and
require no external services. Examples:

| File | What is tested |
|---|---|
| `packages/auth/src/verify-insforge-token.test.ts` | JWKS key fetch + jwt.verify contract |
| `packages/auth/src/resolve-session.test.ts` | Claims mapping, default role injection |
| `packages/auth/src/issue-execution-token.test.ts` | HS256 token payload, 10-min expiry |
| `packages/policy/src/resolve-permissions.test.ts` | Role → permission matrix, alias expansion |
| `packages/governance/src/confidence-engine.test.ts` | Weighted score calculation |
| `packages/governance/src/gate-manager.test.ts` | Gate sequencing, turbo mode auto-pass |
| `packages/healing/src/failure-classifier.test.ts` | Error type classification |

### Integration Tests (20%)

Integration tests exercise a slice of the system across at least two packages, using a real (seeded)
test database and mocked external services (JWKS, GitHub API). They run in under 2 seconds each.
Examples:

| File | What is tested |
|---|---|
| `packages/orchestrator/test/run-lifecycle.test.ts` | planned → running → completed transition |
| `packages/orchestrator/test/gate-rejection.test.ts` | Gate reject → run cancelled |
| `packages/auth/test/session-revocation.test.ts` | jti blacklist prevents session use |
| `packages/policy/test/cross-tenant.test.ts` | orgA run not visible to orgB user |
| `apps/control-service/test/approvals.test.ts` | POST /v1/gates/:id/approve HTTP contract |

### E2E Tests (10%)

E2E tests run the full 8-phase pipeline from intake to deployment artifact against a containerised
Postgres instance and a JWKS mock server. They validate the happy path and critical failure paths
for each supported mode. Examples:

| Scenario | Modes covered |
|---|---|
| Full pipeline completes successfully | turbo, builder, safe |
| Gate rejection cancels run | safe |
| Healing loop recovers transient failure | builder |
| Service account executes run end-to-end | turbo |

---

## 3. Coverage Targets

Coverage is measured per package using Istanbul/c8 via Vitest's built-in coverage reporter.
Targets are enforced as hard failures in CI.

| Package | Line coverage target | Branch coverage target | Notes |
|---|---|---|---|
| `packages/auth` | ≥ 90% | ≥ 85% | Security-critical; no exceptions |
| `packages/governance` | ≥ 80% | ≥ 75% | 9 gates must each be tested |
| `packages/policy` | ≥ 80% | ≥ 75% | Permission matrix fully exercised |
| `packages/orchestrator` | ≥ 80% | ≥ 70% | All phase transitions covered |
| `packages/healing` | ≥ 80% | ≥ 70% | All classifier branches covered |
| `packages/adapters` | ≥ 70% | ≥ 60% | Adapter contracts, not LLM output |
| `packages/shared` | ≥ 60% | ≥ 50% | Mostly type declarations |
| `apps/control-service` | ≥ 75% | ≥ 65% | HTTP layer + middleware |

Current overall coverage: ~40%. Target overall coverage: ≥ 78%.

---

## 4. Test Naming Convention

All test files follow a single naming convention to make failure output unambiguous.

```typescript
// File: packages/auth/src/verify-insforge-token.test.ts

describe("verifyInsForgeToken", () => {
  describe("when the JWKS endpoint is reachable", () => {
    it("should return decoded claims for a valid RS256 token", async () => { ... });
    it("should throw TokenExpiredError when the token exp has passed", async () => { ... });
    it("should throw InvalidIssuerError when iss does not match config", async () => { ... });
  });

  describe("when the JWKS endpoint is unreachable", () => {
    it("should retry three times then throw JwksUnavailableError", async () => { ... });
  });
});
```

Rules:
- `describe` block names are the name of the exported function, class, or route (e.g. `"evaluateGates"`, `"POST /v1/runs"`).
- Nested `describe` blocks group by precondition: `"when [context]"`.
- `it` names always start with `"should"` and include both the expected outcome and the triggering condition: `"should [outcome] when [trigger]"`.
- Test file names mirror source file names with `.test.ts` suffix.
- Test files live adjacent to source files for unit tests; in a `test/` subdirectory for integration and E2E tests.

---

## 5. Test Categories and Owners

| Category | Packages | Owner team | Priority |
|---|---|---|---|
| **Auth** | `packages/auth` | Platform Security | P0 — blocking |
| **Run Lifecycle** | `packages/orchestrator`, `packages/shared` | Orchestration | P0 — blocking |
| **Gate Evaluation** | `packages/governance`, `packages/orchestrator` | Governance | P0 — blocking |
| **RBAC and Permissions** | `packages/policy` | Platform Security | P0 — blocking |
| **Cross-Tenant Isolation** | `packages/policy`, `packages/orchestrator` | Platform Security | P0 — blocking |
| **Adapter Execution** | `packages/adapters`, `packages/skill-engine` | Adapters | P1 — high value |
| **Persistence** | `packages/storage`, `db/` | Data | P1 — high value |
| **Healing Loop** | `packages/healing` | Resilience | P1 — high value |
| **Observability** | `packages/observability`, `packages/audit` | Observability | P2 — nice to have |
| **Realtime SSE** | `packages/realtime` | Platform | P2 — nice to have |

---

## 6. Test Infrastructure Requirements

All infrastructure components must be available before integration and E2E tests can run.

### JWKS Mock Server

- Purpose: serve RS256 public keys without requiring a live InsForge instance.
- Implementation: `msw` (Mock Service Worker) in Node mode, or a lightweight `fastify` server
  started in `globalSetup`.
- Must expose: `GET /.well-known/jwks.json` returning a valid JWKS payload with at least one RSA
  key.
- Key pair: generated at test startup using `node:crypto` `generateKeyPairSync("rsa", { modulusLength: 2048 })`.
- Tokens for tests are signed with the corresponding private key.

```typescript
// tests/mocks/jwks-server.ts
import { createServer } from "node:http";
import { generateKeyPairSync } from "node:crypto";

export const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

export function startJwksMockServer(port = 9999) {
  const server = createServer((req, res) => {
    if (req.url === "/.well-known/jwks.json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ keys: [/* JWK derived from publicKey */] }));
    }
  });
  server.listen(port);
  return server;
}
```

### Test Database

- Engine: PostgreSQL 15 running in Docker (or `pg-mem` for unit tests that need SQL without Docker).
- Lifecycle: schema applied from `db/migrations/`, fixtures seeded before each test suite, cleaned
  after each suite.
- Fixture sets:
  - `fixtures/multi-tenant.sql`: 2 orgs, 3 workspaces, 5 projects, 8 users across roles.
  - `fixtures/run-states.sql`: runs in each `RunStatus` state.
  - `fixtures/gate-decisions.sql`: gates in each `GateStatus` state.
- Access: exposed via `TEST_DATABASE_URL` environment variable.

### GitHub API Mock

- Purpose: prevent adapter tests from hitting real GitHub APIs.
- Implementation: `msw` handlers registered in test setup for `https://api.github.com/*`.
- Covers: repo creation, PR creation, commit, status checks.

### SSE Listener Utility

```typescript
// tests/utils/sse-listener.ts
export async function collectSseEvents(url: string, count: number): Promise<unknown[]> {
  // Opens an EventSource, collects `count` events, then closes.
}
```

### Fixture Builders

Type-safe factory functions for constructing test data without manual object assembly.

```typescript
// tests/fixtures/builders.ts
import type { RunState, RunBundle, PlanTask } from "@cku/shared";

export function buildRunState(overrides: Partial<RunState> = {}): RunState {
  return {
    runId: "run-test-001",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentStepIndex: 0,
    status: "planned",
    approvalRequired: false,
    approved: false,
    orgId: "org-test-001",
    workspaceId: "ws-test-001",
    projectId: "proj-test-001",
    actorId: "user-test-001",
    actorType: "user",
    correlationId: "corr-test-001",
    ...overrides,
  };
}

export function buildPlanTask(overrides: Partial<PlanTask> = {}): PlanTask {
  return {
    id: "task-001",
    title: "Test task",
    description: "A test task",
    phase: "building",
    doneDefinition: "File created",
    taskType: "implementation",
    adapterId: "code-writer",
    payload: {},
    ...overrides,
  };
}
```

---

## 7. Environment Setup

### Prerequisites

```bash
# Install dependencies
pnpm install

# Start test infrastructure (Docker required)
docker compose -f docker-compose.test.yml up -d postgres
```

### Running Tests

```bash
# All tests in a single package
pnpm --filter @cku/auth test

# Auth package only (alias)
pnpm test:auth

# All unit tests across the monorepo
pnpm vitest run

# Watch mode (development)
pnpm vitest

# Coverage report for a single package
pnpm --filter @cku/auth vitest run --coverage

# Coverage report for all packages
pnpm vitest run --coverage
```

### Environment Variables for Tests

```bash
# .env.test (committed without secrets, used by vitest.config.ts)
INSFORGE_JWT_ISSUER=https://auth.insforge.test
INSFORGE_JWT_AUDIENCE=cku-api-test
INSFORGE_JWKS_URL=http://localhost:9999/.well-known/jwks.json
INSFORGE_SERVICE_ROLE_KEY=test-service-role-key-32-chars-min
CKU_SERVICE_ACCOUNT_SECRET=test-sa-secret-change-in-prod
TEST_DATABASE_URL=postgresql://cku_test:cku_test@localhost:5433/cku_test
```

---

## 8. CI Integration

### On Every Pull Request

The following test suites run as required status checks. A PR cannot be merged if any of these fail.

| Suite | Command | Timeout |
|---|---|---|
| Unit tests (all packages) | `pnpm vitest run --reporter=verbose` | 3 min |
| Auth package coverage gate | `pnpm --filter @cku/auth vitest run --coverage` | 2 min |
| Policy package coverage gate | `pnpm --filter @cku/policy vitest run --coverage` | 2 min |
| Security-labelled tests | `pnpm vitest run --reporter=verbose -t @security` | 2 min |
| TypeScript type check | `pnpm tsc --noEmit` | 2 min |

### On Merge to Main

All PR checks plus:

| Suite | Command | Timeout |
|---|---|---|
| Integration tests | `pnpm vitest run --config vitest.integration.config.ts` | 10 min |
| E2E tests | `pnpm vitest run --config vitest.e2e.config.ts` | 20 min |
| Full coverage report | `pnpm vitest run --coverage --reporter=lcov` | 15 min |

### On Release Tag

All of the above plus manual smoke test checklist in `docs/06_validation/VALIDATION_MASTER.md`.

---

## 9. Flakiness Policy

Flaky tests are treated with the same urgency as production bugs. A test is considered flaky if it
fails on more than 1 in 20 runs without a code change.

Rules:

- **No `sleep()` or `setTimeout()` in test bodies.** Use `vi.useFakeTimers()` and `vi.advanceTimersByTime()` for time-dependent code.
- **All async operations must be properly awaited.** Never use floating promises. ESLint rule `@typescript-eslint/no-floating-promises` is enabled.
- **No hardcoded ports.** Use `0` (OS-assigned) for servers started in tests, or use a port registry utility to avoid conflicts.
- **No shared mutable state between tests.** Each test must be independently runnable. Use `beforeEach` / `afterEach` for setup and teardown.
- **No tests that depend on execution order.** Running `vitest run --shuffle` must produce the same pass/fail result.
- Any flaky test discovered in CI must be fixed within 2 business days or temporarily skipped with a tracked issue reference:
  ```typescript
  it.skip("should [...] — SKIP: tracked in GH-1234", async () => { ... });
  ```

---

## 10. Coverage Reporting

Coverage is collected using Vitest's built-in c8/Istanbul provider.

```typescript
// vitest.config.ts (relevant section)
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      thresholds: {
        lines: 78,
        branches: 70,
        functions: 75,
        statements: 78,
      },
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.d.ts", "**/index.ts"],
    },
  },
});
```

### Viewing the Report

```bash
# Generate HTML report
pnpm vitest run --coverage

# Open the report
open coverage/index.html
```

### CI Artifact

The `lcov.info` file is uploaded as a CI artifact and sent to the coverage dashboard on every merge
to `main`. Coverage regressions of more than 2% relative to the previous merge block the release
pipeline.

---

## 11. Phase-Based Rollout

### Phase 1 — Blocking (8 dev-days estimated)

These tests must pass before any production release. They cover the highest-risk security and
correctness invariants.

| Test file to create | Owner | Days |
|---|---|---|
| `packages/auth/src/issue-execution-token.test.ts` | Platform Security | 0.5 |
| `packages/auth/src/service-account.test.ts` | Platform Security | 0.5 |
| `packages/auth/test/session-revocation.test.ts` | Platform Security | 1.0 |
| `packages/policy/src/resolve-permissions.test.ts` | Platform Security | 0.5 |
| `packages/policy/test/cross-tenant.test.ts` | Platform Security | 1.5 |
| `packages/governance/src/gate-manager.test.ts` | Governance | 1.0 |
| `packages/orchestrator/test/gate-rejection.test.ts` | Orchestration | 1.0 |
| `packages/orchestrator/test/run-lifecycle.test.ts` | Orchestration | 2.0 |

### Phase 2 — High Value (7 dev-days estimated)

These tests significantly raise confidence and coverage but are not strictly blocking for the first
production release.

| Test file to create | Owner | Days |
|---|---|---|
| `packages/healing/src/healing-engine.test.ts` | Resilience | 2.0 |
| `packages/healing/src/failure-classifier.test.ts` | Resilience | 0.5 |
| `packages/governance/src/confidence-engine.test.ts` | Governance | 0.5 |
| `packages/governance/src/constraint-engine.test.ts` | Governance | 0.5 |
| `packages/governance/src/kill-switch.test.ts` | Governance | 0.5 |
| `packages/storage/test/persistence.test.ts` | Data | 2.0 |
| `apps/control-service/test/session.test.ts` | Platform | 1.0 |

### Phase 3 — Nice to Have

- SSE event stream tests (`packages/realtime`)
- Adapter execution tests (`packages/adapters`)
- Learning / memory package tests
- Performance benchmarks for gate evaluation at scale

---

## 12. Definition of Done

The test strategy for Code-Kit-Ultra is considered complete when:

1. All Phase 1 test files exist and pass in CI with zero skipped tests.
2. Coverage targets in Section 3 are met for `packages/auth`, `packages/policy`, and `packages/governance`.
3. The JWKS mock server, test database, and fixture builders are implemented and documented.
4. The flakiness policy in Section 9 is enforced via ESLint and reviewed in every PR.
5. CI gates in Section 8 are configured and actively blocking merges on failure.
6. All security-labelled tests (`@security`) run on every PR without exception.

Until all six criteria are met, the project is not cleared for production traffic from external tenants.
