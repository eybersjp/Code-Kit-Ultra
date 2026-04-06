# Sequence Diagrams — Code Kit Ultra

**Status:** Authoritative
**Version:** 1.2.0
**Last reviewed:** 2026-04-04
**See also:** `docs/02_architecture/AUTH_ARCHITECTURE.md`, `docs/02_architecture/SYSTEM_ARCHITECTURE.md`, `docs/02_architecture/C4_SYSTEM_DIAGRAM.md`

---

## Overview

This document provides detailed sequence diagrams for the four most critical flows in Code Kit Ultra:

1. **Auth & Session Resolution** — how every authenticated request is verified.
2. **Run Lifecycle (Happy Path)** — the end-to-end flow from CLI submission to run completion.
3. **Gate Approval Flow** — how a gate pause is raised, reviewed, and resolved.
4. **Healing Loop (Phase 10.5)** — how step failures are classified, healed, or rolled back.

All diagrams use [Mermaid `sequenceDiagram`](https://mermaid.js.org/syntax/sequenceDiagram.html) syntax.

---

## Flow 1 — Auth & Session Resolution

This flow executes on **every authenticated API request**. The `authenticate.ts` middleware in `apps/control-service` is the entry point. It delegates to `packages/auth/src/resolve-session.ts`, which fans out to the appropriate strategy module.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client<br/>(CLI / Web UI / Service Account)
    participant API as Control Service<br/>authenticate.ts
    participant RS as resolve-session.ts<br/>packages/auth
    participant VIT as verify-insforge-token.ts<br/>packages/auth
    participant SA as service-account.ts<br/>packages/auth
    participant JWKS as InsForge JWKS Endpoint<br/>(external)
    participant Redis as Redis<br/>(jti blacklist)
    participant Policy as resolve-permissions.ts<br/>packages/policy
    participant IET as issue-execution-token.ts<br/>packages/auth
    participant Orch as Orchestrator<br/>packages/orchestrator

    Client->>API: HTTP request<br/>Authorization: Bearer <token>

    API->>RS: resolveSession(token)

    alt InsForge Session JWT (Primary — RS256)
        RS->>VIT: verifyInsforgeToken(token)

        VIT->>JWKS: GET /.well-known/jwks.json
        note over VIT,JWKS: Response cached for 10 minutes.<br/>Subsequent requests use in-memory cache.
        JWKS-->>VIT: { keys: [...] }

        VIT->>VIT: Verify RS256 signature<br/>Validate iss === INSFORGE_ISSUER<br/>Validate exp not expired<br/>Extract sub (actorId), aud (tenancy claims)

        VIT->>Redis: SISMEMBER jti_blacklist <token.jti>
        Redis-->>VIT: 0 (not revoked) or 1 (revoked)

        alt jti is revoked
            VIT-->>RS: Error: TOKEN_REVOKED
            RS-->>API: 401 Unauthorized
            API-->>Client: 401 { error: "Token has been revoked" }
        end

        VIT-->>RS: { actorId: sub, tenancy, authMode: 'session', claims }

    else Service Account JWT (Secondary — HS256)
        RS->>SA: verifyServiceAccountToken(token)

        SA->>SA: Verify HS256 with SERVICE_ACCOUNT_JWT_SECRET<br/>Validate exp not expired<br/>Extract serviceAccountId, orgId, scopes

        SA->>Redis: SISMEMBER jti_blacklist <token.jti>
        Redis-->>SA: 0 (not revoked)

        SA-->>RS: { actorId: serviceAccountId, tenancy, authMode: 'service-account', scopes }

    else Legacy API Key (Deprecated — X-Api-Key header)
        RS->>RS: Lookup key in DB → resolve orgId / actorId
        note over RS: ⚠ Deprecated. Planned for removal.<br/>No jti tracking. Revocation via DB delete only.
        RS-->>RS: { actorId, tenancy, authMode: 'legacy-api-key' }
    end

    RS->>Policy: resolvePermissions(authMode, role, scopes)
    Policy-->>RS: PermissionSet

    RS-->>API: ResolvedSession { actor, tenant, permissions, authMode, correlationId }

    API->>API: Attach session to req.auth<br/>Proceed to command handler

    note over API,Orch: When orchestrator starts a new run,<br/>it issues a scoped execution token.

    API->>Orch: startRun(runInput, session)
    Orch->>IET: issueExecutionToken({ actorId, runId, orgId, exp: +10min })
    IET->>IET: Sign HS256 { sub: actorId, runId, orgId, scope: 'run:execute' }
    IET-->>Orch: executionToken (10-min HS256 JWT)
    note over Orch: Token stored in run context only.<br/>Not persisted to DB. Expires automatically.
    Orch->>Orch: Attach executionToken to all adapter calls<br/>within this run
```

### Auth Notes

| Aspect | Detail |
|---|---|
| JWKS Cache TTL | 10 minutes (in-memory). First request per instance fetches from InsForge. |
| jti Revocation | Redis `SISMEMBER` on `jti_blacklist` set. Falls back to in-memory set if Redis unavailable. |
| Execution Token | HS256, 10-min expiry, scoped to `{ runId, orgId, scope: 'run:execute' }`. Never persisted. |
| Legacy Key | Deprecated. No jti — revocation requires DB row deletion. Removed in a future release. |
| Auth Failure | Returns HTTP 401 with structured `{ error, code }` body. No partial session built. |

---

## Flow 2 — Run Lifecycle (Happy Path)

This flow covers the full end-to-end journey of a run from CLI submission through all 8 phases to completion. The "happy path" assumes all gates pass and no step failures occur.

```mermaid
sequenceDiagram
    autonumber
    participant CLI as CLI<br/>apps/cli
    participant API as Control Service<br/>apps/control-service
    participant Auth as resolve-session.ts
    participant CMD as execute.ts<br/>command-engine
    participant Orch as phase-engine.ts<br/>orchestrator
    participant Intake as intake.ts
    participant Planner as planner.ts
    participant Skills as skill-engine selector
    participant Gates as gate-manager.ts
    participant Gov as governance<br/>9 gates
    participant ExecEng as execution-engine.ts
    participant Adapters as Adapters<br/>claude / gemini / etc.
    participant Audit as write-audit-event.ts
    participant Events as publish-event.ts<br/>(SSE)
    participant Memory as run-store.ts

    CLI->>API: POST /v1/runs { idea, mode, projectId }

    API->>Auth: resolveSession(bearerToken)
    Auth-->>API: ResolvedSession

    API->>CMD: execute(runInput, session)
    CMD->>Memory: createRun({ id, status: 'planned', ... })
    Memory-->>CMD: RunState

    CMD->>Audit: writeAuditEvent(run.created, { runId, actorId })
    CMD->>Events: publishEvent(run.created, { runId })
    note over Events: SSE stream delivers run.created to<br/>subscribed CLI / Web UI clients.

    CMD->>Orch: startPhaseEngine(run, session)
    Orch->>Memory: updateRun({ status: 'running' })
    Orch->>Audit: writeAuditEvent(run.started, { runId })
    Orch->>Events: publishEvent(run.started, { runId })

    rect rgb(240, 248, 255)
        note right of Orch: PHASE: intake
        Orch->>Intake: runIntakePhase(run)
        Intake->>Adapters: normalizeIdeaText(idea) → structured summary
        Adapters-->>Intake: normalized idea
        Intake->>Adapters: inferSolutionCategory(summary) → category
        Adapters-->>Intake: { category, confidence }
        Intake->>Adapters: generateClarifyingQuestions(summary, category)
        Adapters-->>Intake: clarifyingQuestions[]
        Intake-->>Orch: IntakeResult { summary, category, questions }
        Orch->>Events: publishEvent(run.phase.completed, { phase: 'intake' })
    end

    rect rgb(240, 255, 240)
        note right of Orch: PHASE: planning
        Orch->>Planner: runPlanningPhase(intakeResult)
        Planner->>Adapters: buildTaskPlan(clarificationAnswers)
        Adapters-->>Planner: PlanTask[] (ordered tasks per phase)
        Planner-->>Orch: PlanningResult { tasks }
        Orch->>Memory: updateRun({ planTasks })
        Orch->>Events: publishEvent(run.phase.completed, { phase: 'planning' })
    end

    rect rgb(255, 255, 240)
        note right of Orch: PHASE: skills
        Orch->>Skills: selectSkills(planTasks)
        Skills->>Skills: resolveManifest + validateSchema per skill
        Skills-->>Orch: SkillSelection { selectedSkills }
        Orch->>Events: publishEvent(run.phase.completed, { phase: 'skills' })
    end

    rect rgb(255, 245, 230)
        note right of Orch: PHASE: gating (9 gates evaluated)
        Orch->>Gates: evaluateGates(run, plan, skills)
        loop For each of 9 gates
            Gates->>Gov: evaluateGate(gateType, context)
            Gov-->>Gates: GateDecision { status, reason, shouldPause }
            Gates->>Audit: writeAuditEvent(gate.evaluated, { gateType, status })
            Gates->>Events: publishEvent(gate.evaluated, { gateType, status })
        end
        note over Gates: If any gate returns NEEDS_REVIEW → pause.<br/>(See Flow 3 for gate approval detail.)
        Gates-->>Orch: GateResult { allPassed: true }
        Orch->>Events: publishEvent(run.phase.completed, { phase: 'gating' })
    end

    rect rgb(245, 230, 255)
        note right of Orch: PHASE: building — executeRunBundle
        Orch->>ExecEng: executeRunBundle(run, session, executionToken)

        ExecEng->>Audit: writeAuditEvent(execution.started, { runId })

        loop For each step/action in plan
            ExecEng->>Adapters: executeAction(action, executionToken)
            Adapters-->>ExecEng: ActionResult { success, output }
            ExecEng->>Audit: writeAuditEvent(action.executed, { actionId, success })
            ExecEng->>Events: publishEvent(run.step.completed, { stepId, status: 'success' })
            ExecEng->>Memory: updateStep({ status: 'success' })
        end

        ExecEng-->>Orch: ExecutionResult { success: true }
        Orch->>Events: publishEvent(run.phase.completed, { phase: 'building' })
    end

    rect rgb(230, 255, 245)
        note right of Orch: PHASES: testing / reviewing / deployment (simulated)
        Orch->>Orch: runSimulatedPhase('testing')
        Orch->>Events: publishEvent(run.phase.completed, { phase: 'testing' })
        Orch->>Orch: runSimulatedPhase('reviewing')
        Orch->>Events: publishEvent(run.phase.completed, { phase: 'reviewing' })
        Orch->>Orch: runSimulatedPhase('deployment')
        Orch->>Events: publishEvent(run.phase.completed, { phase: 'deployment' })
    end

    Orch->>Memory: updateRun({ status: 'completed' })
    Orch->>Audit: writeAuditEvent(run.completed, { runId, durationMs })
    Orch->>Events: publishEvent(run.completed, { runId, status: 'completed' })

    note over Orch: outcome-engine.ts runs post-completion
    Orch->>Orch: outcomeEngine.record(run)
    note over Orch: learning-engine.ts updates reliability scores

    CMD-->>API: { runId, status: 'completed' }
    API-->>CLI: 200 { runId, status: 'completed' }
```

### Run Lifecycle Notes

| Phase | Handler | AI Call | Gate Check |
|---|---|---|---|
| `intake` | `intake.ts` | Yes (normalize, categorize, questions) | No |
| `planning` | `planner.ts` | Yes (task plan) | No |
| `skills` | `skill-engine/selector.ts` | No | No |
| `gating` | `gate-manager.ts` | Depends on gate type | Yes (9 gates) |
| `building` | `execution-engine.ts` | Yes (via adapters) | Yes (approval gate, step 5) |
| `testing` | `phase-engine.ts` | No (simulated) | No |
| `reviewing` | `phase-engine.ts` | No (simulated) | No |
| `deployment` | `phase-engine.ts` | No (simulated) | No |

---

## Flow 3 — Gate Approval Flow

This flow covers the case where a governance gate returns `NEEDS_REVIEW`, pausing the run until a human operator approves or rejects via the API. The flow branches on approval vs. rejection.

```mermaid
sequenceDiagram
    autonumber
    participant Gates as gate-manager.ts<br/>orchestrator
    participant Gov as governance gate<br/>(any of 9)
    participant Memory as run-store.ts
    participant Audit as write-audit-event.ts
    participant Events as publish-event.ts<br/>(SSE)
    participant CLI as CLI / Web UI<br/>(operator)
    participant API as Control Service<br/>approve handler
    participant Resume as resume-run.ts<br/>orchestrator
    participant Orch as phase-engine.ts<br/>orchestrator

    Gates->>Gov: evaluateGate(gateType, context)
    Gov-->>Gates: GateDecision { status: 'needs-review', reason, shouldPause: true }

    Gates->>Memory: updateGateDecision({ status: 'needs-review' })
    Gates->>Memory: updateRun({ status: 'paused' })

    Gates->>Audit: writeAuditEvent(gate.paused, { gateType, reason, runId })
    Gates->>Events: publishEvent(gate.approval.required, { runId, gateType, reason })
    note over Events: SSE stream pushes gate.approval.required<br/>to all subscribers on this run channel.

    Gates-->>Orch: GateResult { needsReview: true, gateType }
    Orch->>Orch: Suspend phase-engine execution<br/>(awaiting resume signal)

    CLI->>CLI: Operator receives SSE notification:<br/>"Gate [type] requires review"
    CLI->>CLI: Operator reviews reason and context

    alt Operator APPROVES

        CLI->>API: POST /v1/gates/:gateId/approve { note }
        API->>API: Authenticate + authorize request
        API->>Memory: updateGateDecision({ status: 'approved', decidedBy, decidedAt, decisionNote })
        API->>Memory: updateRun({ status: 'running' })

        API->>Audit: writeAuditEvent(gate.approved, { gateId, gateType, decidedBy, note })
        API->>Events: publishEvent(gate.approved, { runId, gateType, decidedBy })

        API->>Resume: resumeRun(runId, session)
        Resume->>Memory: loadRun(runId) → RunState with checkpoint
        Resume->>Orch: reenterPhaseEngine(run, checkpoint)

        Orch->>Orch: Continue execution from paused checkpoint
        Orch->>Events: publishEvent(run.resumed, { runId })

        note over Orch: Run continues with the remaining gates<br/>and then proceeds to the building phase.

    else Operator REJECTS

        CLI->>API: POST /v1/gates/:gateId/reject { reason }
        API->>API: Authenticate + authorize request
        API->>Memory: updateGateDecision({ status: 'rejected', decidedBy, decidedAt, decisionNote: reason })
        API->>Memory: updateRun({ status: 'cancelled' })

        API->>Audit: writeAuditEvent(gate.rejected, { gateId, gateType, decidedBy, reason })
        API->>Events: publishEvent(gate.rejected, { runId, gateType, reason })

        note over Events: SSE stream pushes gate.rejected.<br/>CLI / Web UI marks run as cancelled.

        API-->>CLI: 200 { runId, status: 'cancelled' }
    end
```

### Gate Type Reference

The 9 governance gates evaluated during the `gating` phase, in evaluation order:

| # | Gate Type | Evaluator | Pause Trigger |
|---|---|---|---|
| 1 | Risk Threshold Gate | `gate-controller.ts` | Risk score exceeds mode threshold |
| 2 | Policy Compliance Gate | `governed-pipeline.ts` + `constraint-engine.ts` | Policy violation detected |
| 3 | Confidence Score Gate | `confidence-engine.ts` | Score below mode minimum |
| 4 | Kill Switch Gate | `kill-switch.ts` | Kill switch active for org/workspace |
| 5 | Consensus Gate | `consensus-engine.ts` + `adaptive-consensus.ts` | Consensus not reached across adapters |
| 6 | Constraint Gate | `constraint-engine.ts` | Hard constraint violated |
| 7 | Validation Gate | `validation-engine.ts` | Output fails validation schema |
| 8 | Intent Alignment Gate | `intent-engine.ts` | Plan intent diverges from idea |
| 9 | Approval Gate | `gate-controller.ts` | Mode requires explicit human approval |

### GateStatus Transitions

```
pending → pass          (gate evaluated and passed — run continues)
pending → needs-review  (gate requires human decision — run paused)
pending → blocked       (gate hard-blocked — run fails immediately)
needs-review → approved (human approved — run resumes)
needs-review → rejected (human rejected — run cancelled)
```

---

## Flow 4 — Healing Loop (Phase 10.5)

This flow executes within `execution-engine.ts` at step 10.5 — between a step failure (step 7) and the final rollback decision (step 10). It is triggered automatically whenever an action returns a failure result.

```mermaid
sequenceDiagram
    autonumber
    participant ExecEng as execution-engine.ts<br/>(step 7 → 10.5)
    participant HealInt as healing-integration.ts<br/>orchestrator
    participant FC as failure-classifier.ts<br/>packages/healing
    participant Registry as healing-strategy-registry.ts<br/>packages/healing
    participant HealEng as healing-engine.ts<br/>packages/healing
    participant Reval as revalidation.ts<br/>packages/healing
    participant Adapters as Adapters<br/>(retry target)
    participant Rollback as rollback-engine.ts<br/>orchestrator
    participant Audit as write-audit-event.ts
    participant Events as publish-event.ts<br/>(SSE)
    participant Memory as run-store.ts

    ExecEng->>ExecEng: Action fails (step 7 — execution with retry exhausted)
    ExecEng->>Audit: writeAuditEvent(action.failed, { actionId, error, attempt })
    ExecEng->>Events: publishEvent(run.step.failed, { stepId, error })
    ExecEng->>Memory: updateStep({ status: 'failed' })

    ExecEng->>HealInt: invokeHealingPipeline(failure, runContext)
    note over HealInt: Phase 10.5 — healing-integration bridges<br/>execution-engine to packages/healing.

    HealInt->>FC: classifyFailure(failure)
    note over FC: Analyses error type, stack trace, and context.<br/>Maps to a FailureCategory enum.
    FC-->>HealInt: FailureClassification { category, severity, retryable }

    alt Not retryable (e.g. auth failure, schema violation)
        HealInt-->>ExecEng: HealingResult { healed: false, reason: 'not-retryable' }
        ExecEng->>Rollback: triggerRollback(run, failedStep)
        note over Rollback: Skip healing loop — go straight to rollback.
    end

    HealInt->>Registry: resolveStrategy(classification)
    note over Registry: Matches classification to registered<br/>healing strategies (retry, fallback-adapter,<br/>partial-replan, prompt-revision, etc.)
    Registry-->>HealInt: HealingStrategy { strategyId, maxAttempts, actions }

    loop Healing attempts (up to maxAttempts per strategy)
        HealInt->>HealEng: executeHealingStrategy(strategy, failure, runContext)

        HealEng->>HealEng: Apply strategy actions<br/>(e.g. swap adapter, revise prompt,<br/>reduce scope, add context)

        HealEng->>Adapters: Retry action with modified parameters
        Adapters-->>HealEng: ActionResult { success, output }

        alt Action succeeds
            HealEng->>Reval: revalidate(output, step.doneDefinition)
            Reval-->>HealEng: RevalidationResult { valid, score }

            alt Revalidation passes
                HealEng-->>HealInt: HealingResult { healed: true, attempt, strategy }
                HealInt->>Audit: writeAuditEvent(healing.succeeded, { stepId, strategy, attempt })
                HealInt->>Events: publishEvent(run.step.healed, { stepId, strategy })
                HealInt->>Memory: updateHealingAction({ status: 'success', runId, stepId })
                HealInt-->>ExecEng: HealingResult { healed: true }
                ExecEng->>ExecEng: Continue with next step
            else Revalidation fails
                HealEng->>HealEng: Increment attempt counter
                note over HealEng: Output did not meet doneDefinition.<br/>Try next healing attempt.
            end

        else Action fails again
            HealEng->>HealEng: Increment attempt counter
            HealEng->>Audit: writeAuditEvent(healing.attempt.failed, { attempt, error })
        end
    end

    note over HealInt: All healing attempts exhausted without success.

    HealInt->>Audit: writeAuditEvent(healing.exhausted, { runId, stepId, attempts })
    HealInt->>Events: publishEvent(run.healing.exhausted, { runId, stepId })
    HealInt->>Memory: updateHealingAction({ status: 'exhausted' })
    HealInt-->>ExecEng: HealingResult { healed: false, reason: 'exhausted' }

    ExecEng->>Rollback: triggerRollback(run, failedStep)
    note over Rollback: rollback-engine executes compensating actions<br/>in reverse order for all completed steps.

    loop For each completed step (reverse order)
        Rollback->>Adapters: executeCompensatingAction(step)
        Adapters-->>Rollback: CompensationResult
        Rollback->>Memory: updateStep({ status: 'rolled-back' })
        Rollback->>Audit: writeAuditEvent(rollback.action.executed, { stepId })
        Rollback->>Memory: writeRollbackAction({ runId, stepId, status })
    end

    Rollback->>Memory: updateRun({ status: 'failed' })
    Rollback->>Audit: writeAuditEvent(run.failed, { runId, reason: 'healing-exhausted' })
    Rollback->>Events: publishEvent(run.failed, { runId, reason: 'healing-exhausted' })
```

### Healing Strategy Types

| Strategy | Trigger Condition | Action |
|---|---|---|
| `retry-same` | Transient network/timeout error | Retry identical action with exponential backoff |
| `fallback-adapter` | AI provider error or low-confidence output | Switch to next AI adapter in priority order |
| `prompt-revision` | Output failed validation but adapter responded | Revise prompt with additional constraints |
| `partial-replan` | Step scope too large for single action | Decompose step into smaller sub-actions |
| `add-context` | Insufficient context in original action | Inject additional context from run memory |
| `escalate-mode` | Low confidence across all adapters | Temporarily elevate execution mode |

### Healing Loop Limits

| Mode | Max Healing Attempts per Step |
|---|---|
| `turbo` | 1 |
| `builder` | 2 |
| `pro` | 3 |
| `expert` | 3 |
| `safe` | 5 |
| `balanced` | 3 |
| `god` | 5 |

When `maxAttempts` is exhausted, the healing integration returns `{ healed: false }` and `execution-engine.ts` immediately invokes `rollback-engine.ts`.

### Audit Events in Healing

| Event Type | When Emitted |
|---|---|
| `action.failed` | Initial step failure (execution-engine, step 7) |
| `healing.attempt.started` | Each healing attempt begins |
| `healing.attempt.failed` | A healing attempt produces failure |
| `healing.succeeded` | Healing attempt produces passing revalidation |
| `healing.exhausted` | All attempts used without success |
| `rollback.action.executed` | Each compensating action runs |
| `run.failed` | Run status transitions to `failed` after rollback |
