# Control Service — Claude Code Context

## Quick Overview

The **control-service** is the orchestration hub of CKU. It's an Express.js server (port 7474) that:
- Receives execution intent from CLI, web UI, or IDE extensions
- Evaluates all 9 governance gates
- Orchestrates the execution pipeline
- Records audit trail to SHA-256 hash chain + InsForge
- Manages approval workflows for gated decisions

This is the core runtime engine — all governed execution flows through here.

## Quick Start

From repo root (pnpm is workspace-aware):

```bash
# Development (auto-reload)
pnpm --filter control-service run dev

# Production
pnpm --filter control-service run start

# Tests
pnpm --filter control-service run test              # All tests
pnpm --filter control-service run test:watch        # Watch mode
pnpm --filter control-service run test:smoke        # Smoke tests only
pnpm --filter control-service run test:coverage     # Coverage report

# Database setup (from root)
pnpm run db:migrate       # Run migrations
pnpm run db:seed          # Seed test data
```

## Architecture

### Directory Structure

```
src/
  index.ts              Entry point, Express setup
  middleware/           Express middleware (auth, logging, etc.)
  routes/               HTTP endpoint definitions
  handlers/             Business logic for each endpoint
  services/             Core orchestration services
  lib/                  Utilities and helpers
  db/                   Database connection pool, migrations
  types/                TypeScript interfaces
  events/               Event definitions and emitters
  alerts/               Alert/notification system
  workflows/            Workflow execution engine (new system)
  migrations/           Database schema migrations

test/
  smoke.test.ts         Quick smoke tests
  integration-workflows.test.ts  Workflow integration tests
```

### Entry Point (index.ts)

- Creates Express app
- Wires middleware (auth, logging, CORS)
- Registers route handlers
- Connects to PostgreSQL and Redis
- Starts server on port 7474
- Seeds database if `SEED_DATABASE=true`

### Middleware

| File | Purpose |
|------|---------|
| `middleware/authenticate.ts` | JWT token validation, RBAC enforcement |
| `middleware/authorize.ts` | Policy-based authorization checks |
| `middleware/metrics.ts` | Prometheus metrics collection |
| `middleware/rate-limit.ts` | Request rate limiting |
| `middleware/security-headers.ts` | Security headers (CSP, HSTS, etc.) |
| `middleware/verify-revocation.ts` | Token revocation verification |

### Routes & Handlers

**Core Governance:**
- `POST /runs` → `handlers/create-run.ts` — Create new execution run
- `GET /runs/:id` → `handlers/get-run.ts` — Fetch run status
- `GET /runs` → `handlers/list-runs.ts` — List runs with filters
- `POST /gates/:id/approve` → `handlers/approve-gate.ts` — Manually approve gated decision
- `GET /gates` → `handlers/list-gates.ts` — List gate statuses

**Learning & Health:**
- `GET /learning/policies` → `handlers/get-learning-policies.ts` — Fetch learned policies
- `GET /learning/reliability` → `handlers/get-learning-reliability.ts` — Model reliability metrics
- `GET /learning/report` → `handlers/get-learning-report.ts` — Learning loop status
- `GET /automation/status` → `handlers/get-automation-status.ts` — Automation health

**Sessions & Service Accounts:**
- `DELETE /sessions/:id` → `handlers/delete-session.ts` — Revoke execution session
- `GET /health` → Health check endpoint (wired in `routes/health.ts`)
- Service account management (via `routes/service-accounts.ts`)

**Timeline & Monitoring:**
- `GET /timeline` → `handlers/get-timeline.ts` — Event timeline for a run

### Services

Core business logic:

| File | Purpose |
|------|---------|
| `services/approval-service.ts` | Gate approval workflow management |
| `services/auto-approval-engine.ts` | Automatic approval decision logic |
| `services/automation-orchestrator.ts` | Coordinates automated execution steps |
| `services/healing-service.ts` | Self-healing and remediation coordination |
| `services/healing-engine.ts` | Healing strategy execution and rollback |
| `services/learning-service.ts` | Outcome learning loop |
| `services/alert-acknowledgment-service.ts` | Alert and notification handling |
| `services/rollback-automation.ts` | Automatic rollback on failure |
| `services/test-verification-service.ts` | Test verification and coverage checks |
| `services/run-reader.ts` | Run state queries and retrieval |

### Database

**Connection Pool:**
- `db/pool.ts` — PostgreSQL connection pool via `pg` library
- Lazy-initialized on first query
- Single pool shared across all handlers

**Migrations:**
- `migrations/*.sql` — Schema definitions (gates, runs, sessions, policies, etc.)
- Run with `npm run db:migrate` before starting service
- Migrations are versioned and idempotent

**Key Tables:**
```
runs             Execution runs, statuses, outcomes
gate_decisions   Gate evaluation results per run
gate_approvals   Manual reviewer approvals
sessions         User sessions (JWT + metadata)
service_accounts Service account credentials
policies         Policy snapshots + versions
audit_log        Immutable SHA-256 hash-chain audit trail
```

### Execution Flow (Happy Path)

```
POST /runs (operator intent)
  ↓
validate request (authenticate.ts middleware)
  ↓
create-run handler
  ↓
create Run record → database
  ↓
GateManager.evaluateGates(context)
  ↓
  ├─ Security Gate → pass/fail/blocked
  ├─ Quality Gate → pass/fail/blocked
  ├─ Risk Gate → pass/fail/blocked
  └─ ... (remaining gates, short-circuit on blocked)
  ↓
if any gate blocked or needs-review → pause
  ↓
POST /gates/:id/approve (reviewer decision)
  ↓
GateManager.overrideGateDecision()
  ↓
resume orchestrator
  ↓
orchestrator.execute() → step sequencing
  ↓
record each step → audit_log (hash-chain)
  ↓
emit to InsForge (signed context + audit events)
  ↓
return final status → GET /runs/:id
```

## Governance Integration

The control-service orchestrates gate evaluation via the `governance` package:

```typescript
import { GateManager } from '@cku/governance'

const gateManager = new GateManager()
const results = await gateManager.evaluateGates({
  mode: 'safe',
  run: { runId: '...', intent: '...' },
  policy: /* from config/policy.json */
})

const blocked = gateManager.isBlocked(results)
const needsReview = gateManager.requiresReview(results, 'safe')
```

## Workflows System (In Development)

Workflow execution engine under `src/workflows/` — **currently incomplete and not fully integrated**:
- Files exist but have unresolved TypeScript errors (`Cannot find module 'workflow'`, missing event types)
- Missing dependency: `workflow` and `@workflow/vitest` packages
- Type mismatches in RunState shape (workflows expect `gates`, `steps`, `testResults` properties)
- Several workflows defined but not integrated into core orchestration yet
- Do NOT use these in production; they are WIP

**Current status**: Type errors prevent compilation. This is a Phase 3 feature under active development in `docs/PHASE_3_WORKFLOW_DESIGN.md`.

## Testing Strategy

### Unit Tests
- Handler tests (mock database, gate manager)
- Service tests (isolation via mocks)
- Utility tests

### Integration Tests (`vitest.integration.config.ts`)
- Real PostgreSQL connection
- Full request/response cycle via supertest
- Gate evaluation with real GateManager
- Workflow execution tests

Run integration tests separately:
```bash
# From repo root
pnpm exec vitest run --config apps/control-service/vitest.integration.config.ts
```

**Note**: Integration tests require a real PostgreSQL connection. Use `docker compose up -d` to start the database before running integration tests.

### Smoke Tests (`test/smoke.test.ts`)
- Quick sanity checks on core paths
- Fast feedback loop during development
- `npm run test:smoke`

### Test Coverage
- Target: 80%+
- `npm run test:coverage` generates HTML report
- Exclude: `test/**`, `db/migrations/**`

## Environment & Config

**Required env vars** (see root `.env` and `.env.example`):
- `CODEKIT_PROFILE` — Execution mode (local-safe, staging, prod)
- `CODEKIT_TIMEOUT_MS` — Step execution timeout (default: 30000)
- `CODEKIT_MAX_RETRIES` — Retry count (default: 3)
- `ANTIGRAVITY_API_KEY`, `ANTIGRAVITY_BASE_URL` — InsForge API
- `CURSOR_API_KEY`, `CURSOR_BASE_URL` — Cursor integration
- `WINDSURF_API_KEY`, `WINDSURF_BASE_URL` — Windsurf integration
- PostgreSQL, Redis connection strings auto-discovered from Docker Compose or manual setup

**Database:**
- PostgreSQL 16 on port 5432
- Auto-migrated on startup (set `AUTO_MIGRATE=true`)
- Connection pooled via `db/pool.ts`
- Manual migration: `pnpm run db:migrate`

**Redis:**
- Redis 7 on port 6379
- Used for session store, caching, event pubsub
- Optional (some features gracefully degrade without it)

## Key Gotchas

1. **Separate integration config** — Integration tests use `vitest.integration.config.ts`, not root `vitest.config.ts`
2. **Database migrations run on startup** — If migrations fail, service won't start; check logs via `docker compose logs control-service`
3. **Gate evaluation is sequential, not parallel** — Blocking gates short-circuit remaining gates
4. **Audit immutability** — Once written to audit_log, records are permanent (SHA-256 hash-chain)
5. **InsForge dependency** — Audit events fail silently if InsForge is unreachable (logged but not fatal)
6. **Service account tokens** — Generated via bcrypt, must be rotated periodically
7. **Request context binding** — Correlation IDs and tenant scope are bound in middleware; handlers assume they're set
8. **Error responses** — Global error handler normalizes responses; handlers should throw AppError for consistent formatting
9. **pnpm workspace scoping** — Always use `--filter <app-name>` flag when running scripts for a specific app (e.g., `pnpm --filter control-service run test`)

## Debugging

**Enable debug logging:**
```bash
DEBUG=cku:* pnpm --filter control-service run dev
```

**Check gate evaluation:**
- Add `console.log` to handler before/after `gateManager.evaluateGates()`
- Inspect `GateStore` database records: `SELECT * FROM gate_decisions WHERE run_id = '...';`

**Run smoke tests:**
```bash
pnpm --filter control-service run test:smoke
```

**Run with coverage:**
```bash
pnpm --filter control-service run test:coverage
```

**Check audit trail:**
```sql
SELECT gate_decisions.*, audit_log.hash_chain 
FROM gate_decisions 
JOIN audit_log ON gate_decisions.run_id = audit_log.run_id
WHERE gate_decisions.run_id = '...'
ORDER BY created_at DESC;
```

**Workflow execution:**
- Check `integration-workflows.test.ts` for example flows
- Inspect workflow event emitters in handlers during execution
- Logs appear in control-service stdout

## Next Steps for Contributors

1. **Add a new endpoint?** → Create `handlers/my-handler.ts`, add route in `src/index.ts`, add tests
2. **Modify gate logic?** → Edit `governance` package gates, redeploy control-service (gates are loaded at startup)
3. **Change database schema?** → Create migration file in `migrations/`, run `pnpm run db:migrate`
4. **New workflow?** → Define in `workflows/`, integrate in handler, test with integration suite
