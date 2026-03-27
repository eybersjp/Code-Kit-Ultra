# Phase 11 — Mode Controller

This phase centralizes mode behavior for `safe`, `balanced`, and `god`.

## Overview
Mode policies are now defined in a single source of truth, influencing question volume, assumption tolerance, and gate strictness consistently across the pipeline.

## What changed
- **Mode Controller**: Added `packages/orchestrator/src/mode-controller.ts` to hold the master policy.
- **Intake**: Refactored to trim questions based on mode-specific limits.
- **Gate Manager**: Refactored to consume mode-sensitive thresholds for review and block decisions.
- **Orchestrator**: Vertical slice now flows the active mode to all sub-modules.

## How to test

### Compare modes
Try running the same idea with different modes:
```bash
pnpm ck init "Build a CRM for solar installers" --mode safe
pnpm ck init "Build a CRM for solar installers" --mode balanced
pnpm ck init "Build a CRM for solar installers" --mode god
```

### Observe results
- **Safe**: Most questions (8 max), strictest gates.
- **Balanced**: Practical default (5 max questions).
- **God**: Aggressive trimming (3 max questions), most permissive gates.

### Regression
Run existing smoke tests:
```bash
pnpm tsx examples/smoke-test.ts
```

## Manual verification checklist
- [ ] Same idea yields different question counts in different modes.
- [ ] Gate status (`pass` vs `needs-review`) changes predictably based on mode.
- [ ] Smoke tests still complete successfully.
