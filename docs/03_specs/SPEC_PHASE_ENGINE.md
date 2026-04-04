# SPEC — Phase Engine
**Status:** Draft
**Version:** 1.0
**Linked to:** packages/orchestrator/src/phase-engine.ts
**Implements:** Sequential phase execution pipeline, per-phase contracts, runOrchestrationStep function, and mode-influenced behavior

---

## Objective

Define the complete behavioral contract for the Phase Engine — the component that orchestrates a run through eight sequential phases from idea intake to deployment. This spec covers the function signature and return semantics of `runOrchestrationStep`, the interface every phase handler must satisfy, how mode policy shapes each phase, how progress is checkpointed for resume, and which audit events are emitted at each phase boundary.

---

## Scope

- 8-phase sequence definition and ordering
- `PhaseHandler` interface contract
- `runOrchestrationStep` function specification
- Per-phase: inputs, outputs, preconditions, postconditions
- Gating phase: 5-gate sequential evaluation and short-circuit logic
- Building phase: full execution delegation to execution engine
- Mode influence table per phase
- Checkpointing and resume behavior
- Audit events emitted per phase transition

Out of scope: individual gate logic (see `SPEC_RUN_LIFECYCLE.md`), adapter implementation, and post-deployment observability.

---

## Inputs / Outputs

| Direction | Item | Type | Description |
|-----------|------|------|-------------|
| Input | `RunReport` | `RunReport` | Full report snapshot at the start of each step |
| Output | `RunReport & { isFinished: boolean }` | Extended report | Updated report with new phase, status, and finished flag |

---

## Data Structures

```typescript
// Defined in packages/orchestrator/src/phase-engine.ts

export interface PhaseContext {
  idea: string;         // normalized idea text from report.input.idea
  mode: Mode;           // execution mode from report.input.mode
  approvedGates: string[]; // list of gate IDs manually approved
  report: Partial<RunReport>; // full report snapshot passed into the step
}

export type PhaseHandler = (context: PhaseContext) => Promise<{
  nextPhase: Phase | null;    // null signals the pipeline is finished
  updates: Partial<RunReport>; // fields to merge into RunReport
  status: "success" | "blocked" | "awaiting-approval";
}>;

// Phase sequence order (PHASE_HANDLERS keys, evaluated left to right)
type Phase = "intake" | "planning" | "skills" | "gating" | "building"
           | "testing" | "reviewing" | "deployment";
```

---

## Interfaces / APIs

### `runOrchestrationStep`

```typescript
export async function runOrchestrationStep(
  report: RunReport
): Promise<RunReport & { isFinished: boolean }>
```

**Behavior:**
1. Look up the handler for `report.currentPhase` in `PHASE_HANDLERS`.
2. Build a `PhaseContext` from the report (idea, mode, approvedGates, report).
3. Invoke the handler and await the result.
4. Merge `result.updates` onto `report` and set `updatedAt = now()`.
5. Apply status and phase advancement logic:
   - `result.status === "success"` + `nextPhase != null` → advance `currentPhase`, push completed phase into `completedPhases`, set `status = "in-progress"`, `isFinished = false`
   - `result.status === "success"` + `nextPhase === null` → set `status = "success"`, `isFinished = true`
   - `result.status === "blocked"` → set `status = "blocked"`, `isFinished = false`
   - `result.status === "awaiting-approval"` → set `status = "awaiting-approval"`, `isFinished = false`
6. Return the merged report with `isFinished` attached.

**Error handling:** If `PHASE_HANDLERS[report.currentPhase]` is undefined, throws `Error("Unknown phase: {phase}")`. Individual phase handlers may throw; errors propagate to the caller (`runVerticalSlice`).

---

## Phase Sequence Definition

```
intake → planning → skills → gating → building → testing → reviewing → deployment
```

Phases are strictly sequential. No phase can be skipped by the engine itself (only mode policy can reduce their work). Each phase reads exclusively from `PhaseContext` and writes exclusively to `Partial<RunReport>` via its `updates` return value.

---

## Per-Phase Contracts

### Phase 1: intake

| | Detail |
|---|---|
| **Preconditions** | `context.idea` must be a non-empty string |
| **Inputs consumed** | `context.idea`, `context.mode` |
| **Operations** | `runIntake({ idea, mode })` → calls `normalizeIdeaText`, `inferSolutionCategory`, `deriveAssumptions`, `generateClarifyingQuestions`, `trimQuestionsByMode` |
| **Outputs** | `updates.intakeResult`, `updates.assumptions`, `updates.clarifyingQuestions` |
| **Next phase** | `"planning"` |
| **Postconditions** | `report.intakeResult` is populated; `report.clarifyingQuestions` is trimmed to mode limit |
| **Can block?** | No — always returns `status: "success"` |

### Phase 2: planning

| | Detail |
|---|---|
| **Preconditions** | `context.report.intakeResult` must exist; throws otherwise |
| **Inputs consumed** | `context.report.intakeResult` |
| **Operations** | `buildPlanFromClarification(intakeResult)` → produces task list |
| **Outputs** | `updates.plan` |
| **Next phase** | `"skills"` |
| **Postconditions** | `report.plan` is a non-empty `Task[]` |
| **Can block?** | No |

### Phase 3: skills

| | Detail |
|---|---|
| **Preconditions** | `context.report.intakeResult` and `context.report.plan` must exist; throws otherwise |
| **Inputs consumed** | `context.report.intakeResult`, `context.report.plan` |
| **Operations** | `selectSkills({ clarification, plan })` from skill-engine |
| **Outputs** | `updates.selectedSkills` |
| **Next phase** | `"gating"` |
| **Postconditions** | `report.selectedSkills` is a `SelectedSkill[]` |
| **Can block?** | No |

### Phase 4: gating

| | Detail |
|---|---|
| **Preconditions** | `intakeResult`, `plan`, `selectedSkills` must all be populated |
| **Inputs consumed** | All three artifacts plus `context.mode`, `context.approvedGates` |
| **Operations** | `evaluateGates(...)` → evaluates 5 gates sequentially |
| **Outputs** | `updates.gates`, `updates.overallGateStatus`, `updates.status` |
| **Next phase** | `"building"` if `overallStatus === "pass"`; stays `"gating"` otherwise |
| **Postconditions** | `report.gates` contains 5 `GateDecision` entries; `overallGateStatus` is one of `pass \| needs-review \| blocked` |
| **Can block?** | Yes — `blocked` propagates as handler `status: "blocked"` |
| **Can pause?** | Yes — `needs-review` propagates as `status: "awaiting-approval"`, emits `gate.awaiting_approval` |

### Phase 5: building

| | Detail |
|---|---|
| **Preconditions** | `context.report.id` or auto-generated runId; `context.report.input` required to initialize a new bundle |
| **Inputs consumed** | Existing `RunBundle` from `loadRunBundle(runId)` or initialized from context |
| **Operations** | `emitExecutionStarted` → `executeRunBundle(bundle)` → emit completion/failure/pause event |
| **Outputs** | `updates.id`, `updates.summary`, `updates.status` |
| **Next phase** | `"testing"` if `isCompleted`; stays `"building"` if paused or failed |
| **Postconditions** | `bundle.state.status` reflects actual execution outcome; `RunBundle` persisted to run-store |
| **Can block?** | No — delegates failure to execution engine |
| **Can pause?** | Yes — when `bundle.state.status === "paused"`, returns `awaiting-approval` |

### Phase 6: testing

| | Detail |
|---|---|
| **Preconditions** | Building phase must have completed |
| **Operations** | Simulated — returns immediately with placeholder summary |
| **Outputs** | `updates.summary = "Testing phase completed (SIMULATED)."` |
| **Next phase** | `"reviewing"` |
| **Can block?** | No |

### Phase 7: reviewing

| | Detail |
|---|---|
| **Operations** | Simulated — returns immediately with placeholder summary |
| **Next phase** | `"deployment"` |
| **Can block?** | No |

### Phase 8: deployment

| | Detail |
|---|---|
| **Operations** | Simulated — returns immediately with success summary |
| **Outputs** | `updates.status = "success"`, `updates.summary = "Deployment completed (SIMULATED). Pipeline finished."` |
| **Next phase** | `null` — signals `isFinished = true` to `runOrchestrationStep` |
| **Can block?** | No |

---

## Phase Transition Rules

A phase advances to its `nextPhase` if and only if its handler returns `status: "success"`. The following conditions gate advancement:

- **Blocked:** The handler returned `status: "blocked"`. `currentPhase` does not change. `runOrchestrationStep` returns with `status: "blocked"` and `isFinished: false`. The caller must resolve the block before re-invoking.
- **Awaiting approval:** The handler returned `status: "awaiting-approval"`. `currentPhase` does not change. The run persists in its current phase until a resume call grants approval.
- **Finished:** `nextPhase === null` and `status: "success"`. `isFinished = true`; `runReport.status = "success"`.

---

## Gating Phase: 5-Gate Sequential Evaluation

`evaluateGates` in `gate-manager.ts` runs the following 5 evaluators in order. Short-circuit semantics apply at the `getOverallGateStatus` aggregation level, not at individual gate evaluation — all 5 gates always evaluate, but the first `blocked` result wins overall.

| # | Gate ID | Evaluator | Block Condition | Review Condition |
|---|---------|-----------|-----------------|-----------------|
| 1 | `objective-clarity` | `evaluateObjectiveClarityGate` | No normalized idea | Category is `"unknown"` or `"unclear"` |
| 2 | `requirements-completeness` | `evaluateRequirementsCompletenessGate` | Questions ≥ `maxQuestionsBeforeBlock` | Questions ≥ `maxQuestionsBeforeReview` |
| 3 | `plan-readiness` | `evaluatePlanReadinessGate` | Zero tasks in plan | Tasks < `minimumPlanTasks` or no dependencies |
| 4 | `skill-coverage` | `evaluateSkillCoverageGate` | Zero skills selected | Skills < `minimumSelectedSkills` or no specialist skills |
| 5 | `ambiguity-risk` | `evaluateAmbiguityRiskGate` | Questions ≥ `ambiguityBlockThreshold` | Assumptions > 6 or questions ≥ `ambiguityReviewThreshold` |

**Turbo mode override:** After all 5 decisions are computed, any gate with `status === "needs-review"` is rewritten to `status === "pass"` with reason suffix `"(AUTO-PASSED VIA TURBO)"` and `shouldPause = false`.

**Manual approval override:** Any gate whose `gate` ID appears in `context.approvedGates` is rewritten to `status === "pass"` with reason suffix `"(MANUALLY APPROVED)"` and `shouldPause = false`. This override is applied before the turbo override.

---

## Building Phase: Execution Delegation

When the building phase handler runs:

1. **Load or initialize `RunBundle`:** `loadRunBundle(runId)` is attempted. On miss, a new bundle is constructed from context (intake artifact, plan artifact, run state initialized to `status: "planned"`, `currentStepIndex: 0`).
2. **Persist artifacts:** `updateIntake`, `updatePlan`, `updateRunState` are called before execution begins.
3. **Emit start event:** `emitExecutionStarted(bundle.state)` fires `execution.started` event (requires `orgId` + `workspaceId`).
4. **Delegate to execution engine:** `executeRunBundle(bundle)` runs the full 6-step per-task pipeline (see `SPEC_EXECUTION_ENGINE.md`).
5. **Emit outcome event:** Based on returned bundle state: `emitExecutionCompleted`, `emitExecutionFailed`, or `emitGateAwaitingApproval`.
6. **Return phase result:** Status maps as — completed → `"success"` + nextPhase `"testing"`; paused → `"awaiting-approval"` + nextPhase `"building"`; failed → handler `status: "failure"` (treated as non-success by engine) + nextPhase `"building"`.

---

## Mode Influence Per Phase

| Phase | turbo | builder | pro | expert | safe | balanced | god |
|-------|-------|---------|-----|--------|------|----------|-----|
| intake | max 2 questions | max 5 | max 8 | max 15 | max 20 | max 10 | max 0 |
| planning | no change | no change | no change | no change | no change | no change | no change |
| skills | min 1 skill required | min 2 | min 2 | min 3 | min 3 | min 2 | min 0 |
| gating | needs-review auto-passed | standard | stricter thresholds | strictest thresholds | most strict | moderate | all gates effectively bypassed |
| building | medium-risk no approval | medium+high require approval | dry-run default | dry-run default | no commands allowed | dry-run + approval | no approval required for any risk |
| testing/reviewing/deployment | simulated | simulated | simulated | simulated | simulated | simulated | simulated |

---

## Audit Events Per Phase

| Phase | Audit Action | Source |
|-------|-------------|--------|
| gating (needs-review) | `gate.awaiting_approval` via `emitGateAwaitingApproval` | phase-engine.ts gating handler |
| building (start) | `execution.started` via `emitExecutionStarted` | phase-engine.ts building handler |
| building (complete) | `execution.completed` via `emitExecutionCompleted` | phase-engine.ts building handler |
| building (failed) | `execution.failed` via `emitExecutionFailed` | phase-engine.ts building handler |
| building (paused) | `gate.awaiting_approval` via `emitGateAwaitingApproval` | phase-engine.ts building handler |

Per-step audit events (`TASK_EXECUTION_ATTEMPT`, `STEP_EXECUTION_STARTED`, `STEP_EXECUTION_SUCCEEDED`, `STEP_EXECUTION_FAILED`, etc.) are emitted by `execution-engine.ts` via `writeAuditEvent`, not the phase engine.

---

## Checkpointing

Partial progress is preserved for resume through the following mechanism:

1. **Per-task checkpoint:** After each successful `executeTask`, `bundle.state.currentStepIndex` is incremented and `updateRunState` is called immediately.
2. **On pause:** `markState(bundle, "paused", { currentStepIndex: index, ... })` persists the exact index of the paused task.
3. **On resume:** `resumeRun(runId, approve=true)` calls `loadRunBundle(runId)` to reload state from the store, then calls `executeRunBundle(bundle)` which starts the loop at `bundle.state.currentStepIndex` — the exact step that was paused.
4. **`runVerticalSlice` continuation:** Supports `input.currentRun` parameter to inject an existing `RunReport` (carrying `completedPhases`, `currentPhase`, etc.) for phase-level resume without re-running completed phases.

---

## Dependencies

| Dependency | Package | Purpose |
|-----------|---------|---------|
| `intake.ts` | `packages/orchestrator` | Phase 1 operations |
| `planner.ts` | `packages/orchestrator` | Phase 2 operations |
| `skill-engine` | `packages/skill-engine` | Phase 3 skill selection |
| `gate-manager.ts` | `packages/orchestrator` | Phase 4 gate evaluation |
| `execution-engine.ts` | `packages/orchestrator` | Phase 5 task execution |
| `events.ts` | `packages/orchestrator` | Orchestrator-scoped event emission |
| `run-store` | `packages/memory` | Bundle persistence and retrieval |
| `mode-controller.ts` | `packages/orchestrator` | Policy per mode for question trimming |

---

## Edge Cases

- **Unknown phase value:** `PHASE_HANDLERS[report.currentPhase]` returns `undefined`; `runOrchestrationStep` throws immediately before any state mutation.
- **Missing `intakeResult` at planning phase:** Handler throws `"Intake result missing"` — this indicates an out-of-sequence call; caller must ensure phases run in order.
- **Building phase with no `context.report.input`:** Throws `"Cannot initialize RunBundle: ctx.report.input is undefined."` — only safe when bundle already exists in the store.
- **`runVerticalSlice` in expert mode:** Executes exactly one phase and returns, regardless of `isFinished`. The caller must call `runVerticalSlice` again with the returned report as `input.currentRun` to advance.
- **Re-entering gating after manual approval:** If `POST /v1/gates/{id}/approve` adds a gate to `approvedGates`, the caller must re-invoke the run from the gating phase with the updated `approvedGates` list; the phase engine does not automatically re-evaluate.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Phase state divergence if handler throws mid-update | Medium | High | Ensure all `updates` are built before any async operation; wrap handler calls in try/catch at `runOrchestrationStep` level |
| Testing/reviewing/deployment phases returning success without real work | High | Medium | These phases are explicitly marked `(SIMULATED)` — replace with real implementations before production readiness |
| `buildInitialPlan` in building phase diverging from `buildPlanFromClarification` used in planning | Medium | High | Planning phase result must be propagated into building phase via `RunBundle.plan`; avoid re-planning from raw input |

---

## Definition of Done

- [ ] All 8 phases have unit tests asserting correct `nextPhase` and `updates` shape
- [ ] `runOrchestrationStep` tested with each possible handler return status: success/blocked/awaiting-approval
- [ ] Gating phase tests cover all 5 gates individually and in combination (block + needs-review)
- [ ] Turbo auto-pass override tested against a `needs-review` gate result
- [ ] Manual approval override tested against a gate that would otherwise block
- [ ] Building phase tested for completed, paused, and failed execution engine outcomes
- [ ] Checkpointing test: pause at step N, resume, verify execution continues at step N not step 0
- [ ] Expert mode single-step test: `runVerticalSlice` returns after first phase with `isFinished: false`
- [ ] `runVerticalSlice` with `currentRun` input correctly skips already-completed phases
- [ ] Unknown phase throws typed error — confirmed not a silent no-op
