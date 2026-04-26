# Recommended Action Plan — Code Kit Ultra

**Date**: 2026-04-25  
**Based on**: `docs/CURRENT_STATE_REVIEW_2026-04-25.md`

## Objective

Restore branch-level engineering health so the repository state matches release-readiness claims.

Success means:
- `npm run typecheck` passes with zero errors.
- `npm run test:auth` stays green.
- `npm run test:governance` stays green.
- `npm run test:smoke` executes in CI and local dev without native module startup failure.

---

## Phase 0 (Day 0): Stabilize the baseline

### Actions
1. Create a temporary **stabilization branch** from current `work`.
2. Freeze new feature merges until TypeScript and smoke boot are green.
3. Add a visible “stabilization in progress” note to team channel and board.

### Deliverable
- Team-wide alignment that branch health fixes are top priority.

---

## Phase 1 (Day 0–1): Unblock smoke-test runtime environment

### Actions
1. Reinstall dependencies cleanly and rebuild native modules:
   - `rm -rf node_modules`
   - `npm ci`
   - `npm rebuild bcrypt`
2. Verify whether `bcrypt` binary availability issue reproduces in CI and in fresh local container.
3. If instability persists, evaluate fallback approach (`bcryptjs`) for test/dev profile only (behind explicit env guard).

### Exit Criteria
- `npm run test:smoke` boots and begins running tests in a clean environment.

### Owner
- Platform / DevEx.

---

## Phase 2 (Day 1–3): Resolve TypeScript contract drift

### Workstream A — `apps/control-service`
Address the largest cluster first:
- Permission enum mismatches (`automation:view`, `automation:manage`, etc.).
- Audit event type mismatches (missing event names and builder methods).
- Handler parameter nullability (`string | undefined` into `string`).

### Workstream B — `packages/governance`
- Update test fixtures for evolved types (`summary` fields, action union names).
- Align kill-switch / constraint-engine result shapes with current contracts.

### Workstream C — `packages/orchestrator`
- Update tests to current action schema (remove stale properties such as `parallel`, `agentGroup` if deprecated).
- Align ClarifyingQuestion/Assumption fixtures with current type definitions.

### Exit Criteria
- `npm run typecheck` passes with zero errors.

### Owner
- Service + Governance + Orchestrator maintainers (parallelized).

---

## Phase 3 (Day 3–4): Re-establish quality gates in CI

### Actions
1. Make these checks required for merge:
   - `npm run typecheck`
   - `npm run test:auth`
   - `npm run test:governance`
   - `npm run test:smoke`
2. Add a fast preflight job that fails early on dependency/native module issues.
3. Capture artifacts for failed smoke runs (native module diagnostics).

### Exit Criteria
- Branch protection rules enforce health checks.

---

## Phase 4 (Day 4–5): Documentation and status reconciliation

### Actions
1. Update release/status docs to include a dated branch-health snapshot.
2. Add “last verified by command run” timestamps and links to CI workflow runs.
3. Keep release claims scoped to the exact branch/commit tested.

### Exit Criteria
- No document claims “fully working” without matching green checks.

---

## Risk Register (short)

1. **Risk**: Native module behavior differs by container/runner image.  
   **Mitigation**: Pin Node image and run dependency rebuild as part of CI prep.

2. **Risk**: Contract fixes in one package break another package’s tests.  
   **Mitigation**: Parallel fixes plus frequent integration rebases.

3. **Risk**: Feature pressure interrupts stabilization window.  
   **Mitigation**: Time-box freeze and require EM approval for exceptions.

---

## Tracking Checklist

- [ ] Smoke runtime reproducible in clean env
- [ ] TypeScript errors reduced to zero
- [ ] Auth tests still green
- [ ] Governance tests still green
- [ ] Smoke tests green
- [ ] CI branch protections updated
- [ ] Status docs reconciled with real branch health

---

## Suggested command sequence for daily verification

```bash
npm ci
npm rebuild bcrypt
npm run typecheck
npm run test:auth
npm run test:governance
npm run test:smoke
```

If any command fails, treat the branch as non-release-ready until corrected.
