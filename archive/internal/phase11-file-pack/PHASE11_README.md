# PHASE 11 — Mode Controller

This file pack centralizes mode behavior for `safe`, `balanced`, and `god`.

## Included files
- `packages/orchestrator/src/mode-controller.ts`
- `packages/orchestrator/src/intake.ts`
- `packages/orchestrator/src/gate-manager.ts`
- `packages/orchestrator/src/run-vertical-slice.ts`
- `packages/orchestrator/src/index.ts`

## What this phase changes
- Adds a single source of truth for mode policy.
- Trims intake questions differently by mode.
- Moves gate thresholds into centralized mode policy.
- Keeps orchestration deterministic and transparent.

## Suggested tests

### Compare modes
```bash
pnpm ck init "Build a CRM for solar installers" --mode safe
pnpm ck init "Build a CRM for solar installers" --mode balanced
pnpm ck init "Build a CRM for solar installers" --mode god
```

Expected pattern:
- `safe` keeps the most questions and is strictest.
- `balanced` keeps a moderate question set.
- `god` trims noise the most and is least likely to block.

### Smoke test regression
```bash
pnpm tsx examples/smoke-test.ts
```

## Manual verification checklist
- The same idea yields different question counts by mode.
- Gate behavior changes by mode without randomness.
- `run-report.json` still persists correctly.
- The orchestrator still returns a complete `RunReport`.
