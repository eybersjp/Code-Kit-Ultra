# Current Sprint — Code Kit Ultra

**Status:** Active  
**Sprint Name:** Sprint 4 — Persistence & Core Gates  
**Duration:** Mar 27 – Apr 10, 2025  
**Capacity:** 10 dev-days (2 engineers × 5 days)  
**Goal:** Complete Wave 5 (PostgreSQL wiring) + begin Wave 6 (14 governance gates)

---

## Sprint Summary

**Tier 1 (Critical Path, Release Blockers):**
- Wire PostgreSQL to runtime
- Migrate service accounts to DB
- Fix R-01, R-02, R-03 security risks
- Implement 9 missing governance gates

**Tier 2 (High Value, Current Release):**
- All routes under `/v1/` prefix
- Session revocation endpoint
- Gate rejection endpoint
- Comprehensive auth testing

**Tier 3 (Nice-to-Have, Nice-to-Have):**
- OpenAPI spec generation
- Prometheus metrics
- Deployment YAML

---

## Board — Tier 1 (Must Have)

### Item T1-01: Wire PostgreSQL Connection Pool

**Owner:** TBD  
**Status:** 🔴 Not Started  
**Priority:** P0 (blocks everything)  
**Points:** 3  
**Sprint Days:** Apr 1–2

**Acceptance Criteria:**
- DB client pool initialised in `apps/control-service/src/index.ts`
- Connection string from `DATABASE_URL` env var
- App logs "Database connection pool initialised (X connections)"
- All migrations run on startup without error
- Test: `npm test -- db.test.ts` passes

**Implementation Plan:**
1. Create `apps/control-service/src/db/client.ts`
   - Initialise pg Pool
   - Implement health check
2. Create `apps/control-service/src/db/migrate.ts`
   - Read migration files from `db/migrations/`
   - Run sequentially on startup
3. Update `apps/control-service/src/index.ts`
   - Await DB init before starting server
   - Store pool in app.locals
4. Create `db/migrations/001_initial.sql` through `004_rename_tables.sql`
5. Test with local Postgres in Docker Compose

**Related:** R-04

**Spec Reference:** `docs/03_specs/SPEC_POSTGRES_PERSISTENCE.md`

---

### Item T1-02: Migrate Runs to DB Table

**Owner:** TBD  
**Status:** 🔴 Not Started  
**Priority:** P0  
**Points:** 2  
**Sprint Days:** Apr 2–3  
**Depends on:** T1-01

**Acceptance Criteria:**
- `apps/control-service/src/db/runs.ts` implements CRUD
- `POST /v1/runs` creates record in DB
- `GET /v1/runs/{id}` queries DB
- `PATCH /v1/runs/{id}` updates DB
- Run survives service restart
- Test: `npm test -- runs.test.ts` passes

**Implementation:**
```typescript
// apps/control-service/src/db/runs.ts
export async function createRun(input: CreateRunInput): Promise<Run> {
  const result = await db.query(
    'INSERT INTO runs (...) VALUES (...) RETURNING *',
    [input.orgId, input.projectId, ...]
  );
  return result.rows[0];
}
```

---

### Item T1-03: Migrate Gate Decisions to DB Table

**Owner:** TBD  
**Status:** 🔴 Not Started  
**Priority:** P0  
**Points:** 2  
**Sprint Days:** Apr 3  
**Depends on:** T1-01

**Acceptance Criteria:**
- `apps/control-service/src/db/gates.ts` implements CRUD
- Gate decisions persisted on approval/rejection
- Multi-instance test: Gate approved in service A, readable from service B
- Test: `npm test -- gates.test.ts` passes

---

### Item T1-04: Remove R-01 Hardcoded Service Account Secret

**Owner:** TBD  
**Status:** 🔴 Not Started  
**Priority:** P0 (critical security)  
**Points:** 1  
**Sprint Days:** Apr 1

**Acceptance Criteria:**
- `packages/auth/src/service-account.ts` throws on missing `SERVICE_ACCOUNT_JWT_SECRET`
- No fallback to `'dev-secret-change-me'`
- Integration test: App fails to start without the env var
- Code review: grep shows zero matches for hardcoded secret

**Implementation:**
```typescript
const secret = process.env.SERVICE_ACCOUNT_JWT_SECRET;
if (!secret) {
  throw new Error('FATAL: SERVICE_ACCOUNT_JWT_SECRET required. See ops-guide.md.');
}
```

---

### Item T1-05: Remove R-02 Default Org Tenant Bypass

**Owner:** TBD  
**Status:** 🔴 Not Started  
**Priority:** P0 (critical security)  
**Points:** 1  
**Sprint Days:** Apr 1

**Acceptance Criteria:**
- `apps/control-service/src/middleware/authorize.ts` has no `orgId === 'default'` check
- Cross-tenant request still rejected with 403
- Test: `npm test -- authorize.test.ts` includes explicit cross-tenant rejection test

---

### Item T1-06: Remove R-03 Hardcoded API Keys

**Owner:** TBD  
**Status:** 🔴 Not Started  
**Priority:** P0 (critical security)  
**Points:** 1  
**Sprint Days:** Apr 1

**Acceptance Criteria:**
- `packages/core/src/auth.ts` deleted or moved to `__mocks__/`
- No imports outside test files
- Grep: zero matches for `ck_dev_` in non-test code
- Legacy keys return 401 in runtime

---

### Item T1-07: Implement 9 Missing Governance Gates

**Owner:** TBD  
**Status:** 🔴 Not Started  
**Priority:** P0 (required for v1.3.0)  
**Points:** 5  
**Sprint Days:** Apr 4–7  
**Depends on:** T1-01 (gate decisions persisted)

**Acceptance Criteria:**
- Gate manager includes all 9: scope, architecture, build, qa, security, cost, deployment, launch
- Each gate evaluates per spec
- Mode-aware pause rules applied (gates pause in safe/balanced, not in god)
- Tests: `npm test -- gate-manager.test.ts` passes all 14 gates
- Canonical events emitted for each gate evaluation

**Gates to Add:**
1. Scope gate — validates run scope against project limits
2. Architecture gate — (logic TBD by tech lead)
3. Build gate — simulate before execute
4. QA gate — requirements coverage check
5. Security gate — (logic TBD by tech lead)
6. Cost gate — estimate resource cost
7. Deployment gate — deployment target validation
8. Launch gate — final pre-execute gate (manual approval in prod)
9. (See SPEC_GATE_TAXONOMY.md for detailed gate logic)

**Related:** R-07

**Spec Reference:** `docs/03_specs/SPEC_GATE_TAXONOMY.md`

---

## Board — Tier 2 (High Value)

### Item T2-01: API Versioning — All Routes under `/v1/`

**Owner:** TBD  
**Status:** 🔴 Not Started  
**Priority:** P1 (release requirement)  
**Points:** 3  
**Sprint Days:** Apr 8–9

**Acceptance Criteria:**
- All routes under `/v1/` prefix
- Old unversioned routes return 404
- CLI, Web UI, VS Code extension updated to call `/v1/` endpoints
- OpenAPI spec `docs/openapi.yaml` documents all `/v1/` routes
- Test: `npm test -- api-versioning.test.ts` validates all routes

**Related:** R-08

**Spec Reference:** `docs/03_specs/SPEC_API_VERSIONING.md`

---

### Item T2-02: Session Revocation Endpoint

**Owner:** TBD  
**Status:** 🔴 Not Started  
**Priority:** P1 (security requirement)  
**Points:** 3  
**Sprint Days:** Apr 9–10  
**Depends on:** T1-01 (if storing in DB)

**Acceptance Criteria:**
- `POST /v1/session/revoke` endpoint exists
- Revoked token returns 401 on next request
- Audit event "session.revoked" logged
- Redis store checked in authenticate middleware (dev fallback: in-memory)
- Test: `npm test -- revocation.test.ts` passes

**Related:** R-06

**Spec Reference:** `docs/03_specs/SPEC_SESSION_REVOCATION.md`

---

### Item T2-03: Gate Rejection Endpoint

**Owner:** TBD  
**Status:** 🔴 Not Started  
**Priority:** P1 (required for v1.3.0)  
**Points:** 2  
**Sprint Days:** Apr 6–7  
**Depends on:** T1-03

**Acceptance Criteria:**
- `POST /v1/gates/{id}/reject` endpoint exists
- Gate transitions from pending → rejected
- Non-pending gate returns 409 Conflict
- Run cascades to cancelled status
- Audit and canonical events emitted
- Test: `npm test -- reject-gate.test.ts` passes

**Spec Reference:** `docs/03_specs/SPEC_GATE_REJECTION.md`

---

### Item T2-04: Comprehensive Auth Testing

**Owner:** TBD  
**Status:** 🔴 Not Started  
**Priority:** P1 (release gate)  
**Points:** 3  
**Sprint Days:** (parallel with other tasks)

**Acceptance Criteria:**
- Cross-tenant request rejection test
- Session revocation test
- RBAC permission enforcement test (gate:approve, gate:reject, run:create)
- Expired token rejection test
- Tampered JWT rejection test
- Coverage: `packages/auth/__tests__/`, `apps/control-service/__tests__/authorize.test.ts`

**Target Coverage:** Auth: 95%, Authorization: 95%

---

## Board — Tier 3 (Nice-to-Have)

### Item T3-01: OpenAPI Spec Generation

**Status:** 🔴 Not Started  
**Points:** 2  
**Sprint Days:** (if time permits)

**Deliverable:** `docs/openapi.yaml` with all `/v1/` routes, schemas, security schemes

---

### Item T3-02: Prometheus Metrics Endpoint

**Status:** 🔴 Not Started  
**Points:** 2  
**Sprint Days:** (if time permits)

**Deliverable:** `GET /metrics` returns Prometheus-format metrics (request duration histogram, runs created, gates evaluated)

---

### Item T3-03: Docker Compose & Dockerfile

**Status:** 🔴 Not Started  
**Points:** 1  
**Sprint Days:** (if time permits)

**Deliverable:** `Dockerfile` + `docker-compose.yml` bring up service with Postgres, Redis (optional)

---

## Risk & Blockers

### Blocker: PostgreSQL Complexity (T1-01)

**Issue:** Unclear DB schema requirements, migration runner design, pool configuration.

**Mitigation:** Tech lead provides schema review + migration runner template by Sprint day 1.

### Blocker: Governance Gate Logic (T1-07)

**Issue:** Unclear gate evaluation logic for scope, architecture, security gates. Requires product/tech lead decision.

**Mitigation:** Product owner + tech lead define gate logic for all 9 by Sprint day 1. Document in decision-log.md.

### Blocker: Test Infrastructure (T2-04)

**Issue:** No test database setup, test fixtures, mock InsForge JWKS.

**Mitigation:** Create `docker-compose.test.yml` + test setup by Sprint day 2.

---

## Daily Standup Topics

**Daily (3 min per person):**
1. What did I finish yesterday?
2. What will I finish today?
3. Blockers?

**Key Dates:**
- **Sprint Day 1 (Apr 1):** T1-01 kickoff, security fixes (T1-04, T1-05, T1-06)
- **Sprint Day 3 (Apr 3):** DB wire-up complete, gate CRUD in progress
- **Sprint Day 5 (Apr 7):** Gate implementation + T2-02 (revocation) in flight
- **Sprint Day 10 (Apr 10):** Sprint ends, v1.3.0 release gate review

---

## Definition of Done

A task moves to Done when:

- [ ] All acceptance criteria met
- [ ] Tests pass (unit + integration)
- [ ] Code reviewed and approved
- [ ] Commit message links to this sprint document
- [ ] Documentation updated (if applicable)
- [ ] No new P0 or P1 risks introduced

---

## Sprint Success Criteria

**Minimum (release-blocking):**
- All Tier 1 items complete (100%)
- All 6 security fixes (R-01, R-02, R-03, R-06, T1-07)
- All 9 gates implemented
- Auth test coverage ≥ 95%

**Target (nice-to-have):**
- Tier 2 items ≥ 80% complete
- OpenAPI spec
- Zero new bugs introduced

**No-Go for v1.3.0:**
- Any Tier 1 item incomplete
- Any P0 risk remaining open
- Auth test coverage < 80%
