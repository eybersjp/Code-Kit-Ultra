# Phase 8: Orchestrator End-to-End

This pack wires the first full deterministic vertical slice together.

## Files included

- `packages/orchestrator/src/run-vertical-slice.ts`
- `packages/orchestrator/src/index.ts`
- `apps/cli/src/index.ts`

## What this phase does

The orchestrator now runs the full deterministic pipeline:

1. normalize CLI input
2. run intake
3. build a plan
4. select skills
5. evaluate gates
6. assemble a `RunReport`
7. persist the report via the memory package
8. return artifact paths and final status

## Main command

```bash
pnpm ck init "Build a CRM for solar installers" --mode balanced --dry-run
```

## Expected CLI output shape

- summary line
- overall gate status
- artifact directory
- artifact report path
- memory path
- assumptions
- clarifying questions
- plan
- selected skills
- gates

## Manual verification checklist

1. Confirm `artifacts/test-runs/<timestamp>/run-report.json` exists.
2. Confirm `.codekit/memory/project-memory.json` was updated.
3. Open the saved `run-report.json` and verify it includes:
   - `input`
   - `intakeResult`
   - `assumptions`
   - `clarifyingQuestions`
   - `plan`
   - `selectedSkills`
   - `gates`
   - `summary`
   - `overallGateStatus`
4. Run `pnpm ck metrics` and confirm the latest run is reflected.

## Notes

- This phase coordinates existing modules rather than moving logic into the CLI.
- If balanced mode still lands on `needs-review`, that is currently expected for highly question-heavy intake results.
