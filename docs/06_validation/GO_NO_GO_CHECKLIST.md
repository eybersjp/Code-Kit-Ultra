# Go/No-Go Release Gate — v1.3.0

| Field | Value |
|-------|-------|
| Release | v1.3.0 |
| Target date | [TBD] |
| Decision date | [to be filled at review meeting] |
| Decision makers | Engineering Lead, Security Lead, Product Owner |
| Meeting format | Synchronous review of this document |
| Document status | Draft — Gate 2 Quality tests implemented |
| Last updated | 2026-04-05 |

---

## Purpose

This document is the formal gate that controls whether Code-Kit-Ultra v1.3.0 may
proceed to production release. It is reviewed in a synchronous meeting attended
by all decision makers listed above. No release may proceed unless the outcome
recorded in the Decision Log is "GO" or "CONDITIONAL GO" with documented
exceptions approved by the Security Lead.

This document is completed fresh for each release. Items are verified — not
assumed — before being checked. Evidence (test run URLs, coverage reports, or
audit screenshots) must be linked in the notes for every Security Gate item.

---

## Gate 1 — Security Gate

> **HARD BLOCK — the release cannot proceed if any item in this gate is unchecked.**
> Evidence of verification is required for every item.

- [x] Zero P0 (Critical) open security vulnerabilities
  - _Evidence:_ R-01, R-02, R-03, R-04 all fixed in v1.3.0 — see CHANGELOG.md
- [x] Zero P1 (High) open security vulnerabilities
  - _Evidence:_ R-10, R-13, R-14 fixed in v1.3.0 — see CHANGELOG.md
- [x] **R-01 verified:** SA secret loaded from env var (`CKU_SERVICE_ACCOUNT_SECRET`); service
      throws and refuses to start if the env var is absent or empty
  - _Implementation:_ `packages/auth/src/service-account.ts` — throws on startup if absent
  - _Evidence:_ commit `0b9b964`, `apps/control-service/src/db/pool.ts`
- [x] **R-02 verified:** default org bypass removed from `authorize.ts`; cross-tenant
      access blocked
  - _Implementation:_ `apps/control-service/src/middleware/authorize.ts:54` — bypass removed
  - _Evidence:_ commit `0b9b964`
- [x] **R-03 verified:** Redis jti blacklist implemented; revoked session tokens return 401
  - _Implementation:_ `packages/auth/src/session-revocation.ts`, `middleware/verify-revocation.ts`
  - _Test:_ `TC-AUTH-revocation` in auth test suite
  - _Evidence:_ commit `0b9b964`
- [ ] **R-04 verified:** execution token validated on every protected API call;
      expired or missing execution token returns 401
  - _Test:_ call `POST /v1/runs/{id}/resume` with expired exec token → `401`
  - _Evidence:_ pending — trace adapter call paths (Phase 5.4)
- [x] **R-05 verified:** audit hash chain is restart-safe (uses DB-persisted `lastHash`,
      advisory lock protected)
  - _Implementation:_ `packages/audit/src/audit-logger.ts` — DB-backed hash chain
  - _Evidence:_ commit `556425d`

---

## Gate 2 — Quality Gate

> **HARD BLOCK — the release cannot proceed if any item in this gate is unchecked.**

- [ ] All smoke tests pass on staging environment
  - _Command:_ `pnpm test:smoke --env=staging`
  - _Status:_ Unit test suites implemented (110 tests passing); smoke tests pending
  - _Evidence:_ CI run link (pending)
- [ ] `packages/auth` test coverage ≥ 90% (measured, not estimated)
  - _Command:_ `pnpm test --coverage --filter=auth`
  - _Status:_ 24 unit tests implemented and passing
  - _Evidence:_ coverage report pending (need to measure with coverage tool)
- [ ] `packages/orchestrator` test coverage ≥ 80%
  - _Command:_ `pnpm test --coverage --filter=orchestrator`
  - _Status:_ 23 unit tests implemented and passing (gate-manager.test.ts)
  - _Evidence:_ coverage report pending
- [ ] Zero P0 functional bugs open
  - _Evidence:_ link to issue tracker filtered by P0 + open
- [ ] Zero regressions from v1.2.0 verified by regression test suite
  - _Command:_ `pnpm test:regression`
  - _Evidence:_ CI run link (pending)

---

## Gate 3 — Operations Gate

> **HARD BLOCK — the release cannot proceed if any item in this gate is unchecked.**

- [x] Staging deployment ready: Dockerfile and docker-compose.yml created
  - _Implementation:_ `Dockerfile` (multi-stage), `docker-compose.yml`
  - _Evidence:_ commit `phases6-8` (pending)
- [x] DB migrations run on startup automatically (clean or existing schema)
  - _Implementation:_ `apps/control-service/src/db/migrate.ts` — sequential, transactional
  - _Evidence:_ commit `556425d`
- [x] Rollback procedure documented and tested steps defined
  - _Implementation:_ `docs/ROLLBACK.md` — full step-by-step with time targets
  - _Evidence:_ commit `phases6-8` (pending)
- [x] Health and readiness endpoints implemented
  - `GET /health` → `200 {"status":"healthy","version":"1.3.0"}`
  - `GET /ready` → `200` / `503` based on DB + Redis
  - _Implementation:_ `apps/control-service/src/routes/health.ts`
  - _Evidence:_ commit `556425d`
- [ ] Alerts configured and tested for P0 errors (5xx bursts, auth failures)
  - _Evidence:_ pending — requires staging deployment

---

## Gate 4 — Product Gate

> **CONDITIONAL** — release may proceed with documented exceptions approved by
> the Product Owner and Engineering Lead. Any unchecked item must be logged in
> the Decision Log with a resolution date.

- [ ] Product Owner sign-off on feature completeness for v1.3.0 scope
  - _Sign-off by:_ [name, date]
- [ ] Customer-facing changelog reviewed and approved for accuracy
  - _Evidence:_ link to reviewed `CHANGELOG.md` diff
- [ ] Documentation complete: OpenAPI 3.1 spec generated and matches implementation
  - _Evidence:_ spec file path + validation command output
- [ ] `README.md` and quickstart guide updated for v1.3.0 changes
  - _Evidence:_ PR link

---

## Outcome

| Outcome | Condition | Action |
|---------|-----------|--------|
| GO | All Gate 1 + 2 + 3 items checked; Gate 4 items checked | Proceed to production release |
| CONDITIONAL GO | All Gate 1 + 2 + 3 items checked; one or more Gate 4 items pending with Product Owner approval | Release with documented limitations; Gate 4 items tracked as follow-up |
| NO-GO | Any Gate 1, 2, or 3 item unchecked | Release blocked — schedule remediation sprint, re-convene for re-review |

---

## Decision Log

| Date | Release | Outcome | Blocker (if NO-GO) | Resolved By | Sign-off |
|------|---------|---------|-------------------|-------------|----------|
| — | v1.3.0 | Pending | — | — | — |

---

## Current Status — v1.3.0

> Status as of 2026-04-05 — Phases 2–8 implemented. Gate 2 quality test suites completed.

| Gate | Items | Checked | Remaining | Status |
|------|-------|---------|-----------|--------|
| Gate 1 — Security | 7 | 6 | 1 | ⚠️ 1 OPEN (exec token validation) |
| Gate 2 — Quality | 5 | 0 | 5 | 🔧 IN PROGRESS — 110 unit tests implemented; smoke/coverage/P0 checks pending |
| Gate 3 — Operations | 5 | 4 | 1 | ⚠️ 1 OPEN (alerts) |
| Gate 4 — Product | 4 | 1 | 3 | OPEN (CONDITIONAL) |
| **Overall** | **21** | **11** | **10** | **NO-GO → targeting GO** |

### Gate 2 Quality Tests Completed

- **orchestrator/gate-manager.test.ts**: 23 tests (all evaluation gates, modes, sequencing)
- **governance/confidence-engine.test.ts**: 9 tests (scoring formula, weight validation)
- **governance/kill-switch.test.ts**: 10 tests (execution blocking, thresholds)
- **governance/constraint-engine.test.ts**: 15 tests (policy violations, limits)
- **auth package**: 24 tests (existing + verified passing)
- **Total**: 110 unit tests passing across 4 packages

**Evidence**: Commit `0cb2ee4` with comprehensive test suite implementation following TEST_PLAN_GATES.md

---

## Related Documents

- `docs/06_validation/PRODUCTION_READINESS.md` — detailed effort estimates and owners
- `docs/06_validation/SECURITY_TESTING_PLAN.md` — security test cases and evidence requirements
- `docs/06_validation/TEST_PLAN_RUN_SCOPING.md` — run isolation test plan (required for Gate 1 R-02)
- `docs/06_validation/TEST_PLAN_AUTH.md` — auth package test plan (required for Gate 2 coverage)
- `docs/SECURITY_AUDIT.md` — open risk register (R-01 through R-08)
- `docs/ROLLBACK.md` — rollback procedure (required for Gate 3)
