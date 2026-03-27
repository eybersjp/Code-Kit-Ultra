# Phase 4 ULTRA Integration Guide

This pack is designed to fit the governed autonomy work you already completed, where action batches are validated through intent, constraints, validation, consensus, confidence, and kill-switch checks before execution.

Your current governed autonomy implementation established the trust boundary before mutations happen. The first working vertical slice earlier also centered on the repo loop of idea → clarify → plan → choose skills → open gates → output execution report. fileciteturn1file2

## Integration strategy

Add Phase 4 in four steps:

### 1. Add shared observability types

Copy:
- `packages/shared/src/observability-types.ts`

This keeps trace data portable between governance, orchestrator, CLI, and report rendering.

### 2. Add the new observability package

Copy the whole folder:
- `packages/observability/`

This package provides:
- trace assembly
- timeline events
- persisted trace storage
- persisted timeline storage
- confidence explanation helpers
- markdown report rendering

### 3. Connect it inside the orchestrator

Wherever the governance pipeline currently returns its result, also construct a trace payload and persist it.

Recommended hook points:
- right before governance evaluation starts
- after each sub-check completes
- right before final execute/block decision
- right after report generation

Use the example integration file:
- `examples/orchestrator-observability-example.ts`

### 4. Register CLI commands

Wire these handlers into your CLI router:
- `/ck-trace`
- `/ck-timeline`
- `/ck-score-explain`
- `/ck-report`

Use the files in:
- `apps/cli/src/handlers/`

## Suggested persistence layout

```text
.ck/
  traces/
  timelines/
  reports/
```

## Recommended final behavior

For each run:

1. Persist structured trace JSON
2. Persist timeline JSON
3. Persist markdown report
4. Expose all three through CLI commands

## Recommended next step after this

Once observability is integrated and stable, move to Phase 5:
- memory-influenced voting
- adaptive risk weighting
- specialist agents with independent vote reasoning
