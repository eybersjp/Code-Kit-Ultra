# SPEC — Governance Gate Taxonomy

**Status:** Approved
**Version:** 1.0
**Linked to:** `docs/02_architecture/SYSTEM_ARCHITECTURE.md`
**Implements:** Master spec Section 6 — Governance, Gates, and Execution Intelligence
**Unblocks:** T2-1 implementation
**Risk refs:** R-07

---

## Objective

Define and implement the complete 9-gate governance taxonomy from the master specification. These gates enforce compliance checkpoints across the full run lifecycle, distinct from the existing 5 execution-quality signals.

---

## Scope

**In scope:**
- 9 governance gates: clarity, scope, architecture, build, qa, security, cost, deployment, launch
- Gate evaluation logic and pause conditions for each gate
- Integration with mode controller (turbo auto-pass, safe maximum pause)
- Gate status tracking in run state and DB
- UI representation on Gates page

**Out of scope:**
- Existing 5 execution-quality gates (objective-clarity, plan-readiness, etc.) — these are KEPT alongside the new gates
- Gate approval/rejection handlers (covered in `SPEC_GATE_REJECTION.md`)

---

## Gate Definitions

### Governance Gate Type

```typescript
export type GovernanceGateType =
  | "clarity"
  | "scope"
  | "architecture"
  | "build"
  | "qa"
  | "security"
  | "cost"
  | "deployment"
  | "launch";

export type ExecutionQualityGateType =
  | "objective-clarity"
  | "requirements-completeness"
  | "plan-readiness"
  | "skill-coverage"
  | "ambiguity-risk";

export type GateType = GovernanceGateType | ExecutionQualityGateType;
```

### Gate Catalog

| Gate | Phase | Purpose | Default Pause Condition |
|------|-------|---------|------------------------|
| `clarity` | Intake | Block execution when required context is missing | Blocking questions remain unresolved |
| `scope` | Planning | Prevent unapproved work expansion | Plan tasks exceed declared deliverable or project scope |
| `architecture` | Planning | Ensure design coherence before build | No agreed architecture, missing boundaries, incompatible dependencies |
| `build` | Building | Control compilation- and artifact-affecting changes | High-risk file or environment modifications detected |
| `qa` | Testing | Enforce validation before release | Tests absent, verification failed, low confidence score |
| `security` | Building/Deployment | Protect credentials, permissions, and sensitive assets | Secret exposure detected, unsafe command intent, over-broad permissions |
| `cost` | Building/Deployment | Control spend-sensitive operations | Cloud provisioning, paid API activation, high-compute tasks |
| `deployment` | Deployment | Protect production release state | Unverified rollout, missing rollback plan, insufficient approvals |
| `launch` | Launch | Protect customer-facing exposure | Readiness checklist incomplete, unresolved critical defects |

### Pause Conditions by Mode

| Gate | safe | balanced | god |
|------|------|----------|-----|
| clarity | ✅ Pause | ✅ Pause | ❌ Auto-pass |
| scope | ✅ Pause | ✅ Pause | ❌ Auto-pass |
| architecture | ✅ Pause | ✅ Pause | ❌ Auto-pass |
| build | ✅ Pause | ❌ Auto-pass | ❌ Auto-pass |
| qa | ✅ Pause | ✅ Pause | ❌ Auto-pass |
| security | ✅ Pause | ✅ Pause | ✅ Pause |
| cost | ✅ Pause | ✅ Pause | ✅ Pause |
| deployment | ✅ Pause | ✅ Pause | ✅ Pause |
| launch | ✅ Pause | ✅ Pause | ✅ Pause |

---

## Evaluation Logic

```typescript
export interface GovernanceGateEvaluator {
  gate: GovernanceGateType;
  evaluate(run: RunState, scope: ExecutionScope): Promise<GateDecision>;
}

// Clarity gate
export const clarityGate: GovernanceGateEvaluator = {
  gate: "clarity",
  async evaluate(run, scope) {
    const blockingQuestions = run.intake?.clarifyingQuestions?.filter(q => q.blocking) ?? [];
    const unresolved = blockingQuestions.filter(q => !q.resolved);
    if (unresolved.length > 0) {
      return {
        gate: "clarity",
        status: "needs-review",
        shouldPause: true,
        reason: `${unresolved.length} blocking question(s) unresolved`,
      };
    }
    return { gate: "clarity", status: "pass", shouldPause: false, reason: "All blocking questions resolved" };
  },
};

// Scope gate
export const scopeGate: GovernanceGateEvaluator = {
  gate: "scope",
  async evaluate(run, scope) {
    const declaredDeliverable = run.input.deliverable ?? "app";
    const planTasks = run.plan?.tasks ?? [];
    // Check if any tasks exceed the declared deliverable scope
    const outOfScope = planTasks.filter(t =>
      t.phase === "delivery" && !isTaskWithinScope(t, declaredDeliverable)
    );
    if (outOfScope.length > 0) {
      return {
        gate: "scope",
        status: "needs-review",
        shouldPause: true,
        reason: `${outOfScope.length} task(s) may exceed declared scope: ${declaredDeliverable}`,
      };
    }
    return { gate: "scope", status: "pass", shouldPause: false, reason: "All tasks within declared scope" };
  },
};

// Security gate
export const securityGate: GovernanceGateEvaluator = {
  gate: "security",
  async evaluate(run, scope) {
    const highRiskActions = run.executionBatches?.flatMap(b =>
      b.actions.filter(a => a.riskLevel === "high" && a.category === "security")
    ) ?? [];
    if (highRiskActions.length > 0) {
      return {
        gate: "security",
        status: "blocked",
        shouldPause: true,
        reason: `${highRiskActions.length} high-risk security action(s) require explicit authorization`,
      };
    }
    return { gate: "security", status: "pass", shouldPause: false, reason: "No security risks detected" };
  },
};
```

---

## Data Structures

```typescript
export interface GateDecision {
  gate: GateType;
  status: "pass" | "needs-review" | "blocked" | "pending";
  shouldPause: boolean;
  reason: string;
  decidedBy?: string;      // actorId who approved/rejected
  decidedAt?: string;      // ISO timestamp
  decisionNote?: string;   // Optional reviewer note
}

export interface GateEvaluationResult {
  overallStatus: "pass" | "needs-review" | "blocked";
  decisions: GateDecision[];
  governanceDecisions: GateDecision[];    // The 9 spec gates
  qualityDecisions: GateDecision[];       // The 5 existing execution-quality gates
  summary: string;
  shouldPauseRun: boolean;
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `packages/shared/src/types.ts` | Modify | Add `GovernanceGateType`, `ExecutionQualityGateType`, updated `GateType` |
| `packages/orchestrator/src/gate-manager.ts` | Modify | Add 9 governance gate evaluators |
| `packages/orchestrator/src/mode-controller.ts` | Modify | Add governance gate pause rules per mode |
| `apps/web-control-plane/src/pages/Gates.tsx` | Modify | Display all gate types with category headers |
| `apps/control-service/src/handlers/create-run.ts` | Modify | Initialize all 9 governance gate decisions |
| `db/schema.sql` | Modify | Ensure `gate_decisions` table has all gate types |

---

## Dependencies

- `SPEC_API_VERSIONING.md` (routes must be versioned before gates work at `/v1/gates/`)
- `SPEC_GATE_REJECTION.md` (rejection endpoint required for gate governance to be complete)
- `SPEC_POSTGRES_PERSISTENCE.md` (gate decisions must be persisted)

---

## Edge Cases

- **Turbo mode**: security, cost, deployment, launch gates must still pause even in turbo/god mode — these are always-pause gates
- **Manual override**: an approved gate should override its evaluation for the duration of that run
- **Gate already decided**: attempting to approve/reject an already-decided gate returns 409 Conflict
- **Phase ordering**: gates should only be evaluated at their relevant phase, not all upfront

---

## Risks

- **Evaluation complexity**: scope gate requires semantic understanding of "deliverable scope" — initial implementation uses keyword matching; evolve later
- **Mode confusion**: operators may be surprised that god mode still pauses on security/cost/deployment — this is intentional and must be documented in UI

---

## Definition of Done

- [ ] All 9 governance gate types defined in `packages/shared/src/types.ts`
- [ ] All 9 gate evaluators implemented in `gate-manager.ts`
- [ ] Mode-aware pause rules applied correctly (security/cost/deployment pause in all modes)
- [ ] Gate decisions persisted to DB `gate_decisions` table
- [ ] Gates page in web control plane shows governance gates separately from quality gates
- [ ] Audit event emitted for each gate evaluation and each gate decision
- [ ] Tests written for each gate evaluator
- [ ] Logged in `progress-log.md`
- [ ] Validated against `VALIDATION_MASTER.md`
