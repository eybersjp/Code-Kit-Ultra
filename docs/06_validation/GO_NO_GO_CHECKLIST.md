# Go/No-Go Release Gate — v1.3.0

| Field | Value |
|-------|-------|
| Release | v1.3.0 |
| Target date | [TBD] |
| Decision date | [to be filled at review meeting] |
| Decision makers | Engineering Lead, Security Lead, Product Owner |
| Meeting format | Synchronous review of this document |
| Document status | Draft — all gates open |
| Last updated | 2026-04-04 |

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

- [ ] Zero P0 (Critical) open security vulnerabilities
  - _Evidence:_ link to security scan results
- [ ] Zero P1 (High) open security vulnerabilities
  - _Evidence:_ link to security scan results
- [ ] **R-01 verified:** SA secret loaded from env var (`SA_SECRET`); service startup
      throws and refuses to start if the env var is absent or empty
  - _Test:_ start service without `SA_SECRET` set → must exit with non-zero code and
    log `FATAL: SA_SECRET is required`
  - _Evidence:_ CI run link
- [ ] **R-02 verified:** default org bypass removed from `resolveSession`; cross-tenant
      access blocked at API layer
  - _Test:_ `POST /v1/runs` with `orgId="default"` → `400 INVALID_ORG_ID`
  - _Evidence:_ passing test case in `TEST_PLAN_RUN_SCOPING.md §4.5`
- [ ] **R-03 verified:** Redis jti blacklist implemented; revoked session tokens return 401
  - _Test:_ issue token, revoke it via logout endpoint, reuse token → `401 TOKEN_REVOKED`
  - _Evidence:_ passing security test `auth/revocation.test.ts`
- [ ] **R-04 verified:** execution token validated on every protected API call;
      expired or missing execution token returns 401
  - _Test:_ call `POST /v1/runs/{id}/resume` with expired exec token → `401`
  - _Evidence:_ passing security test `exec-token-validation.test.ts`
- [ ] **R-05 verified:** audit hash chain is restart-safe (uses DB-persisted `lastHash`,
      not module-level variable); chain integrity survives service restart
  - _Test:_ append 50 events, restart service, append 10 more, run chain verifier → no
    mismatch
  - _Evidence:_ passing test in `SECURITY_TESTING_PLAN.md §3 Audit Integrity`

---

## Gate 2 — Quality Gate

> **HARD BLOCK — the release cannot proceed if any item in this gate is unchecked.**

- [ ] All smoke tests pass on staging environment
  - _Command:_ `pnpm test:smoke --env=staging`
  - _Evidence:_ CI run link
- [ ] `packages/auth` test coverage ≥ 90% (measured, not estimated)
  - _Command:_ `pnpm test --coverage --filter=auth`
  - _Evidence:_ coverage report screenshot or artifact link
- [ ] `packages/orchestrator` test coverage ≥ 80%
  - _Command:_ `pnpm test --coverage --filter=orchestrator`
  - _Evidence:_ coverage report
- [ ] Zero P0 functional bugs open
  - _Evidence:_ link to issue tracker filtered by P0 + open
- [ ] Zero regressions from v1.2.0 verified by regression test suite
  - _Command:_ `pnpm test:regression`
  - _Evidence:_ CI run link

---

## Gate 3 — Operations Gate

> **HARD BLOCK — the release cannot proceed if any item in this gate is unchecked.**

- [ ] Staging deployment successful: Dockerfile built and service started without errors
  - _Evidence:_ deployment log link
- [ ] DB migrations ran cleanly on staging against a clean schema (no pre-existing tables)
  - _Evidence:_ migration runner output in deployment log
- [ ] Rollback tested: deployed v1.3.0 on staging, rolled back to v1.2.0, verified core
      functionality remained intact
  - _Evidence:_ rollback test log link
- [ ] Health and readiness endpoints functional on staging
  - `GET /health` → `200 {"status":"healthy"}`
  - `GET /ready` → `200` when DB and Redis are reachable; `503` when either is down
  - _Evidence:_ curl output
- [ ] Alerts configured and tested for P0 errors (5xx bursts, auth failures)
  - _Evidence:_ alert rule screenshot + test notification confirmation

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

> Status as of 2026-04-04. All gates open; work in progress.

| Gate | Items | Checked | Remaining | Status |
|------|-------|---------|-----------|--------|
| Gate 1 — Security | 7 | 0 | 7 | OPEN (HARD BLOCK) |
| Gate 2 — Quality | 5 | 0 | 5 | OPEN (HARD BLOCK) |
| Gate 3 — Operations | 5 | 0 | 5 | OPEN (HARD BLOCK) |
| Gate 4 — Product | 4 | 0 | 4 | OPEN (CONDITIONAL) |
| **Overall** | **21** | **0** | **21** | **NO-GO** |

---

## Related Documents

- `docs/06_validation/PRODUCTION_READINESS.md` — detailed effort estimates and owners
- `docs/06_validation/SECURITY_TESTING_PLAN.md` — security test cases and evidence requirements
- `docs/06_validation/TEST_PLAN_RUN_SCOPING.md` — run isolation test plan (required for Gate 1 R-02)
- `docs/06_validation/TEST_PLAN_AUTH.md` — auth package test plan (required for Gate 2 coverage)
- `docs/SECURITY_AUDIT.md` — open risk register (R-01 through R-08)
- `docs/ROLLBACK.md` — rollback procedure (required for Gate 3)
