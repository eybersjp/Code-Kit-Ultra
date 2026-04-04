# Production Readiness Checklist

- **Document type**: Release Checklist
- **Version target**: v1.3.0
- **Last updated**: 2026-04-04
- **Status**: In progress — all items open

---

## Purpose

This checklist must be completed in full before any production release. Work
through each item with the designated owner, mark it checked, and record the
date and reviewer in the notes column. Categories 1–3 are hard gates: a single
unchecked item in Security, Reliability, or Observability blocks release.
Categories 4–6 are strong recommendations; any exception requires explicit
sign-off from the Engineering Lead.

**How to use this checklist**

1. Open this file at the start of each release milestone.
2. Assign owners to unchecked items.
3. Work items in priority order: Security first, then Reliability, then
   Observability, then Testing, then Deployment, then Documentation.
4. Mark each item `[x]` when verified — not just implemented.
5. Bring outstanding items to the Go/No-Go review meeting
   (`GO_NO_GO_CHECKLIST.md`).

---

## Category 1 — Security

> **HARD GATE — release cannot proceed if any item in this category is unchecked.**

| # | Item | Effort | Owner | Done |
|---|------|--------|-------|------|
| S-01 | R-01: SA secret loaded from env var (`SA_SECRET`); service throws on startup if env var is absent or empty | 1h | eng | [ ] |
| S-02 | R-02: Default org bypass removed from `resolveSession`; cross-tenant access blocked at API layer | 2h | eng | [ ] |
| S-03 | R-03: Redis-backed session revocation via jti blacklist; revoked tokens return 401 | 4h | eng | [ ] |
| S-04 | R-04: Execution token validated on every protected API call; expired/missing exec token returns 401 | 3h | eng | [ ] |
| S-05 | R-05: Audit hash chain uses DB-persisted `lastHash` (not module-level variable); chain survives service restart | 3h | eng | [ ] |
| S-06 | R-06: Rate limiting enforced — 100 req/min per actor globally, 10/min for token creation endpoint | 4h | eng | [ ] |
| S-07 | Secrets (tokens, keys, passwords) are never written to application logs; audit log sanitization verified | 2h | eng | [ ] |
| S-08 | HTTPS enforced in production (HTTP → HTTPS redirect at load balancer or app layer) | 1h | infra | [ ] |
| S-09 | CORS policy configured with an explicit origin allowlist — wildcard (`*`) not permitted in production | 1h | eng | [ ] |
| S-10 | CSP headers configured on the web control plane (`Content-Security-Policy` response header present) | 2h | eng | [ ] |

---

## Category 2 — Reliability

> **HARD GATE — release cannot proceed if any item in this category is unchecked.**

| # | Item | Effort | Owner | Done |
|---|------|--------|-------|------|
| R-01 | PostgreSQL runtime wired: `run-store.ts` reads and writes to DB (not in-memory map) | 8h | eng | [ ] |
| R-02 | Connection pooling configured: pg pool `min=2`, `max=10`; connections reused across requests | 1h | eng | [ ] |
| R-03 | DB migrations run automatically on service startup (via migration runner in entrypoint) | 2h | eng | [ ] |
| R-04 | Graceful shutdown: `SIGTERM` handler drains in-flight requests and closes DB pool before exit | 3h | eng | [ ] |
| R-05 | `GET /health` returns `200 {"status":"healthy"}` and does not gate on DB connectivity | 1h | eng | [ ] |
| R-06 | `GET /ready` gates on both DB and Redis connectivity; returns `503` if either is unreachable | 2h | eng | [ ] |

---

## Category 3 — Observability

> **HARD GATE — release cannot proceed if any item in this category is unchecked.**

| # | Item | Effort | Owner | Done |
|---|------|--------|-------|------|
| O-01 | Structured JSON logging in place (`logger.ts`); all `console.log` / `console.error` calls replaced | 4h | eng | [ ] |
| O-02 | Trace ID (`X-Trace-ID` header) injected on every inbound request and included in all log lines | 2h | eng | [ ] |
| O-03 | `GET /metrics` Prometheus endpoint exposed; request count, latency histograms, error rates present | 6h | eng | [ ] |
| O-04 | Error alerting configured: critical errors (5xx bursts, auth failures) route to alert channel | 3h | infra | [ ] |
| O-05 | Audit log persisted to DB for every material action (run create/cancel/resume, gate approve/reject) | 4h | eng | [ ] |

---

## Category 4 — Testing

| # | Item | Effort | Owner | Done |
|---|------|--------|-------|------|
| T-01 | `packages/auth` test coverage ≥ 90% (measured via `pnpm test --coverage`, not estimated) | 8h | eng | [ ] |
| T-02 | `packages/orchestrator` test coverage ≥ 80% | 12h | eng | [ ] |
| T-03 | Governance gates package test coverage ≥ 80% | 8h | eng | [ ] |
| T-04 | All smoke tests pass on staging environment (`pnpm test:smoke --env=staging`) | 2h | qa | [ ] |
| T-05 | Zero P0/P1 security vulnerabilities open (`npm audit --audit-level=high` returns clean) | varies | security | [ ] |

---

## Category 5 — Deployment

| # | Item | Effort | Owner | Done |
|---|------|--------|-------|------|
| D-01 | Dockerfile exists, builds successfully (`docker build .` passes with no errors) | 4h | eng | [ ] |
| D-02 | `.env.example` documents every required environment variable with description and example value | 1h | eng | [ ] |
| D-03 | DB migrations tested on a completely clean schema (no pre-existing tables) | 1h | eng | [ ] |
| D-04 | Rollback procedure documented (`docs/ROLLBACK.md`) and tested: v1.3.0 → v1.2.0 verified working | 2h | eng | [ ] |
| D-05 | Zero-downtime deploy strategy defined and documented (blue/green or rolling; no forced restarts mid-request) | 4h | infra | [ ] |

---

## Category 6 — Documentation

| # | Item | Effort | Owner | Done |
|---|------|--------|-------|------|
| Doc-01 | OpenAPI 3.1 spec generated and validated against implementation (all routes, request/response schemas present) | 8h | eng | [ ] |
| Doc-02 | `CHANGELOG.md` updated with v1.3.0 entries (new features, bug fixes, breaking changes, security fixes) | 1h | eng | [ ] |
| Doc-03 | `SECURITY.md` current with accurate vulnerability contact information and disclosure timeline | 30m | security | [ ] |

---

## Summary Table

> Update this table manually at each milestone review.

| Category | Total Items | Checked | Remaining | Effort Remaining |
|----------|-------------|---------|-----------|-----------------|
| Security | 10 | 0 | 10 | 20h |
| Reliability | 6 | 0 | 6 | 17h |
| Observability | 5 | 0 | 5 | 19h |
| Testing | 5 | 0 | 5 | 30h |
| Deployment | 5 | 0 | 5 | 12h |
| Documentation | 3 | 0 | 3 | 9.5h |
| **Total** | **34** | **0** | **34** | **107.5h** |

---

## Related Documents

- `docs/06_validation/GO_NO_GO_CHECKLIST.md`
- `docs/06_validation/SECURITY_TESTING_PLAN.md`
- `docs/06_validation/TEST_PLAN_RUN_SCOPING.md`
- `docs/SECURITY_AUDIT.md`
- `docs/RELEASE_CHECKLIST.md`
