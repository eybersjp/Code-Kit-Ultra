# Governance Package — Claude Code Context

## Quick Overview

The **governance** package implements the 9-gate execution policy system that gates all CKU operations. It's the enforcement layer that decides whether an execution can proceed based on security, quality, risk, and operational criteria.

## Core Architecture

### 9 Gates

All gates inherit from `base-gate.ts` and implement the `GateEvaluator` interface.

| Gate | File | Purpose | Severity Levels |
|------|------|---------|-----------------|
| Scope Gate | `gates/scope-gate.ts` | Validates execution is within tenant/workspace boundaries | pass / warning / blocked |
| Architecture Gate | `gates/architecture-gate.ts` | Ensures run respects system architecture constraints | pass / fail / blocked |
| Security Gate | `gates/security-gate.ts` | Validates auth tokens, RBAC, and security posture | pass / fail / blocked |
| Cost Gate | `gates/cost-gate.ts` | Checks estimated cost against budget limits (optional in balanced mode) | pass / warning / fail |
| Deployment Gate | `gates/deployment-gate.ts` | Verifies deployment target readiness | pass / fail / blocked |
| QA Gate | `gates/qa-gate.ts` | Checks test coverage and code quality thresholds | pass / fail / blocked |
| Build Gate | `gates/build-gate.ts` | Validates build artifacts and compilation | pass / fail / blocked |
| Launch Gate | `gates/launch-gate.ts` | Final pre-execution checkpoint | pass / fail / blocked |
| Risk Threshold Gate | `gates/risk-threshold-gate.ts` | Evaluates overall execution risk score | pass / warning / blocked |

### GateManager

Central orchestrator (`gate-manager.ts`):
- **Registers** all 9 gates
- **Evaluates** gates based on execution mode (turbo, safe, balanced, builder, pro, expert, god)
- **Records** gate decisions to database via `GateStore`
- **Applies** manual overrides for reviewer approval
- **Short-circuits** on blocking severity

**Mode-aware Gate Sequences:**
- `turbo`: Only Risk Threshold Gate (skip most checks)
- `safe`: All gates, pause on any issue
- `balanced`: All gates except Cost Gate
- `builder`/`pro`: All gates
- `expert`: All gates (launch gate approval-only)
- `god`: No gates

### Decision Engines

| Module | Purpose |
|--------|---------|
| `adaptive-consensus.ts` | Multi-agent voting with weighted consensus (reviewer, security, automation agents) |
| `confidence-engine.ts` | Confidence scoring for gate decisions |
| `consensus-engine.ts` | Simple consensus logic for agent votes |
| `constraint-engine.ts` | Constraint validation and conflict resolution |
| `intent-engine.ts` | Parses operator intent and maps to execution context |
| `validation-engine.ts` | Input validation for gate evaluation context |
| `adaptive-memory.ts` | Learning loop state for policy evolution |

### Utility Modules

- `gate-store.ts` — Database persistence for gate decisions, approvals, rejections
- `gate-controller.ts` — HTTP controller for gate approval/rejection endpoints
- `kill-switch.ts` — Emergency execution halt mechanism
- `policy-store.ts` — Loads policy from `config/policy.json`
- `governed-pipeline.ts` — Wires gates into the execution pipeline

## Key Patterns

### Adding a New Gate

1. Create `gates/my-new-gate.ts` extending `BaseGate`
2. Implement `evaluate(context: GateEvaluationContext): Promise<GateResult>`
3. Register in `GateManager` constructor
4. Update gate sequence logic in `getGateSequence()` if mode-dependent

```typescript
export class MyGate extends BaseGate {
  name = 'My Gate'
  description = 'Validates my custom constraint'

  async evaluate(context: GateEvaluationContext): Promise<GateResult> {
    const passed = /* your logic */
    return {
      gateName: this.name,
      passed,
      severity: passed ? 'pass' : 'warning',
      message: 'Your message',
      details: { /* context */ }
    }
  }
}
```

### Mode-Based Branching

Query the execution mode in gates to customize behavior:
```typescript
if (context.mode === 'turbo') {
  // Fast path - skip expensive checks
} else if (context.mode === 'god') {
  // Unrestricted mode - pass through
} else {
  // Standard enforcement
}
```

## Testing

| Command | Purpose |
|---------|---------|
| `pnpm run test:governance` | Governance-specific tests (root-level command) |
| `pnpm run test:coverage` | Coverage report (target 80%+) |

Test files: `*.test.ts` in same directory as implementation.

Key test modules:
- `gate-manager.test.ts` — GateManager sequencing, pause logic
- `constraint-engine.test.ts` — Constraint validation
- `confidence-engine.test.ts` — Confidence scoring
- `kill-switch.test.ts` — Emergency halt logic

## Database Schema

Gates record decisions in the `gate_decisions` table (migrated via control-service):

```sql
CREATE TABLE gate_decisions (
  id UUID PRIMARY KEY,
  gate_name VARCHAR NOT NULL,
  run_id VARCHAR NOT NULL,
  decision VARCHAR NOT NULL, -- 'pass', 'blocked', 'needs-review'
  details JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Approvals tracked separately in `gate_approvals`:
```sql
CREATE TABLE gate_approvals (
  id UUID PRIMARY KEY,
  gate_id VARCHAR NOT NULL,
  run_id VARCHAR NOT NULL,
  approved_by VARCHAR NOT NULL,
  approved_at TIMESTAMP DEFAULT NOW()
);
```

## Config Integration

Gates respect `config/policy.json` for mode-dependent thresholds, veto rules, and consensus policies. Changes to policy require service restart.

**Agent Profiles** are defined in `packages/agents/src/profiles.ts` and provide base weights, reliability, and veto authority for voting agents (reviewer, security, automation). Customize via `adaptive-consensus.ts` policy overrides.

## Gotchas

1. **Gate order matters** — Order in `GateManager.getGateSequence()` affects evaluation precedence
2. **Blocking short-circuits** — Once a gate severity='blocked', remaining gates skip (unless turbo/god mode)
3. **Database persistence required** — GateStore writes to control-service DB; standalone governance testing needs mock store
4. **Mode changes post-evaluation** — Mode is set at context creation; changing it mid-pipeline requires re-evaluation
5. **Consensus threshold tuning** — Adaptive consensus requires careful policy config; defaults are in `agents/src/profiles.ts`
