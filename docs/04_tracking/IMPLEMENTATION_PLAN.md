# Code-Kit-Ultra — Platform Implementation Plan

**Document type:** Executive Implementation Plan  
**Version target:** v1.3.0 → v2.0  
**Last updated:** 2026-04-04  
**Status:** Ready for execution

---

## Current State Summary

| Area | Status |
|------|--------|
| Waves 1–3 (CLI, Core API, Adapters) | ✅ Complete |
| Wave 4 (Service Accounts) | ⚠️ Partial — JWT works, not persisted to DB |
| Waves 5–11 | ❌ Pending |
| **Open risks** | 22 (6 critical, 8 high, 8 medium) |
| **Test files** | 7 files (auth-only coverage) |
| **Production readiness items** | 34 / 34 **unchecked** |
| **DB wired to runtime** | ❌ No — in-memory only |
| **Estimated effort remaining** | 107.5h (production readiness items) |

**Critical bottleneck:** Wave 5 (PostgreSQL persistence) is the universal blocker. Completing it unblocks Waves 6, 7, and 8 to run in parallel.

---

## Phase 1 — Immediate Security Fixes
**Goal:** Close 6 critical security risks that exist independently of persistence. These are single-file, no-blocker fixes.  
**Duration:** ~1 week  
**Risks closed:** R-01, R-02, R-03, R-10, R-12, R-17, R-19  

### 1.1 Remove hardcoded secrets (R-01, R-02)
- **Task:** `packages/auth/src/service-account.ts` line 4 — throw `Error("CKU_SERVICE_ACCOUNT_SECRET not set")` if env var is absent; remove `"internal-sa-secret-change-me"` fallback entirely
- **Task:** `packages/core/src/auth.ts` lines 4–9 — move `"admin-key"`, `"operator-key"` to env var `CKU_LEGACY_API_KEYS`; gate behind `CKU_LEGACY_API_KEYS_ENABLED=true` flag
- **Task:** Create/update `.env.example` with all required environment variables and descriptions
- **Verification:** `grep -r '"internal-sa-secret' packages/` returns empty; `grep -r '"admin-key' packages/` returns empty

### 1.2 Remove tenant isolation bypass (R-03)
- **Task:** `apps/control-service/src/middleware/authorize.ts:54` — delete `if (orgId === "default") return next()` line unconditionally
- **Test:** Add `TC-CROSS-001` test case — request with `orgId=default` must return `400 INVALID_ORG_ID`

### 1.3 Replace Math.random() with crypto.randomUUID() (R-10)
- **Task:** Global search for `Math.random()` in service account ID generation
- **Task:** Replace all instances with `crypto.randomUUID()` (Node 14.17+ built-in)
- **Verification:** `grep -r 'Math.random' packages/auth` returns empty

### 1.4 Add Zod input validation at API boundary (R-12)
- **Task:** Create `apps/control-service/src/validators/run.validator.ts`:
  ```typescript
  export const CreateRunSchema = z.object({
    idea: z.string().max(2000),
    mode: z.enum(['turbo', 'builder', 'pro', 'expert', 'safe', 'balanced', 'god']),
    projectId: z.string().uuid()
  });
  ```
- **Task:** Apply schema guard in `create-run` handler: `CreateRunSchema.parse(req.body)`
- **Task:** Return `400 VALIDATION_ERROR` with field-level error details on failure

### 1.5 Validate JWT roles before assignment (R-17)
- **Task:** `packages/auth/src/resolve-session.ts` — filter `claims.roles` against the `Role` union type before assigning
- **Task:** Log warning if unknown roles are filtered
- **Test:** Token with `roles: ["admin", "unknown"]` → resolved session has only `["admin"]`

### 1.6 Fix JWT expiresAt unit mismatch in VS Code extension (R-19)
- **Task:** `extensions/vscode/src/` — locate session expiry check; ensure `exp * 1000` (JWT seconds → ms) before comparing to `Date.now()`
- **Test:** Token expires in 1s; check at 0.5s (valid) and 1.5s (expired)

---

## Phase 2 — Database & Persistence Foundation (Critical Path)
**Goal:** Wire PostgreSQL to the runtime so all state is durable. This unblocks Phases 3, 4, and 5 running in parallel.  
**Duration:** ~2 weeks  
**Risks closed:** R-04, R-14, R-18, R-20  
**Production readiness items:** Rel-01, Rel-02, Rel-03  

### 2.1 PostgreSQL connection pool
- **Task:** Create `apps/control-service/src/db/pool.ts`:
  ```typescript
  import pg from 'pg';
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    min: 2, max: 10
  });
  export function getPool() { return pool; }
  ```
- **Task:** Throw with clear message if `DATABASE_URL` env var is absent at startup
- **Task:** Add `DATABASE_URL` to `.env.example`

### 2.2 Migration runner on startup
- **Task:** Create `apps/control-service/src/db/migrate.ts` — sequential migration runner
  - Read `db/migrations/*.sql` in alphabetical order
  - Track applied migrations in `schema_migrations` table
  - Abort startup if any migration fails
- **Task:** Call `runMigrations()` as first async step in service entrypoint before `app.listen()`
- **Task:** Replace `db:migrate` placeholder script in `package.json` with real implementation

### 2.3 Persist runs and steps (Wave 5 critical item)
- **Task:** `packages/orchestrator/src/run-store.ts` — replace in-memory `Map<string, RunState>` with pg-backed store
  - `createRun(runState)` → `INSERT INTO runs`
  - `getRun(id)` → `SELECT ... FROM runs WHERE id = $1`
  - `updateRunStatus(id, status)` → `UPDATE runs SET status = $1`
  - `listRuns(projectId, orgId)` → tenant-scoped query with `WHERE org_id = $1 AND project_id = $2`
- **Task:** Wire `markState(currentStepIndex)` in phase-engine to persist to `runs_metadata.current_step`
- **Task:** Verify resume flow: fetch `currentStepIndex` from DB, continue from that step

### 2.4 Persist gate decisions
- **Task:** Create `packages/governance/src/gate-store.ts` — pg-backed gate decision persistence
  - `recordGateDecision(gateId, runId, result, reviewerId?)` → `INSERT INTO gates`
  - `getPendingGates(runId)` → `SELECT ... WHERE status = 'needs_review'`
  - `approveGate(gateId, reviewerId)` → `UPDATE gates SET status = 'pass', reviewer_id = $1`
- **Task:** Wire gate-manager to call gate-store after each gate evaluation
- **Test:** Gate decision survives service restart

### 2.5 Persist service accounts (R-14)
- **Task:** Migrate `packages/auth/src/service-account.ts` from in-memory `Map` to pg-backed store
  - `createServiceAccount(sa)` → `INSERT INTO service_accounts`
  - `getServiceAccount(id, orgId)` → `SELECT ... WHERE id = $1 AND org_id = $2`
  - `listServiceAccounts(orgId)` → tenant-scoped listing
  - `rotateSecret(id, newSecretHash)` → `UPDATE service_accounts SET secret_hash = $1`
- **Test:** Service account survives service restart; JWT verification still works with rotated secret

### 2.6 DB-backed audit hash chain (R-18)
- **Task:** `packages/audit/src/audit-logger.ts` — replace module-level `lastHash` variable with query-based retrieval
  - On each write: `SELECT hash FROM audit_events ORDER BY created_at DESC LIMIT 1`
  - Use `pg` advisory lock (`SELECT pg_advisory_xact_lock(1)`) inside transaction to prevent concurrent hash-chain corruption
- **Task:** Add test: restart service, write audit event, verify chain continuity (hash links back correctly)

### 2.7 Persist audit events
- **Task:** Wire `AuditLogger.emit()` to `INSERT INTO audit_events` with full payload, hash, and previous_hash
- **Task:** Verify every material action emits persisted audit event:
  - `run.created`, `run.cancelled`, `run.resumed`, `run.completed`, `run.failed`
  - `gate.approved`, `gate.rejected`, `gate.needs_review`
  - `service_account.created`, `service_account.rotated`

### 2.8 Health and readiness endpoints
- **Task:** Create `GET /health` endpoint — always returns `200 { status: "healthy", version: "1.3.0" }` (liveness probe, no DB check)
- **Task:** Create `GET /ready` endpoint — checks DB pool and Redis connectivity; returns `503 { status: "degraded", checks: {...} }` if either fails (readiness probe)

### 2.9 Seed script
- **Task:** Create `db/seed.ts` — insert development fixtures
  - 1 organization (`default-org`)
  - 2 workspaces (`dev`, `staging`)
  - 5 projects (2 per workspace, 1 shared)
  - 6 users with different roles (admin, operator, reviewer, viewer, service account)
  - 10 pre-seeded runs in various states
- **Task:** Replace `db:seed` placeholder script with real implementation

---

## Phase 3 — API Versioning & Contract
**Goal:** Establish stable, versioned API contract. Runs in parallel with Phases 4 and 5 after Phase 2 completes.  
**Duration:** ~1.5 weeks  
**Risks closed:** R-05, R-22  

### 3.1 Add /v1/ prefix to all routes
- **Task:** `apps/control-service/src/routes/` — prefix all routers with `/v1/`
  - `app.use('/v1', authRouter)`, `app.use('/v1', runsRouter)`, etc.
- **Task:** Add compatibility shim: unversioned routes return `410 Gone` with `{ "message": "Use /v1/..." }` to prevent silent breakage
- **Verification:** `curl http://localhost:8080/runs` returns 410; `curl http://localhost:8080/v1/runs` works

### 3.2 Update CLI to /v1/ routes
- **Task:** Global search in `apps/cli/src/` for all `fetch('/runs`, `/gates`, etc.
- **Task:** Replace with `/v1/` equivalents
- **Task:** Add `CKU_API_BASE_URL` env var (default `http://localhost:8080`) so CLI target is configurable

### 3.3 Update web control plane to /v1/ routes
- **Task:** `apps/web-control-plane/src/lib/api-client.ts` — update API client base path from `/` to `/v1/`
- **Task:** Run all integration tests; verify no 404 responses

### 3.4 Generate OpenAPI 3.1 spec (R-22)
- **Task:** Add `@asteasolutions/zod-to-openapi` or `swagger-jsdoc` to control-service
- **Task:** Annotate all route handlers with schema decorators (request body, path params, query params, response schemas)
- **Task:** Add `build:openapi` script: outputs `docs/api/openapi.yaml`
- **Task:** Add CI step: fail if generated spec differs from committed spec (prevents drift)
- **Task:** Document all paths, methods, parameters, request/response schemas, and error codes

### 3.5 Add request/response validation middleware
- **Task:** Validate all incoming request bodies against Zod schemas (extends Phase 1.4)
- **Task:** Return `400 VALIDATION_ERROR` with field-level errors on failure
- **Test:** Integration test with invalid request body → 400 with schema errors

---

## Phase 4 — Governance Gates (Complete Implementation)
**Goal:** Implement full 14-gate governance model (5 quality + 9 governance) and rejection path. Runs in parallel with Phases 3 and 5.  
**Duration:** ~2 weeks  
**Risks closed:** R-06, R-07, R-16  

### 4.1 Implement 9 missing governance gates (R-07)
Each gate in `packages/governance/src/gates/` implements `GateEvaluator` interface: `evaluate(context): Promise<GateResult>`.

| Gate | File | Logic |
|------|------|-------|
| **Scope Gate** | `scope-gate.ts` | Verify run targets only files within declared project boundary; block if files outside scope |
| **Architecture Gate** | `architecture-gate.ts` | Check proposed changes against ADR (architecture decision record) constraints |
| **Security Gate** | `security-gate.ts` | Run static analysis hook; block on high/critical findings |
| **Cost Gate** | `cost-gate.ts` | Estimate token/compute cost; block if over budget threshold |
| **Deployment Gate** | `deployment-gate.ts` | Verify deployment target environment is approved for this run mode |
| **QA Gate** | `qa-gate.ts` | Require test coverage delta ≥ 0 (tests cannot decrease) |
| **Build Gate** | `build-gate.ts` | Require build to pass before proceeding to deployment phase |
| **Launch Gate** | `launch-gate.ts` | Final human approval gate before any production change |
| **Risk Threshold** | `risk-threshold.ts` | ✅ Exists — verify risk score < mode-specific threshold |

### 4.2 Wire all gates into gate-manager
- **Task:** `packages/orchestrator/src/gate-manager.ts` — add all 9 new evaluators to gate registry
- **Task:** Define per-mode gate sequences:
  - `turbo`: skip most gates, auto-pass non-blocking gates
  - `safe`: run all gates, pause on every `needs-review`
  - `balanced`: run all gates, pause only on `blocked`
  - `god`: never pause, skip approval gates
- **Task:** Persist gate results via gate-store (Phase 2.4)

### 4.3 Implement gate rejection endpoint (R-06)
- **Task:** `POST /v1/gates/:gateId/reject`
  - Request body: `{ reason: string }`
  - Auth: `gate:approve` permission required (admin/reviewer roles only)
- **Task:** Side effects:
  - Set gate status → `blocked`
  - Set run status → `cancelled`
  - Emit `run.gate.rejected` canonical event
  - Persist to DB
- **Test:** Reviewer rejects gate → run cancels → no further phases execute

### 4.4 Fix operator role permission scope (R-16)
- **Task:** `packages/shared/src/permissions.ts` — remove `gate:approve` and `execution:high_risk` from operator role
- **Task:** These permissions move to `reviewer` and `admin` roles only
- **Task:** Update `TEST_PLAN_RBAC.md` test assertions to match
- **Test:** Run `TC-RBAC-*` suite; all assertions pass

### 4.5 Mode-aware pause rules
- **Task:** `packages/orchestrator/src/gate-manager.ts` — implement `shouldPauseForGate(gate, mode)` function
  - Return true/false based on gate status and mode
  - Turbo: never pause
  - Safe: pause on `needs-review`
  - Balanced: pause on `blocked` only
  - God: never pause
- **Test:** Test each mode × gate status combination (12 scenarios)

### 4.6 Compliance gates visibility in dashboard
- **Task:** `apps/web-control-plane/src/pages/run-detail.tsx` — display all 14 gates with status (pass/fail/needs-review/blocked)
- **Task:** Approval/rejection UI for gates with `needs-review` status

---

## Phase 5 — Session Security & Service Account Hardening
**Goal:** Close remaining auth/session risks. Runs in parallel with Phases 3 and 4.  
**Duration:** ~2 weeks  
**Risks closed:** R-11, R-13, R-21  

### 5.1 Redis-backed session revocation (R-13)
- **Task:** Create `packages/auth/src/session-revocation.ts`:
  ```typescript
  export async function revokeSession(jti: string, expiresIn: number) {
    await redis.setex(`revoked:${jti}`, expiresIn, '1');
  }
  export async function isRevoked(jti: string): Promise<boolean> {
    return (await redis.exists(`revoked:${jti}`)) === 1;
  }
  ```
- **Task:** Wire into `verify-insforge-token.ts`: check `isRevoked(claims.jti)` after signature verification; return `401 TOKEN_REVOKED` if hit
- **Task:** `DELETE /v1/sessions/me` endpoint: calls `revokeSession(session.jti, remainingTTL)`
- **Task:** Add `REDIS_URL` to `.env.example`

### 5.2 Service account secret rotation
- **Task:** `POST /v1/service-accounts/:id/rotate`
  - Generates new 32-byte secret via `crypto.randomBytes(32).toString('hex')`
  - Hashes new secret with bcrypt; updates `service_accounts.secret_hash` in DB
  - Returns new plaintext secret **once only**; never stored or logged
- **Task:** Adds audit event: `service_account.secret.rotated`
- **Test:** Old secret fails; new secret verifies; rotation is audited

### 5.3 Move web control plane auth from localStorage to httpOnly cookies (R-11)
- **Task:** `apps/control-service/src/routes/auth.ts` — on login response, set session JWT as cookie:
  ```typescript
  res.cookie('session', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 10 * 60 * 1000
  });
  ```
- **Task:** `apps/web-control-plane/src/` — remove all `localStorage.setItem('token', ...)` calls
- **Task:** Update all fetch calls to use `credentials: 'include'` instead of `Authorization: Bearer` header
- **Task:** Add CSRF protection: use `SameSite=strict` (sufficient for same-origin)

### 5.4 Confirm execution token usage in adapter call paths (R-21)
- **Task:** Trace `executeRunBundle` → `executeTask` → adapter invocation in `packages/orchestrator/src/execution-engine.ts`
- **Task:** Verify `issueExecutionToken(runId, orgId)` is called before the first adapter call in each run
- **Task:** If missing: add token issuance call at the start of `executeRunBundle`; pass token through task context
- **Test:** `TC-EXEC-003` — adapter receives request with valid scoped execution token

### 5.5 Legacy API key disable flag
- **Task:** Add `CKU_LEGACY_API_KEYS_ENABLED=false` to `.env.example` (default off)
- **Task:** In `packages/auth/src/resolve-session.ts`: check flag before accepting legacy API key auth
- **Task:** If disabled and legacy key provided: return `401 LEGACY_AUTH_DISABLED`

---

## Phase 6 — Observability & Deployment Readiness
**Goal:** Make platform diagnosable in production and deployable as a container.  
**Duration:** ~2 weeks  
**Production readiness items:** O-01..O-05, Rel-04..Rel-06, D-01..D-05  

### 6.1 Structured JSON logging (O-01, O-02)
- **Task:** `packages/shared/src/logger.ts` — singleton Pino logger
  ```typescript
  const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
  ```
- **Task:** Middleware `apps/control-service/src/middleware/trace-id.ts`:
  - Generate `uuid` for each request
  - Attach to `res.locals.traceId`
  - Include in `X-Trace-ID` response header
- **Task:** Replace all `console.log` / `console.error` calls with `logger.info` / `logger.error`
- **Task:** Configure Pino to redact secrets: `redact: ['token', 'password', 'secret', 'authorization']` (S-07)
- **Verification:** No `console.log` in source code; all logs contain `traceId`

### 6.2 Prometheus metrics endpoint (O-03)
- **Task:** Add `prom-client` dependency
- **Task:** `apps/control-service/src/metrics.ts` — define counters/histograms:
  - `http_requests_total{method, route, status_code}` (Counter)
  - `http_request_duration_seconds{method, route}` (Histogram: 50ms, 100ms, 250ms, 500ms, 1s, 5s buckets)
  - `run_created_total`, `run_completed_total`, `run_failed_total` (Counters)
  - `gate_evaluations_total{gate, result}` (Counter)
- **Task:** `GET /metrics` — returns Prometheus text format; not behind auth middleware
- **Test:** Curl `/metrics`; verify output is valid Prometheus format

### 6.3 Graceful shutdown (Rel-04)
- **Task:** `apps/control-service/src/index.ts` — register `SIGTERM` and `SIGINT` handlers
- **Task:** On signal:
  1. Stop accepting new requests
  2. Wait for in-flight requests to drain (5s timeout)
  3. Close DB pool: `await pool.end()`
  4. Close Redis connection: `await redis.quit()`
  5. Then `process.exit(0)`

### 6.4 OpenTelemetry tracing (optional but recommended)
- **Task:** Add `@opentelemetry/api` and `@opentelemetry/sdk-node`
- **Task:** Wrap database queries and external API calls with spans
- **Task:** Export traces to configured backend (e.g., Jaeger, Datadog)

### 6.5 CORS and CSP hardening (S-08, S-09, S-10)
- **Task:** `apps/control-service/src/middleware/security.ts`:
  ```typescript
  app.use(cors({
    origin: process.env.CKU_ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true
  }));
  ```
- **Task:** Add `helmet` middleware for CSP, HSTS, X-Frame-Options
- **Task:** HTTP → HTTPS redirect at app layer if `NODE_ENV=production` and `X-Forwarded-Proto !== 'https'`

### 6.6 Dockerfile (D-01)
- **Task:** Create `Dockerfile` — multi-stage build:
  ```dockerfile
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY . .
  RUN pnpm install --frozen-lockfile
  RUN pnpm -r build

  FROM node:20-alpine
  WORKDIR /app
  COPY --from=builder /app/node_modules ./node_modules
  COPY --from=builder /app/packages ./packages
  COPY --from=builder /app/apps ./apps
  COPY --from=builder /app/db ./db
  CMD ["node", "apps/control-service/dist/index.js"]
  ```
- **Task:** Create `.dockerignore`: exclude `node_modules`, `*.test.ts`, `docs/`, `.git/`
- **Task:** Verify: `docker build . -t cku:latest` passes with no errors

### 6.7 Docker Compose stack
- **Task:** Create `docker-compose.yml`:
  ```yaml
  version: '3.9'
  services:
    postgres:
      image: postgres:16-alpine
      environment:
        POSTGRES_DB: cku
        POSTGRES_USER: cku
        POSTGRES_PASSWORD: dev
      volumes:
        - pg_data:/var/lib/postgresql/data
    redis:
      image: redis:7-alpine
    control-service:
      build: .
      ports:
        - "8080:8080"
      depends_on:
        - postgres
        - redis
      environment:
        DATABASE_URL: postgresql://cku:dev@postgres:5432/cku
        REDIS_URL: redis://redis:6379
  volumes:
    pg_data:
  ```
- **Task:** Test: `docker-compose up` → all services start, `/health` returns 200

### 6.8 Kubernetes manifests
- **Task:** `k8s/deployment.yaml`:
  ```yaml
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: cku-control-service
  spec:
    replicas: 2
    template:
      spec:
        containers:
        - name: cku
          image: cku:latest
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
  ```
- **Task:** `k8s/service.yaml`: `ClusterIP` service on port 8080
- **Task:** `k8s/hpa.yaml`: `HorizontalPodAutoscaler` targeting 70% CPU, min 2 / max 10 replicas
- **Task:** `k8s/configmap.yaml`: non-secret env vars
- **Task:** `k8s/secret.yaml`: template for secrets (values populated at deploy time, not committed)

### 6.9 Environment variables documentation (D-02)
- **Task:** Update `.env.example` with all required vars:
  ```
  # Database
  DATABASE_URL=postgresql://user:password@localhost:5432/cku
  
  # Redis
  REDIS_URL=redis://localhost:6379
  
  # Auth
  CKU_SERVICE_ACCOUNT_SECRET=...
  CKU_LEGACY_API_KEYS_ENABLED=false
  
  # Security
  CKU_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
  
  # Observability
  LOG_LEVEL=info
  ```

---

## Phase 7 — Test Coverage
**Goal:** Achieve production readiness coverage targets: auth ≥90%, orchestrator ≥80%, governance ≥80%.  
**Duration:** ~2.5 weeks (can overlap with Phase 6)  
**Production readiness items:** T-01, T-02, T-03, T-04, T-05  

### 7.1 Auth package tests — ≥90% coverage (T-01)

**Using `docs/06_validation/TEST_PLAN_AUTH.md` as implementation spec:**

| Test Suite | Cases | Coverage |
|-----------|-------|----------|
| InsForge JWT verification | TC-AUTH-001..007 | Token issuance, JWKS fetch, signature validation, kid mismatch, jti revocation |
| Session resolution | TC-SESSION-001..006 | Service account type, legacy API key, missing header, malformed token |
| Execution token issuance | TC-EXEC-001..006 | Issue, verify, expiry, wrong secret, missing env var, audience |
| Service account lifecycle | TC-SA-001..007 | Create, verify, expiry, rotation, isServiceAccountToken function |

**Mock infrastructure:**
- JWKS mock server: `vi.mock("jwks-rsa", () => generateKeyPairSync(...))`
- Redis mock: `ioredis-mock`
- Test fixtures: `buildResolvedSession()`, `buildServiceAccount()`

### 7.2 Orchestrator tests — ≥80% coverage (T-02)

| Test Suite | Coverage |
|-----------|----------|
| Phase engine | All 8 phases (intake → planning → skills → gating → building → testing → reviewing → deployment); resume from checkpointed state; mode table per-phase |
| Execution engine | executeRunBundle flow; executeTask 6 stages; policy evaluation, adapter call, simulation, approval gating, validation, retry with healing |
| Gate manager | All 9 gates evaluated; sequencing logic; manual override; short-circuit on block |
| Rollback engine | Coarse-grained undo; file restoration; audit trail |
| Run store | CRUD operations; state persistence (after Phase 2 wiring) |

### 7.3 Governance tests — ≥80% coverage (T-03)

| Test Suite | Coverage |
|-----------|----------|
| All 9 gate evaluators | Pass, fail, needs-review cases for each |
| Consensus engine | Quorum logic; conflicting votes |
| Constraint engine | Policy violation detection |
| Kill switch | Safe shutdown; grace period |
| Policy store | Policy lookup; mode-specific policies |

### 7.4 Multi-tenant isolation tests

**Using `TEST_PLAN_RUN_SCOPING.md` and `TEST_PLAN_RBAC.md`:**

- **Fixture:** 2 orgs, 3 workspaces, 5 projects, 6 users with different roles, 5 pre-seeded runs
- **Run scoping:** `TC-RUN-001..010` — cross-tenant isolation (orgA user cannot access orgB runs; returns 404 not 403)
- **RBAC:** `TC-RBAC-001..010` — all 5 roles × 15 permissions; alias normalization
- **Default org bypass blocked:** `TC-CROSS-001` — `orgId=default` → 400 INVALID_ORG_ID

### 7.5 Smoke test suite (T-04)

**Using `SMOKE_TEST_PACK.md`:**

- **Startup (S-001..005):** Service starts, DB connected, Redis connected, health endpoint 200, metrics endpoint 200
- **Auth (A-001..006):** Valid token, expired token, wrong aud, revoked token, SA token, legacy key
- **Run lifecycle (R-001..006):** Create run, move through all 8 phases, complete successfully, handle failures
- **Gates (G-001..005):** Gate pause, reviewer approval, run resumes, gate rejection, run cancels
- **CLI (C-001..004):** Commands produce correct output, auth flow works, error handling

### 7.6 Security test suite

**Using `SECURITY_TESTING_PLAN.md`:**

- **JWT attacks:** Algorithm confusion, "none" algorithm, expired token, wrong issuer, tampered payload
- **Authorization bypass:** Cross-tenant access, privilege escalation, invalid permissions
- **Input validation:** SQL injection, XSS, oversized payload, malformed JSON
- **Tenant isolation:** Verify orgId scoping at every layer (API, DB, cache)
- **Rate limiting:** Verify 100 req/min global, 10 req/min token creation
- **Audit integrity:** Hash chain continuity, missing audit events

### 7.7 Integration test suite
- **CI YAML:** `integration-tests.yml` with postgres and redis services
- **Test scenarios:** End-to-end flows (auth → create run → gate → complete)
- **Coverage:** All critical paths from CLI or web UI

---

## Phase 8 — v1.3.0 Release Preparation
**Goal:** Complete all remaining production readiness items and pass Go/No-Go gate.  
**Duration:** ~1 week  
**Depends on:** Phases 1–7 complete  

### 8.1 Rate limiting (S-06)
- **Task:** Add `express-rate-limit` to control-service
- **Task:** Global limiter: 100 req/min per `X-Forwarded-For` IP
- **Task:** Token creation endpoint (`POST /v1/service-accounts/*/tokens`): 10 req/min per actor
- **Task:** Return `429 Too Many Requests` with `Retry-After` header

### 8.2 Final security hardening
- **Task:** `npm audit --audit-level=high` — fix all high/critical advisories
- **Task:** `eslint-plugin-security` scan — resolve all flagged patterns
- **Task:** Add both as blocking CI steps

### 8.3 OpenAPI spec validation (Doc-01)
- **Task:** `build:openapi` script generates `docs/api/openapi.yaml`
- **Task:** CI step: `openapi-diff` fails if generated spec differs from committed
- **Task:** All routes, request bodies, responses, error codes documented

### 8.4 CHANGELOG and release notes (Doc-02)
- **Task:** Update `CHANGELOG.md` with v1.3.0 section
  - New features (governance gates, API versioning, etc.)
  - Security fixes (R-01..R-07 addressed)
  - Breaking changes (all routes moved to `/v1/`)
- **Task:** Run `pnpm changeset version` to bump package versions

### 8.5 SECURITY.md (Doc-03)
- **Task:** Create `SECURITY.md`: vulnerability disclosure process
  - Email address for reports
  - Response SLA (acknowledge 24h, patch 7 days for critical)
  - PGP key if applicable

### 8.6 Rollback procedure (D-04)
- **Task:** Create `docs/ROLLBACK.md` — step-by-step v1.3.0 → v1.2.0 rollback
  - Database migration reversal
  - Traffic cutover procedure
  - Smoke test verification
- **Task:** Test rollback in staging; document results

### 8.7 Go/No-Go review
- **Task:** Run through every item in `GO_NO_GO_CHECKLIST.md`
- **Task:** **Security gate** (HARD BLOCK): all 7 items checked ✓
- **Task:** **Quality gate** (HARD BLOCK): all 5 coverage targets met ✓
- **Task:** **Operations gate** (HARD BLOCK): health/ready/metrics/logging/alerting verified ✓
- **Task:** **Product gate** (CONDITIONAL): feature complete per roadmap
- **Task:** Record decision in decision log; sign-off from lead

---

## Phase 9 — Realtime & Event Streaming (Post-v1.3.0)
**Goal:** Implement SSE realtime stream and web UI live updates.  
**Duration:** ~2 weeks  
**Wave:** Wave 9  

### 9.1 SSE endpoint
- **Task:** `GET /v1/events/stream` — auth-required Server-Sent Events endpoint
- **Task:** Query params: `runId=`, `projectId=` for filtered subscriptions
- **Task:** Heartbeat: `event: ping` every 30 seconds to keep connections alive
- **Task:** Graceful close on auth expiry (401 response)

### 9.2 Canonical event fanout
- **Task:** `packages/events/src/event-bus.ts` — in-process event bus
- **Task:** All orchestrator phase transitions emit canonical events:
  - `run.phase.started`, `run.gate.needs_review`, `run.gate.approved`, `run.completed`, `run.failed`
- **Task:** Events persisted to DB and fanned out to active SSE connections
- **Task:** Tenant isolation: each connection only receives events for its org

### 9.3 Web UI EventSource integration
- **Task:** `apps/web-control-plane/src/lib/event-stream.ts` — EventSource wrapper
  - Auto-reconnect with exponential backoff (max 5 retries)
  - Event parsing and type dispatch
- **Task:** Run detail page: live status updates, step progress, gate alerts (no polling)
- **Task:** Global connection status indicator in navbar

### 9.4 InsForge realtime integration
- **Task:** Investigate InsForge push event API for cross-surface broadcast
- **Task:** Forward `run.completed`, `run.failed`, `gate.needs_review` events to InsForge realtime channel

---

## Phase 10 — Production Hardening & v2.0 Preparation
**Goal:** Full SLA compliance, performance validation, and production readiness.  
**Duration:** ~6 weeks  
**Wave:** Wave 11  

### 10.1 AI adapter integration testing
- **Task:** `ClaudeAdapter` integration tests (behind `TEST_ANTHROPIC_API_KEY` env gate)
- **Task:** `OpenAIAdapter` integration tests (behind `TEST_OPENAI_API_KEY`)
- **Task:** `GeminiAdapter` integration tests (behind `TEST_GOOGLE_API_KEY`)
- **Task:** All adapters: verify `execute()`, `stream()`, error handling, timeout behaviour

### 10.2 AI model fallback chain
- **Task:** `packages/adapters/src/adapter-router.ts` — primary → fallback1 → fallback2 selection
- **Task:** On adapter failure (`5xx`, timeout, rate limit): route to next in chain
- **Task:** Emit `adapter.failover` canonical event with reason and target
- **Task:** Config: `CKU_ADAPTER_FALLBACK_CHAIN=claude,openai,gemini`

### 10.3 GitHub adapter production auth
- **Task:** GitHub App installation token flow (per-repo, short-lived)
- **Task:** `POST /v1/integrations/github/install` — store installation ID per workspace
- **Task:** Token refresh: check expiry before each API call, refresh if < 5 min remaining

### 10.4 Circuit breakers for external calls
- **Task:** `packages/shared/src/circuit-breaker.ts` — wrap all external calls
  - InsForge, AI adapters, GitHub, Slack, etc.
- **Task:** States: CLOSED (normal), OPEN (failing), HALF_OPEN (probing)
- **Task:** Half-open: allow 1 probe request after `OPEN_TIMEOUT` (default 30s)
- **Task:** Metrics: `circuit_breaker_state{service}` gauge on `/metrics`

### 10.5 Load testing
- **Task:** `k6` load test scripts: 1000 req/sec sustained for 5 minutes
- **Task:** Targets: p99 latency < 500ms, error rate < 0.1%
- **Task:** Run in staging with production-equivalent DB and Redis
- **Task:** Capture baseline and store as performance regression reference

### 10.6 Compliance and audit
- **Task:** SOC 2 Type I readiness assessment
  - Audit log completeness
  - Access control enforcement
  - Change management procedures
- **Task:** Penetration test — schedule third-party assessment against staging
- **Task:** Remediate all findings before v2.0 release

### 10.7 Incident response & runbooks
- **Task:** Create `docs/INCIDENT_RESPONSE.md`:
  - On-call escalation procedures
  - Session revocation playbook (compromised token)
  - Database failover procedures
  - Circuit breaker troubleshooting
- **Task:** Practice runbooks in staging

---

## Critical Path & Timeline

```
Phase 1 (1 week)    : Immediate security fixes
    ↓
Phase 2 (2 weeks)   : Database persistence [CRITICAL BLOCKER]
    ↓
    ├─ Phase 3 (1.5 weeks) : API versioning      ┐
    ├─ Phase 4 (2 weeks)   : Governance gates    ├─ PARALLEL
    └─ Phase 5 (2 weeks)   : Session security    ┘
         ↓
Phase 6 (2 weeks)   : Observability & deployment
    ↓
Phase 7 (2.5 weeks) : Test coverage (can overlap with Phase 6)
    ↓
Phase 8 (1 week)    : Release prep
    ↓
    ╔═══════════════════════════════════╗
    ║  v1.3.0 RELEASE GATE               ║
    ║  (Go/No-Go decision)               ║
    ╚═══════════════════════════════════╝
    ↓
Phase 9 (2 weeks)   : Realtime SSE events
    ↓
Phase 10 (6 weeks)  : Production hardening
    ↓
    ╔═══════════════════════════════════╗
    ║  v2.0 RELEASE GATE                 ║
    ║  (Full production SLA)              ║
    ╚═══════════════════════════════════╝
```

---

## Effort Summary

| Phase | Description | Duration | Risks Closed | Post-Req | Status |
|-------|-------------|----------|--------------|----------|--------|
| 1 | Immediate security | 1w | R-01,02,03,10,12,17,19 | None | Ready |
| 2 | DB persistence (critical) | 2w | R-04,14,18,20 | None | Ready |
| 3 | API versioning | 1.5w | R-05,22 | After P2 | Ready |
| 4 | Governance gates | 2w | R-06,07,16 | After P2 | Ready |
| 5 | Session security | 2w | R-11,13,21 | After P2 | Ready |
| 6 | Observability | 2w | — | After P2 | Ready |
| 7 | Test coverage | 2.5w | — | Parallel P6 | Ready |
| 8 | Release prep | 1w | — | All prev | Ready |
| **v1.3.0 Release** | **~14 weeks** | — | — | — | **Planned** |
| 9 | Realtime SSE | 2w | — | After v1.3.0 | Planned |
| 10 | Hardening | 6w | — | After v1.3.0 | Planned |
| **v2.0 Release** | **~22 weeks total** | — | — | — | **Planned** |

---

## Success Criteria

### Phase 1 ✓
- All 7 critical security risks fixed
- git history clean (no secrets exposed)
- Regression tests passing

### Phase 2 ✓
- All state persisted to PostgreSQL
- Service restart preserves runs/gates/audit events
- Migration runner passes on clean schema

### Phase 3 ✓
- All routes under `/v1/` prefix
- CLI and web UI updated
- OpenAPI spec generated and committed

### Phase 4 ✓
- All 14 gates implemented and sequenced
- Gate rejection endpoint working
- Approval flow tested end-to-end

### Phase 5 ✓
- Session revocation functional
- httpOnly cookies enforced
- Service account rotation tested

### Phase 6 ✓
- All logs structured JSON format
- Prometheus metrics endpoint live
- Docker Compose stack runs locally
- Dockerfile builds successfully

### Phase 7 ✓
- Auth package ≥90% coverage
- Orchestrator package ≥80% coverage
- Governance package ≥80% coverage
- All smoke tests passing

### Phase 8 ✓
- All 34 production readiness items checked
- Go/No-Go decision: **GO**
- v1.3.0 tagged and released

### v1.3.0 Release Gate
- Security: ✓ all 10 items
- Quality: ✓ all 5 items
- Operations: ✓ all 6 items
- Product: ✓ roadmap complete

---

## Related Documents

- `docs/06_validation/PRODUCTION_READINESS.md` — 34-item checklist (this plan implements all)
- `docs/06_validation/GO_NO_GO_CHECKLIST.md` — release decision framework
- `docs/04_tracking/risk-log.md` — all 22 risks tracked (this plan closes 15+)
- `docs/05_execution/WAVE_STATUS.md` — wave-level tracking (Waves 4–11)
- `docs/03_specs/SPEC_*.md` — implementation contracts for each component
- `docs/06_validation/TEST_PLAN_*.md` — detailed test specs for each phase

---

**Status:** Ready for execution  
**Last updated:** 2026-04-04  
**Next review:** After Phase 1 completion
