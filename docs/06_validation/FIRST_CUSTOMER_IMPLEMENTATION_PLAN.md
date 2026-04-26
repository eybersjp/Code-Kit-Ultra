# First Customer Implementation Plan (Execution Board)

- **Plan date**: 2026-04-25
- **Goal**: Move from branch stabilization to first-customer production readiness.
- **Owner**: Engineering Lead (with Security Lead + Product Owner sign-off)

---

## Exit Criteria (Launch Ready)

All of the following must be true before onboarding customer #1:

1. Security audit has **0 open P0/P1** risks with evidence links.
2. Hard gates (Security, Reliability, Observability) are checked with verification artifacts.
3. CI required checks are green and merge-protected:
   - `typecheck`
   - `test:auth`
   - `test:governance`
   - `test:smoke`
4. Product gate items are complete (PO sign-off, changelog review, OpenAPI validated, README/quickstart updated).
5. Pilot runbook and rollback drill are completed.

---

## Phase 0 — Governance Baseline (Day 0-1)

| Task | Owner | Deliverable | Verification |
|---|---|---|---|
| Pick canonical release gate doc | Eng Lead | One source of truth (`GO_NO_GO_CHECKLIST.md`) | Decision noted in PR + release notes |
| Reconcile contradictory status docs | Eng Lead | Synchronized status across readiness docs | Diff review in release PR |
| Enforce evidence-per-gate-item rule | Eng Lead | Gate template with evidence links required | 100% gate items include links |

---

## Phase 1 — Security Hard Blockers (Day 1-4)

| Task | Owner | Deliverable | Verification |
|---|---|---|---|
| Close all P0 risks | Security + Eng | Code + tests + audit updates | Security audit P0 count is zero |
| Close all P1 risks | Security + Eng | Code + tests + audit updates | Security audit P1 count is zero |
| Security sign-off | Security Lead | Signed review entry | Gate 1 marked complete with evidence |

---

## Phase 2 — Type Integrity Restoration (Day 2-6)

| Task | Owner | Deliverable | Verification |
|---|---|---|---|
| Remove temporary `@ts-nocheck` from runtime-critical files | Service team | Strict-typed handlers/services | `npm run typecheck` green with reduced/no `@ts-nocheck` |
| Replace temporary casts with contract-level fixes | Service + Packages teams | Stable shared types | Review + passing tests |
| Lock merge quality bar | Eng Lead | Required check policy | Branch protection enabled |

---

## Phase 3 — Reliability + Observability (Day 4-8)

| Task | Owner | Deliverable | Verification |
|---|---|---|---|
| Validate DB durability and restart behavior | Platform | Persistence proof | Restart test retains runs/gates/audit |
| Validate readiness/health behavior under dependency failure | Platform | Failure-mode evidence | `/health` and `/ready` checks in healthy/degraded modes |
| Validate metrics and alerting flow | Platform + Infra | Alert evidence + dashboard links | Alert test run and screenshots |

---

## Phase 4 — CI Determinism + Product Gate (Day 6-10)

| Task | Owner | Deliverable | Verification |
|---|---|---|---|
| Ensure deterministic smoke behavior across runners | Platform | Stable smoke outcomes | 3 consecutive green CI runs |
| Complete Gate 4 product items | Product + Eng | Sign-offs + docs updates | Gate 4 fully checked with evidence |
| Publish launch decision | Eng + Product + Security | GO / CONDITIONAL GO / NO-GO record | Decision log entry complete |

---

## Daily Verification Commands

```bash
npm run typecheck
npm run test:auth
npm run test:governance
npm run test:smoke
npm audit --audit-level=high
```

If any command fails, the branch is not launch-ready.

