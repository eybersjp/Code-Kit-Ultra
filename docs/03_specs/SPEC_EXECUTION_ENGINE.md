# SPEC — Execution Engine
**Status:** Draft
**Version:** 1.0
**Linked to:** packages/orchestrator/src/execution-engine.ts
**Implements:** executeRunBundle pipeline, per-task execution contract, retry policy, healing integration, rollback, and manual retry/rollback operations

---

## Objective

Define the complete behavioral contract for the Execution Engine — the component responsible for running a `RunBundle` through a sequential task pipeline. This spec covers the 6-stage per-task pipeline (within `executeTask`), the outer bundle loop (within `executeRunBundle`), retry semantics, adapter selection, risk simulation, approval gating, outcome capture, healing integration, rollback mechanics, and the manual `retryTask` and `rollbackTask` operations.

---

## Scope

- `executeRunBundle` function: bundle-level orchestration loop
- `executeTask` function: per-task 6-stage pipeline
- Retry policy: configurable attempts, healing extension
- Adapter selection: `createProviderAdapters` + `findAdapter`
- Simulation and risk assessment per task
- Approval gating within task execution
- Learning optimizer: `optimizeTasks` applied before the task loop
- Outcome capture after bundle completion or failure
- Healing integration: `healFailedStep` invocation and result handling
- Automatic rollback via `adapter.rollback`
- `retryTask`: manual single-step retry
- `rollbackTask`: manual single-step rollback
- Audit events and step log entries emitted at each stage

Out of scope: phase engine coordination, gate evaluation, and post-deployment observability.

---

## Inputs / Outputs

| Direction | Item | Type | Description |
|-----------|------|------|-------------|
| Input | `bundle` | `RunBundle` | Complete run bundle including plan, state, and existing logs |
| Input | `actor` | `string` | Identity string for audit records (default: `"system"`) |
| Output | `RunBundle` | `RunBundle` | Mutated bundle with updated `state`, `executionLog`, `adapters`, and `auditLog` |

---

## Data Structures

```typescript
// packages/shared/src/types.ts

interface RunBundle {
  state: RunState;              // mutable run state
  plan: PlanArtifact;          // tasks to execute
  intake: IntakeArtifact;
  adapters: AdapterLog;        // per-task adapter execution summaries
  executionLog: ExecutionLog;  // ordered step execution log
  auditLog: AuditLog;          // append-only audit entries
  gates: GateDecision[];
  reportMarkdown: string;
}

interface PlanTask {
  id: string;
  title: string;
  adapterId: string;
  payload: Record<string, unknown>;
  rollbackPayload?: Record<string, unknown>;
  requiresApproval?: boolean;
  retryPolicy?: { maxAttempts: number };
  dependencies?: string[];
}

interface StepExecutionLog {
  stepId: string;
  title: string;
  adapter: string;
  attempt: number;
  status: StepStatus;    // "pending" | "running" | "success" | "failed" | "paused" | "rolled-back"
  startedAt: string;
  finishedAt?: string;
  output?: string;
  error?: string;
  rollbackAvailable: boolean;
  risk?: ExecutionRisk;           // "low" | "medium" | "high"
  simulationSummary?: string;
  verificationStatus?: "passed" | "failed";
  verificationSummary?: string;
  fixSuggestion?: string;
}

interface AdapterExecutionSummary {
  taskId: string;
  adapter: string;
  status: "success" | "failed" | "rolled-back";
  attempts: number;
  output: string;
}
```

---

## Interfaces / APIs

### `executeRunBundle`

```typescript
export async function executeRunBundle(
  bundle: RunBundle,
  actor: string = "system"
): Promise<RunBundle>
```

### `retryTask`

```typescript
export async function retryTask(
  runId: string,
  targetStepId?: string,
  actor: string = "system"
): Promise<RunBundle>
```

### `rollbackTask`

```typescript
export async function rollbackTask(
  runId: string,
  targetStepId?: string,
  actor: string = "system"
): Promise<RunBundle>
```

---

## `executeRunBundle`: Full Pipeline

### Pre-loop: Learning Optimizer

Before the task loop begins, the execution engine applies the learning optimizer:

1. `loadLearningStore()` retrieves historical run outcome data.
2. `optimizeTasks(bundle.plan.tasks, store)` returns an optimized task list with adjusted `retryLimit` values and a list of `suggestions`.
3. Any task with an adjusted `retryLimit` has its `retryPolicy.maxAttempts` overwritten in `bundle.plan.tasks`.
4. If suggestions are non-empty, a `OPTIMIZER_SUGGESTIONS_APPLIED` audit event is written.

### Task Loop

```
for index = bundle.state.currentStepIndex to bundle.plan.tasks.length - 1:
    result = await executeTask(bundle, task, index, actor)
    if result.completed === false:
        if bundle.state.status === "failed":
            recordRunOutcome(success=false)
        return bundle  // exits early on pause or failure
// all tasks completed:
writeAuditEvent("RUN_COMPLETED")
markState(bundle, "completed", { currentStepIndex: tasks.length })
recordRunOutcome(success=true)
return bundle
```

The loop starts at `bundle.state.currentStepIndex`, enabling resume from a checkpoint without re-executing already-completed steps.

---

## `executeTask`: 6-Stage Per-Task Pipeline

Each invocation of `executeTask` runs the following stages in strict sequence:

### Stage 1: Audit Start

`writeAuditEvent` with action `TASK_EXECUTION_ATTEMPT`. Fields included: `runId`, `actorName`, `actorId`, `actorType`, `orgId`, `workspaceId`, `projectId`, `correlationId`, `role`, `stepId`, `details.index`, `details.title`, `details.adapter`.

### Stage 2: Policy Evaluation

`evaluatePolicy(task)` is called. If `policyResult.allowed === false`:
- Writes `POLICY_BLOCK` audit event with `details.reason`
- Appends `StepExecutionLog` with `status: "failed"`
- Upserts `AdapterExecutionSummary` with `status: "failed"`
- Calls `markState(bundle, "failed", { currentStepIndex: index })`
- Returns `{ completed: false }`

### Stage 3: Adapter Lookup

`findAdapter(createProviderAdapters(), task.adapterId)` resolves the adapter. If `null` is returned:
- Writes `ADAPTER_NOT_FOUND` audit event
- Appends step log with `status: "failed"`, upserts adapter summary
- Calls `markState(bundle, "failed")`
- Returns `{ completed: false }`

### Stage 4: Simulation and Risk Assessment

If the adapter exposes a `simulate` method, `adapter.simulate(task.payload)` is called. The result's `risk` field determines `estimatedRisk`. If no `simulate` method, `adapter.estimateRisk(task.payload)` is tried. If neither exists, `estimatedRisk` defaults to `"medium"`.

`requiresApproval` is determined as:
```
requiresApproval = task.requiresApproval
  || policyResult.requiresApproval
  || simulation?.requiresApproval
  || estimatedRisk === "high"
```

### Stage 4b: Approval Gating

If `requiresApproval === true` and `bundle.state.approved === false`:
- `markState(bundle, "paused", { currentStepIndex: index, approvalRequired: true, pauseReason: <reason> })`
- Appends step log with `status: "paused"`, `attempt: 0`
- Writes `APPROVAL_REQUIRED` audit event
- Returns `{ completed: false, paused: true }`

### Stage 5: Validation

`adapter.validate(task.payload)` must return truthy. On `false`:
- `adapter.suggestFix` is called if available; result stored as `fixSuggestion`
- Writes `VALIDATION_FAILED` audit event with `fixSuggestion`
- Appends step log with `status: "failed"` and `fixSuggestion`
- Upserts adapter summary, calls `markState(bundle, "failed")`
- Returns `{ completed: false }`

### Stage 6: Execution with Retry and Outcome Verification

A loop runs from `attempt = 1` to `maxAttempts` (from `task.retryPolicy?.maxAttempts ?? 1`):

**On each attempt:**
1. Writes `STEP_EXECUTION_STARTED` audit event with `attempt` and `risk`.
2. Calls `adapter.execute(task.payload)`. If `result.success === false`, throws `result.error`.
3. Calls `adapter.verify(task.payload, result)`. If `!verification.ok`, throws `"Verification failed: {summary}"`.
4. On success: writes `STEP_EXECUTION_SUCCEEDED`, appends step log `status: "success"`, upserts adapter summary, increments `currentStepIndex`, resets `approved = false`.

**On catch (error):**
1. Writes `STEP_EXECUTION_FAILED` audit event with attempt, error, and `fixSuggestion`.
2. Appends step log with `status: "failed"`.
3. If this is the final attempt, invokes healing integration (Stage 6b).

### Stage 6b: Healing Integration (final attempt only)

`healFailedStep(context)` is called with `runId`, `stepId`, `adapterId`, `errorMessage`, `payload`, and `scope`.

| Healing result | Action |
|----------------|--------|
| `status === "verified"` | Writes `HEALING_APPLIED_AND_VERIFIED`; increments `maxAttempts` by 1; continues loop for one additional retry |
| `approvalRequired === true` | `markState(bundle, "paused", { ... })`; returns `{ completed: false, paused: true }` |
| Any other status | Writes `HEALING_ATTEMPTED_BUT_ESCALATED`; falls through to automatic rollback |
| `healFailedStep` throws | Writes `HEALING_ENGINE_ERROR`; falls through to automatic rollback |

### Stage 6c: Automatic Rollback (after final failed attempt)

If `task.rollbackPayload` exists and `adapter.rollback` is defined:
1. Calls `adapter.rollback(task.rollbackPayload)`.
2. Writes `ROLLBACK_COMPLETED` audit event with `details.automatic: true`.
3. Appends step log with `status: "rolled-back"`.

After rollback (or if rollback is not available):
- Upserts adapter summary with `status: "failed"`, output includes `fixSuggestion` if present.
- `markState(bundle, "failed", { currentStepIndex: index })`.
- Returns `{ completed: false }`.

---

## Retry Policy

| Property | Source | Default |
|----------|--------|---------|
| `maxAttempts` | `task.retryPolicy.maxAttempts` | `1` |
| Learning-adjusted limit | `optimizeTasks` → `retryLimit` field | Overrides task default |
| Healing extension | On `healFailedStep` returning `"verified"`, `maxAttempts += 1` | One additional attempt granted |

**Retryable errors:** All thrown errors are retried up to `maxAttempts`. There is no per-error-type allow-list; the retry decision is purely count-based. Non-retryable conditions (policy block, adapter not found, validation failure) exit before the retry loop.

**Backoff:** Not currently implemented. All retries execute immediately with no delay.

---

## Adapter Selection

```typescript
const adapters = createProviderAdapters(); // from packages/adapters/src
const adapter = findAdapter(adapters, task.adapterId);
```

`createProviderAdapters` returns all registered adapters. `findAdapter` performs a lookup by `adapterId`. If not found, the stage 3 failure path fires. The adapter interface requires:
- `validate(payload): Promise<boolean>`
- `execute(payload): Promise<{ success: boolean; output?: unknown; error?: string }>`

Optional methods that enhance behavior:
- `simulate(payload): Promise<{ risk: ExecutionRisk; summary: string; requiresApproval?: boolean }>`
- `estimateRisk(payload): Promise<ExecutionRisk>`
- `verify(payload, result): Promise<{ ok: boolean; summary: string }>`
- `suggestFix(error, payload): Promise<string>`
- `rollback(rollbackPayload): Promise<void>`

---

## Outcome Capture

`recordRunOutcome` from `outcome-engine.ts` is called in two places:

| When | `success` | `dominantFailureType` |
|------|-----------|----------------------|
| Bundle loop exits early with `status === "failed"` | `false` | `"step-failed"` |
| All tasks complete successfully | `true` | undefined |

`computeMetrics(bundle, success)` calculates:
- `timeTakenMs`: sum of `finishedAt - startedAt` across all steps
- `retryCount`: count of steps where `attempt > 1`
- `qualityScore`: `1` if success, `0` otherwise
- `adaptersUsed`: deduplicated list of adapter IDs from step logs

`recordRunOutcome` delegates to `learnFromOutcome` in the learning engine to update the learning store for future optimizer runs.

---

## Concurrency Model

Execution is **strictly sequential**. The task loop processes one task at a time. `executeRunBundle` does not use `Promise.all` or the batch queue for task execution. The batch queue (`batch-queue.ts`) is a separate utility used by the action runner for agent-generated action batches; it does not influence the core execution engine loop.

---

## `retryTask` Specification

1. `loadRunBundle(runId)` — throws if not found.
2. Resolves `stepId`: uses `targetStepId` if provided; otherwise uses `bundle.plan.tasks[bundle.state.currentStepIndex].id`.
3. Finds task index by `id`. Throws if not found.
4. Writes `RunState`: `currentStepIndex = index`, `status = "running"`, `pauseReason = undefined`, calls `updateRunState`.
5. Writes `STEP_RETRY_REQUESTED` audit event.
6. Calls `executeTask(bundle, task, index, actor)`.
7. Reloads bundle from store via `loadRunBundle(runId)` and returns it.

Note: `retryTask` re-runs the full 6-stage pipeline for the single target task. It does not continue to subsequent tasks after the retry.

---

## `rollbackTask` Specification

1. `loadRunBundle(runId)` — throws if not found.
2. Resolves `stepId`: uses `targetStepId` if provided; otherwise uses the last entry in `bundle.executionLog.steps`.
3. Finds `PlanTask` by `stepId`. Throws if not found.
4. Resolves adapter via `findAdapter`. Throws if `adapter.rollback` is absent or `task.rollbackPayload` is absent.
5. Calls `adapter.rollback(task.rollbackPayload)`.
6. Writes `TASK_ROLLBACK_MANUAL` audit event with `role = "operator"` if actor is not `"system"`.
7. Appends step log with `status: "rolled-back"`, `title: "{title} manual rollback"`.
8. Upserts adapter summary with `status: "rolled-back"`.
9. Decrements `bundle.state.currentStepIndex` by 1 (if > 0).
10. Calls `updateRunState`.
11. Reloads and returns updated bundle.

---

## Dependencies

| Dependency | Package | Purpose |
|-----------|---------|---------|
| `adapters/src` | `packages/adapters` | `createProviderAdapters`, `findAdapter` |
| `memory/src/run-store` | `packages/memory` | `loadRunBundle`, `updateAdapters`, `updateExecutionLog`, `updateRunState` |
| `core/src/policy-engine` | `packages/core` | `evaluatePolicy` — allows/blocks tasks |
| `audit/src` | `packages/audit` | `writeAuditEvent` — append-only audit trail |
| `learning/src/store` | `packages/learning` | `loadLearningStore` — historical outcome data |
| `learning/src/execution-optimizer` | `packages/learning` | `optimizeTasks` — adjusts retry limits |
| `healing-integration.ts` | `packages/orchestrator` | `healFailedStep` — invokes healing engine |
| `outcome-engine.ts` | `packages/orchestrator` | `recordRunOutcome` → `learnFromOutcome` |

---

## Edge Cases

- **Zero tasks in plan:** The task loop exits immediately; `RUN_COMPLETED` is written and `status = "completed"`.
- **Resume at last step:** `currentStepIndex === tasks.length - 1`; only that one step re-runs.
- **`adapter.verify` absent:** Treated as verified; step log records `"No verification hook; accepting successful execution."`.
- **Healing throws:** Caught internally; `HEALING_ENGINE_ERROR` written; automatic rollback proceeds normally.
- **`rollbackTask` with no prior step log:** `bundle.executionLog.steps.at(-1)` returns `undefined`; `stepId` is `undefined`; `task` lookup fails; throws `"Step not found for rollback: undefined"`.
- **`retryTask` on a completed run:** Allowed by implementation — the step is re-executed. Callers should check `bundle.state.status` before calling to avoid redundant retries.
- **Healing extends `maxAttempts` beyond the loop bounds:** The `continue` statement after `maxAttempts += 1` re-enters the `for` loop with the new limit, so execution correctly attempts one more time.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| No backoff between retries causes rapid failure cascade | Medium | Medium | Add configurable backoff to `retryPolicy`; expose `backoffMs` in `PlanTask` |
| `approved` reset after each step may cause re-pause on next high-risk step | Low | Medium | Expected behavior; document that approval is per-step, not per-run |
| Healing extending `maxAttempts` indefinitely if healing keeps succeeding | Low | High | Cap total attempts at a hard limit (e.g., `maxAttempts + 1`, never more) |
| Learning optimizer applying incorrect retry limits from stale store | Medium | Medium | Version the learning store; include store timestamp in optimizer suggestions |
| Manual rollback decrementing index incorrectly when step was not the current one | Medium | Low | `rollbackTask` decrements unconditionally; validate that `currentStepIndex > 0` before decrement |

---

## Definition of Done

- [ ] `executeRunBundle` processes all tasks sequentially and returns completed bundle when all succeed
- [ ] Policy block at stage 2 produces `status: failed` and correct audit events
- [ ] Adapter not found at stage 3 produces `status: failed` with `ADAPTER_NOT_FOUND` event
- [ ] Approval gating at stage 4b pauses bundle with correct `pauseReason` and `APPROVAL_REQUIRED` event
- [ ] Validation failure at stage 5 includes `fixSuggestion` in step log and audit
- [ ] Retry loop runs `maxAttempts` times before triggering healing
- [ ] Healing `"verified"` result causes one additional retry attempt
- [ ] Healing `approvalRequired` result pauses the run
- [ ] Automatic rollback fires when `rollbackPayload` is present after final failure
- [ ] `recordRunOutcome` called with `success=false` on early loop exit and `success=true` on completion
- [ ] `retryTask` resumes from exact step index with `STEP_RETRY_REQUESTED` audit event
- [ ] `rollbackTask` throws when adapter has no `rollback` method or task has no `rollbackPayload`
- [ ] Learning optimizer suggestions are logged as `OPTIMIZER_SUGGESTIONS_APPLIED` when non-empty
- [ ] Zero-task bundle completes immediately with `RUN_COMPLETED` event
