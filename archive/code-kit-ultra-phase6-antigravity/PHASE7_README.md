# Phase 7: Gate System

## Overview
Implemented a deterministic governance layer that evaluates project readiness and risk before allowing a run to proceed.

## Key Capabilities
- **Mode-Sensitive Thresholds**: Different criteria for `safe`, `balanced`, and `god` modes (e.g., stricter question limits in `safe`).
- **Validation Gates**:
  - **Objective Clarity**: Ensures a usable idea and category are present.
  - **Requirements Completeness**: Checks for excessive open clarifying questions.
  - **Plan Readiness**: Ensures a non-empty plan with explicit dependencies exists.
  - **Skill Coverage**: Validates that specialist skills (not just fallbacks) are present.
  - **Ambiguity Risk**: Evaluates the combination of low confidence and high assumption/question counts.
- **Decision Aggregation**: Provides a final overall status (`pass`, `needs-review`, `blocked`).

## Mode Differences
- **Safe**: Highly sensitive (Review at 2 questions, Block at 6).
- **Balanced**: Standard middle ground (Review at 3 questions, Block at 7).
- **God**: Highly permissive (Review at 5 questions, Block at 9).

## Usage
```typescript
import { evaluateGates } from "./packages/orchestrator/src";
const result = evaluateGates({ clarificationResult, plan, selectedSkills, mode: "balanced" });
console.log(result.overallStatus); // "pass", "needs-review", or "blocked"
```

## Success Markers
1. High-clarity runs with a plan and skills correctly return `pass`.
2. Runs with many open questions return `needs-review` or `blocked`.
3. The overall status reflects the "worst" individual gate result.
4. Mode shifts change the gate behavior as expected.
