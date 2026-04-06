# SPEC — Orchestrator
**Status:** Draft
**Version:** 1.0
**Linked to:** packages/orchestrator/src/index.ts
**Implements:** System-level orchestration wiring, entry points, mode control, batch queue, trust pipeline, healing hooks, resume/rollback flows, log writing, and canonical event contract

---

## Objective

Define the complete behavioral contract for the Orchestrator package — the central coordination layer that ties together intake, planning, skill selection, gate evaluation, execution, outcome capture, healing, resume, and rollback into coherent pipelines. This spec describes how all sub-components are connected, which entry points exist, how mode policy propagates, and which events the orchestrator must emit in which order.

---

## Scope

- System overview and component wiring
- Entry points: `runVerticalSlice`, `runOrchestrationStep`, `resumeRun`
- Mode controller: `getModePolicy`, `trimQuestionsByMode`
- Batch queue: `QueuedBatch` lifecycle and storage
- Trust pipeline: `prepareTrustedBatch` and what it evaluates
- Healing integration hook within execution loop
- Resume flow: state reconstruction and continuation
- Rollback engine: `rollbackRun` and `rollbackTask`
- Log writer: artifact and log file conventions
- Canonical events contract: ordering, required fields, scoping rules

Out of scope: individual adapter implementations, authentication infrastructure, database schema migrations.

---

## Inputs / Outputs

| Direction | Item | Type | Description |
|-----------|------|------|-------------|
| Input | `RunVerticalSliceInput` | `{ idea, mode?, dryRun?, approvedGates?, currentRun? }` | Full pipeline trigger |
| Input | `RunReport` | Full report | Single-step trigger via `runOrchestrationStep` |
| Input | `runId` + `approve` flag | Strings | Resume trigger via `resumeRun` |
| Output | `RunVerticalSliceResult` | `{ report, artifactDirectory, artifactReportPath, memoryPath, overallGateStatus, currentPhase }` | Full result after pipeline completes or halts |
| Output | `RunBundle` | Persisted in run-store | State snapshot after any execution step |

---

## Data Structures

```typescript
// packages/orchestrator/src/run-vertical-slice.ts
interface RunVerticalSliceInput {
  idea: string;
  mode?: Mode;           // default: "builder"
  dryRun?: boolean;
  approvedGates?: string[];
  currentRun?: RunReport; // inject existing report to continue from checkpoint
}

interface RunVerticalSliceResult {
  report: RunReport;
  artifactDirectory: string;
  artifactReportPath: string;
  memoryPath: string;
  overallGateStatus: string;
  currentPhase: string;
}

// packages/orchestrator/src/batch-queue.ts
interface QueuedBatch {
  id: string;          // "batch_" + random 8-char hex
  runId: string;
  phase: string;
  createdAt: string;
  status: QueueStatus; // "pending" | "approved" | "executed" | "blocked"
  riskSummary: { low: number; medium: number; high: number };
  generatedBy: string;
  summary: string;
  batch: BuilderActionBatch;
}

// packages/orchestrator/src/rollback-metadata.ts
interface RollbackEntry {
  type: "file_write" | "file_append" | "dir_create" | "command";
  target: string;       // relative path from workspaceRoot
  timestamp: string;
  note: string;
}

interface RollbackMetadata {
  runId: string;
  entries: RollbackEntry[];
}
```

---

## Interfaces / APIs

### Public Exports from `packages/orchestrator/src/index.ts`

```typescript
// Mode control
export { getModePolicy, trimQuestionsByMode } from "./mode-controller";

// Intake
export { runIntake } from "./intake";

// Gate evaluation
export { evaluateGates } from "./gate-manager";

// Full pipeline + single-step
export { runVerticalSlice } from "./run-vertical-slice";

// Task execution
export * from "./execution-engine";    // executeRunBundle, retryTask, rollbackTask

// Run management
export * from "./resume-run";          // resumeRun, inspectRun
export * from "./rollback-engine";     // rollbackRun
export * from "./outcome-engine";      // recordRunOutcome
export * from "./healing-integration"; // healFailedStep

// Utility
export * from "./action-runner";       // runActionBatch
export * from "./log-writer";          // writeArtifact, writeJsonRecord, writeActionLog
export * from "./rollback-metadata";   // RollbackEntry, RollbackMetadata types
export * from "./batch-queue";         // createQueuedBatch, listQueuedBatches, etc.
```

---

## System Overview: Component Wiring

The following diagram shows how orchestrator sub-components are invoked during a standard `runVerticalSlice` call.

```
runVerticalSlice(input)
  │
  ├─► getModePolicy(mode)
  │     └─► Returns ModePolicy (gateThresholds, execution config)
  │
  ├─► runOrchestrationStep(report) [loop until blocked/finished/expert-mode-pause]
  │     │
  │     ├─[intake phase]──► runIntake(idea, mode)
  │     │                       ├─► normalizeIdeaText
  │     │                       ├─► inferSolutionCategory
  │     │                       ├─► deriveAssumptions
  │     │                       ├─► generateClarifyingQuestions
  │     │                       └─► trimQuestionsByMode(questions, mode)
  │     │
  │     ├─[planning phase]─► buildPlanFromClarification(intakeResult)
  │     │
  │     ├─[skills phase]──► selectSkills(clarification, plan)
  │     │
  │     ├─[gating phase]──► evaluateGates(intakeResult, plan, skills, mode, approvedGates)
  │     │                       └─► [if needs-review] emitGateAwaitingApproval(state, reason)
  │     │
  │     └─[building phase]─► executeRunBundle(bundle, actor)
  │                               ├─► [pre-loop] optimizeTasks(tasks, learningStore)
  │                               ├─► [per-task] executeTask(bundle, task, index, actor)
  │                               │       ├─► writeAuditEvent(TASK_EXECUTION_ATTEMPT)
  │                               │       ├─► evaluatePolicy(task)
  │                               │       ├─► findAdapter(adapters, task.adapterId)
  │                               │       ├─► adapter.simulate / adapter.estimateRisk
  │                               │       ├─► [if approval needed] markState(paused)
  │                               │       ├─► adapter.validate
  │                               │       ├─► adapter.execute + adapter.verify [retry loop]
  │                               │       ├─► [on final failure] healFailedStep(context)
  │                               │       │       └─► attemptHealing (healing-engine)
  │                               │       └─► [on heal fail] adapter.rollback(rollbackPayload)
  │                               │
  │                               └─► [on completion] recordRunOutcome → learnFromOutcome
  │
  └─► recordRun(report)
        └─► Persists to memory; returns artifactDirectory, reportPath, memoryPath
```

---

## Mode Controller

`getModePolicy(mode: Mode): ModePolicy` returns a `ModePolicy` object containing:

- `maxClarifyingQuestions`: upper bound on questions surfaced to user
- `gateThresholds`: numeric thresholds used by all 5 gate evaluators
- `execution`: flags controlling approval requirements and dry-run behavior

`trimQuestionsByMode<T extends QuestionLike>(questions: T[], mode: Mode): T[]`:
- Sorts questions by priority weight: `required` (100) > `critical` (90) > `high` (70) > `medium` (50) > `low` (30) > default (40)
- Slices to `policy.maxClarifyingQuestions`
- Used in `intake.ts` to limit clarifying questions surfaced per mode

### Mode Policy Summary

| Mode | Max Questions | Medium Risk Approval | High Risk Approval | Dry Run Default | Command Exec |
|------|--------------|---------------------|-------------------|-----------------|-------------|
| turbo | 2 | No | Yes | No | Yes |
| builder | 5 | Yes | Yes | No | Yes |
| pro | 8 | Yes | Yes | Yes | Yes |
| expert | 15 | Yes | Yes | Yes | Yes |
| safe | 20 | Yes | Yes | Yes | No |
| balanced | 10 | Yes | Yes | Yes | Yes |
| god | 0 | No | No | No | Yes |

---

## Batch Queue

The batch queue is a file-backed queue stored at `{workspaceRoot}/.ck/queue/{id}.json`. It is used by the action runner to stage agent-generated `BuilderActionBatch` objects for approval or execution.

### Lifecycle

```
createQueuedBatch(params)   → writes {id}.json with status "pending"
updateQueuedBatchStatus(id) → overwrites file with new status
getQueuedBatch(id)          → reads and parses {id}.json
listQueuedBatches(runId?)   → reads all .json files, filters by runId, sorts by createdAt
```

### Status Transitions

```
pending → approved  (human approves the batch)
pending → blocked   (gate evaluation or policy rejects)
approved → executed (action runner processes the batch)
```

### Risk Summary

Each `QueuedBatch` carries a `riskSummary: { low, medium, high }` count summarizing the actions in its `BuilderActionBatch`. This is used to surface a concise approval prompt to operators.

### Concurrency

No locking mechanism. Concurrent writes to the same batch file will result in last-writer-wins. Consumers must not assume atomic updates across multiple batches.

---

## Trust Pipeline

`prepareTrustedBatch` in `trust-pipeline.ts` is called before a `BuilderActionBatch` is executed to establish cryptographic provenance and a diff preview.

### What It Evaluates and Produces

1. **Diff preview:** `writeDiffPreview(workspaceRoot, batch)` generates a human-readable preview of all file changes in the batch. Written to the artifact store.
2. **Provenance record:** `createBatchProvenance({ batch, sourcePhase, sourceArtifact, actor })` captures who generated the batch and from which phase/artifact.
3. **Batch signing:** `signBatch({ batch, provenance, secret })` produces a signed envelope (`BatchSignedEnvelope`) using the provided `signingSecret`. Written to the workspace as a signature file.

### Return Values

```typescript
{
  diffArtifactPath: string;    // path to generated diff preview
  provenancePath: string;      // path to provenance JSON
  signaturePath: string;       // path to signed batch envelope
  envelope: BatchSignedEnvelope;
}
```

### When It Is Invoked

`prepareTrustedBatch` is called by components that generate and stage action batches before execution (e.g., agent-generated file write batches). It is not automatically invoked by `executeRunBundle` — it is an opt-in call from the action runner or phase-level code that produces batch artifacts.

---

## Healing Integration Hook

`healFailedStep(context: FailedStepContext): Promise<HealingAttempt>` is the orchestrator's integration point with the healing engine. It is invoked exclusively from within `executeTask` in `execution-engine.ts`, on the final retry attempt of a failing task.

```typescript
interface FailedStepContext {
  runId: string;
  stepId: string;
  adapterId: string;
  errorMessage: string;
  payload?: Record<string, unknown>;
  workingDirectory?: string;
  scope?: ExecutionScope;
}
```

`healFailedStep` delegates to `attemptHealing` from `packages/healing/src/healing-engine`. The `HealingAttempt` return type (from `packages/shared/src/phase10_5-types`) carries:

| Field | Meaning |
|-------|---------|
| `status: "verified"` | Healing applied and re-validated; execution engine grants one more retry |
| `approvalRequired: true` | Healing strategy selected but requires human approval; run pauses |
| Any other status | Healing could not resolve; execution engine proceeds to automatic rollback |

The orchestrator does not retry healing more than once per step failure. Healing outcome is recorded via `writeAuditEvent` with one of: `HEALING_APPLIED_AND_VERIFIED`, `HEALING_ATTEMPTED_BUT_ESCALATED`, or `HEALING_ENGINE_ERROR`.

---

## Resume Flow

`resumeRun(runId: string, approve: boolean, actor: string): Promise<RunBundle>` reconstructs and continues a paused run.

### Steps

1. `loadRunBundle(runId)` loads the full `RunBundle` from the memory store. Throws `"Run not found: {runId}"` if absent.
2. If `approve === true`:
   - Sets `bundle.state.approved = true`
   - Sets `bundle.state.approvalRequired = false`
   - Sets `bundle.state.updatedAt = now()`
   - Calls `updateRunState(runId, bundle.state)` to persist the approval
3. If `bundle.state.status === "completed"`, returns immediately without re-executing.
4. Calls `executeRunBundle(bundle, actor)` which resumes from `bundle.state.currentStepIndex`.

### Phase-level Resume

`runVerticalSlice` supports phase-level resume via `input.currentRun`. When provided:
- The report's `completedPhases`, `currentPhase`, `approvedGates`, and all artifacts are preserved.
- The orchestration loop begins at `currentPhase` without re-running already-completed phases.
- This enables resuming a run that was blocked at gating after adding new gate approvals.

---

## Rollback Engine

`rollbackRun(workspaceRoot: string, runId: string): RollbackOutcome` coordinates a full multi-step rollback based on persisted rollback metadata files.

### How It Works

1. Reads all files matching `{workspaceRoot}/.ck/logs/{runId}/*-rollback.json`.
2. Processes files in **reverse chronological order** (most recent first).
3. For each file, processes entries in **reverse order** (last action undone first).

### Entry Type Handling

| Entry Type | Action | Can Be Reverted? |
|-----------|--------|-----------------|
| `file_write` | `fs.unlinkSync(target)` if file exists | Yes |
| `dir_create` | `fs.rmdirSync(target)` if empty | Conditional (non-empty dirs skipped) |
| `file_append` | Skipped with note | No (manual only) |
| `command` | Skipped with note | No (manual only) |
| Unknown | Skipped with note | No |

### Return Value

```typescript
interface RollbackOutcome {
  runId: string;
  attempted: number;  // total entries processed
  reverted: number;   // successfully undone
  skipped: number;    // not undoable automatically
  notes: string[];    // human-readable log of each action
}
```

### Relationship to `rollbackTask`

`rollbackRun` (in `rollback-engine.ts`) operates on filesystem metadata records — it is a coarse-grained undo of file system changes. `rollbackTask` (in `execution-engine.ts`) calls `adapter.rollback(rollbackPayload)` which is a fine-grained, adapter-aware undo of a single task's side effects. Both can be used independently.

---

## Log Writer

`log-writer.ts` provides three file-writing utilities:

### `writeArtifact(workspaceRoot, runId, phase, markdown): string`
- Path: `{workspaceRoot}/.ck/artifacts/{runId}/{phase}.md`
- Used to persist markdown reports for each phase execution
- Returns the full written path

### `writeJsonRecord(workspaceRoot, bucket, runId, filename, payload): string`
- Path: `{workspaceRoot}/.ck/{bucket}/{runId}/{filename}`
- Used for structured JSON records (e.g., gate results, plan artifacts)
- Returns the full written path

### `writeActionLog(workspaceRoot, runId, filename, payload): string`
- Path: `{workspaceRoot}/.ck/logs/{runId}/{filename}`
- Accepts string or JSON-serializable payload
- Used for rollback metadata files and action execution logs
- Returns the full written path

All three functions call `fs.mkdirSync(dir, { recursive: true })` before writing, so directories are always created as needed.

---

## Canonical Events Contract

The orchestrator must emit the following events in the following order during a standard run. All events are published via `publishEvent(eventType, payload)` from `packages/events/src`.

### Event Emission Rules

1. Events are only emitted when `RunState.orgId` and `RunState.workspaceId` are present. Missing tenant scope silently skips emission.
2. Every event payload includes: `runId`, `tenant: { orgId, workspaceId, projectId }`, `actor: { id, type, authMode }`, `correlationId`.
3. Events are fire-and-forget from the orchestrator's perspective; emission errors do not halt execution.

### Canonical Sequence for a Successful Run

| Order | Event Type | Emitted By | Trigger |
|-------|-----------|-----------|---------|
| 1 | `execution.started` | phase-engine.ts building handler | Before `executeRunBundle` is called |
| 2 | `execution.completed` | phase-engine.ts building handler | After `executeRunBundle` returns with `status: "completed"` |

### Canonical Sequence for a Paused Run (approval required)

| Order | Event Type | Emitted By | Trigger |
|-------|-----------|-----------|---------|
| 1 | `execution.started` | phase-engine.ts building handler | Before `executeRunBundle` is called |
| 2 | `gate.awaiting_approval` | phase-engine.ts building handler | After `executeRunBundle` returns with `status: "paused"` |

### Canonical Sequence for a Gating Pause

| Order | Event Type | Emitted By | Trigger |
|-------|-----------|-----------|---------|
| 1 | `gate.awaiting_approval` | phase-engine.ts gating handler | When `evaluateGates` returns `overallStatus: "needs-review"` |

### Canonical Sequence for a Failed Run

| Order | Event Type | Emitted By | Trigger |
|-------|-----------|-----------|---------|
| 1 | `execution.started` | phase-engine.ts building handler | Before `executeRunBundle` is called |
| 2 | `execution.failed` | phase-engine.ts building handler | After `executeRunBundle` returns with `status: "failed"` |

### Additional Events (verification)

| Event Type | Emitted By | Trigger |
|-----------|-----------|---------|
| `verification.completed` | Callers using `emitVerificationCompleted` helper | After adapter verification step, if caller opts in |

---

## Dependencies

| Dependency | Package | Purpose |
|-----------|---------|---------|
| `intake.ts` | `packages/orchestrator` | Phase 1: idea normalization and clarification |
| `planner.ts` | `packages/orchestrator` | Phase 2: task plan generation |
| `skill-engine` | `packages/skill-engine` | Phase 3: skill selection |
| `gate-manager.ts` | `packages/orchestrator` | Phase 4: gate evaluation |
| `execution-engine.ts` | `packages/orchestrator` | Phase 5: task execution |
| `mode-controller.ts` | `packages/orchestrator` | Policy per mode |
| `events.ts` | `packages/orchestrator` | Orchestrator-scoped event emission helpers |
| `memory/src` | `packages/memory` | `recordRun`, `loadRunBundle`, `updateRunState` |
| `healing/src` | `packages/healing` | `attemptHealing` via `healing-integration.ts` |
| `learning/src` | `packages/learning` | `learnFromOutcome` via `outcome-engine.ts` |
| `security/src` | `packages/security` | Batch provenance and signing via `trust-pipeline.ts` |
| `audit/src` | `packages/audit` | `writeAuditEvent` |
| `events/src` | `packages/events` | `publishEvent` |

---

## Edge Cases

- **`runVerticalSlice` with `mode === "expert"`:** Only one phase executes per call. The caller must re-invoke with the returned report as `currentRun` to advance. `shouldContinue` returns `false` immediately in expert mode.
- **`runVerticalSlice` with `mode === "turbo"`:** The inner `while` loop continues until `isFinished === true` or `status !== "in-progress"`, resulting in a fully autonomous single-call pipeline.
- **`prepareTrustedBatch` called without signing secret:** `signBatch` receives an empty string; signing behavior depends on the security package's handling of empty secrets — this should be treated as an error.
- **`rollbackRun` with no rollback log directory:** Returns `RollbackOutcome` with `attempted=0`, `reverted=0`, and note `"No rollback logs found."` — a safe no-op.
- **Event emission with partial tenant scope (orgId present but workspaceId missing):** `emitOrchestratorEvent` silently skips; no warning is logged by default (there is a commented-out `console.warn` in the source).
- **`resumeRun` called on a completed run:** Returns the bundle immediately without re-execution. Idempotent.
- **Batch queue file corruption:** `getQueuedBatch` will throw a JSON parse error. No error recovery is built in; the file must be manually repaired or deleted.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Event emission skipped silently when tenant scope is missing | High | Medium | Enable the commented-out `console.warn`; add telemetry for skipped event count |
| Batch queue race condition on concurrent `createQueuedBatch` with identical random IDs | Very Low | Low | `Math.random().toString(36).slice(2,10)` collision probability is negligible; add UUID for production |
| `rollbackRun` deletes files without confirming they were created by this run | Low | High | Rollback metadata entries should include a run-scoped checksum or creation marker |
| Trust pipeline signing secret passed as plain string in function call | Medium | High | Move `signingSecret` to environment variable retrieval inside `trust-pipeline.ts` |
| `runVerticalSlice` has no timeout; turbo mode loops indefinitely on phase errors | Low | Medium | Add a maximum phase iteration count guard inside the `while` loop |

---

## Definition of Done

- [ ] `runVerticalSlice` completes full 8-phase pipeline in builder mode with a valid idea
- [ ] `runVerticalSlice` stops after phase 1 in expert mode and returns correct `currentPhase`
- [ ] `runVerticalSlice` loops to completion in turbo mode without requiring multiple calls
- [ ] `resumeRun(runId, approve=true)` resumes a paused bundle from the correct `currentStepIndex`
- [ ] `resumeRun` on a completed run returns the bundle without re-executing
- [ ] `rollbackRun` processes rollback files in reverse chronological order with entries in reverse order
- [ ] `rollbackRun` skips `file_append` and `command` entries with appropriate notes
- [ ] `prepareTrustedBatch` produces a diff artifact, provenance file, and signature file
- [ ] All 5 canonical event types emit with correct `runId`, `tenant`, `actor`, `correlationId` fields
- [ ] Events are not emitted when `orgId` or `workspaceId` is missing from `RunState`
- [ ] Batch queue `listQueuedBatches` returns results sorted by `createdAt` ascending
- [ ] `getModePolicy("god")` returns policy with `requireApprovalForHighRisk: false`
- [ ] `trimQuestionsByMode` returns no more than `maxClarifyingQuestions` items sorted by priority weight
- [ ] `writeArtifact`, `writeJsonRecord`, and `writeActionLog` create parent directories automatically
