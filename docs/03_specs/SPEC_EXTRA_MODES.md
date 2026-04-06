# SPEC — Extended Execution Modes (Turbo, Builder, Pro, Expert)

**Status:** Approved
**Version:** 1.0
**Linked to:** `docs/02_architecture/SYSTEM_ARCHITECTURE.md`
**Implements:** Undocumented feature — formalises existing implementation
**Priority:** Medium (documenting implemented feature)

---

## Objective

Formally document the four extended execution modes implemented in the repository beyond the master spec's three (`safe`, `balanced`, `god`). These modes fill real operator needs and are already implemented; this spec serves as their authoritative definition.

---

## Extended Mode Definitions

The full mode type is:

```typescript
export type Mode = "safe" | "balanced" | "god" | "turbo" | "builder" | "pro" | "expert";
```

### turbo

**Purpose:** Maximum speed with minimal friction. Optimised for rapid iteration when the operator trusts the idea and wants results fast.

**Characteristics:**
- Auto-approves all non-security, non-cost, non-deployment gates
- Minimal clarifying questions (≤ 2)
- Executes medium-risk actions without approval
- Requires explicit approval only for high-risk actions
- Command execution: allowed
- Dry-run: off by default

**Ideal for:** Experienced operators prototyping ideas, internal tool automation, trusted CI workflows.

### builder

**Purpose:** Structure-focused execution. Emphasises plan quality and architectural clarity before build proceeds.

**Characteristics:**
- Requires approval for medium and high-risk actions
- Pauses on architecture gate
- Generates more detailed plan tasks than turbo
- 3-5 clarifying questions
- Command execution: allowed (medium risk pauses)
- Dry-run: off by default

**Ideal for:** Greenfield projects where getting the structure right matters more than speed.

### pro

**Purpose:** Controlled execution with safety net. Dry-run on by default to allow preview before committing.

**Characteristics:**
- Requires approval for high-risk actions
- Dry-run enabled by default (simulate first)
- Pauses on architecture and qa gates
- 4-6 clarifying questions
- Strict risk thresholds
- Command execution: allowed (with simulation first)

**Ideal for:** Client projects, production-adjacent work, senior operators who want full visibility before execution.

### expert

**Purpose:** Full manual control. Stops after every phase for operator review and decision.

**Characteristics:**
- Stops after each phase (intake, planning, skills, gating, building)
- Maximum clarifying questions (≤ 8)
- Dry-run enabled by default
- All gates pause for explicit human decision
- Command execution: allowed (after explicit approval)
- Verbose output at every step

**Ideal for:** Audited workflows, learning the platform, high-stakes changes where an operator wants to review every decision.

---

## Mode Policy Matrix

```typescript
export interface ModePolicy {
  mode: Mode;
  maxQuestions: number;
  pauseGates: GateType[];
  autoProceedNonCritical: boolean;
  commandExecutionAllowed: boolean;
  dryRunDefault: boolean;
  stopAfterEachPhase: boolean;
  requireApprovalForMediumRisk: boolean;
}

export const MODE_POLICIES: Record<Mode, ModePolicy> = {
  turbo:   { mode: "turbo",   maxQuestions: 2, pauseGates: ["security","cost","deployment","launch"], autoProceedNonCritical: true,  commandExecutionAllowed: true,  dryRunDefault: false, stopAfterEachPhase: false, requireApprovalForMediumRisk: false },
  builder: { mode: "builder", maxQuestions: 4, pauseGates: ["architecture","security","cost","deployment","launch"], autoProceedNonCritical: true,  commandExecutionAllowed: true,  dryRunDefault: false, stopAfterEachPhase: false, requireApprovalForMediumRisk: true },
  balanced:{ mode: "balanced",maxQuestions: 4, pauseGates: ["architecture","deployment","security","cost","launch"], autoProceedNonCritical: true,  commandExecutionAllowed: true,  dryRunDefault: false, stopAfterEachPhase: false, requireApprovalForMediumRisk: false },
  pro:     { mode: "pro",     maxQuestions: 6, pauseGates: ["architecture","qa","security","cost","deployment","launch"], autoProceedNonCritical: false, commandExecutionAllowed: true,  dryRunDefault: true,  stopAfterEachPhase: false, requireApprovalForMediumRisk: true },
  expert:  { mode: "expert",  maxQuestions: 8, pauseGates: ["clarity","scope","architecture","build","qa","security","cost","deployment","launch"], autoProceedNonCritical: false, commandExecutionAllowed: true,  dryRunDefault: true,  stopAfterEachPhase: true,  requireApprovalForMediumRisk: true },
  safe:    { mode: "safe",    maxQuestions: 10,pauseGates: ["clarity","scope","architecture","build","qa","security","cost","deployment","launch"], autoProceedNonCritical: false, commandExecutionAllowed: false, dryRunDefault: true,  stopAfterEachPhase: false, requireApprovalForMediumRisk: true },
  god:     { mode: "god",     maxQuestions: 2, pauseGates: ["security","cost","deployment","launch"], autoProceedNonCritical: true,  commandExecutionAllowed: true,  dryRunDefault: false, stopAfterEachPhase: false, requireApprovalForMediumRisk: false },
};
```

---

## Definition of Done

- [ ] `packages/shared/src/types.ts` Mode type includes all 7 modes
- [ ] Mode policy matrix documented and enforced in `mode-controller.ts`
- [ ] OpenAPI spec includes all 7 modes in RunCreateRequest enum
- [ ] Web control plane settings page exposes all 7 modes with descriptions
- [ ] CLI `--mode` flag accepts all 7 modes with validation
- [ ] Tests written for each mode's policy behaviour
