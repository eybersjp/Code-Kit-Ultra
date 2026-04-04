# Validation Master — Code Kit Ultra

**Status:** Active
**Version:** 1.2.0
**Last reviewed:** 2026-04-03
**Purpose:** Single authoritative DoD checklist for every spec. A spec is only "Implemented" when every item in its row is checked.

---

## How to Use This Document

1. When a spec transitions from Draft → Approved, add its row here.
2. When implementation begins, check items as they complete.
3. A spec is **Done** only when all checkboxes are marked.
4. Update `docs/04_tracking/progress-log.md` when a spec moves to Done.
5. Any unchecked critical item blocks the v1.3.0 release.

---

## Spec Completion Matrix

### SPEC_API_VERSIONING

| # | DoD Item | Done |
|---|----------|------|
| 1 | All routes prefixed with `/v1/` | 🔲 |
| 2 | CLI updated to call `/v1/` endpoints | 🔲 |
| 3 | VS Code extension updated to call `/v1/` endpoints | 🔲 |
| 4 | Web UI updated to call `/v1/` endpoints | 🔲 |
| 5 | `404` returned for requests to un-versioned paths | 🔲 |
| 6 | Route catalog matches `SPEC_API_VERSIONING.md` | 🔲 |
| 7 | OpenAPI spec generated or hand-authored for all `/v1/` routes | 🔲 |
| 8 | Logged in `progress-log.md` | 🔲 |

---

### SPEC_GATE_TAXONOMY

| # | DoD Item | Done |
|---|----------|------|
| 1 | All 9 governance gates defined in `gate-manager.ts` | 🔲 |
| 2 | All 5 quality gates remain in `gate-manager.ts` (14 total) | 🔲 |
| 3 | Gate evaluation logic matches spec for each gate type | 🔲 |
| 4 | Mode-aware pause rules applied per gate (see SPEC table) | 🔲 |
| 5 | `GovernanceGateType` TypeScript union exported from `packages/shared` | 🔲 |
| 6 | `gate.evaluated` and `gate.awaiting_approval` events emitted | 🔲 |
| 7 | Gate decisions persisted to `gate_decisions` DB table | 🔲 |
| 8 | Tests: each gate type evaluates correctly | 🔲 |
| 9 | Logged in `progress-log.md` | 🔲 |

---

### SPEC_POSTGRES_PERSISTENCE

| # | DoD Item | Done |
|---|----------|------|
| 1 | DB client pool initialised on startup | 🔲 |
| 2 | Migration runner applies all migrations on startup | 🔲 |
| 3 | Table rename migration `004_rename_tables.sql` applied | 🔲 |
| 4 | `runs` CRUD wired to `apps/control-service/src/db/runs.ts` | 🔲 |
| 5 | `gate_decisions` CRUD wired to `apps/control-service/src/db/gates.ts` | 🔲 |
| 6 | `service_accounts` CRUD wired (replaces in-memory Map) | 🔲 |
| 7 | `audit_events` writes use DB (replaces console.log fallback) | 🔲 |
| 8 | `canonical_events` writes use DB | 🔲 |
| 9 | `outcome_records` writes use DB | 🔲 |
| 10 | Connection string from `DATABASE_URL` env var only | 🔲 |
| 11 | `PGPASSWORD` not in logs or error messages | 🔲 |
| 12 | Integration tests pass against local Postgres | 🔲 |
| 13 | Logged in `progress-log.md` | 🔲 |

---

### SPEC_GATE_REJECTION

| # | DoD Item | Done |
|---|----------|------|
| 1 | `POST /v1/gates/{id}/reject` endpoint exists | 🔲 |
| 2 | Only `gate:reject` permission holders can call it | 🔲 |
| 3 | Gate in `pending` status transitions to `rejected` | 🔲 |
| 4 | Gate in non-pending status returns `409 Conflict` | 🔲 |
| 5 | Run status transitions to `cancelled` on gate rejection | 🔲 |
| 6 | `gate.rejected` audit event emitted | 🔲 |
| 7 | `gate.rejected` canonical event published | 🔲 |
| 8 | `decisionNote` from request body stored on gate record | 🔲 |
| 9 | Test: happy path, 409 double-reject, 403 wrong permission | 🔲 |
| 10 | Logged in `progress-log.md` | 🔲 |

---

### SPEC_REALTIME_STREAM

| # | DoD Item | Done |
|---|----------|------|
| 1 | `GET /v1/events/stream` returns `text/event-stream` | 🔲 |
| 2 | SSE endpoint requires authentication | 🔲 |
| 3 | Subscription filtered by `runId`, `projectId`, `eventName` query params | 🔲 |
| 4 | Heartbeat event sent every 30 seconds | 🔲 |
| 5 | Subscription cleaned up on client disconnect | 🔲 |
| 6 | `connected` event sent on successful subscription | 🔲 |
| 7 | Events published via `publishEvent()` appear on SSE stream | 🔲 |
| 8 | EventSource client in web UI connects and renders events | 🔲 |
| 9 | Logged in `progress-log.md` | 🔲 |

---

### SPEC_OBSERVABILITY

| # | DoD Item | Done |
|---|----------|------|
| 1 | Pino logger factory used throughout — no bare `console.log` in production paths | 🔲 |
| 2 | Log context includes `runId`, `orgId`, `correlationId` where available | 🔲 |
| 3 | `GET /metrics` returns Prometheus-format metrics | 🔲 |
| 4 | HTTP request duration histogram present | 🔲 |
| 5 | Run and gate metrics (runs_created_total, gates_evaluated_total) present | 🔲 |
| 6 | OTel SDK initialised (even if no-op exporter) | 🔲 |
| 7 | Log level configurable via `LOG_LEVEL` env var | 🔲 |
| 8 | Logs do not contain secrets or bearer tokens | 🔲 |
| 9 | Logged in `progress-log.md` | 🔲 |

---

### SPEC_DEPLOYMENT

| # | DoD Item | Done |
|---|----------|------|
| 1 | Multi-stage Dockerfile builds and runs `control-service` | 🔲 |
| 2 | Docker Compose brings up control-service + postgres + redis | 🔲 |
| 3 | `docker compose up` produces a healthy service at `:8080` | 🔲 |
| 4 | K8s Deployment manifest exists for `cku-control-service` | 🔲 |
| 5 | K8s ConfigMap + Secret manifests exist | 🔲 |
| 6 | K8s HPA manifest exists | 🔲 |
| 7 | Liveness and readiness probes defined | 🔲 |
| 8 | Container runs as non-root user | 🔲 |
| 9 | No secrets in Dockerfile or K8s manifests (all from env/secrets) | 🔲 |
| 10 | Logged in `progress-log.md` | 🔲 |

---

### SPEC_CLI_COMMANDS

| # | DoD Item | Done |
|---|----------|------|
| 1 | `ck run create` subcommand functional | 🔲 |
| 2 | `ck run list` subcommand functional | 🔲 |
| 3 | `ck run status <id>` subcommand functional | 🔲 |
| 4 | `ck gate list` subcommand functional | 🔲 |
| 5 | `ck gate approve <id>` subcommand functional | 🔲 |
| 6 | `ck gate reject <id>` subcommand functional | 🔲 |
| 7 | `ck outcome record` subcommand functional | 🔲 |
| 8 | `ck auth login` subcommand functional | 🔲 |
| 9 | Backward-compatible aliases for existing `/ck-*` commands | 🔲 |
| 10 | `ck --help` renders all command groups | 🔲 |
| 11 | Logged in `progress-log.md` | 🔲 |

---

### SPEC_OPENAPI

| # | DoD Item | Done |
|---|----------|------|
| 1 | `openapi.yaml` exists at `docs/openapi.yaml` | 🔲 |
| 2 | All `/v1/` routes documented | 🔲 |
| 3 | Request/response schemas match implementation | 🔲 |
| 4 | Security schemes (bearer + service-account) documented | 🔲 |
| 5 | Error response shapes documented | 🔲 |
| 6 | Spec validated with `swagger-parser` or `spectral` | 🔲 |
| 7 | Logged in `progress-log.md` | 🔲 |

---

### SPEC_SERVICE_ACCOUNTS

| # | DoD Item | Done |
|---|----------|------|
| 1 | `POST /v1/service-accounts` creates SA and persists to DB | 🔲 |
| 2 | `POST /v1/service-accounts/{id}/tokens` issues JWT | 🔲 |
| 3 | `POST /v1/service-accounts/{id}/rotate` invalidates old tokens | 🔲 |
| 4 | Service accounts survive control-service restart | 🔲 |
| 5 | `crypto.randomUUID()` used for SA ID (not Math.random) | 🔲 |
| 6 | Scope validation rejects unknown scopes | 🔲 |
| 7 | `service-account.created` audit event emitted | 🔲 |
| 8 | Logged in `progress-log.md` | 🔲 |

---

### SPEC_SESSION_REVOCATION

| # | DoD Item | Done |
|---|----------|------|
| 1 | `POST /v1/session/revoke` immediately invalidates token | 🔲 |
| 2 | Revoked token returns 401 on next authenticated request | 🔲 |
| 3 | Revocation entries auto-expire with token TTL | 🔲 |
| 4 | Dev fallback works without Redis (in-memory, with warning) | 🔲 |
| 5 | `session.revoked` audit event emitted | 🔲 |
| 6 | Missing `jti` handled gracefully (log warning, skip check) | 🔲 |
| 7 | Logged in `progress-log.md` | 🔲 |

---

### SPEC_EXTRA_MODES

| # | DoD Item | Done |
|---|----------|------|
| 1 | `turbo` mode policy defined in `mode-controller.ts` | ✅ |
| 2 | `builder` mode policy defined in `mode-controller.ts` | ✅ |
| 3 | `pro` mode policy defined in `mode-controller.ts` | ✅ |
| 4 | `expert` mode policy defined in `mode-controller.ts` | ✅ |
| 5 | All 7 modes documented in `MASTER_VISION.md` | ✅ |
| 6 | `Mode` type in `packages/shared/src/types.ts` includes all 7 | 🔲 |
| 7 | Logged in `progress-log.md` | 🔲 |

---

### SPEC_AI_ADAPTERS

| # | DoD Item | Done |
|---|----------|------|
| 1 | `PlatformAdapter` interface exported from `packages/adapters` | 🔲 |
| 2 | `ClaudeAdapter` implements interface and is registered | 🔲 |
| 3 | `OpenAIAdapter` implements interface and is registered | 🔲 |
| 4 | `GeminiAdapter` implements interface and is registered | 🔲 |
| 5 | `AntigravityAdapter` implements interface and is registered | 🔲 |
| 6 | `CursorAdapter` implements interface and is registered | 🔲 |
| 7 | `WindsurfAdapter` implements interface and is registered | 🔲 |
| 8 | Fit score routing selects best adapter per task type | 🔲 |
| 9 | Fallback chain invoked when primary adapter fails | 🔲 |
| 10 | Logged in `progress-log.md` | 🔲 |

---

## Release Gate Summary

### v1.3.0 Go / No-Go

| Category | Condition | Status |
|----------|-----------|--------|
| Auth | No active auth bypass (R-02 closed) | 🔲 |
| Auth | No hardcoded secrets in production build (R-01, R-03 closed) | 🔲 |
| Persistence | PostgreSQL wired for all runtime state | 🔲 |
| Persistence | Service accounts persisted to DB | 🔲 |
| API | All routes under `/v1/` | 🔲 |
| Gates | All 9 governance gates implemented and tested | 🔲 |
| End-to-end | Demo script runs: idea → gate pause → approve → execute → report | 🔲 |
| Security | Session revocation functional | 🔲 |
| Observability | Structured logging (no bare console.log in production paths) | 🔲 |
| Test coverage | Auth, gate approval, run lifecycle, cross-tenant rejection tests all pass | 🔲 |

All items in the Go / No-Go table must be ✅ before v1.3.0 can ship.
