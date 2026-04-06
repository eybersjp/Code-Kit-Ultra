# Changelog

All notable changes to Code Kit Ultra will be documented in this file.

## [1.3.0] - 2026-04-04

### 🚀 Features
- **PostgreSQL Persistence** — All state (runs, gates, service accounts, audit events) now durable via PostgreSQL; no longer lost on restart.
- **Migration Runner** — Database migrations execute automatically on startup with transaction safety.
- **9 Governance Gates** — Full governance gate suite: Scope, Architecture, Security, Cost, Deployment, QA, Build, Launch, Risk Threshold.
- **Gate Rejection** — Reviewers can now reject gates via `POST /v1/gates/:id/reject` with required reason.
- **Service Account Secret Rotation** — `POST /v1/service-accounts/:id/rotate` generates a new 32-byte secret; returned once, never stored plaintext.
- **Session Revocation** — Redis-backed jti blacklist; `DELETE /v1/sessions/me` immediately invalidates a session.
- **API Versioning** — All endpoints now served under `/v1/` prefix; unversioned routes return `410 Gone`.
- **Prometheus Metrics** — `GET /metrics` endpoint with HTTP counters, latency histograms, run lifecycle counters, and gate evaluation counters.
- **Readiness Endpoint** — `GET /ready` gates on both PostgreSQL and Redis connectivity; returns `503` if either is unreachable.
- **Rate Limiting** — Global 100 req/min per IP; 10 req/min for token creation endpoints.
- **Security Headers** — HSTS, X-Frame-Options, CSP, X-Content-Type-Options on all responses.
- **Structured Logging** — Pino JSON logging throughout; all secrets redacted; every request carries X-Trace-ID.
- **Docker Compose** — Full local stack: `postgres:16`, `redis:7`, `control-service`; health-checked and dependency-ordered.
- **Kubernetes Manifests** — Deployment (replicas: 2, rolling update), Service, HPA (70% CPU, 2–10 replicas), ConfigMap, Namespace.

### 🔒 Security Fixes
- **R-01** — Removed hardcoded `"internal-sa-secret-change-me"` fallback; service now throws on startup if `CKU_SERVICE_ACCOUNT_SECRET` is absent.
- **R-02** — Removed hardcoded `"admin-key"` / `"operator-key"` API keys; legacy keys now gated behind `CKU_LEGACY_API_KEYS_ENABLED`.
- **R-03** — Removed `orgId === "default"` tenant isolation bypass from `authorize.ts`.
- **R-04** — PostgreSQL wired to runtime; all state persisted and durable.
- **R-06** — Gate rejection endpoint implemented (`POST /v1/gates/:id/reject`).
- **R-07** — 9 governance gates implemented (was: 1 partial).
- **R-10** — Replaced `Math.random()` with `crypto.randomUUID()` for service account IDs.
- **R-13** — Session revocation via Redis jti blacklist; compromised tokens can be immediately invalidated.
- **R-14** — Service accounts now persisted to PostgreSQL; no longer lost on restart.
- **R-18** — Audit hash chain now uses DB-persisted `lastHash` with advisory lock; survives restarts and multi-instance deployments.

### ⚠️ Breaking Changes
- All API routes moved to `/v1/` prefix. Clients calling unversioned routes (e.g., `/runs`) will receive `410 Gone`. Update all CLI and web UI clients.
- `PORT` now defaults to `8080` (was `4000`).
- Service will not start if `DATABASE_URL` or `CKU_SERVICE_ACCOUNT_SECRET` environment variables are absent.

### 📦 Dependencies Added
- `pg` ^8.11.3 — PostgreSQL client
- `redis` ^4.6.13 — Redis client
- `pino` / `pino-pretty` ^9 / ^10 — Structured logging
- `bcrypt` ^5.1.1 — Secret hashing
- `prom-client` ^15 — Prometheus metrics
- `zod` ^3.22.4 — Request validation



### 🚀 Features
- New version 1.2.0

### 🐞 Bug Fixes
- Maintenance updates

## [1.2.0-phase10] - 2026-03-27

### Added
- **Learning Engine**: Core logic for autonomous pattern detection and knowledge synthesis.
- **Outcome Ingestion**: System for recording and processing execution results.
- **Reliability Scoring**: Automated performance metrics and scoring for components.
- **Adaptive Policy Engine**: Governance-aware policy adaptation based on real-time data.
- **Plan Optimizer**: Autonomous optimization of execution plans.

### Changed
- **Control Service**: Updated handlers to support Phase 10 outcome tracking.
- **Repository Hygiene**: Hardened `.gitignore` and aligned monorepo dependencies.
- **CI/CD Foundation**: Established core GitHub Actions and repository governance.

### Verified
- Full typecheck and verification pass completed for Phase 10.
- All smoke and integration tests for autonomous execution passing.
