# Architecture

## High-level flow

```text
CLI
  -> runVerticalSlice(...)
    -> runIntake(...)
    -> buildPlanFromClarification(...)
    -> selectSkills(...)
    -> evaluateGates(...)
    -> recordRun(...)
```

## Module responsibilities

### `packages/shared`
Defines stable shared contracts such as:
- `RunReport`
- `ClarificationResult`
- `Task`
- `SelectedSkill`
- `GateDecision`

### `packages/memory`
Handles:
- ensuring `.codekit/` exists
- ensuring `.codekit/memory/` exists
- ensuring `artifacts/test-runs/` exists
- saving `run-report.json`
- updating `project-memory.json`

### `packages/orchestrator`
Contains:
- intake and clarification
- planning
- gate management
- mode controller
- top-level orchestration

### `packages/skill-engine`
Loads the JSON skill registry and selects skills using deterministic scoring.

### `packages/adapters`
Provides mock adapter contracts and platform recommendations for:
- Antigravity
- Cursor
- Windsurf

## Design principles

- deterministic before intelligent
- explicit contracts before convenience
- transparent governance before automation theater
- local persistence before remote complexity

## Current limitations

- no live external service calls
- no LLM reasoning loop
- no async agent execution
- no production deployment automation
