# Test Plan — Gate Evaluation and Approval

**Version**: 1.0.0
**Date**: 2026-04-04
**Status**: Active
**Owner**: Governance
**Related packages**: `packages/governance`, `packages/orchestrator`

---

## Table of Contents

1. [Scope](#1-scope)
2. [Gate Reference](#2-gate-reference)
3. [Test Cases — Individual Gates](#3-test-cases--individual-gates)
4. [Test Cases — Gate Sequencing](#4-test-cases--gate-sequencing)
5. [Test Cases — Approval and Rejection Flows](#5-test-cases--approval-and-rejection-flows)
6. [Test Cases — Mode Influence](#6-test-cases--mode-influence)
7. [Mock Requirements](#7-mock-requirements)
8. [Test File Locations](#8-test-file-locations)
9. [Example Test Code](#9-example-test-code)

---

## 1. Scope

This test plan covers gate evaluation, sequencing, and the human approval/rejection flow.

| Source file | What it implements |
|---|---|
| `packages/governance/src/gate-controller.ts` | Gate persistence and status transitions |
| `packages/governance/src/confidence-engine.ts` | Weighted confidence score calculation |
| `packages/governance/src/consensus-engine.ts` | Multi-agent consensus decision |
| `packages/validation-engine.ts` | Input and output validation |
| `packages/governance/src/constraint-engine.ts` | Policy constraint evaluation |
| `packages/governance/src/intent-engine.ts` | Intent-to-plan alignment |
| `packages/governance/src/kill-switch.ts` | Kill switch gate |
| `packages/orchestrator/src/gate-manager.ts` | `evaluateGates`, `getOverallGateStatus` |

Gate evaluation is the most complex safety-critical subsystem in Code-Kit-Ultra. A defect here
could allow an unsafe run to proceed without approval, or incorrectly block a safe run.

---

## 2. Gate Reference

The system defines 9 governance gates. Each gate can produce one of these statuses:
`pass | fail | needs-review | blocked | pending`.

| # | Gate ID | Source engine | Blocking status |
|---|---|---|---|
| 1 | `objective-clarity` | `gate-manager.ts` | `blocked` if no objective |
| 2 | `requirements-completeness` | `gate-manager.ts` | `blocked` if too many open questions |
| 3 | `plan-readiness` | `gate-manager.ts` | `blocked` if no tasks |
| 4 | `skill-coverage` | `gate-manager.ts` | `blocked` if no skills |
| 5 | `ambiguity-risk` | `gate-manager.ts` | `blocked` if ambiguity exceeds threshold |
| 6 | `confidence-score` | `confidence-engine.ts` | `needs-review` if score below threshold |
| 7 | `kill-switch` | `kill-switch.ts` | `blocked` immediately when active |
| 8 | `constraint-violation` | `constraint-engine.ts` | `fail` if policy violated |
| 9 | `approval` | `gate-controller.ts` | `needs-review` (human required, mode-dependent) |

---

## 3. Test Cases — Individual Gates

### Gate 1: Objective Clarity

**File**: `packages/orchestrator/src/gate-manager.test.ts`

#### TC-GATE-OBJ-001: No normalised objective → blocked

```
Given: clarificationResult.normalizedIdea === ""
When: evaluateGates(input) is called
Then:
  - the "objective-clarity" decision has status "blocked"
  - overallStatus is "blocked"
  - decision.shouldPause === true
```

#### TC-GATE-OBJ-002: Objective present but category unknown → needs-review

```
Given: clarificationResult.normalizedIdea === "Build a CRM"
And: clarificationResult.inferredProjectType === "unclear"
When: evaluateGates(input) is called
Then:
  - the "objective-clarity" decision has status "needs-review"
  - overallStatus is at least "needs-review"
```

#### TC-GATE-OBJ-003: Clear objective and known category → pass

```
Given: normalizedIdea === "Build a CRM"; inferredProjectType === "web-app"
When: evaluateGates(input) is called
Then: "objective-clarity" decision has status "pass"
```

### Gate 2: Requirements Completeness

#### TC-GATE-REQ-001: Exceeds maxQuestionsBeforeBlock → blocked

```
Given: clarifyingQuestions.length >= policy.gateThresholds.maxQuestionsBeforeBlock
When: evaluateGates(input) is called
Then: "requirements-completeness" status is "blocked"
```

#### TC-GATE-REQ-002: Within review threshold → needs-review

```
Given: clarifyingQuestions.length >= maxQuestionsBeforeReview AND < maxQuestionsBeforeBlock
When: evaluateGates(input) is called
Then: "requirements-completeness" status is "needs-review"
```

#### TC-GATE-REQ-003: Below review threshold → pass

```
Given: clarifyingQuestions.length < maxQuestionsBeforeReview
When: evaluateGates(input) is called
Then: "requirements-completeness" status is "pass"
```

### Gate 3: Plan Readiness

#### TC-GATE-PLAN-001: Empty task list → blocked

```
Given: plan = []
When: evaluateGates(input) is called
Then: "plan-readiness" status is "blocked"
```

#### TC-GATE-PLAN-002: Tasks present but no dependencies → needs-review

```
Given: plan = [{ id: "t1", dependencies: [] }]
When: evaluateGates(input) is called (in builder mode where minimumPlanTasks > 1)
Then: "plan-readiness" status is "needs-review"
```

#### TC-GATE-PLAN-003: Sufficient tasks with dependencies → pass

```
Given: plan has >= minimumPlanTasks tasks, at least one with non-empty dependencies
When: evaluateGates(input) is called
Then: "plan-readiness" status is "pass"
```

### Gate 4: Skill Coverage

#### TC-GATE-SKILL-001: No skills selected → blocked

```
Given: selectedSkills = []
When: evaluateGates(input) is called
Then: "skill-coverage" status is "blocked"
```

#### TC-GATE-SKILL-002: Only fallback skills → needs-review

```
Given: selectedSkills = [{ skillId: "s1", category: "fallback", ... }]
When: evaluateGates(input) is called
Then: "skill-coverage" status is "needs-review"
```

#### TC-GATE-SKILL-003: Has specialist skills → pass

```
Given: selectedSkills includes at least one with category !== "fallback"
And: selectedSkills.length >= minimumSelectedSkills
When: evaluateGates(input) is called
Then: "skill-coverage" status is "pass"
```

### Gate 5: Ambiguity Risk

#### TC-GATE-AMB-001: Ambiguity signal above block threshold → blocked

```
Given: questionCount >= policy.gateThresholds.ambiguityBlockThreshold
When: evaluateGates(input) is called
Then: "ambiguity-risk" status is "blocked"
```

#### TC-GATE-AMB-002: High assumptions with some questions → needs-review

```
Given: assumptions.length > 6
When: evaluateGates(input) is called
Then: "ambiguity-risk" status is "needs-review"
```

#### TC-GATE-AMB-003: Low ambiguity → pass

```
Given: questionCount < ambiguityReviewThreshold and assumptions.length <= 6
When: evaluateGates(input) is called
Then: "ambiguity-risk" status is "pass"
```

### Gate 6: Confidence Score

**File**: `packages/governance/src/confidence-engine.test.ts`

#### TC-CONF-001: All sub-scores at maximum → overall score near 1.0

```
Given:
  intent = { confidence: 1.0 }
  validation = { valid: true }
  constraints = { valid: true }
  consensus = { finalDecision: "approve", agreementScore: 1.0 }
When: scoreExecution(params) is called
Then: result.overall === 1.0
```

#### TC-CONF-002: Failed validation reduces score proportionally

```
Given: validation = { valid: false }, all other inputs at maximum
When: scoreExecution(params) is called
Then: result.validationScore === 0.4
And: result.overall < 1.0
```

#### TC-CONF-003: Consensus "revise" reduces consensus score by 40%

```
Given: consensus = { finalDecision: "revise", agreementScore: 1.0 }
When: scoreExecution(params) is called
Then: result.consensusScore === 0.6
```

#### TC-CONF-004: Consensus "reject" produces near-zero consensus score

```
Given: consensus = { finalDecision: "reject", agreementScore: 0.0 }
When: scoreExecution(params) is called
Then: result.consensusScore === 0.1 (or near zero per the formula)
```

#### TC-CONF-005: Weights sum to 1.0 (regression guard)

```
This test asserts the formula coefficients (0.35 + 0.20 + 0.25 + 0.20) === 1.0
to prevent silent drift in the weighting.
```

### Gate 7: Kill Switch

**File**: `packages/governance/src/kill-switch.test.ts`

#### TC-KS-001: Kill switch active → gate blocked immediately

```
Given: the kill switch flag is active (returned by the kill-switch store)
When: the kill switch gate is evaluated
Then: gate status is "blocked" and shouldPause is true
```

#### TC-KS-002: Kill switch inactive → gate passes

```
Given: the kill switch flag is NOT active
When: the kill switch gate is evaluated
Then: gate status is "pass"
```

### Gate 8: Constraint Violation

**File**: `packages/governance/src/constraint-engine.test.ts`

#### TC-CONSTRAINT-001: No constraints violated → pass

```
Given: no policy constraints are violated by the plan
When: the constraint engine evaluates the plan
Then: ConstraintResult.valid === true
```

#### TC-CONSTRAINT-002: Blocked command in plan → fail

```
Given: a PlanTask payload that calls a command in the policy blockList
When: the constraint engine evaluates the plan
Then: ConstraintResult.valid === false; violations array is non-empty
```

### Gate 9: Approval Gate

Approval gate tests are covered in Section 5 (Approval and Rejection Flows) and Section 6
(Mode Influence). The approval gate itself is exercised via the gate-controller.

---

## 4. Test Cases — Gate Sequencing

**File**: `packages/orchestrator/src/gate-manager.test.ts`

#### TC-SEQ-001: First blocked gate short-circuits overall status

```
Given: gate 1 is "blocked", gate 2 is "pass", gate 3 is "needs-review"
When: getOverallGateStatus(decisions) is called
Then: overallStatus === "blocked"
Note: the function inspects ALL decisions but the first blocking one wins.
```

#### TC-SEQ-002: needs-review gates accumulate; first one pauses the run

```
Given: gate 1 is "pass", gate 2 is "needs-review", gate 3 is "needs-review"
When: getOverallGateStatus(decisions) is called
Then: overallStatus === "needs-review"
```

#### TC-SEQ-003: All gates pass → overallStatus is "pass"

```
Given: all decisions have status "pass"
When: getOverallGateStatus(decisions) is called
Then: overallStatus === "pass"
```

#### TC-SEQ-004: Manual approval overrides a blocked gate

```
Given:
  - "objective-clarity" gate would normally return "needs-review"
  - input.approvedGates includes "objective-clarity"
When: evaluateGates(input) is called
Then:
  - the "objective-clarity" decision has status "pass"
  - decision.reason contains "MANUALLY APPROVED"
```

---

## 5. Test Cases — Approval and Rejection Flows

**File**: `apps/control-service/test/approvals.test.ts` (already exists — extend)
**File**: `packages/orchestrator/test/gate-rejection.test.ts` (to be created)

#### TC-APPR-001: Valid approver approves a pending gate → gate passes, run resumes

```
Given: a run in "paused" status with gate G1 in "needs-review"
And: the caller has the gate:approve permission
When: POST /v1/gates/:G1Id/approve is called
Then:
  - gate G1 status becomes "pass"
  - the run status transitions back to "running"
  - an audit event is recorded with the approver's actorId
```

#### TC-APPR-002: Valid approver rejects a gate → gate fails, run is cancelled @security

```
Given: a run in "paused" status with gate G1 in "needs-review"
And: the caller has the gate:reject permission
When: POST /v1/gates/:G1Id/reject is called
Then:
  - gate G1 status becomes "fail"
  - the run status transitions to "cancelled"
  - no further phases are executed
  - an audit event is recorded
```

#### TC-APPR-003: Approval of an already-decided gate returns 409

```
Given: gate G1 already has status "pass"
When: POST /v1/gates/:G1Id/approve is called
Then: HTTP 409 Conflict
```

#### TC-APPR-004: Rejection of an already-rejected gate returns 409

```
Given: gate G1 already has status "fail"
When: POST /v1/gates/:G1Id/reject is called
Then: HTTP 409 Conflict
```

#### TC-APPR-005: Approval by user without permission returns 403

```
Given: a pending gate; caller has role "viewer" (no gate:approve)
When: POST /v1/gates/:id/approve is called
Then: HTTP 403; gate status unchanged
```

---

## 6. Test Cases — Mode Influence

**File**: `packages/orchestrator/src/gate-manager.test.ts`

Mode policies are defined in `packages/orchestrator/src/mode-controller.ts` and affect gate
thresholds. The following tests verify that `evaluateGates` correctly applies mode policies.

#### TC-MODE-001: turbo mode auto-passes needs-review gates

```
Given: a gate that would produce "needs-review" in builder mode
And: mode === "turbo"
When: evaluateGates(input) is called
Then: the gate decision has status "pass" with reason containing "AUTO-PASSED VIA TURBO"
And: overallStatus === "pass"
```

#### TC-MODE-002: turbo mode does NOT override blocked gates

```
Given: a gate that produces "blocked" (objective missing)
And: mode === "turbo"
When: evaluateGates(input) is called
Then: the gate decision still has status "blocked"
Note: "AUTO-PASSED VIA TURBO" only applies to "needs-review", not "blocked".
```

#### TC-MODE-003: safe mode uses stricter thresholds than builder mode

```
Given: a plan with 2 tasks and 1 clarifying question
When: evaluateGates(input) is called with mode === "safe"
Then: "requirements-completeness" status is at least "needs-review"

When: evaluateGates(input) is called with mode === "turbo"
Then: "requirements-completeness" status is "pass"
(because turbo mode has higher maxQuestionsBeforeReview)
```

#### TC-MODE-004: god mode — all gates pass trivially

```
Given: worst-case inputs (no plan, no skills, no objective)
And: mode === "god"
When: evaluateGates(input) is called (if god mode bypasses gates)
Then: overallStatus === "pass" (or no gates are evaluated)
Note: this test documents expected behaviour; implement once god mode policy is defined.
```

#### TC-MODE-005: builder mode (default) uses standard thresholds

```
Given: mode is omitted from input
When: evaluateGates(input) is called
Then: the effective mode defaults to "builder"
And: gate thresholds match getModePolicy("builder") values
```

---

## 7. Mock Requirements

### Mode Policy Mock

Some tests need to control mode thresholds precisely. Mock `getModePolicy` to return a controlled
policy object:

```typescript
vi.mock("./mode-controller", () => ({
  getModePolicy: vi.fn(() => ({
    mode: "builder",
    gateThresholds: {
      maxQuestionsBeforeBlock: 5,
      maxQuestionsBeforeReview: 2,
      minimumPlanTasks: 2,
      minimumSelectedSkills: 1,
      ambiguityBlockThreshold: 5,
      ambiguityReviewThreshold: 3,
    },
  })),
}));
```

### Kill Switch Store Mock

```typescript
vi.mock("../kill-switch", () => ({
  isKillSwitchActive: vi.fn().mockResolvedValue(false), // default inactive
}));
```

### Gate Approval HTTP Tests (integration)

Require:
- A running test instance of `apps/control-service`.
- A seeded database with at least one run in "paused" status and one gate in "needs-review".
- Tokens for users with different roles (see `TEST_PLAN_RBAC.md` token factory).

---

## 8. Test File Locations

| File | Status | Tests |
|---|---|---|
| `packages/orchestrator/src/gate-manager.test.ts` | To be created | TC-GATE-OBJ-*, TC-GATE-REQ-*, TC-GATE-PLAN-*, TC-GATE-SKILL-*, TC-GATE-AMB-*, TC-SEQ-*, TC-MODE-* |
| `packages/governance/src/confidence-engine.test.ts` | To be created | TC-CONF-001 through TC-CONF-005 |
| `packages/governance/src/kill-switch.test.ts` | To be created | TC-KS-001, TC-KS-002 |
| `packages/governance/src/constraint-engine.test.ts` | To be created | TC-CONSTRAINT-001, TC-CONSTRAINT-002 |
| `apps/control-service/test/approvals.test.ts` | Exists — extend | TC-APPR-001 through TC-APPR-005 |
| `packages/orchestrator/test/gate-rejection.test.ts` | To be created | TC-APPR-002 (integration) |

---

## 9. Example Test Code

### gate-manager.test.ts (skeleton)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateGates, getOverallGateStatus } from "./gate-manager";
import type { GateEvaluationInput } from "./gate-manager";

vi.mock("./mode-controller", () => ({
  getModePolicy: vi.fn(() => ({
    mode: "builder",
    gateThresholds: {
      maxQuestionsBeforeBlock: 5,
      maxQuestionsBeforeReview: 2,
      minimumPlanTasks: 2,
      minimumSelectedSkills: 1,
      ambiguityBlockThreshold: 5,
      ambiguityReviewThreshold: 3,
    },
  })),
}));

const baseInput: GateEvaluationInput = {
  clarificationResult: {
    normalizedIdea: "Build a task manager app",
    inferredProjectType: "web-app",
    assumptions: [],
    clarifyingQuestions: [],
    completeness: "sufficient-for-initial-planning",
  },
  plan: [
    { id: "t1", title: "Setup", description: "", status: "pending", type: "planning", dependencies: ["t0"], metadata: {} },
    { id: "t2", title: "Build", description: "", status: "pending", type: "implementation", dependencies: ["t1"], metadata: {} },
  ],
  selectedSkills: [
    { skillId: "s1", name: "React Expert", category: "frontend", reason: "UI needed", source: "registry" },
  ],
  mode: "builder",
};

describe("evaluateGates", () => {
  it("should return overallStatus pass when all inputs are valid", () => {
    const result = evaluateGates(baseInput);
    expect(result.overallStatus).toBe("pass");
    expect(result.decisions.every(d => d.status === "pass")).toBe(true);
  });

  it("should return blocked when no normalized objective is provided", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      clarificationResult: { ...baseInput.clarificationResult, normalizedIdea: "" },
    };
    const result = evaluateGates(input);
    const gate = result.decisions.find(d => d.gate === "objective-clarity");
    expect(gate?.status).toBe("blocked");
    expect(result.overallStatus).toBe("blocked");
  });

  it("should auto-pass needs-review gates in turbo mode", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      mode: "turbo",
      clarificationResult: {
        ...baseInput.clarificationResult,
        inferredProjectType: "unclear", // would produce needs-review in builder
      },
    };
    const result = evaluateGates(input);
    const gate = result.decisions.find(d => d.gate === "objective-clarity");
    expect(gate?.status).toBe("pass");
    expect(gate?.reason).toContain("AUTO-PASSED VIA TURBO");
  });

  it("should mark a manually approved gate as pass regardless of evaluation", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      clarificationResult: { ...baseInput.clarificationResult, inferredProjectType: "unclear" },
      approvedGates: ["objective-clarity"],
    };
    const result = evaluateGates(input);
    const gate = result.decisions.find(d => d.gate === "objective-clarity");
    expect(gate?.status).toBe("pass");
    expect(gate?.reason).toContain("MANUALLY APPROVED");
  });
});

describe("getOverallGateStatus", () => {
  it("should return blocked when any decision is blocked", () => {
    const decisions = [
      { gate: "g1", status: "pass" as const, reason: "", shouldPause: false },
      { gate: "g2", status: "blocked" as const, reason: "", shouldPause: true },
      { gate: "g3", status: "needs-review" as const, reason: "", shouldPause: true },
    ];
    expect(getOverallGateStatus(decisions)).toBe("blocked");
  });

  it("should return needs-review when no blocked but some needs-review", () => {
    const decisions = [
      { gate: "g1", status: "pass" as const, reason: "", shouldPause: false },
      { gate: "g2", status: "needs-review" as const, reason: "", shouldPause: true },
    ];
    expect(getOverallGateStatus(decisions)).toBe("needs-review");
  });

  it("should return pass when all decisions pass", () => {
    const decisions = [
      { gate: "g1", status: "pass" as const, reason: "", shouldPause: false },
      { gate: "g2", status: "pass" as const, reason: "", shouldPause: false },
    ];
    expect(getOverallGateStatus(decisions)).toBe("pass");
  });
});
```

### confidence-engine.test.ts (skeleton)

```typescript
import { describe, it, expect } from "vitest";
import { scoreExecution } from "./confidence-engine";

const maxInputs = {
  intent: { confidence: 1.0, aligned: true, summary: "" },
  validation: { valid: true, errors: [] },
  constraints: { valid: true, violations: [] },
  consensus: { finalDecision: "approve" as const, agreementScore: 1.0, votes: [] },
};

describe("scoreExecution", () => {
  it("should return overall score of 1.0 when all sub-scores are at maximum", () => {
    const result = scoreExecution(maxInputs);
    expect(result.overall).toBe(1.0);
  });

  it("should reduce the score when validation fails", () => {
    const result = scoreExecution({ ...maxInputs, validation: { valid: false, errors: ["missing field"] } });
    expect(result.validationScore).toBe(0.4);
    expect(result.overall).toBeLessThan(1.0);
  });

  it("should reduce consensus score by 40% when decision is revise", () => {
    const result = scoreExecution({
      ...maxInputs,
      consensus: { finalDecision: "revise", agreementScore: 1.0, votes: [] },
    });
    expect(result.consensusScore).toBeCloseTo(0.6, 2);
  });
});
```
